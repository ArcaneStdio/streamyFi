import "FungibleToken"// from 0xee82856bf20e2aa6   // replace with correct emulator/testnet mainnet addresses
import "FlowToken" //from 0x0ae53cb6e3f42a79      // Flow Token contract address
import "PushStream" //from 0xf8d6e0586b0a20c7     // your deployed contract address

// Transaction to create a new stream
transaction(
    to: Address,
    amount: UFix64,
    rate: UFix64,
    interval: UFix64
) {
    let vaultRef: auth(FungibleToken.Withdraw) &{FungibleToken.Vault}

    prepare(signer: auth(BorrowValue, SaveValue, PublishCapability) &Account) {
        // Borrow the signer's FlowToken vault reference

        self.vaultRef = signer.storage.borrow<auth(FungibleToken.Withdraw) &{FungibleToken.Vault}>(from: /storage/flowTokenVault)
        ?? panic("Missing FlowToken vault in buyer account. Please create & link one.")

        //let vaultRef = signer.storage.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
            //?? panic("Could not borrow reference to the owner's FlowToken vault")

        // Withdraw tokens from signer’s vault for the escrow
        let payment <- self.vaultRef.withdraw(amount: amount) as! @FlowToken.Vault

        //?? panic("Missing FlowToken vault in buyer account. Please create & link one.")
        // 3) Withdraw the paymentAmount (should be >= listing price; contract will refund any extra)
        //let payment <- self.vaultRef.withdraw(amount: paymentAmount)
        // Create stream
        let streamID = PushStream.createStream(
            from: signer.address,
            to: to,
            amount: amount,
            rate: rate,
            interval: interval,
            fromVault: <- payment
        )

        log("Stream created with ID: ".concat(streamID.toString()))
    }
}
