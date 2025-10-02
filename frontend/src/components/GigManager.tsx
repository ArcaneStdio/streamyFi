import React, { useState, useCallback } from 'react';
import * as fcl from '@onflow/fcl';
import type { CurrentUser } from '@onflow/fcl';

interface GigStatus {
  gigId: number;
  clientAddress: string;
  freelancerAddress: string;
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  startTime: number;
  duration: number;
  elapsedTime: number;
  timePercentage: number;
  expectedAmount: number;
  paused: boolean;
  pauseTime: number;
  totalPauseDuration: number;
  isCompleted: boolean;
}

interface GigManagerProps {
  user: CurrentUser;
}

const GigManager: React.FC<GigManagerProps> = ({ user }) => {
  const [gigs, setGigs] = useState<GigStatus[]>([]);
  const [selectedGigId, setSelectedGigId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);


  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }, []);

  const formatAmount = useCallback((amount: number) => {
    return `${amount.toFixed(2)} FLOW`;
  }, []);

  const getGigStatus = useCallback(async (gigId: number) => {
    try {
      const result = await fcl.query({
        cadence: `
          import PullStream from 0x966d51b6b6156a6f

          access(all) fun main(
              gigManagerAddress: Address,
              gigId: UInt64
          ): PullStream.GigStatus? {
              let gigManager = getAccount(gigManagerAddress)
                  .getCapability<&{PullStream.GigManager}>(/public/gigManager)
                  .borrow()
              
              if gigManager == nil {
                  return nil
              }
              
              return gigManager.getGigStatus(gigId: gigId)
          }
        `,
        args: (arg, t) => [
          arg(user.addr || '', t.Address),
          arg(gigId.toString(), t.UInt64),
        ],
      });

      return result;
    } catch (err) {
      console.error('Failed to get gig status:', err);
      return null;
    }
  }, [user]);

  const handlePayNow = useCallback(async () => {
    if (!selectedGigId) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const transactionId = await fcl.mutate({
        cadence: `
          import PullStream from 0x966d51b6b6156a6f
          import FungibleToken from 0x9a0766d93b6608b7
          import FlowToken from 0x7e60df042a9c0868

          transaction(gigId: UInt64) {
              let freelancerVault: &FlowToken.Vault
              let gigManager: &{PullStream.GigManager}
              let paymentAmount: UFix64

              prepare(acct: auth(Storage, Capabilities) &Account) {
                  self.freelancerVault = acct.capabilities.get<&FlowToken.Vault>(/public/flowTokenReceiver)
                      .borrow() ?? panic("Could not borrow FlowToken vault")
                  
                  self.gigManager = acct.capabilities.get<&{PullStream.GigManager}>(/public/gigManager)
                      .borrow() ?? panic("Could not borrow gig manager")
              }

              execute {
                  self.paymentAmount = self.gigManager.payNow(gigId: self.gigId)
              }
        `,
        args: (arg, t) => [
          arg(selectedGigId, t.UInt64),
        ],
        proposer: fcl.currentUser,
        payer: fcl.currentUser,
        authorizations: [fcl.currentUser],
        limit: 1000,
      });

      const transaction = await fcl.tx(transactionId).onceSealed();
      
      if (transaction.status === 4) {
        setSuccess('Payment processed successfully!');
        // Refresh gig status
        const updatedStatus = await getGigStatus(parseInt(selectedGigId));
        if (updatedStatus) {
          setGigs(prev => prev.map(gig => 
            gig.gigId === parseInt(selectedGigId) ? updatedStatus : gig
          ));
        }
      } else {
        throw new Error(`Transaction failed with status: ${transaction.status}`);
      }
    } catch (err: unknown) {
      console.error('Failed to process payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to process payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedGigId, getGigStatus]);

  const handlePause = useCallback(async () => {
    if (!selectedGigId) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const transactionId = await fcl.mutate({
        cadence: `
          import PullStream from 0x966d51b6b6156a6f

          transaction(gigId: UInt64) {
              let gigManager: &{PullStream.GigManager}

              prepare(acct: auth(Storage, Capabilities) &Account) {
                  self.gigManager = acct.capabilities.get<&{PullStream.GigManager}>(/public/gigManager)
                      .borrow() ?? panic("Could not borrow gig manager")
              }

              execute {
                  self.gigManager.pause(gigId: self.gigId)
              }
        `,
        args: (arg, t) => [
          arg(selectedGigId, t.UInt64),
        ],
        proposer: fcl.currentUser,
        payer: fcl.currentUser,
        authorizations: [fcl.currentUser],
        limit: 1000,
      });

      const transaction = await fcl.tx(transactionId).onceSealed();
      
      if (transaction.status === 4) {
        setSuccess('Gig paused successfully!');
        // Refresh gig status
        const updatedStatus = await getGigStatus(parseInt(selectedGigId));
        if (updatedStatus) {
          setGigs(prev => prev.map(gig => 
            gig.gigId === parseInt(selectedGigId) ? updatedStatus : gig
          ));
        }
      } else {
        throw new Error(`Transaction failed with status: ${transaction.status}`);
      }
    } catch (err: unknown) {
      console.error('Failed to pause gig:', err);
      setError(err instanceof Error ? err.message : 'Failed to pause gig. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedGigId, getGigStatus]);

  const handleResume = useCallback(async () => {
    if (!selectedGigId) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const transactionId = await fcl.mutate({
        cadence: `
          import PullStream from 0x966d51b6b6156a6f

          transaction(gigId: UInt64) {
              let gigManager: &{PullStream.GigManager}

              prepare(acct: auth(Storage, Capabilities) &Account) {
                  self.gigManager = acct.capabilities.get<&{PullStream.GigManager}>(/public/gigManager)
                      .borrow() ?? panic("Could not borrow gig manager")
              }

              execute {
                  self.gigManager.resume(gigId: self.gigId)
              }
        `,
        args: (arg, t) => [
          arg(selectedGigId, t.UInt64),
        ],
        proposer: fcl.currentUser,
        payer: fcl.currentUser,
        authorizations: [fcl.currentUser],
        limit: 1000,
      });

      const transaction = await fcl.tx(transactionId).onceSealed();
      
      if (transaction.status === 4) {
        setSuccess('Gig resumed successfully!');
        // Refresh gig status
        const updatedStatus = await getGigStatus(parseInt(selectedGigId));
        if (updatedStatus) {
          setGigs(prev => prev.map(gig => 
            gig.gigId === parseInt(selectedGigId) ? updatedStatus : gig
          ));
        }
      } else {
        throw new Error(`Transaction failed with status: ${transaction.status}`);
      }
    } catch (err: unknown) {
      console.error('Failed to resume gig:', err);
      setError(err instanceof Error ? err.message : 'Failed to resume gig. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedGigId, getGigStatus]);

  const handleWithdrawRemaining = useCallback(async () => {
    if (!selectedGigId) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const transactionId = await fcl.mutate({
        cadence: `
          import PullStream from 0x966d51b6b6156a6f
          import FungibleToken from 0x9a0766d93b6608b7
          import FlowToken from 0x7e60df042a9c0868

          transaction(gigId: UInt64) {
              let clientVault: &FlowToken.Vault
              let gigManager: &{PullStream.GigManager}
              let withdrawnAmount: UFix64

              prepare(acct: auth(Storage, Capabilities) &Account) {
                  self.clientVault = acct.capabilities.get<&FlowToken.Vault>(/public/flowTokenReceiver)
                      .borrow() ?? panic("Could not borrow FlowToken vault")
                  
                  self.gigManager = acct.capabilities.get<&{PullStream.GigManager}>(/public/gigManager)
                      .borrow() ?? panic("Could not borrow gig manager")
              }

              execute {
                  self.withdrawnAmount = self.gigManager.withdrawRemaining(gigId: self.gigId)
              }
        `,
        args: (arg, t) => [
          arg(selectedGigId, t.UInt64),
        ],
        proposer: fcl.currentUser,
        payer: fcl.currentUser,
        authorizations: [fcl.currentUser],
        limit: 1000,
      });

      const transaction = await fcl.tx(transactionId).onceSealed();
      
      if (transaction.status === 4) {
        setSuccess('Remaining funds withdrawn successfully!');
        // Refresh gig status
        const updatedStatus = await getGigStatus(parseInt(selectedGigId));
        if (updatedStatus) {
          setGigs(prev => prev.map(gig => 
            gig.gigId === parseInt(selectedGigId) ? updatedStatus : gig
          ));
        }
      } else {
        throw new Error(`Transaction failed with status: ${transaction.status}`);
      }
    } catch (err: unknown) {
      console.error('Failed to withdraw remaining funds:', err);
      setError(err instanceof Error ? err.message : 'Failed to withdraw remaining funds. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedGigId, getGigStatus]);

  const selectedGig = gigs.find(gig => gig.gigId.toString() === selectedGigId);

  return (
    <div className="p-6 rounded-2xl bg-gray-300 shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff]">
      <h3 className="text-xl font-bold text-gray-700 mb-4">Manage Gigs</h3>
      
      {/* Gig Selection */}
      <div className="mb-4">
        <label htmlFor="gigSelect" className="block text-sm font-medium text-gray-600 mb-2">
          Select Gig
        </label>
        <select
          id="gigSelect"
          value={selectedGigId}
          onChange={(e) => setSelectedGigId(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-gray-300 shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff] border-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        >
          <option value="">Select a gig...</option>
          {gigs.map(gig => (
            <option key={gig.gigId} value={gig.gigId.toString()}>
              Gig #{gig.gigId} - {formatAmount(gig.totalAmount)}
            </option>
          ))}
        </select>
      </div>

      {/* Gig Status Display */}
      {selectedGig && (
        <div className="mb-6 p-4 rounded-xl bg-gray-300 shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff]">
          <h4 className="font-bold text-gray-700 mb-3">Gig Status</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-medium text-gray-700 ml-2">{formatAmount(selectedGig.totalAmount)}</span>
            </div>
            <div>
              <span className="text-gray-600">Amount Paid:</span>
              <span className="font-medium text-gray-700 ml-2">{formatAmount(selectedGig.amountPaid)}</span>
            </div>
            <div>
              <span className="text-gray-600">Remaining:</span>
              <span className="font-medium text-gray-700 ml-2">{formatAmount(selectedGig.remainingAmount)}</span>
            </div>
            <div>
              <span className="text-gray-600">Progress:</span>
              <span className="font-medium text-gray-700 ml-2">{(selectedGig.timePercentage * 100).toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium ml-2 ${selectedGig.paused ? 'text-yellow-600' : selectedGig.isCompleted ? 'text-green-600' : 'text-blue-600'}`}>
                {selectedGig.paused ? 'Paused' : selectedGig.isCompleted ? 'Completed' : 'Active'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Elapsed:</span>
              <span className="font-medium text-gray-700 ml-2">{formatTime(selectedGig.elapsedTime)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {selectedGig && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handlePayNow}
              disabled={isLoading || selectedGig.paused || selectedGig.isCompleted}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-xl shadow-[5px_5px_10px_#bebebe,-5px_-5px_10px_#ffffff] hover:shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff] disabled:shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm"
            >
              Pay Now
            </button>
            
            {selectedGig.paused ? (
              <button
                onClick={handleResume}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-xl shadow-[5px_5px_10px_#bebebe,-5px_-5px_10px_#ffffff] hover:shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff] disabled:shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm"
              >
                Resume
              </button>
            ) : (
              <button
                onClick={handlePause}
                disabled={isLoading || selectedGig.isCompleted}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-xl shadow-[5px_5px_10px_#bebebe,-5px_-5px_10px_#ffffff] hover:shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff] disabled:shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm"
              >
                Pause
              </button>
            )}
          </div>
          
          {selectedGig.isCompleted && (
            <button
              onClick={handleWithdrawRemaining}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-xl shadow-[5px_5px_10px_#bebebe,-5px_-5px_10px_#ffffff] hover:shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff] disabled:shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm"
            >
              Withdraw Remaining
            </button>
          )}
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <div className="mt-4 p-3 rounded-xl bg-gray-300 shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff]">
          <p className="text-red-600 text-sm text-center font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 rounded-xl bg-gray-300 shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff]">
          <p className="text-green-600 text-sm text-center font-medium">{success}</p>
        </div>
      )}
    </div>
  );
};

export default React.memo(GigManager);
