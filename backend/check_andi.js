const db = require('./config/db');
db.query("SELECT p.nama, a.status, a.waktu_datang FROM pengguna p LEFT JOIN absensi a ON p.id_user = a.user_id WHERE p.nama = 'Andi Wijaya'").then(res => {
    console.log(res[0]);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
