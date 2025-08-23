// Direct test of WalletConnect with OpenSea
const EthereumProvider = require('@walletconnect/ethereum-provider').default;
const { ethers } = require('ethers');

async function testConnection() {
  try {
    console.log('Creating wallet...');
    const wallet = new ethers.Wallet('0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6');
    console.log('Wallet address:', wallet.address);

    console.log('\nInitializing WalletConnect provider...');
    const provider = await EthereumProvider.init({
      projectId: '254989a6385b6074e2abe35d3555ac9c',
      chains: [1],
      showQrModal: false,
      metadata: {
        name: 'Test Wallet',
        description: 'Testing',
        url: 'https://test.com',
        icons: []
      }
    });

    console.log('Provider initialized');

    // Set up event handlers
    provider.on('session_proposal', async (proposal) => {
      console.log('\n=== SESSION PROPOSAL ===');
      console.log('From:', proposal.params.proposer.metadata.name);
      console.log('Proposal ID:', proposal.id);
      
      try {
        const session = await provider.approveSession({
          id: proposal.id,
          namespaces: {
            eip155: {
              accounts: [`eip155:1:${wallet.address}`],
              methods: ['eth_sendTransaction', 'personal_sign', 'eth_sign'],
              events: ['chainChanged', 'accountsChanged']
            }
          }
        });
        
        console.log('Session approved!');
      } catch (error) {
        console.error('Approval failed:', error);
      }
    });

    provider.on('session_request', async (event) => {
      console.log('\n=== SESSION REQUEST ===');
      console.log('Method:', event.params.request.method);
      
      try {
        let result;
        
        switch (event.params.request.method) {
          case 'personal_sign':
            result = await wallet.signMessage(event.params.request.params[0]);
            break;
          default:
            throw new Error('Method not supported');
        }
        
        await provider.respondSessionRequest({
          topic: event.topic,
          response: {
            id: event.id,
            jsonrpc: '2.0',
            result
          }
        });
      } catch (error) {
        await provider.respondSessionRequest({
          topic: event.topic,
          response: {
            id: event.id,
            jsonrpc: '2.0',
            error: { code: -32000, message: error.message }
          }
        });
      }
    });

    // Test URI - replace with actual
    const uri = 'wc:d08cc689da9f765b51140ae4d45dcad6133eb8c061137e464b47650e94f75d27@2?relay-protocol=irn&symKey=d5e70263a9b46dbc270288ffd2661ef452744d7627dc9b18f4d3ecc8c77f4ae3&expiryTimestamp=1748532917';
    
    console.log('\nConnecting with URI...');
    await provider.connect({ uri });
    
    console.log('Connection initiated, waiting for events...');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testConnection();