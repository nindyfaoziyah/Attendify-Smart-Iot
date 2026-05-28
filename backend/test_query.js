const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'db_absensi' });
  const [rows] = await c.query("SELECT id_user, nama, username, role, is_face_verified FROM pengguna WHERE role = 'mahasiswa'");
  console.log(rows);
  c.end();
})();
