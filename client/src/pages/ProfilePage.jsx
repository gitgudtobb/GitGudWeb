import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useApi } from '../services/api';
import {
  Box,
  Container,
  Typography,
  Paper,
  Avatar,
  CircularProgress,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

function ProfilePage() {
  const { user: auth0User, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const [dbUser, setDbUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  const api = useApi();

  // Auth0 kullanıcı bilgilerini al
  useEffect(() => {
    const getToken = async () => {
      try {
        if (isAuthenticated) {
          const accessToken = await getAccessTokenSilently();
          setToken(accessToken);
        }
      } catch (error) {
        console.error('Token alma hatası:', error);
      }
    };

    getToken();
  }, [isAuthenticated, getAccessTokenSilently]);

  // MongoDB'deki kullanıcı bilgilerini al
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Kullanıcı profil bilgilerini al
        if (isAuthenticated) {
          const userData = await api.get('/user/profile');
          setDbUser(userData);
        }
        
        // Tüm kullanıcıları listele
        const usersData = await api.get('/user/all');
        setAllUsers(usersData);
        
        setLoading(false);
      } catch (error) {
        console.error('Kullanıcı bilgileri alınamadı:', error);
        setError('Kullanıcı bilgileri alınamadı');
        setLoading(false);
      }
    };

    if (token) {
      fetchUserData();
    }
  }, [api, isAuthenticated, token]);

  if (isLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Profil Bilgileri
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Auth0 Kullanıcı Bilgileri
        </Typography>
        
        {isAuthenticated && auth0User ? (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar 
              src={auth0User.picture} 
              alt={auth0User.name}
              sx={{ width: 80, height: 80, mr: 2 }}
            />
            <Box>
              <Typography variant="h6">{auth0User.name}</Typography>
              <Typography variant="body1">{auth0User.email}</Typography>
              <Typography variant="body2" color="textSecondary">
                {auth0User.sub}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Typography>Giriş yapılmadı</Typography>
        )}
        
        <Typography variant="subtitle1" sx={{ mt: 2 }}>
          JWT Token:
        </Typography>
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            maxHeight: 100, 
            overflow: 'auto', 
            wordBreak: 'break-all',
            bgcolor: 'grey.100',
            fontFamily: 'monospace',
            fontSize: '0.8rem'
          }}
        >
          {token || 'Token bulunamadı'}
        </Paper>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          MongoDB Kullanıcı Bilgileri
        </Typography>
        
        {dbUser ? (
          <Box>
            <Typography variant="subtitle1">Kullanıcı Adı: {dbUser.username}</Typography>
            <Typography variant="subtitle1">E-posta: {dbUser.email}</Typography>
            <Typography variant="subtitle1">MongoDB ID: {dbUser._id}</Typography>
            <Typography variant="subtitle1">Auth0 ID: {dbUser.auth0Id}</Typography>
            <Typography variant="subtitle1">Oluşturulma Tarihi: {new Date(dbUser.createdAt).toLocaleString()}</Typography>
          </Box>
        ) : (
          <Typography>MongoDB kullanıcı bilgileri bulunamadı</Typography>
        )}
      </Paper>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Tüm Kullanıcılar (MongoDB)
        </Typography>
        
        {allUsers && allUsers.length > 0 ? (
          <List>
            {allUsers.map((user, index) => (
              <Box key={user._id}>
                <ListItem>
                  <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                    <PersonIcon />
                  </Avatar>
                  <ListItemText
                    primary={user.username}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="textPrimary">
                          {user.email}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2" color="textSecondary">
                          ID: {user._id}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2" color="textSecondary">
                          Auth0 ID: {user.auth0Id || 'Yok'}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                {index < allUsers.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        ) : (
          <Typography>Henüz kullanıcı bulunmuyor</Typography>
        )}
      </Paper>
    </Container>
  );
}

export default ProfilePage;
