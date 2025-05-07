import CoinModel from '../models/issue.js';
import WalletModel from '../models/wallet.js';
import ContractModel from '../models/contract.js';
import { ethers } from 'hardhat';
import { parseUnits } from 'ethers';
const tokenArtifact = require("../artifacts/WoooreToken.json");
import config from '../config/env.js';


/**
 * 코인을 발행하는 함수
 * @param {Object} payload - 코인 발행 데이터
 * @param {number} payload.user_id - 사용자 ID
 * @param {number} payload.estate_id - 체인 ID
 * @param {number} payload.amount - 발행할 코인 수량
 * @param {date} payload.date - 발행 일자
 * @returns {Promise<Object>} - 발행된 코인 정보
 */
export const issueCoin = async (payload) => {
  try {
    const { user_id, estate_id, amount, date } = payload;

    // 지갑 정보 조회
    const wallet = await WalletModel.findOne({ user_id });
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const contract_id = await ContractModel.findOne({ estate_id });

    if (!contract_id) {
      throw new Error('Contract not found');
    }

    // 코인 발행 기록 생성
    const coin = await CoinModel.create({
      user_id,
      estate_id,
      amount,
      date,
      status: 'PENDING'
    });

    const metadata = {
      user_id,
      estate_id,
      date: date.toISOString(),
    };
    

    try {
      // 임시로 성공했다고 가정하고 상태 업데이트
      const provider = new ethers.JsonRpcProvider(config.AMOY_RPC_URL);
      const wallet = new ethers.Wallet(config.DEPLOYER_PRIVATE_KEY, provider);
      const tokenAddress = contract_id;
      const token = new ethers.Contract(tokenAddress, tokenArtifact.abi, wallet);
      const receiver = wallet.address;

      const amount = parseUnits(amount, 18); // 10^18 단위
      const data = ethers.encodeBytes32String(JSON.stringify(metadata));
//32KB 이상 저장 시 가스비 비싸짐.

      if (!await token.isIssuable()) {
        await token.setIssuable(true);
      }

      const tx = await token.issue(receiver, amount, data);
      await tx.wait();

      console.log(`토큰 ${amount}개를 ${receiver}에게 발행 성공`);


      await CoinModel.findByIdAndUpdate(coin._id, {
        status: 'ISSUED',
        updated_at: new Date()
      });

      return coin;
    } catch (error) {
      // 블록체인 발행 실패 시 상태 업데이트
      await CoinModel.findByIdAndUpdate(coin._id, {
        status: 'FAILED',
        updated_at: new Date()
      });
      throw error;
    }
  } catch (error) {
    console.error('Error in issueCoin:', error);
    throw error;
  }
}; 