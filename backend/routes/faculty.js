const express = require('express');
const router = express.Router();
const FacultyData = require('../models/FacultyData');
const Organization = require('../models/Organization');

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
    console.log('🔍 DEBUG - orgDoc:', orgDoc ? 'EXISTS' : 'NULL');
    if (orgDoc && orgDoc.deptStructure) {
      console.log('🔍 DEBUG - orgDoc.deptStructure first item:', orgDoc.deptStructure[0]?.name);
    }
    console.log('🔍 DEBUG - latestData.deptStructure first item:', latestData.deptStructure[0]?.name);

    const deptStructure = orgDoc && orgDoc.deptStructure ? orgDoc.deptStructure : latestData.deptStructure;
    console.log('🔍 DEBUG - Using deptStructure first item:', deptStructure[0]?.name);

    // 응답 데이터 구성
    const responseData = {
      facultyData: latestData.facultyData,
      deptStructure: deptStructure, // Organization 모델의 최신 조직 순서 사용
      fullTimePositions: latestData.fullTimePositions,
      partTimePositions: latestData.partTimePositions,
      otherPositions: latestData.otherPositions,
      researchLeaveData: latestData.researchLeaveData || { research: { first: [], second: [] }, leave: [] },
      genderStats: latestData.genderStats || []
    };

    res.json({
      success: true,
      data: responseData,
      lastUpdated: latestData.updatedAt,
      // 임시 디버그 정보 v2
      _apiVersion: '2.0-debug',
      debug: {
        orgDocExists: !!orgDoc,
        orgDocHasDeptStructure: !!(orgDoc && orgDoc.deptStructure),
        orgFirstItem: orgDoc && orgDoc.deptStructure ? orgDoc.deptStructure[0]?.name : 'N/A',
        facultyDataFirstItem: latestData.deptStructure[0]?.name,
        usedFirstItem: deptStructure[0]?.name,
        timestamp: new Date().toISOString()
      }
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
