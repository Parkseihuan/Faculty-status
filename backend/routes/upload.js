const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const authMiddleware = require('../middleware/auth');
const excelParser = require('../utils/excelParser');

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

    // 엑셀 파일 파싱
    const parsedData = excelParser.parseExcelFile(req.file.path);

    // 파싱된 데이터를 JSON 파일로 저장
    const dataPath = path.join(__dirname, '../data/faculty-data.json');
    await fs.writeFile(dataPath, JSON.stringify(parsedData, null, 2), 'utf-8');

    // 업로드 기록 저장
    const historyPath = path.join(__dirname, '../data/upload-history.json');
    let history = [];

    try {
      const historyContent = await fs.readFile(historyPath, 'utf-8');
      history = JSON.parse(historyContent);
    } catch (error) {
      // 파일이 없으면 새로 생성
    }

    history.unshift({
      filename: req.file.originalname,
      uploadedAt: new Date().toISOString(),
      stats: parsedData.stats,
      fileSize: req.file.size
    });

    // 최근 10개만 유지
    history = history.slice(0, 10);
    await fs.writeFile(historyPath, JSON.stringify(history, null, 2), 'utf-8');

    // 업로드된 엑셀 파일 삭제 (보안)
    try {
      await fs.unlink(req.file.path);
    } catch (error) {
      console.error('Failed to delete uploaded file:', error);
    }

    res.json({
      success: true,
      message: '파일이 성공적으로 업로드되고 처리되었습니다.',
      stats: parsedData.stats,
      uploadedAt: new Date().toISOString()
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
 * GET /api/upload/history
 * 업로드 기록 조회
 * (관리자 인증 필요)
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const historyPath = path.join(__dirname, '../data/upload-history.json');
    const historyContent = await fs.readFile(historyPath, 'utf-8');
    const history = JSON.parse(historyContent);

    res.json({
      success: true,
      history
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.json({
        success: true,
        history: []
      });
    }

    res.status(500).json({
      error: '업로드 기록을 불러오는 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;
