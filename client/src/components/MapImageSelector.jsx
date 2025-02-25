import { useState, useRef } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const API_BASE_URL = 'http://localhost:5001';

const center = {
  lat: 34.052235, // LA coordinates
  lng: -118.243683,
};

function MapImageSelector({ onImageSelect, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedBounds, setSelectedBounds] = useState(null);
  const [step, setStep] = useState('select-area'); // 'select-area' veya 'select-date'

  const handleSelectArea = async () => {
    if (!mapRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const map = mapRef.current;
      const bounds = map.getBounds();

      // Tarihleri al
      const response = await fetch(`${API_BASE_URL}/api/earth-engine/dates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat: map.getCenter().lat,
          lng: map.getCenter().lng,
          bounds: {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest(),
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Tarihler alınırken bir hata oluştu');
      }

      if (!data.dates || data.dates.length === 0) {
        throw new Error('Bu bölge için kullanılabilir görüntü bulunamadı');
      }

      const dates = data.dates.map((date) => dayjs(date));
      setSelectedDate(dates[0]);
      setAvailableDates(dates);
      setSelectedBounds(bounds);
      setStep('select-date');
    } catch (error) {
      console.error('Error fetching dates:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetImage = async () => {
    if (!selectedDate || !selectedBounds || !mapRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const map = mapRef.current;
      const viewport = {
        width: map.getContainer().clientWidth,
        height: map.getContainer().clientHeight,
      };

      const response = await fetch(`${API_BASE_URL}/api/earth-engine/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat: map.getCenter().lat,
          lng: map.getCenter().lng,
          date: selectedDate.format('YYYY-MM-DD'),
          bounds: {
            north: selectedBounds.getNorth(),
            south: selectedBounds.getSouth(),
            east: selectedBounds.getEast(),
            west: selectedBounds.getWest(),
          },
          viewport: viewport,
          zoom: map.getZoom(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Görüntü alınırken bir hata oluştu');
      }

      if (!data.imageUrl) {
        throw new Error('Bu tarih için görüntü bulunamadı');
      }

      onImageSelect(data.imageUrl, data.metadata);
      onClose();
    } catch (error) {
      console.error('Error fetching image:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('select-area');
    setSelectedDate(null);
    setAvailableDates([]);
    setSelectedBounds(null);
  };

  return (
    <Box sx={{ width: '100%', height: '600px', position: 'relative' }}>
      <Box
        sx={{
          height: '400px',
          position: 'relative',
          '& .leaflet-tile': {
            crossOrigin: 'anonymous',
          },
        }}
      >
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            url="http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
            maxZoom={20}
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
            attribution="&copy; Google Maps"
          />
        </MapContainer>
      </Box>
      <Box
        sx={{
          mt: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}

        {step === 'select-date' && (
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Tarih Seçin"
              value={selectedDate}
              onChange={(newDate) => setSelectedDate(newDate)}
              disabled={loading}
              shouldDisableDate={(date) =>
                !availableDates.some((d) => d.isSame(date, 'day'))
              }
            />
          </LocalizationProvider>
        )}

        <Box sx={{ display: 'flex', gap: 2 }}>
          {step === 'select-area' ? (
            <>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSelectArea}
                disabled={loading}
                startIcon={
                  loading && <CircularProgress size={20} color="inherit" />
                }
              >
                {loading ? 'Tarihler Yükleniyor...' : 'Bu Bölgeyi Seç'}
              </Button>
              <Button variant="outlined" onClick={onClose}>
                İptal
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="contained"
                color="primary"
                onClick={handleGetImage}
                disabled={loading || !selectedDate}
                startIcon={
                  loading && <CircularProgress size={20} color="inherit" />
                }
              >
                {loading ? 'Görüntü Alınıyor...' : 'Görüntüyü Al'}
              </Button>
              <Button variant="outlined" onClick={handleBack}>
                Geri
              </Button>
              <Button variant="outlined" onClick={onClose}>
                İptal
              </Button>
            </>
          )}
        </Box>
      </Box>
      <Typography
        variant="caption"
        sx={{ mt: 1, display: 'block', textAlign: 'center' }}
      >
        {step === 'select-area'
          ? 'Haritayı istediğiniz bölgeye getirip zoom yaparak görüntülemek istediğiniz alanı seçebilirsiniz'
          : 'Seçtiğiniz bölge için kullanılabilir tarihleri görebilirsiniz'}
      </Typography>
    </Box>
  );
}

export default MapImageSelector;
