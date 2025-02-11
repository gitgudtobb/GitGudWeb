const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Analysis = require('../models/Analysis');
const auth = require('../middleware/auth');

// Dosya yükleme konfigürasyonu
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Sadece resim dosyaları yüklenebilir!'));
        }
    }
});

// Test endpoint
router.get('/test', (req, res) => {
    res.json({ message: 'Analysis routes are working!' });
});

// Kullanıcının analizlerini getir
router.get('/my', auth, async (req, res) => {
    try {
        const analyses = await Analysis.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(analyses);
    } catch (error) {
        console.error('Analizleri getirme hatası:', error);
        res.status(500).json({ error: 'Analizler getirilirken bir hata oluştu' });
    }
});

// Yeni analiz oluştur
router.post('/', auth, upload.fields([
    { name: 'beforeImage', maxCount: 1 },
    { name: 'afterImage', maxCount: 1 }
]), async (req, res) => {
    try {
        console.log('Received files:', req.files);
        console.log('Received body:', req.body);

        if (!req.files || !req.files.beforeImage || !req.files.afterImage) {
            return res.status(400).json({ error: 'Her iki fotoğraf da gerekli' });
        }

        // Basit hasar analizi simülasyonu
        const damageAnalysis = {
            damagePercentage: Math.floor(Math.random() * 100),
            severity: ['Hafif', 'Orta', 'Orta-Ağır', 'Ağır'][Math.floor(Math.random() * 4)],
            recommendations: [
                'Yapısal değerlendirme gerekli',
                'Detaylı mühendislik incelemesi önerilir',
                'Acil güçlendirme çalışması gerekebilir'
            ]
        };

        const analysis = new Analysis({
            userId: req.user._id,
            location: JSON.parse(req.body.location),
            images: {
                before: {
                    url: req.files.beforeImage[0].path,
                    timestamp: new Date()
                },
                after: {
                    url: req.files.afterImage[0].path,
                    timestamp: new Date()
                }
            },
            results: {
                damagePercentage: damageAnalysis.damagePercentage,
                severity: damageAnalysis.severity,
                recommendations: damageAnalysis.recommendations,
                processedImages: {
                    difference: req.files.afterImage[0].path,
                    highlighted: req.files.afterImage[0].path
                }
            },
            metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {},
            status: 'completed'
        });

        await analysis.save();
        res.status(201).json(analysis);
    } catch (error) {
        console.error('Analiz oluşturma hatası:', error);
        res.status(500).json({ error: 'Analiz oluşturulurken bir hata oluştu: ' + error.message });
    }
});

// Belirli bir analizi getir
router.get('/:id', auth, async (req, res) => {
    try {
        const analysis = await Analysis.findOne({
            _id: req.params.id,
            userId: req.user._id
        });
        
        if (!analysis) {
            return res.status(404).json({ error: 'Analiz bulunamadı' });
        }
        
        res.json(analysis);
    } catch (error) {
        console.error('Analiz getirme hatası:', error);
        res.status(500).json({ error: 'Analiz getirilirken bir hata oluştu' });
    }
});

// Konum bazlı analiz arama
router.get('/location/nearby', auth, async (req, res) => {
    try {
        const { longitude, latitude, maxDistance = 1000 } = req.query;

        const analyses = await Analysis.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                    },
                    $maxDistance: parseInt(maxDistance)
                }
            }
        }).limit(20);

        res.json(analyses);
    } catch (error) {
        res.status(500).json({ error: 'Yakındaki analizler aranırken bir hata oluştu' });
    }
});

module.exports = router;
