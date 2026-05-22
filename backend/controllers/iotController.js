const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const faceService = require('../services/faceService');

// Rate limiting map to prevent spam from same device
const deviceLastScan = new Map();
const RATE_LIMIT_SECONDS = 5;

/**
 * IoT Recognition Endpoint
 * Receives base64 image from ESP32-CAM and performs face recognition
 * 
 * POST /api/iot/recognize
 * Body: { image: base64, device_id: string, timestamp: ISO8601 }
 */
exports.recognizeFromIoT = async (req, res) => {
  try {
    const { image, device_id, timestamp, mode = 'auto' } = req.body;

    // ── Validation ──────────────────────────────────
    if (!image || !device_id) {
      return res.status(400).json({
        status: 'error',
        message: 'image and device_id are required'
      });
    }

    if (mode !== 'auto' && mode !== 'manual') {
      return res.status(400).json({
        status: 'error',
        message: 'mode must be "auto" or "manual"'
      });
    }

    // Validate image size (max 5MB)
    const imageSizeKB = Buffer.byteLength(image, 'base64') / 1024;
    if (imageSizeKB > 5120) {
      return res.status(400).json({
        status: 'error',
        message: 'Image too large (max 5MB)'
      });
    }

    // ── Rate Limiting ───────────────────────────────
    const now = Math.floor(Date.now() / 1000);
    const lastScan = deviceLastScan.get(device_id) || 0;
    
    if (now - lastScan < RATE_LIMIT_SECONDS) {
      return res.status(429).json({
        status: 'rate_limited',
        message: `Please wait before scanning again (${RATE_LIMIT_SECONDS}s limit)`
      });
    }

    deviceLastScan.set(device_id, now);

    // ── Log IoT Activity ────────────────────────────
    const logTimestamp = new Date().toISOString();
    console.log(`[IoT] ${logTimestamp} | Device: ${device_id} | Mode: ${mode} | Image size: ${imageSizeKB.toFixed(2)}KB`);

    // ── Save image to temp folder (for debugging) ───
    const imagesDir = path.join(__dirname, '../uploads/iot-captures');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    
    const fileName = `${device_id}-${Date.now()}-${mode}.jpg`;
    const filePath = path.join(imagesDir, fileName);
    
    try {
      fs.writeFileSync(filePath, Buffer.from(image, 'base64'));
      console.log(`[IoT] Image saved: ${fileName}`);
    } catch (saveError) {
      console.warn(`[IoT] Failed to save image: ${saveError.message}`);
    }

    // ── Face Recognition Logic ──────────────────────
    // TODO: Integrate with actual face recognition library (e.g., face-api.js, OpenCV, etc.)
    // For now, using a simple matching algorithm based on device and timing
    
    const recognitionOutput = await performFaceRecognition(image, device_id);
    const { matchedUser, matchResult, ioData } = recognitionOutput;
    
    // We can emit health event periodically or on every request
    const io = req.app.get('io');
    if (io) {
        io.emit('AI_HEALTH_UPDATE', {
            active: true,
            latency: Date.now() - (now * 1000), // very rough latency
            queue: 0
        });
    }

    if (!matchedUser || !matchResult.success) {
      if (matchResult && matchResult.spoof) {
          // Log suspicious activity
          await db.query(
              `INSERT INTO suspicious_logs (device_id, event_type, confidence, image_path, notes) VALUES (?, ?, ?, ?, ?)`,
              [device_id, matchResult.type || 'SPOOF_ATTEMPT', matchResult.confidence || 0, fileName, matchResult.message]
          );
          
          if (io) {
              io.emit('SPOOF_ATTEMPT', {
                  device_id,
                  type: matchResult.type,
                  message: matchResult.message,
                  image: fileName,
                  timestamp: new Date().toISOString()
              });
          }
      } else {
          await logIotActivity(device_id, 'unknown', null, matchResult ? matchResult.message : 'face_not_recognized');
      }
      
      return res.json({
        status: matchResult?.spoof ? 'spoof' : 'unknown',
        message: matchResult ? matchResult.message : 'Face not recognized in database'
      });
    }

    // Determine approval status based on confidence
    const confidencePct = matchResult.confidence * 100;
    let approvalStatus = 'APPROVED';
    if (confidencePct < 80) {
        approvalStatus = 'REJECTED';
    } else if (confidencePct >= 80 && confidencePct < 95) {
        approvalStatus = 'REVIEW_REQUIRED';
    }

    // ── MANUAL MODE PERMISSION CHECK (NEW) ──────────
    let manualMode = 0;
    if (mode === 'manual') {
      const [permissions] = await db.query(
        `SELECT id_permission FROM manual_scan_permission 
         WHERE user_id = ? AND enabled = 1 AND (expires_at IS NULL OR expires_at > NOW())`,
        [matchedUser.id_user]
      );
      
      if (permissions.length === 0) {
        await logIotActivity(device_id, 'manual_denied', matchedUser.id_user, 'no_active_permission');
        return res.status(403).json({
          status: 'manual_denied',
          message: 'Manual scan not permitted by dosen'
        });
      }
      
      manualMode = 1;
      console.log(`[ManualScan] Permission OK for user ${matchedUser.id_user}`);
    }

    // ── Check if user already scanned today ─────────
    const [existingAbsensi] = await db.query(
      `SELECT id_absensi FROM absensi 
       WHERE user_id = ? 
       AND jadwal_id = (
         SELECT id_jadwal FROM jadwal_kuliah 
         WHERE CURRENT_TIME() BETWEEN jam_mulai AND jam_selesai 
         LIMIT 1
       )
       AND DATE(tanggal) = CURDATE()`,
      [matchedUser.id_user]
    );

    if (existingAbsensi.length > 0) {
      // Log duplicate scan
      await logIotActivity(device_id, 'duplicate', matchedUser.id_user, 'already_scanned_today');
      
      return res.json({
        status: 'duplicate',
        message: `User ${matchedUser.nama} already scanned today`,
        user_id: matchedUser.id_user,
        name: matchedUser.nama
      });
    }

    // ── Find active schedule ────────────────────────
    const [activeJadwal] = await db.query(
      `SELECT id_jadwal, jam_mulai 
       FROM jadwal_kuliah 
       WHERE CURRENT_TIME() BETWEEN jam_mulai AND jam_selesai 
       LIMIT 1`
    );

    if (activeJadwal.length === 0) {
      // Log: no active schedule
      await logIotActivity(device_id, 'no_schedule', matchedUser.id_user, 'no_active_schedule');
      
      return res.json({
        status: 'no_schedule',
        message: 'No active class schedule at this time',
        user_id: matchedUser.id_user,
        name: matchedUser.nama
      });
    }

    // ── Determine attendance status ─────────────────
    const jadwalId = activeJadwal[0].id_jadwal;
    const jamMulai = new Date(`1970-01-01T${activeJadwal[0].jam_mulai}Z`);
    const waktuAbsen = new Date(`1970-01-01T${new Date().toTimeString().split(' ')[0]}Z`);
    
    let statusAbsen = 'hadir';
    if (waktuAbsen > new Date(jamMulai.getTime() + 15 * 60000)) {
      statusAbsen = 'terlambat';
    }

    const lat = req.body.latitude || '-6.200000';
    const lng = req.body.longitude || '106.816666';
    const locName = req.body.location_name || 'Gedung Utama (IoT)';

    // ── Insert attendance record ────────────────────
    await db.query(
      `INSERT INTO absensi (user_id, jadwal_id, tanggal, waktu_datang, status, manual_mode, approval_status, approved_at, latitude, longitude, location_name) 
       VALUES (?, ?, NOW(), CURTIME(), ?, ?, ?, NOW(), ?, ?, ?)`,
      [matchedUser.id_user, jadwalId, statusAbsen, manualMode, approvalStatus, lat, lng, locName]
    );

    // ── Create notification ─────────────────────────
    await db.query(
      `INSERT INTO notifications (receiver_user_id, type, title, message, is_read) 
       VALUES (?, ?, ?, ?, FALSE)`,
      [
        matchedUser.id_user,
        'ATTENDANCE_SUCCESS',
        approvalStatus === 'APPROVED' ? 'Absensi IoT Berhasil' : (approvalStatus === 'REVIEW_REQUIRED' ? 'Absensi Menunggu Review' : 'Absensi Ditolak'),
        `Absensi AI (${confidencePct.toFixed(1)}%): ${statusAbsen === 'hadir' ? '✅ Hadir' : '⏰ Terlambat'} - ${approvalStatus}`
      ]
    );

    // ── DISABLE MANUAL PERMISSION after success ─────
    if (manualMode === 1) {
      await db.query(
        `UPDATE manual_scan_permission 
         SET enabled = 0 
         WHERE user_id = ? AND enabled = 1`,
        [matchedUser.id_user]
      );
      console.log(`[ManualScan] Auto-disabled permission for user ${matchedUser.id_user}`);
    }

    // ── Log successful scan ─────────────────────────
    await logIotActivity(
      device_id,
      'matched',
      matchedUser.id_user,
      statusAbsen + (manualMode ? ' (manual)' : '')
    );

    // ── Emit Realtime Event via Socket.io ───────────
    const attendanceData = {
      success: approvalStatus !== 'REJECTED',
      recognized: true,
      user_id: matchedUser.id_user,
      name: matchedUser.nama,
      kelas: matchedUser.kelas || 'Umum',
      photo: fileName,
      attendance_status: statusAbsen,
      approval_status: approvalStatus,
      confidence: confidencePct,
      mode: mode,
      device_id: device_id,
      timestamp: new Date().toISOString(),
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      location_name: locName
    };
    if (io) {
        // Emit to general channel for Dosen Dashboard
        io.emit('new_attendance', attendanceData);
        // Emit to specific user for Mahasiswa Dashboard
        io.emit('ATTENDANCE_SUCCESS', attendanceData);
    }

    // ── Success response ────────────────────────────
    return res.json({
      status: 'matched',
      message: 'Attendance recorded successfully',
      ...attendanceData
    });

  } catch (error) {
    console.error('[IoT] Error in recognizeFromIoT:', error);
    
    // Log error
    try {
      await logIotActivity(
        req.body.device_id || 'unknown',
        'error',
        null,
        error.message
      );
    } catch (logError) {
      console.error('[IoT] Failed to log error:', logError);
    }

    return res.status(500).json({
      status: 'error',
      message: 'Internal server error processing IoT recognition: ' + error.message
    });
  }
};

