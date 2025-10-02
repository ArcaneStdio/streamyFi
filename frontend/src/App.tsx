import { useState, useCallback } from 'react'
import FlowWalletConnect from './components/FlowWalletConnect'
import Sidebar from './components/Sidebar'
import GigForm from './components/GigForm'
import GigManager from './components/GigManager'
import type { CurrentUser } from '@onflow/fcl'
import './App.css'

function App() {
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleWalletConnected = useCallback((connectedUser: CurrentUser) => {
    setIsWalletConnected(true)
    setUser(connectedUser)
  }, [])

  const handleWalletDisconnected = useCallback(() => {
    setIsWalletConnected(false)
    setUser(null)
  }, [])

  return (
    <div className="min-h-screen bg-gray-300 w-full">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        isWalletConnected={isWalletConnected}
        user={user}
      />
      
      {/* Main Content */}
      <div className="px-6 py-12">
        {/* Header with Menu Button and Title */}
        <div className="flex items-center justify-between mb-16">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="w-12 h-12 bg-gray-300 rounded-xl shadow-[5px_5px_15px_#bebebe,-5px_-5px_15px_#ffffff] hover:shadow-[inset_5px_5px_15px_#bebebe,inset_-5px_-5px_15px_#ffffff] transition-all duration-200 flex items-center justify-center"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="flex-1 text-center">
            <h1 className="text-4xl font-bold text-gray-700 mb-2">
              StreamyFi
            </h1>
            <p className="text-lg text-gray-600 font-medium">
              DeFi Protocol on Flow Blockchain
            </p>
          </div>
          
          <div className="w-12"></div> {/* Spacer for balance */}
        </div>

        {/* Main Content with Side Components */}
        <div className="flex items-start justify-center gap-8 mb-12">
          {/* Left Side Component */}
          <div className="hidden lg:block w-64">
            <div className="p-6 rounded-2xl bg-gray-300 shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff]">
              <h3 className="text-lg font-bold text-gray-700 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full p-3 rounded-xl bg-gray-300 shadow-[5px_5px_10px_#bebebe,-5px_-5px_10px_#ffffff] hover:shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff] transition-all duration-200 text-left">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">View Balance</span>
                  </div>
                </button>
                <button className="w-full p-3 rounded-xl bg-gray-300 shadow-[5px_5px_10px_#bebebe,-5px_-5px_10px_#ffffff] hover:shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff] transition-all duration-200 text-left">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Start Stream</span>
                  </div>
                </button>
                <button className="w-full p-3 rounded-xl bg-gray-300 shadow-[5px_5px_10px_#bebebe,-5px_-5px_10px_#ffffff] hover:shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff] transition-all duration-200 text-left">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Analytics</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Center - Wallet Connect */}
          <div className="max-w-md">
            <FlowWalletConnect
              onWalletConnected={handleWalletConnected}
              onWalletDisconnected={handleWalletDisconnected}
            />
          </div>

          {/* Right Side Component */}
          <div className="hidden lg:block w-64">
            <div className="p-6 rounded-2xl bg-gray-300 shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff]">
              <h3 className="text-lg font-bold text-gray-700 mb-4">Market Stats</h3>
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-gray-300 shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff]">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">FLOW Price</span>
                    <span className="text-sm font-bold text-gray-700">$0.85</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gray-300 shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff]">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">TVL</span>
                    <span className="text-sm font-bold text-gray-700">$2.4M</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gray-300 shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff]">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">APY</span>
                    <span className="text-sm font-bold text-green-600">12.5%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gig Management Section */}
        {isWalletConnected && user && (
          <div className="max-w-6xl mx-auto mb-16">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Create Gig Form */}
              <div>
                <GigForm 
                  user={user}
                  onGigCreated={() => {
                    // You could add logic here to refresh the gig list
                  }}
                />
              </div>
              
              {/* Manage Gigs */}
              <div>
                <GigManager user={user} />
              </div>
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-700 text-center mb-8">
            Platform Features
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-gray-300 shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff] text-center">
              <div className="w-16 h-16 bg-gray-300 rounded-2xl shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff] mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-gray-700 mb-2">Stream Payments</h4>
              <p className="text-gray-600 text-sm">Real-time payment streaming with Flow blockchain</p>
            </div>
            
            <div className="p-6 rounded-2xl bg-gray-300 shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff] text-center">
              <div className="w-16 h-16 bg-gray-300 rounded-2xl shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff] mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-gray-700 mb-2">Yield Farming</h4>
              <p className="text-gray-600 text-sm">Maximize returns with automated yield strategies</p>
            </div>
            
            <div className="p-6 rounded-2xl bg-gray-300 shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff] text-center">
              <div className="w-16 h-16 bg-gray-300 rounded-2xl shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff] mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-gray-700 mb-2">Cross-Chain</h4>
              <p className="text-gray-600 text-sm">Seamless liquidity across multiple blockchains</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
