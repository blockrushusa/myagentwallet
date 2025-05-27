'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const Web3Sites = dynamic(() => import('@/components/Web3Sites'), { ssr: false })

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
  const [isTestnet, setIsTestnet] = useState(false)

  useEffect(() => {
    setShowDisclaimer(true)
  }, [])

  const showMessage = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setMessage(`${type.toUpperCase()}: ${msg}`)
    setTimeout(() => setMessage(''), 5000)
  }

  const handleGenerateWallet = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const { WalletManager } = await import('@/utils/wallet')
      const wallet = await WalletManager.generateWallet()
      setCurrentWallet(wallet)
      setPrivateKeyInput(wallet.privateKey)
      
      showMessage('New temporary wallet created successfully')
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
      
      showMessage('Wallet imported successfully')
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

      const { RealWalletConnectManager } = await import('@/utils/walletconnect-real')
      const wcManager = RealWalletConnectManager.getInstance()
      await wcManager.connectWithUri(walletConnectUri, currentWallet.privateKey, isTestnet)
      
      // Poll for sessions every second for 10 seconds
      let attempts = 0;
      const checkInterval = setInterval(() => {
        const currentSessions = wcManager.getSessions()
        if (currentSessions.length > 0) {
          setSessions(currentSessions)
          showMessage('Connected successfully to ' + currentSessions[0].peerMetadata.name)
          clearInterval(checkInterval)
        } else if (attempts > 10) {
          clearInterval(checkInterval)
        }
        attempts++
      }, 1000)
      
      showMessage('WalletConnect pairing initiated - approve in popup if shown')
    } catch (err) {
      setError('Failed to connect to dApp')
      console.error('Connection error:', err)
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
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: isTestnet ? '#d4f4dd' : '#f7fafc',
              border: '2px solid',
              borderColor: isTestnet ? '#48bb78' : '#e2e8f0',
              borderRadius: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
              <input
                type="checkbox"
                checked={isTestnet}
                onChange={(e) => setIsTestnet(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ 
                fontWeight: 'bold',
                color: isTestnet ? '#22543d' : '#4a5568'
              }}>
                {isTestnet ? 'Testnet Mode (Sepolia)' : 'Mainnet Mode'}
              </span>
            </label>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div style={{
            backgroundColor: '#bee3f8',
            border: '1px solid #90cdf4',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: '#2c5282'
          }}>
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
              backgroundColor: '#f0fff4',
              border: '1px solid #9ae6b4',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#22543d', margin: '0 0 0.5rem 0' }}>
                Active Wallet ({isTestnet ? 'Sepolia Testnet' : 'Ethereum Mainnet'}):
              </p>
              <p style={{
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                color: '#276749',
                margin: 0,
                wordBreak: 'break-all'
              }}>
                {currentWallet.address}
              </p>
              {isTestnet && (
                <p style={{ fontSize: '0.75rem', color: '#48bb78', marginTop: '0.5rem' }}>
                  ⚠️ Testnet mode active - Get free Sepolia ETH from faucets
                </p>
              )}
            </div>
          )}

          {/* Private Key Input */}
          <div style={{ marginBottom: '1.5rem' }}>
            <input
              type="password"
              placeholder="Enter Private Key (optional - or generate new)"
              value={privateKeyInput}
              onChange={(e) => setPrivateKeyInput(e.target.value)}
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
            padding: '1rem'
          }}>
            <p style={{ fontSize: '0.9rem', color: '#2c5282', margin: 0 }}>
              <strong>How to use:</strong> Go to a dApp like Uniswap → Connect Wallet → 
              Choose WalletConnect → Copy the connection link → Paste it above
            </p>
          </div>
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

        {/* Web3 Sites Directory */}
        <Web3Sites isTestnet={isTestnet} />
      </div>
    </div>
  )
}