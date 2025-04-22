import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

// Authentication context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Auth provider component
export const AuthProvider = ({ children }) => {
  // State to track if user was registered in the database
  const [userRegistered, setUserRegistered] = useState(false);
  
  // Auth0 hooks
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    loginWithRedirect, 
    logout: auth0Logout,
    getAccessTokenSilently
  } = useAuth0();

  // Get user profile
  const getUserProfile = async () => {
    return user;
  };

  // Get token
  const getToken = async () => {
    return await getAccessTokenSilently();
  };
  
  // Register user in the database when they log in
  useEffect(() => {
    const registerUser = async () => {
      if (isAuthenticated && user && !userRegistered && !isLoading) {
        try {
          // Get access token
          const token = await getAccessTokenSilently();
          
          // Call the API endpoint to register user
          const response = await axios.get('/api/auth0/me', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          console.log('User registered in database:', response.data);
          setUserRegistered(true);
        } catch (error) {
          console.error('Error registering user in database:', error);
        }
      }
    };
    
    registerUser();
  }, [isAuthenticated, user, isLoading, userRegistered, getAccessTokenSilently]);

  // u00d6zelleu015ftirilmiu015f login fonksiyonu
  const loginWithAuth0 = (options = {}) => {
    // Auth0'nun varsayu0131lan 'Log in to dev-...' mesaju0131 yerine
    // dogrudan giriş işlemini bau015flatma
    return loginWithRedirect({
      ...options,
      authorizationParams: {
        ...options.authorizationParams,
        ui_locales: 'tr',
        // login_hint parametresi kaldırıldı - email alanı boş olacak
        screen_hint: 'login',
        prompt: 'login'
      },
      appState: {
        returnTo: window.location.origin,
        ...options.appState
      }
    });
  };

  // Context value
  const value = {
    isAuthenticated,
    isLoading,
    user,
    authType: 'auth0',
    loginWithAuth0,  // u00d6zelleu015ftirilmiu015f fonksiyonu kullan
    logout: auth0Logout,
    getToken,
    getUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
