/// Simplified version of PullStream contract without external dependencies
/// This contract implements an escrow-based pull streaming payment system
/// where clients can create gigs, deposit funds, and freelancers can pull
/// payments based on elapsed time. Supports pause/resume functionality.
access(all) contract PullStreamSimple {

    /// Event emitted when a new gig is created
    access(all) event GigCreated(
        gigId: UInt64,
        clientAddress: Address,
        freelancerAddress: Address,
        totalAmount: UFix64,
        duration: UFix64
    )

    /// Event emitted when funds are deposited for a gig
    access(all) event FundsDeposited(
        gigId: UInt64,
        amount: UFix64
    )

    /// Event emitted when a payment is made
    access(all) event PaymentMade(
        gigId: UInt64,
        amount: UFix64,
        freelancerAddress: Address
    )

    /// Event emitted when a gig is paused
    access(all) event GigPaused(
        gigId: UInt64,
        pauseTime: UFix64
    )

    /// Event emitted when a gig is resumed
    access(all) event GigResumed(
        gigId: UInt64,
        resumeTime: UFix64
    )

    /// Event emitted when remaining funds are withdrawn
    access(all) event RemainingWithdrawn(
        gigId: UInt64,
        amount: UFix64,
        clientAddress: Address
    )

    /// Event emitted when a gig is completed
    access(all) event GigCompleted(
        gigId: UInt64
    )

    /// Structure representing a gig
    access(all) struct Gig {
        access(all) let id: UInt64
        access(all) let clientAddress: Address
        access(all) let freelancerAddress: Address
        access(all) let totalAmount: UFix64
        access(all) let startTime: UFix64
        access(all) let duration: UFix64
        access(self) var amountPaid: UFix64
        access(self) var paused: Bool
        access(self) var pauseTime: UFix64
        access(self) var totalPauseDuration: UFix64

        init(
            id: UInt64,
            clientAddress: Address,
            freelancerAddress: Address,
            totalAmount: UFix64,
            startTime: UFix64,
            duration: UFix64
        ) {
            self.id = id
            self.clientAddress = clientAddress
            self.freelancerAddress = freelancerAddress
            self.totalAmount = totalAmount
            self.startTime = startTime
            self.duration = duration
            self.amountPaid = 0.0
            self.paused = false
            self.pauseTime = 0.0
            self.totalPauseDuration = 0.0
        }

        access(all) fun getAmountPaid(): UFix64 {
            return self.amountPaid
        }

        access(all) fun getPaused(): Bool {
            return self.paused
        }

        access(all) fun getPauseTime(): UFix64 {
            return self.pauseTime
        }

        access(all) fun getTotalPauseDuration(): UFix64 {
            return self.totalPauseDuration
        }

        access(contract) fun setAmountPaid(amount: UFix64) {
            self.amountPaid = amount
        }

        access(contract) fun setPaused(paused: Bool) {
            self.paused = paused
        }

        access(contract) fun setPauseTime(time: UFix64) {
            self.pauseTime = time
        }

        access(contract) fun setTotalPauseDuration(duration: UFix64) {
            self.totalPauseDuration = duration
        }
    }

    /// Resource interface for managing gigs
    access(all) resource interface GigManager {
        access(all) fun createGig(
            clientAddress: Address,
            freelancerAddress: Address,
            totalAmount: UFix64,
            duration: UFix64
        ): UInt64

        access(all) fun depositFunds(gigId: UInt64, amount: UFix64)
        access(all) fun payNow(gigId: UInt64): UFix64
        access(all) fun pause(gigId: UInt64)
        access(all) fun resume(gigId: UInt64)
        access(all) fun withdrawRemaining(gigId: UInt64): UFix64
        access(all) fun getGig(gigId: UInt64): Gig?
        access(all) fun getGigStatus(gigId: UInt64): GigStatus?
    }

    /// Resource for managing gigs
    access(all) resource GigManagerImpl: GigManager {
        access(all) var gigs: {UInt64: Gig}
        access(all) var nextGigId: UInt64

        init() {
            self.gigs = {}
            self.nextGigId = 1
        }

        /// Create a new gig
        access(all) fun createGig(
            clientAddress: Address,
            freelancerAddress: Address,
            totalAmount: UFix64,
            duration: UFix64
        ): UInt64 {
            pre {
                totalAmount > 0.0: "Total amount must be greater than 0"
                duration > 0.0: "Duration must be greater than 0"
                clientAddress != freelancerAddress: "Client and freelancer must be different addresses"
            }

            let gigId = self.nextGigId
            self.nextGigId = self.nextGigId + 1

            let gig = Gig(
                id: gigId,
                clientAddress: clientAddress,
                freelancerAddress: freelancerAddress,
                totalAmount: totalAmount,
                startTime: getCurrentBlock().timestamp,
                duration: duration
            )

            self.gigs[gigId] = gig

            emit GigCreated(
                gigId: gigId,
                clientAddress: clientAddress,
                freelancerAddress: freelancerAddress,
                totalAmount: totalAmount,
                duration: duration
            )

            return gigId
        }

        /// Deposit funds for a gig (client only)
        access(all) fun depositFunds(gigId: UInt64, amount: UFix64) {
            pre {
                amount > 0.0: "Amount must be greater than 0"
            }

            let gig = self.gigs[gigId]
            if gig == nil {
                panic("Gig not found")
            }

            // In a real implementation, this would transfer tokens from the client
            // For now, we'll just emit an event
            emit FundsDeposited(gigId: gigId, amount: amount)
        }

        /// Calculate and make a payment based on elapsed time
        access(all) fun payNow(gigId: UInt64): UFix64 {
            let gig = self.gigs[gigId]
            if gig == nil {
                panic("Gig not found")
            }

            let currentTime = getCurrentBlock().timestamp
            let elapsedTime = currentTime - gig!.startTime - gig!.getTotalPauseDuration()

            // Calculate the percentage of time elapsed
            var timePercentage = elapsedTime / gig!.duration
            if timePercentage > 1.0 {
                timePercentage = 1.0
            }

            // Calculate the amount that should be paid based on time
            let expectedAmount = gig!.totalAmount * timePercentage
            let paymentAmount = expectedAmount - gig!.getAmountPaid()

            if paymentAmount <= 0.0 {
                return 0.0
            }

            // Update the amount paid
            var updatedGig = self.gigs[gigId]!
            updatedGig.setAmountPaid(amount: updatedGig.getAmountPaid() + paymentAmount)
            self.gigs[gigId] = updatedGig

            emit PaymentMade(
                gigId: gigId,
                amount: paymentAmount,
                freelancerAddress: gig!.freelancerAddress
            )

            return paymentAmount
        }

        /// Pause a gig
        access(all) fun pause(gigId: UInt64) {
            let gig = self.gigs[gigId]
            if gig == nil {
                panic("Gig not found")
            }

            if gig!.getPaused() {
                panic("Gig is already paused")
            }

            var updatedGig = self.gigs[gigId]!
            updatedGig.setPaused(paused: true)
            updatedGig.setPauseTime(time: getCurrentBlock().timestamp)
            self.gigs[gigId] = updatedGig

            emit GigPaused(gigId: gigId, pauseTime: self.gigs[gigId]!.getPauseTime())
        }

        /// Resume a gig
        access(all) fun resume(gigId: UInt64) {
            let gig = self.gigs[gigId]
            if gig == nil {
                panic("Gig not found")
            }

            if !gig!.getPaused() {
                panic("Gig is not paused")
            }

            let currentTime = getCurrentBlock().timestamp
            let pauseDuration = currentTime - gig!.getPauseTime()

            var updatedGig = self.gigs[gigId]!
            updatedGig.setPaused(paused: false)
            updatedGig.setTotalPauseDuration(duration: updatedGig.getTotalPauseDuration() + pauseDuration)
            updatedGig.setPauseTime(time: 0.0)
            self.gigs[gigId] = updatedGig

            emit GigResumed(gigId: gigId, resumeTime: currentTime)
        }

        /// Withdraw remaining funds (client only, after gig completion)
        access(all) fun withdrawRemaining(gigId: UInt64): UFix64 {
            let gig = self.gigs[gigId]
            if gig == nil {
                panic("Gig not found")
            }

            let currentTime = getCurrentBlock().timestamp
            let elapsedTime = currentTime - gig!.startTime - gig!.getTotalPauseDuration()

            // Check if gig is completed
            if elapsedTime < gig!.duration {
                panic("Gig is not yet completed")
            }

            let remainingAmount = gig!.totalAmount - gig!.getAmountPaid()

            if remainingAmount <= 0.0 {
                return 0.0
            }

            // Mark gig as completed by setting amount paid to total
            var updatedGig = self.gigs[gigId]!
            updatedGig.setAmountPaid(amount: gig!.totalAmount)
            self.gigs[gigId] = updatedGig

            emit RemainingWithdrawn(
                gigId: gigId,
                amount: remainingAmount,
                clientAddress: gig!.clientAddress
            )

            emit GigCompleted(gigId: gigId)

            return remainingAmount
        }

        /// Get a gig by ID
        access(all) fun getGig(gigId: UInt64): Gig? {
            return self.gigs[gigId]
        }

        /// Get gig status information
        access(all) fun getGigStatus(gigId: UInt64): GigStatus? {
            let gig = self.gigs[gigId]
            if gig == nil {
                return nil
            }

            let currentTime = getCurrentBlock().timestamp
            let elapsedTime = currentTime - gig!.startTime - gig!.getTotalPauseDuration()
            let timePercentage = elapsedTime / gig!.duration
            let expectedAmount = gig!.totalAmount * timePercentage
            let remainingAmount = gig!.totalAmount - gig!.getAmountPaid()

            return GigStatus(
                gigId: gigId,
                clientAddress: gig!.clientAddress,
                freelancerAddress: gig!.freelancerAddress,
                totalAmount: gig!.totalAmount,
                amountPaid: gig!.getAmountPaid(),
                remainingAmount: remainingAmount,
                startTime: gig!.startTime,
                duration: gig!.duration,
                elapsedTime: elapsedTime,
                timePercentage: timePercentage,
                expectedAmount: expectedAmount,
                paused: gig!.getPaused(),
                pauseTime: gig!.getPauseTime(),
                totalPauseDuration: gig!.getTotalPauseDuration(),
                isCompleted: elapsedTime >= gig!.duration
            )
        }
    }

    /// Structure for gig status information
    access(all) struct GigStatus {
        access(all) let gigId: UInt64
        access(all) let clientAddress: Address
        access(all) let freelancerAddress: Address
        access(all) let totalAmount: UFix64
        access(all) let amountPaid: UFix64
        access(all) let remainingAmount: UFix64
        access(all) let startTime: UFix64
        access(all) let duration: UFix64
        access(all) let elapsedTime: UFix64
        access(all) let timePercentage: UFix64
        access(all) let expectedAmount: UFix64
        access(all) let paused: Bool
        access(all) let pauseTime: UFix64
        access(all) let totalPauseDuration: UFix64
        access(all) let isCompleted: Bool

        init(
            gigId: UInt64,
            clientAddress: Address,
            freelancerAddress: Address,
            totalAmount: UFix64,
            amountPaid: UFix64,
            remainingAmount: UFix64,
            startTime: UFix64,
            duration: UFix64,
            elapsedTime: UFix64,
            timePercentage: UFix64,
            expectedAmount: UFix64,
            paused: Bool,
            pauseTime: UFix64,
            totalPauseDuration: UFix64,
            isCompleted: Bool
        ) {
            self.gigId = gigId
            self.clientAddress = clientAddress
            self.freelancerAddress = freelancerAddress
            self.totalAmount = totalAmount
            self.amountPaid = amountPaid
            self.remainingAmount = remainingAmount
            self.startTime = startTime
            self.duration = duration
            self.elapsedTime = elapsedTime
            self.timePercentage = timePercentage
            self.expectedAmount = expectedAmount
            self.paused = paused
            self.pauseTime = pauseTime
            self.totalPauseDuration = totalPauseDuration
            self.isCompleted = isCompleted
        }
    }

    /// Public function to create a gig manager
    access(all) fun createGigManager(): @GigManagerImpl {
        return <-create GigManagerImpl()
    }

    init() {
        // Contract initialization
    }
}

