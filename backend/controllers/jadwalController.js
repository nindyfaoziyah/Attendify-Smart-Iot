const db = require('../config/db');

exports.getAllJadwal = async (req, res) => {

    try {

        const { dosen_id, hari } = req.query;

        let query = `
            SELECT 
                jadwal_kuliah.id_jadwal AS id,

                jadwal_kuliah.hari,

                jadwal_kuliah.jam_mulai,

                jadwal_kuliah.jam_selesai,

                jadwal_kuliah.ruang,

                pengguna.nama AS dosen_name,

                mata_kuliah.nama_mk AS subject,

                kelas.nama_kelas AS class_name,

                kelas.id_kelas AS kelas_id,

                (
                    SELECT COUNT(*)
                    FROM absensi
                    WHERE absensi.jadwal_id = jadwal_kuliah.id_jadwal
                    AND absensi.status = 'hadir'
                ) AS attended_count,

                (
                    SELECT COUNT(*)
                    FROM mahasiswa_kelas
                    WHERE mahasiswa_kelas.kelas_id = jadwal_kuliah.kelas_id
                ) AS total_students

            FROM jadwal_kuliah

            JOIN pengguna
            ON pengguna.id_user = jadwal_kuliah.dosen_id

            JOIN mata_kuliah
            ON mata_kuliah.id_mk = jadwal_kuliah.mata_kuliah_id

            JOIN kelas
            ON kelas.id_kelas = jadwal_kuliah.kelas_id
        `;

        let params = [];

        let whereClauses = [];

        // FILTER BERDASARKAN DOSEN LOGIN
        if (dosen_id) {
            whereClauses.push('jadwal_kuliah.dosen_id = ?');
            params.push(dosen_id);
        }

        // FILTER BERDASARKAN HARI
        if (hari) {
            whereClauses.push('jadwal_kuliah.hari = ?');
            params.push(hari.toLowerCase());
        }

        if (whereClauses.length > 0) {
            query += '\n            WHERE ' + whereClauses.join(' AND ');
        }

        query += `
            ORDER BY 
            jadwal_kuliah.hari ASC,
            jadwal_kuliah.jam_mulai ASC
        `;

        const [rows] =
            await db.query(query, params);

        res.json({
            status: 'success',
            data: rows,
        });

    } catch (error) {

        console.log('ERROR JADWAL:', error);

        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
};

exports.createJadwal = async (req, res) => {
    try {
        const { dosen_id, mata_kuliah_id, kelas_id, hari, jam_mulai, jam_selesai, ruang } = req.body;
        
        if (!dosen_id || !mata_kuliah_id || !kelas_id || !hari || !jam_mulai || !jam_selesai) {
            return res.status(400).json({ status: 'error', message: 'Semua field (dosen, matkul, kelas, hari, jam) wajib diisi.' });
        }

        const [result] = await db.query(
            'INSERT INTO jadwal_kuliah (dosen_id, mata_kuliah_id, kelas_id, hari, jam_mulai, jam_selesai, ruang) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [dosen_id, mata_kuliah_id, kelas_id, hari, jam_mulai, jam_selesai, ruang || 'Ruang Dummy']
        );

        res.json({ status: 'success', message: 'Jadwal berhasil ditambahkan', data: { insertId: result.insertId } });
    } catch (error) {
        console.error('Error create jadwal:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};