const db = require('./config/db');

async function fixDB() {
    try {
        console.log("Menghapus Taufik dari database...");
        const [taufikUsers] = await db.query("SELECT id_user FROM pengguna WHERE nama LIKE '%Taufik%'");
        for (const u of taufikUsers) {
            await db.query("DELETE FROM absensi WHERE user_id = ?", [u.id_user]);
            await db.query("DELETE FROM face_profiles WHERE user_id = ?", [u.id_user]);
            await db.query("DELETE FROM mahasiswa_kelas WHERE mahasiswa_id = ?", [u.id_user]);
            await db.query("DELETE FROM notifikasi WHERE user_id = ?", [u.id_user]);
            await db.query("DELETE FROM pengguna WHERE id_user = ?", [u.id_user]);
        }
        console.log("Taufik berhasil dihapus.");

        console.log("Menghapus absensi hari ini untuk Faoziyah, Imas, dan Puput agar siap demo...");
        const names = ['Faoziyah', 'Imas', 'Puput'];
        for (const name of names) {
            const [users] = await db.query("SELECT id_user FROM pengguna WHERE nama LIKE ?", [`%${name}%`]);
            for (const user of users) {
                await db.query("DELETE FROM absensi WHERE user_id = ? AND DATE(tanggal) = CURDATE()", [user.id_user]);
            }
        }
        console.log("Data absensi untuk demo berhasil dikosongkan.");

        // Fix empty strings in absensi status
        await db.query("UPDATE absensi SET status = 'BELUM HADIR' WHERE status = '' OR status IS NULL");

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixDB();
