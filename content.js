// Biến để lưu trữ div hiển thị kết quả
let resultDiv = null;
let lastSelectionRange = null;

// Hàm để hiển thị kết quả
async function showResult(text, isLoading = false) {
    if (resultDiv) {
        resultDiv.remove();
    }
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    if (isLoading) {
        lastSelectionRange = selection.getRangeAt(0).cloneRange();
    }
    const range = lastSelectionRange;
    if (!range) return;
    const rect = range.getBoundingClientRect();

    // Lấy cài đặt theme từ storage, mặc định là dark mode (true)
    const { isDarkMode } = await chrome.storage.sync.get({ isDarkMode: true });

    // Định nghĩa các màu sắc dựa trên theme
    const theme = {
        backgroundColor: isDarkMode ? '#2d2d2d' : '#f0f0f0',
        color: isDarkMode ? '#f0f0f0' : '#2d2d2d',
        borderColor: isDarkMode ? '#444' : '#ccc'  
    };

    resultDiv = document.createElement('div');
    // Áp dụng style từ đối tượng theme
    Object.assign(resultDiv.style, {
        position: 'absolute',
        top: `${rect.bottom + window.scrollY + 5}px`,
        left: `${rect.left + window.scrollX}px`,
        backgroundColor: theme.backgroundColor,
        color: theme.color,
        border: `1px solid ${theme.borderColor}`,
        borderRadius: '8px',
        padding: '5px 10px',
        zIndex: '99999',
        maxWidth: '450px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
        fontSize: '12px',
        lineHeight: '1.6',
        fontFamily: 'Arial, sans-serif'
    });
    
    const content = isLoading ? 'Đang xử lý...' : text.replace(/\n/g, '<br>');
    resultDiv.innerHTML = `<div id="gemini-content">${content}</div>`;
    document.body.appendChild(resultDiv);
}

// Lắng nghe tin nhắn từ background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'show_loading') {
        showResult("", true);
    } else if (request.type === 'show_result') {
        if (resultDiv) {
             const contentDiv = document.getElementById('gemini-content');
             if(contentDiv){
                contentDiv.innerHTML = request.text.replace(/\n/g, '<br>');
             }
        } else {
             showResult(request.text, false);
        }
    }
});

// Đóng cửa sổ kết quả nếu click ra ngoài
document.addEventListener('click', (event) => {
    if (resultDiv && !resultDiv.contains(event.target)) {
        const selection = window.getSelection();
        if (!selection.rangeCount || !selection.getRangeAt(0).toString().trim()) {
            resultDiv.remove();
            resultDiv = null;
        }
    }
}, true);

// Gửi tin nhắn khi bôi đen văn bản
document.addEventListener("mouseup", async () => {
    const { isExtensionEnabled } = await chrome.storage.sync.get({ isExtensionEnabled: true });
    
    // Nếu tiện ích bị tắt, dừng lại ngay lập tức
    if (!isExtensionEnabled) {
        return;
    }

    const text = window.getSelection().toString().trim();
    if (text) {
        // Gửi tin nhắn để background script xử lý
        chrome.runtime.sendMessage({ type: "search", text });
    }
});