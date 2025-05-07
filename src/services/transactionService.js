import CoinModel from '../models/issue.js';
import WalletModel from '../models/wallet.js';
import ContractModel from '../models/contract.js';
import { decryptKey } from '../utils/crypto.js';
import { ethers } from 'hardhat';
import { parseUnits } from 'ethers';
const tokenArtifact = require("../artifacts/WoooreToken.json");
import config from '../config/env.js';

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
        const { estate_id, trade_id, buyer_id, seller_id, token_price, trade_token_amount, trade_date } = payload;
        
        const buyer_wallet = await WalletModel.findOne({ user_id: buyer_id });
        const seller_wallet = await WalletModel.findOne({ user_id: seller_id });
        const contract_id = await ContractModel.findOne({ estate_id : estate_id });
        const seller_private_key = decryptKey(seller_wallet.encrypted_key);
  
        if (!contract_id) {
            throw new Error('Contract not found');
        }
        else if (!buyer_wallet) {
            throw new Error('Buyer wallet not found');
        }
        else if (!seller_wallet) {
            throw new Error('Seller wallet not found');
        }


        const transfer = await TransferModel.create({
            trade_id,
            estate_id,
            buyer_id,
            seller_id,
            token_price,
            trade_token_amount,
            trade_date,
            status: 'PENDING'
        });

        const metadata = {
            trade_id,
            estate_id,
            buyer_id,
            seller_id,
            token_price,
            trade_date: trade_date.toISOString(),
        };

        try{
            const provider = new ethers.JsonRpcProvider(config.AMOY_RPC_URL);
            const wallet = new ethers.Wallet(seller_private_key, provider);
            const token = new ethers.Contract(contract_id, tokenArtifact.abi, wallet);

            const buyer_balance = await token.balanceOf(buyer_wallet.address);
        
            if (buyer_balance < trade_token_amount) {
                throw new Error('Insufficient balance');
            }
            
            const amount = parseUnit(trade_token_amount, 18);
            const data = ethers.encodeBytes32String(JSON.stringify(metadata));
            
            
            // #cantransfer 확인
            // if (!await token.isTransferable()) {
            //     await token.setTransferable(true);
            // }

            const tx = await token.transfer(buyer_wallet.wallet_address, trade_token_amount, data);
            await tx.wait();

            console.log(`토큰 ${amount}개를 ${buyer_wallet.wallet_address.wallet_address}에게 전송 성공`);

            await TransferModel.findByIdAndUpdate(transfer._id, {
                status: 'TRANSFERRED',
                updated_at: new Date()
            });

            return transfer;
    
        }
        catch(error){
            await TransferModel.findByIdAndUpdate(transfer._id, {
                status: 'TRANSFERRED',
                updated_at: new Date()
            });
            throw error;
        }
    } catch (error) {
        console.error('Error in processTransaction:', error);
        throw error; // 에러를 상위로 전파하여 DLQ로 보낼 수 있도록 함
    }
}