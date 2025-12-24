const XLSX = require('xlsx');

/**
 * 조교 데이터 파서
 * 교원 발령사항 현황 Excel 파일에서 조교 데이터를 추출합니다.
 *
 * 출력 형식:
 * {
 *   assistants: [
 *     {
 *       name: '이름',
 *       college: '소속 대학',
 *       department: '소속 학과',
 *       position: '직급',
 *       employmentStatus: '재직구분',
 *       appointmentType: '발령구분',  // 최초임용, 재임용
 *       startDate: '발령시작일',
 *       endDate: '발령종료일'
 *     }
 *   ],
 *   summary: {
 *     total: 전체 조교 수,
 *     active: 재직 중인 조교 수,
 *     byCollege: { '대학명': 인원수 }
 *   }
 * }
 */
class AssistantParser {
  constructor() {
    // 헤더 행 인덱스 (0-based: 실제 4번째 행)
    this.headerRow = 3;
  }

  /**
   * Excel 버퍼에서 조교 데이터 파싱
   */
  async parseFromBuffer(buffer) {
    try {
      // Excel 파일 읽기
      const workbook = XLSX.read(buffer, {
        type: 'buffer',
        codepage: 65001  // UTF-8
      });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // 헤더 행을 기준으로 데이터 파싱
      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        range: this.headerRow,
        defval: ''
      });

      // 조교 데이터 필터링 및 변환
      const assistants = [];
      const byCollege = {};
      let activeCount = 0;

      rawData.forEach(row => {
        // 직렬이 "조교"인 경우만 처리
        if (row['직렬'] !== '조교') {
          return;
        }

        const employmentStatus = (row['재직구분'] || '').trim();
        const isActive = employmentStatus === '재직';

        // 재직 중인 조교만 카운트
        if (isActive) {
          activeCount++;
        }

        const college = row['대학'] || row['소속'] || '기타';
        const appointmentType = row['발령구분'] || '';

        // 대학별 재직 인원 카운트
        if (isActive) {
          byCollege[college] = (byCollege[college] || 0) + 1;
        }

        const assistant = {
          name: row['성명'] || '',
          college: college,
          department: row['소속'] || '',
          position: row['직급'] || '조교',
          employmentStatus: employmentStatus,
          appointmentType: appointmentType,
          startDate: this.formatDate(row['발령시작일']),
          endDate: this.formatDate(row['발령종료일']),
          isActive: isActive,
          isFirstAppointment: appointmentType === '최초임용'
        };

        assistants.push(assistant);
      });

      // 재직 중인 조교만 필터링
      const activeAssistants = assistants.filter(a => a.isActive);

      // 중복 제거 (동일 인물의 여러 발령 기록 중 최신 것만)
      const uniqueAssistants = this.deduplicateAssistants(activeAssistants);

      return {
        assistants: uniqueAssistants,
        summary: {
          total: assistants.length,
          active: activeCount,
          byCollege: byCollege
        }
      };

    } catch (error) {
      console.error('조교 데이터 파싱 오류:', error);
      throw new Error('조교 데이터 파싱 중 오류가 발생했습니다: ' + error.message);
    }
  }

  /**
   * 동일 인물의 중복 레코드 제거 (최신 발령만 유지)
   */
  deduplicateAssistants(assistants) {
    const uniqueMap = new Map();

    assistants.forEach(assistant => {
      const key = `${assistant.name}_${assistant.college}`;
      const existing = uniqueMap.get(key);

      if (!existing) {
        uniqueMap.set(key, assistant);
      } else {
        // 발령시작일이 더 최근인 것으로 교체
        if (assistant.startDate > existing.startDate) {
          uniqueMap.set(key, assistant);
        }
      }
    });

    return Array.from(uniqueMap.values());
  }

  /**
   * 날짜 포맷 변환
   */
  formatDate(dateValue) {
    if (!dateValue) return '';

    // Excel 날짜 숫자인 경우
    if (typeof dateValue === 'number') {
      const date = new Date((dateValue - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }

    // 문자열 날짜인 경우
    if (typeof dateValue === 'string') {
      // "YYYY.MM.DD" 형식을 "YYYY-MM-DD"로 변환
      return dateValue.replace(/\./g, '-');
    }

    return String(dateValue);
  }

  /**
   * 파일에서 직접 파싱
   */
  async parseFromFile(filePath) {
    const fs = require('fs');
    const buffer = fs.readFileSync(filePath);
    return await this.parseFromBuffer(buffer);
  }
}

module.exports = AssistantParser;
