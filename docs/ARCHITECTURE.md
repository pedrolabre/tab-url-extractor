# Arquitetura do Sistema: tab-url-extractor

## 📐 Visão Geral da Arquitetura

O **tab-url-extractor** segue uma arquitetura em camadas baseada nos princípios de **Clean Architecture** e **Separation of Concerns**, garantindo modularidade, testabilidade e extensibilidade.

### Princípios Arquiteturais

1. **Inversão de Dependências**: Camadas externas dependem de camadas internas
2. **Independência de Framework**: Core não depende de Chrome APIs
3. **Testabilidade**: Lógica de negócio isolada e testável
4. **Separação UI/Lógica**: Interface não contém regras de negócio
5. **Single Responsibility**: Cada módulo tem uma responsabilidade clara

## 🏛️ Diagrama de Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                      │
│                         (UI/Popup)                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   popup.html │  │  popup.js    │  │  popup.css   │      │
│  └─────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────┬────────────────────────────────┘
                             │ Messages (chrome.runtime)
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION LAYER                      │
│                   (Service Worker/Background)               │
│  ┌──────────────────────────────────────────────────┐      │
│  │              background/service-worker.js        │      │
│  │  - Recebe mensagens da UI                        │      │
│  │  - Orquestra operações                           │      │
│  │  - Delega lógica ao Core                         │      │
│  │  - Gerencia downloads                            │      │
│  └──────────────────────────────────────────────────┘      │
└────────────────────────────┬────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ↓                             ↓
┌──────────────────────────┐    ┌──────────────────────────┐
│    BUSINESS LOGIC LAYER  │    │  INFRASTRUCTURE LAYER    │
│        (Core)            │    │   (Browser Interface)    │
│                          │    │                          │
│  ┌────────────────────┐ │    │  ┌────────────────────┐ │
│  │  url-processor.js  │ │    │  │  tab-collector.js  │ │
│  │  - Normalize URLs  │ │    │  │  - Chrome Tabs API │ │
│  │  - Deduplicate     │ │    │  │  - Get all tabs    │ │
│  └────────────────────┘ │    │  └────────────────────┘ │
│                          │    │                          │
│  ┌────────────────────┐ │    │  ┌────────────────────┐ │
│  │  matrix-builder.js │ │    │  │ download-manager.js│ │
│  │  - Group by domain │ │    │  │  - Chrome Downloads│ │
│  │  - Build matrices  │ │    │  │  - Export files    │ │
│  └────────────────────┘ │    │  └────────────────────┘ │
│                          │    │                          │
│  ┌────────────────────┐ │    │                          │
│  │   exporter.js      │ │    │                          │
│  │  - JSON formatter  │ │    │                          │
│  │  - TXT formatter   │ │    │                          │
│  └────────────────────┘ │    │                          │
└──────────────────────────┘    └──────────────────────────┘
              │                             │
              └──────────────┬──────────────┘
                             ↓
              ┌──────────────────────────┐
              │    SHARED UTILITIES      │
              │                          │
              │  ┌────────────────────┐ │
              │  │   logger.js        │ │
              │  │   validators.js    │ │
              │  │   constants.js     │ │
              │  └────────────────────┘ │
              └──────────────────────────┘
```

## 🔄 Fluxo de Dados Completo

### 1. Fluxo de Análise (Analyze Flow)

```
┌─────────┐
│  User   │ Clica "Analisar"
└────┬────┘
     │
     ↓
┌──────────────────┐
│   Popup UI       │ Envia mensagem: { action: "analyze" }
└────┬─────────────┘
     │
     ↓ chrome.runtime.sendMessage()
