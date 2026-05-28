const path = require('path');
const fs = require('fs');
const db = require('./config/db');
const faceService = require('./services/faceService');

async function forceRegister() {
    try {
        const userId = 46; // Tetap Senyum
        const imagePath = path.join(__dirname, 'uploads', 'iot-captures', 'ESP32CAM_01-1779772095938-auto.jpg');
        
        console.log('Reading image:', imagePath);
        const imageBuffer = fs.readFileSync(imagePath);
        
        console.log('Validating and encoding face...');
        const quality = await faceService.validateImageQuality(imageBuffer);
        
        if (!quality.isValid) {
            console.error('Failed to validate image:', quality.error);
            process.exit(1);
        }
        
        // Ensure vector is Float32Array and then Array
        let descriptor = quality.detection.descriptor;
        
        // Normalize L2
        let sum = 0;
        for (let i = 0; i < descriptor.length; i++) {
            sum += descriptor[i] * descriptor[i];
        }
        const norm = Math.sqrt(sum);
        const normalized = new Float32Array(descriptor.length);
        if (norm !== 0) {
            for (let i = 0; i < descriptor.length; i++) {
                normalized[i] = descriptor[i] / norm;
            }
        }
        
        const embeddingJson = JSON.stringify(Array.from(normalized));
        const fileName = `student_manual_${Date.now()}.png`;
        
        // Copy image to faces directory
        fs.copyFileSync(imagePath, path.join(__dirname, 'uploads', 'faces', fileName));
        
        console.log('Inserting to database...');
        await db.query(`
            INSERT INTO face_profiles (user_id, embedding_data, face_image, verification_status, confidence_threshold, last_trained)
            VALUES (?, ?, ?, 'VERIFIED', 0.99, NOW())
            ON DUPLICATE KEY UPDATE 
            embedding_data = VALUES(embedding_data),
            face_image = VALUES(face_image),
            verification_status = 'VERIFIED'
        `, [userId, embeddingJson, fileName]);
        
        await db.query('UPDATE pengguna SET is_face_verified = 1, status = "Y" WHERE id_user = ?', [userId]);
        
        console.log('SUCCESS! Face registered manually for user 46 (Tetap Senyum).');
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

forceRegister();
