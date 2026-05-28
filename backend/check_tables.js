const db = require('./config/db');
async function check() {
  try {
    const [rows] = await db.query("SHOW TABLES LIKE 'face_training_logs'");
    console.log("face_training_logs exists:", rows.length > 0);
  } catch(e) { console.error(e.message); }
  process.exit();
}
check();
