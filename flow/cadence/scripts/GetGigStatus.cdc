import PullStream from 0xf8d6e0586b0a20c7

/// Script to get the current status of a gig
access(all) fun main(
    gigManagerAddress: Address,
    gigId: UInt64
): PullStream.GigStatus? {
    // Get the gig manager capability
    let gigManager = getAccount(gigManagerAddress)
        .getCapability<&PullStream.GigManager>(/public/gigManager)
        .borrow()
    
    if gigManager == nil {
        return nil
    }
    
    // Get the gig status
    return gigManager.getGigStatus(gigId: gigId)
}
