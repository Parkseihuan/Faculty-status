/**
 * API 호출 유틸리티
 */
class API {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('admin_token');
  }

  /**
   * 토큰 설정
   */
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('admin_token', token);
    } else {
      localStorage.removeItem('admin_token');
    }
  }

  /**
   * 토큰 가져오기
   */
  getToken() {
    return this.token || localStorage.getItem('admin_token');
  }

  /**
   * HTTP 요청
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // 토큰이 있으면 Authorization 헤더 추가
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP Error: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  /**
   * GET 요청
   */
  async get(endpoint) {
    return this.request(endpoint, {
      method: 'GET',
      cache: 'no-store' // 브라우저 캐시 사용 안 함
    });
  }

  /**
   * POST 요청
   */
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT 요청
   */
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE 요청
   */
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  /**
   * 파일 업로드
   */
  async uploadFile(endpoint, file) {
    const url = `${this.baseURL}${endpoint}`;
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP Error: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('File Upload Error:', error);
      throw error;
    }
  }

  // === 인증 API ===

  /**
   * 로그인
   */
  async login(password) {
    const result = await this.post('/auth/login', { password });
    if (result.token) {
      this.setToken(result.token);
    }
    return result;
  }

  /**
   * 토큰 검증
   */
  async verifyToken(token) {
    return this.post('/auth/verify', { token });
  }

  /**
   * 로그아웃
   */
  logout() {
    this.setToken(null);
  }

  /**
   * 비밀번호 힌트 조회
   */
  async getPasswordHint() {
    return this.get('/auth/hint');
  }

  /**
   * 비밀번호 변경
   */
  async changePassword(currentPassword, newPassword) {
    return this.post('/auth/change-password', { currentPassword, newPassword });
  }

  // === 교원 데이터 API ===

  /**
   * 교원 데이터 조회
   */
  async getFacultyData() {
    return this.get('/faculty/data');
  }

  /**
   * 교원 통계 조회
   */
  async getFacultyStats() {
    return this.get('/faculty/stats');
  }

  // === 업로드 API ===

  /**
   * 엑셀 파일 업로드
   */
  async uploadExcel(file) {
    return this.uploadFile('/upload', file);
  }

  /**
   * 업로드 기록 조회
   */
  async getUploadHistory() {
    return this.get('/upload/history');
  }

  // === 조직 API ===

  /**
   * 조직 구조 조회
   */
  async getOrganization() {
    return this.get('/organization');
  }

  /**
   * 조직 구조 업데이트
   */
  async updateOrganization(deptStructure) {
    return this.put('/organization', { deptStructure });
  }
}

// API 인스턴스 생성
const api = new API(API_BASE_URL);
