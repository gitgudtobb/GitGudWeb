const express = require('express');
const router = express.Router();
const axios = require('axios');
const Analysis = require('../models/Analysis');

// Python AI API URL
const AI_API_URL = 'http://localhost:5002';

// Hasar analizi endpoint'i
router.post('/damage-analysis', async (req, res) => {
    try {
        console.log('Hasar analizi isteği alındı');
        
        // İstemciden gelen görüntüleri al
        const { preImage, postImage, location } = req.body;
        
        if (!preImage || !postImage) {
            return res.status(400).json({ 
                error: 'Afet öncesi ve sonrası görüntüler gereklidir' 
            });
        }
        
        console.log('Python API\'sine istek gönderiliyor...');
        // Python API'sine istek gönder
        const response = await axios.post(`${AI_API_URL}/analyze`, {
            preImage,
            postImage
        });
        
        console.log('AI analiz sonuçları alındı:', {
            image_id: response.data.image_id,
            total_buildings: response.data.total_buildings,
            statistics: response.data.statistics,
            has_masked_image: !!response.data.masked_image,
            buildings_count: response.data.buildings ? response.data.buildings.length : 0
        });
        
        // Kullanıcı ID'sini al
        let userId;
        try {
            // Önce req.user._id'yi kontrol et
            if (req.user && req.user._id) {
                userId = req.user._id;
            } 
            // Yoksa sabit bir ID kullan
            else {
                userId = "65c8a5e8b6a1b86d27a93a1b"; // Sabit test kullanıcısı
            }
            console.log('Kullanıcı ID:', userId);
        } catch (userError) {
            console.error('Kullanıcı ID alınırken hata:', userError);
            userId = "65c8a5e8b6a1b86d27a93a1b"; // Hata durumunda yedek ID
        }
        
        // Veri doğrulama - AI sonuçlarının geçerli olduğundan emin ol
        if (!response.data.buildings || !Array.isArray(response.data.buildings)) {
            console.error('Geçersiz AI sonuçları: buildings dizisi bulunamadı');
            return res.status(500).json({
                error: 'AI analiz sonuçları geçersiz format',
                details: 'Bina verileri bulunamadı'
            });
        }
        
        // Modelden gelen yanıtı konsola yazdır
        console.log('Modelden gelen yanıt:', JSON.stringify(response.data));

        // Analiz sonuçlarını veritabanına kaydet
        const newAnalysis = new Analysis({
            user: userId,
            location: location ? {
                type: 'Point',
                coordinates: [location.longitude || 0, location.latitude || 0],
                address: location.address || ''
            } : {
                type: 'Point',
                coordinates: [0, 0]
            },
            // Modelden gelen çıktıyı doğrudan kaydet
            image_id: response.data.image_id,
            masked_image: response.data.masked_image,
            buildings: response.data.buildings,
            statistics: response.data.statistics || {
                'no-damage': 0,
                'minor-damage': 0,
                'major-damage': 0,
                'destroyed': 0
            },
            total_buildings: response.data.total_buildings || 0,
            name: `Hasar Analizi ${new Date().toLocaleDateString()}`,
            status: 'completed'
        });
        
        // Kaydedilecek analiz nesnesini konsola yazdır
        console.log('Kaydedilecek analiz:', JSON.stringify({
            image_id: newAnalysis.image_id,
            masked_image: newAnalysis.masked_image ? 'Base64 görüntü (uzunluk: ' + (newAnalysis.masked_image?.length || 0) + ')' : 'Yok',
            buildings: newAnalysis.buildings ? `${newAnalysis.buildings.length} bina` : 'Yok',
            statistics: newAnalysis.statistics,
            total_buildings: newAnalysis.total_buildings
        }));
        
        console.log('Analiz kaydediliyor...');
        try {
            await newAnalysis.save();
            console.log('Analiz başarıyla kaydedildi, ID:', newAnalysis._id);
        } catch (saveError) {
            console.error('Analiz kaydetme hatası:', saveError);
            // Hata detaylarını incele
            if (saveError.name === 'ValidationError') {
                console.error('Doğrulama hatası detayları:', saveError.errors);
            }
            throw saveError; // Hatayı yeniden fırlat
        }
        
        // Sonuçları ve kaydedilen analiz ID'sini döndür
        return res.json({
            ...response.data,
            saved: true,
            analysisId: newAnalysis._id
        });
    } catch (error) {
        console.error('Hasar analizi hatası:', error.message);
        
        // API'ye bağlanılamadıysa özel hata mesajı
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ 
                error: 'AI servisi şu anda çalışmıyor. Lütfen Python API\'sinin çalıştığından emin olun.' 
            });
        }
        
        // Diğer hatalar için genel hata mesajı
        return res.status(500).json({ 
            error: 'Hasar analizi sırasında bir hata oluştu',
            details: error.message
        });
    }
});

