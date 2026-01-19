# Especificação de Módulos: tab-url-extractor

## 📦 Visão Geral

Este documento especifica todos os módulos do **tab-url-extractor**, incluindo responsabilidades, interfaces públicas, dependências, exemplos de implementação e contratos de uso.

## 🎯 Princípios Modulares

1. **Single Responsibility**: Cada módulo tem uma responsabilidade única e clara
2. **Interface Pública Mínima**: Expor apenas o necessário
3. **Baixo Acoplamento**: Módulos dependem de abstrações, não de implementações
4. **Alta Coesão**: Funcionalidades relacionadas agrupadas
5. **Documentação Inline**: JSDoc em todas as funções públicas

---

## 📋 Índice de Módulos

### Core Layer
1. [UrlProcessor](#1-urlprocessor) - Normalização e deduplicação de URLs
2. [MatrixBuilder](#2-matrixbuilder) - Construção de URL-Matriz
3. [Exporter](#3-exporter) - Formatação de exportação

### Infrastructure Layer
4. [TabCollector](#4-tabcollector) - Coleta de abas do navegador
5. [DownloadManager](#5-downloadmanager) - Gerenciamento de downloads

### Orchestration Layer
6. [ServiceWorker](#6-serviceworker) - Orquestrador principal

### Presentation Layer
7. [PopupController](#7-popupcontroller) - Controlador da UI

### Utilities Layer
8. [Logger](#8-logger) - Sistema de logging
9. [Validators](#9-validators) - Validadores de dados
10. [Constants](#10-constants) - Constantes do sistema

---

## 🔵 Core Layer

### 1. UrlProcessor

**Arquivo**: `core/url-processor.js`

**Responsabilidade**: Processar URLs brutas em UrlEntries normalizadas e deduplicadas.

#### Interface Pública

```javascript
/**
 * Processa URLs brutas realizando normalização e deduplicação
 */
export class UrlProcessor {
  /**
   * Processa array de RawTabs em UrlEntries normalizadas e deduplicadas
   * @param {Array<RawTab>} rawTabs - Array de abas brutas coletadas
   * @returns {Array<UrlEntry>} Array de URLs processadas
   * @throws {Error} Se rawTabs não for um array válido
   */
  static process(rawTabs) { }
  
  /**
   * Normaliza array de RawTabs em UrlEntries
   * @param {Array<RawTab>} rawTabs - Array de abas brutas
   * @returns {Array<UrlEntry>} Array de URLs normalizadas
   */
  static normalize(rawTabs) { }
  
  /**
   * Normaliza uma única URL aplicando regras de padronização
   * @param {string} url - URL a ser normalizada
   * @returns {string} URL normalizada
   */
  static normalizeUrl(url) { }
  
  /**
   * Remove duplicatas exatas de um array de UrlEntries
   * @param {Array<UrlEntry>} urlEntries - Array de URLs
   * @returns {Array<UrlEntry>} Array sem duplicatas
   */
  static deduplicate(urlEntries) { }
  
  /**
   * Extrai domínio de uma URL
   * @param {string} url - URL completa
   * @returns {string} Domínio extraído (ex: "youtube.com")
   */
  static extractDomain(url) { }
}
```

#### Implementação Completa

```javascript
import { Logger } from '../utils/logger.js';
import { Validators } from '../utils/validators.js';
import { CONSTANTS } from '../utils/constants.js';

export class UrlProcessor {
  static process(rawTabs) {
    if (!Array.isArray(rawTabs)) {
      throw new Error('rawTabs must be an array');
    }
    
    Logger.info('Processing URLs', { count: rawTabs.length });
    
    const normalized = this.normalize(rawTabs);
    const deduplicated = this.deduplicate(normalized);
    
    Logger.info('Processing complete', { 
      original: rawTabs.length,
      deduplicated: deduplicated.length 
    });
    
    return deduplicated;
  }
  
  static normalize(rawTabs) {
    return rawTabs
      .map(rawTab => {
        try {
          const normalizedUrl = this.normalizeUrl(rawTab.url);
          const domain = this.extractDomain(normalizedUrl);
          
          return {
            url: rawTab.url,
            normalizedUrl: normalizedUrl,
            domain: domain,
            origin: 'tab',
            metadata: {
              title: rawTab.title || '',
              tabId: rawTab.tabId,
              windowId: rawTab.windowId
            }
          };
        } catch (error) {
          Logger.warn('Failed to normalize URL', { url: rawTab.url, error });
          return null;
        }
      })
      .filter(entry => entry !== null);
  }
  
  static normalizeUrl(url) {
    if (!Validators.isValidUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }
    
    const urlObj = new URL(url);
    
    // 1. Lowercase domain
    urlObj.hostname = urlObj.hostname.toLowerCase();
    
    // 2. Remove www. prefix
    if (urlObj.hostname.startsWith('www.')) {
      urlObj.hostname = urlObj.hostname.substring(4);
    }
    
    // 3. Remove trailing slash (except for root)
    if (urlObj.pathname !== '/' && urlObj.pathname.endsWith('/')) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }
    
    // 4. Remove tracking parameters
    CONSTANTS.TRACKING_PARAMS.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // 5. Remove fragment (hash)
    urlObj.hash = '';
    
    // 6. Sort query parameters for consistency
    const params = Array.from(urlObj.searchParams.entries());
    params.sort((a, b) => a[0].localeCompare(b[0]));
    urlObj.search = new URLSearchParams(params).toString();
    
    return urlObj.toString();
  }
  
  static deduplicate(urlEntries) {
    const seen = new Set();
    const unique = [];
    
    urlEntries.forEach(entry => {
      if (!seen.has(entry.normalizedUrl)) {
        seen.add(entry.normalizedUrl);
        unique.push(entry);
      }
    });
    
    const duplicatesCount = urlEntries.length - unique.length;
    if (duplicatesCount > 0) {
      Logger.info(`Removed ${duplicatesCount} duplicate URLs`);
    }
    
    return unique;
  }
  
  static extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.toLowerCase();
    } catch {
      return '';
    }
  }
}
```

#### Dependências
- `Logger` (utils/logger.js)
- `Validators` (utils/validators.js)
- `CONSTANTS` (utils/constants.js)

#### Testes Sugeridos

```javascript
// Test: Normalização básica
const input = { url: 'https://WWW.YouTube.COM/watch?v=abc', title: 'Test' };
const result = UrlProcessor.normalize([input]);
assert.equal(result[0].normalizedUrl, 'https://youtube.com/watch?v=abc');

// Test: Remoção de tracking params
const input2 = { url: 'https://example.com?utm_source=test', title: '' };
const result2 = UrlProcessor.normalize([input2]);
assert.equal(result2[0].normalizedUrl, 'https://example.com');

// Test: Deduplicação
const entries = [
  { normalizedUrl: 'https://example.com' },
  { normalizedUrl: 'https://example.com' }
];
const dedup = UrlProcessor.deduplicate(entries);
assert.equal(dedup.length, 1);
```

---

### 2. MatrixBuilder

**Arquivo**: `core/matrix-builder.js`

**Responsabilidade**: Construir URL-Matriz a partir de UrlEntries.

#### Interface Pública

```javascript
/**
 * Constrói agrupamentos lógicos de URLs (URL-Matriz)
 */
export class MatrixBuilder {
  /**
   * Constrói URL-Matriz a partir de UrlEntries
   * @param {Array<UrlEntry>} urlEntries - Array de URLs processadas
   * @returns {Array<UrlMatrix>} Array de matrizes ordenadas por urlCount
   * @throws {Error} Se urlEntries não for um array válido
   */
  static build(urlEntries) { }
  
  /**
   * Agrupa URLs por domínio
   * @param {Array<UrlEntry>} urlEntries - URLs a agrupar
   * @returns {Map<string, Array<UrlEntry>>} Map de domínio -> URLs
   */
  static groupByDomain(urlEntries) { }
  
  /**
   * Cria objetos UrlMatrix a partir de URLs agrupadas
   * @param {Map<string, Array<UrlEntry>>} grouped - URLs agrupadas
   * @returns {Array<UrlMatrix>} Array de matrizes
   */
  static createMatrices(grouped) { }
  
  /**
   * Ordena matrizes por quantidade de URLs (decrescente)
   * @param {Array<UrlMatrix>} matrices - Matrizes a ordenar
   * @returns {Array<UrlMatrix>} Matrizes ordenadas
   */
  static sortByUrlCount(matrices) { }
  
  /**
   * Gera ID único para uma matriz
   * @param {string} criterionValue - Valor do critério (ex: "youtube.com")
   * @returns {string} ID sanitizado (ex: "matrix-domain-youtube-com")
   */
  static generateMatrixId(criterionValue) { }
}
```

#### Implementação Completa

```javascript
import { Logger } from '../utils/logger.js';
import { CONSTANTS } from '../utils/constants.js';

export class MatrixBuilder {
  static build(urlEntries) {
    if (!Array.isArray(urlEntries)) {
      throw new Error('urlEntries must be an array');
    }
    
    if (urlEntries.length === 0) {
      Logger.warn('No URLs to build matrices from');
      return [];
    }
    
    Logger.info('Building matrices', { urlCount: urlEntries.length });
    
    const grouped = this.groupByDomain(urlEntries);
    const matrices = this.createMatrices(grouped);
    const sorted = this.sortByUrlCount(matrices);
    
    Logger.info('Matrices built', { matrixCount: sorted.length });
    
    return sorted;
  }
  
  static groupByDomain(urlEntries) {
    const grouped = new Map();
    
    urlEntries.forEach(entry => {
      const domain = entry.domain;
      
      if (!domain) {
        Logger.warn('URL without domain', { url: entry.url });
        return;
      }
      
      if (!grouped.has(domain)) {
        grouped.set(domain, []);
      }
      
      grouped.get(domain).push(entry);
    });
    
    return grouped;
  }
  
  static createMatrices(grouped) {
    const matrices = [];
    const timestamp = new Date().toISOString();
    
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
        criterion: CONSTANTS.MATRIX_CRITERION.DOMAIN,
        criterionValue: domain,
        urlCount: urls.length,
        urls: urlsWithMatrixId,
        createdAt: timestamp
      });
    });
    
    return matrices;
  }
  
  static sortByUrlCount(matrices) {
    return matrices.sort((a, b) => b.urlCount - a.urlCount);
  }
  
  static generateMatrixId(criterionValue) {
    // Sanitiza para uso em ID (remove caracteres especiais)
    const sanitized = criterionValue
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-') // Remove hífens duplicados
      .replace(/^-|-$/g, ''); // Remove hífens no início/fim
    
    return `matrix-domain-${sanitized}`;
  }
}
```

#### Dependências
- `Logger` (utils/logger.js)
- `CONSTANTS` (utils/constants.js)

#### Testes Sugeridos

```javascript
// Test: Agrupamento por domínio
const entries = [
  { domain: 'youtube.com', normalizedUrl: 'https://youtube.com/1' },
  { domain: 'youtube.com', normalizedUrl: 'https://youtube.com/2' },
  { domain: 'github.com', normalizedUrl: 'https://github.com/1' }
];
const grouped = MatrixBuilder.groupByDomain(entries);
assert.equal(grouped.get('youtube.com').length, 2);
assert.equal(grouped.get('github.com').length, 1);

// Test: Ordenação por urlCount
const matrices = [
  { urlCount: 5 },
  { urlCount: 10 },
  { urlCount: 3 }
];
const sorted = MatrixBuilder.sortByUrlCount(matrices);
assert.equal(sorted[0].urlCount, 10);
```

---

### 3. Exporter

**Arquivo**: `core/exporter.js`

**Responsabilidade**: Formatar URL-Matriz para exportação em JSON ou TXT.

#### Interface Pública

```javascript
/**
 * Formata dados para exportação
 */
export class Exporter {
  /**
   * Converte matrizes para formato JSON estruturado
   * @param {Array<UrlMatrix>} matrices - Matrizes a exportar
   * @param {string} exportType - "full" ou "partial"
   * @returns {Object} Objeto JSON versionado
   */
  static toJSON(matrices, exportType = 'full') { }
  
  /**
   * Converte matrizes para formato TXT simples
   * @param {Array<UrlMatrix>} matrices - Matrizes a exportar
   * @returns {string} Conteúdo TXT formatado
   */
  static toTXT(matrices) { }
  
  /**
   * Constrói objeto de metadados
   * @param {Array<UrlMatrix>} matrices - Matrizes
   * @param {string} exportType - Tipo de exportação
   * @returns {Object} Objeto de metadados
   */
  static buildMetadata(matrices, exportType) { }
  
  /**
   * Flatten de matrizes em array de URLs
   * @param {Array<UrlMatrix>} matrices - Matrizes
   * @returns {Array<Object>} Array de objetos de URL
   */
  static flattenMatrices(matrices) { }
}
```

#### Implementação Completa

```javascript
import { CONSTANTS } from '../utils/constants.js';

export class Exporter {
  static toJSON(matrices, exportType = 'full') {
    const flattenedUrls = this.flattenMatrices(matrices);
    
    return {
      version: CONSTANTS.VERSION,
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
    
    // Header com metadados
    lines.push('# Generated by tab-url-extractor');
    lines.push(`# Date: ${new Date().toISOString()}`);
    
    const totalUrls = matrices.reduce((sum, m) => sum + m.urlCount, 0);
    lines.push(`# Total URLs: ${totalUrls}`);
    lines.push(`# Total Matrices: ${matrices.length}`);
    lines.push('');
    
    // Matrizes
    matrices.forEach((matrix, index) => {
      lines.push(`# Matrix: ${matrix.label} (${matrix.urlCount} URLs)`);
      
      matrix.urls.forEach(url => {
        lines.push(url.normalizedUrl);
      });
      
      // Linha em branco entre matrizes (exceto última)
      if (index < matrices.length - 1) {
        lines.push('');
      }
    });
    
    return lines.join('\n');
  }
}
```

#### Dependências
- `CONSTANTS` (utils/constants.js)

#### Testes Sugeridos

```javascript
// Test: Exportação JSON
const matrices = [
  {
    id: 'matrix-domain-example-com',
    label: 'example.com',
    urlCount: 2,
    urls: [
      { url: 'https://example.com/1', normalizedUrl: 'https://example.com/1', domain: 'example.com', origin: 'tab' },
      { url: 'https://example.com/2', normalizedUrl: 'https://example.com/2', domain: 'example.com', origin: 'tab' }
    ]
  }
];
const json = Exporter.toJSON(matrices, 'full');
assert.equal(json.version, '1.0.0');
assert.equal(json.metadata.totalUrls, 2);
assert.equal(json.data.length, 2);

// Test: Exportação TXT
const txt = Exporter.toTXT(matrices);
assert.ok(txt.includes('# Generated by tab-url-extractor'));
assert.ok(txt.includes('https://example.com/1'));
```

---

## 🔷 Infrastructure Layer

### 4. TabCollector

**Arquivo**: `infrastructure/tab-collector.js`

**Responsabilidade**: Coletar abas do navegador via Chrome API.

#### Interface Pública

```javascript
/**
 * Coleta abas do navegador
 */
export class TabCollector {
  /**
   * Coleta todas as abas válidas de todas as janelas
   * @returns {Promise<Array<RawTab>>} Array de abas coletadas
   * @throws {Error} Se falhar ao acessar chrome.tabs
   */
  static async collect() { }
  
  /**
   * Verifica se uma aba é válida para coleta
   * @param {chrome.tabs.Tab} tab - Aba do Chrome
   * @returns {boolean} true se válida
   */
  static isValidTab(tab) { }
  
  /**
   * Mapeia Tab do Chrome para RawTab
   * @param {chrome.tabs.Tab} tab - Aba do Chrome
   * @returns {RawTab} Objeto RawTab
   */
  static mapToRawTab(tab) { }
}
```

#### Implementação Completa

```javascript
import { Logger } from '../utils/logger.js';

export class TabCollector {
  static async collect() {
    try {
      Logger.info('Collecting tabs from browser');
      
      // Coleta todas as abas de todas as janelas
      const tabs = await chrome.tabs.query({});
      
      // Filtra abas válidas
      const validTabs = tabs.filter(tab => this.isValidTab(tab));
      
      Logger.info(`Collected ${validTabs.length} valid tabs out of ${tabs.length} total`);
      
      // Mapeia para RawTab
      const rawTabs = validTabs.map(tab => this.mapToRawTab(tab));
      
      if (rawTabs.length === 0) {
        throw new Error('No valid tabs found');
      }
      
      return rawTabs;
    } catch (error) {
      Logger.error('Failed to collect tabs', error);
      throw new Error(`Tab collection failed: ${error.message}`);
    }
  }
  
  static isValidTab(tab) {
    // Deve ter URL
    if (!tab.url) {
      return false;
    }
    
    // Ignora URLs de sistema
    const invalidPrefixes = [
      'chrome://',
      'chrome-extension://',
      'about:',
      'edge://',
      'opera://'
    ];
    
    return !invalidPrefixes.some(prefix => tab.url.startsWith(prefix));
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

#### Dependências
- `Logger` (utils/logger.js)
- `chrome.tabs` API

#### Testes Sugeridos

```javascript
// Test: Validação de abas
assert.equal(TabCollector.isValidTab({ url: 'https://example.com' }), true);
assert.equal(TabCollector.isValidTab({ url: 'chrome://extensions' }), false);
assert.equal(TabCollector.isValidTab({ url: null }), false);

// Test: Mapeamento
const chromeTab = {
  url: 'https://example.com',
  title: 'Example',
  id: 123,
  windowId: 1
};
const rawTab = TabCollector.mapToRawTab(chromeTab);
assert.equal(rawTab.url, 'https://example.com');
assert.equal(rawTab.tabId, 123);
```

---

### 5. DownloadManager

**Arquivo**: `infrastructure/download-manager.js`

**Responsabilidade**: Gerenciar downloads via Chrome API.

#### Interface Pública

```javascript
/**
 * Gerencia criação de downloads
 */
export class DownloadManager {
  /**
   * Cria download de conteúdo
   * @param {string} content - Conteúdo do arquivo
   * @param {string} filename - Nome do arquivo
   * @param {string} mimeType - MIME type
   * @returns {Promise<number>} Download ID
   * @throws {Error} Se falhar ao criar download
   */
  static async create(content, filename, mimeType) { }
  
  /**
   * Gera nome de arquivo com timestamp
   * @param {string} extension - Extensão do arquivo
   * @returns {string} Nome do arquivo
   */
  static generateFilename(extension) { }
  
  /**
   * Retorna MIME type para formato
   * @param {string} format - Formato/ extensão (ex: "json", "txt", "csv")
   * @returns {string} MIME type
   */
  static getMimeType(format) { }
}
```

#### Implementação Completa

```javascript
import { Logger } from '../utils/logger.js';
import { CONSTANTS } from '../utils/constants.js';

export class DownloadManager {
  static async create(content, filename, mimeType) {
    try {
      Logger.info('Creating download', { filename, mimeType });

      // MV3 (Service Worker): usamos Data URL (base64) para disparar download
      const base64Content = btoa(unescape(encodeURIComponent(content)));
      const url = `data:${mimeType};base64,${base64Content}`;
      
      // Inicia download
      const downloadId = await chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: false // Download automático sem prompt
      });
      
      Logger.info('Download created', { downloadId, filename });
      
      return downloadId;
    } catch (error) {
      Logger.error('Failed to create download', error);
      throw new Error(`Download creation failed: ${error.message}`);
    }
  }
  
  static generateFilename(extension) {
    const timestamp = new Date()
      .toISOString()
      .replace(/:/g, '-')      // Substitui : por -
      .replace(/\..+/, '');     // Remove milissegundos
    
    return `tab-urls-${timestamp}.${extension}`;
  }
  
  static getMimeType(format) {
    const mimeTypes = {
      [CONSTANTS.EXPORT_FORMATS.JSON]: 'application/json',
      [CONSTANTS.EXPORT_FORMATS.TXT]: 'text/plain'
    };
    
    return mimeTypes[format] || 'text/plain';
  }
}
```

#### Dependências
- `Logger` (utils/logger.js)
- `CONSTANTS` (utils/constants.js)
- `chrome.downloads` API

#### Testes Sugeridos

```javascript
// Test: Geração de filename
const filename = DownloadManager.generateFilename('json');
assert.ok(filename.startsWith('tab-urls-'));
assert.ok(filename.endsWith('.json'));

// Test: MIME type
assert.equal(DownloadManager.getMimeType('json'), 'application/json');
assert.equal(DownloadManager.getMimeType('txt'), 'text/plain');
```

---

## 🔶 Orchestration Layer

### 6. ServiceWorker

**Arquivo**: `background/service-worker.js`

**Responsabilidade**: Orquestrar operações entre UI, Core e Infrastructure.

#### Interface Pública

```javascript
/**
 * Service Worker principal da extensão
 * Escuta mensagens via chrome.runtime.onMessage
 */

// Handlers principais
async function handleAnalyze(sendResponse) { }
async function handleExport(matrixIds, format, sendResponse) { }

// Estado temporário
let currentMatrices = [];
```

#### Implementação Completa

```javascript
import { TabCollector } from '../infrastructure/tab-collector.js';
import { DownloadManager } from '../infrastructure/download-manager.js';
import { UrlProcessor } from '../core/url-processor.js';
import { MatrixBuilder } from '../core/matrix-builder.js';
import { Exporter } from '../core/exporter.js';
import { Logger } from '../utils/logger.js';
import { CONSTANTS } from '../utils/constants.js';

// Estado temporário (resetado a cada análise)
let currentMatrices = [];

// Listener de mensagens
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  Logger.info('Message received', { action: message.action });
  
  if (message.action === CONSTANTS.MESSAGE_ACTIONS.ANALYZE) {
    handleAnalyze(sendResponse);
    return true; // Mantém canal aberto
  }
  
  if (message.action === CONSTANTS.MESSAGE_ACTIONS.EXPORT) {
    handleExport(message.matrixIds, message.format, sendResponse);
    return true;
  }
  
  // Ação desconhecida
  sendResponse({
    status: 'error',
    error: `Unknown action: ${message.action}`
  });
  return false;
});

/**
 * Handler para análise de abas
 */
async function handleAnalyze(sendResponse) {
  Logger.info('Starting tab analysis');
  
  try {
    // 1. Coleta abas
    const rawTabs = await TabCollector.collect();
    
    // 2. Processa URLs
    const urlEntries = UrlProcessor.process(rawTabs);
    
    // 3. Constrói matrizes
    const matrices = MatrixBuilder.build(urlEntries);
    
    // 4. Armazena estado temporário
    currentMatrices = matrices;
    
    // 5. Retorna sucesso
    Logger.info('Tab analysis completed', {
      totalUrls: urlEntries.length,
      totalMatrices: matrices.length
    });
    
    sendResponse({
      status: 'success',
      matrices: matrices
    });
  } catch (error) {
    Logger.error('Tab analysis failed', error);
    
    sendResponse({
      status: 'error',
      error: error.message,
      code: error.code || 'ANALYSIS_FAILED'
    });
  }
}

/**
 * Handler para exportação de dados
 */
async function handleExport(matrixIds, format, sendResponse) {
  Logger.info('Starting export', { matrixIds, format });
  
  try {
    // 1. Valida formato
    if (format !== 'json' && format !== 'txt' && format !== 'txt-simple') {
      throw new Error(`Invalid format: ${format}`);
    }
    
    // 2. Filtra matrizes
    let matricesToExport;
    
    if (!matrixIds || matrixIds.length === 0) {
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
    
    // 3. Formata dados
    let content;
    const mimeType = DownloadManager.getMimeType(format);
    
    if (format === 'json') {
      const exportType = (matrixIds && matrixIds.length > 0) ? 'partial' : 'full';
      const exportData = Exporter.toJSON(matricesToExport, exportType);
      content = JSON.stringify(exportData, null, 2);
    } else {
      content = Exporter.toTXT(matricesToExport);
    }
    
    // 4. Cria download
    const filename = DownloadManager.generateFilename(format);
    const downloadId = await DownloadManager.create(content, filename, mimeType);
    
    // 5. Retorna sucesso
    Logger.info('Export completed', { downloadId, filename });
    
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

// Log de inicialização
Logger.info('Service Worker initialized');
```

#### Dependências
- Todos os módulos Core e Infrastructure
- Todos os utilitários
- `chrome.runtime` API

---

## 🔸 Presentation Layer

### 7. PopupController

**Arquivo**: `popup/popup.js`

**Responsabilidade**: Controlar UI e interagir com Service Worker.

#### Interface Pública

```javascript
/**
 * Controlador da interface do popup
 */
class PopupController {
  constructor() { }
  init() { }
  bindEvents() { }
  async handleAnalyze() { }
  async handleExport(matrixIds, format) { }
  render() { }
  renderMatrices(matrices) { }
  showLoading() { }
  hideLoading() { }
  showError(message) { }
  showSuccess(message) { }
}
```

#### Implementação Resumida

```javascript
const AppState = {
  IDLE: 'idle',
  ANALYZING: 'analyzing',
  READY: 'ready',
  EXPORTING: 'exporting',
  ERROR: 'error'
};

class PopupController {
  constructor() {
    this.state = AppState.IDLE;
    this.matrices = [];
    this.init();
  }
  
  init() {
    this.bindEvents();
    this.render();
  }
  
  bindEvents() {
    const analyzeBtn = document.getElementById('analyze-btn');
    analyzeBtn.addEventListener('click', () => this.handleAnalyze());
    
    const exportAllBtn = document.getElementById('export-all-btn');
    if (exportAllBtn) {
      exportAllBtn.addEventListener('click', () => this.handleExport([], 'json'));
    }
  }
  
  async handleAnalyze() {
    this.state = AppState.ANALYZING;
    this.render();
    
    try {
      const response = await chrome.runtime.sendMessage({ action: 'analyze' });
      
      if (response.status === 'success') {
        this.matrices = response.matrices;
        this.state = AppState.READY;
        this.renderMatrices(this.matrices);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      this.state = AppState.ERROR;
      this.showError(error.message);
    }
  }
  
  async handleExport(matrixIds, format) {
    this.state = AppState.EXPORTING;
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'export',
        matrixIds: matrixIds,
        format: format
      });
      
      if (response.status === 'success') {
        this.showSuccess(`Arquivo ${response.filename} baixado!`);
        this.state = AppState.READY;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      this.state = AppState.ERROR;
      this.showError(error.message);
    }
  }
  
  render() {
    // Renderização baseada em estado
    // (implementação completa em USAGE.md)
  }
  
  renderMatrices(matrices) {
    // Renderização de lista de matrizes
    // (implementação completa em USAGE.md)
  }
}

// Inicialização
const app = new PopupController();
```

---

## 🔹 Utilities Layer

### 8. Logger

**Arquivo**: `utils/logger.js`

#### Implementação Completa

```javascript
export class Logger {
  static info(message, data = {}) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}`, data);
  }
  
  static warn(message, data = {}) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${message}`, data);
  }
  
  static error(message, error = null) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${message}`, error);
  }
}
```

---

### 9. Validators

**Arquivo**: `utils/validators.js`

#### Implementação Completa

(Vide DATA_STRUCTURES.md para implementação completa dos validadores)

---

### 10. Constants

**Arquivo**: `utils/constants.js`

#### Implementação Completa

```javascript
export const CONSTANTS = {
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
  },
  
  TRACKING_PARAMS: [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'fbclid',
    'gclid',
    'msclkid',
    '_ga'
  ]
};
```

---

## 📊 Mapa de Dependências

```
PopupController
    → chrome.runtime.sendMessage()
    
ServiceWorker
    → TabCollector
    → UrlProcessor
    → MatrixBuilder
    → Exporter
    → DownloadManager
    → Logger
    → Constants
    
TabCollector
    → Logger
    → chrome.tabs
    
DownloadManager
    → Logger
    → Constants
    → chrome.downloads
    
UrlProcessor
    → Logger
    → Validators
    → Constants
    
MatrixBuilder
    → Logger
    → Constants
    
Exporter
    → Constants
    
Validators
    (sem dependências)
    
Logger
    (sem dependências)
    
Constants
    (sem dependências)
```

---

**Módulos projetados para máxima clareza, testabilidade e manutenibilidade.**
