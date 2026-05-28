require('dotenv').config();
const os = require('os');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const http = require('http');
const { Server } = require('socket.io');

const apiRoutes = require('./routes/api');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Attach io to req.app so routes can access it
app.set('io', io);

// --- Production Hardening ---
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" } // Allow images to be loaded by mobile app
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate Limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/auth/', limiter); // Apply specifically to auth routes for security

// Middleware
const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
};
app.use(cors(corsOptions));
// Built-in middleware for json with extended body limit to handle large base64 images
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

// Static route for uploads folder
app.use('/uploads', express.static('uploads'));

// Simple welcome route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Attendify Backend API' });
});

// Mount robust Express router
// This correctly mounts all routes defined in api.js under the '/api' prefix.
// The ESP32 route will become: /api/iot/recognize
app.use('/api', apiRoutes);
app.use('/api/analytics', analyticsRoutes);

const PORT = process.env.PORT || 5000;

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} sudah digunakan oleh proses lain!`);
        console.error(`   Jalankan perintah berikut untuk mematikannya:\n`);
        console.error(`   Get-NetTCPConnection -LocalPort ${PORT} -State Listen | ForEach-Object { taskkill /PID $_.OwningProcess /F }\n`);
        process.exit(1);
    } else {
        throw err;
    }
});

server.listen(PORT, '0.0.0.0', () => {
    // Get local network IP dynamically
    const interfaces = os.networkInterfaces();
    let networkIp = '127.0.0.1';
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                networkIp = iface.address;
                break;
            }
        }
        if (networkIp !== '127.0.0.1') break;
    }

    console.log(`Server is gracefully running on port ${PORT}.`);
    console.log(`Local:   http://localhost:${PORT}/api/`);
    console.log(`Network: http://${networkIp}:${PORT}/api/`);
    console.log(`ESP32:   http://${networkIp}:${PORT}/api/iot/recognize`);
    console.log('JWT_SECRET loaded:', process.env.JWT_SECRET ? 'YES' : 'NO');
    console.log('Socket.IO is running and ready for real-time connection');
});
