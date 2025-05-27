# MyAgentWallet

Online Web3 Wallet for AI Agents - A secure, temporary wallet solution for connecting to Web3 applications without browser extensions.

## 🚀 Features

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

## 🔄 Usage Example

1. **Visit** the MyAgentWallet website
2. **Accept** the security disclaimer
3. **Generate** a new temporary wallet or **import** an existing private key
4. **Go to** a dApp like https://app.uniswap.org/
5. **Click** Connect → WalletConnect → Copy Link
6. **Paste** the URI into MyAgentWallet
7. **Authorize** the connection
8. **Trade** or interact with the dApp

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

## 📦 Files Generated

- `out/` - Static build output for deployment
- `.htaccess` - Security headers for shared hosting
- `__tests__/` - Unit tests for core functionality

## 🌍 Live Demo

Ready for deployment to any static hosting provider supporting `.htaccess` files.

---

**Project ID**: 254989a6385b6074e2abe35d3555ac9c  
**Built with**: Next.js + TypeScript + WalletConnect + Security Best Practices