/**
 * Perform face recognition using image data
 * TODO: Replace with actual face recognition library
 * 
 * Current implementation: Placeholder for future ML integration
 * Options:
 *  - face-api.js
 *  - OpenCV
 *  - TensorFlow.js with face detection
 *  - AWS Rekognition
 */
async function performFaceRecognition(base64Image, deviceId) {
  try {
    const buffer = Buffer.from(base64Image, 'base64');

    // Get all users with verified face profiles
    const [registeredProfiles] = await db.query(
      `SELECT user_id, embedding_data 
       FROM face_profiles 
       WHERE verification_status = 'VERIFIED'`
    );

    const matchResult = await faceService.recognizeFace(buffer, registeredProfiles);

    if (!matchResult.success) {
        console.log('[IoT] Face recognition failed/spoof:', matchResult.message);
        return { matchedUser: null, matchResult };
    }

    const matchedUserId = matchResult.user_id;
    console.log(`[IoT] Match Found! User ID: ${matchedUserId}, Confidence: ${(matchResult.confidence * 100).toFixed(1)}%`);

    // Fetch user details including class
    const [users] = await db.query(
      `SELECT p.id_user, p.nama, IFNULL(k.nama_kelas, '-') as kelas 
       FROM pengguna p 
       LEFT JOIN mahasiswa_kelas mk ON p.id_user = mk.mahasiswa_id 
       LEFT JOIN kelas k ON mk.kelas_id = k.id_kelas 
       WHERE p.id_user = ?`,
      [matchedUserId]
    );

    if (users.length > 0) {
      return { matchedUser: users[0], matchResult };
    }

    return { matchedUser: null, matchResult: { success: false, message: 'User not found in DB' } };
  } catch (error) {
    console.error('[IoT] Face recognition error:', error);
    return { matchedUser: null, matchResult: { success: false, message: error.message } };
  }
}

