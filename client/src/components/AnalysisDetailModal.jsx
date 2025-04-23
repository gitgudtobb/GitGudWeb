import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Grid,
  Box,
  Card,
  CardContent,
  Chip,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import DangerousIcon from '@mui/icons-material/Dangerous';
import InfoIcon from '@mui/icons-material/Info';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import BarChartIcon from '@mui/icons-material/BarChart';
import ImageIcon from '@mui/icons-material/Image';
import BuildingIcon from '@mui/icons-material/Apartment';
import { useTheme } from '@mui/material/styles';

const AnalysisDetailModal = ({ 
  open, 
  analysis, 
  onClose 
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = React.useState(0);

  // Analiz yoksa modal gösterme
  if (!analysis) return null;

  // DEBUG: Log the incoming analysis prop
  console.log('AnalysisDetailModal received analysis:', analysis);

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

  // Helper function to get damage color
  const getDamageColor = (damagePercentage) => {
    if (damagePercentage < 20) return '#4caf50'; // Green
    if (damagePercentage < 50) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  // Format date function
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownloadPDF = async () => {
    const content = document.getElementById('analysis-pdf-content');
    const imagesSection = document.getElementById('pdf-images-section');
    if (!content) return;
  
    // Görüntü bölümünü geçici olarak görünür yap
    if (imagesSection) imagesSection.style.display = 'block';
  
    try {
      const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true
      });
  
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
  
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('analiz-detayi.pdf');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
    } finally {
      // Görüntü bölümünü tekrar gizle
      if (imagesSection) imagesSection.style.display = 'none';
    }
  };
  
  

  // Analiz tipini belirle ve konsola yazdır
  const isAIAnalysis = !!analysis.masked_image || !!analysis.image_id;
  const isTraditionalAnalysis = !!analysis.beforeImageUrl && !!analysis.afterImageUrl;
  
  console.log('AnalysisDetailModal - Analiz:', {
    id: analysis._id,
    name: analysis.name,
    isAIAnalysis,
    isTraditionalAnalysis,
    hasStatistics: !!analysis.statistics,
    hasBuildings: !!analysis.buildings,
    hasMaskedImage: !!analysis.masked_image,
    hasImageId: !!analysis.image_id,
    totalBuildings: analysis.total_buildings,
    createdAt: analysis.createdAt
  });

  // Tab değişikliğini işle
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: theme.palette.primary.main, 
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isAIAnalysis ? (
            <InfoIcon sx={{ mr: 1 }} />
          ) : (
            <BarChartIcon sx={{ mr: 1 }} />
          )}
          <Typography variant="h6" component="div">
            {analysis.name || `Analiz #${typeof analysis._id === 'string' ? analysis._id.substring(0, 6) : ''}`}
          </Typography>
        </Box>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: 'white' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Genel Bakış" icon={<InfoIcon />} iconPosition="start" />
          <Tab label="Görüntüler" icon={<ImageIcon />} iconPosition="start" />
          {isAIAnalysis && (
            <Tab label="Bina Detayları" icon={<BuildingIcon />} iconPosition="start" />
          )}
        </Tabs>
      </Box>

      <DialogContent dividers sx={{ p: 0 }}>
        {/* Genel Bakış Tab */}
        {activeTab === 0 && (
          <Box id="analysis-pdf-content" sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Analiz Bilgileri */}
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Analiz Bilgileri
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon>
                          <CalendarTodayIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Oluşturulma Tarihi" 
                          secondary={formatDate(analysis.createdAt || new Date())} 
                        />
                      </ListItem>
                      
                      <ListItem>
                        <ListItemIcon>
                          <LocationOnIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Konum" 
                          secondary={analysis.location?.address || 'Konum bilgisi yok'} 
                        />
                      </ListItem>
                      
                      {isAIAnalysis && (
                        <ListItem>
                          <ListItemIcon>
                            <BuildingIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Toplam Bina" 
                            secondary={analysis.total_buildings || 0} 
                          />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Hasar Analizi */}
              <Grid item xs={12} md={8}>
                <Card sx={{ height: '100%', borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Hasar Analizi
                    </Typography>
                    
                    {isTraditionalAnalysis && analysis.results && analysis.results.damagePercentage !== undefined ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', py: 2 }}>
                        <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                          <CircularProgress
                            variant="determinate"
                            value={100}
                            size={150}
                            thickness={4}
                            sx={{ color: theme.palette.grey[200], position: 'absolute' }}
                          />
                          <CircularProgress
                            variant="determinate"
                            value={analysis.results.damagePercentage}
                            size={150}
                            thickness={4}
                            sx={{ color: getDamageColor(analysis.results.damagePercentage) }}
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
                              color={getDamageColor(analysis.results.damagePercentage)}
                              fontWeight="bold"
                            >
                              {`${Math.round(analysis.results.damagePercentage)}%`}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="h6" align="center">
                          {analysis.results.damagePercentage < 20
                            ? 'Hafif Hasar'
                            : analysis.results.damagePercentage < 50
                            ? 'Orta Hasar'
                            : 'Ağır Hasar'}
                        </Typography>
                      </Box>
                    ) : isAIAnalysis && analysis.statistics ? (
                      <Box sx={{ mt: 2 }}>
                        <Grid container spacing={2}>
                          {Object.entries(analysis.statistics).map(([damage, count]) => (
                            <Grid item xs={6} sm={3} key={damage}>
                              <Paper 
                                elevation={3} 
                                sx={{ 
                                  p: 2, 
                                  borderRadius: 2,
                                  bgcolor: `${damageConfig[damage]?.color}10` || '#f5f5f5',
                                  border: `1px solid ${damageConfig[damage]?.color}30` || '#e0e0e0',
                                  height: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <Box sx={{ 
                                  width: 40, 
                                  height: 40, 
                                  borderRadius: '50%', 
                                  bgcolor: damageConfig[damage]?.color || '#999',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  mb: 1
                                }}>
                                  {damageConfig[damage]?.icon ? React.cloneElement(damageConfig[damage].icon, { style: { color: 'white' } }) : null}
                                </Box>
                                <Typography variant="h4" fontWeight="bold" align="center">
                                  {count}
                                </Typography>
                                <Typography variant="body2" color="textSecondary" align="center">
                                  {damageConfig[damage]?.label || damage}
                                </Typography>
                              </Paper>
                            </Grid>
                          ))}
                        </Grid>
                        
                        <Box sx={{ mt: 3 }}>
                          <Typography variant="subtitle1" gutterBottom>
                            Hasar Dağılımı
                          </Typography>
                          <Box sx={{ 
                            height: 30, 
                            display: 'flex', 
                            borderRadius: 1,
                            overflow: 'hidden'
                          }}>
                            {Object.entries(analysis.statistics).map(([damage, count]) => {
                              const percentage = (count / analysis.total_buildings) * 100;
                              return percentage > 0 ? (
                                <Tooltip 
                                  key={damage} 
                                  title={`${damageConfig[damage]?.label || damage}: ${count} bina (${percentage.toFixed(1)}%)`}
                                >
                                  <Box 
                                    sx={{ 
                                      width: `${percentage}%`, 
                                      bgcolor: damageConfig[damage]?.color || '#999',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'white',
                                      fontSize: percentage > 10 ? '0.75rem' : '0',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    {percentage > 10 ? `${percentage.toFixed(0)}%` : ''}
                                  </Box>
                                </Tooltip>
                              ) : null;
                            })}
                          </Box>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                            {Object.entries(damageConfig).map(([key, value]) => (
                              <Box key={key} sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                                <Box 
                                  sx={{ 
                                    width: 12, 
                                    height: 12, 
                                    borderRadius: '50%', 
                                    bgcolor: value.color,
                                    mr: 0.5 
                                  }} 
                                />
                                <Typography variant="caption">
                                  {value.label}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ p: 3, textAlign: 'center' }}>
                        <InfoIcon sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.5 }} />
                        <Typography color="textSecondary">
                          Hasar analizi bilgisi bulunamadı
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            <Box 
              id="pdf-images-section"
              style={{ display: 'none' }} // PDF indirirken elle görünür yapacağız
            >

            <Divider sx={{ my: 3 }} />
            <Typography variant="h5" gutterBottom>Görüntüler</Typography>

            {isTraditionalAnalysis && (
              <>
                <Typography variant="subtitle1">Deprem Öncesi</Typography>
                <img 
                  src={analysis.beforeImageUrl} 
                  alt="Deprem Öncesi" 
                  style={{ width: '100%', maxHeight: 250, objectFit: 'cover', borderRadius: 8, border: '1px solid #ccc', marginBottom: 16 }}
                />
                <Typography variant="subtitle1">Deprem Sonrası</Typography>
                <img 
                  src={analysis.afterImageUrl} 
                  alt="Deprem Sonrası" 
                  style={{ width: '100%', maxHeight: 250, objectFit: 'cover', borderRadius: 8, border: '1px solid #ccc' }}
                />
              </>
            )}

            {isAIAnalysis && analysis.masked_image && (
                <>
                  <Typography variant="subtitle1">Yapay Zeka Analizi</Typography>
                  <img 
                    src={analysis.masked_image} 
                    alt="Hasar Haritası" 
                    style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 8, border: '1px solid #ccc', marginTop: 8 }}
                  />
                </>
            )}
            </Box>
          </Box>
        )}
        
        {/* Görüntüler Tab */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            {isTraditionalAnalysis ? (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <Box sx={{ position: 'relative', paddingTop: '75%' }}>
                      <Box
                        component="img"
                        src={analysis.beforeImageUrl}
                        alt="Deprem Öncesi"
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </Box>
                    <Box sx={{ p: 2, bgcolor: theme.palette.primary.main, color: 'white' }}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        Deprem Öncesi
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <Box sx={{ position: 'relative', paddingTop: '75%' }}>
                      <Box
                        component="img"
                        src={analysis.afterImageUrl}
                        alt="Deprem Sonrası"
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </Box>
                    <Box sx={{ p: 2, bgcolor: theme.palette.primary.main, color: 'white' }}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        Deprem Sonrası
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
                
                {normAnalysis.results && normAnalysis.results.diffImageUrl && (
                  <Grid item xs={12}>
                    <Card sx={{ borderRadius: 2, overflow: 'hidden', mt: 2 }}>
                      <Box sx={{ position: 'relative', paddingTop: '56.25%' }}>
                        <Box
                          component="img"
                          src={analysis.results.diffImageUrl}
                          alt="Fark Görüntüsü"
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain'
                          }}
                        />
                      </Box>
                      <Box sx={{ p: 2, bgcolor: theme.palette.secondary.main, color: 'white' }}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          Fark Analizi
                        </Typography>
                      </Box>
                    </Card>
                  </Grid>
                )}
              </Grid>
            ) : isAIAnalysis ? (
              <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
                {analysis.masked_image ? (
                  <>
                    <Box sx={{ position: 'relative', paddingTop: '75%' }}>
                      <Box
                        component="img"
                        src={analysis.masked_image}
                        alt="Hasar Analizi"
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    </Box>
                    <Box sx={{ p: 2, bgcolor: theme.palette.primary.main, color: 'white' }}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        Bina hasarları renklerle işaretlenmiştir
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Box sx={{ p: 5, textAlign: 'center' }}>
                    <InfoIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      Görüntü işleniyor
                    </Typography>
                    <Typography color="textSecondary">
                      Analiz görüntüsü henüz hazır değil. Lütfen daha sonra tekrar deneyin.
                    </Typography>
                  </Box>
                )}
              </Card>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <InfoIcon sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.5 }} />
                <Typography color="textSecondary">
                  Görüntü bulunamadı
                </Typography>
              </Box>
            )}
          </Box>
        )}
        
        {/* Bina Detayları Tab - Sadece AI Analizleri için */}
        {activeTab === 2 && isAIAnalysis && (
          <Box sx={{ p: 3 }}>
            {analysis.buildings && analysis.buildings.length > 0 ? (
              <Grid container spacing={2}>
                {analysis.buildings.map((building, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card sx={{ borderRadius: 2 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Bina #{index + 1}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Chip 
                            icon={damageConfig[building.damage_class]?.icon ? 
                              React.cloneElement(damageConfig[building.damage_class].icon, { style: { color: 'white' } }) : null
                            }
                            label={damageConfig[building.damage_class]?.label || building.damage_class} 
                            sx={{ 
                              bgcolor: damageConfig[building.damage_class]?.color || '#999',
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                          />
                          
                          <Typography variant="body2" color="textSecondary" sx={{ ml: 1 }}>
                            {building.confidence ? `${(building.confidence * 100).toFixed(1)}% güven` : ''}
                          </Typography>
                        </Box>
                        
                        <Typography variant="body2" gutterBottom>
                          <strong>Koordinatlar:</strong> {building.bbox ? 
                            `x: ${building.bbox[0].toFixed(0)}, y: ${building.bbox[1].toFixed(0)}, w: ${(building.bbox[2] - building.bbox[0]).toFixed(0)}, h: ${(building.bbox[3] - building.bbox[1]).toFixed(0)}` : 
                            'Bilinmiyor'
                          }
                        </Typography>
                        
                        {building.area && (
                          <Typography variant="body2">
                            <strong>Alan:</strong> {building.area.toFixed(1)} piksel²
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <InfoIcon sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.5 }} />
                <Typography color="textSecondary">
                  Bina detayları bulunamadı
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          startIcon={<CloseIcon />}
        >
          Kapat
          </Button>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined" 
              color="secondary"
              onClick={handleDownloadPDF}
            >
              PDF Olarak İndir
            </Button>

            <Button 
              variant="contained" 
              color="primary"
              onClick={() => {
                alert('Rapor oluşturma özelliği yakında eklenecek');
              }}
            >
              Rapor Oluştur
            </Button>
          </Box>
        </DialogActions>
    </Dialog>
  );
};

export default AnalysisDetailModal;
