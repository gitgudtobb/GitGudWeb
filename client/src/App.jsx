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
  Snackbar,
  Alert,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import MapIcon from '@mui/icons-material/Map'
import AnalyticsIcon from '@mui/icons-material/Analytics'
import './App.css'
import MapImageSelector from './components/MapImageSelector'
import pixelmatch from 'pixelmatch'
import Pica from 'pica'

const pica = new Pica()

const API_BASE_URL = 'http://localhost:5000'; // Server'ın çalıştığı port

function App() {
  const [images, setImages] = useState([null, null])
  const [mapDialogOpen, setMapDialogOpen] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
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

  const handleMapImageSelect = (imageUrl) => {
    const newImages = [...images]
    newImages[activeImageIndex] = imageUrl
    setImages(newImages)
    setMapDialogOpen(false)
  }

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

  useEffect(() => {
    loadAnalyses();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Deprem Hasar Tespit Sistemi
      </Typography>
      <Typography variant="subtitle1" gutterBottom align="center" color="text.secondary">
        Deprem öncesi ve sonrası fotoğrafları yükleyerek hasar analizi yapın
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {[0, 1].map((index) => (
          <Grid item xs={12} md={6} key={index}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minHeight: 300,
                position: 'relative',
              }}
            >
              <Typography variant="h6" gutterBottom>
                {index === 0 ? 'Deprem Öncesi' : 'Deprem Sonrası'}
              </Typography>
              {images[index] ? (
                <Box sx={{ position: 'relative', width: '100%', height: 300 }}>
                  <img
                    src={images[index]}
                    alt={`Image ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      display: 'flex',
                      gap: 1,
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
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={analyzing ? <CircularProgress size={20} /> : <AnalyticsIcon />}
          onClick={analyzeDamage}
          disabled={analyzing || !images[0] || !images[1]}
        >
          {analyzing ? 'Analiz Ediliyor...' : 'Hasar Analizi Yap'}
        </Button>
      </Box>

      {analysisResult && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Analiz Sonuçları
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
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
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
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
      )}

      {analyses.length > 0 && (
        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" gutterBottom>
            Önceki Analizler
          </Typography>
          <Grid container spacing={3}>
            {analyses.map((analysis) => (
              <Grid item xs={12} md={6} key={analysis._id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {new Date(analysis.createdAt).toLocaleDateString('tr-TR')}
                    </Typography>
                    <Typography variant="body1" color="error" gutterBottom>
                      Hasar Oranı: {analysis.results.damagePercentage}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Hasar Seviyesi: {analysis.results.severity}
                    </Typography>
                    <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                      <img
                        src={`${API_BASE_URL}/${analysis.images.before.url}`}
                        alt="Öncesi"
                        style={{
                          width: '50%',
                          height: 100,
                          objectFit: 'cover',
                          borderRadius: 4
                        }}
                      />
                      <img
                        src={`${API_BASE_URL}/${analysis.images.after.url}`}
                        alt="Sonrası"
                        style={{
                          width: '50%',
                          height: 100,
                          objectFit: 'cover',
                          borderRadius: 4
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

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
