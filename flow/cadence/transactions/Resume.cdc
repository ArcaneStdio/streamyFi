import PullStream from 0xf8d6e0586b0a20c7

/// Transaction to resume a paused gig (client only)
transaction(gigId: UInt64) {
    // Reference to the gig manager
    let gigManager: &PullStream.GigManager

    prepare(acct: auth(Storage, Capabilities) &Account) {
        // Get the gig manager
   self.gigManager = acct.capabilities.get<&PullStream.GigManager>(/public/gigManager)
            .borrow() ?? panic("Could not borrow gig manager")
    }

    execute {
        // Resume the gig
        self.gigManager.resume(gigId: self.gigId)
    }

    post {
        // Verify the gig is resumed
        let gig = self.gigManager.getGig(gigId: self.gigId)
        gig != nil: "Gig should exist"
        gig?.paused == false: "Gig should not be paused"
    }
}
