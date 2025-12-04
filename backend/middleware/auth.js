const jwt = require('jsonwebtoken');

/**
 * JWT 토큰 검증 미들웨어
 */
const authMiddleware = (req, res, next) => {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: '인증 토큰이 필요합니다.'
      });
    }

    const token = authHeader.substring(7); // 'Bearer ' 제거

    // 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 관리자 권한 확인
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        error: '관리자 권한이 필요합니다.'
      });
    }

    // 요청 객체에 사용자 정보 추가
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: '토큰이 만료되었습니다. 다시 로그인해주세요.'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: '유효하지 않은 토큰입니다.'
      });
    }

    return res.status(500).json({
      error: '인증 처리 중 오류가 발생했습니다.'
    });
  }
};

module.exports = authMiddleware;
