# Fluxo de Dados: tab-url-extractor

## 🔄 Visão Geral

Este documento descreve o fluxo completo de dados através das camadas do **tab-url-extractor**, desde a interação do usuário até a exportação final, incluindo protocolos de comunicação, tratamento de erros e diagramas de sequência.

## 🎯 Princípios de Fluxo

1. **Unidirecional**: Dados fluem em uma direção clara (UI → Service Worker → Core → Infrastructure)
2. **Assíncrono**: Todas as operações são assíncronas (Promises)
3. **Estado temporário em memória**: O Service Worker mantém estado **apenas em memória** entre "Analisar" e "Exportar" (ex: `currentMatrices`). Não há persistência (IndexedDB/localStorage) e o estado pode ser perdido quando o Service Worker é suspenso/reiniciado.
4. **Isolado**: Cada camada processa dados independentemente
5. **Rastreável**: Cada etapa pode ser logada e debugada

---

## 📊 Fluxo Principal: Análise de Abas

### Diagrama de Sequência

```
┌──────┐         ┌────────┐         ┌────────────────┐         ┌──────────┐         ┌──────────┐
│ User │         │ Popup  │         │ Service Worker │         │   Core   │         │ Infra    │
└──┬───┘         └───┬────┘         └───────┬────────┘         └────┬─────┘         └────┬─────┘
   │                 │                      │                       │                    │
   │ Clica "Analisar"│                      │                       │                    │
   ├────────────────>│                      │                       │                    │
   │                 │                      │                       │                    │
   │                 │ sendMessage({        │                       │                    │
   │                 │   action: "analyze"  │                       │                    │
   │                 │ })                   │                       │                    │
   │                 ├─────────────────────>│                       │                    │
   │                 │                      │                       │                    │
   │                 │                      │ TabCollector.collect()│                    │
   │                 │                      ├──────────────────────>│                    │
   │                 │                      │                       │ chrome.tabs.query()│
   │                 │                      │                       ├───────────────────>│
   │                 │                      │                       │                    │
   │                 │                      │                       │    RawTab[]        │
   │                 │                      │                       │<───────────────────┤
   │                 │                      │       RawTab[]        │                    │
   │                 │                      │<──────────────────────┤                    │
   │                 │                      │                       │                    │
   │                 │                      │ UrlProcessor.process()│                    │
   │                 │                      ├──────────────────────>│                    │
   │                 │                      │                       │                    │
   │                 │                      │   UrlEntry[] (norm.)  │                    │
   │                 │                      │<──────────────────────┤                    │
   │                 │                      │                       │                    │
   │                 │                      │ MatrixBuilder.build() │                    │
   │                 │                      ├──────────────────────>│                    │
   │                 │                      │                       │                    │
   │                 │                      │    UrlMatrix[]        │                    │
   │                 │                      │<──────────────────────┤                    │
   │                 │                      │                       │                    │
   │                 │ Response: {          │                       │                    │
   │                 │   status: "success", │                       │                    │
   │                 │   matrices: [...]    │                       │                    │
   │                 │ }                    │                       │                    │
   │                 │<─────────────────────┤                       │                    │
   │                 │                      │                       │                    │
   │                 │ renderMatrices()     │                       │                    │
   │                 ├──┐                   │                       │                    │
   │                 │  │ Atualiza UI       │                       │                    │
   │                 │<─┘                   │                       │                    │
   │                 │                      │                       │                    │
   │  Visualiza lista│                      │                       │                    │
   │<────────────────┤                      │                       │                    │
   │                 │                      │                       │                    │
```

### Fluxo Detalhado por Etapa

#### Etapa 1: Interação do Usuário

**Ação**: Usuário clica no botão "Analisar"

**Camada**: UI (Popup)

**Código**:
```javascript
// popup.js
document.getElementById('analyze-btn').addEventListener('click', async () => {
  showLoading();
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'analyze' });
    
    if (response.status === 'success') {
      hideLoading();
      renderMatrices(response.matrices);
      showState('ready');
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    hideLoading();
    showError(error.message);
    Logger.error('Analyze failed in UI', error);
  }
});
```

