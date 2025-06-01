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
                
                // 허용할 태그와 스타일만 남기는 함수
                function sanitizeHTML(html) {
                    const temp = document.createElement('div');
                    temp.innerHTML = html;
                    function clean(node) {
                        // 허용할 태그
                        const allowedTags = ['B', 'STRONG', 'I', 'EM', 'SPAN'];
                        // 허용할 스타일
                        const allowedStyles = ['background-color', 'background', 'font-weight', 'font-style'];
                        // 텍스트 노드는 그대로 반환
                        if (node.nodeType === Node.TEXT_NODE) return;
                        // <span> 변환 처리
                        if (node.nodeName === 'SPAN') {
                            const fontWeight = node.style.fontWeight;
                            const fontStyle = node.style.fontStyle;
                            const bgColor = node.style.backgroundColor;
                            const bg = node.style.background;
                            const textDecoration = node.style.textDecoration;
                            // 변환 태그 래핑
                            let wrapper = null;
                            // 볼드+이탤릭+밑줄
                            if ((fontWeight === 'bold' || fontWeight === '600' || fontWeight === '700') && fontStyle === 'italic' && textDecoration.includes('underline')) {
                                wrapper = document.createElement('b');
                                const i = document.createElement('i');
                                const u = document.createElement('u');
                                while (node.firstChild) u.appendChild(node.firstChild);
                                i.appendChild(u);
                                wrapper.appendChild(i);
                                node.parentNode.replaceChild(wrapper, node);
                                clean(wrapper);
                                return;
                            }
                            // 볼드+이탤릭
                            if ((fontWeight === 'bold' || fontWeight === '600' || fontWeight === '700') && fontStyle === 'italic') {
                                wrapper = document.createElement('b');
                                const i = document.createElement('i');
                                while (node.firstChild) i.appendChild(node.firstChild);
                                wrapper.appendChild(i);
                                node.parentNode.replaceChild(wrapper, node);
                                clean(wrapper);
                                return;
                            }
                            // 볼드+밑줄
                            if ((fontWeight === 'bold' || fontWeight === '600' || fontWeight === '700') && textDecoration.includes('underline')) {
                                wrapper = document.createElement('b');
                                const u = document.createElement('u');
                                while (node.firstChild) u.appendChild(node.firstChild);
                                wrapper.appendChild(u);
                                node.parentNode.replaceChild(wrapper, node);
                                clean(wrapper);
                                return;
                            }
                            // 이탤릭+밑줄
                            if (fontStyle === 'italic' && textDecoration.includes('underline')) {
                                wrapper = document.createElement('i');
                                const u = document.createElement('u');
                                while (node.firstChild) u.appendChild(node.firstChild);
                                wrapper.appendChild(u);
                                node.parentNode.replaceChild(wrapper, node);
                                clean(wrapper);
                                return;
                            }
                            // 볼드
                            if (fontWeight === 'bold' || fontWeight === '600' || fontWeight === '700') {
                                wrapper = document.createElement('b');
                                while (node.firstChild) wrapper.appendChild(node.firstChild);
                                node.parentNode.replaceChild(wrapper, node);
                                clean(wrapper);
                                return;
                            }
                            // 이탤릭
                            if (fontStyle === 'italic') {
                                wrapper = document.createElement('i');
                                while (node.firstChild) wrapper.appendChild(node.firstChild);
                                node.parentNode.replaceChild(wrapper, node);
                                clean(wrapper);
                                return;
                            }
                            // 밑줄
                            if (textDecoration.includes('underline')) {
                                wrapper = document.createElement('u');
                                while (node.firstChild) wrapper.appendChild(node.firstChild);
                                node.parentNode.replaceChild(wrapper, node);
                                clean(wrapper);
                                return;
                            }
                            // 배경색만 있는 경우만 span 유지
                            if (bgColor || bg) {
                                // 허용된 스타일만 남김
                                for (let i = node.style.length - 1; i >= 0; i--) {
                                    const styleName = node.style[i];
                                    if (styleName !== 'background-color' && styleName !== 'background') {
                                        node.style.removeProperty(styleName);
                                    }
                                }
                            } else {
                                // 그 외 span은 span 제거(텍스트만 남김)
                                const parent = node.parentNode;
                                while (node.firstChild) parent.insertBefore(node.firstChild, node);
                                parent.removeChild(node);
                                return;
                            }
                        } else if (!allowedTags.includes(node.nodeName)) {
                            // 태그가 허용되지 않으면 태그를 제거하고 자식만 남김
                            const parent = node.parentNode;
                            while (node.firstChild) parent.insertBefore(node.firstChild, node);
                            parent.removeChild(node);
                            return;
                        }
                        // style 속성 정제
                        if (node.nodeType === Node.ELEMENT_NODE && node.style) {
                            // 허용된 스타일만 남김
                            for (let i = node.style.length - 1; i >= 0; i--) {
                                const styleName = node.style[i];
                                if (!allowedStyles.includes(styleName)) {
                                    node.style.removeProperty(styleName);
                                }
                            }
                        }
                        // 자식 노드 재귀 처리
                        Array.from(node.childNodes).forEach(clean);
                    }
                    Array.from(temp.childNodes).forEach(clean);
                    return temp.innerHTML;
                }

                // 데이터 추출 (th 태그가 있는 행 포함)
                const contents = rows.map(row => {
                    // 첫 번째 셀이 th인지 확인
                    const firstCell = row.querySelector("th, td");
                    const isHeader = firstCell.tagName.toLowerCase() === "th";
                    
                    // 모든 셀 데이터 추출 (스타일 포함, innerHTML)
                    const cells = Array.from(row.querySelectorAll("th, td"));
                    const rowData = cells.map(cell => {
                        // notion-table-row-selector 제거
                        const selectors = cell.querySelectorAll('.notion-table-row-selector');
                        selectors.forEach(sel => sel.remove());
                        // notion-table-cell-text notranslate 스타일 정제
                        const cellDiv = cell.querySelector('.notion-table-cell-text.notranslate');
                        if (cellDiv && cellDiv.style) {
                            cellDiv.style.removeProperty('width');
                            cellDiv.style.removeProperty('max-width');
                        }
                        // 내부 모든 요소의 line-height, font-size 제거
                        function cleanDeep(node) {
                            if (node.nodeType === Node.ELEMENT_NODE && node.style) {
                                node.style.removeProperty('line-height');
                                node.style.removeProperty('font-size');
                            }
                            Array.from(node.childNodes).forEach(cleanDeep);
                        }
                        if (cellDiv) cleanDeep(cellDiv);
                        else cleanDeep(cell);
                        return sanitizeHTML(cell.innerHTML.trim());
                    });

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
