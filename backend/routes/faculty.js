const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

/**
 * GET /api/faculty/data
 * 교원 현황 데이터 조회
 * (인증 불필요 - 일반 사용자도 조회 가능)
 */
router.get('/data', async (req, res) => {
  try {
    const dataPath = path.join(__dirname, '../data/faculty-data.json');

    try {
      const data = await fs.readFile(dataPath, 'utf-8');
      const facultyData = JSON.parse(data);

      res.json({
        success: true,
        data: facultyData,
        lastUpdated: await getLastModifiedDate(dataPath)
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        // 파일이 없는 경우
        return res.status(404).json({
          success: false,
          error: '교원 데이터가 아직 업로드되지 않았습니다.',
          data: null
        });
      }
      throw error;
    }

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
    const dataPath = path.join(__dirname, '../data/faculty-data.json');

    try {
      const data = await fs.readFile(dataPath, 'utf-8');
      const facultyData = JSON.parse(data);

      // 통계 계산
      const stats = calculateStatistics(facultyData);

      res.json({
        success: true,
        stats,
        lastUpdated: await getLastModifiedDate(dataPath)
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          error: '교원 데이터가 아직 업로드되지 않았습니다.'
        });
      }
      throw error;
    }

  } catch (error) {
    console.error('Stats retrieval error:', error);
    res.status(500).json({
      success: false,
      error: '통계를 불러오는 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 파일의 마지막 수정 시간 가져오기
 */
async function getLastModifiedDate(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtime.toISOString();
  } catch (error) {
    return null;
  }
}

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
