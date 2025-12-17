const mongoose = require('mongoose');

/**
 * 교원 발령사항 데이터 스키마
 * 엑셀 파일에서 파싱된 발령사항 데이터를 저장
 * 항상 최신 데이터 하나만 유지 (singleton pattern)
 */
const appointmentDataSchema = new mongoose.Schema({
  // 휴직 교원 데이터
  leave: {
    type: [
      {
        dept: String,      // 소속 (학과 또는 대학)
        name: String,      // 성명
        period: String,    // 휴직 기간
        remarks: String    // 비고 (휴직 구분: 고용, 육아, 질병 등)
      }
    ],
    default: []
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
  collection: 'appointment_data'
});

// 인덱스 설정
appointmentDataSchema.index({ updatedAt: -1 });

/**
 * 최신 데이터 조회
 */
appointmentDataSchema.statics.getLatest = async function() {
  return await this.findOne().sort({ updatedAt: -1 });
};

/**
 * 데이터 업데이트 또는 생성 (항상 하나만 유지)
 */
appointmentDataSchema.statics.updateData = async function(data) {
  // 기존 데이터 모두 삭제
  await this.deleteMany({});

  // 새 데이터 생성
  return await this.create(data);
};

const AppointmentData = mongoose.model('AppointmentData', appointmentDataSchema);

module.exports = AppointmentData;
