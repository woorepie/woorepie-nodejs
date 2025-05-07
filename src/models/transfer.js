import mongoose from 'mongoose';

const TransferSchema = new mongoose.Schema({
  trade_id: Number,
  estate_id: Number,
  buyer_id: Number,
  seller_id: Number,
  token_price: Number,
  trade_token_amount: Number,
  trade_date: Date,
  status: {
    type: String,
    enum: ['PENDING', 'TRANSFERRED', 'FAILED'],
    default: 'PENDING'
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

export default mongoose.model('Transfer', TransferSchema); 