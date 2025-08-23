// Vanity Wallet Generation Web Worker
// This runs in a separate thread to avoid blocking the UI

self.onmessage = function(e) {
  const { pattern, patternType, maxAttempts } = e.data
  
  let attempts = 0
  const startTime = Date.now()
  const progressInterval = 1000 // Report progress every 1000 attempts
  
  // Helper function to check if address matches pattern
  function checkPattern(address, pattern, type) {
    const addr_lower = address.toLowerCase()
    const pattern_lower = pattern.toLowerCase()
    
    switch (type) {
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

  // Simple wallet generation using crypto API
  function generateRandomWallet() {
    const crypto = self.crypto || self.msCrypto
    if (!crypto) {
      throw new Error('Crypto API not available')
    }

    // Generate 32 random bytes for private key
    const privateKeyBytes = new Uint8Array(32)
    crypto.getRandomValues(privateKeyBytes)
    
    // Convert to hex string
    const privateKey = '0x' + Array.from(privateKeyBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    // Basic address derivation (simplified for worker)
    // Note: This is a simplified implementation for the worker
    // The main thread will use proper ethers.js for actual wallet creation
    return {
      privateKey,
      address: deriveAddress(privateKey)
    }
  }

  // Simplified address derivation (for pattern checking only)
  function deriveAddress(privateKey) {
    // This is a mock implementation for pattern testing
    // The actual ethers.js will be used in the main thread for final generation
    const mockSeed = privateKey.slice(2, 10) // Use part of private key as seed
    let hash = 0
    for (let i = 0; i < mockSeed.length; i++) {
      hash = ((hash << 5) - hash + parseInt(mockSeed[i], 16)) & 0xffffffff
    }
    
    // Generate a mock address for pattern testing
    const crypto = self.crypto || self.msCrypto
    const addressBytes = new Uint8Array(20)
    crypto.getRandomValues(addressBytes)
    
    return '0x' + Array.from(addressBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }
  
  // Main generation loop - simplified to just find pattern, main thread will generate real wallet
  function findPattern() {
    try {
      while (attempts < maxAttempts) {
        attempts++
        
        // Generate random address for pattern checking
        const crypto = self.crypto || self.msCrypto
        const addressBytes = new Uint8Array(20)
        crypto.getRandomValues(addressBytes)
        
        const address = '0x' + Array.from(addressBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
        
        // Report progress periodically
        if (attempts % progressInterval === 0) {
          self.postMessage({
            type: 'progress',
            data: {
              attempts,
              elapsed: Date.now() - startTime
            }
          })
        }
        
        // Check if address matches pattern
        if (checkPattern(address, pattern, patternType)) {
          self.postMessage({
            type: 'found_pattern',
            data: {
              attempts,
              elapsed: Date.now() - startTime
            }
          })
          return
        }
      }
      
      // Max attempts reached
      self.postMessage({
        type: 'error',
        data: {
          message: `Max attempts (${maxAttempts.toLocaleString()}) reached. Try a shorter pattern.`
        }
      })
    } catch (error) {
      self.postMessage({
        type: 'error',
        data: {
          message: 'Generation error: ' + error.message
        }
      })
    }
  }
  
  // Start pattern finding
  findPattern()
}