import { WalletManager } from '@/utils/wallet';

describe('WalletManager', () => {
  test('generates valid wallet', async () => {
    const wallet = await WalletManager.generateWallet();
    
    expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(wallet.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  test('validates private key correctly', () => {
    const validKey = '0x7f632445a50e8b0236b6f9132af3726ca2809fa5ce5205196b232ff4f3169b32';
    const invalidKey = 'invalid_key';
    const shortKey = '0x123';

    expect(WalletManager.validatePrivateKey(validKey)).toBe(true);
    expect(WalletManager.validatePrivateKey(invalidKey)).toBe(false);
    expect(WalletManager.validatePrivateKey(shortKey)).toBe(false);
  });

  test('imports wallet from private key', () => {
    const privateKey = '0x7f632445a50e8b0236b6f9132af3726ca2809fa5ce5205196b232ff4f3169b32';
    const wallet = WalletManager.getWalletFromPrivateKey(privateKey);
    
    expect(wallet.privateKey).toBe(privateKey);
    expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  test('encrypts and decrypts private key', async () => {
    const privateKey = '0x7f632445a50e8b0236b6f9132af3726ca2809fa5ce5205196b232ff4f3169b32';
    const password = 'test-password-123';
    
    const encrypted = await WalletManager.encryptPrivateKey(privateKey, password);
    expect(encrypted).toBeDefined();
    expect(typeof encrypted).toBe('string');
    
    const decrypted = await WalletManager.decryptPrivateKey(encrypted, password);
    expect(decrypted).toBe(privateKey);
  });

  test('encryption fails with wrong password', async () => {
    const privateKey = '0x7f632445a50e8b0236b6f9132af3726ca2809fa5ce5205196b232ff4f3169b32';
    const password = 'correct-password';
    const wrongPassword = 'wrong-password';
    
    const encrypted = await WalletManager.encryptPrivateKey(privateKey, password);
    
    await expect(
      WalletManager.decryptPrivateKey(encrypted, wrongPassword)
    ).rejects.toThrow('Failed to decrypt private key');
  });
});