import { SignClient } from '@walletconnect/sign-client'
import { getSdkError } from '@walletconnect/utils'
import type { SessionTypes, SignClientTypes } from '@walletconnect/types'
import { ethers } from 'ethers'

export interface WalletConnectSession {
  topic: string;
  peerMetadata: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
}

export class RealWalletConnectManager {
  private static instance: RealWalletConnectManager;
  private signClient: InstanceType<typeof SignClient> | null = null;
  private wallet: any = null;
  private sessions: Map<string, WalletConnectSession> = new Map();
  private isTestnet: boolean = false;
  private pendingProposals: Map<number, any> = new Map();
  private onProposalCallback?: (proposal: any) => void;

  private constructor() {}

  static getInstance(): RealWalletConnectManager {
    if (!RealWalletConnectManager.instance) {
      RealWalletConnectManager.instance = new RealWalletConnectManager();
    }
    return RealWalletConnectManager.instance;
  }

  setOnProposalCallback(callback: (proposal: any) => void) {
    this.onProposalCallback = callback;
  }

  async approveProposal(proposalId: number) {
    const proposal = this.pendingProposals.get(proposalId);
    if (!proposal) {
      console.error('No pending proposal found for ID:', proposalId);
      return;
    }

    try {
      await this.processSessionProposal(proposal);
      this.pendingProposals.delete(proposalId);
    } catch (error) {
      console.error('Failed to approve proposal:', error);
      throw error;
    }
  }

  async rejectProposal(proposalId: number) {
    const proposal = this.pendingProposals.get(proposalId);
    if (!proposal || !this.signClient) {
      console.error('No pending proposal or SignClient found for ID:', proposalId);
      return;
    }

    try {
      await this.signClient.reject({
        id: proposalId,
        reason: getSdkError('USER_REJECTED')
      });
      this.pendingProposals.delete(proposalId);
      console.log('Proposal rejected by user');
    } catch (error) {
      console.error('Failed to reject proposal:', error);
      throw error;
    }
  }

  async initialize() {
    if (this.signClient) return;

    try {
      console.log('Initializing WalletConnect SignClient...');
      
      this.signClient = await SignClient.init({
        projectId: '254989a6385b6074e2abe35d3555ac9c',
        metadata: {
          name: 'MyAgentWallet',
          description: 'Online Web3 Wallet for AI Agents',
          url: typeof window !== 'undefined' ? window.location.origin : 'https://myagentwallet.com',
          icons: ['https://avatars.githubusercontent.com/u/37784886']
        }
      });

      // Restore existing sessions
      try {
        const activeSessions = this.signClient.session.getAll();
        if (activeSessions && activeSessions.length > 0) {
          console.log('Restoring existing sessions:', activeSessions.length);
          activeSessions.forEach((session) => {
            this.sessions.set(session.topic, {
              topic: session.topic,
              peerMetadata: session.peer.metadata
            });
          });
        }
      } catch (e) {
        console.log('No existing sessions to restore');
      }

      this.setupEventListeners();
      console.log('WalletConnect SignClient initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WalletConnect:', error);
      throw error;
    }
  }

