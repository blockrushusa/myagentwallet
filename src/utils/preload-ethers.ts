// Pre-load ethers.js to avoid chunk loading issues
import { ethers } from 'ethers'

// Export ethers for consistent usage across the app
export { ethers }

// Pre-initialize ethers to avoid lazy loading issues
export const preloadEthers = () => {
  // This function can be called early to ensure ethers is loaded
  return typeof ethers !== 'undefined'
}