**Entrada**: Evento de clique
**Saída**: Mensagem enviada ao Service Worker

---

#### Etapa 2: Recepção no Service Worker

**Ação**: Service Worker recebe mensagem "analyze"

**Camada**: Orchestration (Service Worker)

**Código**:
```javascript
// service-worker.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'analyze') {
    handleAnalyze(sendResponse);
    return true; // Mantém canal aberto para resposta assíncrona
  }
});

async function handleAnalyze(sendResponse) {
  Logger.info('Starting tab analysis');
  
  try {
    // Etapa 3: Coleta
    const rawTabs = await TabCollector.collect();
    Logger.info(`Collected ${rawTabs.length} tabs`);
    
    // Etapa 4: Processamento
    const urlEntries = UrlProcessor.process(rawTabs);
    Logger.info(`Processed ${urlEntries.length} unique URLs`);
    
    // Etapa 5: Agrupamento
    const matrices = MatrixBuilder.build(urlEntries);
    Logger.info(`Built ${matrices.length} matrices`);
    
    // Etapa 6: Resposta
    sendResponse({
      status: 'success',
      matrices: matrices
    });
  } catch (error) {
    Logger.error('Tab analysis failed', error);
    sendResponse({
      status: 'error',
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    });
  }
}
```

**Entrada**: `{ action: "analyze" }`
**Saída**: `{ status: "success", matrices: [...] }` ou `{ status: "error", error: "..." }`

---

#### Etapa 3: Coleta de Abas

**Ação**: Coletar todas as abas abertas via Chrome API

**Camada**: Infrastructure (TabCollector)

**Código**:
```javascript
// infrastructure/tab-collector.js
export class TabCollector {
  static async collect() {
    try {
      const tabs = await chrome.tabs.query({});
      
      const validTabs = tabs.filter(tab => this.isValidTab(tab));
      
      const rawTabs = validTabs.map(tab => this.mapToRawTab(tab));
      
      if (rawTabs.length === 0) {
        throw new Error('No valid tabs found');
      }
      
      return rawTabs;
    } catch (error) {
      Logger.error('Failed to collect tabs', error);
      throw error;
    }
  }
  
  static isValidTab(tab) {
    // Ignora URLs de sistema
    if (!tab.url) return false;
    if (tab.url.startsWith('chrome://')) return false;
    if (tab.url.startsWith('chrome-extension://')) return false;
    if (tab.url.startsWith('about:')) return false;
    return true;
  }
  
  static mapToRawTab(tab) {
    return {
      url: tab.url,
      title: tab.title || '',
      tabId: tab.id,
      windowId: tab.windowId
    };
  }
}
```

**Entrada**: Nenhuma (acessa Chrome API diretamente)
**Saída**: `RawTab[]`

**Exemplo de Saída**:
```javascript
[
  {
    url: "https://www.youtube.com/watch?v=abc123",
    title: "Video Title",
    tabId: 123,
    windowId: 1
  },
  {
    url: "https://github.com/user/repo",
    title: "GitHub Repo",
    tabId: 124,
    windowId: 1
  }
]
```

---

#### Etapa 4: Processamento de URLs

**Ação**: Normalizar e deduplicar URLs

**Camada**: Core (UrlProcessor)

