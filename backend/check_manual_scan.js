const db = require('./config/db');

async function check() {
  try {
    const [rows] = await db.query('DESCRIBE manual_scan_permission');
    console.log('✅ Tabel manual_scan_permission ada:');
    rows.forEach(r => console.log(' -', r.Field, r.Type, r.Null, r.Key));
  } catch(e) {
    console.error('❌ Tabel TIDAK ADA:', e.message);
    console.log('Membuat tabel...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS manual_scan_permission (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        enabled TINYINT(1) DEFAULT 1,
        granted_by INT,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES pengguna(id_user) ON DELETE CASCADE
      )
    `);
    console.log('✅ Tabel berhasil dibuat!');
  }
  process.exit(0);
}

check().catch(e => { console.error(e.message); process.exit(1); });
