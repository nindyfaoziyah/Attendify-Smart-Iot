const db = require('../config/db');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// ======================================================
// COMMON QUERY 
// ======================================================
const getAttendanceData = async (classId, date, jadwalId) => {
    let query = `
        SELECT 
            a.id_absensi, 
            p.nama as name, 
            p.username as nim, 
            mk.nama_mk as subject, 
            k.nama_kelas as class_name,
            d.nama as dosen_name,
            jk.ruang,
            a.tanggal, 
            a.waktu_datang as time, 
            a.status
        FROM absensi a
        JOIN pengguna p ON a.user_id = p.id_user
        JOIN jadwal_kuliah jk ON a.jadwal_id = jk.id_jadwal
        JOIN mata_kuliah mk ON jk.mata_kuliah_id = mk.id_mk
        JOIN kelas k ON jk.kelas_id = k.id_kelas
        JOIN pengguna d ON jk.dosen_id = d.id_user
        WHERE 1=1
    `;

    const params = [];

    // Filter berdasarkan Jadwal ID (Paling Akurat)
    if (jadwalId && jadwalId !== 'null' && jadwalId !== 'undefined') {
        query += " AND jk.id_jadwal = ?";
        params.push(jadwalId);
    }

    if (classId) {
        query += " AND k.id_kelas = ?";
        params.push(classId);
    }

    if (date) {
        query += " AND DATE(a.tanggal) = ?";
        params.push(date);
    }

    query += " ORDER BY a.waktu_datang ASC";

    const [rows] = await db.query(query, params);
    return rows;
};

