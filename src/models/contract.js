// src/models/Wallet.js
import mongoose from 'mongoose';

const ContractSchema = new mongoose.Schema({
  estate_id: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  contract_address: {
    type: String,
    required: true
  },
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model('Contract', ContractSchema);