**Código**:
```javascript
// core/url-processor.js
export class UrlProcessor {
  static process(rawTabs) {
    const normalized = this.normalize(rawTabs);
    const deduplicated = this.deduplicate(normalized);
    return deduplicated;
  }
  
  static normalize(rawTabs) {
    return rawTabs.map(rawTab => {
      const normalizedUrl = this.normalizeUrl(rawTab.url);
      const domain = this.extractDomain(normalizedUrl);
      
      return {
        url: rawTab.url,
        normalizedUrl: normalizedUrl,
        domain: domain,
        origin: 'tab',
        metadata: {
          title: rawTab.title,
          tabId: rawTab.tabId,
          windowId: rawTab.windowId
        }
      };
    });
  }
  
  static normalizeUrl(url) {
    try {
      const urlObj = new URL(url);
      
      // Lowercase domain
      urlObj.hostname = urlObj.hostname.toLowerCase();
      
      // Remove www. prefix
      if (urlObj.hostname.startsWith('www.')) {
        urlObj.hostname = urlObj.hostname.substring(4);
      }
      
      // Remove trailing slash (except for root)
      if (urlObj.pathname !== '/' && urlObj.pathname.endsWith('/')) {
        urlObj.pathname = urlObj.pathname.slice(0, -1);
      }
      
      // Remove tracking parameters
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
      trackingParams.forEach(param => urlObj.searchParams.delete(param));
      
      // Remove fragment (hash) - pode ser opcional dependendo do caso
      urlObj.hash = '';
      
      return urlObj.toString();
    } catch (error) {
      Logger.warn(`Failed to normalize URL: ${url}`, error);
      return url; // Retorna original se falhar
    }
  }
  
  static extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.toLowerCase();
    } catch {
      return '';
    }
  }
  
  static deduplicate(urlEntries) {
    const seen = new Set();
    return urlEntries.filter(entry => {
      if (seen.has(entry.normalizedUrl)) {
        return false;
      }
      seen.add(entry.normalizedUrl);
      return true;
    });
  }
}
```

**Entrada**: `RawTab[]`
**Saída**: `UrlEntry[]` (normalizado e deduplicado)

**Exemplo de Transformação**:
```javascript
// Entrada
{
  url: "https://WWW.YouTube.COM/watch?v=abc123&utm_source=share#t=30",
  title: "Video"
}

// Saída
{
  url: "https://WWW.YouTube.COM/watch?v=abc123&utm_source=share#t=30",
  normalizedUrl: "https://youtube.com/watch?v=abc123",
  domain: "youtube.com",
  origin: "tab",
  metadata: { title: "Video", tabId: 123, windowId: 1 }
}
```

---

#### Etapa 5: Construção de Matrizes

**Ação**: Agrupar URLs por domínio e criar UrlMatrix

**Camada**: Core (MatrixBuilder)

**Código**:
```javascript
// core/matrix-builder.js
export class MatrixBuilder {
  static build(urlEntries) {
    const grouped = this.groupByDomain(urlEntries);
    const matrices = this.createMatrices(grouped);
    return this.sortByUrlCount(matrices);
  }
  
  static groupByDomain(urlEntries) {
    const grouped = new Map();
    
    urlEntries.forEach(entry => {
      const domain = entry.domain;
      
      if (!grouped.has(domain)) {
        grouped.set(domain, []);
      }
      
      grouped.get(domain).push(entry);
    });
    
    return grouped;
  }
  
  static createMatrices(grouped) {
    const matrices = [];
    
    grouped.forEach((urls, domain) => {
      const matrixId = this.generateMatrixId(domain);
      
      // Adiciona matrixId em cada URL
      const urlsWithMatrixId = urls.map(url => ({
        ...url,
        matrixId: matrixId
      }));
      
      matrices.push({
        id: matrixId,
        label: domain,
        criterion: 'domain',
        criterionValue: domain,
        urlCount: urls.length,
        urls: urlsWithMatrixId,
        createdAt: new Date().toISOString()
      });
    });
    
    return matrices;
  }
  
  static generateMatrixId(domain) {
    // Sanitiza domínio para usar em ID
    const sanitized = domain.replace(/[^a-z0-9]/gi, '-');
    return `matrix-domain-${sanitized}`;
  }
  
  static sortByUrlCount(matrices) {
    return matrices.sort((a, b) => b.urlCount - a.urlCount);
  }
}
```

**Entrada**: `UrlEntry[]`
**Saída**: `UrlMatrix[]` (ordenado por urlCount decrescente)

**Exemplo de Saída**:
```javascript
[
  {
    id: "matrix-domain-youtube-com",
    label: "youtube.com",
    criterion: "domain",
    criterionValue: "youtube.com",
    urlCount: 15,
    urls: [/* 15 UrlEntries */],
    createdAt: "2025-01-15T10:30:00.000Z"
  },
  {
    id: "matrix-domain-github-com",
    label: "github.com",
    criterion: "domain",
    criterionValue: "github.com",
    urlCount: 8,
    urls: [/* 8 UrlEntries */],
    createdAt: "2025-01-15T10:30:00.000Z"
  }
]
```

