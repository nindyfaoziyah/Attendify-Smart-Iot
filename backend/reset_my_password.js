/**
 * reset_my_password.js
 * Script interaktif untuk reset password tanpa mengubah nilai password.
 * Jalankan: node reset_my_password.js
 */

const readline = require('readline');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise(resolve => rl.question(prompt, resolve));
}

async function main() {
    console.log('\n=== RESET PASSWORD ATTENDIFY ===\n');

    const email = await question('Masukkan email akun: ');
    const password = await question('Masukkan password kamu (input tidak disembunyikan): ');

    if (!email.trim() || !password.trim()) {
        console.log('\n❌ Email atau password tidak boleh kosong.');
        rl.close();
        process.exit(1);
    }

    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'db_absensi',
        });

        // Cek apakah user ada
        const [rows] = await conn.query(
            'SELECT id_user, nama, email, role FROM pengguna WHERE email = ?',
            [email.trim()]
        );

        if (rows.length === 0) {
            console.log(`\n❌ Email "${email.trim()}" tidak ditemukan di database.`);
            await conn.end();
            rl.close();
            process.exit(1);
        }

        const user = rows[0];
        console.log(`\n✅ Akun ditemukan: ${user.nama} (${user.role})`);

        // Hash password baru
        const hashedPassword = await bcrypt.hash(password.trim(), 10);

        // Update DB
        await conn.query(
            'UPDATE pengguna SET password = ? WHERE id_user = ?',
            [hashedPassword, user.id_user]
        );

        console.log('\n✅ Password berhasil diperbarui!');
        console.log('───────────────────────────────');
        console.log(`Email   : ${user.email}`);
        console.log(`Password: ${password.trim()}`);
        console.log('───────────────────────────────');
        console.log('Sekarang coba login dengan password tersebut.\n');

        await conn.end();
        rl.close();
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Error:', err.message);
        rl.close();
        process.exit(1);
    }
}

main();
