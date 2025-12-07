const mongoose = require('mongoose');

/**
 * MongoDB 연결 함수
 */
async function connectDB() {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(mongoURI, {
      // Mongoose 6+ 에서는 대부분의 옵션이 기본값으로 설정됨
      serverSelectionTimeoutMS: 5000, // 서버 선택 타임아웃
    });

    console.log('✅ MongoDB connected successfully');

    // 연결 이벤트 리스너
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });

    // 프로세스 종료 시 연결 종료
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    // 개발 환경에서는 에러를 throw, 프로덕션에서는 로그만 남김
    if (process.env.NODE_ENV !== 'production') {
      throw error;
    }
  }
}

module.exports = connectDB;
