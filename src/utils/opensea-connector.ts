import EthereumProvider from '@walletconnect/ethereum-provider'
import { WalletProvider } from './wallet-provider'

export class OpenSeaConnector {
  private wcProvider: any = null;
  private walletProvider: WalletProvider;
  private session: any = null;

  constructor(privateKey: string) {
    this.walletProvider = new WalletProvider(privateKey);
  }

  async connect(uri: string) {
    try {
      console.log('[OpenSeaConnector] Starting connection...');
      
      // Create WalletConnect provider
      this.wcProvider = await EthereumProvider.init({
        projectId: '254989a6385b6074e2abe35d3555ac9c',
        showQrModal: false,
        chains: [1], // Ethereum mainnet
        optionalChains: [137, 10, 42161, 8453], // Polygon, Optimism, Arbitrum, Base
        methods: [
          'eth_accounts',
          'eth_requestAccounts',
          'eth_sendTransaction',
          'eth_signTransaction',
          'eth_sign',
          'personal_sign',
          'eth_signTypedData',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
          'eth_chainId',
          'wallet_switchEthereumChain'
        ],
        events: ['chainChanged', 'accountsChanged'],
        metadata: {
          name: 'MyAgentWallet',
          description: 'Web3 Wallet',
          url: 'https://myagentwallet.com',
          icons: ['https://avatars.githubusercontent.com/u/37784886']
        }
      });

      // Override the request method to use our wallet
      const originalRequest = this.wcProvider.request.bind(this.wcProvider);
      this.wcProvider.request = async (args: any) => {
        console.log('[WC Request]', args);
        
        // For connection/pairing requests, use original
        if (args.method === 'wc_sessionPropose' || 
            args.method === 'wc_pairings' ||
            args.method.startsWith('wc_')) {
          return originalRequest(args);
        }
        
        // For eth methods, use our wallet
        try {
          const result = await this.walletProvider.handleRequest(args.method, args.params);
          console.log('[WC Response]', args.method, result);
          return result;
        } catch (error) {
          console.error('[WC Error]', args.method, error);
          throw error;
        }
      };

      // Set up event handlers
      this.wcProvider.on('session_proposal', async (proposal: any) => {
        console.log('[Session Proposal]', proposal);
        
        try {
          // Auto-approve with our wallet's address
          const accounts = await this.walletProvider.handleRequest('eth_accounts', []);
          
          // Approve the session
          this.session = await this.wcProvider.approveSession({
            id: proposal.id,
            namespaces: {
              eip155: {
                accounts: accounts.map((addr: string) => `eip155:1:${addr}`),
                methods: proposal.params.requiredNamespaces.eip155?.methods || [],
                events: proposal.params.requiredNamespaces.eip155?.events || []
              }
            }
          });
          
          console.log('[Session Approved]', this.session);
        } catch (error) {
          console.error('[Approval Error]', error);
        }
      });

      this.wcProvider.on('session_request', async (event: any) => {
        console.log('[Session Request]', event);
        
        try {
          const result = await this.walletProvider.handleRequest(
            event.params.request.method,
            event.params.request.params
          );
          
          await this.wcProvider.respondSessionRequest({
            topic: event.topic,
            response: {
              id: event.id,
              jsonrpc: '2.0',
              result
            }
          });
        } catch (error) {
          await this.wcProvider.respondSessionRequest({
            topic: event.topic,
            response: {
              id: event.id,
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message: error instanceof Error ? error.message : 'Unknown error'
              }
            }
          });
        }
      });

      // Connect with the URI
      console.log('[Connecting with URI]', uri);
      await this.wcProvider.connect({ uri });
      
      console.log('[Connection initiated]');
      return true;
      
    } catch (error) {
      console.error('[Connection Error]', error);
      throw error;
    }
  }

  getSession() {
    return this.session;
  }

  async disconnect() {
    if (this.wcProvider) {
      await this.wcProvider.disconnect();
    }
  }
}