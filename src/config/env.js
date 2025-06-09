import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 설정
process.env.NODE_ENV = (process.env.NODE_ENV && (process.env.NODE_ENV).trim().toLowerCase() == 'production') 
  ? 'production' 
  : 'development';

// 환경에 따른 로깅
if (process.env.NODE_ENV == 'production') {
  console.log("Production Mode");
} else if (process.env.NODE_ENV == 'development') {
  console.log("Development Mode");
}

// 환경 파일 로드
if (process.env.NODE_ENV === 'development') {
    dotenv.config({path: path.join(__dirname, '../../.env.development')});
} else if(process.env.NODE_ENV === 'test') {
    dotenv.config({path: path.join(__dirname, '../../.env.test')});
} else if(process.env.NODE_ENV === 'production') {
    dotenv.config({path: path.join(__dirname, '../../.env.production')});
}

export default {
    NODE_ENV: process.env.NODE_ENV,
    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
    MONGODB_URI: process.env.MONGODB_URI,
    KAFKA_BROKER: process.env.KAFKA_BROKER,
    AMOY_RPC_URL: process.env.AMOY_RPC_URL,
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    DEPLOYER_PRIVATE_KEY: process.env.DEPLOYER_PRIVATE_KEY,
    CHAIN_REGISTRY_ADDRESS: process.env.CHAIN_REGISTRY_ADDRESS || process.env.REGICHAIN
} 