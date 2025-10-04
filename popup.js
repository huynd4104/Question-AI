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

    // Tách hàm lưu ra để có thể tái sử dụng
    const saveCurrentKeys = (showSuccessNotification = true) => {
        const apiKeyInputs = document.querySelectorAll(".apiKeyInput");
        const apiKeys = Array.from(apiKeyInputs)
            .map((input) => input.dataset.fullKey.trim())
            .filter((key) => key !== "");

        chrome.storage.sync.set({ geminiApiKeys: apiKeys }, () => {
            if (showSuccessNotification) {
                showNotification("✓ Đã cập nhật danh sách API Keys !", "success");
            }
            // Tải lại danh sách để đảm bảo UI đồng bộ sau khi lưu hoặc xóa
             setTimeout(() => {
                loadSettings();
            }, 500);
        });
    };

    const createApiKeyInput = (value = "") => {
        const div = document.createElement("div");
        div.className = "api-key-item";

        const input = document.createElement("input");
        input.type = "text";
        input.className = "apiKeyInput";
        input.dataset.fullKey = value;
        input.value = maskApiKey(value);

        if (value) {
            input.readOnly = true;
            input.classList.add("readonly-key");
            input.title = "API key đã được lưu và bảo mật";
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
            // Xóa phần tử khỏi giao diện
            div.remove();
            // Lưu lại danh sách các key còn lại
            const apiKeyInputs = document.querySelectorAll(".apiKeyInput");
            const apiKeys = Array.from(apiKeyInputs)
                .map((input) => input.dataset.fullKey.trim())
                .filter((key) => key !== "");
                
            chrome.storage.sync.set({ geminiApiKeys: apiKeys }, () => {
                 showNotification("Đã xóa API Key !", "success");
            });
        };

        div.appendChild(input);
        div.appendChild(removeBtn);
        apiKeysContainer.appendChild(div);
    };

    const loadSettings = () => {
        chrome.storage.sync.get(["geminiApiKeys", "geminiSystemPrompt", "isExtensionEnabled", "isDarkMode"], (syncResult) => {
            apiKeysContainer.innerHTML = "";
            const keys = syncResult.geminiApiKeys || [];
            if (keys.length > 0) {
                keys.forEach((key) => createApiKeyInput(key));
            } else {
                // Nếu không có key nào, luôn hiển thị một ô trống để người dùng nhập
                createApiKeyInput();
            }
            systemPromptInput.value = syncResult.geminiSystemPrompt || "";
            extensionToggle.checked = syncResult.isExtensionEnabled !== false;
            themeToggle.checked = syncResult.isDarkMode !== false;
            chrome.storage.local.get(["lastQuestion", "lastAnswer"], (localResult) => {
                document.getElementById("lastQuestion").textContent = localResult.lastQuestion || "Chưa có câu hỏi nào.";
                document.getElementById("lastAnswer").textContent = localResult.lastAnswer || "Chưa có câu trả lời nào.";
            });
        });
    };

    // --- Event Listeners ---
    manageApiButton.addEventListener("click", () => apiKeyModal.style.display = "block");
    closeModalButton.addEventListener("click", () => {
        apiKeyModal.style.display = "none";
        loadSettings(); // Tải lại setting khi đóng modal để hủy các thay đổi chưa lưu
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
        const apiKeys = Array.from(apiKeyInputs)
            .map((input) => input.dataset.fullKey.trim())
            .filter((key) => key !== "");

        if (apiKeys.length === 0) {
            showNotification("⚠️ Vui lòng nhập ít nhất một API Key !", "error");
            return;
        }
        
        saveCurrentKeys(true);
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