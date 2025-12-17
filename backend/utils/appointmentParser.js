const xlsx = require('xlsx');
const ExcelJS = require('exceljs');

/**
 * 교원 발령사항 엑셀 파일 파서
 *
 * 파일 구조:
 * No. | 대학 | 소속 | 직번 | 성명 | 직렬 | 직급 | 재직구분 | 발령구분 | 발령시작일 | 발령종료일 |
 * 발령직렬 | 발령직급 | 발령직위 | 휴직구분 | 휴직기간(년) | 휴직기간(월) | 휴직시작일 | 휴직종료일 |
 * 퇴직구분 | 발령근거 | 비고
 */
class AppointmentParser {
  /**
   * 엑셀 파일 파싱
   */
  async parseExcelFile(filePath) {
    try {
      console.log('발령사항 파일 업로드:', filePath);

      const ext = filePath.split('.').pop().toLowerCase();
      console.log('발령사항 파일 형식:', ext);

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
      console.error('발령사항 파일 파싱 오류:', error);
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
      leave: []  // 휴직 교원만 추출
    };

    console.log('📊 전체 데이터 행 수:', data.length);

    // 헤더 행 찾기
    const headerRowIndex = this.findHeaderRow(data);
    console.log('🔍 헤더 행 인덱스:', headerRowIndex);

    const headers = data[headerRowIndex];
    console.log('📌 헤더 내용:', headers);

    const colIndex = this.findColumnIndexes(headers);
    console.log('🗂️ 컬럼 인덱스:', colIndex);

    // 현재 날짜
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 교원별로 그룹화 (같은 이름의 교원이 여러 발령 이력을 가질 수 있음)
    const groupedByName = {};

    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];

      // 빈 행 건너뛰기
      if (!row || row.every(cell => !cell)) continue;

      const name = this.getCell(row, colIndex.name);
      const status = this.getCell(row, colIndex.status);
      const appointmentType = this.getCell(row, colIndex.appointmentType);
      const leaveType = this.getCell(row, colIndex.leaveType);
      const leaveStart = this.getCell(row, colIndex.leaveStart);
      const leaveEnd = this.getCell(row, colIndex.leaveEnd);
      const dept = this.getCell(row, colIndex.dept);
      const college = this.getCell(row, colIndex.college);

      // 성명이 없거나 재직구분이 휴직이 아니면 건너뛰기
      if (!name || !status.includes('휴직')) continue;

      // 명예교수 제외
      if (status.includes('명예')) continue;

      // 교원별로 그룹화
      if (!groupedByName[name]) {
        groupedByName[name] = [];
      }

      groupedByName[name].push({
        rowIndex: i,
        name,
        dept,
        college,
        status,
        appointmentType,
        leaveType,
        leaveStart,
        leaveEnd
      });
    }

    console.log(`📊 총 ${Object.keys(groupedByName).length}명의 휴직 교원 발견`);

    // 각 교원의 현재 휴직 정보 찾기
    let processedCount = 0;
    Object.keys(groupedByName).forEach(name => {
      const records = groupedByName[name];

      // 날짜별로 정렬 (최신순)
      records.sort((a, b) => {
        const dateA = this.parseDate(a.leaveStart);
        const dateB = this.parseDate(b.leaveStart);
        return dateB - dateA;
      });

      // 현재 휴직 중인 레코드 찾기
      const currentRecord = records.find(record => {
        const startDate = this.parseDate(record.leaveStart);
        const endDate = this.parseDate(record.leaveEnd);

        if (!startDate || !endDate) return false;

        // 현재 날짜가 휴직 기간 내에 있는지 확인
        return startDate <= today && today <= endDate;
      });

      if (!currentRecord) {
        // 현재 휴직 중이 아니면 건너뛰기
        return;
      }

      processedCount++;

      if (processedCount <= 5) {
        console.log(`✅ 현재 휴직 중: ${name} (${currentRecord.leaveStart} ~ ${currentRecord.leaveEnd}, ${currentRecord.leaveType || '구분 없음'})`);
      }

      // 휴직 기간 조합
      let period = '';
      if (currentRecord.leaveStart && currentRecord.leaveEnd) {
        period = `${currentRecord.leaveStart} ~ ${currentRecord.leaveEnd}`;
      } else if (currentRecord.leaveStart) {
        period = `${currentRecord.leaveStart} ~`;
      } else if (currentRecord.leaveEnd) {
        period = `~ ${currentRecord.leaveEnd}`;
      }

      // 소속: 학과 > 대학 우선순위
      const deptName = currentRecord.dept || currentRecord.college || '미배정';

      // 이전 휴직 이력을 찾아서 비고에 추가
      const previousRecords = records.filter(r => r !== currentRecord && r.leaveStart && r.leaveEnd);

      // 이전 레코드를 시작일 기준으로 정렬 (오래된 순)
      previousRecords.sort((a, b) => {
        const dateA = this.parseDate(a.leaveStart);
        const dateB = this.parseDate(b.leaveStart);
        return dateA - dateB;
      });

      // 비고 조합: 이전 이력 + 현재 휴직 구분
      let remarks = '';
      if (previousRecords.length > 0) {
        const prevHistory = previousRecords.map((prev, idx) => {
          const prevPeriod = `${prev.leaveStart} ~ ${prev.leaveEnd}`;
          return `${idx + 1}차: ${prevPeriod}`;
        }).join(' ');
        remarks = prevHistory;
      }

      // 현재 휴직 구분 추가 (있는 경우)
      if (currentRecord.leaveType) {
        if (remarks) {
          remarks = `${currentRecord.leaveType} (${remarks})`;
        } else {
          remarks = currentRecord.leaveType;
        }
      }

      const entry = {
        dept: deptName,
        name: currentRecord.name,
        period: period,
        remarks: remarks
      };

      result.leave.push(entry);
    });

    console.log('발령사항 파싱 결과:', {
      leave: result.leave.length
    });

    return result;
  }

  /**
   * 헤더 행 찾기
   */
  findHeaderRow(data) {
    // 필수 컬럼: No., 성명, 재직구분, 휴직구분
    const requiredColumns = ['성명', '재직구분', '휴직구분'];

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

    console.warn('⚠️ 헤더를 찾을 수 없습니다. 기본값 3 사용');
    return 3;  // 보통 3번째 행에 헤더가 있음
  }

  /**
   * 컬럼 인덱스 찾기
   */
  findColumnIndexes(headers) {
    return {
      college: this.findHeaderIndex(headers, ['대학']),
      dept: this.findHeaderIndex(headers, ['소속']),
      name: this.findHeaderIndex(headers, ['성명', '이름']),
      status: this.findHeaderIndex(headers, ['재직구분']),
      appointmentType: this.findHeaderIndex(headers, ['발령구분']),
      leaveType: this.findHeaderIndex(headers, ['휴직구분']),
      leaveStart: this.findHeaderIndex(headers, ['휴직시작일']),
      leaveEnd: this.findHeaderIndex(headers, ['휴직종료일'])
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
}

module.exports = new AppointmentParser();
