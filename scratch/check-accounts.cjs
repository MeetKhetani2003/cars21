const { MongoClient } = require('mongodb');
const fs = require('fs');

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
  
  console.log('--- ADMINS ---');
  admins.forEach(a => console.log({ id: a.id, name: a.name, email: a.email, status: a.status, initialPassword: a.initialPassword || null }));
  
  console.log('--- VENDORS ---');
  vendors.forEach(v => console.log({ id: v.id, name: v.name, businessName: v.businessName, email: v.email, status: v.status, initialPassword: v.initialPassword || null }));
  
  await client.close();
}

check().catch(console.error);
