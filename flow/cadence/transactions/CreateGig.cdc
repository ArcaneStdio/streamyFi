import PullStream from 0xf8d6e0586b0a20c7
import FungibleToken from 0xee82856bf20e2aa6
import FlowToken from 0x0ae53cb6e3f42a79

/// Transaction to create a new gig and deposit initial funds
transaction(
    freelancerAddress: Address,
    totalAmount: UFix64,
    duration: UFix64
) {
    // Reference to the client's FlowToken vault
    let clientVault: &FlowToken.Vault{FungibleToken.Provider}
    
    // Reference to the client's gig manager
    let gigManager: &PullStream.GigManager
    
    // Event to track the transaction
    let gigCreated: PullStream.GigCreated

    prepare(acct: auth(Storage, Capabilities) &Account) {
        // Get the client's vault
        self.clientVault = acct.capabilities.get<&FlowToken.Vault{FungibleToken.Provider}>(/public/flowTokenReceiver)
            .borrow() ?? panic("Could not borrow FlowToken vault")
        
        // Get or create the gig manager
        if acct.capabilities.get<&PullStream.GigManager>(/public/gigManager).borrow() == nil {
            let gigManager <- PullStream.createGigManager()
            acct.storage.save(<-gigManager, to: /storage/gigManager)
            
            // Issue and publish capability
            let cap = acct.capabilities.storage.issue<&PullStream.GigManager>(/storage/gigManager)
            acct.capabilities.publish(cap, at: /public/gigManager)
        }
        
        self.gigManager = acct.capabilities.get<&PullStream.GigManager>(/public/gigManager)
            .borrow() ?? panic("Could not borrow gig manager")
    }

    execute {
        // Create the gig
        let gigId = self.gigManager.createGig(
            clientAddress: self.clientVault.owner?.address ?? panic("Could not get client address"),
            freelancerAddress: self.freelancerAddress,
            totalAmount: self.totalAmount,
            duration: self.duration
        )
        
        // Deposit the funds (in a real implementation, this would transfer tokens)
        self.gigManager.depositFunds(gigId: gigId, amount: self.totalAmount)
        
        // Store the event for reference
        self.gigCreated = PullStream.GigCreated(
            gigId: gigId,
            clientAddress: self.clientVault.owner?.address ?? panic("Could not get client address"),
            freelancerAddress: self.freelancerAddress,
            totalAmount: self.totalAmount,
            duration: self.duration
        )
    }

    post {
        // Verify the gig was created successfully
        let gig = self.gigManager.getGig(gigId: self.gigCreated.gigId)
        gig != nil: "Gig should be created"
        gig?.clientAddress == self.clientVault.owner?.address: "Client address should match"
        gig?.freelancerAddress == self.freelancerAddress: "Freelancer address should match"
        gig?.totalAmount == self.totalAmount: "Total amount should match"
        gig?.duration == self.duration: "Duration should match"
    }
}
