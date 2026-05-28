const db = require('./config/db');

async function run() {
    try {
        const [user] = await db.query(`
            SELECT id_user, nama, email, role, kelas, prodi 
            FROM pengguna 
            WHERE nama LIKE '%Puput%'
        `);
        console.log("=== DATA PENGGUNA PUPUT ===");
        console.log(JSON.stringify(user, null, 2));
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
