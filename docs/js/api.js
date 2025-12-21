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
   * HTTP 요청 (재시도 로직 포함 - Render.com 무료 플랜 대응)
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

    // 재시도 설정 (Render.com 무료 플랜의 cold start 대응)
    const maxRetries = 3;
    const retryDelay = 2000; // 2초

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `HTTP Error: ${response.status}`);
        }

        return data;
      } catch (error) {
        // 마지막 시도가 아니고, 네트워크 에러인 경우 재시도
        if (attempt < maxRetries && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
          console.log(`🔄 서버 연결 재시도 중... (${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        }

        console.error('API Request Error:', error);
        throw error;
      }
    }
  }

  /**
   * GET 요청
   */
  async get(endpoint) {
    // 캐시 방지를 위한 타임스탬프 쿼리 파라미터 추가
    const separator = endpoint.includes('?') ? '&' : '?';
    const timestampedEndpoint = `${endpoint}${separator}_t=${Date.now()}`;

    return this.request(timestampedEndpoint, {
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
   * 연구년/휴직 교원 파일 업로드
   */
  async uploadResearchLeave(file) {
    return this.uploadFile('/upload/research-leave', file);
  }

  /**
   * 발령사항 파일 업로드
   */
  async uploadAppointment(file) {
    return this.uploadFile('/upload/appointment', file);
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
   * 조직 구조 업데이트 (특정 교원 유형)
   * @param {string} type - 'fulltime', 'parttime', 'other' 중 하나
   * @param {Array} deptStructure - 조직 구조 데이터
   */
  async updateOrganization(type, deptStructure) {
    return this.put(`/organization/${type}`, { deptStructure });
  }

  /**
   * 조직 순서 기본값 조회 (전임교원/비전임교원/기타)
   */
  async getOrganizationDefaults() {
    return this.get('/organization/defaults');
  }

  /**
   * 특정 교원 유형의 기본값 저장
   * @param {string} type - 'fulltime', 'parttime', 'other' 중 하나
   * @param {Array} deptStructure - 조직 구조 데이터
   */
  async updateOrganizationDefault(type, deptStructure) {
    return this.put(`/organization/defaults/${type}`, { deptStructure });
  }
}

// API 인스턴스 생성
const api = new API(API_BASE_URL);
