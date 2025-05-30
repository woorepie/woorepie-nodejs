import CoinModel from '../models/issue.js';
import WalletModel from '../models/wallet.js';
import ContractModel from '../models/contract.js';
import { decryptKey } from '../utils/crypto.js';
import { ethers } from 'ethers';
import { parseUnits } from 'ethers';
import config from '../config/env.js';
import tokenArtifact from "../../artifacts/WooreToken.json" with { type: "json" };
import TransferModel from '../models/transfer.js';
import { keccak256, toUtf8Bytes } from 'ethers';
/*
	estate_id : ???,
	trade_id : ???,
	seller_id : ???,
	buyer_id : ???,
	token_price : ???,
	trade_token_amount : ???,
	trade_date : ???

*/

/**
 * 트랜잭션을 처리하는 함수
 * @param {Object} payload - 트랜잭션 데이터
 * @param {number} payload.estate_id - 매물 ID
 * @param {number} payload.trade_id - 거래 ID
 * @param {number} payload.buyer_id - 사용자 ID
 * @param {number} payload.seller_id - 사용자 ID
 * @param {number} payload.token_price - 토큰 가격
 * @param {number} payload.trade_token_amount - 거래 수량
 * @param {date} payload.trade_date - 거래 일자
* @returns {Promise<void>}
 */
export async function processTransaction(payload) {
    try {
        const { estateId, tradeId, buyerId, sellerId, tokenPrice, tradeTokenAmount, tradeDate } = payload;
        
        const buyer_wallet = await WalletModel.findOne({ customer_id: buyerId });
        const seller_wallet = await WalletModel.findOne({ customer_id: sellerId });
        const contract = await ContractModel.findOne({ estate_id : estateId });
        
        console.log('Found wallets:', {
            buyer_wallet: buyer_wallet ? {
                customer_id: buyer_wallet.customer_id,
                wallet_address: buyer_wallet.wallet_address
            } : null,
            seller_wallet: seller_wallet ? {
                customer_id: seller_wallet.customer_id,
                wallet_address: seller_wallet.wallet_address
            } : null
        });

        if (!contract) {
            throw new Error('Contract not found');
        }
        else if (!buyer_wallet) {
            throw new Error('Buyer wallet not found');
        }
        else if (!seller_wallet) {
            throw new Error('Seller wallet not found');
        }
        else if (!buyer_wallet.wallet_address) {
            throw new Error('Buyer wallet address not found');
        }
        else if (!seller_wallet.wallet_address) {
            throw new Error('Seller wallet address not found');
        }

        const seller_private_key = decryptKey(seller_wallet.encrypted_key);
  
        const transfer = await TransferModel.create({
            tradeId,
            estateId,
            buyerId,
            sellerId,
            tokenPrice,
            tradeTokenAmount,
            tradeDate: new Date(tradeDate),
            status: 'PENDING'
        });

        const metadata = {
            tradeId,
            estateId,
            buyerId,
            sellerId,
            tokenPrice,
            tradeDate: new Date(tradeDate).toISOString(),
        };

        try {
            console.log('process.env.AMOY_RPC_URL', process.env.AMOY_RPC_URL);
            const provider = new ethers.JsonRpcProvider(process.env.AMOY_RPC_URL);
            const wallet = new ethers.Wallet(seller_private_key, provider);
            const token = new ethers.Contract(contract.contract_address, tokenArtifact.abi, wallet);

            const buyer_balance = await token.balanceOf(buyer_wallet.wallet_address);
            console.log('buyer_balance:', buyer_balance.toString());
        
            if (buyer_balance < tradeTokenAmount) {
                throw new Error('구매자의 토큰 잔액이 부족합니다.');
            }
            
            const amount = parseUnits(tradeTokenAmount.toString(), 18);
            const dataString = JSON.stringify(metadata);
            const byteLength = Buffer.byteLength(dataString, 'utf8');
            console.log('dataString:', dataString, '| byteLength:', byteLength);
            const hash = keccak256(toUtf8Bytes(dataString));
            console.log('metadata hash:', hash);
            const data = hash;
            
            // #cantransfer 확인
            // if (!await token.isTransferable()) {
            //     await token.setTransferable(true);
            // }

            const tx = await token.transferWithData(buyer_wallet.wallet_address, tradeTokenAmount, data);
            await tx.wait();

            console.log(`토큰 ${amount}개를 ${buyer_wallet.wallet_address}에게 전송 성공`);

            await TransferModel.findByIdAndUpdate(transfer._id, {
                status: 'TRANSFERRED',
                updated_at: new Date()
            });

            return transfer;
    
        } catch(error) {
            console.error('토큰 전송 중 오류 발생:', error.message);
            await TransferModel.findByIdAndUpdate(transfer._id, {
                status: 'FAILED',
                updated_at: new Date()
            });
            throw error;
        }
    } catch (error) {
        console.error('트랜잭션 처리 중 오류 발생:', error.message);
        throw error; // 에러를 상위로 전파하여 DLQ로 보낼 수 있도록 함
    }
}