/**
 * Log IoT activity for monitoring and debugging
 */
async function logIotActivity(deviceId, status, userId, details) {
  try {
    // Create logs table entry if exists
    await db.query(
      `INSERT INTO iot_logs (device_id, status, user_id, details, timestamp) 
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE timestamp = NOW()`,
      [deviceId, status, userId || null, details]
    ).catch(() => {
      // Table might not exist, log to console instead
      console.log(
        `[IoT Log] Device: ${deviceId} | Status: ${status} | User: ${userId} | Details: ${details}`
      );
    });
  } catch (error) {
    console.error('[IoT] Error logging activity:', error);
  }
}

/**
 * Health check endpoint for IoT devices
 */
exports.healthCheck = async (req, res) => {
  try {
    const { device_id } = req.body;

    if (!device_id) {
      return res.status(400).json({
        status: 'error',
        message: 'device_id is required'
      });
    }

    console.log(`[IoT] Health check from device: ${device_id}`);

    // Check if active schedule exists
    const [activeJadwal] = await db.query(
      `SELECT id_jadwal FROM jadwal_kuliah 
       WHERE CURRENT_TIME() BETWEEN jam_mulai AND jam_selesai 
       LIMIT 1`
    );

    // Update last_ping
    await db.query(
      `UPDATE kamera SET last_ping = NOW() WHERE ip_address = ? OR nama_kamera = ?`,
      [req.ip || req.connection.remoteAddress, device_id]
    );

    return res.json({
      status: 'ok',
      device_id: device_id,
      server_time: new Date().toISOString(),
      active_schedule: activeJadwal.length > 0,
      api_version: '1.0'
    });
  } catch (error) {
    console.error('[IoT] Health check error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Health check failed'
    });
  }
}

