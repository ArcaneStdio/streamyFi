import PullStream from 0xf8d6e0586b0a20c7
import FungibleToken from 0xee82856bf20e2aa6
import FlowToken from 0x0ae53cb6e3f42a79

/// Transaction for freelancer to pull payment based on elapsed time
transaction(gigId: UInt64) {
    // Reference to the freelancer's FlowToken vault
    let freelancerVault: &FlowToken.Vault{FungibleToken.Receiver}
    
    // Reference to the client's gig manager
    let gigManager: &PullStream.GigManager
    
    // Amount to be paid
    let paymentAmount: UFix64

    prepare(acct: auth(Storage, Capabilities) &Account) {
        // Get the freelancer's vault
        self.freelancerVault = acct.capabilities.get<&FlowToken.Vault{FungibleToken.Receiver}>(/public/flowTokenReceiver)
            .borrow() ?? panic("Could not borrow FlowToken vault")
        
        // Get the gig manager (assuming it's stored in the client's account)
        // In a real implementation, you'd need to specify which account has the gig manager
        self.gigManager = acct.capabilities.get<&PullStream.GigManager>(/public/gigManager)
            .borrow() ?? panic("Could not borrow gig manager")
    }

    execute {
        // Calculate and make the payment
        self.paymentAmount = self.gigManager.payNow(gigId: self.gigId)
        
        // In a real implementation, this would transfer tokens from escrow to freelancer
        // For now, we'll just emit the payment event (handled by the contract)
    }

    post {
        // Verify the payment was calculated correctly
        let gigStatus = self.gigManager.getGigStatus(gigId: self.gigId)
        gigStatus != nil: "Gig should exist"
        
        // The payment amount should be reasonable (not negative, not more than remaining)
        self.paymentAmount >= 0.0: "Payment amount should not be negative"
        self.paymentAmount <= gigStatus?.remainingAmount: "Payment amount should not exceed remaining amount"
    }
}
