import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { Box, Button, Typography } from '@mui/material';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import html2canvas from 'html2canvas';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const center = {
  lat: 41.0082, // Istanbul coordinates
  lng: 28.9784,
};

function MapImageSelector({ onImageSelect, onClose }) {
  const [position, setPosition] = useState(center);
  const mapRef = useRef(null);
  const containerRef = useRef(null);

  const handleMapClick = (e) => {
    setPosition(e.latlng);
  };

  const handleImageSelect = async () => {
    try {
      if (!containerRef.current) return;

      const canvas = await html2canvas(containerRef.current, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });

      const image = canvas.toDataURL('image/jpeg', 0.9);
      onImageSelect(image);
      onClose();
    } catch (error) {
      console.error('Error capturing map view:', error);
    }
  };

  const MapEvents = () => {
    const map = useMap();
    useEffect(() => {
      map.on('click', handleMapClick);
      return () => {
        map.off('click', handleMapClick);
      };
    }, [map]);
    return null;
  };

  return (
    <Box sx={{ width: '100%', height: '500px', position: 'relative' }}>
      <Box 
        ref={containerRef}
        sx={{ 
          height: '400px', 
          position: 'relative',
          '& .leaflet-tile': {
            crossOrigin: 'anonymous'
          }
        }}
      >
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            crossOrigin="anonymous"
          />
          <Marker position={[position.lat, position.lng]} />
          <MapEvents />
        </MapContainer>
      </Box>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleImageSelect}
        >
          Bu Konumu Seç
        </Button>
        <Button variant="outlined" onClick={onClose}>
          İptal
        </Button>
      </Box>
      <Typography variant="caption" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
        Harita üzerinde bir noktaya tıklayarak konum seçebilirsiniz
      </Typography>
    </Box>
  );
}

export default MapImageSelector;
