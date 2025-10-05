document.addEventListener("DOMContentLoaded", () => {
    // Main page elements
    const systemPromptInput = document.getElementById("systemPrompt");
    const savePromptButton = document.getElementById("savePromptButton");
    const manageApiButton = document.getElementById("manageApiButton");
    const extensionToggle = document.getElementById("extensionToggle");
    const themeToggle = document.getElementById("miniCircleToggle");
    const managePromptsButton = document.getElementById("managePromptsButton");

    // API Key Modal elements
    const apiKeyModal = document.getElementById("apiKeyModal");
    const closeApiKeyModalButton = apiKeyModal.querySelector(".close-button");
    const apiKeysContainer = document.getElementById("apiKeysContainer");
    const addApiKeyButton = document.getElementById("addApiKeyButton");
    const saveKeysButton = document.getElementById("saveKeysButton");

    // Prompt Modal elements
    const promptModal = document.getElementById("promptModal");
    const closePromptModalButton = promptModal.querySelector(".close-button");
    const promptsContainer = document.getElementById("promptsContainer");
    const addPromptButton = document.getElementById("addPromptButton");
    const savePromptsButton = document.getElementById("savePromptsButton");
    const applyPromptButton = document.getElementById("applyPromptButton");


    const globalNotification = document.getElementById("globalNotification");
    let notificationTimeout;

    // --- UTILITY FUNCTIONS ---
    const showNotification = (message, type, duration = 3000) => {
        if (notificationTimeout) clearTimeout(notificationTimeout);
        globalNotification.textContent = message;
        globalNotification.className = `global-notification ${type}`;
        setTimeout(() => globalNotification.classList.add("show"), 10);
        notificationTimeout = setTimeout(() => globalNotification.classList.remove("show"), duration);
    };

    const maskApiKey = (key) => {
        if (key && key.length > 6) {
            return `${key.substring(0, 3)}••••••••••••••••••${key.substring(key.length - 3)}`;
        }
        return key;
    };

    // --- API KEY MANAGEMENT ---
    const createApiKeyInput = (keyObject = { key: '', status: 'active' }) => {
        const div = document.createElement("div");
        div.className = "api-key-item";
        if (keyObject.status === 'locked') {
            div.classList.add('locked');
            div.title = "Key này đã hết hạn ngạch và đang bị khóa tạm thời.";
        }

        const input = document.createElement("input");
        input.type = "text";
        input.className = "apiKeyInput";
        input.dataset.fullKey = keyObject.key;
        input.value = maskApiKey(keyObject.key);

        if (keyObject.key) {
            input.readOnly = true;
        } else {
            input.placeholder = "Nhập hoặc dán API key mới...";
            input.addEventListener('input', (e) => {
                e.target.dataset.fullKey = e.target.value;
            });
        }

        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-key-btn";
        removeBtn.textContent = "Xóa";
        removeBtn.title = "Xóa key này";

        removeBtn.onclick = () => {
            div.remove();
            const apiKeyInputs = document.querySelectorAll(".apiKeyInput");
            const apiKeyObjects = Array.from(apiKeyInputs)
                .map(input => ({
                    key: input.dataset.fullKey.trim(),
                    status: apiKeysContainer.querySelector(`[data-full-key="${input.dataset.fullKey}"]`)?.parentElement.classList.contains('locked') ? 'locked' : 'active'
                }))
                .filter(obj => obj.key !== "");

            chrome.storage.sync.set({ geminiApiKeys: apiKeyObjects }, () => {
                showNotification("Đã xóa API Key !", "success");
            });
        };

        div.appendChild(input);
        div.appendChild(removeBtn);
        apiKeysContainer.appendChild(div);
    };

    // --- PROMPT MANAGEMENT ---
    const createPromptInput = (promptText = "") => {
        const div = document.createElement("div");
        div.className = "prompt-item";

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "prompt-selection";
        // Ta sẽ kiểm tra và set `checked` khi tải danh sách

        const textarea = document.createElement("textarea");
        textarea.rows = 3;
        textarea.value = promptText;
        textarea.placeholder = "Nhập nội dung prompt ở đây...";

        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-key-btn";
        removeBtn.textContent = "Xóa";
        removeBtn.title = "Xóa prompt này";
        removeBtn.onclick = () => div.remove();

        div.appendChild(radio);
        div.appendChild(textarea);
        div.appendChild(removeBtn);
        promptsContainer.appendChild(div);
    };
    
    const loadPrompts = async () => {
        promptsContainer.innerHTML = "";
        const { savedPrompts, geminiSystemPrompt } = await chrome.storage.sync.get(["savedPrompts", "geminiSystemPrompt"]);
        const prompts = savedPrompts || [];
        
        if (prompts.length > 0) {
            prompts.forEach(promptText => createPromptInput(promptText));
        } else {
            createPromptInput("Chọn đáp án đúng, không giải thích gì thêm");
             createPromptInput("Dịch sang tiếng Việt, không giải thích gì thêm");
        }

        // Đánh dấu radio button cho prompt đang được sử dụng
        const textareas = promptsContainer.querySelectorAll("textarea");
        textareas.forEach(textarea => {
            if (textarea.value === geminiSystemPrompt) {
                textarea.previousElementSibling.checked = true;
            }
        });
    };


    // --- LOAD ALL SETTINGS ON STARTUP ---
    const loadSettings = async () => {
        // Lấy cài đặt từ sync storage
        const syncResult = await chrome.storage.sync.get(["geminiApiKeys", "geminiSystemPrompt", "isExtensionEnabled", "isDarkMode", "savedPrompts"]);

        // Xử lý API keys
        apiKeysContainer.innerHTML = "";
        let keys = syncResult.geminiApiKeys || [];

        if (keys.length > 0 && typeof keys[0] === 'string') {
            keys = keys.map(key => ({ key: key, status: 'active' }));
            await chrome.storage.sync.set({ geminiApiKeys: keys });
        }

        if (keys.length > 0) {
            keys.forEach(keyObj => createApiKeyInput(keyObj));
        } else {
            createApiKeyInput();
        }

        // Tải các cài đặt khác
        systemPromptInput.value = syncResult.geminiSystemPrompt || "";
        extensionToggle.checked = syncResult.isExtensionEnabled !== false;
        themeToggle.checked = syncResult.isDarkMode !== false;

        // Tải dữ liệu từ local storage
        const localResult = await chrome.storage.local.get(["lastQuestion", "lastAnswer"]);
        document.getElementById("lastQuestion").textContent = localResult.lastQuestion || "Chưa có câu hỏi nào.";
        document.getElementById("lastAnswer").textContent = localResult.lastAnswer || "Chưa có câu trả lời nào.";
    };


    // --- EVENT LISTENERS ---

    // API Key Modal Listeners
    manageApiButton.addEventListener("click", () => apiKeyModal.style.display = "block");
    closeApiKeyModalButton.addEventListener("click", () => apiKeyModal.style.display = "none");

    // Prompt Modal Listeners
    managePromptsButton.addEventListener("click", () => {
        loadPrompts(); // Tải danh sách prompts mỗi khi mở modal
        promptModal.style.display = "block";
    });
    closePromptModalButton.addEventListener("click", () => promptModal.style.display = "none");
    

    // General Modal close listener
    window.addEventListener("click", (event) => {
        if (event.target == apiKeyModal) apiKeyModal.style.display = "none";
        if (event.target == promptModal) promptModal.style.display = "none";
    });

    // API Key Actions
    addApiKeyButton.addEventListener("click", () => createApiKeyInput());
    saveKeysButton.addEventListener("click", () => {
        const apiKeyInputs = document.querySelectorAll(".apiKeyInput");
        const apiKeyObjects = Array.from(apiKeyInputs)
            .map((input) => ({ key: input.dataset.fullKey.trim(), status: 'active' }))
            .filter((obj) => obj.key !== "");

        if (apiKeyObjects.length === 0) {
            showNotification("⚠️ Vui lòng nhập ít nhất một API Key !", "error");
            return;
        }

        chrome.storage.sync.set({ geminiApiKeys: apiKeyObjects }, () => {
            showNotification("✓ Đã lưu và kích hoạt lại tất cả API Keys!", "success");
            apiKeyModal.style.display = "none";
            loadSettings();
        });
    });

    // Prompt Actions
    addPromptButton.addEventListener("click", () => createPromptInput());
    
    savePromptsButton.addEventListener("click", () => {
        const promptTextareas = promptsContainer.querySelectorAll("textarea");
        const prompts = Array.from(promptTextareas).map(textarea => textarea.value.trim()).filter(text => text !== "");
        
        chrome.storage.sync.set({ savedPrompts: prompts }, () => {
            showNotification("✓ Đã lưu danh sách prompts!", "success");
        });
    });

    applyPromptButton.addEventListener("click", () => {
        const selectedRadio = promptsContainer.querySelector('input[name="prompt-selection"]:checked');
        if (!selectedRadio) {
            showNotification("⚠️ Vui lòng chọn một prompt để áp dụng!", "error");
            return;
        }
        const promptText = selectedRadio.nextElementSibling.value.trim();
        systemPromptInput.value = promptText;
        
        // Cũng lưu prompt này làm prompt hệ thống hiện tại
        chrome.storage.sync.set({ geminiSystemPrompt: promptText }, () => {
            showNotification("✓ Đã áp dụng prompt!", "success");
            promptModal.style.display = "none";
        });
    });

    // Main Page Actions
    savePromptButton.addEventListener("click", () => {
        chrome.storage.sync.set({ geminiSystemPrompt: systemPromptInput.value.trim() }, () => {
            showNotification("✓ Đã lưu Prompt thành công !", "success");
        });
    });

    extensionToggle.addEventListener("change", () => {
        chrome.storage.sync.set({ isExtensionEnabled: extensionToggle.checked });
    });

    themeToggle.addEventListener("change", () => {
        chrome.storage.sync.set({ isDarkMode: themeToggle.checked });
    });

    loadSettings();
});