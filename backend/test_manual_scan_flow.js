const http = require('http');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost', port: 5000, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function test() {
  // 1. Login sebagai dosen (nindykrw@gmail.com)
  console.log('\n=== 1. Login Dosen ===');
  const dosenLogin = await request('POST', '/api/login', { email: 'nindykrw@gmail.com', password: 'password123' });
  console.log('Status:', dosenLogin.status);
  const dosenToken = dosenLogin.data?.data?.token;
  console.log('Token:', dosenToken ? '✅ Dapat' : '❌ Gagal');

  if (!dosenToken) { console.error('Dosen login gagal'); process.exit(1); }

  // 2. Login sebagai mahasiswa (puput@gmail.com, id=18)
  console.log('\n=== 2. Login Mahasiswa ===');
  const mhsLogin = await request('POST', '/api/login', { email: 'puput@gmail.com', password: 'password123' });
  console.log('Status:', mhsLogin.status);
  const mhsToken = mhsLogin.data?.data?.token;
  const mhsId = mhsLogin.data?.data?.user?.id;
  console.log('Token:', mhsToken ? '✅ Dapat' : '❌ Gagal', '| ID:', mhsId);

  // 3. Cek permission mahasiswa SEBELUM diberi izin
  console.log('\n=== 3. Cek Permission Mahasiswa (sebelum) ===');
  const before = await request('GET', '/api/manual-scan/permission', null, mhsToken);
  console.log('Status:', before.status, '| Permission:', before.data?.data?.enabled ? '✅ AKTIF' : '❌ BELUM ADA');

  // 4. Dosen memberi izin scan manual ke mahasiswa
  console.log('\n=== 4. Dosen Beri Izin ke Mahasiswa ID', mhsId, '===');
  const grant = await request('POST', '/api/manual-scan/allow', { user_id: mhsId }, dosenToken);
  console.log('Status:', grant.status, '|', grant.data?.status, '-', grant.data?.message);

  // 5. Cek permission mahasiswa SETELAH diberi izin
  console.log('\n=== 5. Cek Permission Mahasiswa (sesudah) ===');
  const after = await request('GET', '/api/manual-scan/permission', null, mhsToken);
  console.log('Status:', after.status, '| Permission:', after.data?.data?.enabled ? '✅ AKTIF' : '❌ MASIH TIDAK ADA');
  console.log('Expires:', after.data?.data?.expires_at);
  console.log('Minutes left:', after.data?.data?.minutes_left);

  console.log('\n=== RESULT ===');
  if (after.data?.data?.enabled) {
    console.log('✅ FLOW BERHASIL! Dosen beri izin → Mahasiswa bisa scan manual');
  } else {
    console.log('❌ Flow GAGAL - permission tidak aktif setelah diberi izin');
  }

  process.exit(0);
}

test().catch(e => { console.error('Error:', e.message); process.exit(1); });
