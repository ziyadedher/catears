#!/usr/bin/env node

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/hash-password-base64.js <password>');
  console.error('\nExample:');
  console.error('  node scripts/hash-password-base64.js "my-secure-password"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
const base64Hash = Buffer.from(hash).toString('base64');

console.log('\n✅ Password hash generated successfully!');
console.log('\nAdd this to your .env.local file:');
console.log(`AUTH_PASSWORD_HASH_BASE64=${base64Hash}`);
console.log('\nNote: Base64 encoding is used to avoid issues with $ characters in bcrypt hashes.');