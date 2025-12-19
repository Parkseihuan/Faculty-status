# Faculty-Status Project

## Project Overview

Faculty-status는 용인대학교 교원 발령사항 및 조직 정보를 관리하는 웹 애플리케이션입니다. 엑셀 파일에서 교원 데이터를 파싱하여 구조화된 형태로 표시하고, 조직 순서를 관리할 수 있습니다.

## Technology Stack

- **Backend**: Node.js, Express.js, Mongoose (MongoDB)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Database**: MongoDB
- **Data Formats**: Excel (.xls, .xlsx), JSON
- **Deployment**: Render.com
- **Version Control**: Git, GitHub

## Project Structure

```
Faculty-status/
├── backend/                   # 백엔드 서버 로직
│   ├── app.js                # Express 서버 메인
│   ├── config/               # 설정 파일 (DB 연결 등)
│   ├── models/               # Mongoose 스키마 정의
│   │   ├── Faculty.js        # 교원 정보 모델
│   │   ├── Organization.js   # 조직 구조 모델
│   │   ├── ResearchLeave.js  # 연구년/휴직 모델
│   │   └── AppointmentData.js # 발령사항 모델
│   ├── routes/               # API 라우트
│   │   ├── faculty.js        # 교원 관련 API
│   │   ├── organization.js   # 조직 관련 API
│   │   └── upload.js         # 파일 업로드 API
│   └── utils/                # 유틸리티 함수
│       ├── excelParser.js    # 엑셀 파싱 (교원 명단)
│       ├── researchLeaveParser.js  # 연구년/휴직 파싱
│       └── appointmentParser.js    # 발령사항 파싱
├── docs/                     # 프론트엔드 정적 파일
│   ├── index.html           # 메인 페이지
│   ├── admin.html           # 관리자 페이지
│   ├── js/                  # JavaScript 파일
│   │   ├── app.js          # 메인 앱 로직
│   │   ├── admin.js        # 관리자 페이지 로직
│   │   └── api.js          # API 호출 유틸리티
│   └── css/                # 스타일시트
│       ├── table-styles.css # 테이블 스타일
│       └── admin.css       # 관리자 페이지 스타일
└── .claude/                # Claude Code 설정
```

## Key Features

### 1. 교원 명단 관리
- Excel 파일 업로드 및 파싱
- 교원 정보 필터링 (전임/비전임/기타)
- 조직별 그룹화 및 표시
- 연구년/휴직 교원 표시

### 2. 조직 순서 관리
- 대학 및 학과 순서 커스터마이징
- 드래그 앤 드롭 또는 버튼으로 순서 조정
- 체크박스로 항목 삭제 (저장 시 일괄 적용)
- 교원 유형별 조직 구조 설정 (전임/비전임/기타)

### 3. 발령사항 관리
- 발령사항 Excel 파일 파싱
- 휴직 교원 정보 추출 및 저장
- 메인 페이지에서 휴직 기간 표시

## Coding Standards

### JavaScript
- **들여쓰기**: 2 spaces
- **변수명**: camelCase (`facultyData`, `orgSettings`)
- **함수명**: camelCase, 동사로 시작 (`parseFacultyData`, `updateOrganization`)
- **상수**: UPPER_SNAKE_CASE (`MAX_UPLOAD_SIZE`)
- **주석**: 복잡한 로직, 특히 한글 데이터 처리에 주석 필수

### HTML/CSS
- **클래스명**: kebab-case (`faculty-table`, `org-item-header`)
- **시맨틱 HTML 사용**: `<header>`, `<main>`, `<section>`, `<article>`
- **BEM 방식 고려**: `.block__element--modifier`

### MongoDB/Mongoose
- **스키마 정의**: 명확한 타입과 기본값 설정
- **인덱스**: 자주 쿼리하는 필드에 인덱스 추가
- **static 메서드**: 재사용 가능한 쿼리 로직

### API 설계
- **RESTful**: GET, POST, PUT, DELETE 적절히 사용
- **에러 응답 형식**:
  ```json
  { "error": "메시지", "code": "ERROR_CODE", "statusCode": 400 }
  ```
- **성공 응답 형식**:
  ```json
  { "success": true, "message": "메시지", "data": {...} }
  ```

## Data Handling Best Practices

### 1. 한글 인코딩
- 모든 파일 읽기/쓰기는 UTF-8 인코딩 사용
- Excel 파싱 시 인코딩 확인 필수
- 데이터베이스 저장 전 인코딩 검증

### 2. Excel 파일 파싱
- 빈 행, 병합된 셀 처리
- 헤더 행 자동 감지 또는 명시적 지정
- 데이터 타입 변환 (날짜, 숫자, 문자열)
- 파싱 오류 로깅 및 사용자에게 피드백

### 3. 날짜 처리
- ISO 8601 형식 사용 (`YYYY-MM-DD`)
- 한국 표준시(KST) 고려
- 날짜 범위 계산 시 timezone 주의

### 4. 데이터 검증
- 필수 필드 확인 (이름, 소속, 직급)
- 중복 데이터 감지 및 처리
- 유효하지 않은 데이터 필터링 및 로깅

## Common Tasks

### Development
```bash
npm install           # 의존성 설치
npm start            # 서버 시작 (포트 3000)
npm run dev          # 개발 모드 (nodemon)
```

### Database
```bash
# MongoDB 연결 확인
# .env 파일에 MONGODB_URI 설정 필요
```

### Deployment (Render.com)
```bash
git add .
git commit -m "메시지"
git push origin main  # main 브랜치에 push 시 자동 배포
```

### Testing
```bash
# 교원 데이터 파싱 테스트
node backend/test_parse.js

# 발령사항 파싱 테스트
node backend/test_appointment_data.js
```

## Important Notes

### 스크롤 위치 유지
- 조직 순서 설정에서 항목 삭제/추가 시 스크롤 위치 유지 중요
- DOM 재렌더링 최소화
- 체크박스 방식으로 즉시 DOM 변경 방지

### 브라우저 캐시
- JavaScript/CSS 변경 시 사용자에게 강력한 새로고침 안내 (Ctrl+Shift+R)
- 배포 후 캐시 무효화 확인

### 보안
- 관리자 페이지는 비밀번호 인증 필수
- JWT 토큰 사용 (localStorage 저장)
- API 엔드포인트에 인증 미들웨어 적용

## Current Issues & Improvements

### 해결됨
- ✅ 조직 순서 저장 시 스크롤 위치 문제 (체크박스 방식으로 해결)
- ✅ Mongoose Document vs Plain Object 변환 이슈
- ✅ 연구년/휴직 교원 중복 표시 문제

### 진행 중
- 교원 유형별 조직 구조 개별 저장 (현재는 단일 구조만 저장)

### 개선 아이디어
- 교원 검색 기능
- Excel 내보내기 기능
- 교원 상세 정보 모달
- 조직 구조 히스토리 관리

## Team Communication

- 새로운 데이터 형식 발견 시 Skills 문서 업데이트
- 코딩 표준 변경 시 CLAUDE.md 업데이트
- 배포 전 실제 데이터로 테스트 필수

## Useful Links

- Repository: https://github.com/Parkseihuan/Faculty-status
- Deployment: Render.com (main 브랜치)
