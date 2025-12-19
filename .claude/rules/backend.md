---
paths: backend/**/*.js
---

# Backend JavaScript Rules

## API Development Standards

### 라우트 구조
```javascript
router.get('/endpoint', async (req, res) => {
  try {
    // 입력 검증
    // 비즈니스 로직
    // 응답 반환
  } catch (error) {
    // 에러 처리
  }
});
```

### 입력 검증
- 모든 사용자 입력은 검증 필수
- 타입 체크, 범위 검사, 필수 필드 확인
- express-validator 또는 Joi 사용 권장

### 에러 응답 형식
```javascript
res.status(400).json({
  error: "명확한 에러 메시지",
  code: "ERROR_CODE",
  statusCode: 400
});
```

### 성공 응답 형식
```javascript
res.json({
  success: true,
  message: "작업 완료",
  data: result
});
```

## Data Parsing Rules

### Excel 파일 처리
```javascript
// 항상 인코딩 명시
const workbook = XLSX.read(buffer, { type: 'buffer', codepage: 65001 }); // UTF-8

// 빈 행 필터링
const rows = data.filter(row => {
  return row && Object.values(row).some(val => val !== null && val !== '');
});

// 안전한 필드 접근
const name = row['성명'] || row['이름'] || '';
```

### 날짜 처리
```javascript
// ISO 8601 형식 사용
const date = new Date(excelDate);
const isoDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
```

### 한글 데이터
```javascript
// UTF-8 인코딩 확인
const encoding = 'utf8';

// 문자열 정규화 (NFC)
const normalized = str.normalize('NFC');

// 공백 제거
const trimmed = str.trim();
```

## Database Operations

### Mongoose 쿼리
```javascript
// lean()을 사용하여 Plain Object 반환
const data = await Model.findOne().lean();

// 에러 처리 필수
try {
  const result = await Model.create(data);
} catch (error) {
  console.error('DB Error:', error);
  throw error;
}
```

### 스키마 정의
```javascript
const schema = new mongoose.Schema({
  field: {
    type: String,
    required: true,
    trim: true,
    default: ''
  }
}, {
  timestamps: true  // createdAt, updatedAt 자동 추가
});
```

## Logging

### 로그 레벨
```javascript
console.log('정보성 메시지');     // 일반 정보
console.warn('경고 메시지');       // 주의 필요
console.error('에러 메시지');      // 오류 발생
```

### 로그 내용
- API 요청/응답 로깅
- 파일 파싱 시작/완료
- 에러 발생 시 스택 트레이스
- 중요한 비즈니스 로직 실행

## Security

### 인증 미들웨어
```javascript
const auth = require('./middleware/auth');
router.post('/admin-only', auth, async (req, res) => {
  // 인증된 요청만 처리
});
```

### 환경 변수
```javascript
// .env 파일 사용
const dbUri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;

// 기본값 설정
const port = process.env.PORT || 3000;
```

## Performance

### 비동기 처리
```javascript
// async/await 사용
async function processData() {
  const data = await fetchData();
  return transform(data);
}

// Promise.all로 병렬 처리
const [faculty, org] = await Promise.all([
  Faculty.find(),
  Organization.find()
]);
```

### 메모리 관리
```javascript
// 큰 파일 스트리밍 처리
const stream = fs.createReadStream(filePath);

// 불필요한 데이터 제거
let data = processLargeData();
data = null; // GC 대상
```

## Error Handling

### Try-Catch 패턴
```javascript
try {
  // 위험한 작업
  const result = await riskyOperation();
  return result;
} catch (error) {
  // 에러 로깅
  console.error('Operation failed:', error);

  // 사용자에게 명확한 메시지
  throw new Error('작업 처리 중 오류가 발생했습니다.');
}
```

### Custom Error Classes
```javascript
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}
```

## Testing

### 테스트 파일 작성
```javascript
// backend/test_*.js 형식
const assert = require('assert');

async function testParsing() {
  const result = await parseExcel(testFile);
  assert(result.length > 0, '파싱 결과가 비어있음');
  console.log('✓ 파싱 테스트 통과');
}
```
