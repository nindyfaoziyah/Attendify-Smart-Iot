const db = require('./config/db');
async function check() {
  const [rows] = await db.query("SELECT * FROM pengguna WHERE username='123456789987' OR email='nindykrw@gmail.com'");
  console.log("Found:", rows.length);
  process.exit();
}
check();
