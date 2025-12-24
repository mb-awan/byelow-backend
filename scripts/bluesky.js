/* eslint-disable no-undef */
import { createHash, generateKeyPairSync } from 'crypto';
import { appendFileSync, existsSync, writeFileSync } from 'fs';
import { argv } from 'process';

// Generate RSA Key Pair
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Generate a Unique Key ID (KID)
const keyId = createHash('sha256').update(publicKey).digest('hex');

// Prepare the keys as environment variables
const envData = `
BLUESKY_PRIVATE_KEY="${privateKey.replace(/\n/g, '\\n')}"
BLUESKY_KEY_ID=${keyId}
`;

// Check if the `--save-env` flag is passed
const saveToEnv = argv.includes('--save-env');
const envFileType = argv[3];

// Function to write to .env file
const writeEnvFile = () => {
  const envFilePath = envFileType ? `.env.${envFileType}` : `.env`;

  if (!existsSync(envFilePath)) {
    writeFileSync(envFilePath, envData.trim(), { encoding: 'utf8' });
    console.log('.env file created and keys saved successfully.');
  } else {
    appendFileSync(envFilePath, '\n' + envData.trim(), { encoding: 'utf8' });
    console.log('Keys appended to the existing .env file successfully.');
  }
};

// Output to the console and save if flag is provided
if (saveToEnv) {
  writeEnvFile();
} else {
  console.log('PRIVATE_KEY=' + JSON.stringify(privateKey));
  console.log('KEY_ID=' + keyId);
  console.log('PUBLIC_KEY (for registration):\n' + publicKey);
  console.log('To save these keys directly to the .env file, rerun the script with the "--save-env" flag.');
}
