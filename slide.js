// 전역 변수 선언
let currentSlide = 0;
let slides = [];
let autoRefresh = false; // 자동 새로고침 상태 저장

// 슬라이드 네비게이션 객체
const slideNavigation = {
    next: async function() {
        if (currentSlide < slides.length - 1) {
            currentSlide++;
            if (autoRefresh) {
                await refreshData(true); // true는 자동 새로고침임을 나타냄
            }
            updateSlideContent();
            updateNavigationCounter();
        }
    },
    prev: async function() {
        if (currentSlide > 0) {
            currentSlide--;
            if (autoRefresh) {
                await refreshData(true); // true는 자동 새로고침임을 나타냄
            }
            updateSlideContent();
            updateNavigationCounter();
        }
    }
};

// 슬라이드 컨텐츠 업데이트 함수
function updateSlideContent() {
    const container = document.getElementById('slide-container');
    const slide = slides[currentSlide];
    let slideHTML = '';
    
    // 다음 슬라이드 타이틀 준비
    const nextSlide = currentSlide < slides.length - 1 ? slides[currentSlide + 1] : null;
    const nextSlideTitle = nextSlide ? `Next : ${nextSlide.title || nextSlide.content}` : '';

    if (slide.type === 'mainTitle') {
        // 메인 타이틀 슬라이드
        slideHTML = `
            <div class="slide title-slide">
                <div class="content">
                    <h1>${slide.content}</h1>
                </div>
                ${nextSlide ? `<p class="next-slide-title">${nextSlideTitle}</p>` : ''}
            </div>
        `;
    } else {
        // 컨텐츠 슬라이드
        slideHTML = `
            <div class="slide content-slide">
                <div class="main-content">
                    <div class="side-title">
                        <h2 class="${slide.isHeader ? 'header-title' : ''}">${processText(slide.title)}</h2>
                        <p class="page-title">${slide.pageTitle}</p>
                    </div>
                    <div class="content-columns">
                        <div class="column share-column">
                            <h3>${slide.columnTitles?.[1] || '전체 공유사항'}</h3>
                            <div class="column-content">
                                <p class="slide-text">${processText(slide.shareContent).replace(/\n/g, '<br>').replace(/([.!?])\s+/g, '$1<br>')}</p>
                            </div>
                        </div>
                        <div class="column issue-column">
                            <h3>${slide.columnTitles?.[2] || '이슈사항'}</h3>
                            <div class="column-content">
                                <p class="slide-text">${slide.issueContent ? processText(slide.issueContent).replace(/\n/g, '<br>') : ''}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="bottom-area">
                    ${nextSlide ? `<p class="next-slide-title">${nextSlideTitle}</p>` : ''}
                </div>
            </div>
        `;
    }

    container.innerHTML = slideHTML;
    
    // 현재 설정된 스타일 적용
    applySettings();
}

// 슬라이드 카운터 업데이트
function updateNavigationCounter() {
    const counter = document.getElementById('slideCounter');
    if (counter) {
        counter.textContent = `${currentSlide + 1} / ${slides.length}`;
    }
}

// 메시지 리스너 추가
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SLIDES_DATA') {
        slides = message.slides;
        renderSlides(slides);
    }
});

// 슬라이드 렌더링 함수
function renderSlides(slideData) {
    const { pageTitle, contents, columnTitles } = slideData;
    
    // 모든 슬라이드 데이터 구성
    slides = [
        // 첫 번째 슬라이드 (메인 타이틀 페이지)
        {
            type: 'mainTitle',
            content: pageTitle
        },
        // 나머지 슬라이드 (컨텐츠 페이지들)
        ...contents.map(content => ({
            type: 'content',
            isHeader: content.isHeader,
            title: content.title,
            content: content.content,
            pageTitle: pageTitle,
            columnTitles: columnTitles, // 컬럼 제목 추가
            shareContent: content.shareContent,
            issueContent: content.issueContent
        }))
    ];

    // 현재 슬라이드 초기화
    currentSlide = 0;
    
    // 네비게이션 바 초기 렌더링
    renderNavigation();
    
    // 초기 슬라이드 표시
    updateSlideContent();
}

