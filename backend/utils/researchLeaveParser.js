const xlsx = require('xlsx');
const ExcelJS = require('exceljs');

/**
 * 연구년/휴직 교원 엑셀 파일 파서
 *
 * 실제 파일 구조:
 * 순번 | 대학 | 학과 | 직렬 | 직급 | 성명 | 교번 | 최초임용일 | 재직구분 | 파견시작일 | 파견종료일 | 파견교/파견기관 | 연락처
 */
class ResearchLeaveParser {
  /**
   * 엑셀 파일 파싱
   */
  async parseExcelFile(filePath) {
    try {
      console.log('연구년/휴직 파일 업로드:', filePath);

      const ext = filePath.split('.').pop().toLowerCase();
      console.log('연구년/휴직 파일 형식:', ext);

      let data;
      if (ext === 'xlsx') {
        data = await this.parseXLSX(filePath);
      } else if (ext === 'xls') {
        data = this.parseXLS(filePath);
      } else {
        throw new Error('지원하지 않는 파일 형식입니다. (.xlsx 또는 .xls만 가능)');
      }

      return this.processData(data);
    } catch (error) {
      console.error('연구년/휴직 파일 파싱 오류:', error);
      throw error;
    }
  }

  /**
   * XLSX 파일 파싱 (ExcelJS 사용)
   */
  async parseXLSX(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    const data = [];

    worksheet.eachRow((row, rowNumber) => {
      const rowData = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        let value = cell.value;

        // Date 객체 처리
        if (value instanceof Date) {
          value = this.formatDate(value);
        }
        // 수식 결과 처리
        else if (cell.type === ExcelJS.ValueType.Formula && cell.result !== undefined) {
          value = cell.result;
        }

        rowData.push(value);
      });
      data.push(rowData);
    });

    return data;
  }

  /**
   * XLS 파일 파싱 (xlsx 라이브러리 사용)
   */
  parseXLS(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const data = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      dateNF: 'yyyy.mm.dd'
    });

    return data.map(row =>
      row.map(cell => (cell instanceof Date ? this.formatDate(cell) : cell))
    );
  }

  /**
   * 데이터 처리
   */
  processData(data) {
    const result = {
      research: {
        first: [],
        second: []
      },
      leave: []
    };

    console.log('📊 전체 데이터 행 수:', data.length);
    console.log('📋 첫 5행 미리보기:', data.slice(0, 5));

    // 헤더 행 찾기
    const headerRowIndex = this.findHeaderRow(data);
    console.log('🔍 헤더 행 인덱스:', headerRowIndex);

    const headers = data[headerRowIndex];
    console.log('📌 헤더 내용:', headers);

    const colIndex = this.findColumnIndexes(headers);
    console.log('🗂️ 컬럼 인덱스:', colIndex);

    // 데이터 처리 - 먼저 모든 데이터를 수집
    const allRecords = [];

    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];

      // 빈 행 건너뛰기
      if (!row || row.every(cell => !cell)) continue;

      const college = this.getCell(row, colIndex.college);
      const dept = this.getCell(row, colIndex.dept);
      const name = this.getCell(row, colIndex.name);
      const employmentStatus = this.getCell(row, colIndex.employmentStatus);
      const dispatchStart = this.getCell(row, colIndex.dispatchStart);
      const dispatchEnd = this.getCell(row, colIndex.dispatchEnd);
      const dispatchOrg = this.getCell(row, colIndex.dispatchOrg);

      // 성명이 없으면 건너뛰기
      if (!name) continue;

      // 명예교수 제외
      const statusStr = String(employmentStatus || '').toLowerCase();
      if (statusStr.includes('명예')) {
        console.log(`⏭️ 행 ${i}: 명예교수 제외 (${name})`);
        continue;
      }

      allRecords.push({
        rowIndex: i,
        college,
        dept,
        name,
        employmentStatus,
        dispatchStart,
        dispatchEnd,
        dispatchOrg
      });
    }

    console.log(`📊 총 ${allRecords.length}개 레코드 수집됨 (명예교수 제외)`);

    // 교원별로 그룹화 (같은 이름의 교원이 여러 파견 이력을 가질 수 있음)
    const groupedByName = {};
    allRecords.forEach(record => {
      if (!groupedByName[record.name]) {
        groupedByName[record.name] = [];
      }
      groupedByName[record.name].push(record);
    });

    // 현재 날짜
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 각 교원의 파견 이력 처리
    let processedCount = 0;
    Object.keys(groupedByName).forEach(name => {
      const records = groupedByName[name];

      // 날짜별로 정렬 (최신순)
      records.sort((a, b) => {
        const dateA = this.parseDate(a.dispatchStart);
        const dateB = this.parseDate(b.dispatchStart);
        return dateB - dateA;
      });

      // 현재 파견 중인 레코드 찾기
      const currentRecord = records.find(record => {
        const startDate = this.parseDate(record.dispatchStart);
        const endDate = this.parseDate(record.dispatchEnd);

        if (!startDate || !endDate) return false;

        // 현재 날짜가 파견 기간 내에 있는지 확인
        return startDate <= today && today <= endDate;
      });

      if (!currentRecord) {
        // 현재 파견 중이 아니면 건너뛰기
        return;
      }

      processedCount++;

      if (processedCount <= 5) {
        console.log(`✅ 현재 파견 중: ${name} (${currentRecord.dispatchStart} ~ ${currentRecord.dispatchEnd})`);
      }

      // 파견 기간 조합
      let period = '';
      if (currentRecord.dispatchStart && currentRecord.dispatchEnd) {
        period = `${currentRecord.dispatchStart} ~ ${currentRecord.dispatchEnd}`;
      } else if (currentRecord.dispatchStart) {
        period = `${currentRecord.dispatchStart} ~`;
      } else if (currentRecord.dispatchEnd) {
        period = `~ ${currentRecord.dispatchEnd}`;
      }

      // 소속: 학과 > 대학 우선순위
      const deptName = currentRecord.dept || currentRecord.college || '미배정';

      // 이전 파견 이력을 비고에 추가
      const previousRecords = records.filter(r => r !== currentRecord);
      let remarks = currentRecord.dispatchOrg || '';

      if (previousRecords.length > 0) {
        const prevHistory = previousRecords.map(prev => {
          const prevYear = this.extractYear(prev.dispatchStart);
          return prevYear ? `${prevYear}년` : '이전';
        }).join(', ');

        if (remarks) {
          remarks += ` (이전: ${prevHistory})`;
        } else {
          remarks = `이전: ${prevHistory}`;
        }

        if (processedCount <= 5) {
          console.log(`  📝 이전 이력 추가: ${prevHistory}`);
        }
      }

      const entry = {
        dept: deptName,
        name: currentRecord.name,
        period: period,
        remarks: remarks
      };

      // 재직구분으로 연구년/휴직 분류
      const statusStr = String(currentRecord.employmentStatus || '').toLowerCase();

      if (statusStr.includes('연구년') || statusStr.includes('파견')) {
        // 전반기/후반기 구분 (기간으로 판단 - 3~8월 시작이면 전반기, 9~2월 시작이면 후반기)
        const month = this.extractMonth(currentRecord.dispatchStart);

        if (month >= 3 && month <= 8) {
          result.research.first.push(entry);
          if (processedCount <= 5) console.log(`  ➡️ 연구년 전반기로 분류`);
        } else if (month >= 9 || (month >= 1 && month <= 2)) {
          result.research.second.push(entry);
          if (processedCount <= 5) console.log(`  ➡️ 연구년 후반기로 분류`);
        } else {
          // 월 정보가 없으면 기본적으로 전반기
          result.research.first.push(entry);
          if (processedCount <= 5) console.log(`  ➡️ 연구년 전반기로 분류 (기본값)`);
        }
      } else if (statusStr.includes('휴직')) {
        result.leave.push(entry);
        if (processedCount <= 5) console.log(`  ➡️ 휴직으로 분류`);
      } else {
        // 재직구분 정보가 없으면 기본적으로 연구년 전반기로 분류
        result.research.first.push(entry);
        if (processedCount <= 5) console.log(`  ➡️ 연구년 전반기로 분류 (재직구분 없음)`);
      }
    });

    console.log('파싱 결과:', {
      researchFirst: result.research.first.length,
      researchSecond: result.research.second.length,
      leave: result.leave.length
    });

    return result;
  }

  /**
   * 헤더 행 찾기
   */
  findHeaderRow(data) {
    // 실제 파일 구조: 순번, 대학, 학과, 직렬, 직급, 성명, 교번, 최초임용일, 재직구분, 파견시작일, 파견종료일, 파견교/파견기관, 연락처
    const requiredColumns = ['성명', '학과', '파견시작일'];

    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      let matchCount = 0;
      for (const col of requiredColumns) {
        if (row.some(cell => cell && String(cell).includes(col))) {
          matchCount++;
        }
      }

      if (matchCount >= 2) {
        console.log(`✅ 헤더 행 발견: ${i}번째 행`);
        return i;
      }
    }

    console.warn('⚠️ 헤더를 찾을 수 없습니다. 기본값 0 사용');
    return 0;
  }

  /**
   * 컬럼 인덱스 찾기
   */
  findColumnIndexes(headers) {
    return {
      college: this.findHeaderIndex(headers, ['대학']),
      dept: this.findHeaderIndex(headers, ['학과', '소속']),
      name: this.findHeaderIndex(headers, ['성명', '이름']),
      employmentStatus: this.findHeaderIndex(headers, ['재직구분', '구분']),
      dispatchStart: this.findHeaderIndex(headers, ['파견시작일', '시작일']),
      dispatchEnd: this.findHeaderIndex(headers, ['파견종료일', '종료일']),
      dispatchOrg: this.findHeaderIndex(headers, ['파견교/파견기관', '파견교', '파견기관'])
    };
  }

  /**
   * 헤더 인덱스 찾기
   */
  findHeaderIndex(headers, candidates) {
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i] || '').trim();
      for (const candidate of candidates) {
        if (header.includes(candidate)) {
          return i;
        }
      }
    }
    return -1;
  }

  /**
   * 셀 값 가져오기
   */
  getCell(row, index) {
    if (index === -1 || !row || index >= row.length) return '';
    const value = row[index];
    return value ? String(value).trim() : '';
  }

  /**
   * 날짜 파싱
   */
  parseDate(dateStr) {
    if (!dateStr) return null;

    if (dateStr instanceof Date) {
      return dateStr;
    }

    const str = String(dateStr).trim();

    // "YYYY.MM.DD" 또는 "YYYY-MM-DD" 형식
    const match = str.match(/(\d{4})[.-](\d{1,2})[.-](\d{1,2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // 0-based
      const day = parseInt(match[3], 10);
      return new Date(year, month, day);
    }

    // "YYYY.MM" 형식
    const match2 = str.match(/(\d{4})[.-](\d{1,2})/);
    if (match2) {
      const year = parseInt(match2[1], 10);
      const month = parseInt(match2[2], 10) - 1;
      return new Date(year, month, 1);
    }

    return null;
  }

  /**
   * 날짜 포맷팅
   */
  formatDate(date) {
    if (!(date instanceof Date)) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  }

  /**
   * 날짜 문자열에서 월 추출
   * 예: "2025.03.01" -> 3, "2025-09-01" -> 9
   */
  extractMonth(dateStr) {
    if (!dateStr) return 0;

    const str = String(dateStr);

    // Date 객체인 경우
    if (dateStr instanceof Date) {
      return dateStr.getMonth() + 1;
    }

    // "2025.03.01" 또는 "2025-03-01" 형식
    const match = str.match(/\d{4}[.-](\d{1,2})[.-]\d{1,2}/);
    if (match) {
      return parseInt(match[1], 10);
    }

    // "2025.03" 형식
    const match2 = str.match(/\d{4}[.-](\d{1,2})/);
    if (match2) {
      return parseInt(match2[1], 10);
    }

    return 0;
  }

  /**
   * 날짜 문자열에서 연도 추출
   * 예: "2025.03.01" -> 2025
   */
  extractYear(dateStr) {
    if (!dateStr) return null;

    const str = String(dateStr);

    // Date 객체인 경우
    if (dateStr instanceof Date) {
      return dateStr.getFullYear();
    }

    // "2025.03.01" 또는 "2025-03-01" 형식
    const match = str.match(/(\d{4})[.-]\d{1,2}[.-]\d{1,2}/);
    if (match) {
      return parseInt(match[1], 10);
    }

    // "2025.03" 형식
    const match2 = str.match(/(\d{4})[.-]\d{1,2}/);
    if (match2) {
      return parseInt(match2[1], 10);
    }

    // "2025" 형식
    const match3 = str.match(/^(\d{4})$/);
    if (match3) {
      return parseInt(match3[1], 10);
    }

    return null;
  }
}

module.exports = new ResearchLeaveParser();
