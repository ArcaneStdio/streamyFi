import React, { useState, useEffect, useCallback } from 'react';
import * as fcl from '@onflow/fcl';
import type { CurrentUser } from '@onflow/fcl';

// Configure FCL for Flow testnet
fcl.config({
  'accessNode.api': 'https://rest-testnet.onflow.org',
  'discovery.wallet': 'https://fcl-discovery.onflow.org/testnet/authn',
  'app.detail.title': 'StreamyFi',
  'app.detail.icon': 'https://placekitten.com/g/200/200',
  '0xProfile': '0x1d7e57aa55817448',
});

interface FlowWalletConnectProps {
  onWalletConnected?: (user: CurrentUser) => void;
  onWalletDisconnected?: () => void;
}

const FlowWalletConnect: React.FC<FlowWalletConnectProps> = ({
  onWalletConnected,
  onWalletDisconnected,
}) => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const unsubscribe = fcl.currentUser.subscribe((user) => {
      setUser(user);
      if (user.loggedIn && onWalletConnected) {
        onWalletConnected(user);
      } else if (!user.loggedIn && onWalletDisconnected) {
        onWalletDisconnected();
      }
    });

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [onWalletConnected, onWalletDisconnected]);

  const handleConnect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);
      await fcl.authenticate();
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      setError('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    try {
      await fcl.unauthenticate();
    } catch (err) {
      console.error('Failed to disconnect wallet:', err);
      setError('Failed to disconnect wallet. Please try again.');
    }
  }, []);

  const formatAddress = useCallback((address?: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  if (user?.loggedIn === true) {
    return (
      <div className="p-8 rounded-3xl bg-gray-300 shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff]">
        <div className="flex items-center justify-center space-x-3 mb-6">
          <div className="w-4 h-4 bg-green-500 rounded-full shadow-lg"></div>
          <span className="text-xl font-bold text-gray-700">Wallet Connected</span>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-gray-300 shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff]">
            <p className="text-sm text-gray-600 font-medium mb-2">Wallet Address</p>
            <p className="font-mono text-sm text-gray-700 bg-gray-300 px-4 py-2 rounded-xl shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]">
              {formatAddress(user.addr)}
            </p>
          </div>

          {user.services && user.services.length > 0 && (
            <div className="p-4 rounded-2xl bg-gray-300 shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff]">
              <p className="text-sm text-gray-600 font-medium mb-2">Available Services</p>
              <p className="text-sm text-gray-700">
                {user.services.length} service(s) ready
              </p>
            </div>
          )}

          <button
            onClick={handleDisconnect}
            className="w-full px-6 py-3 bg-gray-300 text-gray-700 rounded-2xl shadow-[5px_5px_15px_#bebebe,-5px_-5px_15px_#ffffff] hover:shadow-[inset_5px_5px_15px_#bebebe,inset_-5px_-5px_15px_#ffffff] transition-all duration-300 font-bold text-sm"
          >
            Disconnect Wallet
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-gray-300 shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff]">
            <p className="text-red-600 text-sm text-center font-medium">{error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 rounded-3xl bg-gray-300 shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff]">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-gray-300 rounded-3xl shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff] mx-auto mb-4 flex items-center justify-center">
          <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-700 mb-2">
          Connect Flow Wallet
        </h3>
        <p className="text-gray-600 mb-6">
          Connect your Flow wallet to start using StreamyFi
        </p>
      </div>

      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="w-full px-8 py-4 bg-gray-300 text-gray-700 rounded-2xl shadow-[5px_5px_15px_#bebebe,-5px_-5px_15px_#ffffff] hover:shadow-[inset_5px_5px_15px_#bebebe,inset_-5px_-5px_15px_#ffffff] disabled:shadow-[inset_5px_5px_15px_#bebebe,inset_-5px_-5px_15px_#ffffff] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold text-lg flex items-center justify-center space-x-3"
      >
        {isConnecting ? (
          <>
            <div className="w-6 h-6 border-3 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Connect Wallet</span>
          </>
        )}
      </button>

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-gray-300 shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff]">
          <p className="text-red-600 text-sm text-center font-medium">{error}</p>
        </div>
      )}

      <div className="mt-6 p-4 rounded-2xl bg-gray-300 shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff]">
        <p className="text-xs text-gray-500 text-center font-medium">
          Supported wallets: Flow and Blocto
        </p>
      </div>
    </div>
  );
};

export default React.memo(FlowWalletConnect);
