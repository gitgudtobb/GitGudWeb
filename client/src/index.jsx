import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import './index.css'
import App from './App.jsx'

// Get the current origin
const origin = window.location.origin;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Auth0Provider
      domain="dev-6amkhp4hccjhqjwi.us.auth0.com"
      clientId="603wRcxAaTBTlH3j6sneIXHKqCpAJbct"
      authorizationParams={{
        redirect_uri: `${origin}/`,
        audience: "https://gitgudweb-api",
        scope: "openid profile email"
      }}
      cacheLocation="localstorage"
    >
      <App />
    </Auth0Provider>
  </StrictMode>,
)
