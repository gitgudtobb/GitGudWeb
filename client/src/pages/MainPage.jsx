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
  Tooltip,
  Stack
} from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import MapIcon from '@mui/icons-material/Map'
import AnalyticsIcon from '@mui/icons-material/Analytics'
import TimelineIcon from '@mui/icons-material/Timeline'
import HistoryIcon from '@mui/icons-material/History'
import CompareIcon from '@mui/icons-material/Compare'
import WarningIcon from '@mui/icons-material/Warning'
import InfoIcon from '@mui/icons-material/Info'
import '../App.css'
import MapImageSelector from '../components/MapImageSelector'
import Header from '../components/Header'
import Footer from '../components/Footer'
import HeroSection from '../components/HeroSection'
import pixelmatch from 'pixelmatch'
import Pica from 'pica'
import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate } from 'react-router-dom'

const pica = new Pica()

const API_BASE_URL = 'http://localhost:5001'; // Server'ın çalıştığı port

function MainPage() {
  const { logout } = useAuth0();
  const navigate = useNavigate();
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
        throw new Error('Route bulunamadı');
      }
      
      const data = await response.json();
      setAnalyses(data);
    } catch (error) {
      console.error('Analizleri yükleme hatası:', error);
      setNotification({
        open: true,
        message: 'Analizleri yüklerken bir hata oluştu',
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

  const handleCloseNotification = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotification({ ...notification, open: false });
  };

  // Helper function to get damage color
  const getDamageColor = (damagePercentage) => {
    if (damagePercentage < 20) return '#4caf50'; // Green
    if (damagePercentage < 50) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  // Format date function
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('tr-TR', options);
  };

  const renderHeader = () => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="h4" component="h1">
        GitGud Web
      </Typography>
      <Box>
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={() => navigate('/profile')}
          sx={{ mr: 2 }}
        >
          Profil
        </Button>
        <Button 
          variant="outlined" 
          color="error" 
          onClick={() => logout({ returnTo: window.location.origin })}
        >
          Çıkış Yap
        </Button>
      </Box>
    </Box>
  )

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        
        <Container component="main" maxWidth="lg" sx={{ flexGrow: 1, py: 4 }}>
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <Typography 
                variant="h3" 
                component="h1" 
                gutterBottom 
                sx={{ 
                  fontWeight: 700, 
                  textAlign: 'center',
                  mb: 4,
                  background: 'linear-gradient(45deg, #1976d2, #2196f3)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0px 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                Deprem Hasar Analizi
              </Typography>
              
              <Paper 
                component={motion.div}
                whileHover={{ boxShadow: '0 14px 35px rgba(0, 0, 0, 0.07)' }}
                elevation={3} 
                sx={{ 
                  p: 3, 
                  mb: 4, 
                  borderRadius: 2,
                  background: 'linear-gradient(to right, #f5f7fa, #ffffff)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden'
                }}
              >
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3, color: '#1976d2' }}>
                  <CompareIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Görüntü Karşılaştırması
                </Typography>
                
                <Grid container spacing={3}>
                  {[0, 1].map((index) => (
                    <Grid item xs={12} md={6} key={index}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: index * 0.2 }}
                      >
                        <Card 
                          elevation={2} 
                          sx={{ 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column',
                            borderRadius: 2,
                            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                            '&:hover': {
                              transform: 'translateY(-5px)',
                              boxShadow: '0 12px 20px rgba(0, 0, 0, 0.1)'
                            }
                          }}
                        >
                          <CardContent sx={{ flexGrow: 1 }}>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>
                              {index === 0 ? 'Deprem Öncesi' : 'Deprem Sonrası'}
                            </Typography>
                            
                            <Box 
                              className="upload-zone"
                              sx={{ 
                                height: 300, 
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 2,
                                border: '2px dashed',
                                borderColor: images[index] ? 'primary.main' : 'grey.300',
                                backgroundColor: images[index] ? 'rgba(25, 118, 210, 0.04)' : 'grey.50',
                                transition: 'all 0.3s ease',
                                overflow: 'hidden'
                              }}
                            >
                              {images[index] ? (
                                <>
                                  <Box 
                                    component="img" 
                                    src={images[index]} 
                                    alt={`Image ${index + 1}`} 
                                    sx={{ 
                                      width: '100%', 
                                      height: '100%', 
                                      objectFit: 'cover' 
                                    }} 
                                  />
                                  <Box 
                                    sx={{ 
                                      position: 'absolute', 
                                      bottom: 0, 
                                      left: 0, 
                                      right: 0, 
                                      p: 1, 
                                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                      display: 'flex',
                                      justifyContent: 'flex-end'
                                    }}
                                  >
                                    <Tooltip title="Görüntüyü Sil">
                                      <IconButton 
                                        size="small" 
                                        onClick={handleImageDelete(index)}
                                        sx={{ color: 'white' }}
                                      >
                                        <DeleteIcon />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Haritadan Seç">
                                      <IconButton 
                                        size="small" 
                                        onClick={handleMapSelect(index)}
                                        sx={{ color: 'white' }}
                                      >
                                        <MapIcon />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </>
                              ) : (
                                <>
                                  <motion.div
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                  >
                                    <CloudUploadIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                                  </motion.div>
                                  <Typography variant="body1" gutterBottom>
                                    Görüntü Yükleyin
                                  </Typography>
                                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                    veya haritadan seçin
                                  </Typography>
                                  <Stack direction="row" spacing={2}>
                                    <Button
                                      variant="contained"
                                      component="label"
                                      startIcon={<CloudUploadIcon />}
                                    >
                                      Dosya Seç
                                      <input
                                        type="file"
                                        hidden
                                        accept="image/*"
                                        onChange={handleImageUpload(index)}
                                      />
                                    </Button>
                                    <Button
                                      variant="outlined"
                                      onClick={handleMapSelect(index)}
                                      startIcon={<MapIcon />}
                                    >
                                      Haritadan Seç
                                    </Button>
                                  </Stack>
                                </>
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Grid>
                  ))}
                </Grid>
                
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      onClick={analyzeDamage}
                      disabled={analyzing || !images[0] || !images[1]}
                      startIcon={analyzing ? <CircularProgress size={24} color="inherit" /> : <AnalyticsIcon />}
                      sx={{ 
                        py: 1.5, 
                        px: 4, 
                        borderRadius: 2,
                        background: 'linear-gradient(45deg, #1976d2, #2196f3)',
                        boxShadow: '0 4px 10px rgba(33, 150, 243, 0.3)',
                        '&:hover': {
                          boxShadow: '0 6px 15px rgba(33, 150, 243, 0.4)',
                        }
                      }}
                    >
                      {analyzing ? 'Analiz Yapılıyor...' : 'Hasar Analizi Yap'}
                    </Button>
                  </motion.div>
                </Box>
              </Paper>
              {/*Analysis Results*/}
              {analysisResult && (
                <Grow in={!!analysisResult} timeout={500}>
                  <Paper
                    component={motion.div}
                    whileHover={{ boxShadow: '0 14px 35px rgba(0, 0, 0, 0.07)' }}
                    elevation={3}
                    sx={{ 
                      p: 3,
                      mb: 4,
                      borderRadius: 2,
                      background: 'linear-gradient(45deg, #1976d2, #2196f3)',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3, color: '#1976d2' }}>
                      <AnalyticsIcon sx={{ mr: 1 , verticalAlign: 'middle' }} />
                      Hasar Analizi Sonuçları
                    </Typography>
                    
                    <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <Card sx={{ height: '100%', borderRadius: 2 }}>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Hasar Oranı
                            </Typography>
                            <Box sx={{ position: 'relative', display: 'inline-flex', width: '100%', justifyContent: 'center', my: 2 }}>
                              <Box
                                sx={{
                                  position: 'relative',
                                  display: 'inline-flex',
                                  width: 200,
                                  height: 200,
                                }}
                              >
                                <CircularProgress
                                  variant="determinate"
                                  value={100}
                                  size={200}
                                  thickness={4}
                                  sx={{ color: theme.palette.grey[200], position: 'absolute' }}
                                />
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.3, duration: 0.5 }}
                                >
                                  <CircularProgress
                                    variant="determinate"
                                    value={analysisResult.damagePercentage}
                                    size={200}
                                    thickness={4}
                                    sx={{ color: getDamageColor(analysisResult.damagePercentage) }}
                                  />
                                </motion.div>
                                <Box
                                  sx={{
                                    top: 0,
                                    left: 0,
                                    bottom: 0,
                                    right: 0,
                                    position: 'absolute',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
                                  >
                                    <Typography
                                      variant="h4"
                                      component="div"
                                      color={getDamageColor(analysisResult.damagePercentage)}
                                      fontWeight="bold"
                                    >
                                      {`${Math.round(analysisResult.damagePercentage)}%`}
                                    </Typography>
                                  </motion.div>
                                </Box>
                              </Box>
                            </Box>
                            <Typography variant="body1" align="center" sx={{ mt: 2 }}>
                              {analysisResult.damagePercentage < 20
                                ? 'Hafif Hasar'
                                : analysisResult.damagePercentage < 50
                                ? 'Orta Hasar'
                                : 'Ağır Hasar'}
                            </Typography>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <Card sx={{ height: '100%', borderRadius: 2 }}>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Değerlendirme ve Öneriler
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                              {analysisResult.recommendations.map((rec, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: idx * 0.1 + 0.3, duration: 0.5 }}
                                >
                                  <Box 
                                    sx={{ 
                                      mb: 2, 
                                      p: 2, 
                                      borderRadius: 1, 
                                      bgcolor: 'rgba(25, 118, 210, 0.04)',
                                      border: '1px solid rgba(25, 118, 210, 0.1)'
                                    }}
                                  >
                                    <Typography variant="body1">
                                      {rec}
                                    </Typography>
                                  </Box>
                                </motion.div>
                              ))}
                            </Box>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                      >
                        <Card sx={{ borderRadius: 2 }}>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Detaylı Analiz
                            </Typography>
                            <Grid container spacing={2} sx={{ mt: 1 }}>
                              {Object.entries(analysisResult.details || {}).map(([key, value], idx) => (
                                <Grid item xs={12} sm={6} md={4} key={key}>
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.1 + 0.5, duration: 0.5 }}
                                  >
                                    <Box 
                                      sx={{ 
                                        p: 2, 
                                        borderRadius: 1, 
                                        bgcolor: 'rgba(0, 0, 0, 0.02)',
                                        height: '100%',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                          bgcolor: 'rgba(0, 0, 0, 0.04)',
                                          transform: 'translateY(-2px)'
                                        }
                                      }}
                                    >
                                      <Typography variant="subtitle2" color="textSecondary">
                                        {key}
                                      </Typography>
                                      <Typography variant="body1" sx={{ mt: 1, fontWeight: 'medium' }}>
                                        {typeof value === 'number' ? value.toFixed(2) : value.toString()}
                                      </Typography>
                                    </Box>
                                  </motion.div>
                                </Grid>
                              ))}
                            </Grid>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Grid>
                  </Grid>
                  </Paper>

                </Grow>
              )}
              <Paper 
              component={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              whileHover={{ boxShadow: '0 14px 35px rgba(0, 0, 0, 0.07)' }}
              elevation={3} 
              sx={{ 
                p: 3, 
                borderRadius: 2,
                background: 'linear-gradient(to right, #f5f7fa, #ffffff)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)'
              }}
            >
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3, color: '#1976d2' }}>
                <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Önceki Analizler
              </Typography>
              
              {loading ? (
                <Box sx={{ width: '100%', my: 4, textAlign: 'center' }}>
                  <CircularProgress />
                  <Typography variant="body1" sx={{ mt: 2 }}>
                    Analizler yükleniyor...
                  </Typography>
                </Box>
              ) : analyses.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Box 
                    sx={{ 
                      textAlign: 'center', 
                      py: 6,
                      bgcolor: 'rgba(0, 0, 0, 0.02)',
                      borderRadius: 2
                    }}
                  >
                    <InfoIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6" color="text.secondary">
                      Henüz kaydedilmiş analiz bulunmuyor
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Yeni bir analiz yapmak için yukarıdaki görüntüleri yükleyin
                    </Typography>
                  </Box>
                </motion.div>
              ) : (
                <Grid container spacing={3}>
                  {analyses.map((analysis, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                        whileHover={{ y: -10 }}
                      >
                        <Card 
                          sx={{ 
                            cursor: 'pointer',
                            height: '100%',
                            borderRadius: 2,
                            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                            '&:hover': {
                              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)'
                            }
                          }}
                          onClick={() => handleAnalysisClick(analysis)}
                        >
                          <Box sx={{ position: 'relative', paddingTop: '56.25%' }}>
                            <Box
                              component="img"
                              src={analysis.afterImageUrl}
                              alt="Analiz Sonrası Görüntü"
                              sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                bgcolor: getDamageColor(analysis.results.damagePercentage),
                                color: 'white',
                                borderRadius: '50%',
                                width: 40,
                                height: 40,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                              }} 
                              >
                              {`${Math.round(analysis.results.damagePercentage)}%`}
                            </Box>
                          </Box>
                          <CardContent>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 1 }}>
                              {analysis.location?.address || 'Konum bilgisi yok'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {formatDate(analysis.createdAt || new Date())}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                              <Chip 
                                size="small" 
                                label={
                                  analysis.results.damagePercentage < 20
                                    ? 'Hafif Hasar'
                                    : analysis.results.damagePercentage < 50
                                    ? 'Orta Hasar'
                                    : 'Ağır Hasar'
                                }
                                sx={{ 
                                  bgcolor: getDamageColor(analysis.results.damagePercentage) + '20',
                                  color: getDamageColor(analysis.results.damagePercentage),
                                  fontWeight: 'medium'
                                }}
                              />
                              <Chip 
                                size="small" 
                                label={analysis.metadata?.buildingType || 'Bina'}
                                variant="outlined"
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Paper>
          </motion.div>
        </AnimatePresence>
      </Container>
      <Footer />
      
      {/* Map Dialog */}
      <Dialog
        open={mapDialogOpen}
        onClose={() => setMapDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Haritadan Görüntü Seç
          <IconButton
            aria-label="close"
            onClick={() => setMapDialogOpen(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <DeleteIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <MapImageSelector onImageSelect={handleMapImageSelect} onClose={() => setMapDialogOpen(false)} />
        </DialogContent>
      </Dialog>
      
      {/* Analysis Detail Dialog */}
      <Dialog
        open={!!selectedAnalysis}
        onClose={() => setSelectedAnalysis(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedAnalysis && (
          <>
            <DialogTitle>
              Analiz Detayları
              <IconButton
                aria-label="close"
                onClick={() => setSelectedAnalysis(null)}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  color: (theme) => theme.palette.grey[500],
                }}
              >
                <DeleteIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Görüntü Karşılaştırması
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ position: 'relative', paddingTop: '56.25%', mb: 1 }}>
                        <Box
                          component="img"
                          src={selectedAnalysis.beforeImageUrl}
                          alt="Deprem Öncesi"
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: 1
                          }}
                        />
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            bgcolor: 'rgba(0, 0, 0, 0.6)',
                            color: 'white',
                            p: 1
                          }}
                        >
                          Deprem Öncesi
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ position: 'relative', paddingTop: '56.25%', mb: 1 }}>
                        <Box
                          component="img"
                          src={selectedAnalysis.afterImageUrl}
                          alt="Deprem Sonrası"
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: 1
                          }}
                        />
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            bgcolor: 'rgba(0, 0, 0, 0.6)',
                            color: 'white',
                            p: 1
                          }}
                        >
                          Deprem Sonrası
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Card sx={{ height: '100%', borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Hasar Oranı
                      </Typography>
                      <Box sx={{ position: 'relative', display: 'inline-flex', width: '100%', justifyContent: 'center', my: 2 }}>
                        <Box
                          sx={{
                            position: 'relative',
                            display: 'inline-flex',
                            width: 150,
                            height: 150,
                          }}
                        >
                          <CircularProgress
                            variant="determinate"
                            value={100}
                            size={150}
                            thickness={4}
                            sx={{ color: theme.palette.grey[200], position: 'absolute' }}
                          />
                          <CircularProgress
                            variant="determinate"
                            value={selectedAnalysis.results.damagePercentage}
                            size={150}
                            thickness={4}
                            sx={{ color: getDamageColor(selectedAnalysis.results.damagePercentage) }}
                          />
                          <Box
                            sx={{
                              top: 0,
                              left: 0,
                              bottom: 0,
                              right: 0,
                              position: 'absolute',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography
                              variant="h4"
                              component="div"
                              color={getDamageColor(selectedAnalysis.results.damagePercentage)}
                              fontWeight="bold"
                            >
                              {`${Math.round(selectedAnalysis.results.damagePercentage)}%`}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      <Typography variant="body1" align="center" sx={{ mt: 2 }}>
                        {selectedAnalysis.results.damagePercentage < 20
                          ? 'Hafif Hasar'
                          : selectedAnalysis.results.damagePercentage < 50
                          ? 'Orta Hasar'
                          : 'Ağır Hasar'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Card sx={{ height: '100%', borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Bina Bilgileri
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="subtitle2" color="textSecondary">
                              Bina Tipi
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 2 }}>
                              {selectedAnalysis.metadata?.buildingType || 'Belirtilmemiş'}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="subtitle2" color="textSecondary">
                              Yapım Yılı
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 2 }}>
                              {selectedAnalysis.metadata?.constructionYear || 'Belirtilmemiş'}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="subtitle2" color="textSecondary">
                              Kat Sayısı
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 2 }}>
                              {selectedAnalysis.metadata?.floorCount || 'Belirtilmemiş'}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="subtitle2" color="textSecondary">
                              Analiz Tarihi
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 2 }}>
                              {formatDate(selectedAnalysis.createdAt || new Date())}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Card sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Değerlendirme ve Öneriler
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        {selectedAnalysis.results.recommendations.map((rec, idx) => (
                          <Box 
                            key={idx}
                            sx={{ 
                              mb: 2, 
                              p: 2, 
                              borderRadius: 1, 
                              bgcolor: 'rgba(25, 118, 210, 0.04)',
                              border: '1px solid rgba(25, 118, 210, 0.1)'
                            }}
                          >
                            <Typography variant="body1">
                              {rec}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedAnalysis(null)}>Kapat</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ '& .MuiSnackbarContent-root': { width: '100%' } }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity} 
          sx={{ width: '100%' }}
          variant="filled"
          elevation={6}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default MainPage
