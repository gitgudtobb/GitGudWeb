// Geçici auth middleware (development için)
const auth = (req, res, next) => {
    // Gerçek auth logic'i implement edilene kadar her isteğe izin ver
    next();
};

module.exports = auth;
