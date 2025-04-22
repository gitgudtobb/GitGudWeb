const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { checkJwt, getUserFromAuth0 } = require('../middleware/auth0');
const { auth0Auth } = require('../controllers/authController');

// Auth0 kullanıcı profili bilgilerini getir - Auth0 middleware ile korumalı
router.get('/profile', checkJwt, getUserFromAuth0, async (req, res) => {
    try {
        console.log("getProfile çalışıyor...");
        
        // Kullanıcı bilgisini middleware'den al
        if (!req.user) {
            console.log("Auth0 kullanıcısı bulunamadı, demo kullanıcıya geçiliyor");
            
            // Sabit bir kullanıcı ID'si kullan (sadece geliştirme ortamında)
            const defaultUserId = "65c8a5e8b6a1b86d27a93a1b";
            let user = await User.findById(defaultUserId);
            
            // Eğer demo kullanıcı yoksa oluştur
            if (!user) {
                console.log("Demo kullanıcısı bulunamadı, yeni oluşturuluyor...");
                user = new User({
                    _id: defaultUserId,
                    username: "demo_user",
                    email: "demo@example.com",
                    name: "Demo Kullanıcı",
                    profilePicture: "https://ui-avatars.com/api/?name=Demo+User&background=random",
                    bio: "Bu bir demo kullanıcısıdır",
                    phone: "+90 555 123 4567",
                    address: "İstanbul, Türkiye",
                    authType: "auth0"
                });
                
                await user.save();
                console.log("Demo kullanıcısı oluşturuldu:", user._id);
            } else {
                console.log("Demo kullanıcısı bulundu:", user._id);
            }
            
            if (!user) {
                return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
            }
            
            // Demo kullanıcı bilgilerini döndür
            return res.json({
                _id: user._id,
                username: user.username,
                name: user.name,
                email: user.email,
                picture: user.profilePicture,
                bio: user.bio,
                phone: user.phone,
                address: user.address,
                createdAt: user.createdAt
            });
        }
        
        // Auth0 kullanıcısı bulundu, onun bilgilerini döndür
        console.log("Auth0 kullanıcısı profili gönderiliyor, ID:", req.user._id);
        
        // Kullanıcının gerçek email'ini göster
        const responseData = {
            _id: req.user._id,
            username: req.user.username,
            name: req.user.name,
            email: req.user.email,
            picture: req.user.profilePicture,
            bio: req.user.bio,
            phone: req.user.phone,
            address: req.user.address,
            createdAt: req.user.createdAt
        };
        
        // Gerçek e-posta varsa, onu göstermeye öncelik ver
        if (req.user.realEmail) {
            responseData.displayEmail = req.user.realEmail;
        }
        
        res.json(responseData);
    } catch (error) {
        console.error('Profil bilgisi getirme hatası:', error);
        res.status(500).json({ error: 'Profil bilgisi getirilirken bir hata oluştu', details: error.message });
    }
});

// Auth0 olmadan erişilebilen demo kullanıcı endpoint'i (geliştirme için)
router.get('/demo-profile', async (req, res) => {
    try {
        console.log("Demo profil çağrılıyor...");
        
        // Sabit bir kullanıcı ID'si kullan
        const defaultUserId = "65c8a5e8b6a1b86d27a93a1b";
        let user = await User.findById(defaultUserId);
        
        // Eğer kullanıcı yoksa oluştur
        if (!user) {
            console.log("Demo kullanıcı bulunamadı, oluşturuluyor...");
            user = new User({
                _id: defaultUserId,
                username: "demo_user",
                email: "demo@example.com",
                name: "Demo Kullanıcı",
                profilePicture: "https://ui-avatars.com/api/?name=Demo+User&background=random",
                bio: "Bu bir demo kullanıcısıdır",
                phone: "+90 555 123 4567",
                address: "İstanbul, Türkiye",
                authType: "auth0"
            });
            
            await user.save();
            console.log("Demo kullanıcısı oluşturuldu:", user._id);
        }
        
        res.json({
            _id: user._id,
            username: user.username,
            name: user.name,
            email: user.email,
            picture: user.profilePicture,
            bio: user.bio,
            phone: user.phone,
            address: user.address,
            createdAt: user.createdAt
        });
    } catch (error) {
        console.error('Demo profil bilgisi getirme hatası:', error);
        res.status(500).json({ error: 'Demo profil bilgisi getirilirken bir hata oluştu' });
    }
});

// Kullanıcı profil bilgilerini güncelle
router.put('/profile', checkJwt, getUserFromAuth0, auth0Auth.updateProfile);

// Tüm kullanıcıları listele (sadece admin için)
router.get('/all', checkJwt, getUserFromAuth0, async (req, res) => {
  try {
    // Kullanıcının admin olup olmadığını kontrol et
    if (!req.user || !req.user.roles.includes('admin')) {
      return res.status(403).json({ 
        message: 'Bu işlem için yetkiniz bulunmamaktadır'
      });
    }
    
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({ message: 'Kullanıcılar listelenemedi', error: error.message });
  }
});

module.exports = router;
