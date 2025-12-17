const express = require('express');
const router = express.Router();
const FacultyData = require('../models/FacultyData');
const Organization = require('../models/Organization');
const ResearchLeaveData = require('../models/ResearchLeaveData');
const AppointmentData = require('../models/AppointmentData');

/**
 * GET /api/faculty/data
 * 교원 현황 데이터 조회
 * (인증 불필요 - 일반 사용자도 조회 가능)
 */
router.get('/data', async (req, res) => {
  try {
    // MongoDB에서 최신 데이터 조회
    const latestData = await FacultyData.getLatest();

    if (!latestData) {
      return res.status(404).json({
        success: false,
        error: '교원 데이터가 아직 업로드되지 않았습니다.',
        data: null
      });
    }

    // Organization 모델에서 최신 조직 순서 조회
    const orgDoc = await Organization.getLatest();
    const deptStructure = orgDoc && orgDoc.deptStructure ? orgDoc.deptStructure : latestData.deptStructure;

    // 연구년 데이터 조회 (별도 모델에서)
    const researchLeaveDoc = await ResearchLeaveData.getLatest();
    const researchData = researchLeaveDoc
      ? {
          first: researchLeaveDoc.research?.first || [],
          second: researchLeaveDoc.research?.second || [],
          uploadedAt: researchLeaveDoc.uploadInfo?.uploadedAt || researchLeaveDoc.createdAt
        }
      : { first: [], second: [], uploadedAt: null };

    // 휴직 데이터 병합 (3개 소스: 교원현황, 연구년, 발령사항)
    // 발령사항 데이터를 우선적으로 사용 (가장 상세한 정보)
    const leaveDataMap = new Map(); // 이름을 key로 사용하여 중복 제거

    let leaveUploadedAt = latestData.uploadInfo?.uploadedAt || latestData.updatedAt;

    // 1. 교원현황 파일의 휴직 데이터 (excelParser가 파싱 시 추출)
    if (latestData.researchLeaveData && latestData.researchLeaveData.leave) {
      latestData.researchLeaveData.leave.forEach(item => {
        leaveDataMap.set(item.name, {
          ...item,
          source: 'faculty'
        });
      });
      console.log(`📋 교원현황에서 ${latestData.researchLeaveData.leave.length}명 휴직 교원 추출`);
    }

    // 2. 연구년 파일의 휴직 데이터
    if (researchLeaveDoc && researchLeaveDoc.leave && researchLeaveDoc.leave.length > 0) {
      researchLeaveDoc.leave.forEach(item => {
        // 이미 있으면 건너뛰기
        if (!leaveDataMap.has(item.name)) {
          leaveDataMap.set(item.name, {
            ...item,
            source: 'research'
          });
        }
      });
      console.log(`📋 연구년 파일에서 ${researchLeaveDoc.leave.length}명 휴직 교원 추출`);

      // 더 최신 날짜 사용
      if (researchLeaveDoc.uploadInfo?.uploadedAt && researchLeaveDoc.uploadInfo.uploadedAt > leaveUploadedAt) {
        leaveUploadedAt = researchLeaveDoc.uploadInfo.uploadedAt;
      }
    }

    // 3. 발령사항 파일의 휴직 데이터 (우선순위 최고)
    const appointmentDoc = await AppointmentData.getLatest();
    if (appointmentDoc && appointmentDoc.leave && appointmentDoc.leave.length > 0) {
      appointmentDoc.leave.forEach(item => {
        // 발령사항 데이터는 무조건 덮어쓰기 (가장 상세한 정보)
        leaveDataMap.set(item.name, {
          ...item,
          source: 'appointment'
        });
      });
      console.log(`📋 발령사항에서 ${appointmentDoc.leave.length}명 휴직 교원 추출`);

      // 더 최신 날짜 사용
      if (appointmentDoc.uploadInfo?.uploadedAt && appointmentDoc.uploadInfo.uploadedAt > leaveUploadedAt) {
        leaveUploadedAt = appointmentDoc.uploadInfo.uploadedAt;
      }
    }

    const leaveData = {
      leave: Array.from(leaveDataMap.values()).map(item => ({
        dept: item.dept || '미배정',
        name: item.name || '',
        period: item.period || '',
        remarks: item.remarks || ''  // undefined 방지
      })),
      uploadedAt: leaveUploadedAt
    };

    console.log(`📊 총 휴직 교원: ${leaveData.leave.length}명 (기준일: ${leaveUploadedAt})`);

    // 응답 데이터 구성
    const responseData = {
      facultyData: latestData.facultyData,
      deptStructure: deptStructure, // Organization 모델의 최신 조직 순서 사용
      fullTimePositions: latestData.fullTimePositions,
      partTimePositions: latestData.partTimePositions,
      otherPositions: latestData.otherPositions,
      researchLeaveData: {
        research: {
          first: researchData.first,
          second: researchData.second
        },
        leave: leaveData.leave,
        dates: {
          research: researchData.uploadedAt,
          leave: leaveData.uploadedAt
        }
      },
      genderStats: latestData.genderStats || []
    };

    res.json({
      success: true,
      data: responseData,
      lastUpdated: latestData.updatedAt
    });

  } catch (error) {
    console.error('Faculty data retrieval error:', error);
    res.status(500).json({
      success: false,
      error: '데이터를 불러오는 중 오류가 발생했습니다.'
    });
  }
});

