// src/utils/crypto.js
import crypto from 'crypto';
import config from '../config/env.js';


export const encryptKey = (privateKey) => {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
};

export const decryptKey = (encryptedKey) => {
  try {
    // iv와 encrypted 데이터 분리
    const parts = encryptedKey.split(':');
    const [ivHex, encrypted] = parts;

    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
    
    // IV를 Buffer로 변환
    let iv = Buffer.from(ivHex, 'hex');


    // 복호화 시도
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    throw new Error('Failed to decrypt key: ' + error.message);
  }
};

