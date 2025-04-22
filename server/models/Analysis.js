const mongoose = require('mongoose');

// Bina şeması - her bir binanın hasar analizi için
const buildingSchema = new mongoose.Schema({
  bbox: {
    type: [Number],
    required: true,
    validate: [val => val.length === 4, 'Bounding box 4 değer içermelidir']
  },
  damage: {
    type: String,
    enum: ['no-damage', 'minor-damage', 'major-damage', 'destroyed'],
    required: true
  },
  mask: {
    type: String, // base64 formatında maske görüntüsü
    required: false // Bazı durumlarda maske olmayabilir
  }
});

const analysisSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Konum bilgisi (opsiyonel)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    address: String
  },
  // AI analiz sonuçları
  image_id: String,
  masked_image: { type: String, required: false }, // Base64 formatında maskelenmiş görüntü
  buildings: { type: [buildingSchema], default: [] },
  statistics: {
    'no-damage': { type: Number, default: 0 },
    'minor-damage': { type: Number, default: 0 },
    'major-damage': { type: Number, default: 0 },
    'destroyed': { type: Number, default: 0 }
  },
  total_buildings: { type: Number, default: 0 },
  // Genel bilgiler
  name: {
    type: String,
    default: function() {
      return `Hasar Analizi ${new Date().toLocaleDateString()}`;
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  }
});

// Lokasyon bazlı sorgular için indeks
analysisSchema.index({ location: '2dsphere' });

// Kullanıcı bazlı sorgular için indeks
analysisSchema.index({ user: 1, createdAt: -1 });

const Analysis = mongoose.model('Analysis', analysisSchema);

module.exports = Analysis;