/**
 * GET /api/faculty/stats
 * 교원 현황 통계 조회
 */
router.get('/stats', async (req, res) => {
  try {
    // MongoDB에서 최신 데이터 조회
    const latestData = await FacultyData.getLatest();

    if (!latestData) {
      return res.status(404).json({
        success: false,
        error: '교원 데이터가 아직 업로드되지 않았습니다.'
      });
    }

    // 통계 계산
    const stats = calculateStatistics({
      facultyData: latestData.facultyData,
      fullTimePositions: latestData.fullTimePositions,
      partTimePositions: latestData.partTimePositions,
      otherPositions: latestData.otherPositions
    });

    res.json({
      success: true,
      stats,
      lastUpdated: latestData.updatedAt
    });

  } catch (error) {
    console.error('Stats retrieval error:', error);
    res.status(500).json({
      success: false,
      error: '통계를 불러오는 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 통계 계산
 */
function calculateStatistics(data) {
  const { facultyData, fullTimePositions, partTimePositions, otherPositions } = data;

  const stats = {
    fullTime: 0,
    partTime: 0,
    other: 0,
    total: 0,
    byPosition: {},
    byDepartment: {}
  };

  // 부서별, 직급별 통계 계산
  Object.keys(facultyData).forEach(deptName => {
    const dept = facultyData[deptName];

    if (typeof dept === 'object') {
      // 부서 통계 초기화
      if (!stats.byDepartment[deptName]) {
        stats.byDepartment[deptName] = {
          fullTime: 0,
          partTime: 0,
          other: 0,
          total: 0
        };
      }

      Object.keys(dept).forEach(key => {
        const value = dept[key];

        // 하위 부서가 있는 경우
        if (typeof value === 'object' && !Array.isArray(value)) {
          Object.keys(value).forEach(position => {
            const employees = value[position];
            if (Array.isArray(employees)) {
              const count = employees.length;

              // 직급별 통계
              stats.byPosition[position] = (stats.byPosition[position] || 0) + count;

              // 부서별 통계
              if (fullTimePositions.includes(position)) {
                stats.fullTime += count;
                stats.byDepartment[deptName].fullTime += count;
              } else if (partTimePositions.includes(position)) {
                stats.partTime += count;
                stats.byDepartment[deptName].partTime += count;
              } else if (otherPositions.includes(position)) {
                stats.other += count;
                stats.byDepartment[deptName].other += count;
              }

              stats.total += count;
              stats.byDepartment[deptName].total += count;
            }
          });
        }
        // 직급 배열인 경우
        else if (Array.isArray(value)) {
          const count = value.length;
          const position = key;

          // 직급별 통계
          stats.byPosition[position] = (stats.byPosition[position] || 0) + count;

          // 부서별 통계
          if (fullTimePositions.includes(position)) {
            stats.fullTime += count;
            stats.byDepartment[deptName].fullTime += count;
          } else if (partTimePositions.includes(position)) {
            stats.partTime += count;
            stats.byDepartment[deptName].partTime += count;
          } else if (otherPositions.includes(position)) {
            stats.other += count;
            stats.byDepartment[deptName].other += count;
          }

          stats.total += count;
          stats.byDepartment[deptName].total += count;
        }
      });
    }
  });

  return stats;
}

module.exports = router;
