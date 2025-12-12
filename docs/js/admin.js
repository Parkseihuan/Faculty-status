/**
 * 관리자 페이지 메인 스크립트
 */

// DOM 요소
const loginModal = document.getElementById('loginModal');
const mainContent = document.getElementById('mainContent');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

// 탭
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

// 업로드 탭
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const uploadBtn = document.getElementById('uploadBtn');
const cancelBtn = document.getElementById('cancelBtn');
const uploadProgress = document.getElementById('uploadProgress');
const uploadResult = document.getElementById('uploadResult');

// 조직 탭
const loadOrgBtn = document.getElementById('loadOrgBtn');
const saveOrgBtn = document.getElementById('saveOrgBtn');
const resetOrgBtn = document.getElementById('resetOrgBtn');
const orgResult = document.getElementById('orgResult');

// 조직 탭 버튼들
const orgTabBtns = document.querySelectorAll('.org-tab-btn');
const orgEditorSections = document.querySelectorAll('.org-editor-section');

// 업로드 기록 탭
const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
const historyList = document.getElementById('historyList');

let selectedFile = null;
let currentOrgData = {
  fulltime: null,
  parttime: null,
  other: null
};
let activeOrgTab = 'fulltime';

/**
 * 초기화
 */
async function init() {
  // 토큰 확인
  const token = api.getToken();
  if (token) {
    try {
      const result = await api.verifyToken(token);
      if (result.valid) {
        showMainContent();
        return;
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      // 유효하지 않은 토큰 제거
      api.logout();
    }
  }

  showLoginModal();
}

/**
 * 로그인 모달 표시
 */
async function showLoginModal() {
  loginModal.classList.remove('hidden');
  mainContent.classList.add('hidden');

  // 비밀번호 힌트 로드
  try {
    const result = await api.getPasswordHint();
    const hintElement = document.getElementById('passwordHint');
    if (hintElement) {
      hintElement.textContent = `힌트: ${result.hint}`;
    }
  } catch (error) {
    console.error('Failed to load password hint:', error);
    const hintElement = document.getElementById('passwordHint');
    if (hintElement) {
      hintElement.textContent = '힌트를 불러올 수 없습니다.';
    }
  }
}

/**
 * 메인 컨텐츠 표시
 */
function showMainContent() {
  loginModal.classList.add('hidden');
  mainContent.classList.remove('hidden');
  loadUploadHistory();
}

/**
 * 로그인 처리
 */
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('password').value;
  loginError.textContent = '';

  try {
    const result = await api.login(password);
    if (result.success) {
      showMainContent();
    }
  } catch (error) {
    loginError.textContent = error.message || '로그인에 실패했습니다.';
  }
});

/**
 * 로그아웃
 */
logoutBtn.addEventListener('click', () => {
  if (confirm('로그아웃 하시겠습니까?')) {
    api.logout();
    showLoginModal();
    document.getElementById('password').value = '';
  }
});

/**
 * 탭 전환
 */
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;

    // 활성 탭 변경
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // 탭 컨텐츠 변경
    tabPanes.forEach(pane => pane.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // 탭별 초기화
    if (tabName === 'history') {
      loadUploadHistory();
    }
  });
});

// ===== 엑셀 업로드 =====

/**
 * 드래그 앤 드롭
 */
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFileSelect(files[0]);
  }
});

/**
 * 파일 선택
 */
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleFileSelect(e.target.files[0]);
  }
});

/**
 * 파일 선택 처리
 */
function handleFileSelect(file) {
  // 파일 확장자 확인
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['xlsx', 'xls'].includes(ext)) {
    alert('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
    return;
  }

  selectedFile = file;
  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);

  uploadArea.classList.add('hidden');
  fileInfo.classList.remove('hidden');
  uploadResult.classList.add('hidden');
}

/**
 * 파일 크기 포맷
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 업로드 취소
 */
cancelBtn.addEventListener('click', () => {
  selectedFile = null;
  fileInput.value = '';
  uploadArea.classList.remove('hidden');
  fileInfo.classList.add('hidden');
  uploadResult.classList.add('hidden');
});

/**
 * 파일 업로드
 */
uploadBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  try {
    uploadProgress.classList.remove('hidden');
    uploadResult.classList.add('hidden');
    uploadBtn.disabled = true;
    cancelBtn.disabled = true;

    const result = await api.uploadExcel(selectedFile);

    uploadProgress.classList.add('hidden');
    uploadResult.classList.remove('hidden');
    uploadResult.className = 'result success';
    uploadResult.innerHTML = `
      <h3>✅ 업로드 성공!</h3>
      <p>${result.message}</p>
      <p><strong>처리된 인원:</strong> ${result.stats.processed}명 / ${result.stats.total}명</p>
      <p><strong>업로드 시간:</strong> ${new Date(result.uploadedAt).toLocaleString('ko-KR')}</p>
    `;

    // 초기화
    selectedFile = null;
    fileInput.value = '';
    uploadArea.classList.remove('hidden');
    fileInfo.classList.add('hidden');

    // 업로드 기록 새로고침
    loadUploadHistory();

  } catch (error) {
    uploadProgress.classList.add('hidden');
    uploadResult.classList.remove('hidden');
    uploadResult.className = 'result error';
    uploadResult.innerHTML = `
      <h3>❌ 업로드 실패</h3>
      <p>${error.message}</p>
    `;
  } finally {
    uploadBtn.disabled = false;
    cancelBtn.disabled = false;
  }
});

// ===== 조직 순서 설정 =====

/**
 * 조직 탭 전환
 */
orgTabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const orgTab = btn.dataset.orgTab;

    // 활성 탭 변경
    orgTabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // 섹션 변경
    orgEditorSections.forEach(section => section.classList.remove('active'));
    document.getElementById(`${orgTab}-org`).classList.add('active');

    activeOrgTab = orgTab;
  });
});

/**
 * 조직 데이터 불러오기
 */
loadOrgBtn.addEventListener('click', async () => {
  try {
    const result = await api.getOrganization();
    const orgData = result.data;

    // 3개 탭 모두에 동일한 데이터로 초기화
    currentOrgData.fulltime = JSON.parse(JSON.stringify(orgData));
    currentOrgData.parttime = JSON.parse(JSON.stringify(orgData));
    currentOrgData.other = JSON.parse(JSON.stringify(orgData));

    // 모든 섹션 렌더링
    renderOrgEditor('fulltime', currentOrgData.fulltime);
    renderOrgEditor('parttime', currentOrgData.parttime);
    renderOrgEditor('other', currentOrgData.other);

    // 조직 탭 표시
    document.getElementById('orgTabs').classList.remove('hidden');

    saveOrgBtn.disabled = false;
    orgResult.classList.add('hidden');
  } catch (error) {
    showOrgError('조직 데이터를 불러오는데 실패했습니다: ' + error.message);
  }
});

/**
 * 조직 에디터 렌더링
 */
function renderOrgEditor(section, orgData) {
  const container = document.getElementById(`${section}-org`);
  if (!container) return;

  // 기존 org-editor가 있으면 제거
  const existingEditor = container.querySelector('.org-editor');
  if (existingEditor) {
    existingEditor.remove();
  }

  // 새 에디터 생성
  const orgEditor = document.createElement('div');
  orgEditor.className = 'org-editor';
  orgEditor.dataset.section = section;

  orgData.forEach((dept, index) => {
    const deptEl = document.createElement('div');
    deptEl.className = 'org-item';
    deptEl.dataset.index = index;

    deptEl.innerHTML = `
      <div class="org-item-header">
        <input type="text" value="${dept.name}" class="dept-name-input" data-index="${index}" data-section="${section}">
        <div class="org-item-controls">
          <button class="btn btn-sm btn-secondary move-up" data-index="${index}" data-section="${section}">▲</button>
          <button class="btn btn-sm btn-secondary move-down" data-index="${index}" data-section="${section}">▼</button>
          <button class="btn btn-sm btn-danger delete-dept" data-index="${index}" data-section="${section}">삭제</button>
        </div>
      </div>
      <div class="sub-depts">
        <strong>하위 학과:</strong>
        <div class="sub-dept-list" data-dept-index="${index}">
          ${dept.subDepts.map((subDept, subIndex) => `
            <div class="sub-dept-item">
              <input type="text" value="${subDept}" data-dept-index="${index}" data-sub-index="${subIndex}" data-section="${section}">
              <button class="btn btn-sm btn-danger delete-sub-dept" data-dept-index="${index}" data-sub-index="${subIndex}" data-section="${section}">삭제</button>
            </div>
          `).join('')}
          <button class="btn btn-sm btn-success add-sub-dept" data-dept-index="${index}" data-section="${section}">+ 학과 추가</button>
        </div>
      </div>
    `;

    orgEditor.appendChild(deptEl);
  });

  // 대학 추가 버튼
  const addDeptBtn = document.createElement('button');
  addDeptBtn.className = 'btn btn-success';
  addDeptBtn.textContent = '+ 대학 추가';
  addDeptBtn.dataset.section = section;
  addDeptBtn.onclick = () => addDepartment(section);
  orgEditor.appendChild(addDeptBtn);

  container.appendChild(orgEditor);

  // 이벤트 리스너 등록
  attachOrgEditorEvents(section);
}

