# 배포 가이드

## 📋 사전 준비

- GitHub 계정
- Render.com 계정 (무료)

## 🚀 Backend 배포 (Render.com)

### 1. Render.com 가입 및 연결

1. [Render.com](https://render.com)에 가입
2. GitHub 계정과 연동
3. 이 저장소를 선택

### 2. 관리자 비밀번호 해시 생성

로컬에서 다음 명령어 실행:

```bash
cd backend
npm install
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-password-here', 10).then(hash => console.log('Hash:', hash));"
```

나온 해시 값을 복사해두세요.

### 3. Web Service 생성

1. Render Dashboard에서 "New +" → "Web Service" 선택
2. 이 저장소 선택
3. 다음 설정 입력:

**Basic Settings:**
- Name: `faculty-status-backend`
- Region: `Singapore` (가장 가까운 지역)
- Branch: `claude/migrate-apps-script-github-01FtNfkPm5SF1bt4ndNzVe4N` (또는 main)
- Root Directory: `backend`
- Environment: `Node`
- Build Command: `npm install`
- Start Command: `npm start`

**Environment Variables:**

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `JWT_SECRET` | (랜덤 문자열, 32자 이상 권장) |
| `ADMIN_PASSWORD_HASH` | (위에서 생성한 해시 값) |
| `FRONTEND_URL` | `https://parkseihuan.github.io/Faculty-status` |
| `MAX_FILE_SIZE` | `10` |

4. "Create Web Service" 클릭

### 4. 배포 URL 확인

- 배포가 완료되면 URL이 생성됩니다 (예: `https://faculty-status-backend.onrender.com`)
- 이 URL을 복사해두세요

## 🌐 Frontend 배포 (GitHub Pages)

### 1. API URL 업데이트

`frontend/js/config.js` 파일을 수정:

```javascript
const API_CONFIG = {
  // ...
  production: {
    baseURL: 'https://your-backend-url.onrender.com/api' // 실제 Render URL로 변경
  }
};
```

### 2. GitHub Pages 활성화

1. GitHub 저장소로 이동
2. Settings → Pages
3. Source: Deploy from a branch
4. Branch: 선택 (예: `main` 또는 `claude/migrate...`)
5. Folder: `/frontend` 선택
6. Save

### 3. 배포 확인

- 몇 분 후 `https://parkseihuan.github.io/Faculty-status` 에서 확인 가능

## ✅ 배포 후 확인사항

### Backend 테스트

```bash
# Health Check
curl https://your-backend-url.onrender.com/health

# 응답 예시:
# {"status":"OK","timestamp":"2025-12-04T...","uptime":123.45}
```

### Frontend 테스트

1. 브라우저에서 `https://parkseihuan.github.io/Faculty-status` 접속
2. "관리자" 버튼 클릭
3. 설정한 비밀번호로 로그인
4. 엑셀 파일 업로드 테스트
5. 일반 사용자 페이지에서 데이터 조회 확인

## 🔧 환경 변수 설명

### Backend

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `NODE_ENV` | 실행 환경 | `production` |
| `PORT` | 서버 포트 | `10000` |
| `JWT_SECRET` | JWT 토큰 암호화 키 | `your-super-secret-key-min-32-chars` |
| `ADMIN_PASSWORD_HASH` | 관리자 비밀번호 (bcrypt 해시) | `$2a$10$...` |
| `FRONTEND_URL` | CORS 허용 URL | `https://parkseihuan.github.io/Faculty-status` |
| `MAX_FILE_SIZE` | 최대 파일 크기 (MB) | `10` |

### Frontend

- `frontend/js/config.js`에서 프로덕션 API URL 설정

## 🔒 보안 권장사항

1. **JWT_SECRET**: 최소 32자 이상의 랜덤 문자열 사용
2. **ADMIN_PASSWORD**: 강력한 비밀번호 사용 (대소문자, 숫자, 특수문자 포함)
3. **HTTPS**: 항상 HTTPS로 접속 (HTTP는 자동 리다이렉트됨)
4. **정기적인 비밀번호 변경**: 3-6개월마다 관리자 비밀번호 변경

## 🐛 문제 해결

### Backend가 시작되지 않는 경우

1. Render Dashboard에서 Logs 확인
2. 환경 변수가 올바르게 설정되었는지 확인
3. `package.json`의 dependencies 확인

### Frontend에서 데이터를 불러올 수 없는 경우

1. Browser Console에서 에러 확인 (F12)
2. `config.js`의 API URL이 올바른지 확인
3. Backend의 CORS 설정 확인 (`FRONTEND_URL`)
4. Backend Health Check 확인

### CORS 에러가 발생하는 경우

Backend 환경 변수 `FRONTEND_URL`을 정확한 GitHub Pages URL로 설정:
```
https://parkseihuan.github.io/Faculty-status
```

(끝에 슬래시 `/` 없음)

## 📞 지원

문제가 지속되면 GitHub Issues에 문의하세요.
