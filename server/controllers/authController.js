const User = require('../models/User');

// Auth0 kimlik doğrulama için controller fonksiyonları
const auth0Auth = {
  // Auth0 kullanıcı profili
  getProfile: async (req, res) => {
    try {
      console.log('getProfile çalışıyor...');
      console.log('req.user:', req.user ? 'Mevcut' : 'Yok');
      
      if (!req.user) {
        console.log('Kullanıcı bulunamadı!');
        return res.status(404).json({ 
          message: 'Kullanıcı bulunamadı',
          authType: 'auth0'
        });
      }
      
      console.log('Kullanıcı bulundu, ID:', req.user._id);
      
      // Hassas bilgileri çıkararak kullanıcı bilgilerini döndür
      const userObj = req.user.toObject ? req.user.toObject() : req.user;
      const { password, ...userWithoutPassword } = userObj;
      
      // Gerçek e-posta varsa onu kullan, yoksa normal e-postayı kullan
      const responseData = {
        ...userWithoutPassword,
        authType: 'auth0'
      };
      
      // Eğer gerçek e-posta varsa, görüntüleme için onu kullan
      if (req.user.realEmail) {
        responseData.displayEmail = req.user.realEmail;
      }
      
      res.json(responseData);
    } catch (error) {
      console.error('Auth0 profile error:', error);
      res.status(500).json({ 
        message: 'Profil bilgileri alınamadı', 
        error: error.message,
        authType: 'auth0'
      });
    }
  },
  
  // Auth0 kullanıcı profil güncelleme
  updateProfile: async (req, res) => {
    try {
      const userId = req.user._id;
      const { username, name, bio, phone, address } = req.body;
      
      // Email güncellemesini kaldırdık - Auth0 ile senkronizasyon sorunlarını önlemek için
      
      // Kullanıcı adı değiştirilmişse, önce benzersiz olup olmadığını kontrol et
      if (username && username !== req.user.username) {
        const existingUser = await User.findOne({ username });
        
        // Eğer başka bir kullanıcı aynı username'i kullanıyorsa hata dön
        if (existingUser && existingUser._id.toString() !== userId.toString()) {
          return res.status(400).json({ 
            error: 'Kullanıcı adı zaten kullanımda',
            field: 'username',
            message: 'Lütfen farklı bir kullanıcı adı seçin'
          });
        }
      }
      
      // Güncelleme verilerini hazırla
      const updateData = {};
      
      // Sadece gönderilen alanları güncelle, boş alanları gönderme
      if (username) updateData.username = username;
      if (name) updateData.name = name;
      if (bio !== undefined) updateData.bio = bio;
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      
      // Bio alanında e-posta varsa, realEmail alanına kaydet
      if (bio && bio.includes('@') && bio.includes('.')) {
        // Email formatını kontrol et (basit bir kontrol)
        const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/;
        const match = bio.match(emailRegex);
        
        if (match) {
          const possibleEmail = match[0];
          updateData.realEmail = possibleEmail;
          console.log(`Bio'dan olası e-posta adresi bulundu: ${possibleEmail}`);
        }
      }
      
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!updatedUser) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }
      
      const responseData = {
        _id: updatedUser._id,
        username: updatedUser.username,
        name: updatedUser.name,
        email: updatedUser.email, // Email değiştirilemiyor, sadece gösteriliyor
        picture: updatedUser.profilePicture,
        bio: updatedUser.bio,
        phone: updatedUser.phone,
        address: updatedUser.address,
        createdAt: updatedUser.createdAt
      };
      
      // Eğer gerçek e-posta varsa, görüntüleme için onu kullan
      if (updatedUser.realEmail) {
        responseData.displayEmail = updatedUser.realEmail;
      }
      
      res.json(responseData);
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      res.status(500).json({ error: 'Profil güncellenirken bir hata oluştu', details: error.message });
    }
  },
};

module.exports = {
  auth0Auth
};
