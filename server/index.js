const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const app = express();

// CORS ayarları
app.use(cors({
    origin: ['http://localhost:5173', 'https://earthengine.googleapis.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type', 'Authorization']
}));

// Diğer middleware'ler
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));
app.use(morgan('dev')); // Loglama için
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Uploads klasörünü oluştur
const fs = require('fs');
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gitgudweb', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB bağlantısı başarılı'))
.catch(err => console.error('MongoDB bağlantı hatası:', err));

// Geçici auth middleware (development için)
app.use((req, res, next) => {
    req.user = { _id: '65c8a5e8b6a1b86d27a93a1b' }; // Geçici kullanıcı ID'si
    next();
});

// Routes
const analysisRoutes = require('./routes/analysis');
const earthEngineRoutes = require('./routes/earth-engine');

app.use('/api/analysis', analysisRoutes);
app.use('/api/earth-engine', earthEngineRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to GitGudWeb API!' });
});

// Test endpoint'i
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!' });
});

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({ message: 'Route bulunamadı' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        message: 'Bir şeyler ters gitti!', 
        error: err.message 
    });
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
