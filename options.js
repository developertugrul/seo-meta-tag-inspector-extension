// Default settings
const defaultSettings = {
    analyzeMetaTags: true,
    analyzeOpenGraph: true,
    analyzeTwitterCards: true,
    analyzeHeadings: true,
    showLength: true,
    showEmptyTags: false
};

// Load saved settings
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(defaultSettings, (settings) => {
        document.getElementById('analyzeMetaTags').checked = settings.analyzeMetaTags;
        document.getElementById('analyzeOpenGraph').checked = settings.analyzeOpenGraph;
        document.getElementById('analyzeTwitterCards').checked = settings.analyzeTwitterCards;
        document.getElementById('analyzeHeadings').checked = settings.analyzeHeadings;
        document.getElementById('showLength').checked = settings.showLength;
        document.getElementById('showEmptyTags').checked = settings.showEmptyTags;
    });
});

// Save settings
document.getElementById('save').addEventListener('click', () => {
    const settings = {
        analyzeMetaTags: document.getElementById('analyzeMetaTags').checked,
        analyzeOpenGraph: document.getElementById('analyzeOpenGraph').checked,
        analyzeTwitterCards: document.getElementById('analyzeTwitterCards').checked,
        analyzeHeadings: document.getElementById('analyzeHeadings').checked,
        showLength: document.getElementById('showLength').checked,
        showEmptyTags: document.getElementById('showEmptyTags').checked
    };

    chrome.storage.sync.set(settings, () => {
        // Show save confirmation
        const status = document.createElement('div');
        status.textContent = 'Settings saved!';
        status.style.color = '#4CAF50';
        status.style.marginTop = '10px';
        document.getElementById('save').parentNode.appendChild(status);
        setTimeout(() => status.remove(), 2000);
    });
}); 