---

#### Etapa 6: Renderização na UI

**Ação**: Exibir lista de URL-Matriz na interface

**Camada**: UI (Popup)

**Código**:
```javascript
// popup.js
function renderMatrices(matrices) {
  const container = document.getElementById('matrices-container');
  container.innerHTML = ''; // Limpa conteúdo anterior
  
  matrices.forEach(matrix => {
    const matrixElement = createMatrixElement(matrix);
    container.appendChild(matrixElement);
  });
}

function createMatrixElement(matrix) {
  const div = document.createElement('div');
  div.className = 'matrix-item';
  div.dataset.matrixId = matrix.id;
  
  div.innerHTML = `
    <div class="matrix-header">
      <span class="matrix-label">${matrix.label}</span>
      <span class="matrix-count">${matrix.urlCount} URLs</span>
    </div>
    <button class="btn-extract" data-matrix-id="${matrix.id}">
      Extrair
    </button>
  `;
  
  // Event listener para botão de exportação individual
  const extractBtn = div.querySelector('.btn-extract');
  extractBtn.addEventListener('click', () => {
    handleExport([matrix.id], 'json');
  });
  
  return div;
}
```

**Entrada**: `UrlMatrix[]`
**Saída**: Elementos DOM renderizados

---

## 📤 Fluxo Secundário: Exportação de Dados

### Diagrama de Sequência

```
┌──────┐         ┌────────┐         ┌────────────────┐         ┌──────────┐         ┌──────────┐
│ User │         │ Popup  │         │ Service Worker │         │   Core   │         │ Infra    │
└──┬───┘         └───┬────┘         └───────┬────────┘         └────┬─────┘         └────┬─────┘
   │                 │                      │                       │                    │
   │ Clica "Extrair" │                      │                       │                    │
   ├────────────────>│                      │                       │                    │
   │                 │                      │                       │                    │
   │                 │ sendMessage({        │                       │                    │
   │                 │   action: "export",  │                       │                    │
   │                 │   matrixIds: [...],  │                       │                    │
   │                 │   format: "json"     │                       │                    │
   │                 │ })                   │                       │                    │
   │                 ├─────────────────────>│                       │                    │
   │                 │                      │                       │                    │
   │                 │                      │ Filtra matrizes       │                    │
   │                 │                      ├──┐                    │                    │
   │                 │                      │  │ (se parcial)       │                    │
   │                 │                      │<─┘                    │                    │
   │                 │                      │                       │                    │
   │                 │                      │ Exporter.toJSON()     │                    │
   │                 │                      ├──────────────────────>│                    │
   │                 │                      │                       │                    │
   │                 │                      │    ExportData (JSON)  │                    │
   │                 │                      │<──────────────────────┤                    │
   │                 │                      │                       │                    │
   │                 │                      │ DownloadManager.create()                   │
   │                 │                      ├───────────────────────────────────────────>│
   │                 │                      │                       │                    │
   │                 │                      │                       │ chrome.downloads   │
   │                 │                      │                       │    .download()     │
   │                 │                      │                       │<───────────────────┤
   │                 │                      │                       │                    │
   │                 │                      │        downloadId     │                    │
   │                 │                      │<───────────────────────────────────────────┤
   │                 │                      │                       │                    │
   │                 │ Response: {          │                       │                    │
   │                 │   status: "success", │                       │                    │
   │                 │   downloadId: 42     │                       │                    │
   │                 │ }                    │                       │                    │
   │                 │<─────────────────────┤                       │                    │
   │                 │                      │                       │                    │
   │                 │ showSuccess()        │                       │                    │
   │                 ├──┐                   │                       │                    │
   │                 │<─┘                   │                       │                    │
   │                 │                      │                       │                    │
   │  Arquivo baixado│                      │                       │                    │
   │<────────────────┤                      │                       │                    │
   │                 │                      │                       │                    │
```

