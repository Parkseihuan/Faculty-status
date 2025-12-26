/**
 * 관리자 페이지 메인 스크립트
 */

/**
 * HTML 이스케이프 함수 (XSS 방지)
 */
function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

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

    // 파싱 경고 확인
    const warnings = result.parseWarnings || {};
    const unmappedCount = (warnings.unmappedPositions || []).length;
    const unknownDeptCount = (warnings.unknownDepartments || []).length;
    const hasWarnings = unmappedCount > 0 || unknownDeptCount > 0;

    // 경고가 있으면 주의 스타일, 없으면 성공 스타일
    uploadResult.className = hasWarnings ? 'result warning' : 'result success';

    let html = `<h3>✅ 업로드 성공!</h3>`;
    html += `<p>${escapeHtml(result.message)}</p>`;
    html += `<p><strong>처리된 인원:</strong> ${escapeHtml(result.stats.processed)}명 / ${escapeHtml(result.stats.total)}명</p>`;
    html += `<p><strong>업로드 시간:</strong> ${escapeHtml(new Date(result.uploadedAt).toLocaleString('ko-KR'))}</p>`;

    // 경고 요약 표시
    if (hasWarnings) {
      html += `<div style="margin-top: 16px; padding: 12px; background-color: #fff3e0; border-left: 4px solid #d9730d; border-radius: 4px;">`;
      html += `<p style="margin: 0 0 8px 0; font-weight: 600; color: #d9730d;">⚠️ 파싱 경고 발견</p>`;

      if (unmappedCount > 0) {
        html += `<p style="margin: 4px 0; font-size: 14px;">• <strong>${unmappedCount}개</strong>의 매핑되지 않은 직급이 발견되었습니다.</p>`;

        // 처음 3개 직급 표시
        const topUnmapped = (warnings.unmappedPositions || []).slice(0, 3);
        if (topUnmapped.length > 0) {
          html += `<p style="margin: 4px 0 4px 16px; font-size: 13px; color: rgba(55, 53, 47, 0.8);">`;
          html += topUnmapped.map(item => `"${escapeHtml(item.position)}" (${item.count}명)`).join(', ');
          if (unmappedCount > 3) html += ` 외 ${unmappedCount - 3}개`;
          html += `</p>`;
        }
      }

      if (unknownDeptCount > 0) {
        html += `<p style="margin: 4px 0; font-size: 14px;">• <strong>${unknownDeptCount}개</strong>의 알 수 없는 소속이 발견되었습니다.</p>`;
      }

      html += `<p style="margin: 8px 0 0 0; font-size: 14px;">`;
      html += `<a href="javascript:void(0)" onclick="document.querySelector('[data-tab=warnings]').click()" style="color: #d9730d; text-decoration: underline; font-weight: 600;">`;
      html += `📋 파싱 경고 탭에서 자세히 보기 →`;
      html += `</a></p>`;
      html += `</div>`;
    }

    uploadResult.innerHTML = html;

    // 초기화
    selectedFile = null;
    fileInput.value = '';
    uploadArea.classList.remove('hidden');
    fileInfo.classList.add('hidden');

    // 업로드 기록 새로고침
    loadUploadHistory();

    // 파싱 경고 표시 및 배지 업데이트
    if (result.parseWarnings) {
      displayParseWarnings(result.parseWarnings);
      updateWarningBadge(result.parseWarnings);
    }

  } catch (error) {
    uploadProgress.classList.add('hidden');
    uploadResult.classList.remove('hidden');
    uploadResult.className = 'result error';
    uploadResult.innerHTML = `
      <h3>❌ 업로드 실패</h3>
      <p>${escapeHtml(error.message)}</p>
    `;
  } finally {
    uploadBtn.disabled = false;
    cancelBtn.disabled = false;
  }
});

// ===== 연구년/휴직 교원 업로드 =====

// DOM 요소
const researchUploadArea = document.getElementById('researchUploadArea');
const researchFileInput = document.getElementById('researchFileInput');
const researchFileInfo = document.getElementById('researchFileInfo');
const researchFileName = document.getElementById('researchFileName');
const researchFileSize = document.getElementById('researchFileSize');
const researchUploadBtn = document.getElementById('researchUploadBtn');
const researchCancelBtn = document.getElementById('researchCancelBtn');
const researchUploadProgress = document.getElementById('researchUploadProgress');
const researchUploadResult = document.getElementById('researchUploadResult');

let selectedResearchFile = null;

/**
 * 드래그 앤 드롭 (연구년/휴직)
 */
researchUploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  researchUploadArea.classList.add('dragover');
});

researchUploadArea.addEventListener('dragleave', () => {
  researchUploadArea.classList.remove('dragover');
});

researchUploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  researchUploadArea.classList.remove('dragover');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleResearchFileSelect(files[0]);
  }
});

/**
 * 파일 선택 (연구년/휴직)
 */
researchFileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleResearchFileSelect(e.target.files[0]);
  }
});

/**
 * 파일 선택 처리 (연구년/휴직)
 */
function handleResearchFileSelect(file) {
  // 파일 확장자 확인
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['xlsx', 'xls'].includes(ext)) {
    alert('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
    return;
  }

  selectedResearchFile = file;
  researchFileName.textContent = file.name;
  researchFileSize.textContent = formatFileSize(file.size);

  researchUploadArea.classList.add('hidden');
  researchFileInfo.classList.remove('hidden');
  researchUploadResult.classList.add('hidden');
}

/**
 * 업로드 취소 (연구년/휴직)
 */
researchCancelBtn.addEventListener('click', () => {
  selectedResearchFile = null;
  researchFileInput.value = '';
  researchUploadArea.classList.remove('hidden');
  researchFileInfo.classList.add('hidden');
  researchUploadResult.classList.add('hidden');
});

/**
 * 파일 업로드 (연구년/휴직)
 */
researchUploadBtn.addEventListener('click', async () => {
  if (!selectedResearchFile) return;

  try {
    researchUploadProgress.classList.remove('hidden');
    researchUploadResult.classList.add('hidden');
    researchUploadBtn.disabled = true;
    researchCancelBtn.disabled = true;

    const result = await api.uploadResearchLeave(selectedResearchFile);

    researchUploadProgress.classList.add('hidden');
    researchUploadResult.classList.remove('hidden');
    researchUploadResult.className = 'result success';
    researchUploadResult.innerHTML = `
      <h3>✅ 업로드 성공!</h3>
      <p>${escapeHtml(result.message)}</p>
      <p><strong>연구년 (전반기):</strong> ${escapeHtml(result.stats.researchFirst)}명</p>
      <p><strong>연구년 (후반기):</strong> ${escapeHtml(result.stats.researchSecond)}명</p>
      <p><strong>휴직:</strong> ${escapeHtml(result.stats.leave)}명</p>
      <p><strong>총 인원:</strong> ${escapeHtml(result.stats.total)}명</p>
      <p><strong>업로드 시간:</strong> ${escapeHtml(new Date(result.uploadedAt).toLocaleString('ko-KR'))}</p>
    `;

    // 초기화
    selectedResearchFile = null;
    researchFileInput.value = '';
    researchUploadArea.classList.remove('hidden');
    researchFileInfo.classList.add('hidden');

  } catch (error) {
    researchUploadProgress.classList.add('hidden');
    researchUploadResult.classList.remove('hidden');
    researchUploadResult.className = 'result error';
    researchUploadResult.innerHTML = `
      <h3>❌ 업로드 실패</h3>
      <p>${escapeHtml(error.message)}</p>
    `;
  } finally {
    researchUploadBtn.disabled = false;
    researchCancelBtn.disabled = false;
  }
});

// ==================== 발령사항 파일 업로드 ====================

// DOM 요소
const appointmentUploadArea = document.getElementById('appointmentUploadArea');
const appointmentFileInput = document.getElementById('appointmentFileInput');
const appointmentFileInfo = document.getElementById('appointmentFileInfo');
const appointmentFileName = document.getElementById('appointmentFileName');
const appointmentFileSize = document.getElementById('appointmentFileSize');
const appointmentUploadBtn = document.getElementById('appointmentUploadBtn');
const appointmentCancelBtn = document.getElementById('appointmentCancelBtn');
const appointmentUploadProgress = document.getElementById('appointmentUploadProgress');
const appointmentUploadResult = document.getElementById('appointmentUploadResult');

let selectedAppointmentFile = null;

/**
 * 드래그 앤 드롭 (발령사항)
 */
appointmentUploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  appointmentUploadArea.classList.add('dragover');
});

appointmentUploadArea.addEventListener('dragleave', () => {
  appointmentUploadArea.classList.remove('dragover');
});

appointmentUploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  appointmentUploadArea.classList.remove('dragover');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleAppointmentFileSelect(files[0]);
  }
});

/**
 * 파일 선택 (발령사항)
 */
appointmentFileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleAppointmentFileSelect(e.target.files[0]);
  }
});

/**
 * 파일 선택 처리 (발령사항)
 */
function handleAppointmentFileSelect(file) {
  // 파일 확장자 확인
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['xlsx', 'xls'].includes(ext)) {
    alert('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
    return;
  }

  selectedAppointmentFile = file;
  appointmentFileName.textContent = file.name;
  appointmentFileSize.textContent = formatFileSize(file.size);

  appointmentUploadArea.classList.add('hidden');
  appointmentFileInfo.classList.remove('hidden');
  appointmentUploadResult.classList.add('hidden');
}

