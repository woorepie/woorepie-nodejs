// src/services/walletService.js
import { Wallet } from 'ethers';
import WalletModel from '../models/wallet.js';
import { encryptKey } from '../utils/crypto.js';

export const createWallet = async (customer_id, kyc, uri) => {
  const wallet = Wallet.createRandom();
  const encryptedKey = encryptKey(wallet.privateKey);

  await WalletModel.create({
    customer_id,
    wallet_address: wallet.address,
    encrypted_key: encryptedKey,
    kyc,
    uri
  });

  console.log(`Wallet created for customer ${customer_id}: ${wallet.address}`);
  console.log(`Wallet private key for customer ${customer_id}: ${wallet.privateKey}`);
  console.log(`Wallet mnemonic for customer ${customer_id}: ${wallet.mnemonic}`);
};
