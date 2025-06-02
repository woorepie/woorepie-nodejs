import mongoose from 'mongoose';

const CoinSchema = new mongoose.Schema({
  customer_id: Number,
  estate_id: Number,
  amount: Number,
  date: Date,
  status: {
    type: String,
    enum: ['PENDING', 'ISSUED', 'FAILED'],
    default: 'PENDING'
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

export default mongoose.model('Coin', CoinSchema); 