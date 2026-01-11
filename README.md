# 🤖 Gemini Quick Assistant (Question AI)

**Gemini Quick Assistant** is a Chrome Extension that lets you look up, translate, or ask questions with Gemini AI directly on the webpage you're viewing without switching tabs. Simply highlight the text, and the AI ​​will answer you instantly.

## ✨ Featured Features

### 🚀 Smart Interaction
* **Right-click Menu (Context Menu):** Highlight text -> Right-click -> Select **"Ask Gemini"** to get an answer.

* **Highlight Search:** (Optional) Automatically sends a request to the AI ​​as soon as you highlight the text and release the mouse button.

* **Review History:** The **"Show Last Answer"** feature in the right-click menu lets you review the results you just closed.

### 🔑 Powerful API Key Management
* **Multi-threaded API Key:** Supports adding multiple API Keys simultaneously.

* **Auto-rotation:** If a Key is rate-limited or faulty, the system will automatically switch to the next Key to ensure an uninterrupted experience.

* **Smart Locking Mechanism:** Automatically temporarily locks faulty Keys to avoid wasting time retrying.

### 🛠 Personalization
* **System Prompt Management:** Quickly save and switch between system prompts. Examples: *"Translate to Vietnamese"*, *"Explanation of terminology"*, *"Text summary"*.

* **Interface:** Supports **Dark Mode / Light Mode** for the results window displayed on the website.

* **Security:** The encrypted API Key is displayed and securely stored in your browser (Chrome Storage Sync).

---

## 📥 Installation Guide

Since this is a Developer Version, you need to install it manually:

1. **Download source code:** Clone the repository or download the project's ZIP file to your computer and extract it.

2. **Open your browser:** Access the address `chrome://extensions/` (on Chrome, Cốc Cốc, Brave...) or `edge://extensions/` (on Edge).

3. **Enable Developer mode:** Toggle the **"Developer mode"** button in the upper right corner.

4. **Load extension:** Click the **"Load unpacked"** button and select the folder containing the project's source code.

---

## ⚙️ Initial Configuration

To use, you need an **API Key** from Google Gemini (Free).

1. Access [Google AI Studio](https://aistudio.google.com/app/apikey) to get your API Key.

2. Click the **Question AI** Extension icon on your browser toolbar.

3. Click the **"Manage API Keys"** button.

4. Paste your Key and click the **`+`** or the **"Save and Activate"** button.

* *Tip:* You should create and add multiple Keys (2-3 keys) for extended use without worrying about the per-minute query limit.

---

## 📖 Usage Guide

### Method 1: Right-Click Menu (Recommended)

1. Highlight the text you want to process on the webpage.

2. Right-click and select **"Ask Gemini"**.

3. The results will appear in a small box right at the cursor's position.

### Method 2: Automatic Highlighting (Requires enabling in settings)
1. Open the Extension's Popup, turn on the switch next to the "Manage API Keys" (Highlight Search) button.

2. Simply highlight the text on the webpage, and the Extension will automatically send the request and display the results.

### Managing Prompts (Commands)
Instead of just translating or asking default questions, you can teach the AI ​​to do specific things:
1. Open the Extension's Popup.

2. Enter the command in the **"Fixed Prompt"** box. For example: *"Explain this vocabulary word in Vietnamese in a humorous style."*

3. Press **"Save Prompt"**.

4. From now on, all requests sent will include this instruction. You can save multiple different Prompts in the management section (gear icon).

---

## 📂 Project Structure

* `manifest.json`: Main configuration of the Extension (Manifest V3).

* `background.js`: Service Worker that handles Gemini API calls, manages the Key loop and Context Menu.

* `content.js`: Script that runs on the webpage to display the results UI (Results Popup), and captures mouse events.

* `popup.html` & `popup.js`: Settings interface, Key management, and Prompt.

## 🤝 Contributions
This project was developed by **HuyND**. Please submit any feedback via Issue or Pull Request.
