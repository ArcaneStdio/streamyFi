import PullStream from 0xf8d6e0586b0a20c7
import Test from 0x0000000000000001
import FungibleToken from 0xee82856bf20e2aa6
import FlowToken from 0x0ae53cb6e3f42a79

/// Test suite for the PullStream contract
access(all) fun testPullStream() {
    let test = Test.newTest()
    
    // Create test accounts
    let client = test.createAccount()
    let freelancer = test.createAccount()
    
    // Setup FlowToken for client
    test.setupFlowToken(client)
    
    // Setup FlowToken for freelancer
    test.setupFlowToken(freelancer)
    
    // Deploy the PullStream contract
    test.deployContract(
        name: "PullStream",
        path: "cadence/contracts/PullStream.cdc",
        to: client
    )
    
    // Create a gig manager for the client
    let gigManager <- PullStream.createGigManager()
    client.save(<-gigManager, to: /storage/gigManager)
    client.link<&PullStream.GigManager>(/public/gigManager, target: /storage/gigManager)
    
    // Test 1: Create a gig
    test.test("Create Gig", fun() {
        let gigManager = client.getCapability<&PullStream.GigManager>(/public/gigManager)
            .borrow() ?? panic("Could not borrow gig manager")
        
        let gigId = gigManager.createGig(
            clientAddress: client.address,
            freelancerAddress: freelancer.address,
            totalAmount: 100.0,
            duration: 3600.0 // 1 hour in seconds
        )
        
        // Verify the gig was created
        let gig = gigManager.getGig(gigId: gigId)
        assert(gig != nil, message: "Gig should be created")
        assert(gig?.clientAddress == client.address, message: "Client address should match")
        assert(gig?.freelancerAddress == freelancer.address, message: "Freelancer address should match")
        assert(gig?.totalAmount == 100.0, message: "Total amount should match")
        assert(gig?.duration == 3600.0, message: "Duration should match")
        assert(gig?.amountPaid == 0.0, message: "Amount paid should be 0")
        assert(gig?.paused == false, message: "Gig should not be paused")
    })
    
    // Test 2: Test gig status
    test.test("Get Gig Status", fun() {
        let gigManager = client.getCapability<&PullStream.GigManager>(/public/gigManager)
            .borrow() ?? panic("Could not borrow gig manager")
        
        let gigId = gigManager.createGig(
            clientAddress: client.address,
            freelancerAddress: freelancer.address,
            totalAmount: 200.0,
            duration: 7200.0 // 2 hours
        )
        
        let status = gigManager.getGigStatus(gigId: gigId)
        assert(status != nil, message: "Status should exist")
        assert(status?.gigId == gigId, message: "Gig ID should match")
        assert(status?.totalAmount == 200.0, message: "Total amount should match")
        assert(status?.amountPaid == 0.0, message: "Amount paid should be 0")
        assert(status?.paused == false, message: "Should not be paused")
        assert(status?.isCompleted == false, message: "Should not be completed initially")
    })
    
    // Test 3: Test pause functionality
    test.test("Pause Gig", fun() {
        let gigManager = client.getCapability<&PullStream.GigManager>(/public/gigManager)
            .borrow() ?? panic("Could not borrow gig manager")
        
        let gigId = gigManager.createGig(
            clientAddress: client.address,
            freelancerAddress: freelancer.address,
            totalAmount: 150.0,
            duration: 1800.0 // 30 minutes
        )
        
        // Pause the gig
        gigManager.pause(gigId: gigId)
        
        let gig = gigManager.getGig(gigId: gigId)
        assert(gig?.paused == true, message: "Gig should be paused")
        assert(gig?.pauseTime > 0.0, message: "Pause time should be set")
    })
    
    // Test 4: Test resume functionality
    test.test("Resume Gig", fun() {
        let gigManager = client.getCapability<&PullStream.GigManager>(/public/gigManager)
            .borrow() ?? panic("Could not borrow gig manager")
        
        let gigId = gigManager.createGig(
            clientAddress: client.address,
            freelancerAddress: freelancer.address,
            totalAmount: 300.0,
            duration: 900.0 // 15 minutes
        )
        
        // Pause and then resume
        gigManager.pause(gigId: gigId)
        gigManager.resume(gigId: gigId)
        
        let gig = gigManager.getGig(gigId: gigId)
        assert(gig?.paused == false, message: "Gig should not be paused")
        assert(gig?.pauseTime == 0.0, message: "Pause time should be reset")
        assert(gig?.totalPauseDuration > 0.0, message: "Total pause duration should be recorded")
    })
    
    // Test 5: Test payment calculation
    test.test("Payment Calculation", fun() {
        let gigManager = client.getCapability<&PullStream.GigManager>(/public/gigManager)
            .borrow() ?? panic("Could not borrow gig manager")
        
        let gigId = gigManager.createGig(
            clientAddress: client.address,
            freelancerAddress: freelancer.address,
            totalAmount: 1000.0,
            duration: 3600.0 // 1 hour
        )
        
        // Make a payment (should be 0 initially since no time has passed)
        let paymentAmount = gigManager.payNow(gigId: gigId)
        assert(paymentAmount == 0.0, message: "Payment should be 0 initially")
        
        // In a real test, you'd need to simulate time passing
        // For now, we'll test the basic functionality
        let gig = gigManager.getGig(gigId: gigId)
        assert(gig?.amountPaid == 0.0, message: "Amount paid should still be 0")
    })
    
    // Test 6: Test error cases
    test.test("Error Cases", fun() {
        let gigManager = client.getCapability<&PullStream.GigManager>(/public/gigManager)
            .borrow() ?? panic("Could not borrow gig manager")
        
        // Test creating gig with invalid parameters
        test.expectFailure(
            fun() {
                gigManager.createGig(
                    clientAddress: client.address,
                    freelancerAddress: freelancer.address,
                    totalAmount: 0.0, // Invalid amount
                    duration: 3600.0
                )
            },
            message: "Should fail with zero amount"
        )
        
        test.expectFailure(
            fun() {
                gigManager.createGig(
                    clientAddress: client.address,
                    freelancerAddress: client.address, // Same as client
                    totalAmount: 100.0,
                    duration: 3600.0
                )
            },
            message: "Should fail with same client and freelancer"
        )
        
        // Test pausing non-existent gig
        test.expectFailure(
            fun() {
                gigManager.pause(gigId: 999) // Non-existent gig
            },
            message: "Should fail with non-existent gig"
        )
    })
    
    // Test 7: Test multiple gigs
    test.test("Multiple Gigs", fun() {
        let gigManager = client.getCapability<&PullStream.GigManager>(/public/gigManager)
            .borrow() ?? panic("Could not borrow gig manager")
        
        // Create multiple gigs
        let gigId1 = gigManager.createGig(
            clientAddress: client.address,
            freelancerAddress: freelancer.address,
            totalAmount: 100.0,
            duration: 1800.0
        )
        
        let gigId2 = gigManager.createGig(
            clientAddress: client.address,
            freelancerAddress: freelancer.address,
            totalAmount: 200.0,
            duration: 3600.0
        )
        
        // Verify both gigs exist and are independent
        let gig1 = gigManager.getGig(gigId: gigId1)
        let gig2 = gigManager.getGig(gigId: gigId2)
        
        assert(gig1 != nil, message: "First gig should exist")
        assert(gig2 != nil, message: "Second gig should exist")
        assert(gig1?.id != gig2?.id, message: "Gig IDs should be different")
        assert(gig1?.totalAmount == 100.0, message: "First gig amount should be 100")
        assert(gig2?.totalAmount == 200.0, message: "Second gig amount should be 200")
    })
    
    test.cleanup(account: client)
    test.cleanup(account: freelancer)
}
