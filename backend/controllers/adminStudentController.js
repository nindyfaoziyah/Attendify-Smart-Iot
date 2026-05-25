const db = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * Get all students with their class and prodi info
 */
exports.getAllStudents = async (req, res) => {
    try {
        const [students] = await db.query(`
            SELECT 
                p.id_user as id, 
                p.nama as name, 
                p.email, 
                p.username as nim,
                p.role,
                p.is_face_verified,
                k.nama_kelas as kelas,
                k.prodi,
                mk.kelas_id,
                fp.verification_status as biometric_status,
                fp.face_image,
                fp.confidence_score,
                fp.registered_at,
                fp.last_trained
            FROM pengguna p
            LEFT JOIN mahasiswa_kelas mk ON p.id_user = mk.mahasiswa_id
            LEFT JOIN kelas k ON mk.kelas_id = k.id_kelas
            LEFT JOIN face_profiles fp ON p.id_user = fp.user_id
            WHERE p.role = 'mahasiswa'
            ORDER BY p.nama ASC
        `);

        res.json({ status: 'success', data: students });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

/**
 * Create a new student
 */
exports.createStudent = async (req, res) => {
    const { name, nim, email, password, prodi, kelas } = req.body;

    if (!name || !nim || !email || !password) {
        return res.status(400).json({ status: 'error', message: 'Lengkapi data wajib (Nama, NIM, Email, Password)' });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // 1. Check if user already exists
        const [existing] = await connection.query('SELECT id_user FROM pengguna WHERE username = ? OR email = ?', [nim, email]);
        if (existing.length > 0) {
            await connection.rollback();
            return res.status(400).json({ status: 'error', message: 'NIM atau Email sudah terdaftar' });
        }

        // 2. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Insert into pengguna
        const [userResult] = await connection.query(
            'INSERT INTO pengguna (nama, username, email, password, role, status) VALUES (?, ?, ?, ?, \'mahasiswa\', \'Y\')',
            [name, nim, email, hashedPassword]
        );

        const userId = userResult.insertId;

        // 4. Handle Kelas & Prodi (Link to kelas table)
        if (kelas || prodi) {
            // Find or create class
            let classId;
            const [classRows] = await connection.query('SELECT id_kelas FROM kelas WHERE nama_kelas = ?', [kelas]);
            
            if (classRows.length > 0) {
                classId = classRows[0].id_kelas;
            } else {
                const [newClass] = await connection.query(
                    'INSERT INTO kelas (nama_kelas, prodi) VALUES (?, ?)',
                    [kelas, prodi]
                );
                classId = newClass.insertId;
            }

            // Link student to class
            await connection.query(
                'INSERT INTO mahasiswa_kelas (mahasiswa_id, kelas_id) VALUES (?, ?)',
                [userId, classId]
            );
        }

        await connection.commit();
        res.status(201).json({ status: 'success', message: 'Mahasiswa berhasil ditambahkan', userId });

    } catch (err) {
        await connection.rollback();
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
    const { name, nim, email, prodi, kelas } = req.body;

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // 1. Update pengguna
        await connection.query(
            'UPDATE pengguna SET nama = ?, username = ?, email = ? WHERE id_user = ?',
            [name, nim, email, id]
        );

        // 2. Update Kelas/Prodi
        if (kelas || prodi) {
            // Find or create class
            let classId;
            const [classRows] = await connection.query('SELECT id_kelas FROM kelas WHERE nama_kelas = ?', [kelas]);
            
            if (classRows.length > 0) {
                classId = classRows[0].id_kelas;
            } else {
                const [newClass] = await connection.query(
                    'INSERT INTO kelas (nama_kelas, prodi) VALUES (?, ?)',
                    [kelas, prodi]
                );
                classId = newClass.insertId;
            }

            // Update link
            const [existingLink] = await connection.query('SELECT id FROM mahasiswa_kelas WHERE mahasiswa_id = ?', [id]);
            if (existingLink.length > 0) {
                await connection.query('UPDATE mahasiswa_kelas SET kelas_id = ? WHERE mahasiswa_id = ?', [classId, id]);
            } else {
                await connection.query('INSERT INTO mahasiswa_kelas (mahasiswa_id, kelas_id) VALUES (?, ?)', [id, classId]);
            }
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
        // Remove from related tables first
        await connection.query('DELETE FROM mahasiswa_kelas WHERE mahasiswa_id = ?', [id]);
        await connection.query('DELETE FROM face_profiles WHERE user_id = ?', [id]);
        await connection.query('DELETE FROM manual_scan_permission WHERE user_id = ?', [id]);
        await connection.query('DELETE FROM absensi WHERE user_id = ?', [id]);
        
        // Remove from pengguna
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
