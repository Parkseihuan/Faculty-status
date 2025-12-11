# MongoDB Atlas 설정 가이드

이 문서는 Faculty Status 시스템에 MongoDB Atlas를 연동하는 방법을 설명합니다.

## 1. MongoDB Atlas 계정 생성 및 클러스터 설정

### 1.1 MongoDB Atlas 회원가입
1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) 접속
2. 이메일로 가입 또는 Google 계정으로 로그인
3. 무료 플랜 선택 (Free Tier - M0)

### 1.2 클러스터 생성
1. "Create" 버튼 클릭
2. **Cloud Provider**: AWS 선택 (또는 원하는 클라우드)
3. **Region**: Seoul (ap-northeast-2) 또는 가까운 지역 선택
4. **Cluster Tier**: M0 Sandbox (FREE) 선택
5. **Cluster Name**: `faculty-status` (원하는 이름)
6. "Create Cluster" 버튼 클릭

⏰ 클러스터 생성에 1-3분 소요됩니다.

## 2. 데이터베이스 사용자 생성

### 2.1 Database Access 설정
1. 왼쪽 메뉴에서 **"Database Access"** 클릭
2. "+ ADD NEW DATABASE USER" 클릭
3. 사용자 정보 입력:
   - **Authentication Method**: Password
   - **Username**: `faculty_admin` (원하는 이름)
   - **Password**: 강력한 비밀번호 생성 (복사해두기!)
   - **Database User Privileges**: "Read and write to any database" 선택
4. "Add User" 버튼 클릭

⚠️ **중요**: 비밀번호를 안전한 곳에 저장하세요!

## 3. 네트워크 접근 설정

### 3.1 IP 화이트리스트 설정
1. 왼쪽 메뉴에서 **"Network Access"** 클릭
2. "+ ADD IP ADDRESS" 클릭
3. 두 가지 옵션:
   - **Option A (권장)**: "ALLOW ACCESS FROM ANYWHERE" 클릭
     - IP: `0.0.0.0/0` (모든 IP 허용)
     - 설명: "Render.com Backend"
   - **Option B (더 안전)**: Render.com 서버 IP만 허용
     - Render.com 배포 후 실제 서버 IP 확인하여 추가
4. "Confirm" 버튼 클릭

## 4. 연결 문자열 얻기

### 4.1 Connection String 복사
1. 왼쪽 메뉴에서 **"Database"** 클릭
2. 클러스터 이름 옆의 **"Connect"** 버튼 클릭
3. **"Connect your application"** 선택
4. **Driver**: Node.js 선택
5. **Version**: 4.1 or later 선택
6. 연결 문자열 복사:

```
mongodb+srv://<USERNAME>:<PASSWORD>@<CLUSTER>.mongodb.net/?retryWrites=true&w=majority
```

7. `<USERNAME>`, `<PASSWORD>`, `<CLUSTER>`를 실제 값으로 교체
8. 데이터베이스 이름 추가:

```
mongodb+srv://<USERNAME>:<PASSWORD>@<CLUSTER>.mongodb.net/faculty-status?retryWrites=true&w=majority
```

⚠️ **주의사항**:
- `<password>` 부분을 실제 비밀번호로 교체하세요
- 비밀번호에 특수문자가 있으면 URL 인코딩 필요 (예: `@` → `%40`)
- 연결 문자열 전체를 안전하게 보관하세요

## 5. Render.com 환경변수 설정

### 5.1 Render.com 대시보드 접속
1. [Render.com Dashboard](https://dashboard.render.com/) 접속
2. Faculty Status 백엔드 서비스 클릭
3. 왼쪽 메뉴에서 **"Environment"** 클릭

### 5.2 환경변수 추가
**"Add Environment Variable"** 클릭 후 다음 변수들을 추가:

#### 필수 환경변수:

| Key | Value | 설명 |
|-----|-------|------|
| `MONGODB_URI` | `mongodb+srv://<USERNAME>:<PASSWORD>@<CLUSTER>.mongodb.net/faculty-status` | MongoDB 연결 문자열 (위에서 복사한 것) |
| `JWT_SECRET` | `랜덤한_긴_문자열_최소32자이상` | JWT 토큰 암호화 키 |
| `FRONTEND_URL` | `https://parkseihuan.github.io` | GitHub Pages URL |
| `NODE_ENV` | `production` | 프로덕션 환경 |

#### 선택 환경변수:

| Key | Value | 설명 |
|-----|-------|------|
| `PORT` | `3000` | 포트 번호 (Render가 자동 할당하면 생략 가능) |
| `MAX_FILE_SIZE` | `10` | 업로드 최대 파일 크기 (MB) |

### 5.3 변경사항 저장 및 재배포
1. "Save Changes" 버튼 클릭
2. 자동으로 재배포가 시작됩니다
3. 배포 로그에서 `✅ MongoDB connected successfully` 확인

## 6. 연결 확인

### 6.1 Health Check
브라우저에서 다음 URL 접속:
```
https://faculty-status.onrender.com/health
```

정상 응답:
```json
{
  "status": "OK",
  "timestamp": "2025-12-05T...",
  "uptime": 123.456
}
```

### 6.2 MongoDB 연결 로그 확인
Render.com 대시보드의 "Logs" 탭에서 다음 메시지 확인:
```
✅ MongoDB connected successfully
🚀 Server running on port 3000
```

## 7. 첫 번째 데이터 업로드

1. 관리자 페이지 접속: `https://parkseihuan.github.io/Faculty-status/admin.html`
2. 비밀번호 `admin2025`로 로그인
3. 엑셀 파일 업로드
4. 사용자 페이지에서 데이터 확인

## 8. 문제 해결 (Troubleshooting)

### 문제 1: MongoDB 연결 실패
**증상**: `❌ MongoDB connection error`

**해결방법**:
1. MONGODB_URI 환경변수가 정확한지 확인
2. 비밀번호에 특수문자가 있으면 URL 인코딩
3. Network Access에서 IP 화이트리스트 확인
4. 데이터베이스 사용자 권한 확인

### 문제 2: 데이터가 저장되지 않음
**증상**: 엑셀 업로드 후 데이터가 보이지 않음

**해결방법**:
1. Render.com 로그에서 에러 확인
2. MongoDB Atlas의 "Browse Collections" 에서 데이터 확인
3. 브라우저 개발자 도구 콘솔에서 에러 확인

### 문제 3: "교원 데이터가 아직 업로드되지 않았습니다"
**증상**: 사용자 페이지에 해당 메시지 표시

**해결방법**:
1. 관리자 페이지에서 엑셀 파일 업로드
2. 첫 업로드 후에는 서버 재시작해도 데이터 유지됨

## 9. MongoDB Atlas 모니터링

### 9.1 데이터 확인
1. MongoDB Atlas 대시보드 → "Database" → "Browse Collections"
2. `faculty_data` 컬렉션에서 데이터 확인

### 9.2 사용량 확인
1. 왼쪽 메뉴 "Metrics" 클릭
2. Storage, Operations, Connections 모니터링
3. 무료 플랜 한도: 512MB 스토리지

## 10. 보안 권장사항

1. ✅ 강력한 데이터베이스 비밀번호 사용
2. ✅ MongoDB 연결 문자열을 Git에 커밋하지 않기
3. ✅ 가능하면 특정 IP만 화이트리스트에 추가
4. ✅ 정기적으로 비밀번호 변경
5. ✅ MongoDB Atlas에서 백업 설정 (프로 플랜)

## 참고 자료

- [MongoDB Atlas Documentation](https://www.mongodb.com/docs/atlas/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [Render.com Documentation](https://render.com/docs)