// 네비게이션 바 렌더링 함수
function renderNavigation() {
    // 기존 네비게이션 컨테이너 제거
    const existingNav = document.getElementById('navigation-container');
    if (existingNav) {
        existingNav.remove();
    }

    const navigationHTML = `
        <div class="nav-trigger-area"></div>
        <div class="navigation">
            <div class="button-group">
                <button id="prevButton" class="nav-button">이전</button>
                <span id="slideCounter">${currentSlide + 1} / ${slides.length}</span>
                <button id="nextButton" class="nav-button">다음</button>
            </div>
            <div class="button-group">
                <button id="refreshButton" class="util-button">🔄 새로고침</button>
                <button id="fullscreenButton" class="util-button">전체화면</button>
                <button id="settingsButton" class="util-button">설정</button>
                <button id="darkModeButton" class="util-button">🌙 다크모드</button>
            </div>
            <div class="checkbox-group">
                <label class="checkbox-wrapper">
                    <input type="checkbox" id="autoRefresh" />
                    <span class="checkbox-label">페이지 이동시 새로고침</span>
                </label>
                <label class="checkbox-wrapper">
                    <input type="checkbox" id="pinNav" />
                    <span class="checkbox-label">네비게이션 고정</span>
                </label>
            </div>
        </div>
    `;
  
    // 네비게이션 컨테이너 생성 및 추가
    const navContainer = document.createElement('div');
    navContainer.id = 'navigation-container';
    navContainer.innerHTML = navigationHTML;
    document.body.appendChild(navContainer);

    // 이전 설정 상태 저장
    const isPinnedState = isPinned;
    const isDarkModeState = isDarkMode;
    
    // 이벤트 리스너 설정
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const refreshButton = document.getElementById('refreshButton');
    const fullscreenButton = document.getElementById('fullscreenButton');
    const settingsButton = document.getElementById('settingsButton');
    const darkModeButton = document.getElementById('darkModeButton');
    const pinNav = document.getElementById('pinNav');
    const autoRefreshCheckbox = document.getElementById('autoRefresh');

    if (prevButton) {
        prevButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            slideNavigation.prev();
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            slideNavigation.next();
        });
    }

    if (refreshButton) {
        refreshButton.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await refreshData();
        });
    }

    if (fullscreenButton) fullscreenButton.addEventListener('click', toggleFullscreen);
    if (settingsButton) settingsButton.addEventListener('click', openSettings);
    if (darkModeButton) {
        darkModeButton.innerHTML = isDarkModeState ? '☀️ 라이트모드' : '🌙 다크모드';
        darkModeButton.addEventListener('click', toggleDarkMode);
    }
    
    if (pinNav) {
        pinNav.checked = isPinnedState;
        pinNav.addEventListener('change', togglePinNavigation);
    }

    if (autoRefreshCheckbox) {
        autoRefreshCheckbox.checked = autoRefresh;
        autoRefreshCheckbox.addEventListener('change', (e) => {
            autoRefresh = e.target.checked;
            // storage에 설정 저장
            chrome.storage.local.set({ autoRefresh: autoRefresh });
        });
    }

    // 네비게이션 표시/숨김 처리
    setupNavigationVisibility();

    // 이전 상태 복원
    if (isPinnedState) {
        const navigation = document.querySelector('.navigation');
        if (navigation) {
            navigation.classList.add('show');
        }
    }
}

// 전체화면 토글 함수
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// 글자 크기와 행간 관련 전역 변수
let currentFontSize = 100; // 기본 크기를 100%로 설정
let currentLineHeight = 160; // 기본 행간을 160%로 설정
const fontSizeStep = 10; // 10% 단위로 조절
const lineHeightStep = 10; // 10% 단위로 조절

