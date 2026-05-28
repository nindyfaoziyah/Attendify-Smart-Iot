const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { name, email, password, username, phone, prodi, kelas } = req.body;
        // PUBLIC REGISTRATION is ONLY for MAHASISWA
        const role = 'mahasiswa';
        
        if (!name || !email || !password) {
            return res.status(400).json({ status: 'error', message: 'All fields are required' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await db.query(
            'INSERT INTO pengguna (nama, email, nohp, username, password, role, status, prodi, kelas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, email, phone || null, username || null, hashedPassword, role, 'Y', prodi || null, kelas || null]
        );

        res.status(201).json({
            status: 'success',
            message: 'Mahasiswa registered successfully',
            data: { id: result.insertId, name, email, role }
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ status: 'error', message: 'Email already exists' });
        }
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.registerAdminOrDosen = async (req, res) => {
    try {
        const { name, email, password, role, nip } = req.body;
        
        if (!name || !email || !password || !role) {
            return res.status(400).json({ status: 'error', message: 'All fields are required' });
        }

        // Validate role (Dosen or Admin only)
        if (role !== 'dosen' && role !== 'admin') {
            return res.status(400).json({ status: 'error', message: 'Invalid role for this endpoint' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await db.query(
            'INSERT INTO pengguna (nama, email, username, password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, nip || null, hashedPassword, role, 'Y']
        );

        res.status(201).json({
            status: 'success',
            message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`,
            data: { id: result.insertId, name, email, nip, role }
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ status: 'error', message: 'Email already exists' });
        }
        res.status(500).json({ status: 'error', message: err.message });
    }
};


exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Check for user by email OR username (which could be NIM/NIP)
        const [users] = await db.query(
            'SELECT * FROM pengguna WHERE email = ? OR username = ?', 
            [email, email]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Akun belum terdaftar' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ status: 'error', message: 'Password salah' });
        }

        const token = jwt.sign(
            { id: user.id_user, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        let userKelas = null;
        let userProdi = null; // Can be derived similarly if needed

        if (user.role === 'mahasiswa') {
            const [kelasData] = await db.query(
                `SELECT k.nama_kelas 
                 FROM mahasiswa_kelas mk 
                 JOIN kelas k ON mk.kelas_id = k.id_kelas 
                 WHERE mk.mahasiswa_id = ?`,
                [user.id_user]
            );
            if (kelasData.length > 0) {
                userKelas = kelasData[0].nama_kelas;
            }
        }

        console.log('Login response user data:', {
            id: user.id_user,
            name: user.nama,
            prodi: userProdi,
            kelas: userKelas
        });

        res.json({
            status: 'success',
            message: 'Logged in successfully',
            data: {
                user: { 
                    id: user.id_user, 
                    name: user.nama, 
                    email: user.email, 
                    role: user.role,
                    username: user.username,
                    nim: user.nim || null,
                    prodi: userProdi,
                    kelas: userKelas,
                    phone: user.nohp || null,
                    foto_profil: user.foto_profil || null
                },
                token
            }
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id_user as id, nama as name, email, username, nim, role, nohp as phone, foto_profil FROM pengguna WHERE id_user = ?',
            [req.userId]
        );
        if (users.length === 0) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }
        
        let userData = users[0];
        userData.kelas = null;
        userData.prodi = null;

        if (userData.role === 'mahasiswa') {
            const [kelasData] = await db.query(
                `SELECT k.nama_kelas 
                 FROM mahasiswa_kelas mk 
                 JOIN kelas k ON mk.kelas_id = k.id_kelas 
                 WHERE mk.mahasiswa_id = ?`,
                [userData.id]
            );
            if (kelasData.length > 0) {
                userData.kelas = kelasData[0].nama_kelas;
            }
        }

        res.json({ status: 'success', data: userData });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// Upload / update avatar (base64)
exports.uploadAvatar = async (req, res) => {
    try {
        const { avatar } = req.body;
        if (!avatar) {
            return res.status(400).json({ status: 'error', message: 'Avatar data is required' });
        }

        // Validate it's a base64 image
        if (!avatar.startsWith('data:image/')) {
            return res.status(400).json({ status: 'error', message: 'Invalid image format' });
        }

        await db.query(
            'UPDATE pengguna SET foto_profil = ? WHERE id_user = ?',
            [avatar, req.userId]
        );

        res.json({ status: 'success', message: 'Avatar updated successfully', data: { foto_profil: avatar } });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// Update profile (nama, phone)
exports.updateProfile = async (req, res) => {
    try {
        const { name, phone } = req.body;

        // Hanya update kolom yang ada di tabel pengguna
        await db.query(
            'UPDATE pengguna SET nama = ?, nohp = ? WHERE id_user = ?',
            [name || null, phone || null, req.userId]
        );

        // Return updated user dengan data lengkap
        const [users] = await db.query(
            'SELECT id_user as id, nama as name, email, username, nim, role, nohp as phone, foto_profil FROM pengguna WHERE id_user = ?',
            [req.userId]
        );

        let userData = users[0];

        // Ambil data kelas dari tabel mahasiswa_kelas
        if (userData && userData.role === 'mahasiswa') {
            const [kelasData] = await db.query(
                `SELECT k.nama_kelas FROM mahasiswa_kelas mk 
                 JOIN kelas k ON mk.kelas_id = k.id_kelas 
                 WHERE mk.mahasiswa_id = ?`,
                [userData.id]
            );
            userData.kelas = kelasData.length > 0 ? kelasData[0].nama_kelas : null;
        }

        res.json({ status: 'success', message: 'Profil berhasil diperbarui', data: userData });
    } catch (err) {
        console.error('[UpdateProfile] Error:', err.message);
        res.status(500).json({ status: 'error', message: err.message });
    }
};

