# 🚀 빠른 시작 가이드

## 개발 환경 설정 (로컬)

### 1. 저장소 클론

```bash
git clone https://github.com/Parkseihuan/Faculty-status.git
cd Faculty-status
```

### 2. Backend 설정

```bash
cd backend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env

# .env 파일을 열어서 설정 수정
# - JWT_SECRET: 랜덤 문자열로 변경
# - ADMIN_PASSWORD_HASH: 아래 명령어로 생성

# 관리자 비밀번호 해시 생성
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('admin123', 10).then(hash => console.log('Hash:', hash));"

# 생성된 해시를 .env의 ADMIN_PASSWORD_HASH에 복사

# 서버 시작
npm start
```

서버가 http://localhost:3000 에서 실행됩니다.

### 3. Frontend 설정

새 터미널에서:

```bash
cd docs

# 간단한 HTTP 서버 실행
npx http-server -p 8080

# 또는 Python이 설치되어 있다면:
python -m http.server 8080
```

브라우저에서 http://localhost:8080 접속

### 4. 테스트

1. **Health Check**: http://localhost:3000/health
2. **관리자 페이지**: http://localhost:8080/admin.html
3. **일반 사용자 페이지**: http://localhost:8080/index.html

---

## 프로덕션 배포

자세한 내용은 [DEPLOYMENT.md](DEPLOYMENT.md) 참고

### Backend (Render.com)

1. Render.com에서 이 저장소 연결
2. 환경 변수 설정
3. 자동 배포

### Frontend (GitHub Pages)

1. GitHub Pages 활성화
2. `docs/js/config.js`에서 API URL 업데이트
3. Push하면 자동 배포

---

## 첫 사용

### 1. 관리자 로그인

- URL: http://localhost:8080/admin.html (로컬) 또는 배포 URL
- 비밀번호: .env에 설정한 비밀번호 (기본: admin123)

### 2. 엑셀 파일 업로드

1. "📤 엑셀 업로드" 탭
2. 교원현황 엑셀 파일 선택
3. 업로드 버튼 클릭

### 3. 데이터 확인

- 일반 사용자 페이지에서 업로드된 데이터 확인
- 각 교원명을 클릭하여 상세 정보 조회

---

## 문제 해결

### Backend 시작 안 됨

```bash
# 포트가 이미 사용 중인 경우
# .env 파일에서 PORT를 다른 번호로 변경 (예: 3001)

# 의존성 재설치
rm -rf node_modules package-lock.json
npm install
```

### Frontend에서 Backend 연결 안 됨

1. Backend가 실행 중인지 확인
2. `docs/js/config.js`에서 API URL 확인
3. 브라우저 콘솔(F12)에서 에러 확인

### CORS 에러

Backend `.env` 파일의 `FRONTEND_URL`을 확인:

```env
FRONTEND_URL=http://localhost:8080
```

---

## 다음 단계

- [USAGE.md](USAGE.md): 자세한 사용 방법
- [DEPLOYMENT.md](DEPLOYMENT.md): 프로덕션 배포 가이드
- [README.md](README.md): 프로젝트 개요
