const db = require('../config/db');

// Core API specifically for ESP32
exports.scanWajah = async (req, res) => {
    try {
        const { device_id, image, timestamp, user_id } = req.body;

        if (!device_id || !image) {
            return res.status(400).json({ status: 'error', message: 'device_id and image are required' });
        }

        let matchedUserId = user_id || 1; 

        // Find user using id_user
        const [users] = await db.query('SELECT nama as name, id_user FROM pengguna WHERE id_user = ?', [matchedUserId]);
        
        if (users.length === 0) {
            return res.status(404).json({ status: 'error', message: 'User not found for this face' });
        }

        const user_id_val = users[0].id_user;
        const user_name = users[0].name;

        // Find active jadwal
        // In database.sql, jadwal_kuliah doesn't have a direct class link in a way the code expects, 
        // but it has mata_kuliah_id and kelas_id.
        const [jadwalActive] = await db.query(
            'SELECT id_jadwal as id, jam_mulai FROM jadwal_kuliah WHERE CURRENT_TIME() BETWEEN jam_mulai AND jam_selesai LIMIT 1'
        );

        if (jadwalActive.length === 0) {
            return res.status(400).json({ status: 'error', message: 'Tidak ada jadwal kuliah aktif saat ini' });
        }

        const activeJadwalId = jadwalActive[0].id;

        // Check if already scanned
        const [existing] = await db.query(
            'SELECT id_absensi FROM absensi WHERE user_id = ? AND jadwal_id = ? AND DATE(tanggal) = CURDATE()',
            [user_id_val, activeJadwalId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ status: 'success', message: 'Anda sudah melakukan absensi hari ini' });
        }

        const jam_mulai = new Date('1970-01-01T' + jadwalActive[0].jam_mulai + 'Z');
        const waktuAbsenTime = new Date('1970-01-01T' + new Date().toTimeString().split(' ')[0] + 'Z');
        
        let statusAbsen = 'hadir';
        if (waktuAbsenTime > new Date(jam_mulai.getTime() + 15*60000)) { 
            statusAbsen = 'terlambat';
        }

        // Insert Absensi
        await db.query(
            'INSERT INTO absensi (user_id, jadwal_id, tanggal, waktu_datang, status) VALUES (?, ?, NOW(), CURTIME(), ?)',
            [user_id_val, activeJadwalId, statusAbsen]
        );

        // Notifications (using the unified `notifications` table)
        await db.query(
            `INSERT INTO notifications (receiver_user_id, sender_user_id, type, title, message, is_read)
             VALUES (?, NULL, 'ATTENDANCE_SUCCESS', 'Absensi Berhasil', ?, FALSE)`,
            [user_id_val, `${statusAbsen === 'hadir' ? 'Hadir' : 'Terlambat'} — Kehadiranmu pukul ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} berhasil dicatat via scan wajah manual.`]
        );

        res.json({
            status: 'success',
            message: 'Absensi berhasil',
            data: {
                nama: user_name,
                status: statusAbsen,
                waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            }
        });

    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.finishClass = async (req, res) => {
    try {
        const { jadwal_id } = req.body;
        if (!jadwal_id) return res.status(400).json({ status: 'error', message: 'jadwal_id is required' });

        // Get students in this schedule's class
        const [studentsInClass] = await db.query(`
            SELECT mk.mahasiswa_id
            FROM mahasiswa_kelas mk
            JOIN jadwal_kuliah jk ON mk.kelas_id = jk.kelas_id
            WHERE jk.id_jadwal = ?
        `, [jadwal_id]);

        let alfaCount = 0;
        for (let s of studentsInClass) {
            const [attendance] = await db.query(
                'SELECT id_absensi FROM absensi WHERE user_id = ? AND jadwal_id = ? AND DATE(tanggal) = CURDATE()',
                [s.mahasiswa_id, jadwal_id]
            );

            if (attendance.length === 0) {
                await db.query(
                    'INSERT INTO absensi (user_id, jadwal_id, tanggal, status) VALUES (?, ?, NOW(), ?)',
                    [s.mahasiswa_id, jadwal_id, 'alfa']
                );
                alfaCount++;
            }
        }

        res.json({ status: 'success', message: `Kelas selesai. ${alfaCount} mahasiswa ditandai alfa.` });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.getAllAbsensi = async (req, res) => {
    try {
        const { class_id } = req.query;
        let query = `
            SELECT a.*, p.nama as name, mk.nama_mk, k.nama_kelas
            FROM absensi a 
            JOIN pengguna p ON a.user_id = p.id_user 
            JOIN jadwal_kuliah jk ON a.jadwal_id = jk.id_jadwal
            JOIN mata_kuliah mk ON jk.mata_kuliah_id = mk.id_mk
            JOIN kelas k ON jk.kelas_id = k.id_kelas
            WHERE 1=1
        `;
        
        const params = [];
        if (class_id) {
            query += " AND k.id_kelas = ?";
            params.push(class_id);
        }
        
        query += " ORDER BY a.tanggal DESC";
        
        const [absensi] = await db.query(query, params);
        res.json({ status: 'success', data: absensi });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};


exports.getAbsensiByMahasiswa = async (req, res) => {
    try {
        const { user_id } = req.params;
        const [absensi] = await db.query(`
            SELECT a.*, mk.nama_mk
            FROM absensi a 
            JOIN jadwal_kuliah jk ON a.jadwal_id = jk.id_jadwal 
            JOIN mata_kuliah mk ON jk.mata_kuliah_id = mk.id_mk
            WHERE a.user_id = ?
            ORDER BY a.tanggal DESC
        `, [user_id]);
        res.json({ status: 'success', data: absensi });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const { user_id } = req.params;

        // 1. Cek apakah sudah absen hari ini
        const [todayScan] = await db.query(`
            SELECT id_absensi 
            FROM absensi 
            WHERE user_id = ? AND DATE(tanggal) = CURDATE()
            LIMIT 1
        `, [user_id]);

        // 2. Statistik per mata kuliah berdasarkan kelas mahasiswa
        const [stats] = await db.query(`
            SELECT 
                mk.nama_mk AS subject,
                (
                    SELECT COUNT(*) 
                    FROM absensi a 
                    WHERE a.user_id = ? AND a.jadwal_id = jk.id_jadwal AND a.status != 'alfa'
                ) AS attended,
                (
                    SELECT COUNT(DISTINCT DATE(ab.tanggal))
                    FROM absensi ab
                    WHERE ab.jadwal_id = jk.id_jadwal
                ) AS total
            FROM jadwal_kuliah jk
            JOIN mata_kuliah mk ON jk.mata_kuliah_id = mk.id_mk
            JOIN mahasiswa_kelas mak ON mak.kelas_id = jk.kelas_id
            WHERE mak.mahasiswa_id = ?
        `, [user_id, user_id]);

        res.json({
            status: 'success',
            data: {
                alreadyScannedToday: todayScan.length > 0,
                stats: stats.map(s => {
                    const total = s.total > 0 ? s.total : 1; // Prevent division by zero
                    return {
                        subject: s.subject,
                        attended: s.attended,
                        total: total,
                        attendance: Math.round((s.attended / total) * 100)
                    };
                })
            }
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.updateAttendanceStatus = async (req, res) => {
    try {
        const { user_id, jadwal_id, status } = req.body;
        if (!user_id || !jadwal_id || !status) {
            return res.status(400).json({ status: 'error', message: 'user_id, jadwal_id, and status are required' });
        }

        // Check if record exists
        const [existing] = await db.query(
            'SELECT id_absensi FROM absensi WHERE user_id = ? AND jadwal_id = ? AND DATE(tanggal) = CURDATE()',
            [user_id, jadwal_id]
        );

        if (existing.length > 0) {
            await db.query(
                'UPDATE absensi SET status = ?, waktu_datang = CURTIME(), submitted_by_role = "dosen" WHERE id_absensi = ?',
                [status, existing[0].id_absensi]
            );
        } else {
            await db.query(
                'INSERT INTO absensi (user_id, jadwal_id, tanggal, waktu_datang, status, submitted_by_role) VALUES (?, ?, NOW(), CURTIME(), ?, "dosen")',
                [user_id, jadwal_id, status]
            );
        }

        res.json({ status: 'success', message: 'Status kehadiran diperbarui' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.getAdminAttendance = async (req, res) => {
    try {
        const { date, class_id } = req.query;
        let query = `
            SELECT a.*, p.nama as name, p.username as nim, mk.nama_mk as subject, k.nama_kelas as class_name
            FROM absensi a
            JOIN pengguna p ON a.user_id = p.id_user
            JOIN jadwal_kuliah jk ON a.jadwal_id = jk.id_jadwal
            JOIN mata_kuliah mk ON jk.mata_kuliah_id = mk.id_mk
            JOIN kelas k ON jk.kelas_id = k.id_kelas
            WHERE a.submitted_by_role = 'dosen'
        `;
        
        const params = [];
        if (date) {
            query += " AND DATE(a.tanggal) = ?";
            params.push(date);
        }
        if (class_id) {
            query += " AND k.id_kelas = ?";
            params.push(class_id);
        }
        
        query += " ORDER BY a.tanggal DESC, a.waktu_datang DESC";
        
        const [absensi] = await db.query(query, params);
        res.json({ status: 'success', data: absensi });
    } catch (err) {
        console.error('Get Admin Attendance Error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};
exports.triggerScan = async (
  req,
  res
) => {
  try {

    const students = [
      {
        id: 1,
        name: 'Rian Hidayat',
      },

      {
        id: 2,
        name: 'Lestari Putri',
      },

      {
        id: 3,
        name: 'Andi Wijaya',
      },
    ];

    const randomStudent =
      students[
        Math.floor(
          Math.random() *
            students.length
        )
      ];

    const result = {
      mahasiswa:
        randomStudent.name,

      status: 'hadir',

      waktu:
        new Date().toLocaleTimeString(),
    };

    console.log(
      'SCAN RESULT:',
      result
    );

    res.json({
      status: 'success',
      data: result,
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      status: 'error',
      message:
        err.message,
    });
  }
};

exports.validateAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { approval_status, rejection_reason } = req.body;
        const admin_id = req.userId;

        if (!['APPROVED', 'REJECTED', 'PENDING'].includes(approval_status)) {
            return res.status(400).json({ status: 'error', message: 'Invalid approval_status' });
        }

        const [oldRecord] = await db.query(`SELECT approval_status, user_id FROM absensi WHERE id_absensi = ?`, [id]);
        if (oldRecord.length === 0) return res.status(404).json({ status: 'error', message: 'Attendance record not found' });

        const prev_status = oldRecord[0].approval_status;

        await db.query(
            `UPDATE absensi 
             SET approval_status = ?, approved_by = ?, approved_at = NOW(), rejection_reason = ? 
             WHERE id_absensi = ?`,
            [approval_status, admin_id, rejection_reason || null, id]
        );

        await db.query(
            `INSERT INTO audit_logs (entity_type, entity_id, action_by_user_id, previous_status, new_status, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['absensi', id, admin_id, prev_status, approval_status, rejection_reason || 'Status updated']
        );

        let message = '';
        if (approval_status === 'APPROVED') {
            message = 'Absensi Anda telah disetujui.';
        } else if (approval_status === 'REJECTED') {
            message = `⚠️ Absensi ditolak: ${rejection_reason || 'Wajah tidak cocok / alasan lain'}`;
        } else {
            message = 'Status absensi Anda sedang di-review.';
        }

        await db.query(
            `INSERT INTO notifications (receiver_user_id, sender_user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`,
            [oldRecord[0].user_id, admin_id, 'ATTENDANCE_VALIDATION', 'Validasi Absensi', message]
        );

        const io = req.app.get('io');
        if (io) {
            io.emit('ATTENDANCE_VALIDATION', { 
                absensi_id: id, 
                approval_status, 
                rejection_reason, 
                receiver_id: oldRecord[0].user_id 
            });
        }

        res.json({ status: 'success', message: 'Status absensi berhasil divalidasi' });
    } catch (err) {
        console.error('Validate Attendance Error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};
