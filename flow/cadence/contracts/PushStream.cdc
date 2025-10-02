import "FungibleToken"
import "FlowToken"

access(all) contract PushStream {

    // Events for tracking
    access(all) event StreamCreated(id: UInt64, from: Address, to: Address, amount: UFix64)
    access(all) event StreamPaused(id: UInt64, by: Address)
    access(all) event StreamResumed(id: UInt64, by: Address)
    access(all) event StreamCancelled(id: UInt64, by: Address)
    access(all) event StreamPayout(id: UInt64, to: Address, amount: UFix64)

    // Incremental stream identifier
    access(self) var nextStreamID: UInt64

    // Stream object stored in contract
    access(all) struct Stream {
        access(all) let id: UInt64
        access(all) let from: Address
        access(all) let to: Address
        access(all) let totalAmount: UFix64
        access(all) let rate : UFix64
        access(all) let interval : UFix64
        access(all) var validity : UFix64?
        access(all) var resumeCount : UInt64

        // Internal accounting
        access(contract) var withdrawn: UFix64
        access(contract) var paused: Bool
        access(contract) var pauseTime: UFix64?

        init(
            id: UInt64,
            from: Address,
            to: Address,
            totalAmount: UFix64,
            rate: UFix64,
            interval: UFix64
        ) {
            self.id = id
            self.from = from
            self.to = to
            self.totalAmount = totalAmount
            self.rate = rate
            self.interval = interval
            self.validity = nil
            self.withdrawn = 0.0
            self.paused = false
            self.pauseTime = nil
            self.resumeCount = 0
        }

        access(contract) fun markWithdraw(amount: UFix64) {
            self.withdrawn = self.withdrawn + amount
        }

        access(contract) fun pause(at: UFix64) {
            self.paused = true
            self.pauseTime = at
        }

        access(contract) fun resume() {
            self.paused = false
            self.pauseTime = nil
            self.resumeCount = self.resumeCount + 1
        }

        access(contract) fun setValidity(to: UFix64) {
            self.validity = to
        }

        access(contract) fun resetResumeCount() {
            self.resumeCount = 0
        }
    }

    // Storage of all active streams
    access(self) var streams: {UInt64: Stream}

    // Vault escrow per stream
    access(self) var escrows: @{UInt64: FlowToken.Vault}

    // Initialize
    init() {
        self.nextStreamID = 1
        self.streams = {}
        self.escrows <- {}
    }

    // Create a new stream (escrow locked in)
    access(all) fun createStream(
        from: Address,
        to: Address,
        amount: UFix64,
        rate: UFix64,
        interval: UFix64,
        fromVault: @FlowToken.Vault
    ): UInt64 {
        pre {
            amount > 0.0: "Amount must be positive"
            from != to: "Cannot stream to self"
            fromVault.balance == amount: "Vault balance must match amount"
        }
        let id = self.nextStreamID
        self.nextStreamID = self.nextStreamID + 1

        let start = getCurrentBlock().timestamp

        let stream = Stream(
            id: id,
            from: from,
            to: to,
            totalAmount: amount,
            rate: rate,
            interval: interval
        )

        self.streams[id] = stream
        self.escrows[id] <-! fromVault

        emit StreamCreated(id: id, from: from, to: to, amount: amount)
        return id
    }

    // Push payout up to accrued balance
    access(all) fun pushPayout(id: UInt64) {
        pre {
            self.streams[id] != nil: "No such stream"
        }

        let stream = self.streams[id]!
        let escrow <- self.escrows.remove(key: id) ?? panic("No escrow vault")
        let recipient = getAccount(stream.to)
            .capabilities
            .borrow<&{FungibleToken.Receiver}>(/public/flowTokenReceiver) 
            ?? panic("Could not borrow recipient's vault receiver")

        if stream.paused {
            if (stream.resumeCount != 0) {
                let withdrawnVault <- escrow.withdraw(amount: stream.rate)
                recipient.deposit(from: <- withdrawnVault)
                stream.resetResumeCount()
            }
            else {
                self.escrows[id] <-! escrow
                return
            }
        }

        let now = getCurrentBlock().timestamp
        if escrow.balance <= stream.rate {
            self.cancelStream(id: id, from: stream.to)
        }
        let withdrawnVault <- escrow.withdraw(amount: stream.rate)
        recipient.deposit(from: <- withdrawnVault)
        let validity = now + stream.interval
        if stream.validity == nil || validity > stream.validity! {
            stream.setValidity(to: validity)
        }
        stream.markWithdraw(amount: stream.rate)

        self.streams[id] = stream
        self.escrows[id] <-! escrow

        emit StreamPayout(id: id, to: stream.to, amount: stream.rate)
    }

    // Pause stream
    access(all) fun pauseStream(id: UInt64, from: Address) {
        pre {
            self.streams[id] != nil: "No such stream"
            self.streams[id]!.from == from: "Only stream owner can pause"
        }
        let stream = self.streams[id]!
        let now = getCurrentBlock().timestamp
        stream.pause(at: now)
        self.streams[id] = stream
        emit StreamPaused(id: id, by: from)
    }

    // Resume stream
    access(all) fun resumeStream(id: UInt64, from: Address) {
        pre {
            self.streams[id] != nil: "No such stream"
            self.streams[id]!.from == from: "Only stream owner can resume"
        }
        let stream = self.streams[id]!
        self.pushPayout(id: id)
        stream.resume()
        self.streams[id] = stream
        emit StreamResumed(id: id, by: from)
    }

    // Cancel stream (pays out accrued to recipient, returns unaccrued to payer)
    access(all) fun cancelStream(
        id: UInt64, 
        from: Address
    ) {
        pre {
            self.streams[id] != nil: "No such stream"
            self.streams[id]!.from == from: "Only stream owner can cancel"
        }
        let stream = self.streams.remove(key: id)!
        let escrow <- self.escrows.remove(key: id)!

        let now = getCurrentBlock().timestamp

        let owner = getAccount(stream.from)
            .capabilities
            .borrow<&{FungibleToken.Receiver}>(/public/flowTokenReceiver) 
            ?? panic("Could not borrow owner's vault receiver")

        var remainingEscrow <- escrow

        let payoutVault <- remainingEscrow.withdraw(amount: remainingEscrow.balance)
        owner.deposit(from: <- payoutVault)

        destroy remainingEscrow

        emit StreamCancelled(id: id, by: from)
    }
}