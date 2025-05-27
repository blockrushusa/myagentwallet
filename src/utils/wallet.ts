import { ethers } from 'ethers';
import * as CryptoJS from 'crypto-js';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';

export interface WalletData {
  address: string;
  privateKey: string;
}

export class WalletManager {
  private static readonly ENCRYPTION_ALGORITHM = 'AES';
  private static readonly KEY_DERIVATION_ITERATIONS = 100000;

  static async generateWallet(): Promise<WalletData> {
    const wallet = ethers.Wallet.createRandom();
    console.log('Generated wallet using ethers.js with secure random generation');
    
    return {
      address: wallet.address,
      privateKey: wallet.privateKey
    };
  }

  static validatePrivateKey(privateKey: string): boolean {
    try {
      if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey;
      }
      
      if (privateKey.length !== 66) {
        return false;
      }
      
      new ethers.Wallet(privateKey);
      return true;
    } catch {
      return false;
    }
  }

  static getWalletFromPrivateKey(privateKey: string): WalletData {
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    
    const wallet = new ethers.Wallet(privateKey);
    return {
      address: wallet.address,
      privateKey: wallet.privateKey
    };
  }

  static async encryptPrivateKey(privateKey: string, password: string): Promise<string> {
    try {
      const salt = CryptoJS.lib.WordArray.random(256/8);
      
      console.log('Using PBKDF2 with SHA256 for key derivation with AES256 encryption');
      
      // Use PBKDF2 with SHA256 as a secure alternative to Argon2
      const keyBytes = pbkdf2(sha256, password, salt.toString(), {
        c: 100000, // 100k iterations
        dkLen: 32  // 256 bits
      });
      
      const key = CryptoJS.enc.Hex.parse(Array.from(keyBytes).map(b => b.toString(16).padStart(2, '0')).join(''));
      const iv = CryptoJS.lib.WordArray.random(128/8);
      
      const encrypted = CryptoJS.AES.encrypt(privateKey, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const result = {
        salt: salt.toString(),
        iv: iv.toString(),
        encrypted: encrypted.toString()
      };

      return JSON.stringify(result);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt private key');
    }
  }

  static async decryptPrivateKey(encryptedData: string, password: string): Promise<string> {
    try {
      const data = JSON.parse(encryptedData);
      
      // Use PBKDF2 with SHA256 (matching encryption)
      const keyBytes = pbkdf2(sha256, password, data.salt, {
        c: 100000, // 100k iterations
        dkLen: 32  // 256 bits
      });
      
      const key = CryptoJS.enc.Hex.parse(Array.from(keyBytes).map(b => b.toString(16).padStart(2, '0')).join(''));
      const iv = CryptoJS.enc.Hex.parse(data.iv);
      
      const decrypted = CryptoJS.AES.decrypt(data.encrypted, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt private key');
    }
  }
}