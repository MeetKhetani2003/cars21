async function testLogin(role, identifier, email, password) {
  const body = role === 'superadmin' ? { role, identifier, password } : { role, email, password };
  const res = await fetch('http://localhost:3000/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  console.log(`[${role.toUpperCase()}] status: ${res.status}`, data);
}

async function run() {
  await testLogin('superadmin', 'superadmin', undefined, 'superadmin');
  await testLogin('admin', undefined, 'hello@mkdigitalnexus.in', 'Admin@123');
  await testLogin('vendor', undefined, 'cars21.demo.mumbai@example.com', 'Vendor@123');
}

run().catch(console.error);
