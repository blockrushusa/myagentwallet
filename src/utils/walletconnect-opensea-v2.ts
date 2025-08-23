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
  private signClient: SignClient | null = null;
  private wallet: any = null;
  private sessions: Map<string, WalletConnectSession> = new Map();
  private pendingProposals: Map<number, SignClientTypes.EventArguments['session_proposal']> = new Map();
  private isTestnet: boolean = false;

  private constructor() {}

  static getInstance(): OpenSeaWalletConnectManager {
    if (!OpenSeaWalletConnectManager.instance) {
      OpenSeaWalletConnectManager.instance = new OpenSeaWalletConnectManager();
    }
    return OpenSeaWalletConnectManager.instance;
  }

  async initialize() {
    if (this.signClient) return;

    try {
      console.log('Initializing WalletConnect SignClient...');
      
      // Clear any existing storage to prevent conflicts
      await this.clearStorage();
      
      this.signClient = await SignClient.init({
        projectId: '254989a6385b6074e2abe35d3555ac9c',
        metadata: {
          name: 'MyAgentWallet',
          description: 'Online Web3 Wallet for AI Agents',
          url: typeof window !== 'undefined' ? window.location.origin : 'https://myagentwallet.com',
          icons: ['https://avatars.githubusercontent.com/u/37784886']
        }
      });

      this.setupEventListeners();
      console.log('WalletConnect SignClient initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WalletConnect:', error);
      throw error;
    }
  }

  private async clearStorage() {
    try {
      if (typeof window !== 'undefined') {
        // Clear localStorage WalletConnect entries
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && (key.includes('walletconnect') || key.includes('wc@2'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => window.localStorage.removeItem(key));
        
        // Clear IndexedDB
        if (window.indexedDB) {
          const databases = await window.indexedDB.databases();
          for (const db of databases) {
            if (db.name && db.name.includes('walletconnect')) {
              window.indexedDB.deleteDatabase(db.name);
            }
          }
        }
      }
    } catch (error) {
      console.log('Error clearing storage:', error);
    }
  }

  private setupEventListeners() {
    if (!this.signClient) return;

    // Handle session proposals with proper async handling
    this.signClient.on('session_proposal', (event) => {
      console.log('=== Received Session Proposal ===');
      console.log('Proposal ID:', event.id);
      console.log('From:', event.params.proposer.metadata.name);
      
      // Store the proposal for processing
      this.pendingProposals.set(event.id, event);
      
      // Process the proposal
      this.processSessionProposal(event);
    });

    // Handle session requests
    this.signClient.on('session_request', async (event) => {
      console.log('=== Session Request ===');
      await this.handleSessionRequest(event);
    });

    // Handle session events
    this.signClient.on('session_delete', (event) => {
      console.log('Session deleted:', event);
      this.sessions.delete(event.topic);
    });

    this.signClient.on('session_expire', (event) => {
      console.log('Session expired:', event);
      this.sessions.delete(event.topic);
    });

    this.signClient.on('session_ping', (event) => {
      console.log('Session ping:', event);
    });

    this.signClient.on('session_update', (event) => {
      console.log('Session updated:', event);
    });
  }

  private async processSessionProposal(event: SignClientTypes.EventArguments['session_proposal']) {
    try {
      if (!this.signClient || !this.wallet) {
        throw new Error('SignClient or wallet not initialized');
      }

      const { params, id } = event;
      const { proposer, requiredNamespaces, optionalNamespaces } = params;

      console.log('Processing proposal from:', proposer.metadata.name);
      console.log('Proposal ID:', id);

      // Wait a bit to ensure the proposal is properly registered
      await new Promise(resolve => setTimeout(resolve, 100));

      // Build namespaces
      const accounts: string[] = [];
      const chains = ['eip155:1', 'eip155:137', 'eip155:10', 'eip155:42161', 'eip155:8453'];
      
      for (const chain of chains) {
        accounts.push(`${chain}:${this.wallet.address}`);
      }

      const namespaces: SessionTypes.Namespaces = {
        eip155: {
          accounts,
          methods: [
            'eth_sendTransaction',
            'eth_signTransaction',
            'eth_sign',
            'personal_sign',
            'eth_signTypedData',
            'eth_signTypedData_v3',
            'eth_signTypedData_v4',
            'eth_accounts',
            'eth_requestAccounts',
            'eth_chainId',
            'wallet_switchEthereumChain',
            'wallet_addEthereumChain',
            'wallet_getCapabilities',
            'wallet_sendCalls',
            'wallet_getCallsStatus'
          ],
          events: ['chainChanged', 'accountsChanged']
        }
      };

      console.log('Approving with namespaces:', namespaces);

      try {
        // Approve the session
        const session = await this.signClient.approve({
          id,
          namespaces
        });

        console.log('✅ Session approved!');
        console.log('Topic:', session.topic);
        console.log('Connected to:', proposer.metadata.name);

        // Store session
        this.sessions.set(session.topic, {
          topic: session.topic,
          peerMetadata: proposer.metadata
        });

        // Clean up stored proposal
        this.pendingProposals.delete(id);

        // Notify success
        if (typeof window !== 'undefined') {
          window.postMessage({
            type: 'WALLET_CONNECTED',
            address: this.wallet.address,
            topic: session.topic
          }, '*');
        }

      } catch (approveError) {
        console.error('Failed to approve session:', approveError);
        
        // Try to reject properly
        try {
          await this.signClient.reject({
            id,
            reason: getSdkError('USER_REJECTED')
          });
        } catch (rejectError) {
          console.error('Failed to reject:', rejectError);
        }
        
        // Clean up
        this.pendingProposals.delete(id);
      }

    } catch (error) {
      console.error('Error in processSessionProposal:', error);
    }
  }

  private async handleSessionRequest(event: SignClientTypes.EventArguments['session_request']) {
    try {
      if (!this.signClient || !this.wallet) {
        throw new Error('SignClient or wallet not initialized');
      }

      const { topic, params, id } = event;
      const { request, chainId } = params;

      console.log('Request:', request.method);
      console.log('Chain:', chainId);

      let result;

      switch (request.method) {
        case 'eth_accounts':
        case 'eth_requestAccounts':
          result = [this.wallet.address];
          break;

        case 'personal_sign':
          const message = request.params[0];
          console.log('Signing message:', message);
          result = await this.wallet.signMessage(message);
          break;

        case 'eth_sign':
          const data = request.params[1];
          result = await this.wallet.signMessage(data);
          break;

        case 'eth_signTypedData':
        case 'eth_signTypedData_v3':
        case 'eth_signTypedData_v4':
          const typedData = typeof request.params[1] === 'string' 
            ? JSON.parse(request.params[1]) 
            : request.params[1];
          
          result = await this.wallet._signTypedData(
            typedData.domain,
            typedData.types,
            typedData.primaryType,
            typedData.message
          );
          break;

        case 'eth_sendTransaction':
          const tx = request.params[0];
          console.log('Sending transaction:', tx);
          const sentTx = await this.wallet.sendTransaction(tx);
          result = sentTx.hash;
          break;

        case 'eth_signTransaction':
          result = await this.wallet.signTransaction(request.params[0]);
          break;

        case 'wallet_getCapabilities':
          result = {
            [request.params[0].toLowerCase()]: {
              paymasterService: { supported: false },
              sessionKeys: { supported: false }
            }
          };
          break;

        case 'eth_chainId':
          result = '0x1';
          break;

        case 'net_version':
          result = '1';
          break;

        case 'wallet_switchEthereumChain':
          console.log('Chain switch requested');
          result = null;
          break;

        default:
          console.warn(`Unsupported method: ${request.method}`);
          throw new Error(`Method not supported: ${request.method}`);
      }

      // Send response
      await this.signClient.respond({
        topic,
        response: {
          id,
          result,
          jsonrpc: '2.0'
        }
      });

      console.log('✅ Response sent for:', request.method);

    } catch (error) {
      console.error('Request failed:', error);
      
      if (this.signClient) {
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
      }
    }
  }

  async connectWithUri(uri: string, privateKey: string, isTestnet: boolean = false): Promise<void> {
    try {
      console.log('=== Starting OpenSea Connection ===');
      console.log('URI:', uri);

      this.isTestnet = isTestnet;

      // Initialize
      await this.initialize();

      // Create wallet
      const { ethers } = await import('ethers');
      this.wallet = new ethers.Wallet(privateKey);
      
      console.log('Wallet address:', this.wallet.address);

      // Clear any pending proposals
      this.pendingProposals.clear();

      // Pair with URI
      if (this.signClient) {
        console.log('Initiating pairing...');
        const pairing = await this.signClient.pair({ uri });
        console.log('✅ Pairing initiated');
        
        // Give some feedback that we're waiting
        console.log('⏳ Waiting for session proposal from OpenSea...');
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
      if (this.signClient && this.sessions.has(topic)) {
        await this.signClient.disconnect({
          topic,
          reason: getSdkError('USER_DISCONNECTED')
        });
        this.sessions.delete(topic);
        console.log('Disconnected:', topic);
      }
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  }

  async disconnectAll(): Promise<void> {
    try {
      for (const topic of this.sessions.keys()) {
        await this.disconnectSession(topic);
      }
    } catch (error) {
      console.error('Disconnect all failed:', error);
    }
  }
}