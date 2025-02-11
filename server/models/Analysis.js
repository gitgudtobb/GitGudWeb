const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    },
    address: String
  },
  images: {
    before: {
      url: String,
      timestamp: Date
    },
    after: {
      url: String,
      timestamp: Date
    }
  },
  results: {
    damagePercentage: {
      type: Number,
      required: true
    },
    severity: {
      type: String,
      enum: ['Hafif', 'Orta', 'Orta-Ağır', 'Ağır'],
      required: true
    },
    recommendations: [String],
    processedImages: {
      difference: String,
      highlighted: String
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  metadata: {
    buildingType: String,
    constructionYear: Number,
    floorCount: Number,
    notes: String
  }
});

// Lokasyon bazlı sorgular için indeks
analysisSchema.index({ location: '2dsphere' });

// Kullanıcı bazlı sorgular için indeks
analysisSchema.index({ userId: 1, createdAt: -1 });

const Analysis = mongoose.model('Analysis', analysisSchema);

module.exports = Analysis;
