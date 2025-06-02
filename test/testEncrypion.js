import { encryptKey } from '../src/utils/crypto.js';


async function main() {

    const privateKey = '0x0c9deae3121cb2fd927ba82e89147c3acf179abd5a9c3ed2525862e2ae2066b1';
    const encryptedKey = encryptKey(privateKey);
    console.log(encryptedKey);
}

main();