/**
 * 조직 에디터 이벤트 리스너
 */
function attachOrgEditorEvents(section) {
  const container = document.getElementById(`${section}-org`);
  if (!container) return;

  const sectionData = currentOrgData[section];

  // 대학명 변경
  container.querySelectorAll('.dept-name-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index);
      const sec = e.target.dataset.section;
      currentOrgData[sec][index].name = e.target.value;
    });
  });

  // 대학 위로 이동
  container.querySelectorAll('.move-up').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      const sec = e.target.dataset.section;
      if (index > 0) {
        [currentOrgData[sec][index], currentOrgData[sec][index - 1]] =
          [currentOrgData[sec][index - 1], currentOrgData[sec][index]];
        renderOrgEditor(sec, currentOrgData[sec]);
      }
    });
  });

  // 대학 아래로 이동
  container.querySelectorAll('.move-down').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      const sec = e.target.dataset.section;
      if (index < currentOrgData[sec].length - 1) {
        [currentOrgData[sec][index], currentOrgData[sec][index + 1]] =
          [currentOrgData[sec][index + 1], currentOrgData[sec][index]];
        renderOrgEditor(sec, currentOrgData[sec]);
      }
    });
  });

  // 대학 삭제
  container.querySelectorAll('.delete-dept').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      const sec = e.target.dataset.section;
      if (confirm(`'${currentOrgData[sec][index].name}'을(를) 삭제하시겠습니까?`)) {
        currentOrgData[sec].splice(index, 1);
        renderOrgEditor(sec, currentOrgData[sec]);
      }
    });
  });

  // 학과명 변경
  container.querySelectorAll('.sub-dept-item input').forEach(input => {
    input.addEventListener('change', (e) => {
      const deptIndex = parseInt(e.target.dataset.deptIndex);
      const subIndex = parseInt(e.target.dataset.subIndex);
      const sec = e.target.dataset.section;
      currentOrgData[sec][deptIndex].subDepts[subIndex] = e.target.value;
    });
  });

  // 학과 삭제
  container.querySelectorAll('.delete-sub-dept').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const deptIndex = parseInt(e.target.dataset.deptIndex);
      const subIndex = parseInt(e.target.dataset.subIndex);
      const sec = e.target.dataset.section;
      currentOrgData[sec][deptIndex].subDepts.splice(subIndex, 1);
      renderOrgEditor(sec, currentOrgData[sec]);
    });
  });

  // 학과 추가
  container.querySelectorAll('.add-sub-dept').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const deptIndex = parseInt(e.target.dataset.deptIndex);
      const sec = e.target.dataset.section;
      const newSubDeptName = prompt('학과명을 입력하세요:');
      if (newSubDeptName && newSubDeptName.trim()) {
        currentOrgData[sec][deptIndex].subDepts.push(newSubDeptName.trim());
        renderOrgEditor(sec, currentOrgData[sec]);
      }
    });
  });
}

/**
 * 대학 추가
 */
