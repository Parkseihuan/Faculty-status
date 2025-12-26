const mongoose = require('mongoose');

/**
 * 조교 현황 데이터 스키마 (PDF 형식)
 *
 * 조교 데이터 구조:
 * - colleges: 단과대학(원) 목록
 * - administrative: 행정부서 목록
 * - allocations: 부서별 배정 인원 (관리자 입력)
 * - summary: 통계 정보
 */

// 조교 개인 정보
const assistantSchema = new mongoose.Schema({
  name: String,
  isNew: Boolean,        // 최초임용 여부
  startDate: String      // 발령시작일
}, { _id: false });

// 부서 정보
const departmentSchema = new mongoose.Schema({
  mainDept: String,                // 주 부서명
  subDepts: [String],              // 겸임 부서 목록 [(겸)...]
  allocated: Number,               // 배정인원
  current: Number,                 // 재직인원
  assistants: [assistantSchema]    // 조교 목록
}, { _id: false });

// 대분류 (대학 또는 행정부서)
const categorySchema = new mongoose.Schema({
  categoryName: String,            // 카테고리명 (예: 무도대학, 기획처)
  departments: [departmentSchema]  // 부서 목록
}, { _id: false });

const assistantDataSchema = new mongoose.Schema({
  // 단과대학(원) 목록
  colleges: {
    type: [categorySchema],
    required: true
  },

  // 행정부서 목록
  administrative: {
    type: [categorySchema],
    required: true
  },

  // 부서별 배정 인원 (관리자가 수동 입력)
  // Key: "categoryName|mainDept", Value: 배정인원
  allocations: {
    type: Map,
    of: Number,
    default: {}
  },

  // 전체 요약 정보
  summary: {
    totalColleges: {
      type: Number,
      required: true
    },
    totalAdmin: {
      type: Number,
      required: true
    },
    grandTotal: {
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

  if (existing && existing.allocations) {
    // 기존 배정 인원 유지하고 새 데이터에 적용
    data.allocations = existing.allocations;
  } else {
    // 초기 배정 인원 설정 (재직 인원과 동일하게)
    const allocationsMap = new Map();

    // colleges에서 배정인원 초기화
    if (data.colleges) {
      data.colleges.forEach(college => {
        college.departments.forEach(dept => {
          const key = `${college.categoryName}|${dept.mainDept}`;
          allocationsMap.set(key, dept.current);
        });
      });
    }

    // administrative에서 배정인원 초기화
    if (data.administrative) {
      data.administrative.forEach(admin => {
        admin.departments.forEach(dept => {
          const key = `${admin.categoryName}|${dept.mainDept}`;
          allocationsMap.set(key, dept.current);
        });
      });
    }

    data.allocations = allocationsMap;
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

  // Map 객체로 변환
  const allocationsMap = new Map();
  Object.entries(allocations).forEach(([key, value]) => {
    allocationsMap.set(key, Number(value));
  });

  latest.allocations = allocationsMap;

  // 각 부서의 allocated 값도 업데이트
  latest.colleges.forEach(college => {
    college.departments.forEach(dept => {
      const key = `${college.categoryName}|${dept.mainDept}`;
      if (allocationsMap.has(key)) {
        dept.allocated = allocationsMap.get(key);
      }
    });
  });

  latest.administrative.forEach(admin => {
    admin.departments.forEach(dept => {
      const key = `${admin.categoryName}|${dept.mainDept}`;
      if (allocationsMap.has(key)) {
        dept.allocated = allocationsMap.get(key);
      }
    });
  });

  latest.updatedAt = new Date();
  await latest.save();
  return latest;
};

const AssistantData = mongoose.model('AssistantData', assistantDataSchema);

module.exports = AssistantData;
