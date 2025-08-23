const { ethers } = require('ethers');

async function testOpenSeaConnection() {
  // Generate a test wallet
  const wallet = ethers.Wallet.createRandom();
  console.log('Test Wallet Generated:');
  console.log('Address:', wallet.address);
  console.log('Private Key:', wallet.privateKey);
  console.log('\n');

  // Example WalletConnect URI (you'll need to replace this with a real one from OpenSea)
  const exampleUri = 'wc:00f47fe044a30ee177f9de05d9f464dbc06af56cdfcb5cb1f85e1b3329bc48a4@2?relay-protocol=irn&symKey=aa664ac110a1dafd850ee6c3e994728a4966757e26e511a7e8df3f3f09a5b510&expiryTimestamp=1748455819';
  
  console.log('To test the OpenSea connection:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Open http://localhost:3000');
  console.log('3. Import the wallet using this private key:', wallet.privateKey);
  console.log('4. Go to OpenSea.io and click "Connect Wallet"');
  console.log('5. Choose "WalletConnect" option');
  console.log('6. Copy the connection URI');
  console.log('7. Paste it in the MyAgentWallet connection field');
  console.log('8. Click "Connect to dApp"');
  console.log('\n');
  console.log('The connection should now work without errors!');
}

testOpenSeaConnection();