┌──────────────────────┐
│  Service Worker      │ Recebe mensagem
└────┬─────────────────┘
     │
     ├─→ 1. Coleta URLs
     │   ┌────────────────────────┐
     │   │ TabCollector.collect() │ chrome.tabs.query()
     │   └────────┬───────────────┘
     │            ↓
     │   [Array<RawTab>] { url, title, tabId, windowId }
     │
     ├─→ 2. Processa URLs
     │   ┌─────────────────────────┐
     │   │ UrlProcessor.process()  │
     │   │  - normalize()          │
     │   │  - deduplicate()        │
     │   └────────┬────────────────┘
     │            ↓
     │   [Array<UrlEntry>] { url, normalizedUrl, domain, origin }
     │
     ├─→ 3. Constrói Matrizes
     │   ┌──────────────────────────┐
     │   │ MatrixBuilder.build()    │
     │   │  - groupByDomain()       │
     │   │  - createMatrices()      │
     │   └────────┬─────────────────┘
     │            ↓
     │   [Array<UrlMatrix>] { id, label, urlCount, urls }
     │
     └─→ 4. Retorna Resultado
         ┌────────────────────────┐
         │ chrome.runtime.sendMessage()
         │ { status: "success", matrices: [...] }
         └────────┬───────────────┘
                  │
                  ↓
         ┌──────────────────┐
         │   Popup UI       │ Exibe lista de matrizes
         └──────────────────┘
```

### 2. Fluxo de Exportação (Export Flow)

```
┌─────────┐
│  User   │ Clica "Extrair" ou "Extrair todos"
└────┬────┘
     │
     ↓
┌──────────────────┐
│   Popup UI       │ Envia: { action: "export", matrixIds: [...], format: "json" }
└────┬─────────────┘
     │
     ↓
┌──────────────────────┐
│  Service Worker      │ Recebe requisição de exportação
└────┬─────────────────┘
     │
     ├─→ 1. Filtra dados (se exportação parcial)
     │   ┌────────────────────────┐
     │   │ Filtra matrizes por IDs│
     │   └────────┬───────────────┘
     │            ↓
     │   [Array<UrlMatrix>] (filtradas)
     │
    ├─→ 2. Formata para exportação
     │   ┌─────────────────────────┐
    │   │ Exporter.export()       │
     │   │  - Adiciona metadados   │
     │   │  - Versiona schema      │
     │   │  - Formata estrutura    │
     │   └────────┬────────────────┘
     │            ↓
     │   { version, generatedAt, metadata, data: [...] }
     │
     └─→ 3. Cria download
         ┌─────────────────────────┐
         │ DownloadManager.create()│ chrome.downloads.download()
       │  - Gera Data URL (b64)  │
         │  - Sugere nome arquivo  │
         └────────┬────────────────┘
                  │
                  ↓
         ┌──────────────────┐
         │  Chrome Downloads│ Arquivo baixado
         └──────────────────┘
```

## 📦 Responsabilidades por Camada

### Layer 1: Presentation (UI/Popup)

**Localização**: `/popup`

**Responsabilidades**:
- ✅ Renderizar interface do usuário
- ✅ Capturar eventos do usuário (cliques, inputs)
- ✅ Enviar mensagens ao Service Worker
- ✅ Exibir estados (loading, erro, sucesso)
- ✅ Apresentar dados formatados (lista de matrizes)

**NÃO deve**:
- ❌ Conter lógica de negócio
- ❌ Acessar diretamente Chrome APIs (exceto runtime.sendMessage)
- ❌ Manipular dados complexos (normalização, agrupamento)
- ❌ Fazer cálculos ou transformações

**Arquivos**:
- `popup.html` - Estrutura HTML
- `popup.js` - Controle de interações e comunicação
- `popup.css` - Estilos visuais

**Exemplo de Código**:
```javascript
// popup.js
document.getElementById('analyze-btn').addEventListener('click', async () => {
  showLoading();
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'analyze' });
    
    if (response.status === 'success') {
      renderMatrices(response.matrices);
    } else {
      showError(response.error);
    }
  } catch (error) {
    showError(error.message);
  } finally {
    hideLoading();
  }
});
```

---

### Layer 2: Orchestration (Service Worker/Background)

**Localização**: `/background`

**Responsabilidades**:
- ✅ Receber mensagens da UI via `chrome.runtime.onMessage`
- ✅ Orquestrar fluxo de operações
- ✅ Coordenar chamadas entre Infrastructure e Core
- ✅ Gerenciar estado temporário da análise
- ✅ Tratar erros e retornar respostas formatadas
- ✅ Registrar logs de operações

**NÃO deve**:
- ❌ Implementar lógica de normalização ou agrupamento
- ❌ Manipular diretamente estruturas de dados complexas
- ❌ Conter regras de negócio

**Arquivos**:
- `service-worker.js` - Orquestrador principal

**Exemplo de Código**:
```javascript
// service-worker.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'analyze') {
    handleAnalyze(sendResponse);
    return true; // Mantém canal aberto para resposta assíncrona
  }
  
  if (message.action === 'export') {
    handleExport(message.matrixIds, message.format, sendResponse);
    return true;
  }
});

