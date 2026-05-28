const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const accounts = [
    { email: 'nindykrw@gmail.com', password: 'nindy123' },
    { email: 'puput@gmail.com',    password: 'puput123' },
    { email: 'admin@gmail.com',    password: 'admin123' },
    // Coba juga email admin alternatif
    { email: 'admin@attendify.com', password: 'admin123' },
];

async function main() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'db_absensi',
    });

    console.log('\n=== FIX PASSWORDS ATTENDIFY ===\n');

    // Tampilkan semua akun dulu
    const [allUsers] = await conn.query(
        'SELECT id_user, nama, email, role FROM pengguna ORDER BY role, email'
    );
    console.log('Semua akun di database:');
    allUsers.forEach(u => console.log(`  [${u.role}] ${u.email} - ${u.nama}`));
    console.log('');

    // Reset password
    for (const acc of accounts) {
        const [rows] = await conn.query(
            'SELECT id_user, nama, email, role FROM pengguna WHERE email = ?',
            [acc.email]
        );

        if (rows.length === 0) {
            console.log(`⚠️  Tidak ditemukan: ${acc.email}`);
            continue;
        }

        const user = rows[0];
        const hash = await bcrypt.hash(acc.password, 10);
        await conn.query(
            'UPDATE pengguna SET password = ? WHERE id_user = ?',
            [hash, user.id_user]
        );
        console.log(`✅ Reset OK: ${user.email} (${user.role}) → password: ${acc.password}`);
    }

    console.log('\n=== SELESAI ===\n');
    await conn.end();
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
