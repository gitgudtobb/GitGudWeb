import { useAuth0 } from '@auth0/auth0-react';

// API temel URL'i
const API_URL = 'http://localhost:5001/api';

// API istekleri için hook
export const useApi = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  // Token ile API isteği gönderme fonksiyonu
  const fetchWithAuth = async (endpoint, options = {}) => {
    try {
      // Kullanıcı kimliği doğrulanmışsa token al
      let headers = { ...options.headers };
      
      if (isAuthenticated) {
        const token = await getAccessTokenSilently();
        headers = {
          ...headers,
          Authorization: `Bearer ${token}`
        };
      }

      // API isteğini gönder
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
      });

      // JSON yanıtını döndür
      return await response.json();
    } catch (error) {
      console.error('API isteği hatası:', error);
      throw error;
    }
  };

  // API metotları
  return {
    // GET isteği
    get: (endpoint) => fetchWithAuth(endpoint, { method: 'GET' }),
    
    // POST isteği
    post: (endpoint, data) => fetchWithAuth(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    
    // PUT isteği
    put: (endpoint, data) => fetchWithAuth(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    
    // DELETE isteği
    delete: (endpoint) => fetchWithAuth(endpoint, { method: 'DELETE' })
  };
};
