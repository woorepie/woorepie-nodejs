import config from '../src/config/env.js';
import mongoose from 'mongoose';
import { createWallet } from '../src/services/walletService.js';
import { encryptKey, decryptKey } from '../src/utils/crypto.js';
import WalletModel from '../src/models/wallet.js';

// 테스트 데이터
const testCustomers = [
    {
        customerId: 999991,
        customerKyc: "test-kyc-uuid-1",
        customerIdentificationUrl: "https://test.com/id1"
    },
    {
        customerId: 999992,
        customerKyc: "test-kyc-uuid-2", 
        customerIdentificationUrl: "https://test.com/id2"
    }
];

// 테스트 결과 저장
let testResults = [];

// 테스트 헬퍼 함수들
const logTest = (testName, status, message, error = null) => {
    const result = {
        test: testName,
        status,
        message,
        timestamp: new Date().toISOString(),
        error: error ? error.message : null
    };
    testResults.push(result);
    
    const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${statusIcon} ${testName}: ${message}`);
    if (error) {
        console.log(`   Error: ${error.message}`);
    }
};

// 환경 변수 검증 테스트
async function testEnvironmentVariables() {
    console.log('\n=== 환경 변수 검증 테스트 ===');
    
    const requiredVars = [
        'MONGODB_URI',
        'DEPLOYER_PRIVATE_KEY', 
        'CHAIN_REGISTRY_ADDRESS',
        'AMOY_RPC_URL',
        'ENCRYPTION_KEY'
    ];
    
    for (const varName of requiredVars) {
        if (config[varName]) {
            logTest(`Environment ${varName}`, 'PASS', `설정됨 (길이: ${config[varName].length})`);
        } else {
            logTest(`Environment ${varName}`, 'FAIL', '설정되지 않음');
        }
    }
    
    // DEPLOYER_PRIVATE_KEY 형식 검증 (0x 없이 64자리가 정상)
    // if (config.DEPLOYER_PRIVATE_KEY) {
    //     const key = config.DEPLOYER_PRIVATE_KEY;
    //     // if (!key.startsWith('0x') && key.length === 64) {
    //     //     logTest('DEPLOYER_PRIVATE_KEY 형식', 'PASS', '올바른 형식 (64자리, 0x 없음)');
    //     } else {
    //         logTest('DEPLOYER_PRIVATE_KEY 형식', 'FAIL', `잘못된 형식 (길이: ${key.length}, 0x시작: ${key.startsWith('0x')})`);
    //     }
    // }
}

// 암호화/복호화 테스트
async function testCrypto() {
    console.log('\n=== 암호화/복호화 테스트 ===');
    
    try {
        const testKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
        
        // 암호화 테스트
        const encrypted = encryptKey(testKey);
        logTest('암호화', 'PASS', `성공 (길이: ${encrypted.length})`);
        
        // 복호화 테스트
        const decrypted = decryptKey(encrypted);
        if (decrypted === testKey) {
            logTest('복호화', 'PASS', '원본과 일치');
        } else {
            logTest('복호화', 'FAIL', '원본과 불일치');
        }
        
        // 다중 암호화 테스트 (같은 입력, 다른 출력)
        const encrypted2 = encryptKey(testKey);
        if (encrypted !== encrypted2) {
            logTest('암호화 보안성', 'PASS', '같은 입력에 대해 다른 암호화 결과 생성');
        } else {
            logTest('암호화 보안성', 'WARN', '같은 입력에 대해 동일한 암호화 결과');
        }
        
    } catch (error) {
        logTest('암호화/복호화', 'FAIL', '테스트 실패', error);
    }
}

// 데이터베이스 연결 테스트
async function testDatabaseConnection() {
    console.log('\n=== 데이터베이스 연결 테스트 ===');
    
    try {
        await mongoose.connect(config.MONGODB_URI);
        logTest('MongoDB 연결', 'PASS', '연결 성공');
        
        // 기존 테스트 데이터 정리
        await WalletModel.deleteMany({ 
            customer_id: { $in: testCustomers.map(c => c.customerId) } 
        });
        logTest('테스트 데이터 정리', 'PASS', '기존 테스트 데이터 삭제 완료');
        
    } catch (error) {
        logTest('MongoDB 연결', 'FAIL', '연결 실패', error);
        throw error;
    }
}

// 지갑 생성 테스트
async function testWalletCreation() {
    console.log('\n=== 지갑 생성 테스트 ===');
    
    for (const customer of testCustomers) {
        try {
            console.log(`\n--- Customer ${customer.customerId} 테스트 시작 ---`);
            
            const startTime = Date.now();
            await createWallet(customer.customerId, customer.customerKyc, customer.customerIdentificationUrl);
            const endTime = Date.now();
            
            logTest(`지갑 생성 (${customer.customerId})`, 'PASS', `성공 (소요시간: ${endTime - startTime}ms)`);
            
            // 데이터베이스 확인
            const savedWallet = await WalletModel.findOne({ customer_id: customer.customerId });
            if (savedWallet) {
                logTest(`DB 저장 확인 (${customer.customerId})`, 'PASS', `지갑 주소: ${savedWallet.wallet_address}`);
                
                // 암호화된 키 복호화 테스트
                try {
                    const decryptedKey = decryptKey(savedWallet.encrypted_key);
                    if (decryptedKey.startsWith('0x') && decryptedKey.length === 66) {
                        logTest(`키 복호화 (${customer.customerId})`, 'PASS', '개인키 복호화 성공');
                    } else {
                        logTest(`키 복호화 (${customer.customerId})`, 'FAIL', '복호화된 키 형식 오류');
                    }
                } catch (error) {
                    logTest(`키 복호화 (${customer.customerId})`, 'FAIL', '복호화 실패', error);
                }
            } else {
                logTest(`DB 저장 확인 (${customer.customerId})`, 'FAIL', '데이터베이스에서 지갑을 찾을 수 없음');
            }
            
        } catch (error) {
            logTest(`지갑 생성 (${customer.customerId})`, 'FAIL', '지갑 생성 실패', error);
        }
    }
}

// 중복 생성 방지 테스트
async function testDuplicateHandling() {
    console.log('\n=== 중복 생성 방지 테스트 ===');
    
    const customer = testCustomers[0];
    try {
        // 이미 존재하는 customer로 다시 생성 시도
        await createWallet(customer.customerId, customer.customerKyc, customer.customerIdentificationUrl);
        logTest('중복 생성 방지', 'FAIL', '중복 생성이 허용됨');
    } catch (error) {
        if (error.message.includes('duplicate') || error.code === 11000) {
            logTest('중복 생성 방지', 'PASS', '중복 생성 차단됨');
        } else {
            logTest('중복 생성 방지', 'WARN', '예상과 다른 에러 발생', error);
        }
    }
}

// 잘못된 입력 테스트
async function testInvalidInputs() {
    console.log('\n=== 잘못된 입력 테스트 ===');
    
    const invalidTests = [
        { customerId: null, customerKyc: 'test', customerIdentificationUrl: 'test', desc: 'null customerId' },
        { customerId: '', customerKyc: 'test', customerIdentificationUrl: 'test', desc: 'empty customerId' },
        { customerId: 999999, customerKyc: null, customerIdentificationUrl: 'test', desc: 'null customerKyc' },
        { customerId: 999999, customerKyc: 'test', customerIdentificationUrl: null, desc: 'null customerIdentificationUrl' }
    ];
    
    for (const test of invalidTests) {
        try {
            await createWallet(test.customerId, test.customerKyc, test.customerIdentificationUrl);
            logTest(`잘못된 입력 (${test.desc})`, 'FAIL', '에러가 발생하지 않음');
        } catch (error) {
            logTest(`잘못된 입력 (${test.desc})`, 'PASS', '적절히 에러 처리됨');
        }
    }
}

// 테스트 결과 요약
function printTestSummary() {
    console.log('\n=== 테스트 결과 요약 ===');
    
    const passed = testResults.filter(r => r.status === 'PASS').length;
    const failed = testResults.filter(r => r.status === 'FAIL').length;
    const warned = testResults.filter(r => r.status === 'WARN').length;
    const total = testResults.length;
    
    console.log(`총 테스트: ${total}`);
    console.log(`✅ 통과: ${passed}`);
    console.log(`❌ 실패: ${failed}`);
    console.log(`⚠️  경고: ${warned}`);
    console.log(`성공률: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
        console.log('\n=== 실패한 테스트 ===');
        testResults.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`❌ ${r.test}: ${r.message}`);
            if (r.error) console.log(`   ${r.error}`);
        });
    }
}

// 메인 테스트 실행
async function runAllTests() {
    console.log('🚀 Wallet Service 테스트 시작\n');
    
    try {
        await testEnvironmentVariables();
        await testCrypto();
        await testDatabaseConnection();
        await testWalletCreation();
        await testDuplicateHandling();
        await testInvalidInputs();
        
    } catch (error) {
        console.error('테스트 실행 중 치명적 오류:', error);
    } finally {
        printTestSummary();
        
        // 정리
        await WalletModel.deleteMany({ 
            customer_id: { $in: testCustomers.map(c => c.customerId) } 
        });
        console.log('\n🧹 테스트 데이터 정리 완료');
        
        await mongoose.connection.close();
        console.log('📝 데이터베이스 연결 종료');
        
        const failed = testResults.filter(r => r.status === 'FAIL').length;
        process.exit(failed > 0 ? 1 : 0);
    }
}

// 테스트 실행
runAllTests().catch(console.error);