const db = require('./config/db');

async function run() {
    try {
        const [schema] = await db.query("DESCRIBE pengguna");
        console.log("=== SCHEMA TABEL PENGGUNA ===");
        console.log(JSON.stringify(schema, null, 2));

        const [rows] = await db.query("SELECT id_user, nama, email, role FROM pengguna");
        console.log("\n=== DAFTAR PENGGUNA ===");
        console.log(JSON.stringify(rows, null, 2));
        
        const [mahasiswaKelas] = await db.query(`
            SELECT mk.id, mk.kelas_id, k.nama_kelas, p.id_user, p.nama 
            FROM mahasiswa_kelas mk
            JOIN pengguna p ON mk.mahasiswa_id = p.id_user
            JOIN kelas k ON mk.kelas_id = k.id_kelas
        `);
        console.log("\n=== DAFTAR MAHASISWA DI KELAS ===");
        console.log(JSON.stringify(mahasiswaKelas, null, 2));
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