### Fluxo Detalhado por Etapa

#### Etapa 1: Clique em "Extrair"

**Ação**: Usuário clica em "Extrair" (individual ou "Extrair todos")

**Camada**: UI (Popup)

**Código**:
```javascript
// popup.js

// Exportação individual
document.querySelectorAll('.btn-extract').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const matrixId = e.target.dataset.matrixId;
    handleExport([matrixId], 'json');
  });
});

// Exportação completa
document.getElementById('export-all-btn').addEventListener('click', () => {
  handleExport([], 'json'); // [] = todas as matrizes
});

async function handleExport(matrixIds, format) {
  showExportLoading();
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'export',
      matrixIds: matrixIds,
      format: format
    });
    
    if (response.status === 'success') {
      hideExportLoading();
      showSuccess(`Arquivo ${response.filename} baixado com sucesso!`);
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    hideExportLoading();
    showError(`Falha na exportação: ${error.message}`);
    Logger.error('Export failed in UI', error);
  }
}
```

**Entrada**: matrixIds (array de IDs ou [] para todos), format ("json", "txt" ou "txt-simple")
**Saída**: Mensagem enviada ao Service Worker

---

#### Etapa 2: Processamento da Exportação

**Ação**: Service Worker processa requisição de exportação

**Camada**: Orchestration (Service Worker)

**Código**:
```javascript
// service-worker.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'export') {
    handleExport(message.matrixIds, message.format, sendResponse);
    return true;
  }
});

async function handleExport(matrixIds, format, sendResponse) {
  Logger.info('Starting export', { matrixIds, format });
  
  try {
    // Filtra matrizes (se exportação parcial)
    let matricesToExport;
    
    if (matrixIds.length === 0) {
      // Exportação completa
      matricesToExport = currentMatrices;
    } else {
      // Exportação parcial
      matricesToExport = currentMatrices.filter(m => 
        matrixIds.includes(m.id)
      );
    }
    
    if (matricesToExport.length === 0) {
      throw new Error('No matrices to export');
    }
    
    // Formata dados
    let content;
    let mimeType;
    let extension;
    
    if (format === 'json') {
      const exportType = matrixIds.length === 0 ? 'full' : 'partial';
      content = JSON.stringify(
        Exporter.toJSON(matricesToExport, exportType),
        null,
        2
      );
      mimeType = 'application/json';
      extension = 'json';
    } else if (format === 'txt') {
      content = Exporter.toTXT(matricesToExport);
      mimeType = 'text/plain';
      extension = 'txt';
    } else {
      throw new Error(`Invalid format: ${format}`);
    }
    
    // Cria download
    const filename = DownloadManager.generateFilename(extension);
    const downloadId = await DownloadManager.create(content, filename, mimeType);
    
    Logger.info('Export successful', { downloadId, filename });
    
    sendResponse({
      status: 'success',
      downloadId: downloadId,
      filename: filename
    });
  } catch (error) {
    Logger.error('Export failed', error);
    sendResponse({
      status: 'error',
      error: error.message,
      code: error.code || 'EXPORT_FAILED'
    });
  }
}
```

**Entrada**: matrixIds, format
**Saída**: `{ status: "success", downloadId, filename }` ou erro

---

#### Etapa 3: Formatação de Dados

**Ação**: Converter matrizes para formato de exportação

**Camada**: Core (Exporter)

