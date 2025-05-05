// src/models/Wallet.js
import mongoose from 'mongoose';

const ContractSchema = new mongoose.Schema({
  estate_id: String,
  contract_address: String,
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model('Contract', ContractSchema);