// 글자 크기 조절 함수
function increaseFontSize() {
    if (currentFontSize < 150) {
        currentFontSize += fontSizeStep;
        updateTextStyle();
        saveCurrentStyle(); // 설정 저장 추가
    }
}

function decreaseFontSize() {
    if (currentFontSize > 70) {
        currentFontSize -= fontSizeStep;
        updateTextStyle();
        saveCurrentStyle(); // 설정 저장 추가
    }
}

// 행간 조절 함수
function increaseLineHeight() {
    if (currentLineHeight < 200) {
        currentLineHeight += lineHeightStep;
        updateTextStyle();
        saveCurrentStyle(); // 설정 저장 추가
    }
}

function decreaseLineHeight() {
    if (currentLineHeight > 120) {
        currentLineHeight -= lineHeightStep;
        updateTextStyle();
        saveCurrentStyle(); // 설정 저장 추가
    }
}

// 현재 스타일 저장 함수
async function saveCurrentStyle() {
    try {
        await chrome.storage.local.set({
            textStyle: {
                fontSize: currentFontSize,
                lineHeight: currentLineHeight
            }
        });
    } catch (err) {
        console.error('스타일 저장 오류:', err);
    }
  }
  
// 스타일 로드 함수
async function loadSavedStyle() {
    try {
        const data = await chrome.storage.local.get('textStyle');
        if (data.textStyle) {
            currentFontSize = data.textStyle.fontSize;
            currentLineHeight = data.textStyle.lineHeight;
            updateTextStyle();
        }
    } catch (err) {
        console.error('스타일 로드 오류:', err);
    }
}

// 설정 관련 전역 변수
let currentSettings = {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 16,
    lineHeight: 1.5
};

// 설정 모달 관련 함수들
function openSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.add('show');
    
    // 현재 설정값 폼에 표시
    document.getElementById('fontFamily').value = currentSettings.fontFamily;
    document.getElementById('fontSize').value = currentSettings.fontSize;
    document.getElementById('lineHeight').value = currentSettings.lineHeight;
}

function closeSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('show');
}

// 설정 저장 함수
async function saveSettings(e) {
    e.preventDefault();
    
    // 폼 데이터 가져오기
    const formData = new FormData(e.target);
    currentSettings = {
        fontFamily: formData.get('fontFamily'),
        fontSize: parseInt(formData.get('fontSize')),
        lineHeight: parseFloat(formData.get('lineHeight'))
    };
    
    // storage에 설정 저장
    await chrome.storage.local.set({ styleSettings: currentSettings });
    
    // 스타일 적용
    applySettings();
    
    // 모달 닫기
    closeSettings();
}

// 설정 적용 함수
function applySettings() {
    const slideTexts = document.querySelectorAll('.slide-text');
    slideTexts.forEach(text => {
        text.style.fontFamily = currentSettings.fontFamily;
        text.style.fontSize = `${currentSettings.fontSize}px`;
        text.style.lineHeight = currentSettings.lineHeight;
    });
}

// 네비게이션 관련 변수
let isPinned = false;
let navHideTimeout;
let isMouseOverNav = false;

// 네비게이션 고정 토글 함수
async function togglePinNavigation(e) {
    isPinned = e.target.checked;
    
    // 설정 저장
    try {
        await chrome.storage.local.set({ navPinned: isPinned });
    } catch (err) {
        console.error('네비게이션 고정 설정 저장 오류:', err);
    }

    if (isPinned) {
        showNavigation();
    } else {
        hideNavigationWithDelay();
    }
}

