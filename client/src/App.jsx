import { useState, useCallback, useEffect } from 'react'
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  IconButton,
  Grid,
  Button,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Fade,
  Grow,
  Divider,
  Chip,
} from '@mui/material'
import { motion } from 'framer-motion'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import MapIcon from '@mui/icons-material/Map'
import AnalyticsIcon from '@mui/icons-material/Analytics'
import TimelineIcon from '@mui/icons-material/Timeline'
import './App.css'
import MapImageSelector from './components/MapImageSelector'
import pixelmatch from 'pixelmatch'
import Pica from 'pica'

const pica = new Pica()

const API_BASE_URL = 'http://localhost:5001'; // Server'ın çalıştığı port

function App() {
  const [images, setImages] = useState([null, null])
  const [mapDialogOpen, setMapDialogOpen] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' })
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(false);
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const handleImageUpload = (index) => (event) => {
    const file = event.target.files[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setNotification({
          open: true,
          message: 'Dosya boyutu 10MB\'dan küçük olmalıdır',
          severity: 'error'
        })
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const newImages = [...images]
        newImages[index] = e.target.result
        setImages(newImages)
        setAnalysisResult(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageDelete = (index) => () => {
    const newImages = [...images]
    newImages[index] = null
    setImages(newImages)
    setAnalysisResult(null)
  }

  const handleMapSelect = (index) => () => {
    setActiveImageIndex(index)
    setMapDialogOpen(true)
  }

  const handleMapImageSelect = async (imageUrl) => {
    try {
      setLoading(true);
      console.log('Loading satellite image:', imageUrl);

      // Pre-load the image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = () => {
          console.log('Image loaded successfully:', {
            width: img.width,
            height: img.height,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight
          });
          resolve();
        };
        img.onerror = (e) => {
          console.error('Image load error:', e);
          reject(new Error('Görüntü yüklenemedi'));
        };
        img.src = imageUrl;
      });

      // Create new images array
      const newImages = [...images];
      newImages[activeImageIndex] = imageUrl;
      setImages(newImages);

      // Show success notification
      setNotification({
        open: true,
        message: 'Uydu görüntüsü başarıyla yüklendi',
        severity: 'success'
      });

      setMapDialogOpen(false);
    } catch (error) {
      console.error('Error loading satellite image:', error);
      setNotification({
        open: true,
        message: 'Uydu görüntüsü yüklenirken bir hata oluştu: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeDamage = async () => {
    if (!images[0] || !images[1]) {
      setNotification({
        open: true,
        message: 'Lütfen her iki fotoğrafı da yükleyin',
        severity: 'error'
      });
      return;
    }

    setAnalyzing(true);
    try {
      // Form verilerini oluştur
      const formData = new FormData();
      
      // Base64 görüntüleri Blob'a çevir
      const beforeBlob = await fetch(images[0]).then(r => r.blob());
      const afterBlob = await fetch(images[1]).then(r => r.blob());
      
      formData.append('beforeImage', beforeBlob, 'before.jpg');
      formData.append('afterImage', afterBlob, 'after.jpg');
      
      // Konum bilgisini ekle
      formData.append('location', JSON.stringify({
        type: 'Point',
        coordinates: [29.0335, 41.0053] // İstanbul koordinatları
      }));

      // Metadata ekle
      formData.append('metadata', JSON.stringify({
        buildingType: 'Residential',
        constructionYear: 2000,
        floorCount: 5
      }));

      // API'ye gönder
      const response = await fetch(`${API_BASE_URL}/api/analysis`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Analiz kaydedilirken bir hata oluştu');
      }

      const result = await response.json();
      setAnalysisResult(result.results);
      
      // Başarılı bildirim göster
      setNotification({
        open: true,
        message: 'Analiz başarıyla kaydedildi',
        severity: 'success'
      });

      // Analizleri yeniden yükle
      loadAnalyses();
    } catch (error) {
      console.error('Analiz hatası:', error);
      setNotification({
        open: true,
        message: error.message || 'Analiz sırasında bir hata oluştu',
        severity: 'error'
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const loadAnalyses = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/analysis/my`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Analizler yüklenirken bir hata oluştu');
      }

      const data = await response.json();
      setAnalyses(data);
    } catch (error) {
      console.error('Analizleri yükleme hatası:', error);
      setNotification({
        open: true,
        message: error.message || 'Analizler yüklenirken bir hata oluştu',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysisClick = (analysis) => {
    setSelectedAnalysis(analysis);
  };

  useEffect(() => {
    loadAnalyses();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Fade in timeout={1000}>
        <Box>
          <Typography 
            variant="h2" 
            component="h1" 
            gutterBottom 
            align="center" 
            color="error"
            sx={{
              fontWeight: 'bold',
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
              mb: 3
            }}
          >
            Deprem Hasar Tespit Sistemi
          </Typography>
          <Typography 
            variant="subtitle1" 
            gutterBottom 
            align="center" 
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            Deprem öncesi ve sonrası fotoğrafları yükleyerek hasar analizi yapın
          </Typography>
        </Box>
      </Fade>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {[0, 1].map((index) => (
          <Grid item xs={12} md={6} key={index}>
            <Grow in timeout={1000 + index * 500} key={`grow-${index}`}>
              <Paper
                component={motion.div}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minHeight: 300,
                  position: 'relative',
                  borderRadius: 2,
                  boxShadow: 3,
                  bgcolor: 'background.paper',
                  '&:hover': {
                    boxShadow: 6,
                  }
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'medium' }}>
                  {index === 0 ? 'Deprem Öncesi' : 'Deprem Sonrası'}
                </Typography>
                {images[index] ? (
                  <Box 
                    sx={{ 
                      position: 'relative', 
                      width: '100%', 
                      height: 300,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      overflow: 'hidden'
                    }}
                  >
                    {loading && activeImageIndex === index && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'rgba(0,0,0,0.5)',
                          zIndex: 2
                        }}
                      >
                        <CircularProgress sx={{ mb: 1 }} />
                        <Typography variant="body2" color="white">
                          Görüntü yükleniyor...
                        </Typography>
                      </Box>
                    )}
                    <Box
                      component="img"
                      src={images[index]}
                      alt={`Image ${index + 1}`}
                      loading="eager"
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'opacity 0.3s ease-in-out',
                        opacity: loading && activeImageIndex === index ? 0.3 : 1
                      }}
                      onLoad={(e) => {
                        console.log('Image loaded in DOM:', {
                          src: e.target.src,
                          width: e.target.width,
                          height: e.target.height,
                          naturalWidth: e.target.naturalWidth,
                          naturalHeight: e.target.naturalHeight,
                          complete: e.target.complete
                        });
                        // Force a re-render to ensure the image is displayed
                        e.target.style.opacity = '1';
                      }}
                      onError={(e) => {
                        console.error('Image load error in DOM:', e);
                        setNotification({
                          open: true,
                          message: 'Görüntü yüklenirken bir hata oluştu',
                          severity: 'error'
                        });
                        // Try to reload the image
                        e.target.src = images[index] + '?retry=' + new Date().getTime();
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        display: 'flex',
                        gap: 1,
                        zIndex: 1
                      }}
                    >
                      <IconButton
                        onClick={handleMapSelect(index)}
                        sx={{ bgcolor: 'background.paper' }}
                      >
                        <MapIcon />
                      </IconButton>
                      <IconButton
                        onClick={handleImageDelete(index)}
                        sx={{ bgcolor: 'background.paper' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: 300,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px dashed',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload(index)}
                      style={{ display: 'none' }}
                      id={`image-upload-${index}`}
                    />
                    <label htmlFor={`image-upload-${index}`}>
                      <Button
                        component="span"
                        variant="contained"
                        startIcon={<CloudUploadIcon />}
                      >
                        Fotoğraf Yükle
                      </Button>
                    </label>
                    <Typography variant="caption" sx={{ mt: 2, color: 'text.secondary' }}>
                      veya haritadan seç
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<MapIcon />}
                      onClick={handleMapSelect(index)}
                      sx={{ mt: 1 }}
                    >
                      Haritadan Seç
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grow>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Button
          component={motion.button}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          variant="contained"
          size="large"
          startIcon={<AnalyticsIcon />}
          onClick={analyzeDamage}
          disabled={analyzing || !images[0] || !images[1]}
          sx={{
            px: 4,
            py: 1.5,
            borderRadius: 2,
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #2196F3 10%, #21CBF3 70%)',
            }
          }}
        >
          {analyzing ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} color="inherit" />
              <span>Analiz Ediliyor...</span>
            </Box>
          ) : (
            'Hasar Analizi Yap'
          )}
        </Button>
      </Box>

      {analysisResult && (
        <Grow in timeout={1000}>
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
              Analiz Sonuçları
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card
                  component={motion.div}
                  whileHover={{ scale: 1.02 }}
                  sx={{
                    borderRadius: 2,
                    boxShadow: 3,
                    '&:hover': {
                      boxShadow: 6,
                    }
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'medium' }}>
                      Hasar Değerlendirmesi
                    </Typography>
                    <Typography variant="h4" color="error" gutterBottom>
                      {analysisResult.damagePercentage}% Hasar
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                      Hasar Seviyesi: {analysisResult.severity}
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 2 }}>
                      Öneriler:
                    </Typography>
                    <ul>
                      {analysisResult.recommendations.map((rec, index) => (
                        <li key={index}>
                          <Typography>{rec}</Typography>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card
                  component={motion.div}
                  whileHover={{ scale: 1.02 }}
                  sx={{
                    borderRadius: 2,
                    boxShadow: 3,
                    '&:hover': {
                      boxShadow: 6,
                    }
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'medium' }}>
                      Görsel Analiz
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Hasarlı Bölgeler
                      </Typography>
                      <img
                        src={analysisResult.processedImages.highlighted}
                        alt="Damage Highlights"
                        style={{
                          width: '100%',
                          height: 200,
                          objectFit: 'cover',
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Grow>
      )}

      {analyses.length > 0 && (
        <Fade in timeout={1000}>
          <Box sx={{ mt: 6 }}>
            <Typography 
              variant="h5" 
              gutterBottom 
              sx={{ 
                color: 'primary.main', 
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <TimelineIcon />
              Önceki Analizler
            </Typography>
            <Grid container spacing={3}>
              {analyses.map((analysis, index) => (
                <Grow in timeout={1000 + index * 200} key={analysis._id}>
                  <Grid item xs={12} md={6}>
                    <Card
                      component={motion.div}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => handleAnalysisClick(analysis)}
                      sx={{
                        borderRadius: 2,
                        boxShadow: 3,
                        background: 'linear-gradient(to right bottom, #ffffff, #f5f5f5)',
                        '&:hover': {
                          boxShadow: 6,
                          cursor: 'pointer',
                        }
                      }}
                    >
                      <CardContent>
                        <Typography 
                          variant="h6" 
                          gutterBottom 
                          sx={{ 
                            color: 'primary.main',
                            fontWeight: 'medium' 
                          }}
                        >
                          {new Date(analysis.createdAt).toLocaleDateString('tr-TR')}
                        </Typography>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            color: analysis.results.damagePercentage > 50 ? 'error.main' : 'warning.main',
                            fontWeight: 'bold',
                            fontSize: '1.1rem'
                          }} 
                          gutterBottom
                        >
                          Hasar Oranı: {analysis.results.damagePercentage}%
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'text.secondary',
                            mb: 2
                          }}
                        >
                          Hasar Seviyesi: {analysis.results.severity}
                        </Typography>
                        <Box 
                          sx={{ 
                            mt: 2, 
                            display: 'flex', 
                            gap: 2,
                            borderRadius: 2,
                            overflow: 'hidden',
                            boxShadow: 1
                          }}
                        >
                          <img
                            src={`${API_BASE_URL}/${analysis.images.before.url}`}
                            alt="Öncesi"
                            style={{
                              width: '50%',
                              height: 120,
                              objectFit: 'cover',
                            }}
                          />
                          <img
                            src={`${API_BASE_URL}/${analysis.images.after.url}`}
                            alt="Sonrası"
                            style={{
                              width: '50%',
                              height: 120,
                              objectFit: 'cover',
                            }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grow>
              ))}
            </Grid>
          </Box>
        </Fade>
      )}
      {/* Analiz Detay Dialog */}
      <Dialog 
        open={Boolean(selectedAnalysis)} 
        onClose={() => setSelectedAnalysis(null)}
        maxWidth="md"
        fullWidth
        TransitionComponent={Grow}
        transitionDuration={500}
      >
        {selectedAnalysis && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  Analiz Detayları
                </Typography>
                <Chip 
                  label={new Date(selectedAnalysis.createdAt).toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                      Hasar Değerlendirmesi
                    </Typography>
                    <Box sx={{ 
                      display: 'flex', 
                      gap: 2, 
                      alignItems: 'center',
                      mb: 2 
                    }}>
                      <Typography 
                        variant="h4" 
                        sx={{ 
                          color: selectedAnalysis.results.damagePercentage > 50 ? 'error.main' : 'warning.main',
                          fontWeight: 'bold'
                        }}
                      >
                        {selectedAnalysis.results.damagePercentage}%
                      </Typography>
                      <Box>
                        <Typography variant="body1" color="text.secondary">
                          Hasar Oranı
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'text.primary' }}>
                          {selectedAnalysis.results.severity}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ mb: 3 }} />
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                    Görsel Karşılaştırma
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 2,
                    mb: 3,
                    '& img': {
                      borderRadius: 2,
                      boxShadow: 2,
                      transition: 'transform 0.3s ease-in-out',
                      '&:hover': {
                        transform: 'scale(1.02)',
                      }
                    }
                  }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" gutterBottom align="center">
                        Deprem Öncesi
                      </Typography>
                      <img
                        src={`${API_BASE_URL}/${selectedAnalysis.images.before.url}`}
                        alt="Deprem Öncesi"
                        style={{
                          width: '100%',
                          height: 300,
                          objectFit: 'cover',
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" gutterBottom align="center">
                        Deprem Sonrası
                      </Typography>
                      <img
                        src={`${API_BASE_URL}/${selectedAnalysis.images.after.url}`}
                        alt="Deprem Sonrası"
                        style={{
                          width: '100%',
                          height: 300,
                          objectFit: 'cover',
                        }}
                      />
                    </Box>
                  </Box>
                </Grid>

                {selectedAnalysis.results.recommendations && (
                  <Grid item xs={12}>
                    <Divider sx={{ mb: 3 }} />
                    <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                      Öneriler ve Notlar
                    </Typography>
                    <Box sx={{ 
                      bgcolor: 'background.paper',
                      p: 2,
                      borderRadius: 2,
                      boxShadow: 1
                    }}>
                      {selectedAnalysis.results.recommendations.map((rec, index) => (
                        <Typography 
                          key={index} 
                          variant="body1" 
                          sx={{ 
                            mb: 1,
                            display: 'flex',
                            alignItems: 'center',
                            '&:before': {
                              content: '"•"',
                              color: 'primary.main',
                              fontWeight: 'bold',
                              fontSize: '1.2em',
                              marginRight: 1
                            }
                          }}
                        >
                          {rec}
                        </Typography>
                      ))}
                    </Box>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button 
                onClick={() => setSelectedAnalysis(null)}
                variant="contained"
                sx={{
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                }}
              >
                Kapat
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog
        open={mapDialogOpen}
        onClose={() => setMapDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <MapImageSelector
            onImageSelect={handleMapImageSelect}
            onClose={() => setMapDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  )
}

export default App
