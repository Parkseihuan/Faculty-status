const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// 관리자 비밀번호 해시 생성 (최초 1회만 실행)
// bcrypt.hash('admin123', 10).then(hash => console.log('Admin password hash:', hash));

/**
 * POST /api/auth/login
 * 관리자 로그인
 */
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: '비밀번호를 입력해주세요.'
      });
    }

    // 환경변수에서 해시된 비밀번호 가져오기
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH ||
      // 기본값: 'admin123'의 해시
      '$2a$10$XqJ5ZqJ5ZqJ5ZqJ5ZqJ5ZuJ5ZqJ5ZqJ5ZqJ5ZqJ5ZqJ5ZqJ5ZqJ5Z';

    // 비밀번호 검증
    const isValid = await bcrypt.compare(password, adminPasswordHash);

    if (!isValid) {
      return res.status(401).json({
        error: '비밀번호가 올바르지 않습니다.'
      });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      {
        role: 'admin',
        timestamp: Date.now()
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '24h' // 24시간 유효
      }
    );

    res.json({
      success: true,
      token,
      expiresIn: 86400 // 24시간 (초)
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: '로그인 처리 중 오류가 발생했습니다.'
    });
  }
});

/**
 * POST /api/auth/verify
 * 토큰 검증
 */
router.post('/verify', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: '토큰이 필요합니다.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.json({
      valid: true,
      role: decoded.role,
      expiresAt: new Date(decoded.exp * 1000).toISOString()
    });

  } catch (error) {
    res.status(401).json({
      valid: false,
      error: '유효하지 않은 토큰입니다.'
    });
  }
});

module.exports = router;
