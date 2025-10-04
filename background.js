//chuyển đổi định dạng API keys từ mảng string sang mảng object
async function getNormalizedApiKeys() {
    const settings = await chrome.storage.sync.get('geminiApiKeys');
    let apiKeys = settings.geminiApiKeys || [];

    if (apiKeys.length > 0 && typeof apiKeys[0] === 'string') {
        const newApiKeys = apiKeys.map(key => ({ key: key, status: 'active' }));
        await chrome.storage.sync.set({ geminiApiKeys: newApiKeys });
        console.log('Đã chuyển đổi API keys sang định dạng mới.');
        return newApiKeys;
    }
    return apiKeys;
}

async function callGeminiWithKeyManagement(fullPrompt) {
    let apiKeysObjects = await getNormalizedApiKeys();

    if (!apiKeysObjects || apiKeysObjects.length === 0) {
        return {
            success: false,
            answer: 'Lỗi: Vui lòng cấu hình API Key trong popup của extension.'
        };
    }

    // Lọc ra các key đang 'active' để thử
    let activeKeys = apiKeysObjects.filter(k => k.status === 'active');

    // Nếu không còn key nào 'active', reset tất cả và thử lại từ đầu
    if (activeKeys.length === 0) {
        console.log("Tất cả API key đã bị khóa. Reset lại toàn bộ...");
        apiKeysObjects.forEach(k => k.status = 'active');
        await chrome.storage.sync.set({ geminiApiKeys: apiKeysObjects });
        activeKeys = apiKeysObjects; // Giờ tất cả các key lại 'active'
    }

    // Duyệt qua các key đang 'active' để gọi API
    for (const keyObject of activeKeys) {
        const currentApiKey = keyObject.key;
        // Tìm index của key này trong mảng gốc để cập nhật trạng thái
        const keyIndexInOriginalArray = apiKeysObjects.findIndex(k => k.key === currentApiKey);

        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${currentApiKey}`;

        try {
            console.log(`Đang thử với API Key vị trí: ${keyIndexInOriginalArray}`);
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
            });

            if (!response.ok) {
                // Nếu không thành công, ném lỗi để khối catch xử lý
                const errorData = await response.json();
                throw new Error(`Lỗi API (${response.status}): ${errorData.error.message}`);
            }

            const data = await response.json();
            const answer = data.candidates[0]?.content?.parts[0]?.text || "Không nhận được nội dung hợp lệ.";

            console.log(`API Key vị trí ${keyIndexInOriginalArray} thành công!`);
            return { success: true, answer: answer };

        } catch (error) {
            console.error(`API Key vị trí ${keyIndexInOriginalArray} thất bại. Lỗi:`, error.message);

            // Khi gặp bất kỳ lỗi nào, chúng ta sẽ khóa key này lại.
            console.log(`Khóa API key vị trí ${keyIndexInOriginalArray}.`);
            apiKeysObjects[keyIndexInOriginalArray].status = 'locked';
            await chrome.storage.sync.set({ geminiApiKeys: apiKeysObjects });
            
            // Vòng lặp sẽ tự động chuyển sang key 'active' tiếp theo.
        }
    }

    console.error("Tất cả API key có sẵn đều không hoạt động.");
    return {
        success: false,
        answer: 'Tất cả API key của bạn đều không hoạt động hoặc đã hết hạn ngạch. Vui lòng kiểm tra lại trong phần cài đặt.',
    };
}


// --- LISTENER ---

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "askGemini",
        title: "Hỏi Gemini",
        contexts: ["selection"]
    });
});

async function handleRequest(text, tabId) {
    chrome.tabs.sendMessage(tabId, { type: 'show_loading' });

    const settings = await chrome.storage.sync.get('geminiSystemPrompt');
    const systemPrompt = settings.geminiSystemPrompt || "";
    const fullPrompt = `${systemPrompt}\n\n---\n\n${text}`;

    await chrome.storage.local.set({ lastQuestion: text });

    const result = await callGeminiWithKeyManagement(fullPrompt);

    await chrome.storage.local.set({ lastAnswer: result.answer });
    chrome.tabs.sendMessage(tabId, {
        type: 'show_result',
        text: result.answer
    });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const { isExtensionEnabled } = await chrome.storage.sync.get({ isExtensionEnabled: true });
    if (!isExtensionEnabled || info.menuItemId !== "askGemini" || !info.selectionText) return;

    handleRequest(info.selectionText, tab.id);
});

chrome.runtime.onMessage.addListener(async (msg, sender) => {
    const { isExtensionEnabled } = await chrome.storage.sync.get({ isExtensionEnabled: true });
    if (!isExtensionEnabled || msg.type !== "search" || !msg.text) return;
    
    // Đặt system prompt mặc định cho hành động bôi đen
    const settings = await chrome.storage.sync.get('geminiSystemPrompt');
    if (!settings.geminiSystemPrompt) {
         settings.geminiSystemPrompt = "Dịch đoạn văn sau:";
    }

    handleRequest(msg.text, sender.tab.id);
});