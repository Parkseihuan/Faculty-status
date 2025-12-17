const express = require('express');
const router = express.Router();
const FacultyData = require('../models/FacultyData');
const Organization = require('../models/Organization');
const ResearchLeaveData = require('../models/ResearchLeaveData');

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

    // 휴직 데이터 추출 (교원현황 데이터에서)
    const leaveData = {
      leave: [],
      uploadedAt: latestData.uploadInfo?.uploadedAt || latestData.updatedAt
    };

    if (latestData.facultyData && Array.isArray(latestData.facultyData)) {
      // 전임교원, 비전임교원, 기타 모두에서 휴직 교원 찾기
      const allFaculty = [
        ...(latestData.facultyData.filter(f => f.facultyType === 'fulltime') || []),
        ...(latestData.facultyData.filter(f => f.facultyType === 'parttime') || []),
        ...(latestData.facultyData.filter(f => f.facultyType === 'other') || [])
      ];

      allFaculty.forEach(faculty => {
        const status = String(faculty.employmentStatus || faculty.status || '').toLowerCase();

        // 휴직 교원 찾기
        if (status.includes('휴직')) {
          leaveData.leave.push({
            dept: faculty.subDept || faculty.dept || '미배정',
            name: faculty.name,
            period: faculty.period || '', // 휴직 기간이 있다면
            remarks: faculty.remarks || ''
          });
        }
      });
    }

    // 연구년 데이터에서 추출된 휴직 데이터와 병합
    if (researchLeaveDoc && researchLeaveDoc.leave && researchLeaveDoc.leave.length > 0) {
      // 연구년 파일에서 가져온 휴직 데이터 추가
      leaveData.leave.push(...researchLeaveDoc.leave);
      // 연구년 파일 날짜로 업데이트 (더 최신)
      if (researchLeaveDoc.uploadInfo?.uploadedAt) {
        leaveData.uploadedAt = researchLeaveDoc.uploadInfo.uploadedAt;
      }
    }

    console.log(`📊 휴직 교원: ${leaveData.leave.length}명 (교원현황 데이터 기준: ${leaveData.uploadedAt})`);

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
