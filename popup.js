document.addEventListener("DOMContentLoaded", () => {
    // Main page elements
    const systemPromptInput = document.getElementById("systemPrompt");
    const savePromptButton = document.getElementById("savePromptButton");
    const manageApiButton = document.getElementById("manageApiButton");
    const extensionToggle = document.getElementById("extensionToggle");
    const themeToggle = document.getElementById("miniCircleToggle");

    // Modal elements
    const apiKeyModal = document.getElementById("apiKeyModal");
    const closeModalButton = document.querySelector(".close-button");
    const apiKeysContainer = document.getElementById("apiKeysContainer");
    const addApiKeyButton = document.getElementById("addApiKeyButton");
    const saveKeysButton = document.getElementById("saveKeysButton");

    const globalNotification = document.getElementById("globalNotification");
    let notificationTimeout;

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

        // Xử lý cho key đã lưu và key mới
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
            // Lưu lại danh sách các key còn lại ngay lập tức
            const apiKeyInputs = document.querySelectorAll(".apiKeyInput");
            const apiKeyObjects = Array.from(apiKeyInputs)
                .map(input => ({
                    key: input.dataset.fullKey.trim(),
                    // Giữ lại status cũ nếu có, nếu không thì mặc định là active
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

    const loadSettings = async () => {
        // Lấy cài đặt từ sync storage
        const syncResult = await chrome.storage.sync.get(["geminiApiKeys", "geminiSystemPrompt", "isExtensionEnabled", "isDarkMode"]);

        // Xử lý API keys
        apiKeysContainer.innerHTML = "";
        let keys = syncResult.geminiApiKeys || [];

        // Tự động chuyển đổi định dạng dữ liệu cũ
        if (keys.length > 0 && typeof keys[0] === 'string') {
            keys = keys.map(key => ({ key: key, status: 'active' }));
            // Lưu lại định dạng mới
            await chrome.storage.sync.set({ geminiApiKeys: keys });
        }

        if (keys.length > 0) {
            keys.forEach(keyObj => createApiKeyInput(keyObj));
        } else {
            createApiKeyInput(); // Hiển thị ô trống nếu không có key nào
        }

        // Tải các cài đặt khác
        systemPromptInput.value = syncResult.geminiSystemPrompt || "";
        extensionToggle.checked = syncResult.isExtensionEnabled !== false;
        themeToggle.checked = syncResult.isDarkMode !== false;

        // Tải dữ liệu từ local storage (câu hỏi/trả lời cuối)
        const localResult = await chrome.storage.local.get(["lastQuestion", "lastAnswer"]);
        document.getElementById("lastQuestion").textContent = localResult.lastQuestion || "Chưa có câu hỏi nào.";
        document.getElementById("lastAnswer").textContent = localResult.lastAnswer || "Chưa có câu trả lời nào.";
    };


    // --- Event Listeners ---
    manageApiButton.addEventListener("click", () => apiKeyModal.style.display = "block");

    closeModalButton.addEventListener("click", () => {
        apiKeyModal.style.display = "none";
        loadSettings(); // Tải lại setting để hủy các thay đổi chưa lưu
    });

    window.addEventListener("click", (event) => {
        if (event.target == apiKeyModal) {
            apiKeyModal.style.display = "none";
            loadSettings();
        }
    });

    addApiKeyButton.addEventListener("click", () => createApiKeyInput());

    saveKeysButton.addEventListener("click", () => {
        const apiKeyInputs = document.querySelectorAll(".apiKeyInput");
        const apiKeyObjects = Array.from(apiKeyInputs)
            .map((input) => ({
                key: input.dataset.fullKey.trim(),
                status: 'active' // Khi lưu, tất cả các key đều được reset về 'active'
            }))
            .filter((obj) => obj.key !== "");

        if (apiKeyObjects.length === 0) {
            showNotification("⚠️ Vui lòng nhập ít nhất một API Key !", "error");
            return;
        }

        chrome.storage.sync.set({ geminiApiKeys: apiKeyObjects }, () => {
            showNotification("✓ Đã lưu và kích hoạt lại tất cả API Keys!", "success");
            loadSettings();
        });
    });

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