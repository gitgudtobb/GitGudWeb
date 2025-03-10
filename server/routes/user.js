const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { checkJwt, getUserFromAuth0 } = require('../middleware/auth0');

// Auth0 kullanıcı profili bilgilerini getir
router.get('/profile', checkJwt, getUserFromAuth0, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    
    // Hassas bilgileri çıkararak kullanıcı bilgilerini döndür
    const { password, ...userWithoutPassword } = req.user.toObject();
    
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Profil bilgileri alınamadı', error: error.message });
  }
});

// Kullanıcı profil bilgilerini güncelle
router.put('/profile', checkJwt, getUserFromAuth0, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    
    const { username, email } = req.body;
    const updates = {};
    
    if (username) updates.username = username;
    if (email) updates.email = email;
    
    // Kullanıcıyı güncelle
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    const { password, ...userWithoutPassword } = updatedUser.toObject();
    
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Profil güncellenemedi', error: error.message });
  }
});

// Tüm kullanıcıları listele (sadece test için)
router.get('/all', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({ message: 'Kullanıcılar listelenemedi', error: error.message });
  }
});

// Kullanıcı oluştur (test için)
router.post('/create-test', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Kullanıcı zaten var mı kontrol et
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Bu email veya kullanıcı adı zaten kullanılıyor' 
      });
    }
    
    // Yeni kullanıcı oluştur
    const newUser = await User.create({
      username,
      email,
      password
    });
    
    const { password: pwd, ...userWithoutPassword } = newUser.toObject();
    
    res.status(201).json({
      message: 'Test kullanıcısı başarıyla oluşturuldu',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ 
      message: 'Kullanıcı oluşturulamadı', 
      error: error.message 
    });
  }
});

module.exports = router;
