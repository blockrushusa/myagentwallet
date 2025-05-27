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

export class RealWalletConnectManager {
  private static instance: RealWalletConnectManager;
  private signClient: SignClient | null = null;
  private wallet: any = null;
  private sessions: Map<string, WalletConnectSession> = new Map();
  private isTestnet: boolean = false;

  private constructor() {}

  static getInstance(): RealWalletConnectManager {
    if (!RealWalletConnectManager.instance) {
      RealWalletConnectManager.instance = new RealWalletConnectManager();
    }
    return RealWalletConnectManager.instance;
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
  }

  private async handleSessionProposal(event: SignClientTypes.EventArguments['session_proposal']) {
    try {
      if (!this.signClient || !this.wallet) {
        throw new Error('SignClient or wallet not initialized');
      }

      const { params, id } = event;
      const { proposer, requiredNamespaces, optionalNamespaces } = params;

      console.log('Handling session proposal from:', proposer.metadata.name);
      console.log('Required namespaces:', requiredNamespaces);
      console.log('Optional namespaces:', optionalNamespaces);

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

      console.log('Session approved:', session);
      
      // Notify about successful connection
      if (typeof window !== 'undefined') {
        window.postMessage({ type: 'WALLET_CONNECTED', address: this.wallet.address }, '*');
      }
    } catch (error) {
      console.error('Failed to approve session:', error);
      
      if (this.signClient) {
        await this.signClient.reject({
          id: event.id,
          reason: getSdkError('USER_REJECTED')
        });
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

      let result;

      switch (request.method) {
        case 'eth_accounts':
          result = [this.wallet.address];
          break;

        case 'eth_requestAccounts':
          result = [this.wallet.address];
          break;

        case 'personal_sign':
          const message = request.params[0];
          result = await this.wallet.signMessage(message);
          break;

        case 'eth_sign':
          const data = request.params[1];
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

        default:
          throw new Error(`Unsupported method: ${request.method}`);
      }

      await this.signClient.respond({
        topic,
        response: {
          id,
          result,
          jsonrpc: '2.0'
        }
      });

      console.log('Request handled successfully:', request.method);
    } catch (error) {
      console.error('Failed to handle session request:', error);
      
      if (this.signClient) {
        await this.signClient.respond({
          topic: event.topic,
          response: {
            id: event.id,
            error: getSdkError('INVALID_METHOD'),
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
      const { ethers } = await import('ethers');
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