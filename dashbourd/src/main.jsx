
// تحويل جميع الأرقام والتواريخ إلى العربية تلقائياً
const originalToLocaleString = Number.prototype.toLocaleString;
Number.prototype.toLocaleString = function(locales, options) {
  return originalToLocaleString.call(this, 'ar-EG', options);
};

const originalDateToLocaleString = Date.prototype.toLocaleString;
Date.prototype.toLocaleString = function(locales, options) {
  return originalDateToLocaleString.call(this, 'ar-EG', options);
};
const originalDateToLocaleDateString = Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString = function(locales, options) {
  return originalDateToLocaleDateString.call(this, 'ar-EG', options);
};

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