async function handleAnalyze(sendResponse) {
  try {
    // 1. Coleta (Infrastructure)
    const rawTabs = await TabCollector.collect();
    
    // 2. Processamento (Core)
    const urlEntries = UrlProcessor.process(rawTabs);
    
    // 3. Agrupamento (Core)
    const matrices = MatrixBuilder.build(urlEntries);
    
    // 4. Retorna
    sendResponse({ status: 'success', matrices });
  } catch (error) {
    Logger.error('Analyze failed', error);
    sendResponse({ status: 'error', error: error.message });
  }
}
```

---

### Layer 3: Business Logic (Core)

**Localização**: `/core`

**Responsabilidades**:
- ✅ Implementar toda a lógica de negócio
- ✅ Normalizar URLs
- ✅ Deduplicar URLs
- ✅ Agrupar em URL-Matriz
- ✅ Formatar dados para exportação
- ✅ Ser agnóstico ao navegador (sem dependências de Chrome APIs)

**NÃO deve**:
- ❌ Acessar Chrome APIs diretamente
- ❌ Manipular DOM ou UI
- ❌ Fazer I/O (filesystem, network)

**Arquivos**:
- `url-processor.js` - Normalização e deduplicação
- `matrix-builder.js` - Construção de URL-Matriz
- `exporter.js` - Formatação de exportação

#### Módulo: url-processor.js

**Interface Pública**:
```javascript
class UrlProcessor {
  /**
   * Processa array de RawTabs em UrlEntries normalizadas e deduplicadas
   * @param {Array<RawTab>} rawTabs
   * @returns {Array<UrlEntry>}
   */
  static process(rawTabs) {
    const normalized = this.normalize(rawTabs);
    const deduplicated = this.deduplicate(normalized);
    return deduplicated;
  }
  
  /**
   * Normaliza uma única URL
   * @param {string} url
   * @returns {string}
   */
  static normalizeUrl(url) {
    // Remove trailing slash, lowercase domain, remove fragments, etc.
  }
  
  /**
   * Normaliza array de RawTabs
   * @param {Array<RawTab>} rawTabs
   * @returns {Array<UrlEntry>}
   */
  static normalize(rawTabs) { }
  
  /**
   * Remove duplicatas exatas
   * @param {Array<UrlEntry>} urlEntries
   * @returns {Array<UrlEntry>}
   */
  static deduplicate(urlEntries) { }
}
```

#### Módulo: matrix-builder.js

**Interface Pública**:
```javascript
class MatrixBuilder {
  /**
   * Constrói URL-Matriz a partir de UrlEntries
   * @param {Array<UrlEntry>} urlEntries
   * @returns {Array<UrlMatrix>}
   */
  static build(urlEntries) {
    const grouped = this.groupByDomain(urlEntries);
    const matrices = this.createMatrices(grouped);
    return this.sortByUrlCount(matrices);
  }
  
  /**
   * Agrupa URLs por domínio
   * @param {Array<UrlEntry>} urlEntries
   * @returns {Map<string, Array<UrlEntry>>}
   */
  static groupByDomain(urlEntries) { }
  
  /**
   * Cria objetos UrlMatrix
   * @param {Map<string, Array<UrlEntry>>} grouped
   * @returns {Array<UrlMatrix>}
   */
  static createMatrices(grouped) { }
}
```

#### Módulo: exporter.js

**Interface Pública**:
```javascript
class Exporter {
  /**
   * Converte matrizes para JSON estruturado
   * @param {Array<UrlMatrix>} matrices
   * @param {string} exportType - "full" | "partial"
   * @returns {Object}
   */
  static toJSON(matrices, exportType = 'full') {
    return {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      source: 'tab-url-extractor',
      metadata: this.buildMetadata(matrices, exportType),
      data: this.flattenMatrices(matrices)
    };
  }
  