function addDepartment(section) {
  const newDeptName = prompt('대학명을 입력하세요:');
  if (newDeptName && newDeptName.trim()) {
    currentOrgData[section].push({
      name: newDeptName.trim(),
      subDepts: []
    });
    renderOrgEditor(section, currentOrgData[section]);
  }
}

/**
 * 조직 데이터 저장
 */
saveOrgBtn.addEventListener('click', async () => {
  if (!currentOrgData.fulltime && !currentOrgData.parttime && !currentOrgData.other) return;

  try {
    // 현재 활성 탭의 데이터만 저장
    // 향후 백엔드에서 3개 섹션을 모두 지원할 때까지는 활성 탭만 저장
    const dataToSave = currentOrgData[activeOrgTab];

    if (confirm(`현재 선택된 '${getOrgTabName(activeOrgTab)}' 탭의 조직 구조를 저장하시겠습니까?\n\n참고: 현재는 하나의 조직 구조만 저장됩니다. 나중에 각 교원 유형별 구조를 모두 저장할 수 있도록 업데이트될 예정입니다.`)) {
      const result = await api.updateOrganization(dataToSave);
      orgResult.classList.remove('hidden');
      orgResult.className = 'result success';
      orgResult.innerHTML = `
        <h3>✅ 저장 성공!</h3>
        <p>${result.message}</p>
        <p><small>저장된 섹션: ${getOrgTabName(activeOrgTab)}</small></p>
      `;
    }
  } catch (error) {
    showOrgError('저장에 실패했습니다: ' + error.message);
  }
});

/**
 * 조직 탭 이름 가져오기
 */
function getOrgTabName(tabKey) {
  const names = {
    fulltime: '전임교원',
    parttime: '비전임교원',
    other: '기타'
  };
  return names[tabKey] || tabKey;
}

/**
 * 기본값으로 초기화
 */
resetOrgBtn.addEventListener('click', () => {
  if (confirm('모든 조직 구조를 기본값으로 초기화하시겠습니까?')) {
    // 기본 조직 구조로 모든 섹션 초기화
    const defaultOrg = getDefaultOrgStructure();
    currentOrgData.fulltime = JSON.parse(JSON.stringify(defaultOrg));
    currentOrgData.parttime = JSON.parse(JSON.stringify(defaultOrg));
    currentOrgData.other = JSON.parse(JSON.stringify(defaultOrg));

    // 모든 섹션 다시 렌더링
    renderOrgEditor('fulltime', currentOrgData.fulltime);
    renderOrgEditor('parttime', currentOrgData.parttime);
    renderOrgEditor('other', currentOrgData.other);

    saveOrgBtn.disabled = false;

    orgResult.classList.remove('hidden');
    orgResult.className = 'result success';
    orgResult.innerHTML = `
      <h3>✅ 초기화 완료</h3>
      <p>모든 섹션이 기본값으로 초기화되었습니다.</p>
    `;
  }
});

/**
 * 조직 에러 표시
 */
function showOrgError(message) {
  orgResult.classList.remove('hidden');
  orgResult.className = 'result error';
  orgResult.innerHTML = `
    <h3>❌ 오류</h3>
    <p>${message}</p>
  `;
}

/**
 * 기본 조직 구조
 */
