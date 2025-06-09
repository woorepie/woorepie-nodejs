import { encryptKey, decryptKey } from '../src/utils/crypto.js';
import config from '../src/config/env.js';

// 테스트용 ENCRYPTION_KEY 설정

async function main() {
    const privateKey = '0x32517a8e4b6746c474290a972668d22e3656ed4627309419962001cb6e034129';
    
    console.log('Original Key:', privateKey);
    
    const encryptedKey = encryptKey(privateKey);
    console.log('Encrypted Key:', encryptedKey);
    
    const decryptedKey = decryptKey(encryptedKey);
    console.log('Decrypted Key:', decryptedKey);
    
    // 검증
    console.log('Verification:', privateKey === decryptedKey ? 'SUCCESS' : 'FAILED');
}

main().catch(console.error);

