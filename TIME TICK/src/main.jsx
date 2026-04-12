import React from 'react'
import ReactDOM from 'react-dom/client'
import { SplashScreen } from '@capacitor/splash-screen'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Hide the splash screen after the app is mounted
SplashScreen.hide();
