import { TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { useDropzone } from 'react-dropzone';
import DragDropUploader from "../components/DragDropUploader.jsx";
import { useState, useCallback, useEffect } from 'react'
import {FormControl, InputLabel, MenuItem, Select } from '@mui/material';
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
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import DangerousIcon from '@mui/icons-material/Dangerous'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import '../App.css'
import ImageSourceSelector from '../components/ImageSourceSelector'
import Header from '../components/Header'
import Footer from '../components/Footer'
import HeroSection from '../components/HeroSection'
import AIAnalysisPanel from '../components/AIAnalysisPanel'
import AnalysisDetailModal from '../components/AnalysisDetailModal'
import pixelmatch from 'pixelmatch'
import Pica from 'pica'
import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../services/api'


const pica = new Pica()

function MainPage() {
  const { logout } = useAuth0();
  const navigate = useNavigate();
  const api = useApi();
  const [images, setImages] = useState([null, null])
  const [mapDialogOpen, setMapDialogOpen] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' })
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const [buildingFilter, setBuildingFilter] = useState('');
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [dateFilter, setDateFilter] = useState(null);
  const [buildingRange, setBuildingRange] = useState('all');
  



  // Hasar seviyelerine göre renk ve ikon atamaları
  const damageConfig = {
    'no-damage': {
      color: '#4caf50',
      icon: <CheckCircleIcon />,
      label: 'Hasar Yok'
    },
    'minor-damage': {
      color: '#ff9800',
      icon: <WarningIcon />,
      label: 'Küçük Hasar'
    },
    'major-damage': {
      color: '#f44336',
      icon: <ErrorIcon />,
      label: 'Büyük Hasar'
    },
    'destroyed': {
      color: '#9c27b0',
      icon: <DangerousIcon />,
      label: 'Yıkılmış'
    }
  };

  const handleFilesAdded = (acceptedFiles) => {
    const file = acceptedFiles[0]; 
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newImages = [...images];
        newImages[activeImageIndex] = e.target.result;
        setImages(newImages);
        setAnalysisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const onDrop = (acceptedFiles, index) => {  
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newImages = [...images];
        newImages[index] = e.target.result;
        setImages(newImages);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const {                               
    getRootProps: getRootProps1,
    getInputProps: getInputProps1
  } = useDropzone({
    onDrop: (files) => onDrop(files, 0),
    multiple: false,
    accept: 'image/*',
  });
  
  const {                            
    getRootProps: getRootProps2,
    getInputProps: getInputProps2
  } = useDropzone({
    onDrop: (files) => onDrop(files, 1),
    multiple: false,
    accept: 'image/*',
  });

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

  // Analizleri yükleyen fonksiyon - birleştirilmiş versiyon
  const loadAnalyses = async () => {
    console.log('loadAnalyses function called');
    setLoading(true);
    
    try {
      // Tüm analizleri yükle
      const [regularData, aiData] = await Promise.allSettled([
        api.getAnalyses(),
        api.getAIAnalyses()
      ]);
      
      // Regular analyses
      const regularAnalyses = regularData.status === 'fulfilled' ? 
        (Array.isArray(regularData.value) ? regularData.value : 
         (regularData.value && regularData.value.analyses ? regularData.value.analyses : [])) : [];
      
      console.log("Loaded regular analyses:", regularAnalyses);
      
      // AI analyses
      const aiAnalyses = aiData.status === 'fulfilled' ? 
        (Array.isArray(aiData.value) ? aiData.value : 
         (aiData.value && aiData.value.analyses ? aiData.value.analyses : 
          (aiData.value ? [aiData.value] : []))) : [];
      
      console.log("Loaded AI analyses:", aiAnalyses);
      
      // Birleştirilmiş analizler
      const allAnalyses = [...regularAnalyses, ...aiAnalyses];
      
      // Tarihe göre sırala (en yeniler önce)
      allAnalyses.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      
      console.log('Combined analyses:', allAnalyses);
      setAnalyses(allAnalyses);
    } catch (error) {
      console.error('Error loading analyses:', error);
      setNotification({
        open: true,
        message: 'Error loading analyses',
        severity: 'error'
      });
      setAnalyses([]);
    } finally {
      setLoading(false);
    }
  };

  // Sayfa yüklendiğinde analizleri yükle - sadece bir kez çalışsın
  useEffect(() => {
    loadAnalyses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bildirim kapatma fonksiyonu
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
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
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
    setAnalysisResult(null);

    try {
      // API servisini kullanarak hasar analizi yap
      const result = await api.analyzeDamage({
        preImage: images[0],
        postImage: images[1],
      });
      
      setAnalysisResult(result.results);
      
      // Başarılı bildirim göster
      setNotification({
        open: true,
        message: 'Yapay zeka analizi başarıyla tamamlandı',
        severity: 'success'
      });

      // Analizleri yeniden yükle
      loadAnalyses();
    } catch (error) {
      console.error('Yapay zeka analiz hatası:', error);
      setNotification({
        open: true,
        message: error.message || 'Yapay zeka analizi sırasında bir hata oluştu',
        severity: 'error'
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalysisClick = (analysis) => {
    console.log('Seçilen analiz:', analysis);
    setSelectedAnalysis(analysis);
  };

  useEffect(() => {
    loadAnalyses();
  }, []);

  const filteredAnalyses = analyses.filter((analysis) => {

  
    // Tarih filtreleme
    if (dateFilter) {
      const createdAt = new Date(analysis.createdAt);
      const selectedDate = new Date(dateFilter);
      if (
        createdAt.getFullYear() !== selectedDate.getFullYear() ||
        createdAt.getMonth() !== selectedDate.getMonth() ||
        createdAt.getDate() !== selectedDate.getDate()
      ) {
        return false;
      }
    }
  // Bina sayısı filtreleme
  if (buildingFilter) {
    
    const totalBuildings = analysis.total_buildings || 0;
    if (buildingFilter === '0-5' && totalBuildings > 5) return false;
    if (buildingFilter === '5-15' && (totalBuildings <= 5 || totalBuildings > 15)) return false;
    if (buildingFilter === '15-30' && (totalBuildings <= 15 || totalBuildings > 30)) return false;
    if (buildingFilter === '30+' && totalBuildings <= 30) return false;
  }

  return true;
});
  

  return (
    <Box className="main-page" sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
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
                                {/* Drag & Drop + Dosya Seçme */}
                                <Stack direction="row" spacing={2}>
                                  <Box
                                    {...(index === 0 ? getRootProps1() : getRootProps2())}
                                    sx={{
                                      width: '100%',
                                      display: 'inline-block'
                                      }}
                                  >
                                      <input {...(index === 0 ? getInputProps1() : getInputProps2())} />
                                      <Button
                                        variant="contained"
                                        fullWidth
                                        startIcon={<CloudUploadIcon />}
                                        sx={{
                                          px: 4,           
                                          py: 2,           
                                          fontSize: '1rem', 
                                          minWidth: '180px',
                                          borderRadius: 2
                                        }}
                                      >
                                        Dosya Seç
                                      </Button>
                                    </Box>

                                    <Button
                                      variant="outlined"
                                      onClick={handleMapSelect(index)}
                                      startIcon={<MapIcon />}
                                      sx={{
                                        px: 2,
                                        py: 0.3,
                                        fontSize: '1rem',
                                        minWidth: '180px',
                                        borderRadius: 2
                                      }}
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
                
                {/* AI Analiz Paneli */}
                <AIAnalysisPanel 
                  preImage={images[0]} 
                  postImage={images[1]}
                  onAnalysisComplete={(results) => {
                    console.log('AI analiz sonuçları:', results);
                    // Burada analiz sonuçlarıyla ilgili işlemler yapılabilir
                    setNotification({
                      open: true,
                      message: `Analiz tamamlandı! ${results.total_buildings} bina tespit edildi.`,
                      severity: 'success'
                    });
                  }}
                />
              </Paper>
              {/* Analysis Result Section */}
              {analysisResult && (
                <Fade in={!!analysisResult}>
                  <Paper 
                    elevation={3} 
                    sx={{ 
                      p: 3, 
                      mt: 4, 
                      borderRadius: 2,
                      border: '1px solid #2196f3',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <Box sx={{ 
                      position: 'absolute', 
                      top: 0, 
                      right: 0, 
                      bgcolor: 'primary.main', 
                      color: 'white',
                      px: 2,
                      py: 0.5,
                      borderBottomLeftRadius: 8
                    }}>
                      Yapay Zeka Analizi
                    </Box>
                    
                    <Typography variant="h5" component="h3" gutterBottom>
                      Hasar Analiz Sonuçları
                    </Typography>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="subtitle1" gutterBottom>
                            Hasar Oranı:
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ 
                              width: '100%', 
                              mr: 1, 
                              bgcolor: 'grey.300',
                              borderRadius: 5,
                              height: 10
                            }}>
                              <Box
                                sx={{
                                  width: `${analysisResult.damagePercentage}%`,
                                  height: '100%',
                                  borderRadius: 5,
                                  bgcolor: getDamageColor(analysisResult.damagePercentage)
                                }}
                              />
                            </Box>
                            <Box sx={{ minWidth: 35 }}>
                              <Typography variant="body2" color="textSecondary">
                                {`${analysisResult.damagePercentage}%`}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        
                        <Typography variant="subtitle1" gutterBottom>
                          Hasar Şiddeti:
                        </Typography>
                        <Chip 
                          label={analysisResult.severity} 
                          color={
                            analysisResult.severity === 'Hafif' ? 'success' :
                            analysisResult.severity === 'Orta' ? 'warning' :
                            analysisResult.severity === 'Orta-Ağır' ? 'error' : 'error'
                          }
                          sx={{ mb: 3 }}
                        />
                        
                        <Typography variant="subtitle1" gutterBottom>
                          Yapay Zeka Önerileri:
                        </Typography>
                        <List>
                          {analysisResult.recommendations.map((rec, index) => (
                            <ListItem key={index} sx={{ py: 0.5 }}>
                              <ListItemIcon sx={{ minWidth: 36 }}>
                                <InfoIcon color="primary" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary={rec} />
                            </ListItem>
                          ))}
                        </List>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle1" gutterBottom>
                          Yapay Zeka Görsel Analizi:
                        </Typography>
                        {analysisResult.processedImages && (
                          <Box sx={{ mt: 2 }}>
                            <img 
                              src={`${API_BASE_URL}/${analysisResult.processedImages.difference.replace(/\\/g, '/')}`} 
                              alt="Hasar Fark Analizi" 
                              style={{ 
                                width: '100%', 
                                borderRadius: 8,
                                border: '1px solid #ddd'
                              }} 
                            />
                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                              Yapay Zeka Tarafından Tespit Edilen Hasar Bölgeleri
                            </Typography>
                          </Box>
                        )}
                      </Grid>
                    </Grid>
                    
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button 
                        variant="outlined" 
                        color="primary" 
                        startIcon={<TimelineIcon />}
                        onClick={() => {
                          // Save analysis to history or generate report
                        }}
                      >
                        Rapor Oluştur
                      </Button>
                    </Box>
                  </Paper>
                </Fade>
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

              <Box
  sx={{
    display: 'flex',
    gap: 3,
    alignItems: 'flex-start',
    mb: 3,
    flexWrap: 'wrap'
  }}
>
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2' }}>
      Tarihe Göre Filtrele
    </Typography>
    <DatePicker
      value={dateFilter}
      onChange={(newValue) => setDateFilter(newValue)}
      slotProps={{
        textField: {
          size: 'small',
          sx: {
            border: '1px solid #1976d2',
            borderRadius: 1,
            backgroundColor: 'white',
          }
        }
      }}
    />
  </Box>

  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2' }}>
      Bina Sayısına Göre
    </Typography>
    <FormControl size="small" sx={{ minWidth: 250 }}>
      <Select
        value={buildingFilter}
        onChange={(e) => setBuildingFilter(e.target.value)}
        displayEmpty
        sx={{
          border: '1px solid #1976d2',
          borderRadius: 1,
          backgroundColor: 'white'
        }}
      >
        <MenuItem value="">Tümü</MenuItem>
        <MenuItem value="0-5">0-5 Bina</MenuItem>
        <MenuItem value="5-15">5-15 Bina</MenuItem>
        <MenuItem value="15-30">15-30 Bina</MenuItem>
        <MenuItem value="30+">30+ Bina</MenuItem>
      </Select>
    </FormControl>
  </Box>
</Box>



              

              
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
                <>
                  {/* Birleştirilmiş Analizler */}
                  <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, mt: 4 }}>
                    Tüm Analizler
                  </Typography>
                  <Grid container spacing={3}>
                    {filteredAnalyses.map((analysis, index) => {
                      // Analiz tipini belirle
                      const isAIAnalysis = !!analysis.masked_image || !!analysis.image_id;
                      const imageUrl = isAIAnalysis ? analysis.masked_image : analysis.afterImageUrl;
                      
                      return (
                        <Grid item xs={12} sm={6} md={4} key={analysis._id || `analysis-${index}`}>
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
                            <Box sx={{ position: 'relative', paddingTop: '56.25%', overflow: 'hidden' }}>
                              {imageUrl ? (
                                <Box
                                  component="img"
                                  src={imageUrl}
                                  alt="Analysis Image"
                                  sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                  }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: 'rgba(0, 0, 0, 0.05)'
                                  }}
                                >
                                  <InfoIcon sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.5 }} />
                                </Box>
                              )}
                              
                              {/* Badge for analysis type */}
                              <Chip
                                label={isAIAnalysis ? 'AI' : 'Standard'}
                                size="small"
                                sx={{
                                  position: 'absolute',
                                  top: 10,
                                  left: 10,
                                  bgcolor: isAIAnalysis ? '#2196f3' : '#9c27b0',
                                  color: 'white',
                                  fontWeight: 'bold',
                                  zIndex: 1
                                }}
                              />
                              
                              {/* Building count or damage percentage */}
                              {analysis.results && analysis.results.damagePercentage ? (
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
                              ) : analysis.total_buildings ? (
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    top: 10,
                                    right: 10,
                                    bgcolor: '#4caf50',
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
                                  {`${analysis.total_buildings || 0}`}
                                </Box>
                              ) : null}
                            </Box>
                            <CardContent>
                              <Typography variant="h6" gutterBottom>
                                {analysis.name || `Analysis #${typeof analysis._id === 'string' ? analysis._id.substring(0, 6) : index}`}
                              </Typography>
                              
                              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                                {formatDate(analysis.createdAt || new Date())}
                              </Typography>
                              
                              {/* Location if available */}
                              {analysis.location && (
                                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                  <LocationOnIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                                  {analysis.location.address || 'Location data available'}
                                </Typography>
                              )}
                              
                              {/* Damage chips */}
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                {analysis.results && analysis.results.damagePercentage !== undefined ? (
                                  <Chip 
                                    size="small" 
                                    label={
                                      analysis.results.damagePercentage < 20
                                        ? 'Minor Damage'
                                        : analysis.results.damagePercentage < 50
                                        ? 'Moderate Damage'
                                        : 'Severe Damage'
                                    }
                                    sx={{ 
                                      bgcolor: getDamageColor(analysis.results.damagePercentage) + '20',
                                      color: getDamageColor(analysis.results.damagePercentage),
                                      fontWeight: 'medium'
                                    }}
                                  />
                                ) : analysis.statistics ? (
                                  <>
                                    {Object.entries(analysis.statistics).map(([damage, count]) => (
                                      count > 0 && (
                                        <Chip 
                                          key={damage}
                                          size="small" 
                                          label={`${damageConfig[damage]?.label || damage}: ${count}`}
                                          sx={{ 
                                            bgcolor: `${damageConfig[damage]?.color}20` || '#99999920',
                                            color: damageConfig[damage]?.color || '#999999',
                                            fontWeight: 'medium'
                                          }}
                                        />
                                      )
                                    ))}
                                  </>
                                ) : null}
                                
                                {/* Building type if available */}
                                {analysis.metadata?.buildingType && (
                                  <Chip 
                                    size="small" 
                                    label={analysis.metadata?.buildingType || 'Building'}
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </Grid>
                    )})}
                  </Grid>
                </>
              )}
            </Paper>
          </motion.div>
        </AnimatePresence>
      </Container>
      <Footer />
      
      {/* Image Source Selector Dialog */}
      <Dialog
        open={mapDialogOpen}
        onClose={() => setMapDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <ImageSourceSelector 
          open={mapDialogOpen} 
          onClose={() => setMapDialogOpen(false)} 
          onImageSelect={handleMapImageSelect} 
        />
      </Dialog>
      
      {/* Analiz Detay Modalı */}
      <AnalysisDetailModal
        open={!!selectedAnalysis}
        analysis={selectedAnalysis}
        onClose={() => setSelectedAnalysis(null)}
      />
      
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
