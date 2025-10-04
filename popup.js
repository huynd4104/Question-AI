document.addEventListener("DOMContentLoaded", () => {
    // Main page elements
    const systemPromptInput = document.getElementById("systemPrompt");
    const savePromptButton = document.getElementById("savePromptButton");
    const manageApiButton = document.getElementById("manageApiButton");
    const extensionToggle = document.getElementById("extensionToggle");

    // Modal elements
    const apiKeyModal = document.getElementById("apiKeyModal");
    const closeModalButton = document.querySelector(".close-button");
    const apiKeysContainer = document.getElementById("apiKeysContainer");
    const addApiKeyButton = document.getElementById("addApiKeyButton");
    const saveKeysButton = document.getElementById("saveKeysButton");

    const globalNotification = document.getElementById("globalNotification");
    let notificationTimeout; // Quản lý thời gian hiển thị

    // --- Helper Functions ---
    const createApiKeyInput = (value = "") => {
        const div = document.createElement("div");
        div.className = "api-key-item";
        const input = document.createElement("input");
        input.type = "password";
        input.className = "apiKeyInput";
        input.placeholder = "Nhập API key...";
        input.value = value;
        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-key-btn";
        removeBtn.textContent = "Xóa";
        removeBtn.onclick = () => div.remove();
        div.appendChild(input);
        div.appendChild(removeBtn);
        apiKeysContainer.appendChild(div);
    };

    const showNotification = (message, type, duration = 3000) => {
        // Xóa timeout cũ nếu có, để thông báo mới hiển thị đủ thời gian
        if (notificationTimeout) {
            clearTimeout(notificationTimeout);
        }

        globalNotification.textContent = message;
        // Reset class và gán class mới (success hoặc error)
        globalNotification.className = `global-notification ${type}`;

        setTimeout(() => {
            globalNotification.classList.add("show");
        }, 10);

        // Tự động ẩn thông báo sau một khoảng thời gian
        notificationTimeout = setTimeout(() => {
            globalNotification.classList.remove("show");
        }, duration);
    };

    // --- Load All Settings ---
    const loadSettings = () => {
        // Load settings from chrome.storage.sync
        chrome.storage.sync.get(["geminiApiKeys", "geminiSystemPrompt", "isExtensionEnabled"], (syncResult) => {
            // Load API Keys into modal
            apiKeysContainer.innerHTML = "";
            const keys = syncResult.geminiApiKeys || [];
            if (keys.length > 0) {
                keys.forEach((key) => createApiKeyInput(key));
            } else {
                createApiKeyInput();
            }
            // Load System Prompt
            systemPromptInput.value = syncResult.geminiSystemPrompt || "";
            // Load Toggle Switch State (default to true/enabled)
            extensionToggle.checked = syncResult.isExtensionEnabled !== false;

            // Load lastQuestion and lastAnswer from chrome.storage.local
            chrome.storage.local.get(["lastQuestion", "lastAnswer"], (localResult) => {
                const lastQuestionDiv = document.getElementById("lastQuestion");
                const lastAnswerDiv = document.getElementById("lastAnswer");
                lastQuestionDiv.textContent = localResult.lastQuestion || "Chưa có câu hỏi nào.";
                lastAnswerDiv.textContent = localResult.lastAnswer || "Chưa có câu trả lời nào.";
            });
        });
    };

    // --- Event Listeners ---

    // Modal controls
    manageApiButton.addEventListener("click", () => apiKeyModal.style.display = "block");
    closeModalButton.addEventListener("click", () => apiKeyModal.style.display = "none");
    window.addEventListener("click", (event) => {
        if (event.target == apiKeyModal) {
            apiKeyModal.style.display = "none";
        }
    });
    addApiKeyButton.addEventListener("click", () => createApiKeyInput());

    // Save API Keys (inside modal)
    saveKeysButton.addEventListener("click", () => {
        const apiKeyInputs = document.querySelectorAll(".apiKeyInput");
        const apiKeys = Array.from(apiKeyInputs)
            .map((input) => input.value.trim())
            .filter((key) => key !== "");

        if (apiKeys.length === 0) {
            showNotification("⚠️ Vui lòng nhập ít nhất một API Key!", "error");
            return;
        }

        chrome.storage.sync.set({ geminiApiKeys: apiKeys }, () => {
            showNotification("✓ Đã lưu API Keys thành công!", "success");
            setTimeout(() => {
                 apiKeyModal.style.display = "none";
            }, 500); // Tự động đóng modal sau khi lưu thành công
        });
    });

    savePromptButton.addEventListener("click", () => {
        chrome.storage.sync.set({ geminiSystemPrompt: systemPromptInput.value.trim() }, () => {
            showNotification("✓ Đã lưu Prompt thành công!", "success");
        });
    });

    // Extension Enable/Disable Toggle
    extensionToggle.addEventListener("change", () => {
        chrome.storage.sync.set({ isExtensionEnabled: extensionToggle.checked });
    });

    // Initial load
    loadSettings();
});