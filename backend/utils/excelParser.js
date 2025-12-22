const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * 엑셀 파일을 파싱하여 교원 데이터 추출
 * XLS (구 버전) 및 XLSX (신 버전) 모두 지원
 */
class ExcelParser {
  constructor() {
    // 직급 매핑
    this.positionMapping = {
      '교  수': '교수',
      '교수': '교수',
      '부교수': '부교수',
      '조교수': '조교수',
      '부교수(비정년트랙)': '부교수(비정년트랙)',
      '조교수(비정년트랙)': '조교수(비정년트랙)',
      '특임교수': '특임교수',
      '객원교수': '객원교수',
      '겸임교원': '겸임교원',
      '겸임교원(비전임)': '겸임교원',
      '겸임교수': '겸임교원',
      '겸임부교수': '겸임교원',
      '겸임조교수': '겸임교원',
      '겸임조교수.': '겸임교원',
      '초빙교원': '초빙교원',
      '초빙교원(비전임)': '초빙교원',
      '강사': '강사',
      '시간강사': '강사',
      '명예교수': '명예교수'
    };

    // 기타 직급 매핑
    this.otherPositionMapping = {
      '특별연구원': '특별연구원',
      '학술연구교수': '학술연구교수',
      '전임연구원': '전임연구원',
      '학예연구사': '학예연구사',
      '전문상담원': '전문상담원',
      '전임지도자': '전임지도자',
      '기술감독': '기술감독'
    };

    this.fullTimePositions = ['교수', '부교수', '조교수', '부교수(비정년트랙)', '조교수(비정년트랙)'];
    this.partTimePositions = ['특임교수', '객원교수', '겸임교원', '초빙교원', '강사', '명예교수'];
    this.otherPositions = ['특별연구원', '학술연구교수', '전임연구원', '학예연구사', '전문상담원', '전임지도자', '기술감독'];
  }

