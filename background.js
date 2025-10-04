/**
 * Gọi API Gemini với cơ chế tự động chuyển đổi key.
 * @param {string[]} apiKeys - Mảng các API key.
 * @param {number} startIndex - Vị trí key bắt đầu thử trong mảng.
 * @param {string} fullPrompt - Toàn bộ prompt để gửi đi.
 * @returns {Promise<{success: boolean, answer: string, usedKeyIndex: number}>}
 */
async function callGeminiWithFallback(apiKeys, startIndex, fullPrompt) {
    for (let i = 0; i < apiKeys.length; i++) {
        const keyIndex = (startIndex + i) % apiKeys.length;
        const currentApiKey = apiKeys[keyIndex];
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${currentApiKey}`;

        try {
            console.log(`Đang thử với API Key vị trí: ${keyIndex}`);
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: fullPrompt }] }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Lỗi API (${response.status}): ${errorData.error.message}`);
            }

            const data = await response.json();
            const answer = data.candidates[0]?.content?.parts[0]?.text || "Không nhận được nội dung hợp lệ.";

            console.log(`API Key vị trí ${keyIndex} thành công!`);
            return { success: true, answer: answer, usedKeyIndex: keyIndex };

        } catch (error) {
            console.error(`API Key vị trí ${keyIndex} thất bại. Lỗi:`, error.message);
        }
    }

    console.error("Tất cả API key đều không hoạt động.");
    return {
        success: false,
        answer: 'Tất cả API key của bạn đều không hoạt động. Vui lòng kiểm tra lại trong phần cài đặt.',
        usedKeyIndex: -1
    };
}

// Tạo menu ngữ cảnh
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "askGemini",
        title: "Hỏi Gemini",
        contexts: ["selection"]
    });
});

// Lắng nghe sự kiện click menu ngữ cảnh
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const { isExtensionEnabled } = await chrome.storage.sync.get({ isExtensionEnabled: true });
    if (!isExtensionEnabled) {
        console.log('[Gemini Extension] Context menu clicked, but extension is disabled.');
        return;
    }

    if (info.menuItemId !== "askGemini" || !info.selectionText) return;

    chrome.tabs.sendMessage(tab.id, { type: 'show_loading' });

    const settings = await chrome.storage.sync.get(['geminiApiKeys', 'geminiSystemPrompt']);
    const apiKeys = settings.geminiApiKeys;

    if (!apiKeys || apiKeys.length === 0) {
        const errorMsg = 'Lỗi: Vui lòng cấu hình API Key trong popup của extension.';
        chrome.tabs.sendMessage(tab.id, { type: 'show_result', text: errorMsg });
        chrome.storage.local.set({ lastAnswer: errorMsg });
        return;
    }

    const storageData = await chrome.storage.local.get('lastKeyIndex');
    const lastKeyIndex = storageData.lastKeyIndex || 0;
    const startIndex = (lastKeyIndex + 1) % apiKeys.length;

    const systemPrompt = settings.geminiSystemPrompt || "";
    const userQuestion = info.selectionText;
    const fullPrompt = `${systemPrompt}\n\n---\n\n${userQuestion}`;

    await chrome.storage.local.set({ lastQuestion: fullPrompt });

    const result = await callGeminiWithFallback(apiKeys, startIndex, fullPrompt);

    if (result.success) {
        await chrome.storage.local.set({ lastKeyIndex: result.usedKeyIndex });
    }

    await chrome.storage.local.set({ lastAnswer: result.answer });
    chrome.tabs.sendMessage(tab.id, {
        type: 'show_result',
        text: result.answer
    });
});

// Lắng nghe sự kiện từ content script (khi bôi đen)
chrome.runtime.onMessage.addListener(async (msg, sender) => {
    const { isExtensionEnabled } = await chrome.storage.sync.get({ isExtensionEnabled: true });

    if (!isExtensionEnabled) return; // Dừng lại nếu tiện ích đang tắt

    if (msg.type === "search" && msg.text) {
        const tabId = sender.tab.id;
        chrome.tabs.sendMessage(tabId, { type: 'show_loading' });

        const settings = await chrome.storage.sync.get(['geminiApiKeys', 'geminiSystemPrompt']);
        const apiKeys = settings.geminiApiKeys;
        if (!apiKeys || apiKeys.length === 0) {
            const errorMsg = 'Lỗi: Vui lòng cấu hình API Key trong popup của extension.';
            chrome.tabs.sendMessage(tabId, { type: 'show_result', text: errorMsg });
            return;
        }

        const storageData = await chrome.storage.local.get('lastKeyIndex');
        const lastKeyIndex = storageData.lastKeyIndex || 0;
        const startIndex = (lastKeyIndex + 1) % apiKeys.length;

        const systemPrompt = settings.geminiSystemPrompt || "Dịch đoạn văn sau:";
        const fullPrompt = `${systemPrompt}\n\n---\n\n${msg.text}`;

        const result = await callGeminiWithFallback(apiKeys, startIndex, fullPrompt);

        if (result.success) {
            await chrome.storage.local.set({ lastKeyIndex: result.usedKeyIndex });
        }

        chrome.tabs.sendMessage(tabId, {
            type: 'show_result',
            text: result.answer
        });

        chrome.storage.local.set({
            lastQuestion: fullPrompt,
            lastAnswer: result.answer
        });
    }
});