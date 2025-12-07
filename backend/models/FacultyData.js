const mongoose = require('mongoose');

/**
 * 교원 현황 데이터 스키마
 * 엑셀 파일에서 파싱된 전체 데이터를 저장
 * 항상 최신 데이터 하나만 유지 (singleton pattern)
 */
const facultyDataSchema = new mongoose.Schema({
  // 파싱된 교원 데이터 (전체 구조)
  facultyData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // 부서 구조
  deptStructure: {
    type: Array,
    required: true
  },

  // 전임교원 직급 목록
  fullTimePositions: {
    type: [String],
    required: true
  },

  // 비전임교원 직급 목록
  partTimePositions: {
    type: [String],
    required: true
  },

  // 기타 직급 목록
  otherPositions: {
    type: [String],
    required: true
  },

  // 통계 정보
  stats: {
    total: Number,
    processed: Number
  },

  // 업로드 정보
  uploadInfo: {
    filename: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    fileSize: Number,
    uploadedBy: String
  },

  // 최종 업데이트 시간
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'faculty_data'
});

// 인덱스 설정
facultyDataSchema.index({ updatedAt: -1 });

/**
 * 최신 데이터 조회
 */
facultyDataSchema.statics.getLatest = async function() {
  return await this.findOne().sort({ updatedAt: -1 });
};

/**
 * 데이터 업데이트 또는 생성 (항상 하나만 유지)
 */
facultyDataSchema.statics.updateData = async function(data) {
  // 기존 데이터 모두 삭제
  await this.deleteMany({});

  // 새 데이터 생성
  return await this.create(data);
};

const FacultyData = mongoose.model('FacultyData', facultyDataSchema);

module.exports = FacultyData;
