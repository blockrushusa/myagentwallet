import '@testing-library/jest-dom'

// Polyfills for Node.js environment
global.TextEncoder = require('util').TextEncoder
global.TextDecoder = require('util').TextDecoder

// Mock crypto for Node environment
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr) => require('crypto').randomFillSync(arr),
  },
})