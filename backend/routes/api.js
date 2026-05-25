const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const faceService = require('../services/faceService');

// ======================================================
// MIDDLEWARE
// ======================================================
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// ======================================================
// CONTROLLERS
// ======================================================
const authCtrl = require('../controllers/authController');
const userCtrl = require('../controllers/userController');
const jadwalCtrl = require('../controllers/jadwalController');
const absensiCtrl = require('../controllers/absensiController');
const notifCtrl = require('../controllers/notifikasiController');
const dashCtrl = require('../controllers/dashboardController');
const reportCtrl = require('../controllers/reportController');
const wajahCtrl = require('../controllers/wajahController');
const logCtrl = require('../controllers/logController');
const kelasCtrl = require('../controllers/kelasController');
const iotCtrl = require('../controllers/iotController');
const manualScanCtrl = require('../controllers/manualScanController');
const adminFaceCtrl = require('../controllers/adminFaceController');
const adminStudentCtrl = require('../controllers/adminStudentController');

// ======================================================
// 1. AUTH ROUTES
// ======================================================
router.post('/register', authCtrl.register);
router.post('/register/admin-dosen', auth, roleCheck('admin'), authCtrl.registerAdminOrDosen);
router.post('/login', authCtrl.login);
router.get('/profile', auth, authCtrl.getProfile);
router.post('/profile/avatar', auth, authCtrl.uploadAvatar);
router.put('/profile/update', auth, authCtrl.updateProfile);

// ======================================================
// 2. USER ROUTES
// ======================================================
router.get('/users', auth, userCtrl.getAllUsers);
router.get('/users/:id', auth, userCtrl.getUserById);
router.put('/users/:id', auth, roleCheck('admin'), userCtrl.updateUser);
router.delete('/users/:id', auth, roleCheck('admin'), userCtrl.deleteUser);

// --- Admin Student Management ---
router.get('/admin/students', auth, roleCheck('admin'), adminStudentCtrl.getAllStudents);
router.post('/admin/students', auth, roleCheck('admin'), adminStudentCtrl.createStudent);
router.put('/admin/students/:id', auth, roleCheck('admin'), adminStudentCtrl.updateStudent);
router.delete('/admin/students/:id', auth, roleCheck('admin'), adminStudentCtrl.deleteStudent);

// ======================================================
// 3. JADWAL ROUTES
// ======================================================
router.get('/jadwal', jadwalCtrl.getAllJadwal);

// ======================================================
// 4. ABSENSI ROUTES
// ======================================================
router.post('/absensi/scan', absensiCtrl.scanWajah);
router.post('/trigger-scan', absensiCtrl.triggerScan);
router.post('/absensi/finish', auth, roleCheck('dosen', 'admin'), absensiCtrl.finishClass);
router.get('/absensi', auth, absensiCtrl.getAllAbsensi);
router.get('/absensi/:mahasiswa_id', auth, absensiCtrl.getAbsensiByMahasiswa);
router.post('/absensi/update', auth, roleCheck('dosen', 'admin'), absensiCtrl.updateAttendanceStatus);
router.get('/admin/attendance', auth, roleCheck('admin'), absensiCtrl.getAdminAttendance);
router.put('/absensi/:id/validate', auth, roleCheck('dosen', 'admin'), absensiCtrl.validateAttendance);

// ======================================================
// 5. REPORT ROUTES (PDF & EXCEL)
// ======================================================
router.get('/reports/absensi', auth, roleCheck('admin', 'dosen'), reportCtrl.exportAttendance);
router.get('/reports/excel', reportCtrl.exportExcel);
router.get('/reports/pdf', reportCtrl.exportPDF);

// Mahasiswa Facility/Issue Reports
router.post('/reports/mahasiswa', auth, roleCheck('mahasiswa'), reportCtrl.createReport);
router.get('/reports/mahasiswa/me', auth, roleCheck('mahasiswa'), reportCtrl.getMyReports);

// Dosen Daily Reports
router.post('/reports/daily', auth, roleCheck('dosen'), reportCtrl.createDailyReport);
router.get('/dosen/reports/daily', auth, roleCheck('dosen'), reportCtrl.getDosenDailyReports);
router.get('/admin/reports/daily', auth, roleCheck('admin'), reportCtrl.getDailyReports);
router.put('/admin/reports/daily/:id/status', auth, roleCheck('admin'), reportCtrl.updateDailyReportStatus);

// Admin manage Mahasiswa reports
router.get('/admin/reports', auth, roleCheck('admin'), reportCtrl.getAdminReports);
router.put('/admin/reports/:id/status', auth, roleCheck('admin'), reportCtrl.updateReportStatus);

