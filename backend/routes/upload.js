const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const authMiddleware = require('../middleware/auth');
const excelParser = require('../utils/excelParser');
const FacultyData = require('../models/FacultyData');

// Multer 설정 (파일 업로드)
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../data/uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `faculty_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: (process.env.MAX_FILE_SIZE || 10) * 1024 * 1024 // 기본 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedExts.includes(ext)) {
      return cb(new Error('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.'));
    }

    cb(null, true);
  }
});

/**
 * POST /api/upload
 * 엑셀 파일 업로드 및 파싱
 * (관리자 인증 필요)
 */
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: '파일이 업로드되지 않았습니다.'
      });
    }

    console.log('Uploaded file:', req.file.filename);

    // 엑셀 파일 파싱 (async)
    const parsedData = await excelParser.parseExcelFile(req.file.path);

    // 파싱된 데이터를 MongoDB에 저장
    const savedData = await FacultyData.updateData({
      ...parsedData,
      uploadInfo: {
        filename: req.file.originalname,
        uploadedAt: new Date(),
        fileSize: req.file.size,
        uploadedBy: req.user?.username || 'admin'
      }
    });

    console.log('✅ Faculty data saved to MongoDB:', savedData._id);

    // 업로드된 엑셀 파일 삭제 (보안)
    try {
      await fs.unlink(req.file.path);
    } catch (error) {
      console.error('Failed to delete uploaded file:', error);
    }

    res.json({
      success: true,
      message: '파일이 성공적으로 업로드되고 처리되었습니다.',
      stats: savedData.stats,
      uploadedAt: savedData.uploadInfo.uploadedAt
    });

  } catch (error) {
    console.error('Upload error:', error);

    // 에러 발생 시 업로드된 파일 삭제
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete file after error:', unlinkError);
      }
    }

    res.status(500).json({
      error: error.message || '파일 처리 중 오류가 발생했습니다.'
    });
  }
});

/**
 * POST /api/upload/research-leave
 * 연구년 및 휴직 교원 엑셀 파일 업로드
 * (관리자 인증 필요)
 */
const researchLeaveParser = require('../utils/researchLeaveParser');
const ResearchLeaveData = require('../models/ResearchLeaveData');

/**
 * POST /api/upload/appointment
 * 교원 발령사항 엑셀 파일 업로드
 * (관리자 인증 필요)
 */
const appointmentParser = require('../utils/appointmentParser');
const AppointmentData = require('../models/AppointmentData');

router.post('/research-leave', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: '파일이 업로드되지 않았습니다.'
      });
    }

    console.log('연구년/휴직 파일 업로드:', req.file.filename);

    // 엑셀 파일 파싱
    const parsedData = await researchLeaveParser.parseExcelFile(req.file.path);

    // MongoDB에 저장
    const savedData = await ResearchLeaveData.updateData({
      research: parsedData.research,
      leave: parsedData.leave,
      uploadInfo: {
        filename: req.file.originalname,
        uploadedAt: new Date(),
        fileSize: req.file.size,
        uploadedBy: req.user?.username || 'admin'
      }
    });

    console.log('✅ 연구년/휴직 데이터 저장 완료:', savedData._id);

    // 업로드된 파일 삭제
    try {
      await fs.unlink(req.file.path);
    } catch (error) {
      console.error('파일 삭제 실패:', error);
    }

    const totalCount =
      parsedData.research.first.length +
      parsedData.research.second.length +
      parsedData.leave.length;

    res.json({
      success: true,
      message: '연구년/휴직 교원 데이터가 성공적으로 업로드되었습니다.',
      stats: {
        researchFirst: parsedData.research.first.length,
        researchSecond: parsedData.research.second.length,
        leave: parsedData.leave.length,
        total: totalCount
      },
      uploadedAt: savedData.uploadInfo.uploadedAt
    });

  } catch (error) {
    console.error('연구년/휴직 업로드 오류:', error);

    // 에러 발생 시 파일 삭제
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('파일 삭제 실패:', unlinkError);
      }
    }

    res.status(500).json({
      error: error.message || '파일 처리 중 오류가 발생했습니다.'
    });
  }
});

/**
 * POST /api/upload/appointment
 * 교원 발령사항 엑셀 파일 업로드
 * (관리자 인증 필요)
 */
router.post('/appointment', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: '파일이 업로드되지 않았습니다.'
      });
    }

    console.log('발령사항 파일 업로드:', req.file.filename);

    // 엑셀 파일 파싱
    const parsedData = await appointmentParser.parseExcelFile(req.file.path);

    // 디버깅: 파싱된 데이터 확인
    console.log('\n🔍 === 파싱된 데이터 (MongoDB 저장 전) ===');
    console.log('parsedData 구조:', Object.keys(parsedData));
    console.log('parsedData.leave 타입:', typeof parsedData.leave, Array.isArray(parsedData.leave) ? '(배열)' : '');
    console.log('parsedData.leave 길이:', parsedData.leave?.length);
    console.log('parsedData.leave 내용:', JSON.stringify(parsedData.leave, null, 2));
    console.log('=========================================\n');

    // MongoDB에 저장
    const savedData = await AppointmentData.updateData({
      leave: parsedData.leave,
      uploadInfo: {
        filename: req.file.originalname,
        uploadedAt: new Date(),
        fileSize: req.file.size,
        uploadedBy: req.user?.username || 'admin'
      }
    });

    console.log('✅ 발령사항 데이터 저장 완료:', savedData._id);

    // 디버깅: 저장된 데이터 확인
    console.log('\n🔍 === MongoDB에 저장된 데이터 ===');
    console.log('savedData.leave 길이:', savedData.leave?.length);
    console.log('savedData.leave 내용:', JSON.stringify(savedData.leave, null, 2));
    console.log('====================================\n');

    // 업로드된 파일 삭제
    try {
      await fs.unlink(req.file.path);
    } catch (error) {
      console.error('파일 삭제 실패:', error);
    }

    res.json({
      success: true,
      message: '발령사항 데이터가 성공적으로 업로드되었습니다.',
      stats: {
        leave: parsedData.leave.length
      },
      uploadedAt: savedData.uploadInfo.uploadedAt
    });

  } catch (error) {
    console.error('발령사항 업로드 오류:', error);

    // 에러 발생 시 파일 삭제
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('파일 삭제 실패:', unlinkError);
      }
    }

    res.status(500).json({
      error: error.message || '파일 처리 중 오류가 발생했습니다.'
    });
  }
});

/**
 * GET /api/upload/history
 * 업로드 기록 조회
 * (관리자 인증 필요)
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    // MongoDB에서 최근 10개의 업로드 기록 조회
    const history = await FacultyData.find()
      .sort({ 'uploadInfo.uploadedAt': -1 })
      .limit(10)
      .select('uploadInfo stats')
      .lean();

    // 형식 변환
    const formattedHistory = history.map(item => ({
      filename: item.uploadInfo?.filename || 'Unknown',
      uploadedAt: item.uploadInfo?.uploadedAt || item.createdAt,
      stats: item.stats,
      fileSize: item.uploadInfo?.fileSize
    }));

    res.json({
      success: true,
      history: formattedHistory
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      error: '업로드 기록을 불러오는 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;
