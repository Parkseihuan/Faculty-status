# 배포 가이드

## 📋 사전 준비

- GitHub 계정
- Render.com 계정 (무료)
- **MongoDB Atlas 계정 (무료)** ⭐ 필수!

## 🚀 Backend 배포 (Render.com)

> ⚠️ **중요**: 백엔드 배포 전에 먼저 MongoDB Atlas를 설정해야 합니다!
>
> 📖 **[MongoDB Atlas 설정 가이드 보기](./MONGODB_SETUP.md)** ← 여기를 먼저 진행하세요!

### 1. Render.com 가입 및 연결

1. [Render.com](https://render.com)에 가입
2. GitHub 계정과 연동
3. 이 저장소를 선택

### 2. 관리자 비밀번호 설정

**기본 비밀번호**: `admin2025` (힌트: `a********5`)

첫 로그인 후 관리자 페이지의 "⚙️ 설정" 탭에서 비밀번호를 변경하세요.

> **참고**: 비밀번호는 `backend/data/auth-config.json` 파일에 저장됩니다. 이 파일은 자동으로 생성되며, Git에 포함되지 않습니다. 배포 시 기본 비밀번호가 설정됩니다.

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

⚠️ **먼저 MongoDB Atlas를 설정하세요!** → [MongoDB 설정 가이드](./MONGODB_SETUP.md)

| Key | Value | 필수 여부 |
|-----|-------|----------|
| `MONGODB_URI` | MongoDB Atlas 연결 문자열 (예: `mongodb+srv://user:pass@cluster.mongodb.net/faculty-status`) | ⭐ **필수** |
| `JWT_SECRET` | 랜덤 문자열, 32자 이상 권장 (예: `your-super-secret-key-32-chars-min`) | ⭐ **필수** |
| `FRONTEND_URL` | `https://parkseihuan.github.io` | ⭐ **필수** |
| `NODE_ENV` | `production` | 권장 |
| `PORT` | `10000` | 선택 (Render가 자동 할당) |
| `MAX_FILE_SIZE` | `10` | 선택 |

> **중요**:
> - `MONGODB_URI`는 MongoDB Atlas에서 발급받은 연결 문자열을 입력하세요
> - `FRONTEND_URL`은 경로 없이 origin만 입력하세요! (`/Faculty-status` 제외)

4. "Create Web Service" 클릭

### 4. 배포 URL 확인

- 배포가 완료되면 URL이 생성됩니다 (예: `https://faculty-status-backend.onrender.com`)
- 이 URL을 복사해두세요

## 🌐 Frontend 배포 (GitHub Pages)

### 1. API URL 업데이트

`docs/js/config.js` 파일을 수정:

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
5. Folder: `/docs` 선택
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
| `FRONTEND_URL` | CORS 허용 Origin (경로 제외!) | `https://parkseihuan.github.io` |
| `MAX_FILE_SIZE` | 최대 파일 크기 (MB) | `10` |

> **참고**: 비밀번호는 파일 기반으로 관리되므로 `ADMIN_PASSWORD_HASH` 환경변수는 필요하지 않습니다.

### Frontend

- `docs/js/config.js`에서 프로덕션 API URL 설정

## 🔒 보안 권장사항

1. **JWT_SECRET**: 최소 32자 이상의 랜덤 문자열 사용
2. **ADMIN_PASSWORD**: 첫 로그인 후 즉시 관리자 페이지에서 비밀번호를 변경하세요
3. **HTTPS**: 항상 HTTPS로 접속 (HTTP는 자동 리다이렉트됨)
4. **정기적인 비밀번호 변경**: 3-6개월마다 관리자 비밀번호 변경 (관리자 페이지 ⚙️ 설정 탭)
5. **비밀번호 힌트**: 로그인 페이지에 비밀번호 첫 글자와 마지막 글자만 표시됩니다

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

Backend 환경 변수 `FRONTEND_URL`을 origin만 설정 (경로 제외):
```
https://parkseihuan.github.io
```

**주의**: `/Faculty-status` 경로를 포함하면 CORS 에러가 발생합니다!
- ✅ 올바름: `https://parkseihuan.github.io`
- ❌ 잘못됨: `https://parkseihuan.github.io/Faculty-status`

## 📞 지원

문제가 지속되면 GitHub Issues에 문의하세요.
