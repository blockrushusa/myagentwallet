# MyAgentWallet

Online Web3 Wallet for AI Agents - A secure, temporary wallet solution for connecting to Web3 applications without browser extensions.

## 🚀 Features

- **Multi-Chain Support**: Works with 15+ EVM networks including Monad, Ethereum, Polygon, Base, and more
- **Temporary Wallet Generation**: Create secure wallets on-the-fly
- **Private Key Import**: Use existing private keys securely
- **WalletConnect Integration**: Connect to dApps like Uniswap via WalletConnect v2
- **Client-Side Security**: All cryptographic operations happen locally
- **No Data Storage**: No private keys stored on servers
- **Modern UI**: Clean, responsive interface with security warnings

## 🔐 Security

- **Encryption**: PBKDF2 + SHA256 + AES256 for client-side encryption
- **Zero Server Storage**: All sensitive data processed client-side only
- **Temporary Use**: Designed for temporary wallet operations
- **Security Headers**: Comprehensive .htaccess security configuration

## 🛠️ Technology Stack

- **Next.js 15.2.2** with TypeScript
- **Reown (WalletConnect)** for Web3 connections
- **Ethers.js** for wallet operations
- **Noble Hashes** for cryptographic functions
- **Static Export** for shared hosting deployment

## 📋 Requirements

- Node.js 18+ 
- NPM or Yarn

## 🏗️ Installation

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

## 🌐 Deployment

Built for static hosting environments like Dreamhost:

1. Run `npm run build` to generate static files
2. Upload the `out/` directory to your hosting provider
3. Ensure the `.htaccess` file is in place for security headers

## 🌐 Supported Networks

MyAgentWallet supports multiple EVM-compatible networks:

### Mainnets
- **Ethereum** - The original smart contract platform
- **[Monad](https://monad.xyz)** - High-performance EVM blockchain ⚡
- **Polygon** - Layer 2 scaling solution
- **Base** - Coinbase's L2 network
- **Arbitrum One** - Optimistic rollup L2
- **Optimism** - Another optimistic rollup
- **BNB Smart Chain** - Binance's blockchain
- **Avalanche C-Chain** - Snow consensus blockchain
- **Fantom** - High-speed DPoS consensus
- **Gnosis Chain** - Community-owned network

### Testnets
- **Ethereum Sepolia** - Primary Ethereum testnet
- **[Monad Testnet](https://docs.monad.xyz)** - Test the future of EVM 🧪
- **Polygon Mumbai** - Polygon testnet
- **Base Sepolia** - Base testnet
- *...and more*

## 🔄 Usage Example

1. **Visit** the MyAgentWallet website
2. **Accept** the security disclaimer
3. **Select** your preferred network (including Monad!)
4. **Generate** a new temporary wallet or **import** an existing private key
5. **Go to** a dApp like https://app.uniswap.org/
6. **Click** Connect → WalletConnect → Copy Link
7. **Paste** the URI into MyAgentWallet
8. **Authorize** the connection
9. **Trade** or interact with the dApp across multiple chains

## ⚠️ Important Disclaimers

- **BETA SOFTWARE**: Use at your own risk
- **TEMPORARY USE ONLY**: Never store large amounts or important assets
- **NO WARRANTIES**: Service provided "as is"
- **USER RESPONSIBILITY**: Users responsible for any losses

## 🏁 Build Status

✅ **Production Build**: Successful  
✅ **Static Export**: Working  
✅ **Security Headers**: Configured  
✅ **Client-Side Encryption**: Implemented  
✅ **WalletConnect Integration**: Ready  
✅ **Multi-Chain Support**: 15+ EVM networks including Monad  

## 📦 Files Generated

- `out/` - Static build output for deployment
- `.htaccess` - Security headers for shared hosting
- `__tests__/` - Unit tests for core functionality

## 🌍 Live Demo

### GitHub Pages (Recommended)
**Live Site**: https://blockrushusa.github.io/myagentwallet/

The app is automatically deployed to GitHub Pages on every push to the main branch.

### Other Hosting
Also ready for deployment to any static hosting provider supporting `.htaccess` files.

## 💖 Support This Project

If MyAgentWallet has been helpful to you, consider supporting continued development:

### Donation Address (ERC20 tokens on Ethereum mainnet):
```
0xE73705C1479f68F958Bf4F35a368B2dD838FD575
```

**Accepted tokens**: USDC, USDT, DAI, ETH, or any ERC20 tokens  
**Network**: Ethereum Mainnet only  

Your contributions help keep this project:
- ✅ **Free and open source**
- ✅ **Actively maintained** 
- ✅ **Security-focused**
- ✅ **Community-driven**

Every donation, no matter the size, is deeply appreciated and directly supports development, security audits, and infrastructure costs.

---

**Project ID**: 254989a6385b6074e2abe35d3555ac9c  
**Built with**: Next.js + TypeScript + WalletConnect + Security Best Practices
