const { MongoClient } = require('mongodb');
const { scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const fs = require('fs');

const scryptAsync = promisify(scrypt);

async function verify(pwd, salt, hash) {
  const derived = await scryptAsync(pwd, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

async function check() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  let uri = '';
  envContent.split('\n').forEach(line => {
    if (line.startsWith('MONGODB_URI=')) uri = line.replace('MONGODB_URI=', '').trim();
  });
  
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('cars21');
  
  const admins = await db.collection('admins').find({}).toArray();
  const vendors = await db.collection('vendors').find({}).toArray();
  
  const candidates = [
    'admin', 'superadmin', 'Meet2003', 'Admin@123', 'admin123', 'Cars21@123', 'vendor123', 'Vendor@123', 'cars21', 'password', '123456', '12345678', 'demo', 'demouser'
  ];
  
  for (const a of admins) {
    let found = null;
    for (const c of candidates) {
      if (await verify(c, a.passwordSalt, a.passwordHash)) {
        found = c;
        break;
      }
    }
    console.log(`Admin ${a.email}: ${found ? 'FOUND: ' + found : 'NOT IN CANDIDATES'}`);
  }

  for (const v of vendors) {
    let found = null;
    for (const c of candidates) {
      if (await verify(c, v.passwordSalt, v.passwordHash)) {
        found = c;
        break;
      }
    }
    console.log(`Vendor ${v.email}: ${found ? 'FOUND: ' + found : 'NOT IN CANDIDATES'}`);
  }

  await client.close();
}

check().catch(console.error);
