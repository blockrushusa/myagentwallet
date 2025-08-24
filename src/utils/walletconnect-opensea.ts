import { SignClient } from '@walletconnect/sign-client'
import { getSdkError } from '@walletconnect/utils'
import type { SessionTypes, SignClientTypes } from '@walletconnect/types'

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
  private signClient: InstanceType<typeof SignClient> | null = null;
  private wallet: any = null;
  private sessions: Map<string, WalletConnectSession> = new Map();
  private isTestnet: boolean = false;
  private processingRequest: boolean = false;

  private constructor() {}

  static getInstance(): OpenSeaWalletConnectManager {
    if (!OpenSeaWalletConnectManager.instance) {
      OpenSeaWalletConnectManager.instance = new OpenSeaWalletConnectManager();
    }
    return OpenSeaWalletConnectManager.instance;
  }

  async clearStorage() {
    try {
      // Clear IndexedDB to prevent "No matching key" errors
      if (typeof window !== 'undefined' && window.indexedDB) {
        const databases = await window.indexedDB.databases();
        for (const db of databases) {
          if (db.name && db.name.includes('walletconnect')) {
            await window.indexedDB.deleteDatabase(db.name);
            console.log('Cleared IndexedDB:', db.name);
          }
        }
      }
      
      // Clear localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && (key.includes('walletconnect') || key.includes('wc@2'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => window.localStorage.removeItem(key));
        console.log('Cleared localStorage WalletConnect keys');
      }
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  async initialize(clearCache: boolean = false) {
    if (this.signClient && !clearCache) return;

    try {
      if (clearCache) {
        console.log('Clearing WalletConnect cache...');
        await this.clearStorage();
      }

      console.log('Initializing WalletConnect SignClient for OpenSea...');
      
      this.signClient = await SignClient.init({
        projectId: '254989a6385b6074e2abe35d3555ac9c',
        relayUrl: 'wss://relay.walletconnect.com',
        metadata: {
          name: 'MyAgentWallet',
          description: 'Online Web3 Wallet for AI Agents',
          url: typeof window !== 'undefined' ? window.location.origin : 'https://myagentwallet.com',
          icons: ['https://avatars.githubusercontent.com/u/37784886']
        }
      });

      this.setupEventListeners();
      
      // Clean up any stale sessions
      await this.cleanupStaleSessions();
      
      console.log('WalletConnect SignClient initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WalletConnect:', error);
      throw error;
    }
  }

  private async cleanupStaleSessions() {
    if (!this.signClient) return;
    
    try {
      const activeSessions = this.signClient.session.getAll();
      console.log(`Found ${activeSessions.length} existing sessions`);
      
      // Disconnect from all old sessions to start fresh
      for (const session of activeSessions) {
        try {
          await this.signClient.disconnect({
            topic: session.topic,
            reason: getSdkError('USER_DISCONNECTED')
          });
          console.log('Disconnected old session:', session.topic);
        } catch (e) {
          console.log('Error disconnecting session:', e);
        }
      }
    } catch (error) {
      console.log('Error cleaning up sessions:', error);
    }
  }

  private setupEventListeners() {
    if (!this.signClient) return;

    // Handle session proposals
    this.signClient.on('session_proposal', async (event) => {
      console.log('=== OpenSea Session Proposal ===');
      console.log('Event:', JSON.stringify(event, null, 2));
      
      // Prevent concurrent processing
      if (this.processingRequest) {
        console.log('Already processing a request, queuing...');
        setTimeout(() => this.handleSessionProposal(event), 1000);
        return;
      }
      
      this.processingRequest = true;
      try {
        await this.handleSessionProposal(event);
      } finally {
        this.processingRequest = false;
      }
    });

    // Handle session requests
    this.signClient.on('session_request', async (event) => {
      console.log('=== OpenSea Session Request ===');
      console.log('Event:', JSON.stringify(event, null, 2));
      
      if (this.processingRequest) {
        console.log('Already processing a request, queuing...');
        setTimeout(() => this.handleSessionRequest(event), 1000);
        return;
      }
      
      this.processingRequest = true;
      try {
        await this.handleSessionRequest(event);
      } finally {
        this.processingRequest = false;
      }
    });

    // Handle session deletions
    this.signClient.on('session_delete', (event) => {
      console.log('Session deleted:', event);
      this.sessions.delete(event.topic);
    });

    // Handle session updates
    this.signClient.on('session_update', (event) => {
      console.log('Session updated:', event);
    });

    // Handle session expiry
    this.signClient.on('session_expire', (event) => {
      console.log('Session expired:', event);
      this.sessions.delete(event.topic);
    });
  }

  private async handleSessionProposal(event: SignClientTypes.EventArguments['session_proposal']) {
    try {
      if (!this.signClient || !this.wallet) {
        throw new Error('SignClient or wallet not initialized');
      }

      const { params, id } = event;
      const { proposer, requiredNamespaces, optionalNamespaces } = params;

      console.log('Proposer:', proposer.metadata);
      console.log('Required namespaces:', JSON.stringify(requiredNamespaces, null, 2));
      console.log('Optional namespaces:', JSON.stringify(optionalNamespaces, null, 2));

      // Build comprehensive namespaces for OpenSea
      const namespaces: SessionTypes.Namespaces = {};
      
      // Handle EIP155 namespace
      const chains = ['eip155:1', 'eip155:137', 'eip155:10', 'eip155:42161', 'eip155:8453'];
      const methods = [
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
        'eth_gasPrice',
        'eth_estimateGas',
        'net_version'
      ];
      const events = ['chainChanged', 'accountsChanged'];

      // Create accounts for all chains
      const accounts = chains.map(chain => `${chain}:${this.wallet.address}`);
      
      namespaces.eip155 = {
        accounts,
        methods,
        events,
        chains
      };

      console.log('Approving with namespaces:', JSON.stringify(namespaces, null, 2));

      const session = await this.signClient.approve({
        id,
        namespaces
      });

      // Store session
      this.sessions.set(session.topic, {
        topic: session.topic,
        peerMetadata: proposer.metadata
      });

      console.log('Session approved successfully:', session.topic);
      console.log('Connected to:', proposer.metadata.name);
      console.log('Address:', this.wallet.address);
      
      // Emit connected event
      if (typeof window !== 'undefined') {
        window.postMessage({ 
          type: 'WALLET_CONNECTED', 
          address: this.wallet.address,
          topic: session.topic,
          peer: proposer.metadata
        }, '*');
        
        // Also log for debugging
        console.log('=== CONNECTION SUCCESSFUL ===');
        console.log('You are now connected to', proposer.metadata.name);
        console.log('Your wallet address:', this.wallet.address);
      }
    } catch (error) {
      console.error('Failed to approve session:', error);
      
      if (this.signClient) {
        try {
          await this.signClient.reject({
            id: event.id,
            reason: getSdkError('USER_REJECTED')
          });
        } catch (rejectError) {
          console.error('Failed to reject session:', rejectError);
        }
      }
    }
  }

  private async handleSessionRequest(event: SignClientTypes.EventArguments['session_request']) {
    try {
      if (!this.signClient || !this.wallet) {
        throw new Error('SignClient or wallet not initialized');
      }

      const { topic, params, id } = event;
      const { request, chainId } = params;

      console.log('=== Session Request Details ===');
      console.log('Method:', request.method);
      console.log('ChainId:', chainId);
      console.log('Topic:', topic);
      console.log('Params:', JSON.stringify(request.params, null, 2));

      let result;

      switch (request.method) {
        case 'eth_accounts':
        case 'eth_requestAccounts':
          result = [this.wallet.address];
          break;

        case 'personal_sign':
          // Handle both parameter orders
          let message = request.params[0];
          let address = request.params[1];
          
          // Check if parameters are reversed
          if (typeof request.params[1] === 'string' && request.params[1].startsWith('0x') && request.params[1].length === 42) {
            // Standard order: [message, address]
          } else if (typeof request.params[0] === 'string' && request.params[0].startsWith('0x') && request.params[0].length === 42) {
            // Reversed order: [address, message]
            message = request.params[1];
            address = request.params[0];
          }
          
          console.log('Signing message:', message);
          result = await this.wallet.signMessage(message);
          break;

        case 'eth_sign':
          // eth_sign: [address, data]
          const signData = request.params[1];
          console.log('Signing data:', signData);
          result = await this.wallet.signMessage(signData);
          break;

        case 'eth_sendTransaction':
          const tx = request.params[0];
          console.log('Sending transaction:', tx);
          const sentTx = await this.wallet.sendTransaction(tx);
          result = sentTx.hash;
          break;

        case 'eth_signTransaction':
          const signTx = request.params[0];
          console.log('Signing transaction:', signTx);
          result = await this.wallet.signTransaction(signTx);
          break;

        case 'eth_signTypedData':
        case 'eth_signTypedData_v3':
        case 'eth_signTypedData_v4':
          const typedData = typeof request.params[1] === 'string' 
            ? JSON.parse(request.params[1]) 
            : request.params[1];
          
          console.log('Signing typed data:', typedData);
          result = await this.wallet._signTypedData(
            typedData.domain,
            typedData.types,
            typedData.primaryType,
            typedData.message
          );
          break;

        case 'wallet_getCapabilities':
          const account = request.params[0];
          result = {
            [account.toLowerCase()]: {
              paymasterService: {
                supported: false
              },
              sessionKeys: {
                supported: false
              }
            }
          };
          break;

        case 'eth_chainId':
          result = '0x1'; // Mainnet
          break;

        case 'net_version':
          result = '1';
          break;

        case 'wallet_switchEthereumChain':
          const chainId = request.params[0].chainId;
          console.log('Chain switch requested to:', chainId);
          result = null;
          break;

        case 'wallet_addEthereumChain':
          console.log('Add chain requested:', request.params[0]);
          result = null;
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
          console.warn(`Unsupported method: ${request.method}`);
          throw new Error(`Method not supported: ${request.method}`);
      }

      // Send response
      const response = {
        id,
        result,
        jsonrpc: '2.0'
      };

      await this.signClient.respond({
        topic,
        response
      });

      console.log('Response sent successfully');
    } catch (error) {
      console.error('Failed to handle session request:', error);
      
      if (this.signClient) {
        try {
          await this.signClient.respond({
            topic: event.topic,
            response: {
              id: event.id,
              error: {
                code: -32000,
                message: error instanceof Error ? error.message : 'Unknown error'
              },
              jsonrpc: '2.0'
            }
          });
        } catch (respondError) {
          console.error('Failed to send error response:', respondError);
        }
      }
    }
  }

  async connectWithUri(uri: string, privateKey: string, isTestnet: boolean = false): Promise<void> {
    try {
      console.log('=== OpenSea WalletConnect Connection ===');
      console.log('URI:', uri);
      console.log('Network:', isTestnet ? 'Testnet' : 'Mainnet');

      this.isTestnet = isTestnet;

      // Initialize with cache clearing to prevent stale session issues
      await this.initialize(true);

      // Create wallet
      const { ethers } = await import('ethers');
      this.wallet = new ethers.Wallet(privateKey);
      
      console.log('Wallet address:', this.wallet.address);

      // Pair with URI
      if (this.signClient) {
        await this.signClient.pair({ uri });
        console.log('Pairing initiated successfully');
      }

    } catch (error) {
      console.error('Failed to connect with URI:', error);
      throw error;
    }
  }

  getSessions(): WalletConnectSession[] {
    return Array.from(this.sessions.values());
  }

  async disconnectSession(topic: string): Promise<void> {
    try {
      if (this.signClient && this.sessions.has(topic)) {
        await this.signClient.disconnect({
          topic,
          reason: getSdkError('USER_DISCONNECTED')
        });
        this.sessions.delete(topic);
        console.log('Session disconnected:', topic);
      }
    } catch (error) {
      console.error('Failed to disconnect session:', error);
    }
  }

  async disconnectAll(): Promise<void> {
    try {
      for (const topic of this.sessions.keys()) {
        await this.disconnectSession(topic);
      }
      console.log('All sessions disconnected');
    } catch (error) {
      console.error('Failed to disconnect all sessions:', error);
    }
  }
}