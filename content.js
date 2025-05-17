window.startPresentation = async function () {
    // Notion의 메인 콘텐츠 영역 선택
    const mainContent = document.querySelector('.notion-page-content');
    if (!mainContent) return alert("Notion 페이지 내용을 찾을 수 없습니다.");

    // 블록 요소들을 추출
    const blocks = Array.from(mainContent.querySelectorAll('.notion-block'));
    
    // 슬라이드 데이터 구성
    const slides = blocks.map(block => {
        // 텍스트 블록 추출
        const textContent = block.querySelector('.notion-text-block')?.textContent || '';
        // 이미지 URL 추출 (있는 경우)
        const imageUrl = block.querySelector('img')?.src || '';
        
        return {
            content: textContent,
            imageUrl: imageUrl
        };
    }).filter(slide => slide.content || slide.imageUrl); // 내용이 있는 슬라이드만 포함

    if (slides.length === 0) return alert("표시할 내용이 없습니다.");

    const data = encodeURIComponent(JSON.stringify({ slides }));
    const slideUrl = chrome.runtime.getURL(`slide.html?data=${data}`);
    window.open(slideUrl, "_blank");
};
  