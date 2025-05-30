import config from '../src/config/env.js';
import mongoose from 'mongoose';

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB 연결 성공');
        process.exit(0);
    })
    .catch(err => {
        console.error('MongoDB 연결 실패:', err);
        process.exit(1);
    }); 