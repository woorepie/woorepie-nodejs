import { createWallet } from './walletService.js';

/**
 * 트랜잭션을 처리하는 함수
 * @param {Object} payload - 트랜잭션 데이터
 * @param {string} payload.user_id - 사용자 ID
 * @param {string} payload.transaction_type - 트랜잭션 타입 (예: 'DEPOSIT', 'WITHDRAWAL')
 * @param {number} payload.amount - 거래 금액
 * @returns {Promise<void>}
 */
export async function processTransaction(payload) {
    try {
        const { user_id, transaction_type, amount } = payload;
        
        // 트랜잭션 타입에 따른 처리
        switch (transaction_type) {
            case 'DEPOSIT':
                await WalletService.deposit(user_id, amount);
                break;
            case 'WITHDRAWAL':
                await WalletService.withdraw(user_id, amount);
                break;
            default:
                throw new Error(`Unknown transaction type: ${transaction_type}`);
        }
        
        // 여기에 추가적인 트랜잭션 로깅이나 후처리 로직을 추가할 수 있습니다.
        
    } catch (error) {
        console.error('Error in processTransaction:', error);
        throw error; // 에러를 상위로 전파하여 DLQ로 보낼 수 있도록 함
    }
}