  private setupEventListeners() {
    if (!this.signClient) return;

    // Handle session proposals
    this.signClient.on('session_proposal', async (event) => {
      console.log('Received session proposal:', event);
      await this.handleSessionProposal(event);
    });

    // Handle session requests (like signing transactions)
    this.signClient.on('session_request', async (event) => {
      console.log('Received session request:', event);
      await this.handleSessionRequest(event);
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

    // Handle session events
    this.signClient.on('session_event', (event) => {
      console.log('Session event:', event);
    });

    // Handle session expiry
    this.signClient.on('session_expire', (event) => {
      console.log('Session expired:', event);
      this.sessions.delete(event.topic);
    });
  }

  private async handleSessionProposal(event: SignClientTypes.EventArguments['session_proposal']) {
    console.log('=== WalletConnect Session Proposal Received ===');
    
    const { params, id } = event;
    const { proposer, requiredNamespaces, optionalNamespaces } = params;

    console.log('Proposal ID:', id);
    console.log('Proposer:', proposer.metadata.name);
    console.log('Proposer URL:', proposer.metadata.url);
    console.log('Required namespaces:', JSON.stringify(requiredNamespaces, null, 2));
    console.log('Optional namespaces:', JSON.stringify(optionalNamespaces, null, 2));
    console.log('Wallet address:', this.wallet?.address);
    console.log('Network mode:', this.isTestnet ? 'Testnet' : 'Mainnet');

    // Store the proposal for user approval
    this.pendingProposals.set(id, event);
    
    // Trigger the UI callback to show confirmation dialog
    if (this.onProposalCallback) {
      this.onProposalCallback({
        id,
        proposer,
        requiredNamespaces,
        optionalNamespaces
      });
    } else {
      console.warn('No proposal callback set - auto-rejecting');
      await this.rejectProposal(id);
    }
  }

  private async processSessionProposal(event: SignClientTypes.EventArguments['session_proposal']) {
    try {
      if (!this.signClient) {
        console.error('SignClient not initialized');
        throw new Error('SignClient not initialized');
      }
      
      if (!this.wallet) {
        console.error('Wallet not initialized');
        throw new Error('Wallet not initialized');
      }

      const { params, id } = event;
      const { proposer, requiredNamespaces, optionalNamespaces } = params;

      // Build namespaces based on what's required
      const namespaces: SessionTypes.Namespaces = {};
      
      // Handle EIP155 namespace (Ethereum)
      if (requiredNamespaces.eip155) {
        const chains = requiredNamespaces.eip155.chains || [this.isTestnet ? 'eip155:11155111' : 'eip155:1'];
        const methods = requiredNamespaces.eip155.methods || [];
        const events = requiredNamespaces.eip155.events || [];
        
        // Create accounts for all required chains
        const accounts = chains.map(chain => `${chain}:${this.wallet.address}`);
        
        namespaces.eip155 = {
          accounts,
          methods,
          events,
          chains
        };
      }

      // Handle optional namespaces - if there are no required namespaces, use optional ones
      if (optionalNamespaces?.eip155) {
        const optionalChains = optionalNamespaces.eip155.chains || [];
        const optionalMethods = optionalNamespaces.eip155.methods || [];
        const optionalEvents = optionalNamespaces.eip155.events || [];
        
        if (!namespaces.eip155) {
          // No required namespaces, so create from optional
          const accounts = optionalChains.map(chain => `${chain}:${this.wallet.address}`);
          
          const defaultChain = this.isTestnet ? 'eip155:11155111' : 'eip155:1';
          namespaces.eip155 = {
            accounts: accounts.length > 0 ? accounts : [`${defaultChain}:${this.wallet.address}`],
            methods: optionalMethods,
            events: optionalEvents,
            chains: optionalChains.length > 0 ? optionalChains : [defaultChain]
          };
        } else {
          // Add optional chains to existing namespace
          const additionalAccounts = optionalChains
            .filter(chain => !namespaces.eip155?.accounts.includes(`${chain}:${this.wallet.address}`))
            .map(chain => `${chain}:${this.wallet.address}`);
          
          if (additionalAccounts.length > 0) {
            namespaces.eip155.accounts = [...namespaces.eip155.accounts, ...additionalAccounts];
            namespaces.eip155.methods = [...new Set([...namespaces.eip155.methods, ...optionalMethods])];
            namespaces.eip155.events = [...new Set([...namespaces.eip155.events, ...optionalEvents])];
            namespaces.eip155.chains = [...new Set([...(namespaces.eip155.chains || []), ...optionalChains])];
          }
        }
      }

      // OpenSea sometimes sends empty namespaces, handle this case
      if (Object.keys(requiredNamespaces).length === 0 && (!optionalNamespaces || Object.keys(optionalNamespaces).length === 0)) {
        console.log('No namespaces provided, using defaults for OpenSea compatibility');
        const defaultChain = this.isTestnet ? 'eip155:11155111' : 'eip155:1';
        namespaces.eip155 = {
          accounts: [`${defaultChain}:${this.wallet.address}`],
          methods: [
            'eth_sendTransaction',
            'eth_signTransaction', 
            'eth_sign',
            'personal_sign',
            'eth_signTypedData',
            'eth_signTypedData_v4',
            'eth_accounts',
            'eth_requestAccounts',
            'eth_chainId',
            'wallet_switchEthereumChain',
            'wallet_addEthereumChain',
            'eth_getBalance',
            'eth_getTransactionCount',
            'eth_gasPrice',
            'eth_estimateGas',
            'net_version',
            'wallet_getCapabilities'
          ],
          events: ['chainChanged', 'accountsChanged'],
          chains: [defaultChain]
        };
      }

      // If still no namespaces, create a default one
      if (Object.keys(namespaces).length === 0) {
        const defaultChain = this.isTestnet ? 'eip155:11155111' : 'eip155:1';
        namespaces.eip155 = {
          accounts: [`${defaultChain}:${this.wallet.address}`],
          methods: ['eth_sendTransaction', 'personal_sign', 'eth_sign', 'eth_signTypedData', 'eth_signTypedData_v4'],
          events: ['chainChanged', 'accountsChanged'],
          chains: [defaultChain]
        };
      }

      console.log('Approving with namespaces:', namespaces);

      const session = await this.signClient.approve({
        id,
        namespaces
      });

      // Store session info
      this.sessions.set(session.topic, {
        topic: session.topic,
        peerMetadata: proposer.metadata
      });

      console.log('✅ Session approved successfully!');
      console.log('Session topic:', session.topic);
      console.log('Session peer:', proposer.metadata.name);
      
      // Notify about successful connection
      if (typeof window !== 'undefined') {
        window.postMessage({ type: 'WALLET_CONNECTED', address: this.wallet.address }, '*');
      }
    } catch (error) {
      console.error('❌ Failed to approve session:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      try {
        if (this.signClient) {
          console.log('Rejecting session due to error...');
          await this.signClient.reject({
            id: event.id,
            reason: getSdkError('USER_REJECTED')
          });
        }
      } catch (rejectError) {
        console.error('Failed to reject session:', rejectError);
      }
    }
  }

  private async handleSessionRequest(event: SignClientTypes.EventArguments['session_request']) {
    try {
      if (!this.signClient || !this.wallet) {
        throw new Error('SignClient or wallet not initialized');
      }

      const { topic, params, id } = event;
      const { request } = params;

      console.log('Handling session request:', request.method, request.params);
      console.log('Request topic:', topic);
      console.log('Known sessions:', Array.from(this.sessions.keys()));

      // Check if session exists
      if (!this.sessions.has(topic)) {
        console.log('Session not found in local cache, checking SignClient sessions...');
        try {
          const activeSessions = this.signClient.session.getAll();
          const session = activeSessions.find(s => s.topic === topic);
          if (session) {
            console.log('Found session in SignClient, adding to cache');
            this.sessions.set(topic, {
              topic: session.topic,
              peerMetadata: session.peer.metadata
            });
          } else {
            console.error('Session topic not found:', topic);
            // Don't throw error, just log it - OpenSea might be using stale session
            console.log('Proceeding anyway as OpenSea might have stale session info');
          }
        } catch (e) {
          console.error('Error checking sessions:', e);
          // Continue anyway
        }
      }

      let result;

      switch (request.method) {
        case 'eth_accounts':
          result = [this.wallet.address];
          break;

        case 'eth_requestAccounts':
          result = [this.wallet.address];
          break;

        case 'personal_sign':
          // personal_sign params: [message, address]
          const message = request.params[0];
          const signerAddress = request.params[1];
          
          // Verify the requested address matches our wallet
          if (signerAddress && signerAddress.toLowerCase() !== this.wallet.address.toLowerCase()) {
            throw new Error(`Address mismatch: requested ${signerAddress}, wallet has ${this.wallet.address}`);
          }
          
          result = await this.wallet.signMessage(message);
          break;

        case 'eth_sign':
          // eth_sign params: [address, data]
          const signAddress = request.params[0];
          const data = request.params[1];
          
          // Verify the requested address matches our wallet
          if (signAddress && signAddress.toLowerCase() !== this.wallet.address.toLowerCase()) {
            throw new Error(`Address mismatch: requested ${signAddress}, wallet has ${this.wallet.address}`);
          }
          
          result = await this.wallet.signMessage(data);
          break;

        case 'eth_sendTransaction':
        case 'eth_signTransaction':
          const transaction = request.params[0];
          result = await this.wallet.signTransaction(transaction);
          break;

        case 'eth_signTypedData':
        case 'eth_signTypedData_v4':
          const typedData = request.params[1];
          result = await this.wallet.signTypedData(
            typedData.domain,
            typedData.types,
            typedData.message
          );
          break;

        case 'wallet_getCapabilities':
          // Return wallet capabilities for the requested account
          const requestedAccount = request.params[0];
          result = {
            [requestedAccount.toLowerCase()]: {
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
          // Return appropriate chain ID based on network mode
          result = this.isTestnet ? '0xaa36a7' : '0x1'; // Sepolia: 11155111, Mainnet: 1
          break;

        case 'net_version':
          // Return appropriate network ID
          result = this.isTestnet ? '11155111' : '1';
          break;

        case 'wallet_switchEthereumChain':
          // Handle chain switching request
          const chainId = request.params[0].chainId;
          console.log('Chain switch requested to:', chainId);
          // For now, just acknowledge the request
          result = null;
          break;

        case 'eth_getBalance':
          // Return a mock balance for now
          result = '0x0';
          break;

        case 'eth_getTransactionCount':
          // Return nonce
          result = '0x0';
          break;

        case 'wallet_addEthereumChain':
          // Handle chain addition request
          const addChainParams = request.params[0];
          console.log('Chain addition requested:', addChainParams);
          result = null;
          break;

        case 'eth_gasPrice':
          // Return mock gas price
          result = '0x9184e72a000'; // 10 gwei
          break;

        case 'eth_estimateGas':
          // Return mock gas estimate
          result = '0x5208'; // 21000 gas
          break;

        default:
          console.warn(`Unsupported method: ${request.method}, returning null`);
          result = null;
      }

      try {
        await this.signClient.respond({
          topic,
          response: {
            id,
            result,
            jsonrpc: '2.0'
          }
        });
        console.log('Request handled successfully:', request.method);
      } catch (respondError) {
        // Fallback for version mismatch issues
        console.error('Failed to respond normally, trying fallback:', respondError);
        try {
          // TODO: Fix this fallback response method - messages property doesn't exist in current WalletConnect API
          // const response = {
          //   topic,
          //   response: {
          //     id,
          //     result,
          //     jsonrpc: '2.0'
          //   }
          // };
          // await this.signClient.core.relayer.subscriber.messages.set(topic, response);
          console.log('Skipping fallback response - API method needs update');
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      }
    } catch (error) {
      console.error('Failed to handle session request:', error);
      
      if (this.signClient) {
        await this.signClient.respond({
          topic: event.topic,
          response: {
            id: event.id,
            error: {
              code: -32601,
              message: 'Method not found'
            },
            jsonrpc: '2.0'
          }
        });
      }
    }
  }

  async connectWithUri(uri: string, privateKey: string, isTestnet: boolean = false): Promise<void> {
    try {
      console.log('Connecting with WalletConnect URI:', uri);
      console.log('Network mode:', isTestnet ? 'Sepolia Testnet' : 'Ethereum Mainnet');

      // Set testnet mode
      this.isTestnet = isTestnet;

      // Initialize if needed
      if (!this.signClient) {
        await this.initialize();
      }

      // Create wallet from private key
      this.wallet = new ethers.Wallet(privateKey);
      
      console.log('Created wallet with address:', this.wallet.address);

      // Pair with the URI
      if (this.signClient) {
        await this.signClient.pair({ uri });
        console.log('Pairing initiated with URI');
      }

    } catch (error) {
      console.error('Failed to connect with URI:', error);
      throw error;
    }
  }

  getSessions(): WalletConnectSession[] {
    // Sync with SignClient sessions first
    if (this.signClient) {
      try {
        const activeSessions = this.signClient.session.getAll();
        if (activeSessions && activeSessions.length > 0) {
          activeSessions.forEach((session) => {
            if (!this.sessions.has(session.topic)) {
              this.sessions.set(session.topic, {
                topic: session.topic,
                peerMetadata: session.peer.metadata
              });
            }
          });
        }
      } catch (e) {
        console.log('Error syncing sessions:', e);
      }
    }
    return Array.from(this.sessions.values());
  }

  getActiveSessionTopics(): string[] {
    if (!this.signClient) return [];
    try {
      const sessions = this.signClient.session.getAll();
      return sessions.map(s => s.topic);
    } catch (e) {
      return [];
    }
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
      throw error;
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
      throw error;
    }
  }
}