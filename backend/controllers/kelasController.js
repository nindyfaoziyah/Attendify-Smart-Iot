const db = require('../config/db');

exports.getAllKelas = async (req, res) => {
    try {

        const [kelas] = await db.query(
            'SELECT * FROM kelas ORDER BY nama_kelas ASC'
        );

        res.json({
            status: 'success',
            data: kelas,
        });

    } catch (err) {

        res.status(500).json({
            status: 'error',
            message: err.message,
        });
    }
};

exports.getKelasById = async (req, res) => {
    try {

        const { id } = req.params;

        const [kelas] = await db.query(
            'SELECT * FROM kelas WHERE id_kelas = ?',
            [id]
        );

        if (kelas.length === 0) {

            return res.status(404).json({
                status: 'error',
                message: 'Kelas not found',
            });
        }

        res.json({
            status: 'success',
            data: kelas[0],
        });

    } catch (err) {

        res.status(500).json({
            status: 'error',
            message: err.message,
        });
    }
};

// ========================================
// GET MAHASISWA BERDASARKAN KELAS
// ========================================

exports.getMahasiswaByKelas = async (req, res) => {

    try {

        const { id } = req.params;

        const [rows] = await db.query(
            `
            SELECT 
                pengguna.id_user,
                pengguna.nama,
                CASE 
                    WHEN msp.enabled = 1 AND (msp.expires_at IS NULL OR msp.expires_at > NOW()) THEN 1 
                    ELSE 0 
                END AS scanPermission
            FROM mahasiswa_kelas
            JOIN pengguna ON mahasiswa_kelas.mahasiswa_id = pengguna.id_user
            LEFT JOIN manual_scan_permission msp ON pengguna.id_user = msp.user_id
            WHERE mahasiswa_kelas.kelas_id = ?
            `,
            [id]
        );

        res.json({
            success: true,
            students: rows,
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: 'Gagal mengambil mahasiswa',
            error: error.message
        });
    }
};