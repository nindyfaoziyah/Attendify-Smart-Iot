const db = require('./config/db');

async function run() {
    try {
        const [jadwal] = await db.query(`
            SELECT jk.id_jadwal, jk.hari, jk.jam_mulai, jk.jam_selesai, 
                   mk.nama_mk, k.nama_kelas, jk.ruang, 
                   p.nama as nama_dosen, p.id_user as dosen_id
            FROM jadwal_kuliah jk
            JOIN mata_kuliah mk ON jk.mata_kuliah_id = mk.id_mk
            JOIN kelas k ON jk.kelas_id = k.id_kelas
            JOIN pengguna p ON jk.dosen_id = p.id_user
            WHERE k.nama_kelas = 'IF-4A'
            ORDER BY jk.jam_mulai
        `);
        console.log("=== DAFTAR JADWAL KELAS IF-4A ===");
        console.log(JSON.stringify(jadwal, null, 2));
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
