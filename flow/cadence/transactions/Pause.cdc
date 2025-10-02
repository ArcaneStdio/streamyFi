import PullStream from 0xf8d6e0586b0a20c7

/// Transaction to pause a gig (client only)
transaction(gigId: UInt64) {
    // Reference to the gig manager
    let gigManager: &PullStream.GigManager

    prepare(acct: auth(Storage, Capabilities) &Account) {
        // Get the gig manager
        self.gigManager = acct.capabilities.get<&PullStream.GigManager>(/public/gigManager)
            .borrow() ?? panic("Could not borrow gig manager")
    }

    execute {
        // Pause the gig
        self.gigManager.pause(gigId: self.gigId)
    }

    post {
        // Verify the gig is paused
        let gig = self.gigManager.getGig(gigId: self.gigId)
        gig != nil: "Gig should exist"
        gig?.paused == true: "Gig should be paused"
    }
}
