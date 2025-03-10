const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const User = require('../models/User');

// Auth0 middleware - token doğrulama
const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
  credentialsRequired: false // Token olmasa da devam et (geliştirme için)
});

// Kullanıcı bilgilerini MongoDB'den alıp req.user'a ekleyen middleware
const getUserFromAuth0 = async (req, res, next) => {
  try {
    console.log('Auth0 middleware çalışıyor...');
    console.log('Token bilgisi:', req.auth ? 'Token var' : 'Token yok');
    
    // Token yoksa veya geçersizse, kullanıcı bilgisi ekleme ve devam et
    if (!req.auth || !req.auth.sub) {
      console.log('Token yok veya geçersiz, devam ediliyor...');
      return next();
    }

    const auth0Id = req.auth.sub;
    console.log('Auth0 ID:', auth0Id);
    console.log('Auth0 Email:', req.auth.email);
    
    // Auth0 ID'sine göre kullanıcıyı bul veya oluştur
    let user = await User.findOne({ auth0Id });
    console.log('MongoDB\'de kullanıcı bulundu mu?', user ? 'Evet' : 'Hayır');
    
    if (!user && req.auth.email) {
      // Kullanıcı yoksa ve email bilgisi varsa, email'e göre ara
      console.log('Auth0 ID ile kullanıcı bulunamadı, email ile aranıyor:', req.auth.email);
      user = await User.findOne({ email: req.auth.email });
      
      if (user) {
        // Kullanıcı bulunduysa auth0Id'sini güncelle
        console.log('Email ile kullanıcı bulundu, auth0Id güncelleniyor...');
        user.auth0Id = auth0Id;
        await user.save();
        console.log('Kullanıcı güncellendi:', user);
      } else {
        // Kullanıcı yoksa yeni oluştur
        console.log('Kullanıcı bulunamadı, yeni kullanıcı oluşturuluyor...');
        const newUserData = {
          auth0Id,
          email: req.auth.email,
          username: req.auth.nickname || req.auth.email.split('@')[0],
          // Auth0 ile giriş yapıldığı için password alanı boş bırakılabilir
          password: Math.random().toString(36).slice(-10) // Rastgele şifre
        };
        console.log('Yeni kullanıcı verileri:', newUserData);
        
        user = await User.create(newUserData);
        console.log('Yeni kullanıcı oluşturuldu:', user);
      }
    }
    
    if (user) {
      req.user = user;
      console.log('req.user ayarlandı:', req.user);
    } else {
      console.log('Kullanıcı bulunamadı veya oluşturulamadı!');
    }
    
    next();
  } catch (error) {
    console.error('Auth0 user processing error:', error);
    next(error);
  }
};

module.exports = {
  checkJwt,
  getUserFromAuth0
};
