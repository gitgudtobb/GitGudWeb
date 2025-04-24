import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  Box,
  Typography
} from '@mui/material';
import MapImageSelector from './MapImageSelector';
// Google Maps entegrasyonu geçici olarak devre dışı bırakıldı
// import GoogleMapImageSelector from './GoogleMapImageSelector';
import SatelliteIcon from '@mui/icons-material/Satellite';

function ImageSourceSelector({ open, onClose, onImageSelect }) {
  // Google Maps tab'ı kaldırıldığı için activeTab ve handleTabChange artık gerekli değil
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 2,
          overflow: 'hidden',
          height: '90vh'
        }
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f5f5f5', p: 1, pl: 2, display: 'flex', alignItems: 'center' }}>
        <SatelliteIcon sx={{ mr: 1 }} />
        <Typography variant="h6">
          Earth Engine Uydu Görüntülerü
        </Typography>
      </Box>
      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        <MapImageSelector onImageSelect={onImageSelect} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

export default ImageSourceSelector;
