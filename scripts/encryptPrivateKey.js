import readline from 'readline';
import { encryptKey, decryptKey } from '../src/utils/crypto.js';
import config from '../src/config/env.js';

// readline 인터페이스 생성
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function main() {
    console.log('🔐 개인키 암호화 도구\n');
    
    // 환경변수 체크
    if (!config.ENCRYPTION_KEY) {
        console.log('❌ ENCRYPTION_KEY 환경변수가 설정되지 않았습니다.');
        console.log('   .env 파일에 ENCRYPTION_KEY를 추가해주세요.');
        rl.close();
        process.exit(1);
    }
    
    console.log('✅ ENCRYPTION_KEY 설정 확인됨');
    console.log(`📝 현재 환경: ${config.NODE_ENV || 'development'}\n`);

    while (true) {
        try {
            console.log('='.repeat(50));
            const choice = await askQuestion('\n선택하세요:\n1. 개인키 암호화\n2. 암호화된 키 복호화 테스트\n3. 종료\n\n입력 (1/2/3): ');
            
            if (choice === '3' || choice.toLowerCase() === 'exit') {
                console.log('\n👋 프로그램을 종료합니다.');
                break;
            }
            
            if (choice === '1') {
                await encryptPrivateKey();
            } else if (choice === '2') {
                await testDecryptKey();
            } else {
                console.log('❌ 잘못된 입력입니다. 1, 2, 또는 3을 입력해주세요.');
            }
            
        } catch (error) {
            console.error('❌ 오류 발생:', error.message);
        }
    }
    
    rl.close();
}

async function encryptPrivateKey() {
    console.log('\n--- 개인키 암호화 ---');
    
    const privateKey = await askQuestion('개인키를 입력하세요 (0x 포함 또는 제외): ');
    
    if (!privateKey || privateKey.trim() === '') {
        console.log('❌ 개인키가 입력되지 않았습니다.');
        return;
    }
    
    // 0x 접두사 정규화
    let normalizedKey = privateKey.trim();
    if (!normalizedKey.startsWith('0x')) {
        normalizedKey = '0x' + normalizedKey;
    }
    
    // 길이 검증
    if (normalizedKey.length !== 66) {
        console.log(`❌ 개인키 길이가 올바르지 않습니다. (현재: ${normalizedKey.length}, 필요: 66)`);
        return;
    }
    
    try {
        const encrypted = encryptKey(normalizedKey);
        
        console.log('\n✅ 암호화 완료!');
        console.log('='.repeat(60));
        console.log('📋 결과:');
        console.log(`입력된 개인키: ${normalizedKey}`);
        console.log(`암호화된 키:   ${encrypted}`);
        console.log('='.repeat(60));
        console.log('\n💾 이 암호화된 키를 DB에 저장하세요.');
        
    } catch (error) {
        console.log(`❌ 암호화 실패: ${error.message}`);
    }
}

async function testDecryptKey() {
    console.log('\n--- 복호화 테스트 ---');
    
    const encryptedKey = await askQuestion('암호화된 키를 입력하세요: ');
    
    if (!encryptedKey || encryptedKey.trim() === '') {
        console.log('❌ 암호화된 키가 입력되지 않았습니다.');
        return;
    }
    
    try {
        const decrypted = decryptKey(encryptedKey.trim());
        
        console.log('\n✅ 복호화 완료!');
        console.log('='.repeat(60));
        console.log('📋 결과:');
        console.log(`암호화된 키: ${encryptedKey.trim()}`);
        console.log(`복호화된 키: ${decrypted}`);
        console.log('='.repeat(60));
        
    } catch (error) {
        console.log(`❌ 복호화 실패: ${error.message}`);
        console.log('   - 암호화된 키 형식이 올바른지 확인해주세요.');
        console.log('   - ENCRYPTION_KEY가 암호화할 때와 동일한지 확인해주세요.');
    }
}

// Ctrl+C 처리
process.on('SIGINT', () => {
    console.log('\n\n👋 프로그램을 종료합니다.');
    rl.close();
    process.exit(0);
});

// 프로그램 시작
main().catch(console.error); 