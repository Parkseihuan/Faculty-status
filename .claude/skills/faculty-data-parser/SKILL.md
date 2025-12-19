---
name: faculty-data-parser
description: 용인대학교 교원 명단 Excel 파일을 파싱하여 구조화된 JSON 데이터로 변환합니다. 교원 이름, 소속, 직급, 재직구분 등을 추출하고 검증합니다. Excel 파일 파싱, 교원 데이터 추출, 한글 인코딩 처리가 필요할 때 사용하세요.
allowed-tools: Read, Glob, Bash, Write
---

# Faculty Data Parser Skill

## Purpose

용인대학교 교원 명단 Excel 파일(.xls, .xlsx)을 파싱하여 Faculty-status 애플리케이션에서 사용할 수 있는 표준화된 JSON 형식으로 변환합니다.

## Key Capabilities

1. **Excel 파일 읽기 및 파싱**
   - .xls 및 .xlsx 형식 지원
   - UTF-8 인코딩으로 한글 데이터 처리
   - 병합된 셀 및 빈 행 처리

2. **데이터 추출**
   - 교원 기본 정보: 이름, 소속, 직급, 재직구분
   - 헤더 자동 감지 또는 명시적 컬럼 매핑
   - 데이터 정규화 및 trim

3. **데이터 검증**
   - 필수 필드 존재 확인
   - 중복 데이터 감지
   - 유효하지 않은 값 필터링

4. **JSON 변환**
   - MongoDB 스키마 호환 형식
   - ISO 8601 날짜 형식
   - 메타데이터 포함 (파일명, 파싱 시간, 통계)

## When to Use

다음과 같은 요청 시 자동으로 활성화:
- "교원 명단 파일을 파싱해줘"
- "이 Excel 파일에서 교원 정보를 추출해줘"
- "교원 데이터를 JSON으로 변환해줘"
- "교원 명단을 검증해줘"

## How It Works

### 1. 파일 식별 및 로드
```javascript
// 파일 경로 찾기
const files = glob('**/*교원*.{xls,xlsx}');

// Excel 파일 읽기
const workbook = XLSX.read(buffer, {
  type: 'buffer',
  codepage: 65001  // UTF-8
});
```

### 2. 헤더 및 데이터 파싱
```javascript
// 첫 번째 시트 선택
const sheet = workbook.Sheets[workbook.SheetNames[0]];

// JSON 변환
const rawData = XLSX.utils.sheet_to_json(sheet);

// 헤더 매핑 (실제 Excel의 컬럼명 → 표준 필드명)
const headerMap = {
  '성명': 'name',
  '이름': 'name',
  '소속': 'department',
  '학과': 'department',
  '직급': 'position',
  '재직구분': 'employmentType'
};
```

### 3. 데이터 정규화
```javascript
const cleanedData = rawData
  .filter(row => row && Object.values(row).some(v => v))  // 빈 행 제거
  .map(row => ({
    name: (row['성명'] || row['이름'] || '').trim(),
    department: (row['소속'] || row['학과'] || '').trim(),
    position: (row['직급'] || '').trim(),
    employmentType: (row['재직구분'] || '전임').trim()
  }))
  .filter(row => row.name);  // 이름이 없는 항목 제거
```

### 4. 데이터 검증
```javascript
const validation = {
  total: cleanedData.length,
  valid: 0,
  errors: []
};

cleanedData.forEach((row, idx) => {
  // 필수 필드 확인
  if (!row.name || !row.department || !row.position) {
    validation.errors.push({
      row: idx + 1,
      error: '필수 필드 누락',
      data: row
    });
  } else {
    validation.valid++;
  }
});
```

### 5. JSON 출력
```javascript
const output = {
  faculty: cleanedData,
  metadata: {
    sourceFile: filename,
    parsedAt: new Date().toISOString(),
    totalRows: rawData.length,
    validRows: validation.valid,
    invalidRows: validation.errors.length,
    errors: validation.errors
  }
};
```

## Standard Output Format

```json
{
  "faculty": [
    {
      "name": "홍길동",
      "department": "컴퓨터공학과",
      "position": "교수",
      "employmentType": "전임"
    }
  ],
  "metadata": {
    "sourceFile": "교원명단_20251217.xlsx",
    "parsedAt": "2025-12-19T12:00:00.000Z",
    "totalRows": 150,
    "validRows": 145,
    "invalidRows": 5,
    "errors": [
      {
        "row": 10,
        "error": "필수 필드 누락",
        "data": {...}
      }
    ]
  }
}
```

## Common Issues and Solutions

### Issue 1: 한글 깨짐
**원인**: 잘못된 인코딩
**해결**:
```javascript
const workbook = XLSX.read(buffer, {
  type: 'buffer',
  codepage: 65001  // UTF-8 명시
});
```

### Issue 2: 빈 행이 포함됨
**원인**: Excel에 빈 행 존재
**해결**:
```javascript
const filtered = data.filter(row => {
  return row && Object.values(row).some(val => val !== null && val !== '');
});
```

### Issue 3: 헤더명 불일치
**원인**: Excel 파일마다 컬럼명이 다름
**해결**: 헤더 매핑 사용
```javascript
const headerVariants = {
  name: ['성명', '이름', '교원명'],
  department: ['소속', '학과', '부서'],
  position: ['직급', '직위']
};
```

### Issue 4: 중복 데이터
**원인**: 동명이인 또는 중복 입력
**해결**: 고유 키 생성
```javascript
const uniqueKey = `${row.name}_${row.department}_${row.position}`;
const uniqueData = [...new Map(
  data.map(item => [uniqueKey(item), item])
).values()];
```

## Testing

### 테스트 실행
```bash
node backend/test_parse.js
```

### 테스트 케이스
1. 정상적인 교원 명단 파일
2. 빈 행이 포함된 파일
3. 병합된 셀이 있는 파일
4. 헤더명이 다른 파일
5. 한글 인코딩이 다른 파일

## Related Files

- `backend/utils/excelParser.js` - 메인 파싱 로직
- `backend/routes/upload.js` - 파일 업로드 API
- `backend/models/Faculty.js` - Faculty 스키마
- `backend/test_parse.js` - 파싱 테스트 스크립트

## Example Usage

```javascript
// 1. Excel 파일 파싱
const result = await excelParser.parseExcelFile(filePath);

// 2. 데이터 검증
if (result.metadata.invalidRows > 0) {
  console.warn('검증 실패:', result.metadata.errors);
}

// 3. 데이터베이스 저장
await Faculty.insertMany(result.faculty);

// 4. 통계 출력
console.log(`총 ${result.metadata.totalRows}명 중 ${result.metadata.validRows}명 처리 완료`);
```

## Notes

- Excel 파일은 최대 10MB까지 처리 권장
- 1000명 이상의 데이터는 배치 처리 고려
- 파싱 중 발견된 오류는 모두 로깅
- 원본 데이터는 보존하고 변환된 데이터만 저장
