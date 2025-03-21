import { useAuth } from '../context/AuthContext';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Avatar,
  CircularProgress,
  Fade,
  Grow,
  Divider
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import GoogleIcon from '@mui/icons-material/Google';
import EmailIcon from '@mui/icons-material/Email';
import { motion } from 'framer-motion';

function LoginPage() {
  const { loginWithAuth0, isLoading } = useAuth();

  // Email-şifre girişi için Auth0
  const handleEmailLogin = () => {
    loginWithAuth0({
      authorizationParams: {
        connection: 'Username-Password-Authentication',
        ui_locales: 'tr'
      }
    });
  };

  // Google ile giriş için
  const handleGoogleLogin = () => {
    loginWithAuth0({
      authorizationParams: {
        connection: 'google-oauth2',
        ui_locales: 'tr'
      }
    });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Fade in timeout={1000}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography 
            variant="h3" 
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
          
          <Grow in timeout={1500}>
            <Paper
              component={motion.div}
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
              elevation={3}
              sx={{
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                borderRadius: 2,
                width: '100%',
                background: 'linear-gradient(to right bottom, #ffffff, #f5f5f5)',
              }}
            >
              <Avatar sx={{ m: 1, bgcolor: 'error.main' }}>
                <LockOutlinedIcon />
              </Avatar>
              <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
                Giriş Yap
              </Typography>
              
              <Button
                component={motion.button}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleEmailLogin}
                fullWidth
                variant="contained"
                startIcon={<EmailIcon />}
                sx={{
                  mt: 3,
                  py: 1.5,
                  borderRadius: 2,
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #2196F3 10%, #21CBF3 70%)',
                  }
                }}
              >
                Email ve Şifre ile Giriş Yap
              </Button>
              
              <Box sx={{ width: '100%', my: 2, display: 'flex', alignItems: 'center' }}>
                <Divider sx={{ flexGrow: 1 }} />
                <Typography variant="body2" sx={{ mx: 2, color: 'text.secondary' }}>
                  VEYA
                </Typography>
                <Divider sx={{ flexGrow: 1 }} />
              </Box>
              
              <Button
                component={motion.button}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGoogleLogin}
                fullWidth
                variant="outlined"
                startIcon={<GoogleIcon />}
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  mb: 2,
                  borderColor: '#DB4437',
                  color: '#DB4437',
                  '&:hover': {
                    borderColor: '#DB4437',
                    backgroundColor: 'rgba(219, 68, 55, 0.04)',
                  }
                }}
              >
                Google ile Giriş Yap
              </Button>
            </Paper>
          </Grow>
        </Box>
      </Fade>
    </Container>
  );
}

export default LoginPage;