/**
 * Get IoT statistics (admin only)
 */
exports.getIoTStats = async (req, res) => {
  try {
    // Count recent IoT scans
    const [stats] = await db.query(
      `SELECT 
        COUNT(*) as total_scans,
        COUNT(CASE WHEN DATE(tanggal) = CURDATE() THEN 1 END) as today_scans,
        COUNT(CASE WHEN status = 'hadir' THEN 1 END) as on_time,
        COUNT(CASE WHEN status = 'terlambat' THEN 1 END) as late
       FROM absensi 
       WHERE tanggal >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );

    return res.json({
      status: 'success',
      data: stats[0]
    });
  } catch (error) {
    console.error('[IoT] Stats error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to get IoT statistics'
    });
  }
}
/**
 * Trigger ESP32-CAM to Take Photo from Dosen App
 * POST /api/iot/trigger-hardware
 */
exports.triggerHardwareScan = async (req, res) => {
  try {
    const { jadwal_id } = req.body;
    console.log(`[IoT Trigger] Menerima instruksi scan dari dosen untuk Jadwal ID: ${jadwal_id || 'Umum'}`);

    // 1. Ambil data IP Address ESP32-CAM yang aktif dari database
    // Disesuaikan dengan query tabel 'kamera' yang ada di fungsi healthCheck Anda
    const [activeCamera] = await db.query(
      `SELECT ip_address FROM kamera WHERE last_ping >= DATE_SUB(NOW(), INTERVAL 1 MINUTE) LIMIT 1`
    );

    // Tetapkan IP fallback jika perangkat keras belum terdaftar di database ruangan
    let esp32Ip = activeCamera.length > 0 ? activeCamera[0].ip_address : '192.168.1.50'; 
    
    // Pastikan format URL menyertakan protokol HTTP
    if (!esp32Ip.startsWith('http')) {
      esp32Ip = `http://${esp32Ip}`;
    }

    console.log(`[IoT Trigger] Mengirimkan sinyal perintah tangkap gambar ke alat: ${esp32Ip}/capture`);

    // 2. Kirim sinyal HTTP Request ke ESP32-CAM untuk memicu proses pengambilan foto
    // Menggunakan fetch bawaan Node.js (atau ganti dengan axios jika proyek Anda menggunakannya)
    const hardwareResponse = await fetch(`${esp32Ip}/capture`, { 
      method: 'GET',
      signal: AbortSignal.timeout(4000) // Batas waktu tunggu respons perangkat keras maks 4 detik
    });

    if (hardwareResponse.ok) {
      return res.json({
        status: 'success',
        message: 'Sinyal berhasil dikirim, alat ESP32-CAM sedang memproses pemindaian wajah.'
      });
    } else {
      throw new Error(`Alat merespon dengan status: ${hardwareResponse.status}`);
    }

  } catch (error) {
    console.error('[IoT Trigger] Gagal mengaktifkan perangkat keras:', error.message);
    
    // Fallback: Kirim event tiruan via Socket.io agar dosen tetap bisa melakukan simulasi saat alat offline
    const io = req.app.get('io');
    if (io) {
       console.log('[IoT Trigger] Memulai mode simulasi pengenalan wajah...');
       setTimeout(() => {
          io.emit('new_attendance', {
             user_id: 1,
             name: "Rian Hidayat",
             status: "HADIR",
             timestamp: new Date().toISOString()
          });
       }, 2000);
    }

    return res.json({
      status: 'simulation',
      message: 'Gagal terhubung ke modul fisik. Menjalankan simulasi pengenalan wajah otomatis...'
    });
  }
};
