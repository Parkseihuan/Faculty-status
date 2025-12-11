# 🎯 Faculty Status 시스템 설정 체크리스트

이 체크리스트를 따라 하나씩 체크하면서 설정을 완료하세요.

---

## ✅ Phase 1: MongoDB Atlas 설정 (15분)

📖 상세 가이드: [MONGODB_SETUP.md](./MONGODB_SETUP.md)

- [ ] **1.1** MongoDB Atlas 계정 생성
  - 웹사이트: https://www.mongodb.com/cloud/atlas/register
  - Google 계정 또는 이메일로 가입

- [ ] **1.2** 무료 클러스터 생성
  - Cluster Tier: **M0 Sandbox (FREE)**
  - Region: **Seoul (ap-northeast-2)**
  - Cluster Name: `faculty-status`

- [ ] **1.3** 데이터베이스 사용자 생성
  - Username: `faculty_admin`
  - Password: 강력한 비밀번호 생성 후 **안전한 곳에 저장**
  - 권한: Read and write to any database

- [ ] **1.4** 네트워크 접근 허용
  - IP Address: `0.0.0.0/0` (모든 IP 허용)

- [ ] **1.5** MongoDB 연결 문자열 복사
  ```
  mongodb+srv://<USERNAME>:<PASSWORD>@<CLUSTER>.mongodb.net/faculty-status?retryWrites=true&w=majority
  ```
  - ✅ `<USERNAME>`, `<PASSWORD>`, `<CLUSTER>`를 실제 값으로 교체
  - ✅ 연결 문자열을 메모장에 저장

---

## ✅ Phase 2: Render.com 환경변수 설정 (5분)

📖 상세 가이드: [DEPLOYMENT.md](./DEPLOYMENT.md)

- [ ] **2.1** Render.com 대시보드 접속
  - 웹사이트: https://dashboard.render.com/

- [ ] **2.2** Faculty Status 백엔드 서비스 선택

- [ ] **2.3** Environment 탭에서 환경변수 추가

### 필수 환경변수 (3개):

- [ ] **MONGODB_URI**
  - Value: Phase 1.5에서 복사한 MongoDB 연결 문자열

- [ ] **JWT_SECRET**
  - Value: 랜덤한 긴 문자열 (최소 32자)
  - 예: `your-super-secret-jwt-key-minimum-32-characters-long-12345678`

- [ ] **FRONTEND_URL**
  - Value: `https://parkseihuan.github.io`

- [ ] **2.4** Save Changes 클릭 → 자동 재배포 시작

---

## ✅ Phase 3: 배포 확인 (5분)

- [ ] **3.1** Render.com Logs 탭에서 성공 메시지 확인
  ```
  ✅ MongoDB connected successfully
  🚀 Server running on port 3000
  ```

- [ ] **3.2** Health Check 테스트
  - 브라우저에서 접속: `https://faculty-status.onrender.com/health`
  - 예상 응답:
    ```json
    {
      "status": "OK",
      "timestamp": "...",
      "uptime": 123.456
    }
    ```

---

## ✅ Phase 4: 데이터 업로드 및 테스트 (5분)

- [ ] **4.1** 관리자 페이지 접속
  - URL: https://parkseihuan.github.io/Faculty-status/admin.html

- [ ] **4.2** 로그인
  - 비밀번호: `admin2025`

- [ ] **4.3** 엑셀 파일 업로드
  - Excel 파일(.xlsx 또는 .xls) 선택
  - 업로드 성공 메시지 확인

- [ ] **4.4** 사용자 페이지에서 데이터 확인
  - URL: https://parkseihuan.github.io/Faculty-status/
  - 교원 현황 테이블이 표시되는지 확인
  - 색상 코딩(남은 기간)이 작동하는지 확인
  - 스크롤 시 고정 열이 제대로 작동하는지 확인

---

## ✅ Phase 5: 추가 설정 (선택사항)

- [ ] **5.1** 관리자 비밀번호 변경
  - 관리자 페이지 → "⚙️ 설정" 탭
  - 새 비밀번호로 변경

- [ ] **5.2** MongoDB Atlas 백업 확인
  - Atlas Dashboard → Database → Browse Collections
  - `faculty_data` 컬렉션에 데이터가 저장되었는지 확인

- [ ] **5.3** Render.com 알림 설정
  - Render Dashboard → Settings → Notifications
  - 배포 실패 시 이메일 알림 설정

---

## 🎉 완료!

모든 항목을 체크하셨나요? 축하합니다!

이제 Faculty Status 시스템이 완벽하게 작동합니다:

✅ MongoDB에 데이터 영구 저장
✅ Render.com에서 백엔드 실행
✅ GitHub Pages에서 프론트엔드 제공
✅ 서버 재시작해도 데이터 유지

---

## 🆘 문제가 생겼나요?

### 일반적인 문제와 해결방법:

**문제 1: MongoDB 연결 실패**
- [ ] MONGODB_URI가 정확한지 확인
- [ ] 비밀번호에 특수문자가 있으면 URL 인코딩
- [ ] Network Access 설정 확인

**문제 2: 데이터가 보이지 않음**
- [ ] Render.com Logs에서 에러 확인
- [ ] 브라우저 개발자 도구(F12) 콘솔 확인
- [ ] MongoDB Atlas에서 데이터 확인

**문제 3: 스타일이 깨짐**
- [ ] 브라우저 캐시 삭제 (Ctrl+Shift+Delete)
- [ ] 강력 새로고침 (Ctrl+F5 또는 Cmd+Shift+R)

---

## 📚 추가 자료

- [MongoDB Atlas 설정 가이드](./MONGODB_SETUP.md)
- [배포 가이드](./DEPLOYMENT.md)
- [README](./README.md)

---

**업데이트 날짜**: 2025-12-05
**버전**: 2.0 (MongoDB 통합)