// AI sağlık kontrolü
router.get('/health', async (req, res) => {
    try {
        const response = await axios.get(`${AI_API_URL}/health`);
        return res.json(response.data);
    } catch (error) {
        console.error('AI sağlık kontrolü hatası:', error.message);
        return res.status(503).json({ 
            status: 'unhealthy',
            error: 'AI servisi şu anda çalışmıyor'
        });
    }
});

// Kullanıcının AI analizlerini getir
router.get('/analyses', async (req, res) => {
    try {
        // Sabit bir kullanıcı ID'si kullan (gerçek uygulamada req.user._id olacak)
        const userId = req.user ? req.user._id : "65c8a5e8b6a1b86d27a93a1b";
        console.log('Analizler getiriliyor, kullanıcı ID:', userId);
        
        // Kullanıcının AI analizlerini bul - Yeni model yapısına göre sorgu
        const analyses = await Analysis.find({ 
            user: userId,
            image_id: { $exists: true } // Sadece AI analizi olanları getir
        })
        .sort({ createdAt: -1 })
        .select('name image_id statistics total_buildings masked_image location createdAt')
        .limit(20);
        
        console.log(`${analyses.length} analiz bulundu`);
        return res.json(analyses);
    } catch (error) {
        console.error('AI analizlerini getirme hatası:', error.message);
        return res.status(500).json({ 
            error: 'AI analizlerini getirirken bir hata oluştu'
        });
    }
});

// Belirli bir AI analizini getir
router.get('/analyses/:id', async (req, res) => {
    try {
        // Sabit bir kullanıcı ID'si kullan (gerçek uygulamada req.user._id olacak)
        const userId = req.user ? req.user._id : "65c8a5e8b6a1b86d27a93a1b";
        console.log(`Analiz getiriliyor, ID: ${req.params.id}, kullanıcı: ${userId}`);
        
        // Analizi bul - Yeni model yapısına göre sorgu
        const analysis = await Analysis.findOne({
            _id: req.params.id,
            user: userId,
            image_id: { $exists: true } // Sadece AI analizi olanları getir
        });
        
        if (!analysis) {
            console.log(`Analiz bulunamadı: ${req.params.id}`);
            return res.status(404).json({ error: 'Analiz bulunamadı' });
        }
        
        console.log(`Analiz bulundu: ${analysis._id}`);
        return res.json(analysis);
    } catch (error) {
        console.error('AI analizi getirme hatası:', error.message);
        return res.status(500).json({ 
            error: 'AI analizini getirirken bir hata oluştu'
        });
    }
});

// Temizleme endpoint'i
router.post('/cleanup', async (req, res) => {
    try {
        const response = await axios.post(`${AI_API_URL}/cleanup`);
        return res.json(response.data);
    } catch (error) {
        console.error('Temizleme hatası:', error.message);
        return res.status(500).json({ 
            error: 'Geçici dosyaları temizlerken bir hata oluştu'
        });
    }
});

module.exports = router;
