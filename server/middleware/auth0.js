const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const User = require('../models/User');

// Auth0 middleware - token doğrulama
// Auth0 token doğrulama middleware'i - geliştirme modunda opsiyonel
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
  credentialsRequired: process.env.NODE_ENV === 'production' // Sadece production'da zorunlu
});

// Token hatalarını yakalayan middleware
const handleJwtErrors = (err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    console.log('Token hatası yakalandı:', err.message);
    
    // Geliştirme modunda test için sabit bir kullanıcı ID'si kullan
    if (process.env.NODE_ENV !== 'production') {
      console.log('Geliştirme modu: Test kullanıcısı kullanılıyor');
      req.auth = { sub: 'test-user' };
      return next();
    }
    
    return res.status(401).json({
      message: 'Kimlik doğrulama başarısız',
      error: err.message
    });
  }
  return next(err);
};

// Kullanıcı bilgilerini MongoDB'den alıp req.user'a ekleyen middleware
const getUserFromAuth0 = async (req, res, next) => {
  try {
    console.log('Auth0 middleware çalışıyor...');
    
    // Token yoksa veya geçersizse, geliştirme modunda test kullanıcısı kullan
    if (!req.auth || !req.auth.sub) {
      console.log('Token bilgisi: Token yok veya geçersiz');
      
      // Geliştirme modunda test kullanıcısı kullan
      if (process.env.NODE_ENV !== 'production') {
        console.log('Geliştirme modu: Test kullanıcısı kullanılıyor');
        req.auth = { sub: 'google-oauth2|103660072598804534880' };
      } else {
        return res.status(401).json({
          message: 'Kimlik doğrulama başarısız',
          error: 'Geçersiz token'
        });
      }
    }

    // Eğer zaten bu istek için kullanıcı bilgisi işlendiyse, tekrar işleme
    if (req.user) {
      console.log('Kullanıcı zaten işlenmiş, middleware atlanıyor');
      return next();
    }

    console.log('Token bilgisi:', 'Token var');
    console.log('req.auth:', JSON.stringify(req.auth, null, 2));

    const auth0Id = req.auth.sub;
    console.log('Auth0 ID:', auth0Id);
    
    // Kullanıcı tipi ve gerçek e-posta bilgisini hazırla
    let realUserEmail = '';
    
    // DEBUG: Token içeriğini tamamen yazdır
    console.log('--------- AUTH0 TOKEN DEBUG ---------');
    console.log('Tüm token içeriği:', JSON.stringify(req.auth, null, 2));
    
    // Google OAuth için özel durum
    if (auth0Id.startsWith('google-oauth2|')) {
      // Tipik Google OAuth alanları
      const possibleEmailFields = [
        'email',
        'email_verified',
        'picture',
        'name',
        'nickname',
        'given_name',
        'family_name'
      ];
      
      console.log('Google OAuth kullanıcısı için alanlar:');
      possibleEmailFields.forEach(field => {
        console.log(`${field}: ${req.auth[field]}`);
      });
      
      // AUTH0 kullanımı için auth0 namespace
      const auth0Namespace = process.env.AUTH0_DOMAIN || 'dev-6amkhp4hccjhqjwi.us.auth0.com';
      console.log(`Auth0 namespace alanları (${auth0Namespace}):`);
      Object.keys(req.auth).forEach(key => {
        if (key.includes(auth0Namespace)) {
          console.log(`${key}: ${req.auth[key]}`);
        }
      });
    }
    
    // Google OAuth için özel e-posta algılama mantığı
    if (auth0Id.startsWith('google-oauth2|')) {
      // Google OAuth için özel algılama - Auth0 metadata içinden alabilir veya
      // lokalde saklanan kullanıcı profili içinde olabilir
      
      // Önemli: Google OAuth için kullanıcının e-postasını alacağız
      // Öncelikle Auth0 Management API ile kullanıcı profilini almayı deneyelim
      // Ya da Auth0 tarafından gönderilen ektralarda arayabiliriz
      
      // Burada Auth0 token içinde OAuth yetkilendirmesi var mı kontrol ediyoruz
      if (req.auth.email) {
        realUserEmail = req.auth.email;
        console.log('Google OAuth - Auth0 email alanından email alındı:', realUserEmail);
      } 
      // Bazen email bilgisi picture alanında gizli olabilir
      else if (req.auth.picture && req.auth.picture.includes('=')) {
        // Google'ın avatar URL'lerinde çoğunlukla email görülebilir
        // örnek: https://lh3.googleusercontent.com/a/ACg8ocLFN8bBHe-p9f-M1LHdJ7nHl8ISzcYNGGHBDRgVoeVa=s96-c
        const emailPart = req.auth.picture.split('=')[0].split('/').pop();
        if (emailPart && emailPart.length > 5) {
          realUserEmail = `${emailPart}@gmail.com`;
          console.log('Google OAuth - Avatar URL\'den email tahmin edildi:', realUserEmail);
        }
      }
      // Basit dönüştürme: auth0Id içindeki Google ID kısmını alıp gmail.com ekleyebiliriz
      // NOT: Bu gerçek e-posta olmayabilir ancak görüntüleme için bir örnek
      else {
        const googleId = auth0Id.split('|')[1];
        if (googleId) {
          realUserEmail = `${googleId}@gmail.com`;
          console.log('Google OAuth - ID\'den email oluşturuldu:', realUserEmail);
        }
      }
    }
    // Normal Auth0 kullanıcıları için standart e-posta algılama
    else {
      if (req.auth.email) {
        realUserEmail = req.auth.email;
        console.log('Auth0 kullanıcısı için email tespit edildi:', realUserEmail);
      } 
      // Eğer email bulunamadıysa, diğer kaynaklardan dene
      else {
        // Özel Auth0 alanlarını kontrol et
        if (req.auth[`${process.env.AUTH0_DOMAIN}/email`]) {
          realUserEmail = req.auth[`${process.env.AUTH0_DOMAIN}/email`];
          console.log('Auth0 domain özel alanından email tespit edildi:', realUserEmail);
        } 
        // Emails dizisini kontrol et
        else if (req.auth.emails && req.auth.emails.length > 0) {
          realUserEmail = req.auth.emails[0].value || req.auth.emails[0];
          console.log('Auth0 emails dizisinden email tespit edildi:', realUserEmail);
        }
      }
    }

    // Kullanıcı tipine göre log mesajı göster
    if (auth0Id.startsWith('google-oauth2|')) {
      console.log('Google OAuth kullanıcısı tespit edildi, e-posta:', realUserEmail || 'Bulunamadı');
    } else if (auth0Id.startsWith('auth0|')) {
      console.log('Auth0 standart kullanıcısı tespit edildi, e-posta:', realUserEmail || 'Bulunamadı');
    }
    
    // Auth0 ID'sine göre kullanıcıyı bul
    let user = await User.findOne({ auth0Id });
    console.log('MongoDB\'de kullanıcı bulundu mu?', user ? 'Evet' : 'Hayır');
    
    // Kullanıcı yoksa yeni oluştur
    if (!user) {
      console.log('Kullanıcı bulunamadı, yeni kullanıcı oluşturuluyor...');
      
      // Önce email ile kontrol et (eğer email varsa)
      if (req.auth.email) {
        const existingUser = await User.findOne({ email: req.auth.email });
        if (existingUser) {
          console.log('Email ile kullanıcı bulundu, auth0Id güncelleniyor...');
          existingUser.auth0Id = auth0Id;
          existingUser.authType = 'auth0';
          
          // Auth0 profilinden gelen ek bilgileri güncelle
          if (req.auth.nickname) existingUser.username = req.auth.nickname;
          if (req.auth.name) existingUser.name = req.auth.name;
          if (req.auth.picture) existingUser.profilePicture = req.auth.picture;
          
          await existingUser.save();
          user = existingUser;
          console.log('Kullanıcı güncellendi:', user._id);
        }
      }
      
      // Hala kullanıcı bulunamadıysa yeni oluştur
      if (!user) {
        // Auth0 profilinden kullanıcı adı ve email bilgilerini al
        const nickname = req.auth.nickname || '';
        
        // Gerçek e-posta adresini al - önce config sonra standart alanlardan
        let email = '';
        let realEmail = '';
        
        // Kullanıcı tipine göre gerçek e-posta adresini kullan
        if (realUserEmail) {
          console.log('Kullanıcı oluşturulurken gerçek e-posta kullanılıyor:', realUserEmail);
          email = `temp-${auth0Id}@example.com`; // Auth0 entegrasyonu için gerekli
          realEmail = realUserEmail; // Gerçek e-posta
        }
        // Farklı alanlarda e-posta bilgisi olabilir
        else if (req.auth.email) {
          email = req.auth.email;
          realEmail = req.auth.email;
        } else if (req.auth[`${process.env.AUTH0_DOMAIN}/email`]) {
          // Özel Auth0 alanından e-posta bilgisini al
          email = req.auth[`${process.env.AUTH0_DOMAIN}/email`];
          realEmail = email;
        } else if (req.auth.emails && req.auth.emails.length > 0) {
          // Emails dizisinden e-posta bilgisini al
          email = req.auth.emails[0].value || req.auth.emails[0];
          realEmail = email;
        }
        
        // Bio alanına girilen e-posta varsa, gerçek e-posta olarak kullan
        if (req.body && req.body.bio && req.body.bio.includes('@')) {
          realEmail = req.body.bio;
        }
        
        const username = nickname || (email ? email.split('@')[0] : `user_${Date.now()}`);
        
        console.log('Yeni kullanıcı için bilgiler:', {
          username,
          email,
          realEmail,
          auth0Id
        });
        
        const newUserData = {
          auth0Id,
          email: email,
          realEmail: realEmail || email, // Gerçek e-posta varsa onu kullan, yoksa standart e-postayı kullan
          username: username,
          name: req.auth.name || '',
          profilePicture: req.auth.picture || '',
          authType: 'auth0'
        };
        
        try {
          user = await User.create(newUserData);
          console.log('Yeni kullanıcı oluşturuldu:', user._id);
        } catch (error) {
          console.error('Kullanıcı oluşturma hatası:', error);
          
          // Eğer username veya email çakışması varsa, benzersiz değerler oluştur
          if (error.code === 11000) {
            console.log('Benzersiz alan hatası, yeni değerler oluşturuluyor...');
            newUserData.username = `${username}_${Date.now()}`;
            
            if (error.keyPattern && error.keyPattern.email) {
              // Gerçek e-postayı realEmail alanında sakla, geçici e-posta oluştur
              if (req.auth.email) {
                newUserData.realEmail = req.auth.email; // Gerçek email'i koru
              }
              newUserData.email = `auth0_${Date.now()}@example.com`;
            }
            
            try {
              user = await User.create(newUserData);
              console.log('Benzersiz değerlerle kullanıcı oluşturuldu:', user._id);
            } catch (secondError) {
              console.error('İkinci kullanıcı oluşturma denemesi hatası:', secondError);
              return next(secondError);
            }
          } else if (error.name === 'ValidationError') {
            // Validation error handling - ensure email is set
            console.log('Doğrulama hatası, gerekli alanlar düzeltiliyor...');
            
            // Email validation error - set a temporary email if not present
            if (error.errors && error.errors.email) {
              // Gerçek e-postayı realEmail alanında sakla
              if (req.auth.email) {
                newUserData.realEmail = req.auth.email; // Gerçek email'i koru
              }
              newUserData.email = `auth0_${Date.now()}@example.com`;
              console.log('Geçici email oluşturuldu:', newUserData.email);
            }
            
            // Try creating user again with fixed data
            try {
              user = await User.create(newUserData);
              console.log('Düzeltilmiş verilerle kullanıcı oluşturuldu:', user._id);
            } catch (thirdError) {
              console.error('Üçüncü kullanıcı oluşturma denemesi hatası:', thirdError);
              return next(thirdError);
            }
          } else {
            return next(error); // Başka bir hata varsa yeniden fırlat
          }
        }
      }
    } else {
      // Kullanıcı varsa, Auth0 profilinden gelen bilgilerle güncelle
      console.log('Kullanıcı bulundu, profil bilgileri güncelleniyor...');
      let isModified = false;
      
      if (req.auth.nickname && user.username !== req.auth.nickname) {
        user.username = req.auth.nickname;
        isModified = true;
      }
      
      if (req.auth.name && user.name !== req.auth.name) {
        user.name = req.auth.name;
        isModified = true;
      }
      
      if (req.auth.picture && user.profilePicture !== req.auth.picture) {
        user.profilePicture = req.auth.picture;
        isModified = true;
      }
      
      // Gerçek e-posta adresini güncelle (tüm kullanıcılar için)
      if (realUserEmail && (!user.realEmail || user.realEmail !== realUserEmail)) {
        console.log(`Kullanıcı gerçek e-posta adresi güncelleniyor: ${user.realEmail || 'Boş'} -> ${realUserEmail}`);
        user.realEmail = realUserEmail;
        isModified = true;
      }
      
      // Gerçek e-posta al (farklı kaynaklardan kontrol et)
      let realEmail = '';
      if (req.auth.email) {
        realEmail = req.auth.email;
      } else if (req.auth[`${process.env.AUTH0_DOMAIN}/email`]) {
        realEmail = req.auth[`${process.env.AUTH0_DOMAIN}/email`];
      } else if (req.auth.emails && req.auth.emails.length > 0) {
        realEmail = req.auth.emails[0].value || req.auth.emails[0];
      }
      
      // Gerçek e-posta varsa ve mevcut email temp- ile başlıyorsa, güncelle
      if (realEmail && (user.email.startsWith('temp-') || user.email.startsWith('auth0_'))) {
        console.log(`Email alanı güncelleniyor: ${user.email} -> ${realEmail}`);
        user.email = realEmail;
        user.realEmail = realEmail;  // realEmail alanını da güncelle
        isModified = true;
      }
      
      // Değişiklik varsa kaydet
      if (isModified) {
        try {
          await user.save();
          console.log('Kullanıcı profili güncellendi');
        } catch (error) {
          console.error('Kullanıcı güncelleme hatası:', error);
          // Güncelleme hatası olsa bile devam et
        }
      }
    }
    
    if (user) {
      req.user = user;
      console.log('req.user ayarlandı:', req.user._id);
    } else {
      console.log('Kullanıcı bulunamadı veya oluşturulamadı!');
      return res.status(404).json({
        message: 'Kullanıcı bulunamadı veya oluşturulamadı',
        error: 'User not found'
      });
    }
    
    next();
  } catch (error) {
    console.error('Auth0 user processing error:', error);
    next(error);
  }
};

module.exports = {
  checkJwt,
  handleJwtErrors,
  getUserFromAuth0
};