// 네비게이션 표시/숨김 설정 함수
function setupNavigationVisibility() {
    const navigation = document.querySelector('.navigation');
    const navTriggerArea = document.querySelector('.nav-trigger-area');

    function showNavigation() {
        if (!navigation) return;
        clearTimeout(navHideTimeout);
        navigation.classList.add('show');
    }

    function hideNavigation() {
        if (!navigation || isPinned) return;
        navigation.classList.remove('show');
    }

    function hideNavigationWithDelay() {
        if (isPinned) return;
        clearTimeout(navHideTimeout);
        navHideTimeout = setTimeout(() => {
            if (!isMouseOverNav && !isPinned) {
                hideNavigation();
            }
        }, 1000);
    }

    // 마우스가 트리거 영역에 들어올 때
    navTriggerArea.addEventListener('mouseenter', () => {
        isMouseOverNav = true;
        showNavigation();
    });

    // 마우스가 네비게이션 영역에 들어올 때
    navigation.addEventListener('mouseenter', () => {
        isMouseOverNav = true;
        showNavigation();
    });

    // 마우스가 네비게이션 영역을 벗어날 때
    navigation.addEventListener('mouseleave', () => {
        isMouseOverNav = false;
        hideNavigationWithDelay();
    });

    // 마우스가 트리거 영역을 벗어날 때
    navTriggerArea.addEventListener('mouseleave', (e) => {
        if (!e.relatedTarget?.closest('.navigation')) {
            isMouseOverNav = false;
            hideNavigationWithDelay();
        }
    });

    // 초기 상태 설정
    const pinCheckbox = document.getElementById('pinNav');
    if (pinCheckbox && pinCheckbox.checked) {
        isPinned = true;
        showNavigation();
    } else {
        hideNavigation();
    }
}

// 네비게이션 설정 로드 함수
async function loadNavigationSettings() {
    try {
        const data = await chrome.storage.local.get('navPinned');
        if (data.navPinned !== undefined) {
            isPinned = data.navPinned;
            const pinCheckbox = document.getElementById('pinNav');
            if (pinCheckbox) {
                pinCheckbox.checked = isPinned;
            }
            if (isPinned) {
                const navigation = document.querySelector('.navigation');
                if (navigation) {
                    navigation.classList.add('show');
                }
            }
        }
    } catch (err) {
        console.error('네비게이션 설정 로드 오류:', err);
    }
}

// 다크모드 관련 변수와 함수
let isDarkMode = false;

// 다크모드 토글 함수
async function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    const darkModeButton = document.getElementById('darkModeButton');
    
    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        darkModeButton.innerHTML = '☀️ 라이트모드';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        darkModeButton.innerHTML = '🌙 다크모드';
    }
    
    // 설정 저장
    try {
        await chrome.storage.local.set({ darkMode: isDarkMode });
    } catch (err) {
        console.error('다크모드 설정 저장 오류:', err);
    }
}

// 다크모드 설정 로드 함수
async function loadDarkMode() {
    try {
        const data = await chrome.storage.local.get('darkMode');
        if (data.darkMode !== undefined) {
            isDarkMode = data.darkMode;
            if (isDarkMode) {
                document.documentElement.setAttribute('data-theme', 'dark');
                const darkModeButton = document.getElementById('darkModeButton');
                if (darkModeButton) {
                    darkModeButton.innerHTML = '☀️ 라이트모드';
                }
            }
        }
    } catch (err) {
        console.error('다크모드 설정 로드 오류:', err);
    }
}

