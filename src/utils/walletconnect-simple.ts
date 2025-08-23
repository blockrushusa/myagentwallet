import SignClient from '@walletconnect/sign-client'

export class SimpleWalletConnect {
  private client: SignClient | null = null
  private session: any = null
  private wallet: any = null

  async init() {
    try {
      this.client = await SignClient.init({
        projectId: '254989a6385b6074e2abe35d3555ac9c',
        metadata: {
          name: 'MyAgentWallet',
          description: 'Web3 Wallet',
          url: 'https://myagentwallet.com',
          icons: ['https://avatars.githubusercontent.com/u/37784886']
        }
      })

      // Session events
      this.client.on('session_proposal', this.onSessionProposal.bind(this))
      this.client.on('session_request', this.onSessionRequest.bind(this))
      this.client.on('session_delete', () => {
        console.log('Session deleted')
        this.session = null
      })

      console.log('WalletConnect initialized')
    } catch (error) {
      console.error('Init failed:', error)
      throw error
    }
  }

  private async onSessionProposal(proposal: any) {
    try {
      console.log('Session proposal received:', proposal)
      
      const { id, params } = proposal
      const { requiredNamespaces, optionalNamespaces, proposer } = params

      // Create namespace with all chains
      const chains = ['eip155:1', 'eip155:137', 'eip155:10', 'eip155:42161', 'eip155:8453']
      const accounts = chains.map(chain => `${chain}:${this.wallet.address}`)
      
      const namespaces = {
        eip155: {
          accounts,
          methods: [
            'eth_sendTransaction',
            'eth_signTransaction',
            'eth_sign',
            'personal_sign',
            'eth_signTypedData',
            'eth_signTypedData_v4',
            'eth_accounts',
            'eth_requestAccounts',
            'eth_chainId'
          ],
          events: ['chainChanged', 'accountsChanged']
        }
      }

      const session = await this.client!.approve({
        id,
        namespaces
      })

      this.session = session
      console.log('Session approved')
      
      return session
    } catch (error) {
      console.error('Approval failed:', error)
      throw error
    }
  }

  private async onSessionRequest(event: any) {
    try {
      console.log('Session request:', event)
      
      const { topic, params, id } = event
      const { request } = params
      
      let result: any

      switch (request.method) {
        case 'eth_accounts':
        case 'eth_requestAccounts':
          result = [this.wallet.address]
          break
          
        case 'personal_sign':
          const message = request.params[0]
          result = await this.wallet.signMessage(message)
          break
          
        case 'eth_sign':
          result = await this.wallet.signMessage(request.params[1])
          break
          
        case 'eth_signTypedData':
        case 'eth_signTypedData_v4':
          const typedData = typeof request.params[1] === 'string' 
            ? JSON.parse(request.params[1]) 
            : request.params[1]
          result = await this.wallet._signTypedData(
            typedData.domain,
            typedData.types,
            typedData.message
          )
          break
          
        case 'eth_sendTransaction':
          const tx = await this.wallet.sendTransaction(request.params[0])
          result = tx.hash
          break
          
        case 'eth_chainId':
          result = '0x1'
          break
          
        default:
          throw new Error(`Method not supported: ${request.method}`)
      }

      const response = { id, result, jsonrpc: '2.0' }
      await this.client!.respond({ topic, response })
      
      console.log('Response sent')
    } catch (error) {
      console.error('Request failed:', error)
      
      await this.client!.respond({
        topic: event.topic,
        response: {
          id: event.id,
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })
    }
  }

  async connect(uri: string, privateKey: string) {
    try {
      // Set up wallet
      const { ethers } = await import('ethers')
      this.wallet = new ethers.Wallet(privateKey)
      
      console.log('Connecting with address:', this.wallet.address)
      
      // Initialize if needed
      if (!this.client) {
        await this.init()
      }
      
      // Pair with URI
      await this.client!.pair({ uri })
      console.log('Pairing initiated')
      
    } catch (error) {
      console.error('Connect failed:', error)
      throw error
    }
  }

  getSession() {
    return this.session
  }
}