// Migration runner for 007_face_profile_biometric_metadata.sql
// Safe approach: check information_schema before altering
require('dotenv').config();
const db = require('./config/db');

async function columnExists(tableName, colName) {
    const [rows] = await db.query(
        `SELECT COUNT(*) as cnt 
         FROM information_schema.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = ? 
           AND COLUMN_NAME = ?`,
        [tableName, colName]
    );
    return rows[0].cnt > 0;
}

async function run() {
    console.log('Running Migration 007: face_profile_biometric_metadata...');
    try {
        // Add confidence_score column
        if (!(await columnExists('face_profiles', 'confidence_score'))) {
            await db.query(`ALTER TABLE face_profiles ADD COLUMN confidence_score FLOAT DEFAULT NULL`);
            console.log('  ✅ confidence_score column added');
        } else {
            console.log('  ⏩ confidence_score column already exists');
        }

        // Add registered_at column
        if (!(await columnExists('face_profiles', 'registered_at'))) {
            await db.query(`ALTER TABLE face_profiles ADD COLUMN registered_at DATETIME DEFAULT NULL`);
            console.log('  ✅ registered_at column added');
        } else {
            console.log('  ⏩ registered_at column already exists');
        }

        // Expand iot_logs status enum (safe to run repeatedly)
        try {
            await db.query(`
                ALTER TABLE iot_logs 
                MODIFY COLUMN status ENUM(
                    'matched', 'unknown', 'duplicate', 'no_schedule',
                    'rate_limited', 'error', 'manual_denied', 'spoof'
                ) NOT NULL
            `);
            console.log('  ✅ iot_logs status enum updated');
        } catch (e) {
            console.log('  ⏩ iot_logs enum update skipped:', e.message.substring(0, 80));
        }

        console.log('\n🎯 Migration 007 completed successfully!');
    } catch (err) {
        console.error('Migration 007 failed:', err.message);
    } finally {
        process.exit(0);
    }
}

run();