  /**
   * 파일 형식 감지 (XLS vs XLSX)
   */
  detectFileFormat(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    // 확장자로 먼저 판단
    if (ext === '.xls') return 'xls';
    if (ext === '.xlsx') return 'xlsx';

    // 파일 시그니처로 판단
    try {
      const buffer = fs.readFileSync(filePath);
      // XLSX는 ZIP 파일 (PK 시그니처)
      if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
        return 'xlsx';
      }
      // XLS는 다양한 시그니처를 가질 수 있음
      return 'xls';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * 엑셀 파일 파싱 (XLS 및 XLSX 지원)
   */
  async parseExcelFile(filePath) {
    try {
      const format = this.detectFileFormat(filePath);
      console.log(`Detected file format: ${format}`);

      let data = [];

      if (format === 'xlsx') {
        // XLSX: ExcelJS 사용 (더 안전)
        data = await this.parseXLSXFile(filePath);
      } else {
        // XLS 또는 unknown: xlsx 라이브러리 사용
        data = this.parseXLSFile(filePath);
      }

      if (data.length === 0) {
        throw new Error('엑셀 파일이 비어있습니다.');
      }

      return this.processData(data);
    } catch (error) {
      console.error('Excel parsing error:', error);
      throw new Error(`엑셀 파일 파싱 오류: ${error.message}`);
    }
  }

  /**
   * XLSX 파일 파싱 (ExcelJS 사용)
   */
  async parseXLSXFile(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('엑셀 파일에 시트가 없습니다.');
    }

    const data = [];
    worksheet.eachRow((row, rowNumber) => {
      const rowData = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        let value = cell.value;

        if (value instanceof Date) {
          value = this.toISODate(value);
        } else if (cell.type === ExcelJS.ValueType.Formula && cell.result) {
          value = cell.result;
        } else if (value && typeof value === 'object' && value.text) {
          value = value.text;
        }

        rowData.push(value || '');
      });
      data.push(rowData);
    });

    return data;
  }

  /**
   * XLS 파일 파싱 (xlsx 라이브러리 사용)
   */
  parseXLSFile(filePath) {
    const workbook = XLSX.readFile(filePath, {
      type: 'file',
      cellDates: true,
      cellNF: false,
      cellText: false
    });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('엑셀 파일에 시트가 없습니다.');
    }

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false,
      dateNF: 'yyyy-mm-dd'
    });

    return data;
  }

  /**
   * 실제 헤더 행 찾기 (첫 행이 제목인 경우 대비)
   */
  findHeaderRow(data) {
    // 필수 컬럼명들
    const requiredColumns = ['성명', '직급', '소속', '대학', '재직구분'];

    // 처음 5개 행을 검사
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      // 행에서 필수 컬럼이 몇 개나 있는지 확인
      let matchCount = 0;
      for (const col of requiredColumns) {
        if (row.some(cell => cell && cell.toString().includes(col))) {
          matchCount++;
        }
      }

      // 필수 컬럼 중 3개 이상 있으면 헤더 행으로 간주
      if (matchCount >= 3) {
        console.log(`Header row found at index ${i}`);
        return i;
      }
    }

    // 못 찾으면 첫 번째 행 반환
    return 0;
  }

  /**
   * 데이터 처리
   */
  processData(data) {
    // 실제 헤더 행 찾기
    const headerRowIndex = this.findHeaderRow(data);
    console.log(`Using row ${headerRowIndex} as headers`);

    const headers = data[headerRowIndex];
    console.log('Excel Headers:', headers);

    // 컬럼 인덱스 찾기
    const colIndex = this.findColumnIndexes(headers);
    console.log('Column Indexes:', colIndex);

    // 부서 구조 로드 (data/organization.json에서 로드하거나 기본값 사용)
    const deptStructure = this.getDefaultDeptStructure();

    // 결과 객체 초기화
    const result = this.initializeResultStructure(deptStructure);

    // 데이터 처리
    let processedCount = 0;
    let activeCount = 0;

    const dataStartRow = headerRowIndex + 1;
    console.log(`Total rows to process: ${data.length - dataStartRow}`);

    for (let i = dataStartRow; i < data.length; i++) {
      const row = data[i];
      const rowData = this.extractRowData(row, colIndex);

      // 첫 몇 행의 데이터 샘플 출력
      const rowNum = i - dataStartRow + 1;
      if (rowNum <= 3) {
        console.log(`Data row ${rowNum} (Excel row ${i + 1}) sample:`, {
          name: rowData.name,
          status: rowData.status,
          position: rowData.position,
          dept: rowData.dept
        });
      }

      // 재직 상태 체크
      const isActive = rowData.status && (
        rowData.status.includes('재직') ||
        rowData.status.includes('연구년') ||
        rowData.status.includes('휴직')
      );

      if (rowNum <= 3) {
        console.log(`Data row ${rowNum} isActive:`, isActive);
      }

      if (isActive && rowData.name) {
        activeCount++;
        const processed = this.processEmployee(rowData, result, deptStructure);
        if (processed) processedCount++;
      }
    }

    console.log(`활성 상태 인원: ${activeCount}, 처리된 인원: ${processedCount}`);

    // 연구년 및 휴직 교원 데이터 추출
    const researchLeaveData = this.extractResearchLeaveData(data, dataStartRow, colIndex);

    // 전임교원 성별 통계 계산
    const genderStats = this.calculateGenderStats(result);

    return {
      facultyData: result,
      deptStructure: deptStructure,
      fullTimePositions: this.fullTimePositions,
      partTimePositions: this.partTimePositions,
      otherPositions: this.otherPositions,
      researchLeaveData: researchLeaveData,
      genderStats: genderStats,
      stats: {
        total: activeCount,
        processed: processedCount
      }
    };
  }

  /**
   * 컬럼 인덱스 찾기
   */
  findColumnIndexes(headers) {
    return {
      college: this.findHeaderIndex(headers, ['대학']),
      dept: this.findHeaderIndex(headers, ['소속']),
      empNo: this.findHeaderIndex(headers, ['직번']),
      name: this.findHeaderIndex(headers, ['성명', '성명(한글)']),
      serialType: this.findHeaderIndex(headers, ['직렬']),
      position: this.findHeaderIndex(headers, ['직급']),
      gender: this.findHeaderIndex(headers, ['성별']),
      status: this.findHeaderIndex(headers, ['재직구분']),
      salary: this.findHeaderIndex(headers, ['호봉']),
      firstAppointmentStart: this.findHeaderIndex(headers, ['최초임용 시작일', '전임교원 최초임용일']),
      firstAppointmentEnd: this.findHeaderIndex(headers, ['최초임용 종료일']),
      reappointmentEnd: this.findHeaderIndex(headers, ['재임용종료일']),
      birthDate: this.findHeaderIndex(headers, ['생년월일']),
      retirementDate: this.findHeaderIndex(headers, ['정년일자'])
    };
  }

  /**
   * 헤더 인덱스 찾기
   */
  findHeaderIndex(headers, possibleNames) {
    for (let name of possibleNames) {
      const index = headers.indexOf(name);
      if (index !== -1) return index;
    }
    return -1;
  }

  /**
   * 행 데이터 추출
   */
  extractRowData(row, colIndex) {
    return {
      college: this.getCellValue(row, colIndex.college),
      dept: this.getCellValue(row, colIndex.dept),
      empNo: this.getCellValue(row, colIndex.empNo),
      name: this.getCellValue(row, colIndex.name),
      serialType: this.getCellValue(row, colIndex.serialType),
      position: this.getCellValue(row, colIndex.position),
      gender: this.getCellValue(row, colIndex.gender),
      status: this.getCellValue(row, colIndex.status),
      salary: this.getCellValue(row, colIndex.salary),
      firstAppointmentStart: this.formatDate(row[colIndex.firstAppointmentStart]),
      firstAppointmentEnd: this.formatDate(row[colIndex.firstAppointmentEnd]),
      reappointmentEnd: this.formatDate(row[colIndex.reappointmentEnd]),
      birthDate: this.formatDate(row[colIndex.birthDate]),
      retirementDate: this.formatDate(row[colIndex.retirementDate])
    };
  }

  /**
   * 셀 값 가져오기
   */
  getCellValue(row, index) {
    if (index === -1 || !row[index]) return '';
    return row[index].toString().trim();
  }

  /**
   * 날짜 포맷팅
   */
  formatDate(value) {
    if (!value) return '';

    try {
      // 엑셀 시리얼 넘버인 경우
      if (typeof value === 'number') {
        const date = new Date((value - 25569) * 86400 * 1000);
        return this.toISODate(date);
      }

      // 문자열인 경우
      const str = value.toString();
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
      }

      const date = new Date(str);
      if (!isNaN(date.getTime())) {
        return this.toISODate(date);
      }

      return str;
    } catch (error) {
      return '';
    }
  }

  /**
   * ISO 날짜 형식으로 변환
   */
  toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 직원 데이터 처리
   */
  processEmployee(rowData, result, deptStructure) {
    const mappedPosition = this.positionMapping[rowData.position];

    // 이름 정보 객체 생성
    const nameInfo = {
      name: rowData.name,
      status: this.getStatusLabel(rowData.status),
      isSalary: rowData.serialType === '전임교원' && !rowData.salary,
      gender: rowData.gender,
      birthDate: rowData.birthDate,
      firstAppointmentStart: rowData.firstAppointmentStart,
      firstAppointmentEnd: rowData.firstAppointmentEnd,
      reappointmentEnd: rowData.reappointmentEnd,
      retirementDate: rowData.retirementDate,
      isRetirementGuaranteed: this.checkRetirementGuaranteed(rowData),
      position: rowData.position,
      dept: rowData.dept,
      college: rowData.college,
      serialType: rowData.serialType
    };

    // 교원 배치
    return this.placeEmployee(nameInfo, mappedPosition, rowData, result, deptStructure);
  }

  /**
   * 재직 상태 라벨 추출
   */
  getStatusLabel(status) {
    if (status.includes('휴직')) return '휴직';
    if (status.includes('연구년')) return '연구';
    return '';
  }

  /**
   * 정년 보장 여부 확인
   */
  checkRetirementGuaranteed(rowData) {
    return rowData.reappointmentEnd &&
           rowData.retirementDate &&
           rowData.reappointmentEnd === rowData.retirementDate &&
           rowData.position !== '명예교수';
  }

  /**
   * 직원을 적절한 부서에 배치
   */
  placeEmployee(nameInfo, mappedPosition, rowData, result, deptStructure) {
    const { college, dept, serialType, position: originalPosition } = rowData;

    // 특별 부서 목록
    const specialDepts = [
      '평가성과분석센터', '산학협력단', '용오름대학', '교육혁신원', '원격교육지원센터', '박물관',
      '체육지원실', '교수학습지원센터', '스포츠.웰니스연구센터', '특수체육연구소',
      '무도연구소', '혁신사업추진단', '학생생활상담센터', '취창업지원센터', '인권센터'
    ];

    const targetPosition = mappedPosition || this.otherPositionMapping[originalPosition] || '기타';

    // 1. 소속이 특별 부서인 경우 (우선순위 최고)
    if (specialDepts.includes(dept) && result[dept] && result[dept][targetPosition]) {
      result[dept][targetPosition].push(nameInfo);
      return true;
    }

    // 2. 대학이 특별 부서인 경우
    if (specialDepts.includes(college) && result[college] && result[college][targetPosition]) {
      result[college][targetPosition].push(nameInfo);
      return true;
    }

    // 3. 대학원 처리
    const graduateSchools = deptStructure[0].subDepts;
    // 3-1. college가 대학원 이름인 경우 (예: college="스포츠과학대학원")
    if (graduateSchools.includes(college)) {
      if (result['대학원'][college] && result['대학원'][college][targetPosition]) {
        result['대학원'][college][targetPosition].push(nameInfo);
        return true;
      }
    }
    // 3-2. college가 "대학원"이고 dept가 구체적인 대학원 이름인 경우 (예: college="대학원", dept="스포츠과학대학원")
    if (college === '대학원' && graduateSchools.includes(dept)) {
      if (result['대학원'][dept] && result['대학원'][dept][targetPosition]) {
        result['대학원'][dept][targetPosition].push(nameInfo);
        return true;
      }
    }
    // 3-3. dept에 대학원 이름이 포함된 경우 (예: dept="스포츠과학대학원 체육과학과")
    for (const gradSchool of graduateSchools) {
      if (dept && dept.includes(gradSchool)) {
        if (result['대학원'][gradSchool] && result['대학원'][gradSchool][targetPosition]) {
          result['대학원'][gradSchool][targetPosition].push(nameInfo);
          return true;
        }
      }
    }

    // 4. 일반 대학의 학과 처리
    if (result[college] && dept && result[college][dept] && result[college][dept][targetPosition]) {
      result[college][dept][targetPosition].push(nameInfo);
      return true;
    }

    // 5. 기타로 분류
    if (result['기타'] && result['기타'][targetPosition]) {
      nameInfo.displayName = `${nameInfo.name}(${originalPosition || serialType}, ${dept || college})`;
      result['기타'][targetPosition].push(nameInfo);
      return true;
    }

    return false;
  }

  /**
   * 결과 구조 초기화
   */
  initializeResultStructure(deptStructure) {
    const result = {};
    const allPositions = [...this.fullTimePositions, ...this.partTimePositions, ...this.otherPositions];

    deptStructure.forEach(dept => {
      if (dept.name === '대학원' || (dept.subDepts && dept.subDepts.length > 0)) {
        result[dept.name] = {};
        dept.subDepts.forEach(subDept => {
          result[dept.name][subDept] = {};
          allPositions.forEach(pos => {
            result[dept.name][subDept][pos] = [];
          });
        });
      } else {
        result[dept.name] = {};
        allPositions.forEach(pos => {
          result[dept.name][pos] = [];
        });
      }
    });

    // 기타 카테고리 초기화
    result['기타'] = {};
    allPositions.forEach(pos => {
      result['기타'][pos] = [];
    });

    return result;
  }

  /**
   * 기본 부서 구조 반환
   */
  getDefaultDeptStructure() {
    return [
      {
        name: '대학원',
        subDepts: ['교육대학원', '일반대학원', '재활복지대학원', '태권도대학원', '문화예술대학원', '스포츠과학대학원']
      },
      {
        name: '무도대학',
        subDepts: ['유도학과', '유도경기지도학과', '무도학과', '태권도학과', '경호학과', '군사학과', '무도스포츠산업학과(계약학과)']
      },
      {
        name: '체육과학대학',
        subDepts: ['스포츠레저학과', '특수체육교육과', '체육학과', '골프학부']
      },
      {
        name: '문화예술대학',
        subDepts: ['무용과', '미디어디자인학과', '영화영상학과', '회화학과', '국악과', '연극학과', '문화유산학과', '문화콘텐츠학과', '실용음악과']
      },
      {
        name: '인문사회융합대학',
        subDepts: ['경영학과', '관광경영학과', '경영정보학과', '경찰행정학과', '영어과', '중국학과', '미용경영학과', '미용경영학과(야)', '사회복지학과']
      },
      {
        name: 'AI바이오융합대학',
        subDepts: ['AI융합학부', '환경학과', '보건환경안전학과', '바이오생명공학과', '식품조리학부', '물리치료학과']
      },
      { name: '용오름대학', subDepts: [] },
      { name: '산학협력단', subDepts: [] },
      { name: '평가성과분석센터', subDepts: [] },
      { name: '교육혁신원', subDepts: [] },
      { name: '원격교육지원센터', subDepts: [] },
      { name: '박물관', subDepts: [] },
      { name: '체육지원실', subDepts: [] },
      { name: '교수학습지원센터', subDepts: [] },
      { name: '스포츠.웰니스연구센터', subDepts: [] },
      { name: '특수체육연구소', subDepts: [] },
      { name: '무도연구소', subDepts: [] },
      { name: '혁신사업추진단', subDepts: [] },
      { name: '학생생활상담센터', subDepts: [] },
      { name: '취창업지원센터', subDepts: [] },
      { name: '인권센터', subDepts: [] }
    ];
  }

  /**
   * 연구년 및 휴직 교원 데이터 추출
   */
  extractResearchLeaveData(data, dataStartRow, colIndex) {
    const researchLeaveData = {
      research: {
        first: [],  // 전반기
        second: []  // 후반기
      },
      leave: []
    };

    for (let i = dataStartRow; i < data.length; i++) {
      const row = data[i];
      const rowData = this.extractRowData(row, colIndex);

      // 재직구분이 연구년 또는 휴직인 경우만 처리
      if (!rowData.status || !rowData.name) continue;

      if (rowData.status.includes('연구년')) {
        // 재임용종료일로 전반기/후반기 구분
        const endDate = rowData.reappointmentEnd || '';
        const isSemester2 = endDate.includes('09.') || endDate.includes('08.');

        const facultyInfo = {
          dept: rowData.dept || '미배정',
          name: rowData.name,
          period: this.formatPeriod(rowData.firstAppointmentStart, rowData.reappointmentEnd)
        };

        if (isSemester2) {
          researchLeaveData.research.second.push(facultyInfo);
        } else {
          researchLeaveData.research.first.push(facultyInfo);
        }
      } else if (rowData.status.includes('휴직')) {
        // 이름이 있는 경우만 추가
        if (rowData.name && rowData.name.trim()) {
          researchLeaveData.leave.push({
            dept: rowData.dept || '미배정',
            name: rowData.name,
            period: this.formatPeriod(rowData.firstAppointmentStart, rowData.reappointmentEnd),
            remarks: ''  // 교원현황 파일에는 휴직 구분 정보가 없음
          });
        }
      }
    }

    console.log('연구년 및 휴직 데이터:', {
      researchFirst: researchLeaveData.research.first.length,
      researchSecond: researchLeaveData.research.second.length,
      leave: researchLeaveData.leave.length
    });

    return researchLeaveData;
  }

  /**
   * 전임교원 성별 통계 계산
   */
  calculateGenderStats(facultyData) {
    const stats = {
      '교수': { male: 0, female: 0 },
      '부교수': { male: 0, female: 0 },
      '조교수': { male: 0, female: 0 },
      '부교수(비정년트랙)': { male: 0, female: 0 },
      '조교수(비정년트랙)': { male: 0, female: 0 }
    };

    // facultyData에서 전임교원만 집계
    Object.entries(facultyData).forEach(([deptName, deptGroup]) => {
      // 평면 구조인지 확인
      const isFlat = Array.isArray(deptGroup[this.fullTimePositions[0]]);

      if (isFlat) {
        // 평면 구조: 직접 직급별로 순회
        this.fullTimePositions.forEach(position => {
          if (deptGroup[position] && Array.isArray(deptGroup[position])) {
            deptGroup[position].forEach(person => {
              if (person.gender === '남' || person.gender === '남성' || person.gender === 'M') {
                stats[position].male++;
              } else if (person.gender === '여' || person.gender === '여성' || person.gender === 'F') {
                stats[position].female++;
              }
            });
          }
        });
      } else {
        // 중첩 구조: 학과별로 순회
        Object.values(deptGroup).forEach(subDept => {
          if (!subDept || typeof subDept !== 'object') return;

          this.fullTimePositions.forEach(position => {
            if (subDept[position] && Array.isArray(subDept[position])) {
              subDept[position].forEach(person => {
                if (person.gender === '남' || person.gender === '남성' || person.gender === 'M') {
                  stats[position].male++;
                } else if (person.gender === '여' || person.gender === '여성' || person.gender === 'F') {
                  stats[position].female++;
                }
              });
            }
          });
        });
      }
    });

    // 배열 형태로 변환
    const genderStats = this.fullTimePositions.map(position => ({
      rank: position,
      male: stats[position].male,
      female: stats[position].female,
      total: stats[position].male + stats[position].female
    }));

    console.log('성별 통계:', genderStats);

    return genderStats;
  }

  /**
   * 기간 포맷팅 (시작일 ~ 종료일)
   */
  formatPeriod(startDate, endDate) {
    const formatDate = (date) => {
      if (!date) return '';
      if (typeof date === 'string') {
        // 이미 포맷팅된 경우
        if (date.includes('.')) return date;
        // YYYY-MM-DD 형식인 경우
        if (date.includes('-')) {
          const parts = date.split('-');
          return `${parts[0]}.${parts[1]}.${parts[2]}`;
        }
      }
      if (date instanceof Date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
      }
      return '';
    };

    const start = formatDate(startDate);
    const end = formatDate(endDate);

    if (start && end) {
      return `${start} ~ ${end}`;
    } else if (start) {
      return `${start} ~`;
    } else if (end) {
      return `~ ${end}`;
    }
    return '';
  }
}

module.exports = new ExcelParser();