/**
 * 업로드 취소 (발령사항)
 */
appointmentCancelBtn.addEventListener('click', () => {
  selectedAppointmentFile = null;
  appointmentFileInput.value = '';
  appointmentUploadArea.classList.remove('hidden');
  appointmentFileInfo.classList.add('hidden');
  appointmentUploadResult.classList.add('hidden');
});

/**
 * 파일 업로드 (발령사항)
 */
appointmentUploadBtn.addEventListener('click', async () => {
  if (!selectedAppointmentFile) return;

  try {
    appointmentUploadProgress.classList.remove('hidden');
    appointmentUploadResult.classList.add('hidden');
    appointmentUploadBtn.disabled = true;
    appointmentCancelBtn.disabled = true;

    const result = await api.uploadAppointment(selectedAppointmentFile);

    appointmentUploadProgress.classList.add('hidden');
    appointmentUploadResult.classList.remove('hidden');
    appointmentUploadResult.className = 'result success';
    appointmentUploadResult.innerHTML = `
      <h3>✅ 업로드 성공!</h3>
      <p>${escapeHtml(result.message)}</p>
      <p><strong>휴직 교원:</strong> ${escapeHtml(result.stats.leave)}명</p>
      <p><strong>업로드 시간:</strong> ${escapeHtml(new Date(result.uploadedAt).toLocaleString('ko-KR'))}</p>
    `;

    // 초기화
    selectedAppointmentFile = null;
    appointmentFileInput.value = '';
    appointmentUploadArea.classList.remove('hidden');
    appointmentFileInfo.classList.add('hidden');

  } catch (error) {
    appointmentUploadProgress.classList.add('hidden');
    appointmentUploadResult.classList.remove('hidden');
    appointmentUploadResult.className = 'result error';
    appointmentUploadResult.innerHTML = `
      <h3>❌ 업로드 실패</h3>
      <p>${escapeHtml(error.message)}</p>
    `;
  } finally {
    appointmentUploadBtn.disabled = false;
    appointmentCancelBtn.disabled = false;
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

    // 각 교원 유형별 데이터 저장 (서버에서 fulltime, parttime, other로 분리되어 옴)
    currentOrgData.fulltime = JSON.parse(JSON.stringify(orgData.fulltime));
    currentOrgData.parttime = JSON.parse(JSON.stringify(orgData.parttime));
    currentOrgData.other = JSON.parse(JSON.stringify(orgData.other));

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

  // 스크롤 위치 저장
  const scrollY = window.scrollY || window.pageYOffset;

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
        <input type="checkbox" class="delete-checkbox dept-delete-checkbox" data-index="${index}" data-section="${section}">
        <input type="text" value="${escapeHtml(dept.name)}" class="dept-name-input" data-index="${index}" data-section="${section}">
        <div class="org-item-controls">
          <button class="btn btn-sm btn-secondary move-up" data-index="${index}" data-section="${section}">▲</button>
          <button class="btn btn-sm btn-secondary move-down" data-index="${index}" data-section="${section}">▼</button>
        </div>
      </div>
      <div class="sub-depts">
        <strong>하위 조직:</strong>
        <div class="sub-dept-list" data-dept-index="${index}">
          ${dept.subDepts.map((subDept, subIndex) => `
            <div class="sub-dept-item">
              <input type="checkbox" class="delete-checkbox subdept-delete-checkbox" data-dept-index="${index}" data-sub-index="${subIndex}" data-section="${section}">
              <input type="text" value="${escapeHtml(subDept)}" data-dept-index="${index}" data-sub-index="${subIndex}" data-section="${section}">
            </div>
          `).join('')}
          <button class="btn btn-sm btn-success add-sub-dept" data-dept-index="${index}" data-section="${section}">+ 조직 추가</button>
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

  // 스크롤 위치 복원 (DOM 업데이트 후)
  requestAnimationFrame(() => {
    window.scrollTo(0, scrollY);
  });
}

/**
 * 조직 에디터 이벤트 리스너
 */
function attachOrgEditorEvents(section) {
  const container = document.getElementById(`${section}-org`);
  if (!container) return;

  const sectionData = currentOrgData[section];

  // 대학 삭제 체크박스
  container.querySelectorAll('.dept-delete-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const orgItem = e.target.closest('.org-item');
      if (e.target.checked) {
        orgItem.classList.add('marked-for-deletion');
      } else {
        orgItem.classList.remove('marked-for-deletion');
      }
    });
  });

  // 하위 조직 삭제 체크박스
  container.querySelectorAll('.subdept-delete-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const subDeptItem = e.target.closest('.sub-dept-item');
      if (e.target.checked) {
        subDeptItem.classList.add('marked-for-deletion');
      } else {
        subDeptItem.classList.remove('marked-for-deletion');
      }
    });
  });

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

  // 하위 조직명 변경
  container.querySelectorAll('.sub-dept-item input[type="text"]').forEach(input => {
    input.addEventListener('change', (e) => {
      const deptIndex = parseInt(e.target.dataset.deptIndex);
      const subIndex = parseInt(e.target.dataset.subIndex);
      const sec = e.target.dataset.section;
      currentOrgData[sec][deptIndex].subDepts[subIndex] = e.target.value;
    });
  });

  // 하위 조직 추가
  container.querySelectorAll('.add-sub-dept').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const deptIndex = parseInt(e.target.dataset.deptIndex);
      const sec = e.target.dataset.section;
      const newSubDeptName = prompt('하위 조직명을 입력하세요:');
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
saveOrgBtn.addEventListener('click', async (e) => {
  // 기본 동작 방지
  e.preventDefault();
  e.stopPropagation();

  if (!currentOrgData.fulltime && !currentOrgData.parttime && !currentOrgData.other) return;

  try {
    // 현재 활성 섹션의 컨테이너
    const container = document.getElementById(`${activeOrgTab}-org`);

    // 체크된 항목들 수집
    const checkedDepts = [];
    const checkedSubDepts = {}; // { deptIndex: [subIndex1, subIndex2, ...] }

    // 체크된 대학 수집
    container.querySelectorAll('.dept-delete-checkbox:checked').forEach(checkbox => {
      const index = parseInt(checkbox.dataset.index);
      checkedDepts.push(index);
    });

    // 체크된 학과 수집
    container.querySelectorAll('.subdept-delete-checkbox:checked').forEach(checkbox => {
      const deptIndex = parseInt(checkbox.dataset.deptIndex);
      const subIndex = parseInt(checkbox.dataset.subIndex);
      if (!checkedSubDepts[deptIndex]) {
        checkedSubDepts[deptIndex] = [];
      }
      checkedSubDepts[deptIndex].push(subIndex);
    });

    // 삭제할 항목이 있는지 확인
    const hasItemsToDelete = checkedDepts.length > 0 || Object.keys(checkedSubDepts).length > 0;

    let confirmMessage = `현재 선택된 '${getOrgTabName(activeOrgTab)}' 탭의 조직 구조를 저장하시겠습니까?`;
    if (hasItemsToDelete) {
      confirmMessage += `\n\n체크된 항목 ${checkedDepts.length}개 조직, ${Object.values(checkedSubDepts).flat().length}개 하위 조직이 삭제됩니다.`;
    }

    if (confirm(confirmMessage)) {
      // 데이터 복사본 생성
      let dataToSave = JSON.parse(JSON.stringify(currentOrgData[activeOrgTab]));

      // 1. 먼저 각 조직의 체크된 하위 조직들을 제거 (인덱스가 큰 것부터)
      Object.keys(checkedSubDepts).forEach(deptIndex => {
        const subIndexes = checkedSubDepts[deptIndex].sort((a, b) => b - a);
        subIndexes.forEach(subIndex => {
          if (dataToSave[deptIndex] && dataToSave[deptIndex].subDepts) {
            dataToSave[deptIndex].subDepts.splice(subIndex, 1);
          }
        });
      });

      // 2. 그 다음 체크된 조직들을 제거 (인덱스가 큰 것부터)
      checkedDepts.sort((a, b) => b - a).forEach(index => {
        dataToSave.splice(index, 1);
      });

      // 3. currentOrgData 업데이트
      currentOrgData[activeOrgTab] = dataToSave;

      // 4. API 저장 (교원 유형별로 저장)
      const result = await api.updateOrganization(activeOrgTab, dataToSave);

      // 5. 화면 재렌더링 (체크된 항목들이 제거된 상태로)
      renderOrgEditor(activeOrgTab, currentOrgData[activeOrgTab]);

      // 6. 결과 메시지 표시
      orgResult.classList.remove('hidden');
      orgResult.className = 'result success';
      orgResult.innerHTML = `
        <h3>✅ 저장 성공!</h3>
        <p>${escapeHtml(result.message)}</p>
        ${hasItemsToDelete ? `<p><small>삭제된 항목: ${checkedDepts.length}개 조직, ${Object.values(checkedSubDepts).flat().length}개 하위 조직</small></p>` : ''}
        <p><small>저장된 섹션: ${escapeHtml(getOrgTabName(activeOrgTab))}</small></p>
      `;
    }
  } catch (error) {
    // 에러 메시지 표시
    orgResult.classList.remove('hidden');
    orgResult.className = 'result error';
    orgResult.innerHTML = `
      <h3>❌ 오류</h3>
      <p>저장에 실패했습니다: ${escapeHtml(error.message)}</p>
    `;
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
 * 현재 활성화된 탭만 기본값으로 초기화
 */
resetOrgBtn.addEventListener('click', () => {
  const tabName = getOrgTabName(activeOrgTab);

  if (confirm(`'${tabName}' 탭의 조직 구조를 기본값으로 초기화하시겠습니까?`)) {
    // 기본 조직 구조로 현재 탭만 초기화
    const defaultOrg = getDefaultOrgStructure();
    currentOrgData[activeOrgTab] = JSON.parse(JSON.stringify(defaultOrg));

    // 현재 탭만 다시 렌더링
    renderOrgEditor(activeOrgTab, currentOrgData[activeOrgTab]);

    saveOrgBtn.disabled = false;

    orgResult.classList.remove('hidden');
    orgResult.className = 'result success';
    orgResult.innerHTML = `
      <h3>✅ 초기화 완료</h3>
      <p>'${escapeHtml(tabName)}' 탭이 기본값으로 초기화되었습니다.</p>
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
    <p>${escapeHtml(message)}</p>
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
        <p>${escapeHtml(result.message)}</p>
        <p>새 비밀번호 힌트: <strong>${escapeHtml(result.hint)}</strong></p>
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
        <p>${escapeHtml(error.message || '비밀번호 변경에 실패했습니다.')}</p>
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

/**
 * 파싱 경고 배지 업데이트 함수
 */
function updateWarningBadge(warnings) {
  const warningsTab = document.querySelector('[data-tab="warnings"]');
  if (!warningsTab) return;

  // 기존 배지 제거
  const existingBadge = warningsTab.querySelector('.warning-badge');
  if (existingBadge) {
    existingBadge.remove();
  }

  if (!warnings) return;

  const unmappedCount = (warnings.unmappedPositions || []).length;
  const unknownDeptCount = (warnings.unknownDepartments || []).length;
  const totalWarnings = unmappedCount + unknownDeptCount;

  if (totalWarnings > 0) {
    const badge = document.createElement('span');
    badge.className = 'warning-badge';
    badge.textContent = totalWarnings;
    warningsTab.appendChild(badge);
  }
}

/**
 * 파싱 경고 표시 함수
 */
function displayParseWarnings(warnings) {
  const warningsContent = document.getElementById('warnings-content');

  if (!warnings) {
    warningsContent.innerHTML = '<p class="info-text">파싱 경고 정보가 없습니다.</p>';
    return;
  }

  const {
    unmappedPositions = [],
    unknownDepartments = [],
    skippedLecturers = 0,
    placedInOther = []
  } = warnings;

  const hasWarnings = unmappedPositions.length > 0 ||
                      unknownDepartments.length > 0 ||
                      placedInOther.length > 0;

  let html = '';

  // 요약 정보
  html += '<div style="margin-bottom: 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">';
  html += '<h3 style="margin-bottom: 12px;">📊 요약</h3>';
  html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">';

  html += '<div>';
  html += '<strong>매핑되지 않은 직급:</strong> ';
  html += `<span style="color: ${unmappedPositions.length > 0 ? '#d44c47' : '#448361'};">${unmappedPositions.length}개</span>`;
  html += '</div>';

  html += '<div>';
  html += '<strong>알 수 없는 소속:</strong> ';
  html += `<span style="color: ${unknownDepartments.length > 0 ? '#d44c47' : '#448361'};">${unknownDepartments.length}개</span>`;
  html += '</div>';

  html += '<div>';
  html += '<strong>제외된 시간강사:</strong> ';
  html += `<span style="color: #0b6e99;">${skippedLecturers}명</span>`;
  html += '</div>';

  html += '<div>';
  html += '<strong>기타로 배치된 인원:</strong> ';
  html += `<span style="color: ${placedInOther.length > 0 ? '#d9730d' : '#448361'};">${placedInOther.length}명</span>`;
  html += '</div>';

  html += '</div>';
  html += '</div>';

  if (!hasWarnings && skippedLecturers === 0) {
    html += '<div style="padding: 24px; text-align: center; color: #448361;">';
    html += '<p style="font-size: 16px; margin-bottom: 8px;">✅ 모든 데이터가 정상적으로 파싱되었습니다.</p>';
    html += '<p style="font-size: 14px; color: rgba(55, 53, 47, 0.65);">특별한 경고 사항이 없습니다.</p>';
    html += '</div>';
    warningsContent.innerHTML = html;
    return;
  }

  // 매핑되지 않은 직급
  if (unmappedPositions.length > 0) {
    html += '<div class="card" style="margin-top: 16px;">';
    html += '<h3 style="color: #d44c47;">⚠️ 매핑되지 않은 직급</h3>';
    html += '<p class="info-text">다음 직급들은 매핑 테이블에 정의되지 않았습니다. PARSING_GUIDE.md를 참고하여 매핑을 추가하세요.</p>';
    html += '<table class="org-table" style="margin-top: 12px;">';
    html += '<thead><tr><th>직급명</th><th>인원수</th></tr></thead><tbody>';

    unmappedPositions.forEach(item => {
      html += `<tr><td>${escapeHtml(item.position)}</td><td>${item.count}명</td></tr>`;
    });

    html += '</tbody></table>';
    html += '</div>';
  }

  // 알 수 없는 소속
  if (unknownDepartments.length > 0) {
    html += '<div class="card" style="margin-top: 16px;">';
    html += '<h3 style="color: #d44c47;">⚠️ 알 수 없는 소속</h3>';
    html += '<p class="info-text">다음 소속들은 조직 구조에 매칭되지 않아 "기타"로 분류되었습니다.</p>';
    html += '<table class="org-table" style="margin-top: 12px;">';
    html += '<thead><tr><th>소속명</th><th>인원수</th></tr></thead><tbody>';

    unknownDepartments.forEach(item => {
      html += `<tr><td>${escapeHtml(item.department)}</td><td>${item.count}명</td></tr>`;
    });

    html += '</tbody></table>';
    html += '</div>';
  }

  // 기타로 배치된 인원
  if (placedInOther.length > 0) {
    html += '<div class="card" style="margin-top: 16px;">';
    html += '<h3 style="color: #d9730d;">ℹ️ 기타로 배치된 교원</h3>';
    html += '<p class="info-text">다음 교원들은 조직 배치 로직에 따라 "기타" 카테고리에 배치되었습니다.</p>';
    html += '<table class="org-table" style="margin-top: 12px;">';
    html += '<thead><tr><th>이름</th><th>직급</th><th>대학</th><th>소속</th></tr></thead><tbody>';

    placedInOther.slice(0, 50).forEach(item => {
      html += `<tr>`;
      html += `<td>${escapeHtml(item.name)}</td>`;
      html += `<td>${escapeHtml(item.position)}</td>`;
      html += `<td>${escapeHtml(item.college)}</td>`;
      html += `<td>${escapeHtml(item.dept)}</td>`;
      html += `</tr>`;
    });

    if (placedInOther.length > 50) {
      html += `<tr><td colspan="4" style="text-align: center; color: rgba(55, 53, 47, 0.65);">... 외 ${placedInOther.length - 50}명</td></tr>`;
    }

    html += '</tbody></table>';
    html += '</div>';
  }

  // 시간강사 정보
  if (skippedLecturers > 0) {
    html += '<div class="card" style="margin-top: 16px;">';
    html += '<h3 style="color: #0b6e99;">ℹ️ 제외된 시간강사</h3>';
    html += `<p class="info-text">총 <strong>${skippedLecturers}명</strong>의 시간강사가 파싱 과정에서 제외되었습니다.</p>`;
    html += '<p class="info-text" style="margin-top: 8px; font-size: 13px; color: rgba(55, 53, 47, 0.65);">';
    html += '💡 시간강사는 본 부서 관리 대상이 아니므로 의도적으로 제외됩니다. PARSING_GUIDE.md의 "필터링 규칙" 섹션을 참고하세요.';
    html += '</p>';
    html += '</div>';
  }

  // 도움말
  html += '<div style="margin-top: 24px; padding: 16px; background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid #0b6e99;">';
  html += '<h4 style="margin-bottom: 8px; color: #0b6e99;">📖 도움말</h4>';
  html += '<ul style="margin: 0; padding-left: 20px; color: rgba(55, 53, 47, 0.8);">';
  html += '<li><strong>PARSING_GUIDE.md</strong> 파일을 참고하여 매핑 테이블과 조직 구조를 업데이트할 수 있습니다.</li>';
  html += '<li>매핑되지 않은 직급은 <code>backend/utils/excelParser.js</code>의 매핑 테이블에 추가하세요.</li>';
  html += '<li>새로운 조직은 조직 순서 설정 탭에서 순서를 지정할 수 있습니다.</li>';
  html += '</ul>';
  html += '</div>';

  warningsContent.innerHTML = html;
}

// ============================================
// 조교 관리 기능
// ============================================

let currentAssistantData = null;

/**
 * 조교 데이터 로드
 */
async function loadAssistantData() {
  const editor = document.getElementById('assistantAllocationEditor');
  const saveBtn = document.getElementById('saveAssistantAllocations');

  try {
    // 로딩 표시
    if (editor) {
      editor.innerHTML = '<p class="info-text">조교 데이터를 불러오는 중...</p>';
    }

    const response = await fetch(`${API_BASE_URL}/assistant`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    // JSON 파싱 전에 응답 타입 확인
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('서버가 올바른 응답을 반환하지 않았습니다. 배포가 완료되지 않았을 수 있습니다.');
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || '데이터 로드 실패');
    }

    if (!result.data || !result.data.colleges || !result.data.administrative) {
      if (editor) {
        editor.innerHTML = `
          <p class="info-text">조교 데이터가 없습니다.</p>
          <p class="info-text" style="margin-top: 12px;">
            <a href="javascript:void(0)" onclick="document.querySelector('[data-tab=upload]').click()">
              📤 엑셀 업로드 탭으로 이동하여 교원 발령사항 파일을 업로드해주세요.
            </a>
          </p>
        `;
      }
      if (saveBtn) {
        saveBtn.classList.add('hidden');
      }
      return;
    }

    currentAssistantData = result.data;
    displayAssistantAllocations();

  } catch (error) {
    console.error('조교 데이터 로드 오류:', error);

    // 사용자에게 명확한 에러 메시지 표시
    if (editor) {
      editor.innerHTML = `
        <div style="padding: 20px; background-color: rgba(235, 87, 87, 0.1); border: 1px solid rgba(235, 87, 87, 0.2); border-radius: 4px;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #d44c47;">⚠️ 조교 데이터 로드 실패</p>
          <p style="margin: 0; color: rgba(55, 53, 47, 0.8); font-size: 14px;">${error.message}</p>
          <p style="margin: 12px 0 0 0; font-size: 13px; color: rgba(55, 53, 47, 0.65);">
            배포가 진행 중일 수 있습니다. 잠시 후 페이지를 새로고침 해주세요.
          </p>
        </div>
      `;
    }

    if (saveBtn) {
      saveBtn.classList.add('hidden');
    }
  }
}

/**
 * 조교 배정 인원 편집기 표시 (계층 구조)
 */
function displayAssistantAllocations() {
  const editor = document.getElementById('assistantAllocationEditor');
  const saveBtn = document.getElementById('saveAssistantAllocations');

  if (!currentAssistantData || !currentAssistantData.colleges || !currentAssistantData.administrative) {
    editor.innerHTML = '<p class="info-text">조교 데이터를 업로드하면 배정 인원 설정이 여기에 표시됩니다.</p>';
    saveBtn.classList.add('hidden');
    return;
  }

  let html = '<div style="max-height: 600px; overflow-y: auto;">';
  html += '<table style="width: 100%; border-collapse: collapse; font-size: 14px;">';
  html += '<thead>';
  html += '<tr style="background-color: rgba(55, 53, 47, 0.04); border-bottom: 2px solid rgba(55, 53, 47, 0.16);">';
  html += '<th style="padding: 12px; text-align: left;">구분</th>';
  html += '<th style="padding: 12px; text-align: left;">부서</th>';
  html += '<th style="padding: 12px; text-align: center; width: 100px;">배정인원</th>';
  html += '<th style="padding: 12px; text-align: center; width: 100px;">재직인원</th>';
  html += '<th style="padding: 12px; text-align: center; width: 100px;">잔여인원</th>';
  html += '</tr>';
  html += '</thead>';
  html += '<tbody>';

  // 단과대학(원)
  html += '<tr style="background-color: rgba(68, 131, 97, 0.1);"><td colspan="5" style="padding: 8px; font-weight: 600;">단과대학(원)</td></tr>';
  currentAssistantData.colleges.forEach(category => {
    category.departments.forEach(dept => {
      const key = `${category.categoryName}|${dept.mainDept}`;
      const allocated = dept.allocated || 0;
      const current = dept.current || 0;
      const remaining = allocated - current;
      const remainingColor = remaining >= 0 ? 'inherit' : '#d44c47';

      html += '<tr style="border-bottom: 1px solid rgba(55, 53, 47, 0.09);">';
      html += `<td style="padding: 10px; font-size: 13px;">${escapeHtml(category.categoryName)}</td>`;
      html += `<td style="padding: 10px; font-size: 13px;">${escapeHtml(dept.mainDept)}</td>`;
      html += `<td style="padding: 10px; text-align: center;">`;
      html += `<input type="number" class="allocation-input" data-key="${escapeHtml(key)}" data-current="${current}" `;
      html += `value="${allocated}" min="0" `;
      html += `style="width: 70px; padding: 6px; border: 1px solid rgba(55, 53, 47, 0.16); border-radius: 4px; text-align: center;">`;
      html += `</td>`;
      html += `<td style="padding: 10px; text-align: center;">${current}</td>`;
      html += `<td class="remaining-cell" style="padding: 10px; text-align: center; color: ${remainingColor}; font-weight: 500;">${remaining}</td>`;
      html += '</tr>';
    });
  });

  // 행정부서
  html += '<tr style="background-color: rgba(68, 131, 97, 0.1);"><td colspan="5" style="padding: 8px; font-weight: 600;">행정부서</td></tr>';
  currentAssistantData.administrative.forEach(category => {
    category.departments.forEach(dept => {
      const key = `${category.categoryName}|${dept.mainDept}`;
      const allocated = dept.allocated || 0;
      const current = dept.current || 0;
      const remaining = allocated - current;
      const remainingColor = remaining >= 0 ? 'inherit' : '#d44c47';

      html += '<tr style="border-bottom: 1px solid rgba(55, 53, 47, 0.09);">';
      html += `<td style="padding: 10px; font-size: 13px;">${escapeHtml(category.categoryName)}</td>`;
      html += `<td style="padding: 10px; font-size: 13px;">${escapeHtml(dept.mainDept)}</td>`;
      html += `<td style="padding: 10px; text-align: center;">`;
      html += `<input type="number" class="allocation-input" data-key="${escapeHtml(key)}" data-current="${current}" `;
      html += `value="${allocated}" min="0" `;
      html += `style="width: 70px; padding: 6px; border: 1px solid rgba(55, 53, 47, 0.16); border-radius: 4px; text-align: center;">`;
      html += `</td>`;
      html += `<td style="padding: 10px; text-align: center;">${current}</td>`;
      html += `<td class="remaining-cell" style="padding: 10px; text-align: center; color: ${remainingColor}; font-weight: 500;">${remaining}</td>`;
      html += '</tr>';
    });
  });

  html += '</tbody>';
  html += '</table>';
  html += '</div>';

  editor.innerHTML = html;
  saveBtn.classList.remove('hidden');

  // 입력 변경 시 잔여 인원 업데이트
  document.querySelectorAll('.allocation-input').forEach(input => {
    input.addEventListener('input', updateRemainingCounts);
  });
}

/**
 * 잔여 인원 실시간 업데이트
 */
function updateRemainingCounts() {
  document.querySelectorAll('.allocation-input').forEach(input => {
    const allocated = parseInt(input.value) || 0;
    const current = parseInt(input.getAttribute('data-current')) || 0;
    const remaining = allocated - current;

    const row = input.closest('tr');
    const remainingCell = row.querySelector('.remaining-cell');
    if (remainingCell) {
      remainingCell.textContent = remaining;
      remainingCell.style.color = remaining >= 0 ? 'inherit' : '#d44c47';
    }
  });
}

/**
 * 배정 인원 저장
 */
async function saveAssistantAllocations() {
  const resultDiv = document.getElementById('assistantAllocationResult');
  resultDiv.className = 'result';
  resultDiv.classList.remove('hidden');
  resultDiv.innerHTML = '<p>저장 중...</p>';

  try {
    const allocations = {};

    document.querySelectorAll('.allocation-input').forEach(input => {
      const key = input.getAttribute('data-key');
      allocations[key] = parseInt(input.value) || 0;
    });

    const response = await fetch(`${API_BASE_URL}/assistant/allocations`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ allocations })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || '저장 실패');
    }

    resultDiv.className = 'result success';
    resultDiv.innerHTML = '<h3>✅ 저장 완료</h3><p>배정 인원이 성공적으로 저장되었습니다.</p>';

    // 데이터 다시 로드
    await loadAssistantData();

  } catch (error) {
    console.error('배정 인원 저장 오류:', error);
    resultDiv.className = 'result error';
    resultDiv.innerHTML = `
      <h3>❌ 저장 실패</h3>
      <p>${error.message}</p>
    `;
  }
}

/**
 * 조교 관리 이벤트 리스너 등록
 */
function initAssistantManagement() {
  // 저장 버튼
  const saveBtn = document.getElementById('saveAssistantAllocations');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveAssistantAllocations);
  }

  // 조교 탭 활성화 시 데이터 로드
  const assistantTab = document.querySelector('[data-tab="assistant"]');
  if (assistantTab) {
    assistantTab.addEventListener('click', () => {
      if (!currentAssistantData) {
        loadAssistantData();
      }
    });
  }
}

// 초기화 시 조교 관리 기능 등록
initAssistantManagement();

// 초기화
init();
