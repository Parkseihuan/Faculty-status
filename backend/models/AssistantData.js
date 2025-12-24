const mongoose = require('mongoose');

/**
 * 조교 현황 데이터 스키마
 *
 * 조교 데이터 구조:
 * - 재직인원: Excel 파일에서 파싱된 실제 재직 중인 조교 수
 * - 배정인원: 관리자가 입력하는 배정 인원
 * - 잔여인원: 배정인원 - 재직인원 (자동 계산)
 * - 비고: 최초임용 조교 목록
 */
const assistantDataSchema = new mongoose.Schema({
  // 파싱된 조교 데이터 (전체 목록)
  assistants: {
    type: [{
      name: String,
      college: String,
      department: String,
      position: String,
      employmentStatus: String,
      appointmentType: String,
      startDate: String,
      endDate: String,
      isActive: Boolean,
      isFirstAppointment: Boolean
    }],
    required: true
  },

  // 대학별 배정 인원 (관리자 입력)
  allocations: {
    type: Map,
    of: Number,
    default: {}
  },

  // 대학별 재직 인원 (파싱된 데이터)
  actualCounts: {
    type: Map,
    of: Number,
    required: true
  },

  // 전체 요약 정보
  summary: {
    totalRecords: {
      type: Number,
      required: true
    },
    totalActive: {
      type: Number,
      required: true
    },
    totalFirstAppointments: {
      type: Number,
      required: true
    }
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
  collection: 'assistant_data'
});

// 인덱스 설정
assistantDataSchema.index({ updatedAt: -1 });

/**
 * 최신 데이터 조회
 */
assistantDataSchema.statics.getLatest = async function() {
  return await this.findOne().sort({ updatedAt: -1 });
};

/**
 * 데이터 업데이트 또는 생성 (항상 하나만 유지)
 */
assistantDataSchema.statics.updateData = async function(data) {
  // 기존 데이터 조회
  const existing = await this.findOne();

  if (existing) {
    // 기존 배정 인원 유지
    data.allocations = existing.allocations || {};
  } else {
    // 초기 배정 인원 설정 (재직 인원과 동일하게)
    data.allocations = {};
    if (data.actualCounts) {
      data.actualCounts.forEach((count, college) => {
        data.allocations.set(college, count);
      });
    }
  }

  // 기존 데이터 모두 삭제
  await this.deleteMany({});

  // 새 데이터 생성
  return await this.create(data);
};

/**
 * 배정 인원 업데이트
 */
assistantDataSchema.statics.updateAllocations = async function(allocations) {
  const latest = await this.getLatest();
  if (!latest) {
    throw new Error('조교 데이터가 없습니다. 먼저 Excel 파일을 업로드해주세요.');
  }

  latest.allocations = allocations;
  latest.updatedAt = new Date();
  await latest.save();
  return latest;
};

/**
 * 대학별 잔여 인원 계산
 */
assistantDataSchema.methods.getRemainingByCollege = function() {
  const remaining = {};

  // 모든 대학 목록 수집
  const allColleges = new Set();
  this.actualCounts.forEach((count, college) => allColleges.add(college));
  this.allocations.forEach((count, college) => allColleges.add(college));

  // 잔여 인원 계산
  allColleges.forEach(college => {
    const allocated = this.allocations.get(college) || 0;
    const actual = this.actualCounts.get(college) || 0;
    remaining[college] = allocated - actual;
  });

  return remaining;
};

const AssistantData = mongoose.model('AssistantData', assistantDataSchema);

module.exports = AssistantData;