// ======================================================
// 6. NOTIFIKASI & DASHBOARD
// ======================================================
router.get('/notifikasi', auth, notifCtrl.getNotifikasi);
router.post('/notifikasi', auth, roleCheck('admin', 'dosen', 'mahasiswa'), notifCtrl.createNotifikasi);
router.put('/notifikasi/read', auth, notifCtrl.markAsRead);

router.get('/dashboard/admin', auth, roleCheck('admin'), dashCtrl.getAdminDashboard);
router.get('/dashboard/dosen', auth, roleCheck('dosen'), dashCtrl.getDosenDashboard);
router.get('/dashboard/mahasiswa', auth, roleCheck('mahasiswa'), dashCtrl.getMahasiswaDashboard);

// ======================================================
// 7. WAJAH & VALIDATION
// ======================================================
router.get('/wajah/available-users', auth, roleCheck('admin'), wajahCtrl.getAvailableUsers);
router.post('/wajah/start-session', auth, roleCheck('admin'), wajahCtrl.startValidationSession);
router.get('/wajah/status/:user_id', auth, wajahCtrl.getValidationStatus);
router.post('/wajah/iot-capture', wajahCtrl.uploadIotFaceData);

// --- NEW ADMIN FACE MANAGEMENT ---
router.get('/admin/face/students', auth, roleCheck('admin'), adminFaceCtrl.getStudentsWithStatus);
router.get('/admin/face/status/:user_id', auth, roleCheck('admin'), adminFaceCtrl.getFaceStatus);
router.post('/admin/face/register', auth, roleCheck('admin'), adminFaceCtrl.registerFace);
router.post('/admin/face/retrain', auth, roleCheck('admin'), adminFaceCtrl.registerFace); // Reuse register logic
router.delete('/admin/face/delete/:user_id', auth, roleCheck('admin'), adminFaceCtrl.deleteFace);

// ======================================================
// 8. SYSTEM LOGS & KELAS
// ======================================================
router.get('/logs', auth, roleCheck('admin'), logCtrl.getAllLogs);
router.get('/logs/stats', auth, roleCheck('admin'), logCtrl.getLogStats);
router.get('/logs/recent', logCtrl.getRecentLogs);

router.get('/kelas', auth, kelasCtrl.getAllKelas);
router.get('/kelas/:id', auth, kelasCtrl.getKelasById);
router.get('/kelas/:id/mahasiswa', kelasCtrl.getMahasiswaByKelas);

// ======================================================
// 9. IoT / ESP32 CORE LOGIC (REAL AI RECOGNITION)
// ======================================================
router.post('/iot/recognize', iotCtrl.recognizeFromIoT);
// === KODE BARU JALUR OUTBOUND DOSEN: TARUH DI SINI ===
router.post('/iot/trigger-scan', iotCtrl.triggerHardwareScan);
// =====================================================

// NOTE: Face registration is handled by /admin/face/register (adminFaceCtrl.registerFace)
// which includes: image saving → AI embedding → DB persistence → cache invalidation → socket events

router.post('/attendance/location', async (req, res) => {
  try {
    const { user_id, latitude, longitude, location_name } = req.body;
    const [latest] = await db.query('SELECT id_absensi FROM absensi WHERE user_id = ? ORDER BY id_absensi DESC LIMIT 1', [user_id]);
    if (latest.length === 0) return res.status(404).json({ success: false, message: 'No attendance' });

    await db.query('UPDATE absensi SET latitude = ?, longitude = ?, location_name = ? WHERE id_absensi = ?', 
      [latitude, longitude, location_name, latest[0].id_absensi]);

    const io = req.app.get('io');
    if (io) io.emit('update_location', { user_id, latitude, longitude, location_name });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Location] Update error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/iot/health', iotCtrl.healthCheck);
router.get('/iot/stats', auth, roleCheck('admin'), iotCtrl.getIoTStats);

// ======================================================
// 10. MANUAL SCAN PERMISSION
// ======================================================
router.get('/manual-scan/permission', auth, manualScanCtrl.getPermission);
router.post('/manual-scan/allow', auth, roleCheck('dosen', 'admin'), manualScanCtrl.allowManualScan);
router.post('/manual-scan/disable', auth, roleCheck('dosen', 'admin'), manualScanCtrl.disableManualScan);
router.get('/manual-scan/users', auth, roleCheck('dosen', 'admin'), manualScanCtrl.getUsersWithPermissions);
router.get('/manual-scan/students', auth, roleCheck('dosen', 'admin'), manualScanCtrl.getUsersWithPermissions);

// ======================================================
// 11. TEST ENDPOINT (ESP32 Health Check)
// ======================================================
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'ESP32 Connected to Attendify Backend',
    server_time: new Date().toISOString(),
    ip_received: req.ip || req.connection.remoteAddress
  });
});

module.exports = router;