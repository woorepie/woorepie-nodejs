import { Wallet, ethers } from 'ethers';
import WalletModel from '../models/wallet.js';
import { encryptKey } from '../utils/crypto.js';
import config from '../config/env.js';
import chainRegistryArtifact from "../../artifacts/ChainRegistry.json" with { type: "json" };

export const createWallet = async (customerId, customerKyc, customerIdentificationUrl) => {
  try {
    console.log(`Starting wallet creation for customer ${customerId}`);
    
    // 1. 새 지갑 생성
    const wallet = Wallet.createRandom();
    const encryptedKey = encryptKey(wallet.privateKey);

    console.log(`Wallet created for customer ${customerId}: ${wallet.address}`);
    console.log(`Wallet private key for customer ${customerId}: ${wallet.privateKey}`);
    console.log(`Wallet mnemonic for customer ${customerId}: ${wallet.mnemonic.phrase}`);

    // 2. ChainRegistry에 KYC 등록
    console.log(`Connecting to provider: ${config.AMOY_RPC_URL}`);
    const provider = new ethers.JsonRpcProvider(config.AMOY_RPC_URL);
    
    console.log(`Using deployer key: ${config.DEPLOYER_PRIVATE_KEY ? 'Set' : 'Not set'}`);
    const adminWallet = new ethers.Wallet(config.DEPLOYER_PRIVATE_KEY, provider);
    
    console.log(`Using ChainRegistry address: ${config.CHAIN_REGISTRY_ADDRESS}`);
    const chainRegistry = new ethers.Contract(
      config.CHAIN_REGISTRY_ADDRESS, 
      chainRegistryArtifact.abi, 
      adminWallet
    );

    // KYC 해시 생성
    const kycData = `KYC:${customerId}:${customerKyc}:${customerIdentificationUrl}`;
    const verificationHash = ethers.keccak256(ethers.toUtf8Bytes(kycData));
    const validityPeriod = 365 * 24 * 60 * 60; // 1년

    console.log(`Registering KYC for customer ${customerId}, wallet: ${wallet.address}`);

    // ChainRegistry에 KYC 등록
    const tx = await chainRegistry.verifyIdentityDirect(
      wallet.address,
      verificationHash,
      validityPeriod
    );

    console.log(`KYC registration tx: ${tx.hash}`);
    await tx.wait();
    console.log(`registered on-chain for customer ${customerId}`);

    // 3. 데이터베이스에 지갑 정보 저장
    await WalletModel.create({
      customer_id: customerId,
      wallet_address: wallet.address,
      encrypted_key: encryptedKey,
      kyc: customerKyc,
      uri: customerIdentificationUrl
    });

    console.log(`✅ Wallet saved to database for customer ${customerId}`);

  } catch (error) {
    console.error(`❌ Error creating wallet for customer ${customerId}:`, error.message);
    console.error(`❌ Stack trace:`, error.stack);
    
    // 구체적인 에러 정보 로깅
    if (error.code) {
      console.error(`❌ Error code: ${error.code}`);
    }
    if (error.reason) {
      console.error(`❌ Error reason: ${error.reason}`);
    }
    
    throw error;
  }
};