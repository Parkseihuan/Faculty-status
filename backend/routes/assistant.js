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

    // 잔여 인원 계산
    const remaining = data.getRemainingByCollege();

    // Map을 일반 객체로 변환
    const allocationsObj = {};
    const actualCountsObj = {};

    if (data.allocations) {
      data.allocations.forEach((value, key) => {
        allocationsObj[key] = value;
      });
    }

    if (data.actualCounts) {
      data.actualCounts.forEach((value, key) => {
        actualCountsObj[key] = value;
      });
    }

    // 대학별 데이터 정리
    const byCollege = {};
    data.assistants.forEach(assistant => {
      if (!byCollege[assistant.college]) {
        byCollege[assistant.college] = {
          college: assistant.college,
          allocated: allocationsObj[assistant.college] || 0,
          actual: actualCountsObj[assistant.college] || 0,
          remaining: remaining[assistant.college] || 0,
          assistants: [],
          firstAppointments: []
        };
      }

      byCollege[assistant.college].assistants.push(assistant);

      if (assistant.isFirstAppointment) {
        byCollege[assistant.college].firstAppointments.push(assistant.name);
      }
    });

    res.json({
      success: true,
      data: {
        byCollege: byCollege,
        summary: data.summary,
        uploadInfo: data.uploadInfo,
        updatedAt: data.updatedAt,
        allocations: allocationsObj,
        actualCounts: actualCountsObj
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

    // Map 객체로 변환
    const actualCounts = new Map();
    Object.entries(result.summary.byCollege).forEach(([college, count]) => {
      actualCounts.set(college, count);
    });

    // 데이터베이스에 저장
    const savedData = await AssistantData.updateData({
      assistants: result.assistants,
      actualCounts: actualCounts,
      summary: {
        totalRecords: result.summary.total,
        totalActive: result.summary.active,
        totalFirstAppointments: result.assistants.filter(a => a.isFirstAppointment).length
      },
      uploadInfo: {
        filename: req.file.originalname,
        uploadedAt: new Date(),
        fileSize: req.file.size,
        uploadedBy: req.body.uploadedBy || 'admin'
      }
    });

    console.log('조교 데이터 저장 완료');
    console.log('- 전체 레코드:', result.summary.total);
    console.log('- 재직 조교:', result.summary.active);
    console.log('- 중복 제거:', result.assistants.length);

    res.json({
      success: true,
      message: '조교 데이터가 성공적으로 업로드되었습니다.',
      data: {
        totalRecords: result.summary.total,
        totalActive: result.summary.active,
        uniqueActive: result.assistants.length,
        firstAppointments: result.assistants.filter(a => a.isFirstAppointment).length,
        byCollege: result.summary.byCollege
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
 * Body: { allocations: { "대학명": 배정인원, ... } }
 */
router.put('/allocations', async (req, res) => {
  try {
    const { allocations } = req.body;

    if (!allocations || typeof allocations !== 'object') {
      return res.status(400).json({
        error: '배정 인원 데이터가 올바르지 않습니다.'
      });
    }

    // Map 객체로 변환
    const allocationsMap = new Map();
    Object.entries(allocations).forEach(([college, count]) => {
      allocationsMap.set(college, Number(count));
    });

    const updatedData = await AssistantData.updateAllocations(allocationsMap);

    res.json({
      success: true,
      message: '배정 인원이 업데이트되었습니다.',
      data: {
        allocations: Object.fromEntries(updatedData.allocations),
        actualCounts: Object.fromEntries(updatedData.actualCounts)
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
