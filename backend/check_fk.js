const db = require('./config/db');
async function check() {
  try {
    const conn = await db.getConnection();
    const [fk] = await conn.query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_NAME = 'pengguna' AND TABLE_SCHEMA = 'db_absensi'");
    console.log(fk);
    conn.release();
  } catch(e) {
    console.error(e)
  }
  process.exit();
}
check();
