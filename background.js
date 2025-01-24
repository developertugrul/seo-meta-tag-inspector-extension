// Global değişken olarak son analiz edilen veriyi tutacağız
let lastAnalyzedData = null;

// Service Worker başlatma
chrome.runtime.onInstalled.addListener(() => {
  console.log('SEO Meta Inspector installed');
});

// İkon tıklamasını dinle ve analiz yap
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Önce veriyi analiz et
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Get all meta tags, title, headings and schema
        const metas = Array.from(document.querySelectorAll('meta'));
        const title = document.querySelector('title')?.textContent || '';
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        const schemaScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        
        // Parse schema markup
        const schemas = schemaScripts.map(script => {
          try {
            return JSON.parse(script.textContent);
          } catch (e) {
            return null;
          }
        }).filter(schema => schema !== null);

        // Categorize meta tags
        const metaTags = metas.reduce((acc, meta) => {
          const name = meta.getAttribute('name') || meta.getAttribute('property') || '';
          const content = meta.getAttribute('content') || '';
          
          if (name.startsWith('og:')) {
            acc.openGraph.push({ name, content, length: content.length });
          } else if (name.startsWith('twitter:')) {
            acc.twitter.push({ name, content, length: content.length });
          } else {
            acc.standard.push({ name, content, length: content.length });
          }
          return acc;
        }, { openGraph: [], twitter: [], standard: [] });

        // Create hierarchical HTML outline
        const outline = [];
        let lastLevel = { h1: null, h2: null, h3: null, h4: null, h5: null, h6: null };

        headings.forEach(heading => {
          const level = parseInt(heading.tagName[1]);
          const content = heading.textContent.trim();
          
          for (let i = level + 1; i <= 6; i++) {
            lastLevel[`h${i}`] = null;
          }
          
          lastLevel[`h${level}`] = content;
          
          outline.push({
            level: heading.tagName.toLowerCase(),
            content: content,
            indent: level - 1,
            path: Object.entries(lastLevel)
              .filter(([_, value]) => value !== null)
              .map(([_, value]) => value)
              .join(' > ')
          });
        });

        return { title, metaTags, outline, schemas };
      }
    });

    // Analiz sonuçlarını sakla
    lastAnalyzedData = results[0].result;
    
    // Sonra yeni sekmede aç
    chrome.tabs.create({
      url: 'popup.html',
      active: true
    });
  } catch (error) {
    console.error('Analysis failed:', error);
  }
});

// Popup'tan gelen mesajları dinle
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getAnalysisData') {
    // Saklanan analiz verilerini gönder
    sendResponse({ data: lastAnalyzedData });
    return true;
  }
});

// Klavye kısayollarını dinle
chrome.commands.onCommand.addListener((command) => {
  if (command === '_execute_action') {
    chrome.tabs.create({
      url: 'popup.html',
      active: true
    });
  }
});

// Sekme değişikliklerini dinle
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log('Tab changed:', activeInfo.tabId);
});

// Sekme güncellemelerini dinle
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log('Tab updated:', tab.url);
  }
}); 