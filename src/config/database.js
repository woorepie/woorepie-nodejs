import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sto');
        console.log('MongoDB 연결 성공');
    } catch (error) {
        console.error('MongoDB 연결 실패:', error);
        process.exit(1);
    }
};

export default connectDB; 