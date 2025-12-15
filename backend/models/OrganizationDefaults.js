const mongoose = require('mongoose');

/**
 * 조직 순서 기본값 스키마
 * 각 교원 유형별 기본 조직 순서를 저장
 * 항상 최신 데이터 하나만 유지 (singleton pattern)
 */
const organizationDefaultsSchema = new mongoose.Schema({
  // 전임교원 기본값
  defaultFulltime: {
    type: [{
      name: {
        type: String,
        required: true
      },
      subDepts: {
        type: [String],
        default: []
      }
    }],
    required: true
  },

  // 비전임교원 기본값
  defaultParttime: {
    type: [{
      name: {
        type: String,
        required: true
      },
      subDepts: {
        type: [String],
        default: []
      }
    }],
    required: true
  },

  // 기타 기본값
  defaultOther: {
    type: [{
      name: {
        type: String,
        required: true
      },
      subDepts: {
        type: [String],
        default: []
      }
    }],
    required: true
  },

  // 최종 업데이트 시간
  updatedAt: {
    type: Date,
    default: Date.now
  },

  // 업데이트한 사용자
  updatedBy: {
    type: String,
    default: 'admin'
  }
}, {
  timestamps: true,
  collection: 'organization_defaults'
});

// 인덱스 설정
organizationDefaultsSchema.index({ updatedAt: -1 });

/**
 * 최신 기본값 조회
 */
organizationDefaultsSchema.statics.getLatest = async function() {
  return await this.findOne().sort({ updatedAt: -1 });
};

/**
 * 특정 타입의 기본값 업데이트
 */
organizationDefaultsSchema.statics.updateDefault = async function(type, deptStructure, updatedBy = 'admin') {
  const validTypes = ['fulltime', 'parttime', 'other'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }

  const fieldName = `default${type.charAt(0).toUpperCase() + type.slice(1)}`;

  // 기존 문서 조회
  let doc = await this.getLatest();

  if (!doc) {
    // 문서가 없으면 시스템 기본값으로 새로 생성
    const systemDefault = this.getSystemDefault();
    doc = await this.create({
      defaultFulltime: systemDefault,
      defaultParttime: systemDefault,
      defaultOther: systemDefault,
      updatedBy
    });
  }

  // 특정 필드만 업데이트
  doc[fieldName] = deptStructure;
  doc.updatedBy = updatedBy;
  doc.updatedAt = new Date();

  return await doc.save();
};

/**
 * 시스템 기본 조직 구조 반환
 */
organizationDefaultsSchema.statics.getSystemDefault = function() {
  return [
    {
      name: '대학원',
      subDepts: ['교육대학원', '일반대학원', '재활복지대학원', '태권도대학원', '문화예술대학원', '스포츠과학대학원']
    },
    {
      name: '무도대학',
      subDepts: ['유도학과', '유도경기지도학과', '무도학과', '태권도학과', '경호학과', '군사학과', '무도스포츠산업학과(계약학과)']
    },
    {
      name: '체육과학대학',
      subDepts: ['스포츠레저학과', '특수체육교육과', '체육학과', '골프학부']
    },
    {
      name: '문화예술대학',
      subDepts: ['무용과', '미디어디자인학과', '영화영상학과', '회화학과', '국악과', '연극학과', '문화유산학과', '문화콘텐츠학과', '실용음악과']
    },
    {
      name: '인문사회융합대학',
      subDepts: ['경영학과', '관광경영학과', '경영정보학과', '경찰행정학과', '영어과', '중국학과', '미용경영학과', '미용경영학과(야)', '사회복지학과']
    },
    {
      name: 'AI바이오융합대학',
      subDepts: ['AI융합학부', '환경학과', '보건환경안전학과', '바이오생명공학과', '식품조리학부', '물리치료학과']
    },
    { name: '용오름대학', subDepts: [] },
    { name: '산학협력단', subDepts: [] },
    { name: '평가성과분석센터', subDepts: [] },
    { name: '교육혁신원', subDepts: [] },
    { name: '박물관', subDepts: [] },
    { name: '체육지원실', subDepts: [] },
    { name: '교수학습지원센터', subDepts: [] },
    { name: '스포츠.웰니스연구센터', subDepts: [] },
    { name: '특수체육연구소', subDepts: [] },
    { name: '무도연구소', subDepts: [] },
    { name: '혁신사업추진단', subDepts: [] },
    { name: '학생생활상담센터', subDepts: [] },
    { name: '취창업지원센터', subDepts: [] },
    { name: '인권센터', subDepts: [] }
  ];
};

const OrganizationDefaults = mongoose.model('OrganizationDefaults', organizationDefaultsSchema);

module.exports = OrganizationDefaults;
