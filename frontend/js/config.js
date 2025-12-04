/**
 * API 설정
 */
const API_CONFIG = {
  // 개발 환경
  development: {
    baseURL: 'http://localhost:3000/api'
  },
  // 프로덕션 환경
  production: {
    baseURL: 'https://your-backend-url.onrender.com/api' // 배포 후 실제 URL로 변경
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
