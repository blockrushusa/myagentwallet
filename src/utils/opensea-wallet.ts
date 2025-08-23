// Minimal OpenSea WalletConnect implementation
import EthereumProvider from '@walletconnect/ethereum-provider'

export class OpenSeaWallet {
  private provider: any = null;
  private address: string = '';
  private privateKey: string = '';

  constructor(privateKey: string) {
    this.privateKey = privateKey;
    // Get address from private key
    try {
      const { ethers } = require('ethers');
      const wallet = new ethers.Wallet(privateKey);
      this.address = wallet.address;
    } catch (e) {
      console.error('Failed to create wallet:', e);
    }
  }

  async connect(uri: string) {
    try {
      console.log('[OpenSeaWallet] Connecting...');
      console.log('[OpenSeaWallet] Address:', this.address);
      
      // Initialize provider
      this.provider = await EthereumProvider.init({
        projectId: '254989a6385b6074e2abe35d3555ac9c',
        chains: [1], // Ethereum mainnet
        showQrModal: false,
        metadata: {
          name: 'MyAgentWallet',
          description: 'Web3 Wallet',
          url: window.location.origin,
          icons: []
        }
      });

      console.log('[OpenSeaWallet] Provider initialized');

      // Set up handlers BEFORE connecting
      this.setupHandlers();

      // Connect with URI
      console.log('[OpenSeaWallet] Pairing with URI...');
      await this.provider.connect({ uri });
      
      console.log('[OpenSeaWallet] Connection complete');
      return true;
      
    } catch (error: any) {
      console.error('[OpenSeaWallet] Connection error:', error);
      // Log more details
      if (error.message) console.error('Error message:', error.message);
      if (error.code) console.error('Error code:', error.code);
      if (error.stack) console.error('Stack:', error.stack);
      throw error;
    }
  }

  private setupHandlers() {
    if (!this.provider) return;

    // Log all events
    const events = ['session_proposal', 'session_request', 'session_delete', 'session_event', 'session_update'];
    events.forEach(event => {
      this.provider.on(event, (data: any) => {
        console.log(`[OpenSeaWallet] Event: ${event}`, data);
      });
    });

    // Handle session proposal
    this.provider.on('session_proposal', async (proposal: any) => {
      try {
        console.log('[OpenSeaWallet] Got proposal from:', proposal.params.proposer.metadata.name);
        
        // Auto-approve
        const namespaces = {
          eip155: {
            accounts: [`eip155:1:${this.address}`],
            methods: [
              'eth_sendTransaction',
              'eth_signTransaction', 
              'eth_sign',
              'personal_sign',
              'eth_signTypedData',
              'eth_signTypedData_v4'
            ],
            events: ['chainChanged', 'accountsChanged']
          }
        };

        const session = await this.provider.approveSession({
          id: proposal.id,
          namespaces
        });

        console.log('[OpenSeaWallet] Session approved');
      } catch (error) {
        console.error('[OpenSeaWallet] Approval error:', error);
      }
    });

    // Handle session requests
    this.provider.on('session_request', async (event: any) => {
      try {
        console.log('[OpenSeaWallet] Request:', event.params.request.method);
        
        const { ethers } = await import('ethers');
        const wallet = new ethers.Wallet(this.privateKey);
        
        let result: any;
        const { method, params } = event.params.request;

        switch (method) {
          case 'eth_accounts':
          case 'eth_requestAccounts':
            result = [this.address];
            break;
            
          case 'personal_sign':
            result = await wallet.signMessage(params[0]);
            break;
            
          case 'eth_sign':
            result = await wallet.signMessage(params[1]);
            break;
            
          case 'eth_signTypedData':
          case 'eth_signTypedData_v4':
            const typedData = typeof params[1] === 'string' ? JSON.parse(params[1]) : params[1];
            result = await wallet.signTypedData(
              typedData.domain,
              typedData.types,
              typedData.message
            );
            break;
            
          default:
            throw new Error(`Unsupported method: ${method}`);
        }

        await this.provider.respondSessionRequest({
          topic: event.topic,
          response: { id: event.id, jsonrpc: '2.0', result }
        });
        
      } catch (error: any) {
        console.error('[OpenSeaWallet] Request error:', error);
        await this.provider.respondSessionRequest({
          topic: event.topic,
          response: {
            id: event.id,
            jsonrpc: '2.0',
            error: { code: -32000, message: error.message }
          }
        });
      }
    });
  }

  getProvider() {
    return this.provider;
  }
}