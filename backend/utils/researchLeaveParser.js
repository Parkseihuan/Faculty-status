const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const path = require('path');

/**
 * 연구년 및 휴직 교원 엑셀 파일 파서
 *
 * 예상 엑셀 구조:
 * 구분 | 소속 | 성명 | 기간 | 비고
 * -----|------|------|------|------
 * 연구년 2025학년도 전반기 | 유도경기지도학과 | 전기영 | 2025.03.01 ~ 2026.02.28 | 2019년 연구년
 * 휴직 | 골프학과 | 김순희 | 2025.03.01 ~ 2028.04.08 |
 */
class ResearchLeaveParser {
  /**
   * 파일 형식 감지
   */
  detectFileFormat(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.xls') return 'xls';
    if (ext === '.xlsx') return 'xlsx';
    return 'xlsx'; // 기본값
  }

  /**
   * 엑셀 파일 파싱
   */
  async parseExcelFile(filePath) {
    try {
      const format = this.detectFileFormat(filePath);
      console.log(`연구년/휴직 파일 형식: ${format}`);

      let data = [];
      if (format === 'xlsx') {
        data = await this.parseXLSXFile(filePath);
      } else {
        data = this.parseXLSFile(filePath);
      }

      if (data.length === 0) {
        throw new Error('엑셀 파일이 비어있습니다.');
      }

      return this.processData(data);
    } catch (error) {
      console.error('연구년/휴직 파일 파싱 오류:', error);
      throw new Error(`엑셀 파일 파싱 오류: ${error.message}`);
    }
  }

  /**
   * XLSX 파일 파싱
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
          value = this.formatDate(value);
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
   * XLS 파일 파싱
   */
  parseXLSFile(filePath) {
    const workbook = XLSX.readFile(filePath, {
      type: 'file',
      cellDates: true
    });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('엑셀 파일에 시트가 없습니다.');
    }

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

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

    // 데이터 처리
    let processedCount = 0;
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

      if (processedCount < 5) {
        console.log(`📝 행 ${i} 데이터:`, {
          college, dept, name, employmentStatus,
          dispatchStart, dispatchEnd, dispatchOrg
        });
      }

      // 성명이 없으면 건너뛰기
      if (!name) continue;

      processedCount++;

      // 파견 기간 조합
      let period = '';
      if (dispatchStart && dispatchEnd) {
        period = `${dispatchStart} ~ ${dispatchEnd}`;
      } else if (dispatchStart) {
        period = `${dispatchStart} ~`;
      } else if (dispatchEnd) {
        period = `~ ${dispatchEnd}`;
      }

      // 소속: 대학 > 학과 우선순위
      const deptName = dept || college || '미배정';

      const entry = {
        dept: deptName,
        name: name,
        period: period,
        remarks: dispatchOrg || '' // 파견교/파견기관을 비고로 사용
      };

      // 재직구분으로 연구년/휴직 분류
      const statusStr = String(employmentStatus || '').toLowerCase();

      if (statusStr.includes('연구년') || statusStr.includes('파견')) {
        // 전반기/후반기 구분 (기간으로 판단 - 3~8월 시작이면 전반기, 9~2월 시작이면 후반기)
        const startDate = dispatchStart ? String(dispatchStart) : '';
        const month = this.extractMonth(startDate);

        if (month >= 3 && month <= 8) {
          result.research.first.push(entry);
          if (processedCount <= 5) console.log(`  ➡️ 연구년 전반기로 분류`);
        } else if (month >= 9 || month <= 2) {
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
    }

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
    if (index === -1 || index >= row.length) return '';
    const value = row[index];
    return value ? String(value).trim() : '';
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
}

module.exports = new ResearchLeaveParser();
