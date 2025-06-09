import { Wallet, ethers } from 'ethers';
import WalletModel from '../models/wallet.js';
import { encryptKey } from '../utils/crypto.js';
import config from '../config/env.js';
import chainRegistryArtifact from "../../artifacts/ChainRegistry.json" with { type: "json" };

export const createWallet = async (customerId, customerKyc, customerIdentificationUrl) => {
  try {
    // 1. 새 지갑 생성
    const wallet = Wallet.createRandom();
    const encryptedKey = encryptKey(wallet.privateKey);

    console.log(`Wallet created for customer ${customerId}: ${wallet.address}`);
    console.log(`Wallet private key for customer ${customerId}: ${wallet.privateKey}`);
    console.log(`Wallet mnemonic for customer ${customerId}: ${wallet.mnemonic.phrase}`);

    // 2. ChainRegistry에 KYC 등록
    const provider = new ethers.JsonRpcProvider(config.AMOY_RPC_URL);
    const adminWallet = new ethers.Wallet(config.DEPLOYER_PRIVATE_KEY, provider);
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

    // ChainRegistry에 KYC 등록 (사용자 원래 방식)
    const encoded = ethers.solidityPackedKeccak256(
      ['address', 'bytes32', 'uint256'],
      [wallet.address, verificationHash, validityPeriod]
    );
    
    const prefix = "\x19Ethereum Signed Message:\n32";
    const prefixedMessage = ethers.concat([
      ethers.toUtf8Bytes(prefix),
      ethers.getBytes(encoded)
    ]);
    
    const hash = ethers.keccak256(prefixedMessage);
    const signature = await adminWallet.signingKey.sign(hash).serialized;
    
    const tx = await chainRegistry.verifyIdentity(
      wallet.address,
      hash,
      validityPeriod,
      signature
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
    console.error(`❌ Error creating wallet for customer ${customerId}:`, error);
    throw error;
  }
};