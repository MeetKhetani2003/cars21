const { MongoClient } = require('mongodb');
const { randomBytes, scrypt } = require('node:crypto');
const { promisify } = require('node:util');
const fs = require('fs');

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(password, salt, 64);
  return { salt, hash: derived.toString('hex') };
}

async function run() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  let uri = '';
  envContent.split('\n').forEach(line => {
    if (line.startsWith('MONGODB_URI=')) uri = line.replace('MONGODB_URI=', '').trim();
  });
  
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('cars21');
  
  const adminPwd = await hashPassword('Admin@123');
  const vendorPwd = await hashPassword('Vendor@123');
  
  // Update Admins
  const adminRes = await db.collection('admins').updateMany(
    { status: 'active' },
    { $set: { passwordSalt: adminPwd.salt, passwordHash: adminPwd.hash, updatedAt: new Date() } }
  );
  console.log('Admins updated:', adminRes.modifiedCount);

  // Update Vendors
  const vendorRes = await db.collection('vendors').updateMany(
    { status: 'active' },
    { $set: { passwordSalt: vendorPwd.salt, passwordHash: vendorPwd.hash, updatedAt: new Date() } }
  );
  console.log('Vendors updated:', vendorRes.modifiedCount);

  await client.close();
}

run().catch(console.error);
