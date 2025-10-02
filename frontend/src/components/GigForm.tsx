import React, { useState, useCallback } from 'react';
import * as fcl from '@onflow/fcl';
import type { CurrentUser } from '@onflow/fcl';

interface GigFormProps {
  user: CurrentUser;
  onGigCreated?: (gigId: number) => void;
}

const GigForm: React.FC<GigFormProps> = ({ user, onGigCreated }) => {
  const [formData, setFormData] = useState({
    freelancerAddress: '',
    totalAmount: '',
    duration: '', // in hours
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate form data
      if (!formData.freelancerAddress || !formData.totalAmount || !formData.duration) {
        throw new Error('Please fill in all fields');
      }

      if (parseFloat(formData.totalAmount) <= 0) {
        throw new Error('Total amount must be greater than 0');
      }

      if (parseFloat(formData.duration) <= 0) {
        throw new Error('Duration must be greater than 0');
      }

      // Check if client and freelancer addresses are the same
      if (formData.freelancerAddress.toLowerCase() === user.addr?.toLowerCase()) {
        throw new Error('Client and freelancer must be different addresses. Please enter a different freelancer address.');
      }

      // Convert duration from hours to seconds
      const durationInSeconds = parseFloat(formData.duration) * 3600;

      // Create the transaction
      const transactionId = await fcl.mutate({
        cadence: `
import PullStream from 0x966d51b6b6156a6f

transaction(freelancerAddress: Address, totalAmount: UFix64, duration: UFix64) {
    let gigManager: &PullStream.GigManagerImpl
    let clientAddress: Address

    prepare(acct: auth(Storage, Capabilities) &Account) {
        // initialize gigManager if it doesn't exist
        if acct.capabilities.get<&PullStream.GigManagerImpl>(/public/gigManager).borrow() == nil {
            let gigManager <- PullStream.createGigManager()
            acct.storage.save(<-gigManager, to: /storage/gigManager)
            
            // Issue and publish capability
            let cap = acct.capabilities.storage.issue<&PullStream.GigManagerImpl>(/storage/gigManager)
            acct.capabilities.publish(cap, at: /public/gigManager)
        }

        self.gigManager = acct.capabilities.get<&PullStream.GigManagerImpl>(/public/gigManager)
            .borrow() ?? panic("Could not borrow gig manager")

        self.clientAddress = acct.address
    }

    execute {
        let gigId = self.gigManager.createGig(
            clientAddress: self.clientAddress,
            freelancerAddress: freelancerAddress,
            totalAmount: totalAmount,
            duration: duration
        )
    }
}

        `,
        args: (arg, t) => [
          arg(formData.freelancerAddress, t.Address),
          arg(parseFloat(formData.totalAmount).toFixed(1), t.UFix64),
          arg(durationInSeconds.toFixed(1), t.UFix64),
        ],
        proposer: fcl.currentUser,
        payer: fcl.currentUser,
        authorizations: [fcl.currentUser],
        limit: 1000,
      });

      // Wait for transaction to be sealed
      const transaction = await fcl.tx(transactionId).onceSealed();
      
      if (transaction.status === 4) { // 4 = SEALED
        setSuccess(`Gig created successfully! Transaction ID: ${transactionId}`);
        setFormData({ freelancerAddress: '', totalAmount: '', duration: '' });
        
        if (onGigCreated) {
          // Extract gig ID from events (in a real implementation)
          onGigCreated(1); // Placeholder
        }
      } else {
        throw new Error(`Transaction failed with status: ${transaction.status}`);
      }
    } catch (err: unknown) {
      console.error('Failed to create gig:', err);
      setError(err instanceof Error ? err.message : 'Failed to create gig. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onGigCreated]);

  return (
    <div className="p-6 rounded-2xl bg-gray-300 shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff]">
      <h3 className="text-xl font-bold text-gray-700 mb-4">Create New Gig</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="freelancerAddress" className="block text-sm font-medium text-gray-600 mb-2">
            Freelancer Address (must be different from your address)
          </label>
          <input
            type="text"
            id="freelancerAddress"
            name="freelancerAddress"
            value={formData.freelancerAddress}
            onChange={handleInputChange}
            placeholder="0x... (different from your address)"
            className="w-full px-4 py-3 rounded-xl bg-gray-300 shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff] border-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            required
          />
        </div>

        <div>
          <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-600 mb-2">
            Total Amount (FLOW)
          </label>
          <input
            type="number"
            id="totalAmount"
            name="totalAmount"
            value={formData.totalAmount}
            onChange={handleInputChange}
            placeholder="100.0"
            step="0.01"
            min="0"
            className="w-full px-4 py-3 rounded-xl bg-gray-300 shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff] border-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            required
          />
        </div>

        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-600 mb-2">
            Duration (Hours)
          </label>
          <input
            type="number"
            id="duration"
            name="duration"
            value={formData.duration}
            onChange={handleInputChange}
            placeholder="24"
            step="0.1"
            min="0"
            className="w-full px-4 py-3 rounded-xl bg-gray-300 shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff] border-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3 bg-gray-300 text-gray-700 rounded-xl shadow-[5px_5px_15px_#bebebe,-5px_-5px_15px_#ffffff] hover:shadow-[inset_5px_5px_15px_#bebebe,inset_-5px_-5px_15px_#ffffff] disabled:shadow-[inset_5px_5px_15px_#bebebe,inset_-5px_-5px_15px_#ffffff] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold"
        >
          {isSubmitting ? 'Creating Gig...' : 'Create Gig'}
        </button>
      </form>

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

export default React.memo(GigForm);