function getDefaultOrgStructure() {
  return [
    { name: '대학원', subDepts: ['교육대학원', '일반대학원', '재활복지대학원', '태권도대학원', '문화예술대학원', '스포츠과학대학원'] },
    { name: '무도대학', subDepts: ['유도학과', '유도경기지도학과', '무도학과', '태권도학과', '경호학과', '군사학과', '무도스포츠산업학과(계약학과)'] },
    { name: '체육과학대학', subDepts: ['스포츠레저학과', '특수체육교육과', '체육학과', '골프학부'] },
    { name: '문화예술대학', subDepts: ['무용과', '미디어디자인학과', '영화영상학과', '회화학과', '국악과', '연극학과', '문화유산학과', '문화콘텐츠학과', '실용음악과'] },
    { name: '인문사회융합대학', subDepts: ['경영학과', '관광경영학과', '경영정보학과', '경찰행정학과', '영어과', '중국학과', '미용경영학과', '미용경영학과(야)', '사회복지학과'] },
    { name: 'AI바이오융합대학', subDepts: ['AI융합학부', '환경학과', '보건환경안전학과', '바이오생명공학과', '식품조리학부', '물리치료학과'] },
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
}

// ===== 업로드 기록 =====

/**
 * 업로드 기록 불러오기
 */
async function loadUploadHistory() {
  historyList.innerHTML = '<p class="info-text">업로드 기록을 불러오는 중...</p>';

  try {
    const result = await api.getUploadHistory();
    const history = result.history || [];

    if (history.length === 0) {
      historyList.innerHTML = '<p class="info-text">업로드 기록이 없습니다.</p>';
      return;
    }

    historyList.innerHTML = '';
    history.forEach(item => {
      const historyEl = document.createElement('div');
      historyEl.className = 'history-item';
      historyEl.innerHTML = `
        <div class="history-item-header">
          <h3>📄 ${item.filename}</h3>
          <span class="history-item-time">${new Date(item.uploadedAt).toLocaleString('ko-KR')}</span>
        </div>
        <div class="history-item-stats">
          <span>📊 처리: ${item.stats.processed}명</span>
          <span>👥 전체: ${item.stats.total}명</span>
          <span>💾 크기: ${formatFileSize(item.fileSize)}</span>
        </div>
      `;
      historyList.appendChild(historyEl);
    });

  } catch (error) {
    historyList.innerHTML = `<p class="info-text" style="color: #f56565;">기록을 불러오는데 실패했습니다: ${error.message}</p>`;
  }
}

/**
 * 업로드 기록 새로고침
 */
refreshHistoryBtn.addEventListener('click', loadUploadHistory);

// ===== 비밀번호 변경 =====

/**
 * 비밀번호 힌트 로드 (설정 탭)
 */
async function loadPasswordHintInSettings() {
  const hintElement = document.getElementById('currentHint');
  if (!hintElement) return;

  try {
    const result = await api.getPasswordHint();
    hintElement.textContent = result.hint;
  } catch (error) {
    hintElement.textContent = '힌트를 불러올 수 없습니다.';
    console.error('Failed to load hint:', error);
  }
}

/**
 * 비밀번호 변경 처리
 */
const changePasswordForm = document.getElementById('changePasswordForm');
if (changePasswordForm) {
  changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPasswordInput').value;
    const newPassword = document.getElementById('newPasswordInput').value;
    const confirmPassword = document.getElementById('confirmPasswordInput').value;
    const resultElement = document.getElementById('changePasswordResult');

    // 비밀번호 확인
    if (newPassword !== confirmPassword) {
      resultElement.classList.remove('hidden');
      resultElement.className = 'result error';
      resultElement.innerHTML = `
        <h3>❌ 오류</h3>
        <p>새 비밀번호가 일치하지 않습니다.</p>
      `;
      return;
    }

    try {
      const result = await api.changePassword(currentPassword, newPassword);

      resultElement.classList.remove('hidden');
      resultElement.className = 'result success';
      resultElement.innerHTML = `
        <h3>✅ 성공</h3>
        <p>${result.message}</p>
        <p>새 비밀번호 힌트: <strong>${result.hint}</strong></p>
      `;

      // 폼 초기화
      changePasswordForm.reset();

      // 힌트 업데이트
      loadPasswordHintInSettings();

      // 로그인 페이지 힌트도 업데이트 (다음에 로그인할 때 반영됨)

    } catch (error) {
      resultElement.classList.remove('hidden');
      resultElement.className = 'result error';
      resultElement.innerHTML = `
        <h3>❌ 오류</h3>
        <p>${error.message || '비밀번호 변경에 실패했습니다.'}</p>
      `;
    }
  });
}

/**
 * 탭 전환 시 설정 탭이면 힌트 로드
 */
tabBtns.forEach(btn => {
  const originalClickHandler = btn.onclick;
  btn.addEventListener('click', () => {
    const tabName = btn.getAttribute('data-tab');
    if (tabName === 'settings') {
      setTimeout(loadPasswordHintInSettings, 100);
    }
  });
});

// 초기화
init();
