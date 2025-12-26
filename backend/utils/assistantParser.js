const XLSX = require('xlsx');

/**
 * 조교 데이터 파서
 * 교원 발령사항 현황 Excel 파일에서 조교 데이터를 추출하여 PDF 형식으로 구조화합니다.
 *
 * 출력 형식:
 * {
 *   colleges: [
 *     {
 *       categoryName: '무도대학',
 *       departments: [
 *         {
 *           mainDept: '교학과',
 *           subDepts: ['(겸)경호학과', '(겸)무도계열전공학부'],
 *           allocated: 1,
 *           current: 1,
 *           assistants: [
 *             { name: '정성연', isNew: false, startDate: '' }
 *           ]
 *         }
 *       ]
 *     }
 *   ],
 *   administrative: [...],
 *   summary: { totalColleges: 29, totalAdmin: 20, grandTotal: 49 }
 * }
 */
class AssistantParser {
  constructor() {
    // 헤더 행 인덱스 (0-based: 실제 4번째 행)
    this.headerRow = 3;

    // 대학 순서 정의 (PDF와 동일한 순서)
    this.collegeOrder = [
      '무도대학',
      '체육과학대학',
      '문화예술대학',
      '인문사회융합대학',
      'AI융합대학',
      '보건복지과학대학',
      'AI바이오융합대학',
      '용오름대학',
      '교육대학원'
    ];

    // 행정부서 순서 정의
    this.adminOrder = [
      '부총장실',
      '기획처',
      '교무처',
      '사무처',
      '국제교류교육원',
      '중앙도서관',
      '생활관',
      '미래인재교육원',
      '체육지원실',
      '교육혁신처',
      '학생생활상담센터'
    ];
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

      // 조교 데이터 필터링
      const assistantRows = rawData.filter(row =>
        row['직렬'] === '조교' && (row['재직구분'] || '').trim() === '재직'
      );

      // 부서별로 그룹화
      const departmentMap = this.groupByDepartment(assistantRows);

      // 대학과 행정부서로 분류
      const { colleges, administrative } = this.classifyDepartments(departmentMap);

      // 요약 정보 계산
      const summary = {
        totalColleges: colleges.reduce((sum, college) =>
          sum + college.departments.reduce((dSum, dept) => dSum + dept.current, 0), 0),
        totalAdmin: administrative.reduce((sum, admin) =>
          sum + admin.departments.reduce((dSum, dept) => dSum + dept.current, 0), 0)
      };
      summary.grandTotal = summary.totalColleges + summary.totalAdmin;

      return {
        colleges,
        administrative,
        summary
      };

    } catch (error) {
      console.error('조교 데이터 파싱 오류:', error);
      throw new Error('조교 데이터 파싱 중 오류가 발생했습니다: ' + error.message);
    }
  }

  /**
   * 부서별로 조교 데이터 그룹화
   */
  groupByDepartment(rows) {
    const deptMap = new Map();

    rows.forEach(row => {
      const college = this.normalizeCollegeName(row['대학'] || '기타');
      const dept = (row['소속'] || '').trim();
      const name = (row['성명'] || '').trim();
      const appointmentType = (row['발령구분'] || '').trim();
      const startDate = this.formatDate(row['발령시작일']);

      if (!dept || !name) return;

      const key = `${college}|${dept}`;

      if (!deptMap.has(key)) {
        deptMap.set(key, {
          college,
          department: dept,
          assistants: []
        });
      }

      deptMap.get(key).assistants.push({
        name,
        isNew: appointmentType === '최초임용',
        startDate
      });
    });

    return deptMap;
  }

  /**
   * 대학명 정규화
   */
  normalizeCollegeName(collegeName) {
    const normalized = collegeName.trim();

    // 별칭 처리
    if (normalized.includes('보건복지') || normalized.includes('AI바이오')) {
      return 'AI바이오융합대학';
    }
    if (normalized.includes('AI융합') || normalized.includes('인문사회')) {
      return '인문사회융합대학';
    }

    return normalized;
  }

  /**
   * 단과대학과 행정부서로 분류
   */
  classifyDepartments(departmentMap) {
    const collegeMap = new Map();
    const adminMap = new Map();

    departmentMap.forEach((data, key) => {
      const { college, department, assistants } = data;

      // 행정부서 판별
      const isAdmin = this.adminOrder.some(admin => college.includes(admin) || department.includes(admin));
      const targetMap = isAdmin ? adminMap : collegeMap;
      const categoryName = isAdmin ? this.findAdminCategory(college, department) : college;

      if (!targetMap.has(categoryName)) {
        targetMap.set(categoryName, []);
      }

      // 부서 구조 파싱 (메인 부서와 겸임 부서)
      const deptStructure = this.parseDepartmentStructure(department);

      targetMap.get(categoryName).push({
        mainDept: deptStructure.mainDept,
        subDepts: deptStructure.subDepts,
        allocated: assistants.length,  // 현재는 재직인원과 동일
        current: assistants.length,
        assistants: assistants
      });
    });

    // 정렬 및 구조화
    const colleges = this.sortAndStructure(collegeMap, this.collegeOrder);
    const administrative = this.sortAndStructure(adminMap, this.adminOrder);

    return { colleges, administrative };
  }

  /**
   * 행정부서 카테고리 찾기
   */
  findAdminCategory(college, department) {
    for (const admin of this.adminOrder) {
      if (college.includes(admin) || department.includes(admin)) {
        return admin;
      }
    }
    return college;
  }

  /**
   * 부서명에서 메인 부서와 겸임 부서 분리
   */
  parseDepartmentStructure(department) {
    const parts = department.split('\n').map(p => p.trim()).filter(p => p);

    const mainDept = parts.find(p => !p.startsWith('(겸)')) || parts[0] || department;
    const subDepts = parts.filter(p => p.startsWith('(겸)'));

    return { mainDept, subDepts };
  }

  /**
   * 순서에 맞게 정렬 및 구조화
   */
  sortAndStructure(categoryMap, order) {
    const result = [];

    order.forEach(categoryName => {
      if (categoryMap.has(categoryName)) {
        result.push({
          categoryName,
          departments: categoryMap.get(categoryName)
        });
      }
    });

    // 순서에 없는 항목 추가 (기타)
    categoryMap.forEach((departments, categoryName) => {
      if (!order.includes(categoryName)) {
        result.push({ categoryName, departments });
      }
    });

    return result;
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
