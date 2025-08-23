import { Core } from '@walletconnect/core'
import { Web3Wallet } from '@walletconnect/web3wallet'
import type { Web3WalletTypes } from '@walletconnect/web3wallet'

export interface WalletConnectSession {
  topic: string;
  peerMetadata: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
}

export class OpenSeaWalletConnectManager {
  private static instance: OpenSeaWalletConnectManager;
  private web3wallet: Web3Wallet | null = null;
  private wallet: any = null;
  private sessions: Map<string, WalletConnectSession> = new Map();

  private constructor() {}

  static getInstance(): OpenSeaWalletConnectManager {
    if (!OpenSeaWalletConnectManager.instance) {
      OpenSeaWalletConnectManager.instance = new OpenSeaWalletConnectManager();
    }
    return OpenSeaWalletConnectManager.instance;
  }

  async initialize() {
    if (this.web3wallet) return;

    try {
      console.log('Initializing Web3Wallet for OpenSea...');
      
      const core = new Core({
        projectId: '254989a6385b6074e2abe35d3555ac9c'
      });

      this.web3wallet = await Web3Wallet.init({
        core,
        metadata: {
          name: 'MyAgentWallet',
          description: 'Online Web3 Wallet for AI Agents',
          url: 'https://myagentwallet.com',
          icons: ['https://avatars.githubusercontent.com/u/37784886']
        }
      });

      this.setupEventListeners();
      
      // Add global error handler for debugging
      if (typeof window !== 'undefined') {
        window.addEventListener('error', (event) => {
          console.error('Global error caught:', event.error);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
          console.error('Unhandled promise rejection:', event.reason);
        });
      }
      
      console.log('Web3Wallet initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Web3Wallet:', error);
      throw error;
    }
  }

  private setupEventListeners() {
    if (!this.web3wallet) return;

    // Session proposal
    this.web3wallet.on('session_proposal', async (proposal: Web3WalletTypes.SessionProposal) => {
      console.log('=== OpenSea Session Proposal ===');
      console.log('ID:', proposal.id);
      console.log('From:', proposal.params.proposer.metadata.name);
      
      await this.onSessionProposal(proposal);
    });

    // Session request
    this.web3wallet.on('session_request', async (event: Web3WalletTypes.SessionRequest) => {
      console.log('=== Session Request ===');
      console.log('Method:', event.params.request.method);
      
      await this.onSessionRequest(event);
    });

    // Session delete
    this.web3wallet.on('session_delete', (event) => {
      console.log('Session deleted:', event);
      const topic = event.topic;
      this.sessions.delete(topic);
    });
  }

