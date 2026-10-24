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
  
  console.log('Admins count:', admins.length);
  admins.forEach(a => {
    console.log(`Admin: ${a.email} | id: ${a.id} | hasSalt: ${Boolean(a.passwordSalt)} | hasHash: ${Boolean(a.passwordHash)}`);
  });

  console.log('Vendors count:', vendors.length);
  vendors.forEach(v => {
    console.log(`Vendor: ${v.email} | id: ${v.id} | hasSalt: ${Boolean(v.passwordSalt)} | hasHash: ${Boolean(v.passwordHash)}`);
  });
  
  await client.close();
}

check().catch(console.error);
