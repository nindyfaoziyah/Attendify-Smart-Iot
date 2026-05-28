const db = require('../config/db');

exports.getAllMataKuliah = async (req, res) => {
    try {
        const [mataKuliah] = await db.query('SELECT * FROM mata_kuliah');
        res.json({ status: 'success', data: mataKuliah });
    } catch (error) {
        console.error('Error fetching mata kuliah:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};