  /**
   * Converte matrizes para TXT simples
   * @param {Array<UrlMatrix>} matrices
   * @returns {string}
   */
  static toTXT(matrices) { }
  
  /**
   * Constrói objeto de metadados
   * @param {Array<UrlMatrix>} matrices
   * @param {string} exportType
   * @returns {Object}
   */
  static buildMetadata(matrices, exportType) { }
}
```

---

### Layer 4: Infrastructure (Browser Interface)

**Localização**: `/infrastructure`

**Responsabilidades**:
- ✅ Abstrair interação com Chrome APIs
- ✅ Coletar dados do navegador (tabs)
- ✅ Gerenciar downloads
- ✅ Fornecer interfaces limpa para o Service Worker

**NÃO deve**:
- ❌ Conter lógica de negócio
- ❌ Manipular ou transformar dados (apenas coleta)

**Arquivos**:
- `tab-collector.js` - Coleta de abas
- `download-manager.js` - Gerenciamento de downloads

#### Módulo: tab-collector.js

**Interface Pública**:
```javascript
class TabCollector {
  /**
   * Coleta todas as abas de todas as janelas
   * @returns {Promise<Array<RawTab>>}
   */
  static async collect() {
    try {
      const tabs = await chrome.tabs.query({});
      return tabs
        .filter(tab => this.isValidTab(tab))
        .map(tab => this.mapToRawTab(tab));
    } catch (error) {
      Logger.error('Failed to collect tabs', error);
      throw new Error('Tab collection failed');
    }
  }
  
  /**
   * Verifica se a aba é válida para coleta
   * @param {chrome.tabs.Tab} tab
   * @returns {boolean}
   */
  static isValidTab(tab) {
    // Ignora chrome://, chrome-extension://, about:blank
    return tab.url && !tab.url.startsWith('chrome');
  }
  
  /**
   * Mapeia Tab do Chrome para RawTab
   * @param {chrome.tabs.Tab} tab
   * @returns {RawTab}
   */
  static mapToRawTab(tab) {
    return {
      url: tab.url,
      title: tab.title,
      tabId: tab.id,
      windowId: tab.windowId
    };
  }
}
```

#### Módulo: download-manager.js

**Interface Pública**:
```javascript
class DownloadManager {
  /**
   * Cria download de conteúdo
   * @param {string} content - Conteúdo do arquivo
   * @param {string} filename - Nome sugerido
   * @param {string} mimeType - MIME type
   * @returns {Promise<number>} Download ID
   */
  static async create(content, filename, mimeType) {
    // Em MV3 (Service Worker), a implementação atual usa Data URL (base64)
    const base64Content = btoa(unescape(encodeURIComponent(content)));
    const url = `data:${mimeType};base64,${base64Content}`;
    
    return chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: false // Download automático
    });
  }
  
  /**
   * Gera nome de arquivo com timestamp
    * @param {string} format - "json" | "txt" ("txt-simple" usa extensão .txt)
   * @returns {string}
   */
  static generateFilename(format) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    return `tab-urls-${timestamp}.${format}`;
  }
}
```

---

### Layer 5: Shared Utilities

**Localização**: `/utils`

**Responsabilidades**:
- ✅ Funções utilitárias compartilhadas
- ✅ Constantes globais
- ✅ Validadores
- ✅ Logging estruturado

**Arquivos**:
- `logger.js` - Sistema de logs
- `validators.js` - Validação de dados
- `constants.js` - Constantes do sistema

#### Módulo: logger.js

```javascript
class Logger {
  static info(message, data = {}) {
    console.log(`[INFO] ${message}`, data);
  }
  
  static warn(message, data = {}) {
    console.warn(`[WARN] ${message}`, data);
  }
  