  private async onSessionProposal(proposal: Web3WalletTypes.SessionProposal) {
    try {
      if (!this.web3wallet || !this.wallet) {
        throw new Error('Wallet not initialized');
      }

      const { id, params } = proposal;
      const { proposer, requiredNamespaces, optionalNamespaces } = params;

      console.log('Proposer metadata:', proposer.metadata);
      
      // Get the wallet address
      const address = this.wallet.address;
      
      // Build namespaces - be very permissive for OpenSea
      const chains = [
        'eip155:1',    // Ethereum mainnet
        'eip155:137',  // Polygon
        'eip155:10',   // Optimism
        'eip155:42161', // Arbitrum
        'eip155:8453',  // Base
        'eip155:11155111' // Sepolia testnet
      ];

      const accounts = chains.map(chain => `${chain}:${address}`);
      
      const namespaces = {
        eip155: {
          accounts,
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
            'wallet_switchEthereumChain',
            'wallet_addEthereumChain',
            'wallet_getCapabilities',
            'wallet_sendCalls',
            'wallet_getCallsStatus',
            'eth_getBalance',
            'eth_getTransactionCount',
            'eth_call',
            'eth_estimateGas',
            'eth_gasPrice',
            'net_version'
          ],
          events: [
            'chainChanged',
            'accountsChanged'
          ]
        }
      };

      console.log('Approving session with namespaces:', JSON.stringify(namespaces, null, 2));

      // Approve the session
      const session = await this.web3wallet.approveSession({
        id,
        namespaces
      });

      console.log('✅ Session approved successfully!');
      console.log('Session topic:', session.topic);
      
      // Store the session
      this.sessions.set(session.topic, {
        topic: session.topic,
        peerMetadata: proposer.metadata
      });

      // Emit success event
      if (typeof window !== 'undefined') {
        window.postMessage({
          type: 'OPENSEA_CONNECTED',
          address,
          topic: session.topic,
          peer: proposer.metadata.name
        }, '*');
      }

    } catch (error) {
      console.error('Failed to approve session:', error);
      
      // Reject the proposal
      if (this.web3wallet) {
        try {
          await this.web3wallet.rejectSession({
            id: proposal.id,
            reason: {
              code: 5000,
              message: 'User rejected'
            }
          });
        } catch (rejectError) {
          console.error('Failed to reject session:', rejectError);
        }
      }
    }
  }

  private async onSessionRequest(event: Web3WalletTypes.SessionRequest) {
    try {
      if (!this.web3wallet || !this.wallet) {
        throw new Error('Wallet not initialized');
      }

      const { topic, params, id } = event;
      const { request } = params;
      
      console.log(`Processing ${request.method} request...`);

      let result: any;

      switch (request.method) {
        case 'eth_accounts':
        case 'eth_requestAccounts':
          result = [this.wallet.address];
          break;

        case 'personal_sign':
          // OpenSea may send params in different orders
          let message = request.params[0];
          let address = request.params[1];
          
          // If first param looks like an address, swap them
          if (message && message.startsWith('0x') && message.length === 42) {
            [address, message] = [message, address];
          }
          
          console.log('=== PERSONAL_SIGN REQUEST ===');
          console.log('Message:', message);
          console.log('Address:', address);
          console.log('Expected address:', this.wallet.address);
          
          // Decode hex message if needed
          let messageToSign = message;
          if (message && message.startsWith('0x')) {
            try {
              const hexMessage = message.slice(2);
              const decodedMessage = Buffer.from(hexMessage, 'hex').toString('utf8');
              console.log('Decoded message:', decodedMessage);
              
              // Check if it's a SIWE message
              if (decodedMessage.includes('wants you to sign in with your Ethereum account')) {
                console.log('=== SIWE (Sign-In with Ethereum) Request Detected ===');
                messageToSign = decodedMessage;
              }
            } catch (e) {
              console.log('Message is hex but not UTF-8 text');
            }
          }
          
          result = await this.wallet.signMessage(messageToSign);
          console.log('Signature:', result);
          break;

        case 'eth_sign':
          result = await this.wallet.signMessage(request.params[1]);
          break;

        case 'eth_signTypedData':
        case 'eth_signTypedData_v3':
        case 'eth_signTypedData_v4':
          const typedData = typeof request.params[1] === 'string' 
            ? JSON.parse(request.params[1]) 
            : request.params[1];
          
          // Handle typed data signing
          const { domain, types, primaryType, message: dataMessage } = typedData;
          
          // Remove EIP712Domain from types if present
          const typesWithoutDomain = { ...types };
          delete typesWithoutDomain.EIP712Domain;
          
          result = await this.wallet._signTypedData(domain, typesWithoutDomain, dataMessage);
          break;

        case 'eth_sendTransaction':
          const tx = request.params[0];
          const sentTx = await this.wallet.sendTransaction(tx);
          result = sentTx.hash;
          break;

        case 'eth_chainId':
          result = '0x1'; // Mainnet
          break;

        case 'net_version':
          result = '1';
          break;

        case 'wallet_switchEthereumChain':
          // Just acknowledge the request
          result = null;
          break;

        case 'wallet_addEthereumChain':
          // Just acknowledge the request
          result = null;
          break;

        case 'wallet_getCapabilities':
          result = {
            [request.params[0]]: {
              paymasterService: { supported: false },
              sessionKeys: { supported: false }
            }
          };
          break;

        case 'eth_getBalance':
          result = '0x0';
          break;

        case 'eth_getTransactionCount':
          result = '0x0';
          break;

        case 'eth_gasPrice':
          result = '0x3b9aca00'; // 1 gwei
          break;

        case 'eth_estimateGas':
          result = '0x5208'; // 21000
          break;

        default:
          throw new Error(`Unsupported method: ${request.method}`);
      }

      // Send response
      await this.web3wallet.respondSessionRequest({
        topic,
        response: {
          id,
          jsonrpc: '2.0',
          result
        }
      });

      console.log(`✅ ${request.method} completed successfully`);

    } catch (error) {
      console.error('=== REQUEST FAILED ===');
      console.error('Method:', request.method);
      console.error('Error:', error);
      console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
      
      // Send error response
      if (this.web3wallet) {
        try {
          await this.web3wallet.respondSessionRequest({
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
        } catch (respondError) {
          console.error('Failed to send error response:', respondError);
        }
      }
    }
  }

  async connectWithUri(uri: string, privateKey: string): Promise<void> {
    try {
      console.log('=== OpenSea WalletConnect Connection ===');
      console.log('URI:', uri);

      // Initialize wallet
      await this.initialize();

      // Import wallet
      const { ethers } = await import('ethers');
      this.wallet = new ethers.Wallet(privateKey);
      
      console.log('Wallet address:', this.wallet.address);

      // Pair with the URI
      if (this.web3wallet) {
        console.log('Starting pairing process...');
        await this.web3wallet.core.pairing.pair({ uri });
        console.log('✅ Pairing initiated - waiting for session proposal...');
      }

    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }

  getSessions(): WalletConnectSession[] {
    return Array.from(this.sessions.values());
  }

  async disconnectSession(topic: string): Promise<void> {
    try {
      if (this.web3wallet && this.sessions.has(topic)) {
        await this.web3wallet.disconnectSession({
          topic,
          reason: {
            code: 6000,
            message: 'User disconnected'
          }
        });
        this.sessions.delete(topic);
        console.log('Session disconnected:', topic);
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  }
}