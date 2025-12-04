/**
 * API 설정
 */
const API_CONFIG = {
  development: {
    baseURL: 'http://localhost:3000/api'
  },
  production: {
    baseURL: 'https://faculty-status-backend-2s16.onrender.com/api'
  }
};

// 현재 환경 감지
const ENV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'development'
  : 'production';

// API 베이스 URL
const API_BASE_URL = API_CONFIG[ENV].baseURL;

console.log('Environment:', ENV);
console.log('API Base URL:', API_BASE_URL);
