const db = require('./config/db');

async function seedDummyData() {
    try {
        console.log("Mulai generate data dummy absensi untuk hari ini...");

        // 1. Ambil semua jadwal
        const [jadwals] = await db.query('SELECT id_jadwal, kelas_id FROM jadwal_kuliah');
        if (jadwals.length === 0) {
            console.log("Tidak ada jadwal kelas.");
            process.exit(0);
        }

        let insertedCount = 0;

        for (const jadwal of jadwals) {
            // 2. Ambil semua mahasiswa di kelas jadwal tersebut
            const [students] = await db.query('SELECT mahasiswa_id FROM mahasiswa_kelas WHERE kelas_id = ?', [jadwal.kelas_id]);
            
            for (const student of students) {
                // 3. Cek apakah sudah absen hari ini
                const [existing] = await db.query(
                    'SELECT id_absensi FROM absensi WHERE user_id = ? AND jadwal_id = ? AND DATE(tanggal) = CURDATE()',
                    [student.mahasiswa_id, jadwal.id_jadwal]
                );

                if (existing.length === 0) {
                    // Berikan status random
                    const statuses = ['hadir', 'hadir', 'hadir', 'terlambat', 'izin', 'alfa'];
                    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

                    // Generate waktu random (antara jam 07:00 s.d 10:00)
                    const hour = Math.floor(Math.random() * 3) + 7;
                    const minute = Math.floor(Math.random() * 60);
                    const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;

                    await db.query(
                        'INSERT INTO absensi (user_id, jadwal_id, tanggal, waktu_datang, status) VALUES (?, ?, NOW(), ?, ?)',
                        [student.mahasiswa_id, jadwal.id_jadwal, time, randomStatus]
                    );
                    insertedCount++;
                }
            }
        }

        console.log(`Selesai! ${insertedCount} data absensi dummy berhasil ditambahkan.`);
        process.exit(0);
    } catch (err) {
        console.error("Error generating dummy data:", err);
        process.exit(1);
    }
}

seedDummyData();
