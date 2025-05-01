// src/services/walletService.js
import { Wallet } from 'ethers';
import WalletModel from '../models/wallet.js';
import { encryptKey } from '../utils/crypto.js';

export const createWallet = async (user_id) => {
  const wallet = Wallet.createRandom();
  const encryptedKey = encryptKey(wallet.privateKey);

  await WalletModel.create({
    user_id,
    wallet_address: wallet.address,
    encrypted_key: encryptedKey,
  });

  console.log(`Wallet created for user ${user_id}: ${wallet.address}`);
};
