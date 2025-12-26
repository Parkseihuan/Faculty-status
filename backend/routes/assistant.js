const express = require('express');
const router = express.Router();
const multer = require('multer');
const AssistantData = require('../models/AssistantData');
const AssistantParser = require('../utils/assistantParser');

// Multer 설정 (메모리 저장)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

/**
 * GET /api/assistant
 * 최신 조교 데이터 조회
 */
router.get('/', async (req, res) => {
  try {
    const data = await AssistantData.getLatest();

    if (!data) {
      return res.json({
        success: true,
        message: '조교 데이터가 없습니다.',
        data: null
      });
    }

    // Map을 일반 객체로 변환
    const allocationsObj = {};
    if (data.allocations) {
      data.allocations.forEach((value, key) => {
        allocationsObj[key] = value;
      });
    }

    // colleges와 administrative를 plain object로 변환
    const colleges = JSON.parse(JSON.stringify(data.colleges));
    const administrative = JSON.parse(JSON.stringify(data.administrative));

    // 배정 인원 반영
    colleges.forEach(college => {
      college.departments.forEach(dept => {
        const key = `${college.categoryName}|${dept.mainDept}`;
        if (allocationsObj[key] !== undefined) {
          dept.allocated = allocationsObj[key];
        }
      });
    });

    administrative.forEach(admin => {
      admin.departments.forEach(dept => {
        const key = `${admin.categoryName}|${dept.mainDept}`;
        if (allocationsObj[key] !== undefined) {
          dept.allocated = allocationsObj[key];
        }
      });
    });

    res.json({
      success: true,
      data: {
        colleges,
        administrative,
        summary: data.summary,
        uploadInfo: data.uploadInfo,
        updatedAt: data.updatedAt,
        allocations: allocationsObj
      }
    });

  } catch (error) {
    console.error('조교 데이터 조회 오류:', error);
    res.status(500).json({
      error: '조교 데이터 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

/**
 * POST /api/assistant/upload
 * 조교 데이터 업로드 (교원 발령사항 Excel 파일)
 *
 * 주의: 이 엔드포인트는 upload.js의 /api/upload/appointment에서 자동으로 처리됩니다.
 * 별도로 호출할 필요가 없습니다.
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: '파일이 업로드되지 않았습니다.'
      });
    }

    console.log('조교 데이터 파싱 시작:', req.file.originalname);

    // 파서로 데이터 추출
    const parser = new AssistantParser();
    const result = await parser.parseFromBuffer(req.file.buffer);

    // 데이터베이스에 저장
    const savedData = await AssistantData.updateData({
      colleges: result.colleges,
      administrative: result.administrative,
      summary: result.summary,
      uploadInfo: {
        filename: req.file.originalname,
        uploadedAt: new Date(),
        fileSize: req.file.size,
        uploadedBy: req.body.uploadedBy || 'admin'
      }
    });

    console.log('조교 데이터 저장 완료');
    console.log('- 단과대학(원):', result.summary.totalColleges);
    console.log('- 행정부서:', result.summary.totalAdmin);
    console.log('- 전체:', result.summary.grandTotal);

    res.json({
      success: true,
      message: '조교 데이터가 성공적으로 업로드되었습니다.',
      data: {
        totalColleges: result.summary.totalColleges,
        totalAdmin: result.summary.totalAdmin,
        grandTotal: result.summary.grandTotal
      }
    });

  } catch (error) {
    console.error('조교 데이터 업로드 오류:', error);
    res.status(500).json({
      error: '조교 데이터 업로드 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

/**
 * PUT /api/assistant/allocations
 * 배정 인원 업데이트
 *
 * Body: {
 *   allocations: {
 *     "카테고리명|부서명": 배정인원,
 *     "무도대학|교학과": 1,
 *     "기획처|대외협력과": 2,
 *     ...
 *   }
 * }
 */
router.put('/allocations', async (req, res) => {
  try {
    const { allocations } = req.body;

    if (!allocations || typeof allocations !== 'object') {
      return res.status(400).json({
        error: '배정 인원 데이터가 올바르지 않습니다.'
      });
    }

    const updatedData = await AssistantData.updateAllocations(allocations);

    // Map을 객체로 변환하여 응답
    const allocationsObj = {};
    if (updatedData.allocations) {
      updatedData.allocations.forEach((value, key) => {
        allocationsObj[key] = value;
      });
    }

    res.json({
      success: true,
      message: '배정 인원이 업데이트되었습니다.',
      data: {
        allocations: allocationsObj
      }
    });

  } catch (error) {
    console.error('배정 인원 업데이트 오류:', error);
    res.status(500).json({
      error: '배정 인원 업데이트 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

module.exports = router;
