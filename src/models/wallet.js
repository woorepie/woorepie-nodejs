// src/models/Wallet.js
import mongoose from 'mongoose';

const WalletSchema = new mongoose.Schema({
  user_id: String,
  wallet_address: String,
  encrypted_key: String,
  kyc: String,
  uri: String,
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model('Wallet', WalletSchema);