// ======================================================
// EXPORT PDF (LAYOUT DIPERBAIKI BIAR RAPI)
// ======================================================
exports.exportPDF = async (req, res) => {
    try {
        const { class_id, jadwal_id, date } = req.query;

        const data = await getAttendanceData(class_id, date, jadwal_id);

        if (!data || data.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Tidak ada data absensi untuk sesi ini.'
            });
        }

        const firstData = data[0];
        const filename = `Laporan_Absensi_${firstData.subject.replace(/\s+/g, '_')}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        doc.pipe(res);

        // Header Instansi
        doc.fontSize(16).text('ATTENDIFY - SISTEM ABSENSI WAJAH', { align: 'center', bullet: true });
        doc.fontSize(10).text('Laporan Kehadiran Mahasiswa Otomatis', { align: 'center' });
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke(); // Garis Horizontal
        doc.moveDown();

        // Info Matkul
        doc.fontSize(11).font('Helvetica-Bold').text(`Mata Kuliah : `, { continued: true }).font('Helvetica').text(firstData.subject);
        doc.font('Helvetica-Bold').text(`Dosen       : `, { continued: true }).font('Helvetica').text(firstData.dosen_name);
        doc.font('Helvetica-Bold').text(`Kelas/Ruang : `, { continued: true }).font('Helvetica').text(`${firstData.class_name} / ${firstData.ruang}`);
        doc.font('Helvetica-Bold').text(`Tanggal     : `, { continued: true }).font('Helvetica').text(new Date(firstData.tanggal).toLocaleDateString('id-ID', { dateStyle: 'full' }));
        doc.moveDown(2);

        // TABLE HEADER (Pakai koordinat X biar lurus)
        const tableTop = doc.y;
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('No', 50, tableTop);
        doc.text('NIM', 80, tableTop);
        doc.text('Nama Mahasiswa', 180, tableTop);
        doc.text('Jam', 380, tableTop);
        doc.text('Status', 480, tableTop);
        
        doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();
        doc.font('Helvetica').moveDown();

        // TABLE ROWS
        let currentY = tableTop + 25;
        data.forEach((item, index) => {
            // Cek jika halaman penuh
            if (currentY > 750) {
                doc.addPage();
                currentY = 50; 
            }

            doc.text(index + 1, 50, currentY);
            doc.text(item.nim, 80, currentY);
            doc.text(item.name, 180, currentY, { width: 190 });
            doc.text(item.time || '--:--', 380, currentY);
            
            // Warna Status (Hijau untuk Hadir)
            if (item.status.toUpperCase() === 'HADIR') {
                doc.fillColor('green').text(item.status.toUpperCase(), 480, currentY).fillColor('black');
            } else {
                doc.fillColor('red').text(item.status.toUpperCase(), 480, currentY).fillColor('black');
            }

            currentY += 20;
        });

        doc.moveTo(50, currentY).lineTo(545, currentY).stroke();
        doc.moveDown();
        doc.fontSize(10).font('Helvetica-Oblique').text(`Total Kehadiran: ${data.length} Mahasiswa`, { align: 'right' });

        doc.end();

    } catch (err) {
        console.error('PDF Export Error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// ======================================================
// EXPORT EXCEL (🌟 KINI AKTIF & MENGGUNAKAN DATA REAL)
// ======================================================
exports.exportExcel = async (req, res) => {
    try {
        const { class_id, jadwal_id, date } = req.query;

        // Tarik data real mahasiswa menggunakan common query
        const data = await getAttendanceData(class_id, date, jadwal_id);

        if (!data || data.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Tidak ada data absensi untuk sesi ini.'
            });
        }

        const firstData = data[0];
        const filename = `Laporan_Absensi_${firstData.subject.replace(/\s+/g, '_')}.xlsx`;

        // Inisialisasi file Excel baru melalui ExcelJS
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Data Presensi');

        // Atur Judul Kolom Excel
        worksheet.columns = [
            { header: 'No', key: 'no', width: 6 },
            { header: 'NIM', key: 'nim', width: 18 },
            { header: 'Nama Mahasiswa', key: 'name', width: 30 },
            { header: 'Jam Presensi', key: 'time', width: 15 },
            { header: 'Status Kehadiran', key: 'status', width: 18 }
        ];

        // Loop data mahasiswa dari database ke baris Excel
        data.forEach((item, index) => {
            worksheet.addRow({
                no: index + 1,
                nim: item.nim,
                name: item.name,
                time: item.time || '--:--',
                status: item.status.toUpperCase()
            });
        });

        // Bikin text di baris pertama (Header) jadi Tebal
        worksheet.getRow(1).font = { bold: true };

        // Set response agar didownload browser berupa file .xlsx asli
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('Excel Export Error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.exportAttendance = async (req, res) => {
    return this.exportExcel(req, res);
};

// ======================================================
// MAHASISWA FACILITY / ISSUE REPORTS
// ======================================================
exports.createReport = async (req, res) => {
    try {
        const { title, description, category, location, image } = req.body;
        const sender_user_id = req.userId;
        const sender_role = req.userRole;

        const [result] = await db.query(
            `INSERT INTO reports (sender_user_id, sender_role, title, description, category, location, image, status, approval_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 'PENDING')`,
            [sender_user_id, sender_role, title, description, category, location, image || null]
        );

        // Fetch the created report to emit
        const [newReport] = await db.query(`SELECT * FROM reports WHERE id = ?`, [result.insertId]);

        // Insert notification for Admin
        const [admins] = await db.query(`SELECT id_user FROM pengguna WHERE role = 'admin'`);
        for (const admin of admins) {
            await db.query(
                `INSERT INTO notifications (receiver_user_id, sender_user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`,
                [admin.id_user, sender_user_id, 'NEW_REPORT', 'Laporan Baru Masuk', `Laporan baru dari Mahasiswa: ${title}`]
            );
        }

        // Emit Socket.IO event to Admin
        const io = req.app.get('io');
        if (io) {
            io.emit('NEW_REPORT', newReport[0]);
        }

        res.json({ status: 'success', message: 'Laporan berhasil dikirim', data: newReport[0] });
    } catch (err) {
        console.error('Create Report Error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.getMyReports = async (req, res) => {
    try {
        const [reports] = await db.query(
            `SELECT * FROM reports WHERE sender_user_id = ? ORDER BY created_at DESC`,
            [req.userId]
        );
        res.json({ status: 'success', data: reports });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.getAdminReports = async (req, res) => {
    try {
        const [reports] = await db.query(`
            SELECT r.*, p.nama as sender_name 
            FROM reports r 
            LEFT JOIN pengguna p ON r.sender_user_id = p.id_user 
            ORDER BY r.created_at DESC
        `);
        res.json({ status: 'success', data: reports });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.updateReportStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, approval_status, rejection_reason } = req.body;
        const admin_id = req.userId;

        // Get previous status for audit log
        const [oldReport] = await db.query(`SELECT status, approval_status, sender_user_id, title FROM reports WHERE id = ?`, [id]);
        if (oldReport.length === 0) return res.status(404).json({ status: 'error', message: 'Report not found' });

        const prev_status = oldReport[0].status;

        // Update
        await db.query(
            `UPDATE reports 
             SET status = ?, approval_status = ?, approved_by = ?, approved_at = NOW(), rejection_reason = ? 
             WHERE id = ?`,
            [status || prev_status, approval_status || oldReport[0].approval_status, admin_id, rejection_reason || null, id]
        );

        // Create Audit Log
        await db.query(
            `INSERT INTO audit_logs (entity_type, entity_id, action_by_user_id, previous_status, new_status, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['reports', id, admin_id, prev_status, status || approval_status, rejection_reason || 'Status updated']
        );

        // Notify Sender
        const message = approval_status === 'REJECTED' 
            ? `Laporan "${oldReport[0].title}" ditolak: ${rejection_reason}`
            : (approval_status === 'APPROVED' ? `Laporan "${oldReport[0].title}" disetujui` : `Laporan "${oldReport[0].title}" sedang diproses`);

        await db.query(
            `INSERT INTO notifications (receiver_user_id, sender_user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`,
            [oldReport[0].sender_user_id, admin_id, 'REPORT_STATUS_UPDATE', 'Update Status Laporan', message]
        );

        const io = req.app.get('io');
        if (io) {
            io.emit('REPORT_STATUS_UPDATE', { report_id: id, status, approval_status, rejection_reason, receiver_id: oldReport[0].sender_user_id });
        }

        res.json({ status: 'success', message: 'Status laporan diperbarui' });
    } catch (err) {
        console.error('Update Report Status Error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// ======================================================
// DOSEN DAILY REPORTS
// ======================================================
exports.createDailyReport = async (req, res) => {
    try {
        const { class_id, report_date, total_present, total_late, total_absent, attendance_percentage, notes } = req.body;
        const dosen_id = req.userId;

        const [result] = await db.query(
            `INSERT INTO daily_attendance_reports (dosen_id, class_id, report_date, total_present, total_late, total_absent, attendance_percentage, notes, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
            [dosen_id, class_id, report_date, total_present, total_late, total_absent, attendance_percentage, notes]
        );

        const [newReport] = await db.query(`SELECT * FROM daily_attendance_reports WHERE id = ?`, [result.insertId]);

        // Notify Admin
        const [admins] = await db.query(`SELECT id_user FROM pengguna WHERE role = 'admin'`);
        for (const admin of admins) {
            await db.query(
                `INSERT INTO notifications (receiver_user_id, sender_user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`,
                [admin.id_user, dosen_id, 'DAILY_REPORT', 'Laporan Harian Dosen', `Laporan absensi baru masuk`]
            );
        }

        const io = req.app.get('io');
        if (io) {
            io.emit('DAILY_REPORT', newReport[0]);
        }

        res.json({ status: 'success', message: 'Laporan harian berhasil dikirim', data: newReport[0] });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.getDosenDailyReports = async (req, res) => {
    try {
        const [reports] = await db.query(`
            SELECT d.*, k.nama_kelas 
            FROM daily_attendance_reports d
            LEFT JOIN kelas k ON d.class_id = k.id_kelas
            WHERE d.dosen_id = ? ORDER BY d.created_at DESC
        `, [req.userId]);
        res.json({ status: 'success', data: reports });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.getDailyReports = async (req, res) => {
    try {
        const [reports] = await db.query(`
            SELECT d.*, p.nama as dosen_name, k.nama_kelas 
            FROM daily_attendance_reports d
            LEFT JOIN pengguna p ON d.dosen_id = p.id_user
            LEFT JOIN kelas k ON d.class_id = k.id_kelas
            ORDER BY d.created_at DESC
        `);
        res.json({ status: 'success', data: reports });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.updateDailyReportStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejection_reason } = req.body;
        const admin_id = req.userId;

        const [oldReport] = await db.query(`SELECT status, dosen_id FROM daily_attendance_reports WHERE id = ?`, [id]);
        if (oldReport.length === 0) return res.status(404).json({ status: 'error', message: 'Report not found' });

        await db.query(
            `UPDATE daily_attendance_reports 
             SET status = ?, approved_by = ?, approved_at = NOW(), rejection_reason = ? 
             WHERE id = ?`,
            [status, admin_id, rejection_reason || null, id]
        );

        await db.query(
            `INSERT INTO audit_logs (entity_type, entity_id, action_by_user_id, previous_status, new_status, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['daily_attendance', id, admin_id, oldReport[0].status, status, rejection_reason || 'Status updated']
        );

        // Notify Dosen
        const message = status === 'REJECTED' ? `Laporan harian ditolak: ${rejection_reason}` : `Laporan harian disetujui`;
        await db.query(
            `INSERT INTO notifications (receiver_user_id, sender_user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`,
            [oldReport[0].dosen_id, admin_id, 'REPORT_STATUS_UPDATE', 'Status Laporan Harian', message]
        );

        const io = req.app.get('io');
        if (io) {
            io.emit('REPORT_STATUS_UPDATE', { report_id: id, status, type: 'daily_attendance', receiver_id: oldReport[0].dosen_id });
        }

        res.json({ status: 'success', message: 'Status laporan harian diperbarui' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};