  static error(message, error = null) {
    console.error(`[ERROR] ${message}`, error);
  }
}
```

#### Módulo: constants.js

```javascript
const CONSTANTS = {
  VERSION: '1.0.0',
  EXPORT_FORMATS: {
    JSON: 'json',
    TXT: 'txt'
  },
  MATRIX_CRITERION: {
    DOMAIN: 'domain'
  },
  MESSAGE_ACTIONS: {
    ANALYZE: 'analyze',
    EXPORT: 'export'
  }
};
```

## 🔌 Comunicação Entre Camadas

### Protocolo de Mensagens (UI ↔ Service Worker)

#### Mensagem: Analyze

**Request**:
```javascript
{
  action: 'analyze'
}
```

**Response (Success)**:
```javascript
{
  status: 'success',
  matrices: [
    {
      id: 'matrix-youtube-com',
      label: 'youtube.com',
      criterion: 'domain',
      criterionValue: 'youtube.com',
      urlCount: 15,
      urls: [...]
    }
  ]
}
```

**Response (Error)**:
```javascript
{
  status: 'error',
  error: 'Error message'
}
```

#### Mensagem: Export

**Request**:
```javascript
{
  action: 'export',
  matrixIds: ['matrix-youtube-com'], // ou [] para "export all"
  format: 'json' // ou 'txt' | 'txt-simple'
}
```

**Response (Success)**:
```javascript
{
  status: 'success',
  downloadId: 123
}
```

**Response (Error)**:
```javascript
{
  status: 'error',
  error: 'Export failed'
}
```

## 🧪 Testabilidade

### Core Logic (100% Testável)

Todos os módulos do Core são **funções puras** ou classes com métodos estáticos, sem dependências externas:

```javascript
// Teste de UrlProcessor
const rawTabs = [
  { url: 'https://YouTube.com/watch?v=123', title: 'Video' },
  { url: 'https://youtube.com/watch?v=123', title: 'Video' }
];

const result = UrlProcessor.process(rawTabs);

assert.equal(result.length, 1); // Deduplicado
assert.equal(result[0].domain, 'youtube.com'); // Normalizado
```

### Infrastructure (Mock de Chrome APIs)

```javascript
// Mock de chrome.tabs
global.chrome = {
  tabs: {
    query: async () => [
      { url: 'https://example.com', title: 'Example' }
    ]
  }
};

const tabs = await TabCollector.collect();
assert.equal(tabs.length, 1);
```

## 🔄 Padrões de Design Utilizados

### 1. Facade Pattern (Infrastructure Layer)

`TabCollector` e `DownloadManager` abstraem complexidade do Chrome API.

### 2. Factory Pattern (MatrixBuilder)

Cria objetos `UrlMatrix` de forma consistente.

### 3. Strategy Pattern (Exporter)

Múltiplas estratégias de exportação (JSON, TXT) com interface comum.

### 4. Message Passing Pattern (UI ↔ Service Worker)

Comunicação assíncrona baseada em mensagens.

## 📊 Diagrama de Dependências

```
popup.js
    ↓ (sendMessage)
service-worker.js
    ↓ (chama)
tab-collector.js ──→ chrome.tabs
    ↓ (retorna RawTab[])
url-processor.js
    ↓ (retorna UrlEntry[])
matrix-builder.js
    ↓ (retorna UrlMatrix[])
exporter.js
    ↓ (retorna JSON)
download-manager.js ──→ chrome.downloads
```

## 🚀 Extensibilidade

### Adicionar Nova Fonte de URLs

1. Criar novo módulo em `/infrastructure` (ex: `bookmark-collector.js`)
2. Implementar mesma interface: `collect() => Promise<Array<RawTab>>`
3. Service Worker orquestra nova fonte sem alterar Core

### Adicionar Novo Formato de Exportação

1. Adicionar método em `exporter.js` (ex: `toCSV()`)
2. Atualizar `download-manager.js` com novo MIME type
3. UI adiciona nova opção de formato

### Adicionar Novo Critério de Agrupamento

1. Adicionar novo método em `matrix-builder.js` (ex: `groupByTLD()`)
2. Passar critério como parâmetro em `build(urlEntries, criterion)`
3. Nenhuma alteração em outras camadas

---

**Arquitetura projetada para evolução sem reescrita.**
