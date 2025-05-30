import CoinModel from '../models/issue.js';
import WalletModel from '../models/wallet.js';
import ContractModel from '../models/contract.js';
import { ethers } from 'ethers';
import { parseUnits } from 'ethers';
import tokenArtifact from "../../artifacts/WooreToken.json" with { type: "json" };
import config from '../config/env.js';
import { keccak256, toUtf8Bytes } from 'ethers';


/**
 * 코인을 발행하는 함수
 * @param {Object} payload - 코인 발행 데이터
 * @param {number} payload.customer_id - 사용자 ID
 * @param {number} payload.estate_id - 체인 ID
 * @param {number} payload.amount - 발행할 코인 수량
 * @param {date} payload.date - 발행 일자
 * @param {number} payload.token_price - 코인 가격
 * @returns {Promise<Object>} - 발행된 코인 정보
 */
export const issueCoin = async (payload) => {
  try {
    const { customer_id, estate_id, amount, date, token_price } = payload;

    // 지갑 정보 조회
    const issueWallet = await WalletModel.findOne({ customer_id });
    if (!issueWallet) {
      throw new Error('Wallet not found');
    }

    const contractDoc = await ContractModel.findOne({ estate_id });
    if (!contractDoc) {
      throw new Error('Contract not found');
    }
    const tokenAddress = contractDoc.contract_address;

    // 코인 발행 기록 생성
    const coin = await CoinModel.create({
      customer_id,
      estate_id,
      amount,
      date,
      token_price,
      status: 'PENDING'
    });

    const metadata = {
      customer_id,
      estate_id,
      token_price,
      date: date.toISOString(),
    };
    

    try {
      const provider = new ethers.JsonRpcProvider(process.env.AMOY_RPC_URL);
      const privateKey = process.env.PRIVATE_KEY;
      const wallet = new ethers.Wallet(privateKey, provider);
      const token = new ethers.Contract(tokenAddress, tokenArtifact.abi, wallet);
      const receiver = issueWallet.wallet_address;

      const amountParsed = parseUnits(String(amount), 18); // 10^18 단위
      const dataString = JSON.stringify(metadata);
      const byteLength = Buffer.byteLength(dataString, 'utf8');
      console.log('dataString:', dataString, '| byteLength:', byteLength);
      const hash = keccak256(toUtf8Bytes(dataString));
      console.log('metadata hash:', hash);
      const data = hash;
//32KB 이상 저장 시 가스비 비싸짐.

      if (!await token.isIssuable()) {
        await token.setIssuable(true);
      }

      const tx = await token.issue(receiver, amountParsed, data);
      await tx.wait();

      console.log(`토큰 ${amountParsed}개를 ${receiver}에게 발행 성공`);

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