// 텍스트 처리 함수 수정
function processText(text) {
    // URL을 하이퍼링크로 변환 (http:// 또는 https://로 시작하는 링크)
    let processedText = text.replace(
        /(https?:\/\/[^\s\[\]<>"]+)/g, 
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    
    // [텍스트] 형식 전체를 <strong>로 감싸기
    return processedText.replace(/(\[.*?\])/g, '<strong>$1</strong>');
}

// 데이터 새로고침 함수
async function refreshData(isAutoRefresh = false) {
    try {
        // 이전 상태 저장
        const currentPosition = currentSlide;
        const wasPinned = isPinned;
        const wasDarkMode = isDarkMode;

        // 노션 탭 찾기
        const tabs = await chrome.tabs.query({url: "https://www.notion.so/*"});
        if (tabs.length === 0) {
            throw new Error("열려있는 노션 페이지를 찾을 수 없습니다.");
        }

        // 가장 최근의 노션 탭 사용
        const notionTab = tabs[0];
        
        // 노션 페이지에서 데이터 추출
        const results = await chrome.scripting.executeScript({
            target: { tabId: notionTab.id },
            func: () => {
                const mainEl = document.querySelector("main");
                if (!mainEl) return null;

                // 페이지 제목 추출
                const pageTitle = mainEl.querySelector("h1")?.innerText.trim() || "제목 없음";

                // 테이블 데이터 추출
                const table = mainEl.querySelector("table");
                if (!table) {
                    throw new Error("테이블을 찾을 수 없습니다.");
                }

                // 모든 행 가져오기 (첫 번째 행 제외)
                const rows = Array.from(table.querySelectorAll("tr")).slice(1);
                if (rows.length === 0) {
                    throw new Error("테이블에 데이터가 없습니다.");
                }
                
                // 데이터 추출
                const contents = rows.map(row => {
                    const firstCell = row.querySelector("th, td");
                    const isHeader = firstCell.tagName.toLowerCase() === "th";
                    
                    const cells = Array.from(row.querySelectorAll("th, td"));
                    const rowData = cells.map(cell => cell.innerText.trim());

                    return {
                        isHeader,
                        title: rowData[0] || '',
                        shareContent: rowData[1] || '',
                        issueContent: rowData[2] || ''
                    };
                });

                return { pageTitle, contents };
            }
        });

        if (!results || !results[0] || !results[0].result) {
            throw new Error("데이터 추출에 실패했습니다.");
        }

        const slideData = results[0].result;
        
        // storage에 새로운 데이터 저장
        await chrome.storage.local.set({ slideData: slideData });
        
        // 슬라이드 다시 렌더링
        renderSlides(slideData);
        
        // 이전 상태 복원
        isPinned = wasPinned;
        isDarkMode = wasDarkMode;
        
        // 이전 슬라이드 위치로 이동 (가능한 경우)
        if (currentPosition < slides.length) {
            currentSlide = currentPosition;
            updateSlideContent();
            updateNavigationCounter();
        }

        // 다크모드 상태 복원
        if (wasDarkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        
        // 성공 로그 출력 (자동 새로고침이 아닐 때만)
        if (!isAutoRefresh) {
            console.log("✅ 데이터가 성공적으로 새로고침되었습니다.");
        }
        
    } catch (err) {
        console.error("❌ 데이터 새로고침 중 오류:", err);
        alert(err.message || "데이터 새로고침에 실패했습니다. 노션 페이지가 열려있는지 확인해주세요.");
    }
}

// 페이지 로드 시 자동 새로고침 설정 로드
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const data = await chrome.storage.local.get('autoRefresh');
        if (data.autoRefresh !== undefined) {
            autoRefresh = data.autoRefresh;
            const autoRefreshCheckbox = document.getElementById('autoRefresh');
            if (autoRefreshCheckbox) {
                autoRefreshCheckbox.checked = autoRefresh;
            }
        }
    } catch (err) {
        console.error('자동 새로고침 설정 로드 오류:', err);
    }
});

// 페이지 로드 시 storage에서 데이터 가져오기
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const data = await chrome.storage.local.get('slideData');
        if (data.slideData) {
            await Promise.all([
                loadSavedStyle(),
                loadDarkMode(),
                loadNavigationSettings()
            ]);
            renderSlides(data.slideData);
        }
    } catch (err) {
        console.error('데이터 로드 오류:', err);
    }
    
    // 설정 모달 이벤트 리스너 설정
    const modal = document.getElementById('settingsModal');
    const closeBtn = modal.querySelector('.close-modal');
    const form = document.getElementById('settingsForm');
    
    closeBtn.addEventListener('click', closeSettings);
    form.addEventListener('submit', saveSettings);
    
    // 모달 외부 클릭 시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeSettings();
        }
    });

    // 키보드 네비게이션 설정
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') slideNavigation.next();
        if (e.key === 'ArrowLeft') slideNavigation.prev();
    });
  });
  