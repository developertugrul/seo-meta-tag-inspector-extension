// Sayfa yüklendiğinde analiz verilerini al
document.addEventListener('DOMContentLoaded', async () => {
  // Ana container'ı oluştur
  const output = document.getElementById('output');
  output.innerHTML = `
    <div class="url-input-container">
      <div class="header-section">
        <h2>SEO Meta Inspector</h2>
        
        <a href="#" id="optionsLink" class="options-link">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 13a3 3 0 100-6 3 3 0 000 6z" fill="currentColor"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0a6 6 0 11-12 0 6 6 0 0112 0z" fill="currentColor"/>
          </svg>
          Settings
        </a>
      </div>
      <p>
        This extension is free and open source. You can contribute to the project on <a href="https://github.com/developertugrul/seo-meta-tag-inspector-extension" target="_blank">GitHub</a>.
        <br>
        <br>
        <a href="https://chokqu.com" target="_blank">chokqu.com</a>
    </p>
      <form id="urlForm" class="url-form">
        <input 
          type="url" 
          id="urlInput" 
          placeholder="https://example.com" 
          required
          class="url-input"
        >
        <button type="submit" class="analyze-btn">Analyze</button>
      </form>
    </div>
    <div id="analysisResults" class="analysis-results"></div>
  `;

  // Options link click handler
  document.getElementById('optionsLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // URL form submit handler
  document.getElementById('urlForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = document.getElementById('urlInput').value;
    
    // Loading durumunu göster
    document.getElementById('analysisResults').innerHTML = `
      <div class="loading-message">
        Analyzing ${url}...
      </div>
    `;
    
    try {
      // URL'i aç ve analiz et
      const tab = await chrome.tabs.create({ url, active: false });
      
      // Sayfanın yüklenmesini bekle ve analiz et
      setTimeout(() => {
        chrome.scripting.executeScript({
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
              const name = meta.getAttribute('name');
              const property = meta.getAttribute('property');
              const content = meta.getAttribute('content') || '';
              
              // OpenGraph tags
              if (property && property.startsWith('og:')) {
                acc.openGraph.push({ 
                  name: property, 
                  content, 
                  length: content.length 
                });
              }
              // Twitter Card tags
              else if (name && name.startsWith('twitter:')) {
                acc.twitter.push({ 
                  name, 
                  content, 
                  length: content.length 
                });
              }
              // Standard meta tags
              else if (name || property) {
                acc.standard.push({ 
                  name: name || property, 
                  content, 
                  length: content.length 
                });
              }
              return acc;
            }, { 
              openGraph: [], 
              twitter: [], 
              standard: [] 
            });

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

            return { 
              url: window.location.href,
              title, 
              metaTags, 
              outline, 
              schemas 
            };
          }
        }, (results) => {
          if (results && results[0] && results[0].result) {
            displayAnalysisData(results[0].result);
            chrome.tabs.remove(tab.id);
          } else {
            document.getElementById('analysisResults').innerHTML = `
              <div class="error-message">
                Failed to analyze URL. Please try again.
              </div>
            `;
          }
        });
      }, 2000); // 2 saniye bekle
    } catch (error) {
      console.error('Analysis failed:', error);
      document.getElementById('analysisResults').innerHTML = `
        <div class="error-message">
          Failed to analyze URL. Please make sure the URL is valid and try again.
        </div>
      `;
    }
  });

  // Background script'ten analiz verilerini al
  chrome.runtime.sendMessage({ type: 'getAnalysisData' }, (response) => {
    if (response && response.data) {
      // URL input'u doldur
      document.getElementById('urlInput').value = response.data.url || '';
      // Analiz verilerini göster
      displayAnalysisData(response.data);
    }
  });
});

// Analiz verilerini görüntüle
function displayAnalysisData(data) {
  const resultsContainer = document.getElementById('analysisResults');
  resultsContainer.className = 'tables-container';

  // Create tables container
  const tablesContainer = document.createElement('div');
  tablesContainer.className = 'tables-wrapper';

  // Create Title section
  const titleSection = document.createElement('div');
  titleSection.className = 'table-section';
  titleSection.innerHTML = `
    <h2>Page Title</h2>
    <div class="title-content">
      <p>${data.title}</p>
      <small>Length: ${data.title.length} characters</small>
    </div>
  `;

  // Create tables
  const standardTable = createTable(
    'Standard Meta Tags',
    data.metaTags.standard,
    ['Meta Tag', 'Content', 'Length']
  );

  const ogTable = createTable(
    'OpenGraph Tags',
    data.metaTags.openGraph,
    ['Property', 'Content', 'Length']
  );

  const twitterTable = createTable(
    'Twitter Cards',
    data.metaTags.twitter,
    ['Property', 'Content', 'Length']
  );

  // Create Schema Markup table
  const schemaTable = document.createElement('div');
  schemaTable.className = 'table-section';
  schemaTable.innerHTML = `
    <h2>Schema Markup</h2>
    <div class="schema-content">
      ${data.schemas.map((schema, index) => `
        <div class="schema-item">
          <h3>Schema ${index + 1}</h3>
          <pre>${JSON.stringify(schema, null, 2)}</pre>
        </div>
      `).join('')}
    </div>
  `;

  // Create HTML Outline table
  const outlineTable = document.createElement('div');
  outlineTable.className = 'table-section';
  outlineTable.innerHTML = `
    <h2>HTML Outline</h2>
    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Heading</th>
            <th>Content</th>
            <th>Path</th>
          </tr>
        </thead>
        <tbody>
          ${data.outline.map(h => `
            <tr>
              <td>${h.level}</td>
              <td style="padding-left: ${h.indent * 20}px">${h.content}</td>
              <td><small>${h.path}</small></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Append all tables
  tablesContainer.appendChild(titleSection);
  tablesContainer.appendChild(standardTable);
  tablesContainer.appendChild(ogTable);
  tablesContainer.appendChild(twitterTable);
  tablesContainer.appendChild(schemaTable);
  tablesContainer.appendChild(outlineTable);
  resultsContainer.innerHTML = '';
  resultsContainer.appendChild(tablesContainer);
}

// Table creation helper
function createTable(title, data, headers) {
  const section = document.createElement('div');
  section.className = 'table-section';
  
  if (data.length === 0) {
    section.innerHTML = `
      <h2>${title}</h2>
      <div class="empty-state">No ${title.toLowerCase()} found</div>
    `;
    return section;
  }

  section.innerHTML = `
    <h2>${title}</h2>
    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            ${headers.map(h => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.content}</td>
              <td>${item.length}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  return section;
}

function getIndentation(level) {
  const indentationMap = {
    'h1': 0,
    'h2': 2,
    'h3': 4,
    'h4': 6,
    'h5': 8,
    'h6': 10
  };
  return indentationMap[level] || 0;
}
  