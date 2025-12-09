# MongoDB & Render.com 설정 시행착오 및 해결 가이드

이 문서는 Faculty Status 시스템에 MongoDB Atlas와 Render.com을 연동하는 과정에서 실제로 겪었던 문제들과 해결 방법을 기록합니다.

**작성일**: 2025-12-09
**작성자**: Parkseihuan

---

## 📋 목차

1. [MongoDB Atlas 설정 과정](#1-mongodb-atlas-설정-과정)
2. [실제로 겪은 문제들](#2-실제로-겪은-문제들)
3. [Render.com 환경변수 설정](#3-rendercom-환경변수-설정)
4. [배포 확인 및 테스트](#4-배포-확인-및-테스트)
5. [일반적인 문제 해결](#5-일반적인-문제-해결)

---

## 1. MongoDB Atlas 설정 과정

### 1.1 기본 설정 단계

MongoDB Atlas 설정은 다음 3단계로 진행됩니다:

**Step 1: Set up connection security (보안 설정)**
- 데이터베이스 사용자 생성
- 강력한 비밀번호 설정
- IP 화이트리스트 설정

**Step 2: Choose a connection method (연결 방법 선택)**
- "Drivers" 선택 (Node.js용)
- Driver: Node.js
- Version: 6.7 or later

**Step 3: Connect (연결)**
- 연결 문자열 복사 및 수정

### 1.2 클러스터 생성 설정

```
Cloud Provider: AWS
Region: Seoul (ap-northeast-2) 또는 가까운 지역
Cluster Tier: M0 Sandbox (FREE)
Cluster Name: faculty-status
```

### 1.3 데이터베이스 사용자 생성

```
Username: faculty_admin
Password: 강력한 비밀번호 (최소 12자 이상, 특수문자 포함)
Privileges: Read and write to any database
```

### 1.4 네트워크 접근 설정

```
IP Address: 0.0.0.0/0 (모든 IP 허용)
Description: Render.com Backend
```

---

## 2. 실제로 겪은 문제들

### 🔴 문제 1: 비밀번호 보안 문제

**증상:**
- 초기에 너무 간단한 비밀번호로 설정
- 보안이 우려되어 처음부터 다시 설정하고 싶었음

**해결 방법:**

클러스터를 완전히 삭제하지 않고 **비밀번호만 변경**하는 것이 더 효율적입니다.

#### 비밀번호 변경 절차:

1. MongoDB Atlas Dashboard → **"Database Access"** 메뉴
2. `faculty_admin` 사용자 찾기
3. 오른쪽 **"Edit"** 버튼 클릭
4. **"Edit Password"** 클릭
5. 새로운 강력한 비밀번호 입력:
   ```
   예시: Fac!2025#Str0ng$Pass_MongoDB_Secure
   ```
6. **"Update User"** 클릭

#### 연결 문자열 업데이트:

```
mongodb+srv://faculty_admin:새비밀번호@faculty-status.ln58emh.mongodb.net/faculty-status?appName=faculty-status
```

**특수문자 URL 인코딩:**
- `@` → `%40`
- `#` → `%23`
- `%` → `%25`
- `!` → `%21`

#### Render.com 환경변수 업데이트:

1. Render Dashboard → faculty-status-backend → Environment
2. `MONGODB_URI` 값을 새 연결 문자열로 변경
3. Save Changes → 자동 재배포

**교훈:**
- ✅ 처음부터 강력한 비밀번호 사용 (12자 이상, 대소문자, 숫자, 특수문자 조합)
- ✅ 비밀번호 관리자 도구 사용 권장
- ✅ 비밀번호 변경 시 클러스터를 완전히 삭제할 필요 없음

---

### 🟡 문제 2: 데이터베이스 이름 누락 (test DB 사용)

**증상:**
- MongoDB Atlas에서 데이터를 확인하니 `faculty-status` 데이터베이스가 아닌 `test` 데이터베이스에 저장됨
- `test` → `faculty_data` 컬렉션에 데이터가 있음

**원인:**

MongoDB 연결 문자열에서 데이터베이스 이름이 제대로 지정되지 않았을 때, MongoDB는 기본적으로 `test` 데이터베이스를 사용합니다.

#### 연결 문자열 형식:

❌ **잘못된 형식 (test DB 사용됨):**
```
mongodb+srv://faculty_admin:password@faculty-status.ln58emh.mongodb.net/?appName=faculty-status
                                                                      ↑ 데이터베이스 이름 없음
```

✅ **올바른 형식 (faculty-status DB 사용):**
```
mongodb+srv://faculty_admin:password@faculty-status.ln58emh.mongodb.net/faculty-status?appName=faculty-status
                                                                      ↑ 데이터베이스 이름 지정
```

**해결 방법:**

#### 옵션 1: 그냥 사용 (권장)

기능적으로는 전혀 문제가 없습니다. `test` 데이터베이스를 사용해도:
- ✅ 데이터가 정상적으로 저장되고 조회됨
- ✅ 서버 재시작해도 데이터 유지
- ✅ 추가 작업 불필요

단점: 데이터베이스 이름이 명확하지 않음

#### 옵션 2: 데이터베이스 이름 변경

1. Render.com에서 `MONGODB_URI` 환경변수 수정:
   ```
   mongodb+srv://faculty_admin:password@faculty-status.ln58emh.mongodb.net/faculty-status?appName=faculty-status
   ```

2. Save Changes → 자동 재배포

3. 관리자 페이지에서 엑셀 파일 재업로드

4. MongoDB Atlas에서 `faculty-status` 데이터베이스 생성 확인

**교훈:**
- ✅ 연결 문자열에서 `mongodb.net/` 뒤에 데이터베이스 이름을 **반드시** 지정
- ✅ `test` DB 사용도 기능적으로는 문제없으나, 명확성을 위해 데이터베이스 이름 지정 권장

---

### 🟢 문제 3: MongoDB 연결 확인

**증상:**
- 배포 후 MongoDB가 제대로 연결되었는지 확인하는 방법을 몰랐음

**해결 방법:**

#### Render.com 로그 확인:

1. Render Dashboard → faculty-status-backend
2. 상단 메뉴 **"Logs"** 탭 클릭
3. 다음 메시지 확인:

✅ **성공 시:**
```
✅ MongoDB connected successfully
🚀 Server running on port 10000
📝 Environment: production
🌐 CORS enabled for: https://parkseihuan.github.io
```

❌ **실패 시:**
```
❌ MongoDB connection error: MongoServerError: bad auth
```

#### Health Check 테스트:

브라우저 또는 curl로 테스트:
```bash
curl https://faculty-status-backend-2s16.onrender.com/health
```

예상 응답:
```json
{
  "status": "OK",
  "timestamp": "2025-12-09T04:47:55.589Z",
  "uptime": 375.54
}
```

#### MongoDB Atlas에서 직접 확인:

1. MongoDB Atlas Dashboard
2. **"Database"** → **"Browse Collections"**
3. 데이터베이스 선택 (test 또는 faculty-status)
4. `faculty_data` 컬렉션 확인

컬렉션 내용:
```json
{
  "_id": ObjectId("6937ec287b7884b38e5fab69"),
  "facultyData": { ... },
  "deptStructure": [...],
  "fullTimePositions": [...],
  "partTimePositions": [...],
  "stats": { "total": 7077, "processed": 528 },
  "uploadInfo": { ... },
  "updatedAt": "2025-12-09T09:30:16.276Z"
}
```

**교훈:**
- ✅ Render.com 로그를 통해 실시간 상태 확인
- ✅ Health Check 엔드포인트로 서비스 상태 확인
- ✅ MongoDB Atlas에서 직접 데이터 확인 가능

---

## 3. Render.com 환경변수 설정

### 3.1 필수 환경변수

| Key | Value | 설명 |
|-----|-------|------|
| `MONGODB_URI` | `mongodb+srv://faculty_admin:password@...` | MongoDB 연결 문자열 (필수) |
| `JWT_SECRET` | `your-super-secret-jwt-key-32-chars-min` | JWT 암호화 키 (필수) |
| `FRONTEND_URL` | `https://parkseihuan.github.io` | GitHub Pages URL (필수) |
| `NODE_ENV` | `production` | 프로덕션 환경 (권장) |
| `PORT` | `10000` | 포트 번호 (Render가 자동 할당하면 생략 가능) |

### 3.2 환경변수 설정 절차

1. [Render.com Dashboard](https://dashboard.render.com/) 접속
2. `faculty-status-backend` 서비스 선택
3. 왼쪽 메뉴 **"Environment"** 클릭
4. **"Add Environment Variable"** 클릭
5. Key와 Value 입력
6. **"Save Changes"** 클릭 → 자동 재배포 시작 (2-5분 소요)

### 3.3 주의사항

**MONGODB_URI:**
- 비밀번호에 특수문자가 있으면 URL 인코딩 필수
- 데이터베이스 이름 포함: `/faculty-status` 또는 `/test`

**JWT_SECRET:**
- 최소 32자 이상의 랜덤 문자열
- 절대 Git에 커밋하지 말 것

**FRONTEND_URL:**
- Origin만 입력 (경로 제외!)
- ✅ 올바름: `https://parkseihuan.github.io`
- ❌ 잘못됨: `https://parkseihuan.github.io/Faculty-status`

---

## 4. 배포 확인 및 테스트

### 4.1 배포 성공 확인

#### Render.com Logs:

```
==> Build successful 🎉
==> Deploying...
==> Running 'npm start'
🚀 Server running on port 10000
📝 Environment: production
🌐 CORS enabled for: https://parkseihuan.github.io
✅ MongoDB connected successfully
==> Your service is live 🎉
```

### 4.2 데이터 업로드 테스트

#### 관리자 페이지:

1. https://parkseihuan.github.io/Faculty-status/admin.html
2. 비밀번호: `admin2025`
3. "📤 엑셀 업로드" 탭
4. 엑셀 파일 선택 및 업로드

#### 로그 확인:

```
Uploaded file: faculty_1765272599310.xls
Detected file format: xls
Total rows to process: 7077
활성 상태 인원: 589, 처리된 인원: 528
✅ Faculty data saved to MongoDB: new ObjectId('6937ec287b7884b38e5fab69')
```

#### 사용자 페이지:

1. https://parkseihuan.github.io/Faculty-status/
2. 교원 현황 테이블 확인
3. 색상 코딩 작동 확인

---

## 5. 일반적인 문제 해결

### 🔴 MongoDB 연결 실패

**에러 메시지:**
```
❌ MongoDB connection error: MongoServerError: bad auth
```

**원인 및 해결:**

1. **비밀번호 오류**
   - MONGODB_URI의 비밀번호가 정확한지 확인
   - 특수문자가 있으면 URL 인코딩 적용

2. **IP 화이트리스트**
   - MongoDB Atlas → Network Access
   - `0.0.0.0/0` (모든 IP 허용) 확인

3. **사용자 권한**
   - Database Access에서 사용자 권한 확인
   - "Read and write to any database" 권한 필요

4. **환경변수 미설정**
   ```
   MONGODB_URI environment variable is not set
   ```
   - Render.com에서 `MONGODB_URI` 환경변수 추가

---

### 🟡 CORS 에러

**에러 메시지:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**해결 방법:**

1. Render.com 환경변수 확인:
   ```
   FRONTEND_URL=https://parkseihuan.github.io
   ```
   - 경로 제외, Origin만 입력!

2. `backend/server.js` CORS 설정 확인:
   ```javascript
   app.use(cors({
     origin: process.env.FRONTEND_URL || '*',
     credentials: true
   }));
   ```

---

### 🟢 데이터가 표시되지 않음

**증상:**
- 사용자 페이지에 "교원 데이터가 아직 업로드되지 않았습니다" 표시

**해결 방법:**

1. **관리자 페이지에서 데이터 업로드 확인**
   - 엑셀 파일을 업로드했는지 확인

2. **MongoDB에 데이터 저장 확인**
   - MongoDB Atlas → Browse Collections
   - `test` 또는 `faculty-status` 데이터베이스
   - `faculty_data` 컬렉션에 데이터 있는지 확인

3. **API 연결 확인**
   - 브라우저 개발자 도구 (F12) → Console
   - API 호출 에러 확인

4. **프론트엔드 API URL 확인**
   - `docs/js/config.js`의 production baseURL 확인
   - Render.com 백엔드 URL과 일치하는지 확인

---

## 6. 성공적인 배포 체크리스트

배포가 완료되면 다음을 확인하세요:

- [ ] ✅ MongoDB Atlas 클러스터 생성 완료
- [ ] ✅ 데이터베이스 사용자 생성 (강력한 비밀번호)
- [ ] ✅ IP 화이트리스트 설정 (0.0.0.0/0)
- [ ] ✅ 연결 문자열에 데이터베이스 이름 포함
- [ ] ✅ Render.com 환경변수 설정 (3개 필수)
- [ ] ✅ 배포 성공 및 MongoDB 연결 확인
- [ ] ✅ Health Check 응답 정상
- [ ] ✅ 엑셀 데이터 업로드 성공
- [ ] ✅ MongoDB에 데이터 저장 확인
- [ ] ✅ 사용자 페이지에서 데이터 표시 확인

---

## 7. 추가 참고 자료

- [MongoDB Atlas 설정 가이드](./MONGODB_SETUP.md)
- [배포 가이드](./DEPLOYMENT.md)
- [설정 체크리스트](./SETUP_CHECKLIST.md)
- [README](./README.md)

---

## 8. 최종 시스템 구성

성공적으로 배포된 시스템 구성:

```
┌─────────────────────────────────────────────────────────────┐
│                    사용자 (Browser)                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│   Frontend (GitHub Pages)                                    │
│   https://parkseihuan.github.io/Faculty-status              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓ API Requests
┌─────────────────────────────────────────────────────────────┐
│   Backend (Render.com)                                       │
│   https://faculty-status-backend-2s16.onrender.com          │
│   - Node.js + Express                                        │
│   - CORS 설정                                                │
│   - JWT 인증                                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓ MongoDB Connection
┌─────────────────────────────────────────────────────────────┐
│   Database (MongoDB Atlas)                                   │
│   Cluster: faculty-status                                    │
│   Database: test (또는 faculty-status)                       │
│   Collection: faculty_data                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 마무리

이 문서는 실제 배포 과정에서 겪은 시행착오를 기록한 것입니다. 비슷한 문제를 겪는 분들에게 도움이 되기를 바랍니다.

**핵심 교훈:**
1. 처음부터 강력한 비밀번호 사용
2. 연결 문자열에 데이터베이스 이름 명시
3. Render.com 로그로 실시간 상태 확인
4. MongoDB Atlas에서 직접 데이터 확인 가능
5. `test` 데이터베이스 사용도 기능적으로 문제없음

**작성자**: Parkseihuan
**최종 업데이트**: 2025-12-09
**버전**: 1.0
