const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Organization = require('../models/Organization');

/**
 * 캐시 방지 미들웨어
 * 모든 조직 API 응답에 캐시 방지 헤더 적용
 */
const noCacheMiddleware = (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '-1',
    'Surrogate-Control': 'no-store'
  });
  // ETag 비활성화
  res.removeHeader('ETag');
  next();
};

/**
 * GET /api/organization
 * 조직 순서 조회
 * (인증 불필요 - 일반 사용자도 조회 가능)
 */
router.get('/', noCacheMiddleware, async (req, res) => {
  try {
    // MongoDB에서 최신 조직 구조 조회
    const orgDoc = await Organization.getLatest();

    // 데이터가 없으면 기본값 반환
    const deptStructure = orgDoc ? orgDoc.deptStructure : Organization.getDefault();

    res.json({
      success: true,
      data: deptStructure
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

    // MongoDB에 조직 데이터 저장 (기존 데이터 삭제 후 새로 생성)
    const updatedOrg = await Organization.updateStructure(deptStructure, req.user?.username || 'admin');

    res.json({
      success: true,
      message: '조직 순서가 성공적으로 업데이트되었습니다.',
      data: updatedOrg.deptStructure
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

module.exports = router;
