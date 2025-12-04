const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const authMiddleware = require('../middleware/auth');

const ORG_FILE_PATH = path.join(__dirname, '../data/organization.json');

/**
 * GET /api/organization
 * 조직 순서 조회
 * (인증 불필요 - 일반 사용자도 조회 가능)
 */
router.get('/', async (req, res) => {
  try {
    const orgData = await getOrganizationData();

    res.json({
      success: true,
      data: orgData
    });
  } catch (error) {
    console.error('Organization retrieval error:', error);
    res.status(500).json({
      success: false,
      error: '조직 정보를 불러오는 중 오류가 발생했습니다.'
    });
  }
});

/**
 * PUT /api/organization
 * 조직 순서 설정
 * (관리자 인증 필요)
 */
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { deptStructure } = req.body;

    if (!deptStructure || !Array.isArray(deptStructure)) {
      return res.status(400).json({
        error: '유효한 조직 구조 데이터가 필요합니다.'
      });
    }

    // 데이터 검증
    const isValid = validateDeptStructure(deptStructure);
    if (!isValid) {
      return res.status(400).json({
        error: '조직 구조 데이터 형식이 올바르지 않습니다.'
      });
    }

    // 조직 데이터 저장
    await fs.writeFile(
      ORG_FILE_PATH,
      JSON.stringify({ deptStructure, updatedAt: new Date().toISOString() }, null, 2),
      'utf-8'
    );

    res.json({
      success: true,
      message: '조직 순서가 성공적으로 업데이트되었습니다.',
      data: deptStructure
    });

  } catch (error) {
    console.error('Organization update error:', error);
    res.status(500).json({
      error: '조직 정보를 업데이트하는 중 오류가 발생했습니다.'
    });
  }
});

/**
 * POST /api/organization/upload
 * 엑셀 파일로 조직 순서 업로드
 * (관리자 인증 필요)
 */
router.post('/upload', authMiddleware, async (req, res) => {
  try {
    // TODO: 엑셀 파일 파싱하여 조직 구조 추출
    // 현재는 JSON 형태로만 받도록 구현

    res.status(501).json({
      error: '엑셀 업로드 기능은 아직 구현되지 않았습니다. JSON 형태로 PUT /api/organization을 사용해주세요.'
    });

  } catch (error) {
    console.error('Organization upload error:', error);
    res.status(500).json({
      error: '조직 정보를 업로드하는 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 조직 데이터 가져오기
 */
async function getOrganizationData() {
  try {
    const data = await fs.readFile(ORG_FILE_PATH, 'utf-8');
    const orgData = JSON.parse(data);
    return orgData.deptStructure || getDefaultDeptStructure();
  } catch (error) {
    if (error.code === 'ENOENT') {
      // 파일이 없으면 기본값 반환
      return getDefaultDeptStructure();
    }
    throw error;
  }
}

/**
 * 조직 구조 검증
 */
function validateDeptStructure(deptStructure) {
  if (!Array.isArray(deptStructure)) return false;

  for (const dept of deptStructure) {
    if (!dept.name || typeof dept.name !== 'string') return false;
    if (!dept.subDepts || !Array.isArray(dept.subDepts)) return false;
  }

  return true;
}

/**
 * 기본 조직 구조
 */
function getDefaultDeptStructure() {
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

module.exports = router;
