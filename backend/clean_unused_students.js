const db = require('./config/db');

async function run() {
    try {
        console.log("🧹 Memulai pembersihan mahasiswa kelas IF-4A...");
        
        // Hapus mahasiswa dari kelas 1 (IF-4A) kecuali id_user 7 (Lestari Putri) dan 18 (Puput Destia)
        const [result] = await db.query(`
            DELETE FROM mahasiswa_kelas 
            WHERE kelas_id = 1 
            AND mahasiswa_id NOT IN (7, 18)
        `);
        
        console.log(`✅ Berhasil menghapus ${result.affectedRows} pemetaan mahasiswa tidak terpakai dari kelas IF-4A!`);
        
        // Tampilkan daftar terupdate
        const [mahasiswaKelas] = await db.query(`
            SELECT mk.id, mk.kelas_id, k.nama_kelas, p.id_user, p.nama 
            FROM mahasiswa_kelas mk
            JOIN pengguna p ON mk.mahasiswa_id = p.id_user
            JOIN kelas k ON mk.kelas_id = k.id_kelas
            WHERE mk.kelas_id = 1
        `);
        console.log("\n=== DAFTAR MAHASISWA KELAS IF-4A SEKARANG ===");
        console.log(JSON.stringify(mahasiswaKelas, null, 2));
        
        process.exit(0);
    } catch (e) {
        console.error("❌ Gagal membersihkan database:", e);
        process.exit(1);
    }
}

run();
