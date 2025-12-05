const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');
const authMiddleware = require('../middleware/auth');

// 설정 파일 경로
const AUTH_CONFIG_PATH = path.join(__dirname, '../data/auth-config.json');

// 비밀번호 힌트 생성 함수
function generatePasswordHint(password) {
  if (password.length <= 2) {
    return '*'.repeat(password.length);
  }
  const first = password[0];
  const last = password[password.length - 1];
  const middle = '*'.repeat(password.length - 2);
  return `${first}${middle}${last}`;
}

// 인증 설정 읽기
async function readAuthConfig() {
  try {
    const data = await fs.readFile(AUTH_CONFIG_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // 파일이 없으면 기본값 사용 (admin2025)
    return {
      passwordHash: '$2a$10$WkgMxD1gLhh.ZMVbZtSz.ueOSTKCKCgQTf.flyKdBNZrHpWwywttq',
      passwordHint: 'a*******5'
    };
  }
}

// 인증 설정 저장
async function saveAuthConfig(config) {
  await fs.writeFile(AUTH_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

/**
 * GET /api/auth/hint
 * 비밀번호 힌트 조회 (로그인 전에도 접근 가능)
 */
router.get('/hint', async (req, res) => {
  try {
    const config = await readAuthConfig();
    res.json({
      hint: config.passwordHint || 'a*******5'
    });
  } catch (error) {
    console.error('Get hint error:', error);
    res.status(500).json({
      error: '힌트 조회 중 오류가 발생했습니다.'
    });
  }
});

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

    // 설정 파일에서 해시된 비밀번호 가져오기
    const config = await readAuthConfig();
    const adminPasswordHash = config.passwordHash;

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

/**
 * POST /api/auth/change-password
 * 비밀번호 변경 (관리자만 가능)
 */
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.'
      });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({
        error: '새 비밀번호는 최소 4자 이상이어야 합니다.'
      });
    }

    // 현재 설정 읽기
    const config = await readAuthConfig();

    // 현재 비밀번호 검증
    const isValid = await bcrypt.compare(currentPassword, config.passwordHash);

    if (!isValid) {
      return res.status(401).json({
        error: '현재 비밀번호가 올바르지 않습니다.'
      });
    }

    // 새 비밀번호 해시 생성
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    const newHint = generatePasswordHint(newPassword);

    // 설정 업데이트
    config.passwordHash = newPasswordHash;
    config.passwordHint = newHint;

    await saveAuthConfig(config);

    res.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.',
      hint: newHint
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: '비밀번호 변경 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;