**Código**:
```javascript
// core/exporter.js
export class Exporter {
  static toJSON(matrices, exportType = 'full') {
    const flattenedUrls = this.flattenMatrices(matrices);
    
    return {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      source: 'tab-url-extractor',
      metadata: this.buildMetadata(matrices, exportType),
      data: flattenedUrls
    };
  }
  
  static buildMetadata(matrices, exportType) {
    const totalUrls = matrices.reduce((sum, m) => sum + m.urlCount, 0);
    
    const metadata = {
      totalUrls: totalUrls,
      totalMatrices: matrices.length,
      exportType: exportType
    };
    
    if (exportType === 'partial') {
      metadata.matrixIds = matrices.map(m => m.id);
    }
    
    return metadata;
  }
  
  static flattenMatrices(matrices) {
    const flattened = [];
    
    matrices.forEach(matrix => {
      matrix.urls.forEach(url => {
        flattened.push({
          url: url.url,
          normalizedUrl: url.normalizedUrl,
          domain: url.domain,
          origin: url.origin,
          matrixId: matrix.id,
          matrixLabel: matrix.label
        });
      });
    });
    
    return flattened;
  }
  
  static toTXT(matrices) {
    const lines = [];
    
    // Header
    lines.push('# Generated by tab-url-extractor');
    lines.push(`# Date: ${new Date().toISOString()}`);
    lines.push(`# Total URLs: ${matrices.reduce((sum, m) => sum + m.urlCount, 0)}`);
    lines.push(`# Total Matrices: ${matrices.length}`);
    lines.push('');
    
    // Matrizes
    matrices.forEach(matrix => {
      lines.push(`# Matrix: ${matrix.label} (${matrix.urlCount} URLs)`);
      matrix.urls.forEach(url => {
        lines.push(url.normalizedUrl);
      });
      lines.push(''); // Linha em branco entre matrizes
    });
    
    return lines.join('\n');
  }
}
```

**Entrada**: `UrlMatrix[]`, exportType
**Saída**: Objeto JSON ou string TXT

---

#### Etapa 4: Criação do Download

**Ação**: Criar arquivo e iniciar download via Chrome API

**Camada**: Infrastructure (DownloadManager)

**Código**:
```javascript
// infrastructure/download-manager.js
export class DownloadManager {
  static async create(content, filename, mimeType) {
    try {
      // No Service Worker (Manifest V3), não contamos com URL.createObjectURL/Blob da mesma forma.
      // Implementação atual usa Data URL (base64) para disparar o download.
      const base64Content = btoa(unescape(encodeURIComponent(content)));
      const url = `data:${mimeType};base64,${base64Content}`;
      
      // Inicia download
      const downloadId = await chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: false // Download automático sem prompt
      });
      
      return downloadId;
    } catch (error) {
      Logger.error('Download creation failed', error);
      throw new Error('Failed to create download');
    }
  }
  
  static generateFilename(extension) {
    const timestamp = new Date()
      .toISOString()
      .replace(/:/g, '-')
      .replace(/\..+/, ''); // Remove milissegundos
    
    return `tab-urls-${timestamp}.${extension}`;
  }
  
  static getMimeType(format) {
    const mimeTypes = {
      'json': 'application/json',
      'txt': 'text/plain'
    };
    return mimeTypes[format] || 'text/plain';
  }
}
```

**Entrada**: content (string), filename, mimeType
**Saída**: downloadId (number)

---

## ⚠️ Tratamento de Erros

### Tipos de Erro

#### 1. Erro de Coleta de Abas

**Cenário**: Falha ao acessar chrome.tabs.query()

**Código de Erro**: `TAB_COLLECTION_FAILED`

**Tratamento**:
```javascript
try {
  const tabs = await chrome.tabs.query({});
} catch (error) {
  throw {
    message: 'Failed to access browser tabs',
    code: 'TAB_COLLECTION_FAILED',
    originalError: error
  };
}
```

**Resposta ao Usuário**:
```
"Não foi possível acessar as abas do navegador. 
Verifique as permissões da extensão."
```

---

#### 2. Erro de Permissão

**Cenário**: Extensão não tem permissão necessária

**Código de Erro**: `PERMISSION_DENIED`

**Tratamento**:
```javascript
if (!chrome.tabs) {
  throw {
    message: 'Tabs permission not granted',
    code: 'PERMISSION_DENIED'
  };
}
```

**Resposta ao Usuário**:
```
"Esta extensão precisa de permissão para acessar abas. 
Recarregue a extensão e aceite as permissões."
```

---

#### 3. Erro de Normalização

**Cenário**: URL inválida que não pode ser normalizada

**Código de Erro**: `NORMALIZATION_FAILED`

**Tratamento**:
```javascript
try {
  const urlObj = new URL(url);
  // ... normalização
} catch (error) {
  Logger.warn(`Skipping invalid URL: ${url}`);
  return url; // Retorna original e continua processamento
}
```

**Impacto**: URL é mantida como está, não bloqueia o fluxo

---

#### 4. Erro de Exportação

**Cenário**: Falha ao criar download

**Código de Erro**: `EXPORT_FAILED`

**Tratamento**:
```javascript
try {
  const downloadId = await chrome.downloads.download({...});
} catch (error) {
  throw {
    message: 'Failed to create download',
    code: 'EXPORT_FAILED',
    originalError: error
  };
}
```

**Resposta ao Usuário**:
```
"Falha ao criar arquivo de exportação. 
Tente novamente ou verifique as permissões de download."
```

---

#### 5. Erro de Matriz Não Encontrada

**Cenário**: matrixId solicitado não existe

**Código de Erro**: `MATRIX_NOT_FOUND`

**Tratamento**:
```javascript
const matricesToExport = currentMatrices.filter(m => 
  matrixIds.includes(m.id)
);

