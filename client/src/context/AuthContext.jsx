import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

// Authentication context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Auth provider component
export const AuthProvider = ({ children }) => {
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

  // Context value
  const value = {
    isAuthenticated,
    isLoading,
    user,
    authType: 'auth0',
    loginWithAuth0: loginWithRedirect,
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
