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
      if (!row || row.every(cell => !cell)) {
        console.log(`⏭️ 행 ${i}: 빈 행 건너뜀`);
        continue;
      }

      const category = this.getCell(row, colIndex.category);
      const dept = this.getCell(row, colIndex.dept);
      const name = this.getCell(row, colIndex.name);
      const period = this.getCell(row, colIndex.period);
      const remarks = this.getCell(row, colIndex.remarks);

      if (processedCount < 3) {
        console.log(`📝 행 ${i} 데이터:`, { category, dept, name, period, remarks });
      }

      // 성명이 없으면 건너뛰기
      if (!name) {
        console.log(`⏭️ 행 ${i}: 성명 없음 (건너뜀)`);
        continue;
      }

      processedCount++;

      const entry = {
        dept: dept || '미배정',
        name: name,
        period: period || '',
        remarks: remarks || ''
      };

      // 구분에 따라 분류
      const categoryStr = String(category || '').toLowerCase();

      if (categoryStr.includes('연구년')) {
        // 전반기/후반기 구분
        if (categoryStr.includes('후반기') || categoryStr.includes('2학기')) {
          result.research.second.push(entry);
        } else {
          result.research.first.push(entry);
        }
      } else if (categoryStr.includes('휴직')) {
        result.leave.push(entry);
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
    const requiredColumns = ['구분', '소속', '성명', '기간'];

    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      let matchCount = 0;
      for (const col of requiredColumns) {
        if (row.some(cell => cell && String(cell).includes(col))) {
          matchCount++;
        }
      }

      if (matchCount >= 3) {
        console.log(`헤더 행 발견: ${i}번째 행`);
        return i;
      }
    }

    return 0;
  }

  /**
   * 컬럼 인덱스 찾기
   */
  findColumnIndexes(headers) {
    return {
      category: this.findHeaderIndex(headers, ['구분']),
      dept: this.findHeaderIndex(headers, ['소속', '부서']),
      name: this.findHeaderIndex(headers, ['성명', '이름']),
      period: this.findHeaderIndex(headers, ['기간']),
      remarks: this.findHeaderIndex(headers, ['비고', '특이사항', '메모'])
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
}

module.exports = new ResearchLeaveParser();
