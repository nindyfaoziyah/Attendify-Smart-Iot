const db = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * Get all students
 */
exports.getAllStudents = async (req, res) => {
    try {
        // JOIN ke tabel kelas untuk mendapat prodi & nama_kelas
        const [students] = await db.query(`
            SELECT 
                p.id_user as id, 
                p.nama as name, 
                p.email, 
                p.username as nim,
                p.role,
                p.is_face_verified,
                p.status,
                COALESCE(k.prodi, '-') as prodi,
                COALESCE(k.nama_kelas, '-') as kelas,
                COALESCE(
                    (SELECT COUNT(*) FROM face_profiles fp WHERE fp.user_id = p.id_user),
                    0
                ) as face_samples_count,
                CASE WHEN p.is_face_verified = 1 THEN 'trained' ELSE 'pending' END as ai_status,
                CASE WHEN p.status = 'Y' THEN 'linked' ELSE 'unlinked' END as esp32_status
            FROM pengguna p
            LEFT JOIN mahasiswa_kelas mk ON mk.mahasiswa_id = p.id_user
            LEFT JOIN kelas k ON k.id_kelas = mk.kelas_id
            WHERE p.role = 'mahasiswa'
            ORDER BY p.nama ASC
        `);

        // Key 'students' agar sesuai dengan frontend: setStudents(data.students || [])
        res.json({ status: 'success', students: students });
    } catch (err) {
        console.error("Error Get Students:", err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};

/**
 * Create a new student (Register)
 */
exports.createStudent = async (req, res) => {
    const { name, nim, email, password, prodi, kelas } = req.body;

    // FIX 400: Beri nilai default jika dari frontend email/password tidak diisi
    const finalEmail = email || `${nim}@mahasiswa.com`;
    const finalPassword = password || nim; // Password otomatis menggunakan NIM

    if (!name || !nim) {
        return res.status(400).json({ status: 'error', message: 'Nama dan NIM wajib diisi!' });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // 1. Cek apakah NIM sudah ada
        const [existing] = await connection.query('SELECT id_user FROM pengguna WHERE username = ?', [nim]);
        if (existing.length > 0) {
            await connection.rollback();
            return res.status(400).json({ status: 'error', message: 'NIM ini sudah terdaftar!' });
        }

        // 2. Hash password
        const hashedPassword = await bcrypt.hash(finalPassword, 10);

        // 3. Insert ke tabel pengguna (status awal 'N' dan belum terverifikasi wajah)
        const [userResult] = await connection.query(
            "INSERT INTO pengguna (nama, username, email, password, role, status, is_face_verified) VALUES (?, ?, ?, ?, 'mahasiswa', 'N', 0)",
            [name, nim, finalEmail, hashedPassword]
        );

        const userId = userResult.insertId;

        // 4. Handle Kelas & Prodi (Dibungkus try-catch agar kalau tabelnya belum ada, tidak jadi Error 500)
        try {
            if (kelas || prodi) {
                let classId;
                const [classRows] = await connection.query('SELECT id_kelas FROM kelas WHERE nama_kelas = ?', [kelas]);
                
                if (classRows.length > 0) {
                    classId = classRows[0].id_kelas;
                } else {
                    const [newClass] = await connection.query(
                        'INSERT INTO kelas (nama_kelas, prodi) VALUES (?, ?)',
                        [kelas, prodi || '-']
                    );
                    classId = newClass.insertId;
                }

                await connection.query(
                    'INSERT INTO mahasiswa_kelas (mahasiswa_id, kelas_id) VALUES (?, ?)',
                    [userId, classId]
                );
            }
        } catch (kelasError) {
            console.log("Info: Tabel kelas/mahasiswa_kelas diabaikan sementara.");
        }

        await connection.commit();
        res.status(201).json({ status: 'success', message: 'Mahasiswa berhasil ditambahkan', userId });

    } catch (err) {
        await connection.rollback();
        console.error("Error Create Student:", err);
        res.status(500).json({ status: 'error', message: err.message });
    } finally {
        connection.release();
    }
};

/**
 * Update student info
 */
exports.updateStudent = async (req, res) => {
    const { id } = req.params;
    const { name, nim, email, prodi, kelas, password } = req.body;

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        let updateQuery = 'UPDATE pengguna SET nama = ?, username = ?, email = ?';
        let queryParams = [name, nim, email];

        if (password && password.trim() !== '') {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery += ', password = ?';
            queryParams.push(hashedPassword);
        }

        updateQuery += ' WHERE id_user = ?';
        queryParams.push(id);

        await connection.query(updateQuery, queryParams);

        // Handle Kelas & Prodi
        try {
            if (kelas || prodi) {
                let classId;
                const [classRows] = await connection.query('SELECT id_kelas FROM kelas WHERE nama_kelas = ?', [kelas]);
                
                if (classRows.length > 0) {
                    classId = classRows[0].id_kelas;
                } else {
                    const [newClass] = await connection.query(
                        'INSERT INTO kelas (nama_kelas, prodi) VALUES (?, ?)',
                        [kelas, prodi || '-']
                    );
                    classId = newClass.insertId;
                }

                // Check if mapping exists
                const [mappingRows] = await connection.query('SELECT * FROM mahasiswa_kelas WHERE mahasiswa_id = ?', [id]);
                if (mappingRows.length > 0) {
                    await connection.query(
                        'UPDATE mahasiswa_kelas SET kelas_id = ? WHERE mahasiswa_id = ?',
                        [classId, id]
                    );
                } else {
                    await connection.query(
                        'INSERT INTO mahasiswa_kelas (mahasiswa_id, kelas_id) VALUES (?, ?)',
                        [id, classId]
                    );
                }
            }
        } catch (kelasError) {
            console.log("Info: Tabel kelas/mahasiswa_kelas diabaikan sementara.");
        }

        await connection.commit();
        res.json({ status: 'success', message: 'Data mahasiswa berhasil diperbarui' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ status: 'error', message: err.message });
    } finally {
        connection.release();
    }
};

/**
 * Delete student
 */
exports.deleteStudent = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // Hapus data terkait sebelum menghapus pengguna untuk menghindari foreign key constraint error
        await connection.query('DELETE FROM mahasiswa_kelas WHERE mahasiswa_id = ?', [id]);
        await connection.query('DELETE FROM face_profiles WHERE user_id = ?', [id]);
        await connection.query('DELETE FROM face_training_logs WHERE user_id = ?', [id]);
        await connection.query('DELETE FROM manual_scan_permission WHERE user_id = ?', [id]);
        await connection.query('DELETE FROM absensi WHERE user_id = ?', [id]);
        await connection.query('DELETE FROM notifications WHERE receiver_user_id = ? OR sender_user_id = ?', [id, id]);

        // Hapus dari tabel pengguna
        await connection.query('DELETE FROM pengguna WHERE id_user = ?', [id]);

        await connection.commit();
        res.json({ status: 'success', message: 'Mahasiswa berhasil dihapus' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ status: 'error', message: err.message });
    } finally {
        connection.release();
    }
};