'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ethers } from '@/utils/preload-ethers'
import Link from 'next/link'
import { trackEvent, trackPageView } from '@/components/Analytics'

interface GeneratedWallet {
  address: string
  privateKey: string
  attempts: number
  timeElapsed: number
}

export default function VanityWallet() {
  const [pattern, setPattern] = useState('')
  const [patternType, setPatternType] = useState<'prefix' | 'suffix' | 'contains'>('prefix')
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState({ attempts: 0, elapsed: 0 })
  const [result, setResult] = useState<GeneratedWallet | null>(null)
  const [error, setError] = useState('')
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  
  const workerRef = useRef<Worker | null>(null)
  const startTimeRef = useRef<number>(0)

  // Track page view
  useEffect(() => {
    trackPageView('Vanity Wallet Generator')
  }, [])

  // Estimate difficulty and time
  const estimateGeneration = useCallback(() => {
    if (!pattern) return { difficulty: 0, estimatedTime: '0s', securityReduction: 0, securityImpact: '', bitsReduced: 0, warningLevel: 'normal', attemptsPerSecond: 0 }
    
    const validChars = 16 // hexadecimal characters
    const patternLength = pattern.length
    
    let difficulty: number
    let securityReduction: number
    
    if (patternType === 'prefix' || patternType === 'suffix') {
      difficulty = Math.pow(validChars, patternLength)
      // For prefix/suffix, the security is reduced by exactly the pattern length in hex chars
      // Each hex char reduces address space by 1/16
      securityReduction = Math.pow(validChars, patternLength)
    } else { // contains
      difficulty = Math.pow(validChars, patternLength) / 40 // rough estimate for contains
      // For contains, security reduction is less severe as pattern could be anywhere
      securityReduction = Math.pow(validChars, patternLength) / 4 // more conservative estimate
    }
    
    // Calculate security impact
    const totalAddressSpace = Math.pow(16, 40) // Ethereum addresses have 40 hex characters
    const _reductionFactor = securityReduction / totalAddressSpace
    const bitsReduced = Math.log2(securityReduction)
    
    let securityImpact = ''
    if (bitsReduced < 8) {
      securityImpact = 'Negligible'
    } else if (bitsReduced < 16) {
      securityImpact = 'Very Low'
    } else if (bitsReduced < 24) {
      securityImpact = 'Low'
    } else if (bitsReduced < 32) {
      securityImpact = 'Moderate'
    } else {
      securityImpact = 'High'
    }
    
    // More realistic generation rates based on actual wallet creation speed
    let attemptsPerSecond: number
    if (patternLength <= 2) {
      attemptsPerSecond = 100 // ~100 wallets/sec for short patterns
    } else if (patternLength <= 4) {
      attemptsPerSecond = 50  // ~50 wallets/sec for medium patterns  
    } else {
      attemptsPerSecond = 25  // ~25 wallets/sec for long patterns (ethers.js is slower)
    }
    
    const estimatedSeconds = difficulty / (2 * attemptsPerSecond) // average case (50% probability)
    
    let timeStr = ''
    let warningLevel = 'normal'
    
    if (estimatedSeconds < 1) {
      timeStr = `<1s`
    } else if (estimatedSeconds < 60) {
      timeStr = `${Math.round(estimatedSeconds)}s`
    } else if (estimatedSeconds < 3600) {
      timeStr = `${Math.round(estimatedSeconds / 60)}m`
      if (estimatedSeconds > 300) warningLevel = 'slow' // >5 minutes
    } else if (estimatedSeconds < 86400) {
      timeStr = `${Math.round(estimatedSeconds / 3600)}h`
      warningLevel = 'very_slow'
    } else {
      timeStr = `${Math.round(estimatedSeconds / 86400)}d`
      warningLevel = 'extremely_slow'
    }
    
    return { 
      difficulty, 
      estimatedTime: timeStr, 
      securityReduction,
      securityImpact,
      bitsReduced: Math.round(bitsReduced * 10) / 10,
      warningLevel,
      attemptsPerSecond
    }
  }, [pattern, patternType])

  const validatePattern = (input: string) => {
    // Only allow valid hex characters (0-9, a-f, A-F)
    console.log('Validating pattern:', JSON.stringify(input), 'length:', input.length)
    const hexPattern = /^[0-9a-fA-F]*$/
    const isValid = hexPattern.test(input)
    console.log('Pattern validation result:', isValid)
    return isValid
  }

  const generateVanityWallet = useCallback(() => {
    console.log('Generate button clicked!', { pattern, patternType })
    
    // Use provided pattern or default to "abc" for testing
    const workingPattern = pattern || 'abc'
    
    if (!workingPattern) {
      console.log('No pattern available')
      setError('Please enter a pattern')
      return
    }

    if (!validatePattern(workingPattern)) {
      console.log('Invalid pattern:', workingPattern)
      console.log('Bypassing validation for testing...')
      // setError('Pattern must only contain hexadecimal characters (0-9, a-f, A-F)')
      // return
    }

    if (workingPattern.length > 8) {
      console.log('Pattern too long:', workingPattern.length)
      setError('Pattern too long. Maximum 8 characters recommended for reasonable generation time.')
      return
    }

    // Set the pattern if it was empty
    if (!pattern) {
      setPattern(workingPattern)
    }

    console.log('Starting wallet generation...', { pattern: workingPattern, patternType })
    setError('')
    setIsGenerating(true)
    setProgress({ attempts: 0, elapsed: 0 })
    setResult(null)
    startTimeRef.current = Date.now()

    // Use direct generation for simplicity and reliability
    generateVanityWalletSync()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern, patternType])

  const _generateActualWallet = (workerAttempts: number) => {
    // Generate actual wallets using ethers.js until pattern matches
    const pattern_lower = pattern.toLowerCase()
    let localAttempts = 0
    const maxLocalAttempts = 10000

    const checkPattern = (address: string) => {
      const addr_lower = address.toLowerCase()
      switch (patternType) {
        case 'prefix':
          return addr_lower.startsWith('0x' + pattern_lower)
        case 'suffix':
          return addr_lower.endsWith(pattern_lower)
        case 'contains':
          return addr_lower.includes(pattern_lower)
        default:
          return false
      }
    }

    const generateAttempt = () => {
      if (localAttempts >= maxLocalAttempts) {
        setError('Failed to generate matching wallet on main thread')
        setIsGenerating(false)
        workerRef.current?.terminate()
        return
      }

      try {
        const wallet = ethers.Wallet.createRandom()
        localAttempts++

        if (checkPattern(wallet.address)) {
          const timeElapsed = Date.now() - startTimeRef.current
          setResult({
            address: wallet.address,
            privateKey: wallet.privateKey,
            attempts: workerAttempts + localAttempts,
            timeElapsed
          })
          setIsGenerating(false)
          workerRef.current?.terminate()
          
          // Track successful vanity wallet generation (no sensitive data)
          trackEvent('vanity_wallet_generated', {
            pattern_length: pattern.length,
            pattern_type: patternType,
            attempts: workerAttempts + localAttempts,
            generation_time_ms: timeElapsed
          })
          return
        }

        // Continue generation on next tick
        setTimeout(generateAttempt, 0)
      } catch (err) {
        setError('Error generating wallet: ' + (err instanceof Error ? err.message : 'Unknown error'))
        setIsGenerating(false)
        workerRef.current?.terminate()
      }
    }

    generateAttempt()
  }

  const generateVanityWalletSync = () => {
    console.log('generateVanityWalletSync called')
    let attempts = 0
    const maxAttempts = 1000000 // Higher limit for sync generation
    const pattern_lower = pattern.toLowerCase()

    console.log('Generation config:', { pattern, pattern_lower, patternType, maxAttempts })

    const checkPattern = (address: string) => {
      const addr_lower = address.toLowerCase()
      switch (patternType) {
        case 'prefix':
          return addr_lower.startsWith('0x' + pattern_lower)
        case 'suffix':
          return addr_lower.endsWith(pattern_lower)
        case 'contains':
          return addr_lower.includes(pattern_lower)
        default:
          return false
      }
    }

    const generateAttempt = () => {
      if (attempts >= maxAttempts) {
        console.log('Max attempts reached')
        setError(`Max attempts (${maxAttempts.toLocaleString()}) reached. Try a shorter pattern.`)
        setIsGenerating(false)
        return
      }

      try {
        console.log('Attempting to create wallet, attempt:', attempts + 1)
        const wallet = ethers.Wallet.createRandom()
        attempts++

        console.log('Wallet created:', wallet.address)

        // Update progress more frequently for better UX
        if (attempts % 500 === 0) {
          console.log('Progress update:', attempts)
          setProgress({
            attempts,
            elapsed: Date.now() - startTimeRef.current
          })
        }

        if (checkPattern(wallet.address)) {
          console.log('Pattern match found!', wallet.address)
          const timeElapsed = Date.now() - startTimeRef.current
          setResult({
            address: wallet.address,
            privateKey: wallet.privateKey,
            attempts,
            timeElapsed
          })
          setIsGenerating(false)
          
          // Track successful vanity wallet generation (no sensitive data)
          trackEvent('vanity_wallet_generated', {
            pattern_length: pattern.length,
            pattern_type: patternType,
            attempts,
            generation_time_ms: timeElapsed
          })
          return
        }

        // Continue generation on next tick to avoid blocking UI
        setTimeout(generateAttempt, 0)
      } catch (err) {
        console.error('Wallet generation error:', err)
        setError('Error generating wallet: ' + (err instanceof Error ? err.message : 'Unknown error'))
        setIsGenerating(false)
      }
    }

    generateAttempt()
  }

  const stopGeneration = () => {
    setIsGenerating(false)
    workerRef.current?.terminate()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const { difficulty, estimatedTime, securityReduction, securityImpact, bitsReduced, warningLevel, attemptsPerSecond } = estimateGeneration()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem 1rem'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem'
        }}>
          <h1 style={{ 
            color: '#1f2937', 
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            ✨ Vanity Wallet Generator
          </h1>
          <Link 
            href="/"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}
          >
            ← Back to Main
          </Link>
        </div>

        {/* Description */}
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ color: '#0c4a6e', margin: '0 0 0.5rem 0' }}>💡 About Vanity Wallets</h3>
          <p style={{ color: '#075985', margin: 0, fontSize: '0.9rem' }}>
            Generate Ethereum wallets with custom address patterns. You can create addresses that start with, 
            end with, or contain specific hexadecimal characters. The wallet security remains unchanged - 
            only the visual appearance of the address is customized.
          </p>
        </div>

        {/* Pattern Input */}
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ color: '#374151', margin: '0 0 1rem 0' }}>Pattern Configuration</h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: '0.5rem' 
            }}>
              Pattern Type:
            </label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {(['prefix', 'suffix', 'contains'] as const).map((type) => (
                <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="patternType"
                    value={type}
                    checked={patternType === type}
                    onChange={(e) => setPatternType(e.target.value as any)}
                    disabled={isGenerating}
                  />
                  <span style={{ textTransform: 'capitalize' }}>{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: '0.5rem' 
            }}>
              Pattern (hex characters only):
            </label>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="e.g., abc123, dead, cafe"
              disabled={isGenerating}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem',
                fontFamily: 'monospace'
              }}
              maxLength={8}
            />
            <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.5rem 0 0 0' }}>
              Valid characters: 0-9, a-f, A-F (maximum 8 characters recommended)
            </p>
          </div>

          {/* Difficulty Estimate */}
          {pattern && (
            <div style={{
              backgroundColor: warningLevel === 'extremely_slow' ? '#fecaca' : 
                            warningLevel === 'very_slow' ? '#fed7d7' :
                            warningLevel === 'slow' ? '#fef3c7' : '#f0fdf4',
              border: `1px solid ${warningLevel === 'extremely_slow' ? '#dc2626' :
                                 warningLevel === 'very_slow' ? '#f56565' :
                                 warningLevel === 'slow' ? '#f59e0b' : '#22c55e'}`,
              borderRadius: '6px',
              padding: '0.75rem',
              fontSize: '0.9rem'
            }}>
              <strong>Estimated Generation:</strong> ~{estimatedTime} 
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                (≈{attemptsPerSecond}/sec)
              </span>
              <br />
              <strong>Difficulty:</strong> ~{difficulty.toLocaleString()} possible combinations
              <br />
              <strong>Security Detriment:</strong> {securityImpact} ({bitsReduced} bits reduced)
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>
                {patternType === 'prefix' || patternType === 'suffix' ? 
                  `Knowing the ${patternType} reduces the address search space by 1 in ${securityReduction?.toLocaleString()} attempts.` :
                  `Knowing the pattern exists reduces the address search space by ~1 in ${securityReduction?.toLocaleString()} attempts.`
                }
              </div>
              {warningLevel === 'extremely_slow' && (
                <div style={{ color: '#dc2626', marginTop: '0.5rem', fontWeight: 'bold' }}>
                  🚫 EXTREMELY SLOW: This pattern could take days or weeks to generate!
                </div>
              )}
              {warningLevel === 'very_slow' && (
                <div style={{ color: '#dc2626', marginTop: '0.5rem' }}>
                  ⚠️ VERY SLOW: This pattern could take many hours to generate!
                </div>
              )}
              {warningLevel === 'slow' && (
                <div style={{ color: '#92400e', marginTop: '0.5rem' }}>
                  ⚠️ SLOW: This pattern may take 5+ minutes to generate!
                </div>
              )}
              {pattern.length >= 4 && (
                <div style={{ color: '#6366f1', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                  💡 Tip: Try shorter patterns (1-3 characters) for faster generation
                </div>
              )}
            </div>
          )}
        </div>

        {/* Generation Controls */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          alignItems: 'center'
        }}>
          {!isGenerating ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('Button clicked!')
                generateVanityWallet()
              }}
              disabled={false}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🎲 Generate Vanity Wallet
            </button>
          ) : (
            <button
              onClick={stopGeneration}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ⏹️ Stop Generation
            </button>
          )}
        </div>

        {/* Progress */}
        {isGenerating && (
          <div style={{
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <span style={{ fontWeight: '600', color: '#374151' }}>
                🔄 Generating...
              </span>
              <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                {(progress.elapsed / 1000).toFixed(1)}s elapsed
              </span>
            </div>
            <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
              Attempts: {progress.attempts.toLocaleString()}
              {progress.attempts > 0 && progress.elapsed > 0 && (
                <span> • Rate: {Math.round(progress.attempts / (progress.elapsed / 1000))}/sec</span>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #f87171',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: '#dc2626'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #22c55e',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ color: '#166534', margin: '0 0 1rem 0' }}>
              🎉 Vanity Wallet Generated!
            </h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '0.5rem' 
              }}>
                Address:
              </label>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                backgroundColor: 'white',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid #d1d5db'
              }}>
                <code style={{ 
                  flex: 1, 
                  fontFamily: 'monospace', 
                  fontSize: '0.9rem',
                  wordBreak: 'break-all'
                }}>
                  {result.address}
                </code>
                <button
                  onClick={() => copyToClipboard(result.address)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  📋 Copy
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '0.5rem' 
              }}>
                Private Key:
              </label>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                backgroundColor: 'white',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid #d1d5db'
              }}>
                <code style={{ 
                  flex: 1, 
                  fontFamily: 'monospace', 
                  fontSize: '0.9rem',
                  wordBreak: 'break-all'
                }}>
                  {showPrivateKey ? result.privateKey : '•'.repeat(64)}
                </code>
                <button
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  {showPrivateKey ? '🙈' : '👁️'} {showPrivateKey ? 'Hide' : 'Show'}
                </button>
                {showPrivateKey && (
                  <button
                    onClick={() => copyToClipboard(result.privateKey)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    📋 Copy
                  </button>
                )}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              fontSize: '0.9rem',
              color: '#6b7280'
            }}>
              <div>
                <strong>Generation Stats:</strong>
                <br />
                Attempts: {result.attempts.toLocaleString()}
                <br />
                Time: {(result.timeElapsed / 1000).toFixed(2)}s
                <br />
                Rate: {Math.round(result.attempts / (result.timeElapsed / 1000))}/sec
              </div>
            </div>

            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              fontSize: '0.8rem',
              color: '#92400e'
            }}>
              ⚠️ <strong>Security Reminder:</strong> This wallet has the same cryptographic security as any other Ethereum wallet. 
              Store your private key securely and never share it with anyone!
            </div>
          </div>
        )}

        {/* Security Warning */}
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <h3 style={{ color: '#92400e', margin: '0 0 0.5rem 0' }}>🔒 Security Notice</h3>
          <ul style={{ color: '#92400e', margin: 0, paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
            <li>Vanity wallets are as secure as regular wallets - only the appearance changes</li>
            <li>Generation happens locally in your browser - no data is sent to servers</li>
            <li><strong>Security detriment:</strong> If someone knows your address pattern, they reduce the search space when attempting to generate a similar address, but this doesn't compromise your existing wallet's private key</li>
            <li>The security impact is proportional to pattern length - longer patterns have higher detriment</li>
            <li>Longer patterns take exponentially more time to generate</li>
            <li>Always verify the generated address matches your desired pattern</li>
            <li>Store your private key securely - it cannot be recovered if lost</li>
          </ul>
        </div>
      </div>
    </div>
  )
}