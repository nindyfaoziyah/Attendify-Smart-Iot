const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function createAccount() {
  try {
    const passwordHash = await bcrypt.hash('aku123', 10);
    const email = 'aku@gmail.com';
    const nim = '99999999';
    
    // Check if exists
    const [exist] = await db.query('SELECT * FROM pengguna WHERE email = ?', [email]);
    if (exist.length > 0) {
      await db.query('DELETE FROM pengguna WHERE email = ?', [email]);
      await db.query('DELETE FROM mahasiswa_kelas WHERE mahasiswa_id = ?', [exist[0].id_user]);
    }

    const [result] = await db.query(
      "INSERT INTO pengguna (nama, email, username, password, role, status, is_face_verified) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ['Aku (Test User)', email, nim, passwordHash, 'mahasiswa', 'Y', 0]
    );
    
    const userId = result.insertId;
    
    // Assign to Kelas 1
    await db.query(
      "INSERT INTO mahasiswa_kelas (mahasiswa_id, kelas_id) VALUES (?, ?)",
      [userId, 1]
    );

    console.log('Account created! Email: aku@gmail.com | Pass: aku123');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
createAccount();