if (matricesToExport.length === 0) {
  throw {
    message: 'Requested matrices not found',
    code: 'MATRIX_NOT_FOUND'
  };
}
```

**Resposta ao Usuário**:
```
"As URLs selecionadas não foram encontradas. 
Tente analisar novamente."
```

---

### Propagação de Erros

```
Infrastructure Layer
    ↓ throw error
Service Worker
    ↓ catch, log, format
    ↓ sendResponse({ status: 'error', error, code })
UI Layer
    ↓ catch response
    ↓ showError(message)
User
```

---

## 📊 Estados da Aplicação

### Estados da UI

| Estado | Descrição | UI Visível |
|--------|-----------|-----------|
| `IDLE` | Estado inicial, aguardando interação | Botão "Analisar" habilitado |
| `ANALYZING` | Coletando e processando abas | Loading spinner, botão desabilitado |
| `READY` | Análise concluída, matrizes exibidas | Lista de matrizes, botões "Extrair" |
| `EXPORTING` | Exportação em andamento | Loading no botão clicado |
| `ERROR` | Erro ocorreu | Mensagem de erro, botão "Tentar novamente" |

### Transições de Estado

```
       ┌─────────┐
       │  IDLE   │
       └────┬────┘
            │ Clique "Analisar"
            ↓
     ┌──────────────┐
     │  ANALYZING   │
     └──────┬───────┘
            │
     ┌──────┴──────┐
     │             │
     ↓             ↓
┌─────────┐   ┌───────┐
│  READY  │   │ ERROR │
└────┬────┘   └───┬───┘
     │            │
     │ Clique     │ Clique
     │ "Extrair"  │ "Tentar novamente"
     ↓            ↓
┌────────────┐   │
│ EXPORTING  │   │
└────┬───────┘   │
     │            │
     ↓            │
┌─────────┐      │
│  READY  │◄─────┘
└─────────┘
     ou
┌───────┐
│ ERROR │
└───────┘
```

---

## 🔍 Logging e Debug

### Níveis de Log

```javascript
// INFO: Operações normais
Logger.info('Tab analysis started');
Logger.info('Collected 42 tabs');
Logger.info('Export completed', { downloadId: 123 });

// WARN: Situações anormais mas não críticas
Logger.warn('Skipping invalid URL', { url });
Logger.warn('No title available for tab', { tabId });

// ERROR: Erros que impedem operação
Logger.error('Tab collection failed', error);
Logger.error('Export failed', error);
```

### Exemplo de Log Completo

```
[2025-01-15T10:30:00.000Z] [INFO] Tab analysis started
[2025-01-15T10:30:00.050Z] [INFO] Collected 42 tabs
[2025-01-15T10:30:00.100Z] [WARN] Skipping invalid URL: chrome://extensions
[2025-01-15T10:30:00.200Z] [INFO] Processed 40 unique URLs
[2025-01-15T10:30:00.250Z] [INFO] Built 5 matrices
[2025-01-15T10:30:00.300Z] [INFO] Tab analysis completed
```

---

**Fluxo de dados projetado para clareza, rastreabilidade e resiliência a erros.**
