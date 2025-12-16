const mongoose = require('mongoose');

/**
 * 연구년 및 휴직 교원 데이터 스키마
 * 별도의 엑셀 파일로 관리되는 개인정보 포함 데이터
 * 항상 최신 데이터 하나만 유지 (singleton pattern)
 */
const researchLeaveDataSchema = new mongoose.Schema({
  // 연구년 교원 데이터
  research: {
    first: [{
      dept: String,      // 소속
      name: String,      // 성명
      period: String,    // 기간
      remarks: String    // 비고 (이전 연구년 이력 등)
    }],
    second: [{
      dept: String,
      name: String,
      period: String,
      remarks: String
    }]
  },

  // 휴직 교원 데이터
  leave: [{
    dept: String,
    name: String,
    period: String,
    remarks: String
  }],

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
  collection: 'research_leave_data'
});

// 인덱스 설정
researchLeaveDataSchema.index({ updatedAt: -1 });

/**
 * 최신 데이터 조회
 */
researchLeaveDataSchema.statics.getLatest = async function() {
  return await this.findOne().sort({ updatedAt: -1 });
};

/**
 * 데이터 업데이트 또는 생성 (항상 하나만 유지)
 */
researchLeaveDataSchema.statics.updateData = async function(data) {
  // 기존 데이터 모두 삭제
  await this.deleteMany({});

  // 새 데이터 생성
  return await this.create(data);
};

const ResearchLeaveData = mongoose.model('ResearchLeaveData', researchLeaveDataSchema);

module.exports = ResearchLeaveData;
