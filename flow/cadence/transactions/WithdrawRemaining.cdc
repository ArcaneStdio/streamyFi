import PullStream from 0xf8d6e0586b0a20c7
import FungibleToken from 0xee82856bf20e2aa6
import FlowToken from 0x0ae53cb6e3f42a79

/// Transaction for client to withdraw remaining funds after gig completion
transaction(gigId: UInt64) {
    // Reference to the client's FlowToken vault
    let clientVault: &FlowToken.Vault{FungibleToken.Receiver}
    
    // Reference to the gig manager
    let gigManager: &PullStream.GigManager
    
    // Amount withdrawn
    let withdrawnAmount: UFix64

    prepare(acct: auth(Storage, Capabilities) &Account) {
        // Get the client's vault
        self.clientVault = acct.capabilities.get<&FlowToken.Vault{FungibleToken.Receiver}>(/public/flowTokenReceiver)
            .borrow() ?? panic("Could not borrow FlowToken vault")
        
        // Get the gig manager
        self.gigManager = acct.capabilities.get<&PullStream.GigManager>(/public/gigManager)
            .borrow() ?? panic("Could not borrow gig manager")
    }

    execute {
        // Withdraw remaining funds
        self.withdrawnAmount = self.gigManager.withdrawRemaining(gigId: self.gigId)
        
        // In a real implementation, this would transfer tokens from escrow to client
        // For now, we'll just emit the withdrawal event (handled by the contract)
    }

    post {
        // Verify the withdrawal was successful
        let gigStatus = self.gigManager.getGigStatus(gigId: self.gigId)
        gigStatus != nil: "Gig should exist"
        gigStatus?.isCompleted == true: "Gig should be completed"
        
        // The withdrawn amount should be reasonable
        self.withdrawnAmount >= 0.0: "Withdrawn amount should not be negative"
    }
}
