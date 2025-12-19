---
paths: docs/**/*.{js,html,css}
---

# Frontend Development Rules

## JavaScript Standards

### DOM 조작
```javascript
// 요소 선택
const element = document.getElementById('id');
const elements = document.querySelectorAll('.class');

// 이벤트 리스너
element.addEventListener('click', async (e) => {
  e.preventDefault();
  // 핸들러 로직
});

// 클래스 조작
element.classList.add('active');
element.classList.remove('hidden');
element.classList.toggle('visible');
```

### 스크롤 위치 관리
```javascript
// 스크롤 위치 저장
const scrollY = window.scrollY || window.pageYOffset;

// DOM 변경 후 스크롤 복원
requestAnimationFrame(() => {
  window.scrollTo({
    top: scrollY,
    left: 0,
    behavior: 'instant'
  });
});
```

### 비동기 API 호출
```javascript
async function fetchData() {
  try {
    showLoading();
    const response = await fetch('/api/endpoint');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    showError('데이터를 불러오는데 실패했습니다: ' + error.message);
  } finally {
    hideLoading();
  }
}
```

### 폼 처리
```javascript
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // 폼 데이터 수집
  const formData = new FormData(form);

  // 검증
  if (!validateForm(formData)) {
    showError('입력값을 확인해주세요');
    return;
  }

  // 제출
  await submitForm(formData);
});
```

## HTML Standards

### 시맨틱 마크업
```html
<header>...</header>
<nav>...</nav>
<main>
  <section>
    <h2>섹션 제목</h2>
    <article>...</article>
  </section>
</main>
<footer>...</footer>
```

### 접근성
```html
<!-- 의미있는 alt 텍스트 -->
<img src="..." alt="설명">

<!-- 버튼은 button 사용 -->
<button type="button" aria-label="닫기">×</button>

<!-- 폼 레이블 연결 -->
<label for="name">이름</label>
<input type="text" id="name">
```

### 클래스 네이밍
```html
<!-- kebab-case 사용 -->
<div class="faculty-table">
  <div class="faculty-table__row">
    <span class="faculty-table__cell--highlighted"></span>
  </div>
</div>
```

## CSS Standards

### 클래스 구조 (BEM)
```css
/* Block */
.org-item {
  padding: 12px;
}

/* Element */
.org-item__header {
  display: flex;
}

/* Modifier */
.org-item--highlighted {
  background-color: yellow;
}
```

### 레이아웃
```css
/* Flexbox 우선 사용 */
.container {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Grid for complex layouts */
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
```

### 반응형 디자인
```css
/* Mobile first approach */
.element {
  width: 100%;
}

/* Tablet */
@media (min-width: 768px) {
  .element {
    width: 50%;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .element {
    width: 33.333%;
  }
}
```

### 색상 및 간격
```css
/* CSS 변수 사용 권장 */
:root {
  --color-primary: #37352f;
  --color-success: #448361;
  --color-error: #d44c47;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
}

.element {
  color: var(--color-primary);
  padding: var(--spacing-md);
}
```

## UI/UX Best Practices

### 로딩 상태
```javascript
function showLoading() {
  loadingElement.classList.remove('hidden');
  loadingElement.innerHTML = `
    <div class="loading-spinner"></div>
    <p>처리 중...</p>
  `;
}

function hideLoading() {
  loadingElement.classList.add('hidden');
}
```

### 에러 메시지
```javascript
function showError(message) {
  errorElement.classList.remove('hidden');
  errorElement.className = 'result error';
  errorElement.innerHTML = `
    <h3>❌ 오류</h3>
    <p>${message}</p>
  `;
}
```

### 성공 메시지
```javascript
function showSuccess(message) {
  successElement.classList.remove('hidden');
  successElement.className = 'result success';
  successElement.innerHTML = `
    <h3>✅ 성공</h3>
    <p>${message}</p>
  `;
}
```

### 사용자 확인
```javascript
if (confirm('정말 삭제하시겠습니까?')) {
  await deleteItem();
}
```

## Performance

### DOM 재렌더링 최소화
```javascript
// 나쁜 예
for (let item of items) {
  container.innerHTML += renderItem(item);
}

// 좋은 예
const html = items.map(item => renderItem(item)).join('');
container.innerHTML = html;
```

### 이벤트 위임
```javascript
// 나쁜 예
items.forEach(item => {
  item.addEventListener('click', handler);
});

// 좋은 예
container.addEventListener('click', (e) => {
  if (e.target.matches('.item')) {
    handler(e);
  }
});
```

### 디바운싱/쓰로틀링
```javascript
// 검색 입력 디바운싱
let searchTimeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    performSearch(e.target.value);
  }, 300);
});
```

## Browser Compatibility

### 브라우저 지원
- Chrome (최신 2개 버전)
- Firefox (최신 2개 버전)
- Safari (최신 2개 버전)
- Edge (최신 2개 버전)

### Polyfills
```javascript
// 필요한 경우 폴리필 추가
if (!Array.prototype.includes) {
  // Polyfill code
}
```

## Debugging

### Console Logging
```javascript
// 개발 중에만 사용
if (process.env.NODE_ENV === 'development') {
  console.log('Debug:', data);
}

// 배포 전 제거
// console.log()는 모두 제거할 것
```

### Error Boundaries
```javascript
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  showError('예상치 못한 오류가 발생했습니다.');
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  showError('비동기 작업 중 오류가 발생했습니다.');
});
```

## Testing

### Manual Testing Checklist
- [ ] 모든 버튼 클릭 가능
- [ ] 폼 제출 동작 확인
- [ ] 에러 메시지 표시 확인
- [ ] 로딩 상태 확인
- [ ] 반응형 디자인 확인
- [ ] 브라우저 콘솔 에러 없음

### User Flow Testing
1. 페이지 로드
2. 데이터 조회
3. 필터링/검색
4. 데이터 수정
5. 저장 확인
