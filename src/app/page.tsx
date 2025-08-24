'use client'

import { useState, useEffect } from 'react'
import Web3Sites from '@/components/Web3Sites'
import { preloadEthers } from '@/utils/preload-ethers'
import { trackEvent, trackPageView } from '@/components/Analytics'

interface WalletData {
  address: string;
  privateKey: string;
}

interface WalletConnectSession {
  topic: string;
  peerMetadata: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
}

export default function HomePage() {
  const [privateKeyInput, setPrivateKeyInput] = useState('')
  const [walletConnectUri, setWalletConnectUri] = useState('')
  const [currentWallet, setCurrentWallet] = useState<WalletData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessions, setSessions] = useState<WalletConnectSession[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning'>('success')
  const [isTestnet, setIsTestnet] = useState(false)
  const [showAddress, setShowAddress] = useState(true)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [pendingProposal, setPendingProposal] = useState<any>(null)
  const [showExportModal, setShowExportModal] = useState(false)

  useEffect(() => {
    setShowDisclaimer(true)
    // Preload ethers.js to avoid chunk loading issues
    preloadEthers()
    // Track page view (privacy-safe)
    trackPageView('Wallet Home')
  }, [])

  // Periodic session check
  useEffect(() => {
    let intervalId: NodeJS.Timeout
    
    const checkSessions = async () => {
      try {
        const { RealWalletConnectManager } = await import('@/utils/walletconnect-real')
        const wcManager = RealWalletConnectManager.getInstance()
        const currentSessions = wcManager.getSessions()
        
        if (currentSessions.length > 0 && sessions.length === 0) {
          setSessions(currentSessions)
          showMessage(`Connected! ${currentSessions.length} active session(s).`)
        } else if (currentSessions.length === 0 && sessions.length > 0) {
          setSessions([])
          showMessage('All sessions disconnected.', 'warning')
        }
      } catch {
        // WalletConnect not initialized yet, ignore
      }
    }

    // Check every 3 seconds for session updates
    intervalId = setInterval(checkSessions, 3000)
    
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [sessions.length])

  const showMessage = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(''), 8000) // Longer timeout for better UX
  }

  const handleGenerateWallet = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const { WalletManager } = await import('@/utils/wallet')
      const wallet = await WalletManager.generateWallet()
      setCurrentWallet(wallet)
      setPrivateKeyInput(wallet.privateKey)
      setShowAddress(true) // Always show address when generating new wallet
      
      showMessage('New temporary wallet created successfully')
      
      // Track wallet generation (no sensitive data)
      trackEvent('wallet_generated', { 
        method: 'new_generation',
        network: isTestnet ? 'testnet' : 'mainnet'
      })
    } catch (err) {
      setError('Failed to generate wallet')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImportWallet = async () => {
    try {
      setError('')
      
      if (!privateKeyInput.trim()) {
        setError('Please enter a private key')
        return
      }

      const { WalletManager } = await import('@/utils/wallet')
      
      if (!WalletManager.validatePrivateKey(privateKeyInput)) {
        setError('Invalid private key format')
        return
      }

      const wallet = WalletManager.getWalletFromPrivateKey(privateKeyInput)
      setCurrentWallet(wallet)
      setShowAddress(true) // Show address when importing wallet
      
      showMessage('Wallet imported successfully')
      
      // Track wallet import (no sensitive data)
      trackEvent('wallet_generated', { 
        method: 'private_key_import',
        network: isTestnet ? 'testnet' : 'mainnet'
      })
    } catch {
      setError('Failed to import wallet')
    }
  }

  const handleConnect = async () => {
    if (!currentWallet) {
      setError('Please generate or import a wallet first')
      return
    }

    if (!walletConnectUri.trim()) {
      setError('Please enter a WalletConnect URI')
      return
    }

    try {
      setIsLoading(true)
      setError('')

      console.log('=== Starting WalletConnect Connection ===')
      console.log('Network mode:', isTestnet ? 'Sepolia Testnet' : 'Ethereum Mainnet')
      console.log('Wallet address:', currentWallet.address)
      console.log('WalletConnect URI:', walletConnectUri)

      // Use the real WalletConnect manager instead of simplified version
      const { RealWalletConnectManager } = await import('@/utils/walletconnect-real')
      const wcManager = RealWalletConnectManager.getInstance()
      
      // Set up the proposal callback
      wcManager.setOnProposalCallback((proposal) => {
        console.log('Setting pending proposal:', proposal)
        setPendingProposal(proposal)
        showMessage('Connection request received! Please approve or reject.', 'warning')
      })
      
      // Initialize if needed
      await wcManager.initialize()
      
      showMessage('Initializing connection...', 'warning')
      
      // Connect with URI and network mode
      await wcManager.connectWithUri(walletConnectUri, currentWallet.privateKey, isTestnet)
      
      showMessage('Pairing initiated. Waiting for session proposal from dApp...', 'warning')
      
    } catch (err) {
      console.error('=== Connection Error ===', err)
      setError('Connection failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
      showMessage('Connection failed. Check console for details.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setWalletConnectUri(text)
    } catch {
      showMessage('Please paste the URI manually', 'warning')
    }
  }

  const exportWallet = (format: 'json' | 'text', includePrivateKey: boolean, includeMnemonic: boolean) => {
    if (!currentWallet) {
      showMessage('No wallet to export', 'error')
      return
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const networkSuffix = isTestnet ? '-sepolia' : '-mainnet'
    
    const walletData: any = {
      address: currentWallet.address,
      network: isTestnet ? 'Sepolia Testnet' : 'Ethereum Mainnet',
      created: new Date().toISOString(),
      source: 'MyAgentWallet'
    }

    if (includePrivateKey) {
      walletData.privateKey = currentWallet.privateKey
    }

    if (includeMnemonic) {
      // Note: Current implementation doesn't generate mnemonic
      // This would require updating the wallet generation to use mnemonic
      walletData.mnemonic = 'Not available - wallet generated from private key'
    }

    let content: string
    let filename: string
    let mimeType: string

    if (format === 'json') {
      content = JSON.stringify(walletData, null, 2)
      filename = `wallet-${currentWallet.address.slice(0, 8)}${networkSuffix}-${timestamp}.json`
      mimeType = 'application/json'
    } else {
      content = `MyAgentWallet Export
===================
Address: ${walletData.address}
Network: ${walletData.network}
Created: ${walletData.created}
Source: ${walletData.source}

${includePrivateKey ? `Private Key: ${walletData.privateKey}\n` : ''}${includeMnemonic ? `Mnemonic: ${walletData.mnemonic}\n` : ''}
⚠️  SECURITY WARNING: Keep this information secure and private!
⚠️  Never share your private key with anyone!
⚠️  MyAgentWallet is for temporary use only!
`
      filename = `wallet-${currentWallet.address.slice(0, 8)}${networkSuffix}-${timestamp}.txt`
      mimeType = 'text/plain'
    }

    // Create and trigger download
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showMessage(`Wallet exported as ${filename}`, 'success')
    setShowExportModal(false)
  }

  if (showDisclaimer) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f7fafc',
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '2rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h1 style={{
            textAlign: 'center',
            color: '#f56500',
            marginBottom: '2rem',
            fontSize: '2rem'
          }}>
            ⚠️ Important Disclaimer
          </h1>
          
          <div style={{
            backgroundColor: '#fed7d7',
            border: '2px solid #f56565',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ color: '#c53030', marginBottom: '0.5rem' }}>Beta Software Warning</h3>
            <p style={{ color: '#744210', margin: 0 }}>This application is in beta. Use at your own risk.</p>
          </div>
          
          <h3 style={{ marginBottom: '1rem' }}>Terms of Use:</h3>
          <ul style={{ paddingLeft: '1rem', marginBottom: '1.5rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>This wallet is designed for temporary use only</li>
            <li style={{ marginBottom: '0.5rem' }}>Never store large amounts or important assets</li>
            <li style={{ marginBottom: '0.5rem' }}>The service is provided "as is" without warranties</li>
            <li style={{ marginBottom: '0.5rem' }}>Users are responsible for any losses</li>
            <li style={{ marginBottom: '0.5rem' }}>All cryptographic operations happen client-side</li>
            <li style={{ marginBottom: '0.5rem' }}>No private keys are stored on servers</li>
          </ul>
          
          <hr style={{ margin: '1.5rem 0', border: 'none', height: '1px', backgroundColor: '#e2e8f0' }} />
          
          <p style={{ fontSize: '0.9rem', color: '#718096', marginBottom: '1.5rem' }}>
            By using this application, you acknowledge that you understand 
            these risks and agree to use the service at your own discretion.
          </p>
          
          <button 
            onClick={() => setShowDisclaimer(false)}
            style={{
              width: '100%',
              padding: '1rem',
              backgroundColor: '#3182ce',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              cursor: 'pointer'
            }}
          >
            I Understand and Accept
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f7fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '3rem', marginRight: '1rem' }}>💼</span>
            <h1 style={{ color: '#3182ce', margin: 0, fontSize: '2.5rem' }}>MyAgentWallet</h1>
          </div>
          <p style={{ fontSize: '1.2rem', color: '#718096', margin: '0.5rem 0' }}>
            Online Web3 Wallet for AI Agents
          </p>
          
          {/* Navigation */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '1rem', 
            marginBottom: '1rem',
            flexWrap: 'wrap'
          }}>
            <a
              href="/vanity"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#f0f9ff',
                color: '#0369a1',
                textDecoration: 'none',
                borderRadius: '8px',
                border: '1px solid #0ea5e9',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e0f2fe'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f9ff'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              ✨ Vanity Wallet Generator
            </a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{
              backgroundColor: '#fed7d7',
              color: '#c53030',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              fontSize: '0.9rem',
              fontWeight: 'bold'
            }}>
              BETA - Use at your own risk
            </span>
            
            {/* Professional Network Switch */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <label 
                htmlFor="network-toggle"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  userSelect: 'none'
                }}
              >
                Network:
              </label>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                {/* Left Label - Mainnet */}
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: !isTestnet ? '#1e40af' : '#9ca3af',
                  transition: 'color 0.2s ease',
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <span style={{ fontSize: '12px' }}>🌐</span>
                  Mainnet
                </span>
                
                <div style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}>
                  {/* Hidden checkbox for accessibility */}
                  <input
                    type="checkbox"
                    id="network-toggle"
                    role="switch"
                    checked={isTestnet}
                    onChange={(e) => setIsTestnet(e.target.checked)}
                    aria-label={`Switch to ${isTestnet ? 'mainnet' : 'testnet'} mode`}
                    aria-describedby="network-description"
                    style={{
                      position: 'absolute',
                      opacity: 0,
                      width: '64px',
                      height: '32px',
                      cursor: 'pointer',
                      zIndex: 10
                    }}
                    onFocus={(e) => {
                      const parent = e.target.parentElement;
                      if (parent) {
                        parent.style.outline = '3px solid #3b82f6';
                        parent.style.outlineOffset = '2px';
                      }
                    }}
                    onBlur={(e) => {
                      const parent = e.target.parentElement;
                      if (parent) {
                        parent.style.outline = 'none';
                      }
                    }}
                  />
                  
                  {/* Switch Track */}
                  <div style={{
                    position: 'relative',
                    width: '64px',
                    height: '32px',
                    backgroundColor: isTestnet ? '#10b981' : '#1e40af',
                    borderRadius: '16px',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isTestnet 
                      ? 'inset 0 2px 4px rgba(16, 185, 129, 0.3), 0 1px 3px rgba(0, 0, 0, 0.1)'
                      : 'inset 0 2px 4px rgba(30, 64, 175, 0.3), 0 1px 3px rgba(0, 0, 0, 0.1)',
                    border: '2px solid',
                    borderColor: isTestnet ? '#065f46' : '#1e3a8a'
                  }}>
                    {/* Switch Handle */}
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      left: isTestnet ? '34px' : '2px',
                      width: '26px',
                      height: '26px',
                      backgroundColor: '#ffffff',
                      borderRadius: '50%',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      border: '1px solid rgba(0, 0, 0, 0.1)'
                    }}>
                      {isTestnet ? '🧪' : '🌐'}
                    </div>
                  </div>
                </div>
                
                {/* Right Label - Testnet */}
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: isTestnet ? '#10b981' : '#9ca3af',
                  transition: 'color 0.2s ease',
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <span style={{ fontSize: '12px' }}>🧪</span>
                  Testnet
                </span>
              </div>
              
              {/* Current State Display */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.375rem 0.75rem',
                backgroundColor: isTestnet ? '#d1fae5' : '#dbeafe',
                color: isTestnet ? '#065f46' : '#1e3a8a',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '600',
                border: '1px solid',
                borderColor: isTestnet ? '#a7f3d0' : '#93c5fd'
              }}>
                <span style={{ fontSize: '14px' }}>
                  {isTestnet ? '🧪' : '🌐'}
                </span>
                <span>
                  {isTestnet ? 'Sepolia Testnet' : 'Ethereum Mainnet'}
                </span>
              </div>
            </div>
            
            {/* Hidden description for screen readers */}
            <span 
              id="network-description" 
              style={{
                position: 'absolute',
                left: '-10000px',
                width: '1px',
                height: '1px',
                overflow: 'hidden'
              }}
            >
              Toggle between Ethereum mainnet and Sepolia testnet. Currently on {isTestnet ? 'testnet' : 'mainnet'}.
            </span>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div style={{
            backgroundColor: messageType === 'success' ? '#d1fae5' : 
                           messageType === 'warning' ? '#fef3c7' : 
                           '#fed7d7',
            border: `1px solid ${messageType === 'success' ? '#a7f3d0' : 
                                 messageType === 'warning' ? '#f6e05e' : 
                                 '#f56565'}`,
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: messageType === 'success' ? '#065f46' : 
                   messageType === 'warning' ? '#744210' : 
                   '#c53030',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.2rem' }}>
              {messageType === 'success' ? '✅' : 
               messageType === 'warning' ? '⚠️' : 
               '❌'}
            </span>
            {message}
          </div>
        )}

        {/* Security Warning */}
        <div style={{
          backgroundColor: '#fefcbf',
          border: '1px solid #f6e05e',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: '1.5rem', marginRight: '1rem' }}>⚠️</span>
          <div>
            <h3 style={{ color: '#744210', margin: '0 0 0.5rem 0' }}>Security Notice!</h3>
            <p style={{ color: '#744210', margin: 0 }}>
              This is a temporary wallet solution. Never use with large amounts or important assets.
              All data is processed client-side only.
            </p>
          </div>
        </div>

        {/* Wallet Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ color: '#4a5568', margin: 0 }}>🛡️ Wallet Setup</h2>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                background: 'none',
                border: '1px solid #e2e8f0',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Advanced Options
            </button>
          </div>

          {/* Current Wallet Display */}
          {currentWallet && (
            <div style={{
              backgroundColor: isTestnet ? '#f0fff4' : '#ebf8ff',
              border: `2px solid ${isTestnet ? '#48bb78' : '#3182ce'}`,
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
              position: 'relative'
            }}>
              {/* Network Badge */}
              <div style={{
                position: 'absolute',
                top: '-8px',
                right: '16px',
                backgroundColor: isTestnet ? '#48bb78' : '#3182ce',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <span>{isTestnet ? '🧪' : '🌐'}</span>
                {isTestnet ? 'SEPOLIA TESTNET' : 'ETHEREUM MAINNET'}
              </div>
              
              <div style={{ marginTop: '8px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <p style={{ 
                    fontSize: '0.9rem', 
                    fontWeight: 'bold', 
                    color: isTestnet ? '#22543d' : '#1a365d', 
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>💼</span>
                    Active Wallet Address:
                  </p>
                  
                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setShowAddress(!showAddress)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        border: '1px solid',
                        borderColor: isTestnet ? '#9ae6b4' : '#93c5fd',
                        borderRadius: '6px',
                        color: isTestnet ? '#065f46' : '#1e40af',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 1)'
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.8)'
                      }}
                    >
                      <span style={{ fontSize: '10px' }}>
                        {showAddress ? '🙈' : '👁️'}
                      </span>
                      {showAddress ? 'Hide' : 'Show'}
                    </button>
                    
                    <button
                      onClick={() => setShowExportModal(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        border: '1px solid',
                        borderColor: isTestnet ? '#9ae6b4' : '#93c5fd',
                        borderRadius: '6px',
                        color: isTestnet ? '#065f46' : '#1e40af',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 1)'
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.8)'
                      }}
                      title="Export wallet"
                    >
                      <span style={{ fontSize: '10px' }}>💾</span>
                      Export
                    </button>
                  </div>
                </div>
                
                <div style={{
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  color: isTestnet ? '#276749' : '#2c5282',
                  margin: 0,
                  wordBreak: 'break-all',
                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {showAddress ? (
                    currentWallet.address
                  ) : (
                    <span style={{ 
                      color: '#9ca3af',
                      fontStyle: 'italic',
                      fontFamily: 'system-ui'
                    }}>
                      Address hidden for privacy • Click "Show" to reveal
                    </span>
                  )}
                  
                  {showAddress && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(currentWallet.address)
                        showMessage('Address copied to clipboard!', 'success')
                      }}
                      style={{
                        padding: '0.25rem',
                        backgroundColor: 'transparent',
                        border: '1px solid',
                        borderColor: isTestnet ? '#9ae6b4' : '#93c5fd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        color: isTestnet ? '#065f46' : '#1e40af',
                        transition: 'all 0.2s ease',
                        marginLeft: 'auto',
                        flexShrink: 0
                      }}
                      title="Copy address"
                    >
                      📋
                    </button>
                  )}
                </div>
                {isTestnet && (
                  <div style={{ 
                    marginTop: '0.75rem',
                    padding: '0.5rem',
                    backgroundColor: '#c6f6d5',
                    borderRadius: '6px',
                    border: '1px solid #9ae6b4'
                  }}>
                    <p style={{ fontSize: '0.75rem', color: '#22543d', margin: 0, fontWeight: 'bold' }}>
                      💡 Testnet Mode: Get free Sepolia ETH from faucets like sepolia-faucet.pk910.de
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Private Key Input */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative' }}>
              <input
                type={showPrivateKey ? "text" : "password"}
                placeholder="Enter Private Key (optional - or generate new)"
                value={privateKeyInput}
                onChange={(e) => setPrivateKeyInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem 3rem 1rem 1rem',
                  fontSize: '1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  boxSizing: 'border-box'
                }}
              />
              
              {/* Show/Hide Toggle for Private Key */}
              <button
                onClick={() => setShowPrivateKey(!showPrivateKey)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  color: '#9ca3af',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={showPrivateKey ? 'Hide private key' : 'Show private key'}
              >
                {showPrivateKey ? '🙈' : '👁️'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleGenerateWallet}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '1rem',
                  backgroundColor: '#3182ce',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? 'Generating...' : 'Generate New Wallet'}
              </button>
              <button
                onClick={handleImportWallet}
                style={{
                  flex: 1,
                  padding: '1rem',
                  backgroundColor: 'white',
                  color: '#3182ce',
                  border: '2px solid #3182ce',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                Import Wallet
              </button>
            </div>
          </div>

          {showAdvanced && (
            <div style={{
              backgroundColor: '#f7fafc',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <p style={{ fontSize: '0.9rem', color: '#718096', margin: '0 0 0.5rem 0' }}>
                Advanced: For development and testing purposes only
              </p>
              <p style={{
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                color: '#a0aec0',
                margin: 0
              }}>
                Example private key: 0x7f632445a50e8b0236b6f9132af3726ca2809fa5ce5205196b232ff4f3169b32
              </p>
            </div>
          )}
        </div>

        {/* Connection Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ color: '#4a5568', margin: '0 0 1.5rem 0' }}>🔗 Connect to dApp</h2>

          <div style={{ marginBottom: '1.5rem' }}>
            <input
              type="text"
              placeholder="Paste WalletConnect URI here..."
              value={walletConnectUri}
              onChange={(e) => setWalletConnectUri(e.target.value)}
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1rem',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                marginBottom: '1rem',
                boxSizing: 'border-box'
              }}
            />
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleConnect}
                disabled={isLoading || !currentWallet}
                style={{
                  flex: 1,
                  padding: '1rem',
                  backgroundColor: '#805ad5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  cursor: (isLoading || !currentWallet) ? 'not-allowed' : 'pointer',
                  opacity: (isLoading || !currentWallet) ? 0.6 : 1
                }}
              >
                {isLoading ? 'Connecting...' : 'Connect'}
              </button>
              <button
                onClick={pasteFromClipboard}
                style={{
                  padding: '1rem',
                  backgroundColor: 'white',
                  color: '#805ad5',
                  border: '2px solid #805ad5',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                Paste from Clipboard
              </button>
            </div>
          </div>

          <div style={{
            backgroundColor: '#ebf8ff',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <p style={{ fontSize: '0.9rem', color: '#2c5282', margin: '0 0 0.75rem 0' }}>
              <strong>How to use:</strong> Go to a dApp like Uniswap → Connect Wallet → 
              Choose WalletConnect → Copy the connection link → Paste it above
            </p>
            <p style={{ fontSize: '0.8rem', color: '#1e40af', margin: 0 }}>
              <strong>Debug tip:</strong> Check browser console (F12) for detailed connection logs and errors.
              Make sure you have a wallet generated first!
            </p>
          </div>
          
          {/* Connection Status */}
          {currentWallet && (
            <div style={{
              backgroundColor: isTestnet ? '#f0fff4' : '#ebf8ff',
              border: '1px solid',
              borderColor: isTestnet ? '#a7f3d0' : '#93c5fd',
              borderRadius: '8px',
              padding: '0.75rem',
              fontSize: '0.85rem',
              color: isTestnet ? '#065f46' : '#1e40af'
            }}>
              <strong>Ready to connect on {isTestnet ? 'Sepolia Testnet' : 'Ethereum Mainnet'}</strong>
              <br />
              Wallet: {currentWallet.address.slice(0, 6)}...{currentWallet.address.slice(-4)}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            backgroundColor: '#fed7d7',
            border: '1px solid #f56565',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: '#c53030'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Active Sessions */}
        {sessions.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ color: '#4a5568', margin: '0 0 1rem 0' }}>Active Connections</h2>
            {sessions.map((session, index) => (
              <div key={index} style={{
                backgroundColor: '#f0fff4',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '0.5rem'
              }}>
                <p style={{ fontWeight: 'bold', margin: '0 0 0.25rem 0' }}>
                  {session.peerMetadata?.name || 'Unknown dApp'}
                </p>
                <p style={{ fontSize: '0.9rem', color: '#718096', margin: 0 }}>
                  {session.peerMetadata?.url}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Connection Approval Modal */}
        {pendingProposal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
              <h2 style={{ 
                color: '#1f2937', 
                margin: '0 0 1rem 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                🔗 Connection Request
              </h2>
              
              <div style={{
                backgroundColor: '#f3f4f6',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
                  {pendingProposal.proposer?.metadata?.name || 'Unknown dApp'}
                </p>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#6b7280' }}>
                  {pendingProposal.proposer?.metadata?.url || 'Unknown URL'}
                </p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af' }}>
                  Wants to connect to your wallet
                </p>
              </div>

              <div style={{
                backgroundColor: isTestnet ? '#f0fff4' : '#ebf8ff',
                border: '1px solid',
                borderColor: isTestnet ? '#9ae6b4' : '#93c5fd',
                borderRadius: '6px',
                padding: '0.75rem',
                marginBottom: '1.5rem'
              }}>
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.85rem',
                  color: isTestnet ? '#065f46' : '#1e40af',
                  fontWeight: '600'
                }}>
                  📍 Network: {isTestnet ? 'Sepolia Testnet' : 'Ethereum Mainnet'}
                </p>
                <p style={{ 
                  margin: '0.25rem 0 0 0', 
                  fontSize: '0.75rem',
                  color: isTestnet ? '#22543d' : '#2563eb',
                  fontFamily: 'monospace'
                }}>
                  💼 {currentWallet?.address.slice(0, 6)}...{currentWallet?.address.slice(-4)}
                </p>
              </div>

              <div style={{
                display: 'flex',
                gap: '1rem'
              }}>
                <button
                  onClick={async () => {
                    try {
                      const { RealWalletConnectManager } = await import('@/utils/walletconnect-real')
                      const wcManager = RealWalletConnectManager.getInstance()
                      await wcManager.rejectProposal(pendingProposal.id)
                      setPendingProposal(null)
                      showMessage('Connection request rejected.', 'warning')
                    } catch (error) {
                      console.error('Failed to reject proposal:', error)
                      showMessage('Failed to reject connection.', 'error')
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: '#f9fafb',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  ❌ Reject
                </button>
                <button
                  onClick={async () => {
                    try {
                      const { RealWalletConnectManager } = await import('@/utils/walletconnect-real')
                      const wcManager = RealWalletConnectManager.getInstance()
                      await wcManager.approveProposal(pendingProposal.id)
                      setPendingProposal(null)
                      showMessage('Connection approved! You should now be connected to the dApp.', 'success')
                    } catch (error) {
                      console.error('Failed to approve proposal:', error)
                      showMessage('Failed to approve connection.', 'error')
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  ✅ Approve
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Wallet Modal */}
        {showExportModal && currentWallet && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
              <h2 style={{ 
                color: '#1f2937', 
                margin: '0 0 1rem 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                💾 Export Wallet
              </h2>
              
              <div style={{
                backgroundColor: '#fed7d7',
                border: '1px solid #f56565',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ color: '#c53030', margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>⚠️ Security Warning</h3>
                <p style={{ color: '#744210', margin: 0, fontSize: '0.8rem' }}>
                  Exported files contain sensitive information. Store them securely and never share your private key!
                </p>
              </div>

              <div style={{
                backgroundColor: '#f3f4f6',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Wallet: {currentWallet.address.slice(0, 6)}...{currentWallet.address.slice(-4)}
                </p>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#6b7280' }}>
                  Network: {isTestnet ? 'Sepolia Testnet' : 'Ethereum Mainnet'}
                </p>
              </div>

              <h3 style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '1rem' }}>Export Options</h3>
              
              <div style={{ display: 'grid', gap: '1rem' }}>
                {/* JSON Export Options */}
                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: '#1f2937', fontSize: '0.9rem' }}>
                    📄 JSON Format
                  </h4>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    <button
                      onClick={() => exportWallet('json', false, false)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        textAlign: 'left'
                      }}
                    >
                      📋 Address Only (Safe for sharing)
                    </button>
                    <button
                      onClick={() => exportWallet('json', true, false)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#fef3c7',
                        border: '1px solid #f59e0b',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        textAlign: 'left'
                      }}
                    >
                      🔑 Address + Private Key (Keep Secure!)
                    </button>
                    <button
                      onClick={() => exportWallet('json', true, true)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#fed7d7',
                        border: '1px solid #f56565',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        textAlign: 'left'
                      }}
                    >
                      🔐 Complete Export (Most Sensitive)
                    </button>
                  </div>
                </div>

                {/* Text Export Options */}
                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: '#1f2937', fontSize: '0.9rem' }}>
                    📝 Text Format
                  </h4>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    <button
                      onClick={() => exportWallet('text', false, false)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        textAlign: 'left'
                      }}
                    >
                      📋 Address Only (Safe for sharing)
                    </button>
                    <button
                      onClick={() => exportWallet('text', true, false)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#fef3c7',
                        border: '1px solid #f59e0b',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        textAlign: 'left'
                      }}
                    >
                      🔑 Address + Private Key (Keep Secure!)
                    </button>
                    <button
                      onClick={() => exportWallet('text', true, true)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#fed7d7',
                        border: '1px solid #f56565',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        textAlign: 'left'
                      }}
                    >
                      🔐 Complete Export (Most Sensitive)
                    </button>
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '1.5rem'
              }}>
                <button
                  onClick={() => setShowExportModal(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#f9fafb',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Web3 Sites Directory */}
        <Web3Sites isTestnet={isTestnet} />

        {/* Support/Donation Footer */}
        <div style={{
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          padding: '1.5rem',
          marginTop: '2rem',
          border: '1px solid #e9ecef',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}>💖</span>
            <h3 style={{ 
              color: '#495057', 
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: '600'
            }}>
              Support This Project
            </h3>
          </div>
          
          <p style={{ 
            color: '#6c757d', 
            margin: '0 0 1rem 0',
            fontSize: '0.9rem',
            lineHeight: '1.4'
          }}>
            If MyAgentWallet has been helpful, consider supporting development by contributing ERC20 tokens
          </p>
          
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            padding: '0.75rem',
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap'
          }}>
            <span style={{ 
              fontSize: '0.8rem', 
              color: '#6c757d',
              fontWeight: '600'
            }}>
              Donation Address:
            </span>
            <code style={{ 
              fontFamily: 'monospace', 
              fontSize: '0.85rem',
              color: '#495057',
              backgroundColor: '#f8f9fa',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              border: '1px solid #e9ecef',
              wordBreak: 'break-all'
            }}>
              0xE73705C1479f68F958Bf4F35a368B2dD838FD575
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText('0xE73705C1479f68F958Bf4F35a368B2dD838FD575')
                showMessage('Donation address copied to clipboard! Thank you for your support! 💖', 'success')
              }}
              style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: '#e7f3ff',
                border: '1px solid #b3d7ff',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                color: '#0066cc',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
              title="Copy donation address"
            >
              📋 Copy
            </button>
          </div>
          
          <p style={{ 
            color: '#6c757d', 
            margin: 0,
            fontSize: '0.75rem',
            fontStyle: 'italic'
          }}>
            Any ERC20 tokens on Ethereum mainnet • Your support helps keep this project free and open source
          </p>
        </div>
      </div>
    </div>
  )
}