// 익스텐션 아이콘 클릭 시 바로 실행
chrome.action.onClicked.addListener(async (tab) => {
    try {
        // 현재 탭에서 데이터 추출
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const mainEl = document.querySelector("main");
                if (!mainEl) return null;

                // 페이지 제목 추출 (첫 번째 h1)
                const pageTitle = mainEl.querySelector("h1")?.innerText.trim() || "제목 없음";

                // 테이블 데이터 추출
                const table = mainEl.querySelector("table");
                if (!table) return { pageTitle, contents: [] };

                // 헤더 행에서 컬럼 제목 추출
                const headerRow = table.querySelector("tr");
                const columnTitles = Array.from(headerRow.querySelectorAll("th, td")).map(cell => cell.innerText.trim());
                
                // 모든 행 가져오기 (첫 번째 행 제외)
                const rows = Array.from(table.querySelectorAll("tr")).slice(1);
                
                // 데이터 추출 (th 태그가 있는 행 포함)
                const contents = rows.map(row => {
                    // 첫 번째 셀이 th인지 확인
                    const firstCell = row.querySelector("th, td");
                    const isHeader = firstCell.tagName.toLowerCase() === "th";
                    
                    // 모든 셀 데이터 추출
                    const cells = Array.from(row.querySelectorAll("th, td"));
                    const rowData = cells.map(cell => cell.innerText.trim());

                    return {
                        isHeader,
                        title: rowData[0], // 첫 번째 컬럼을 슬라이드 제목으로
                        shareContent: rowData[1] || '', // 전체 공유사항
                        issueContent: rowData[2] || '' // 이슈사항
                    };
                });

                return { 
                    pageTitle, 
                    columnTitles,  // 컬럼 제목 추가
                    contents 
                };
            }
        });

        const slideData = results[0].result;
        if (!slideData) {
            throw new Error("데이터를 추출할 수 없습니다.");
        }
        
        console.log("✅ Notion 데이터:", slideData);

        // storage에 데이터 저장
        await chrome.storage.local.set({ slideData: slideData });
        
        // 새 탭으로 열기
        const slideUrl = chrome.runtime.getURL('slide.html');
        await chrome.tabs.create({ url: slideUrl });

    } catch (err) {
        console.error("❌ 스크립트 실행 중 오류:", err);
    }
});
