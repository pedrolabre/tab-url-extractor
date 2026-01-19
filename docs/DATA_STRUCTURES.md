# Estruturas de Dados: tab-url-extractor

## 📊 Visão Geral

Este documento define todas as estruturas de dados utilizadas no **tab-url-extractor**, incluindo schemas, validações, transformações e exemplos práticos.

## 🎯 Princípios de Design de Dados

1. **Imutabilidade**: Estruturas são transformadas, não mutadas
2. **Tipagem Clara**: Cada campo tem tipo e propósito bem definidos
3. **Validação**: Todas as estruturas devem ser validáveis
4. **Serializabilidade**: Todas as estruturas podem ser convertidas para JSON
5. **Versionamento**: Formatos de exportação são versionados

---

## 📦 Estruturas Core

### 1. RawTab

**Propósito**: Representação de uma aba coletada diretamente do Chrome API.

**Camada**: Infrastructure → Core

**Schema**:
```javascript
{
  url: string,           // URL completa da aba (obrigatório)
  title?: string,        // Título da página (opcional)
  tabId?: number,        // ID interno do Chrome (opcional)
  windowId?: number      // ID da janela (opcional)
}
```

**Regras de Validação**:
- `url` deve ser uma string não-vazia
- `url` deve começar com `http://` ou `https://`
- `tabId` e `windowId` devem ser números positivos se presentes

**Exemplo**:
```javascript
{
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  title: "Rick Astley - Never Gonna Give You Up",
  tabId: 123,
  windowId: 1
}
```

**Criado por**: `TabCollector.mapToRawTab()`

**Consumido por**: `UrlProcessor.process()`

---

### 2. UrlEntry

**Propósito**: Representação normalizada de uma URL, pronta para agrupamento.

**Camada**: Core

**Schema**:
```javascript
{
  url: string,              // URL original completa
  normalizedUrl: string,    // URL após normalização
  domain: string,           // Domínio extraído (ex: "youtube.com")
  origin: string,           // Fonte da URL (sempre "tab" no MVP)
  matrixId?: string,        // ID da matriz associada (adicionado após agrupamento)
  metadata?: {              // Metadados opcionais
    title?: string,
    tabId?: number,
    windowId?: number
  }
}
```

**Regras de Validação**:
- `url` deve ser válida (validação via URL API)
- `normalizedUrl` deve ser resultado de normalização consistente
- `domain` deve ser extraído corretamente do `normalizedUrl`
- `origin` deve ser valor válido (enum: "tab")
- `matrixId` deve seguir padrão `matrix-{criterion}-{value}`

**Exemplo**:
```javascript
{
  url: "https://WWW.YouTube.COM/watch?v=dQw4w9WgXcQ&utm_source=share",
  normalizedUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ",
  domain: "youtube.com",
  origin: "tab",
  matrixId: "matrix-domain-youtube-com",
  metadata: {
    title: "Rick Astley - Never Gonna Give You Up",
    tabId: 123
  }
}
```

**Criado por**: `UrlProcessor.normalize()`

**Consumido por**: `MatrixBuilder.build()`

---

### 3. UrlMatrix

**Propósito**: Agrupamento lógico de URLs que compartilham um critério comum.

**Camada**: Core

**Schema**:
```javascript
{
  id: string,                    // Identificador único (ex: "matrix-domain-youtube-com")
  label: string,                 // Rótulo legível (ex: "youtube.com")
  criterion: string,             // Critério de agrupamento (ex: "domain")
  criterionValue: string,        // Valor do critério (ex: "youtube.com")
  urlCount: number,              // Quantidade de URLs nesta matriz
  urls: Array<UrlEntry>,         // Array de URLs associadas
  createdAt: string              // Timestamp ISO-8601 de criação
}
```

**Regras de Validação**:
- `id` deve ser único e seguir padrão `matrix-{criterion}-{sanitizedValue}`
- `label` deve ser string legível não-vazia
- `criterion` deve ser valor válido (enum: "domain" no MVP)
- `criterionValue` deve corresponder ao critério aplicado
- `urlCount` deve ser igual a `urls.length`
- `urls` deve ser array não-vazio de `UrlEntry`
- `createdAt` deve ser ISO-8601 válido

**Exemplo**:
```javascript
{
  id: "matrix-domain-youtube-com",
  label: "youtube.com",
  criterion: "domain",
  criterionValue: "youtube.com",
  urlCount: 3,
  urls: [
    {
      url: "https://youtube.com/watch?v=abc123",
      normalizedUrl: "https://youtube.com/watch?v=abc123",
      domain: "youtube.com",
      origin: "tab",
      matrixId: "matrix-domain-youtube-com"
    },
    {
      url: "https://youtube.com/watch?v=def456",
      normalizedUrl: "https://youtube.com/watch?v=def456",
      domain: "youtube.com",
      origin: "tab",
      matrixId: "matrix-domain-youtube-com"
    },
    {
      url: "https://youtube.com/channel/UC123456",
      normalizedUrl: "https://youtube.com/channel/UC123456",
      domain: "youtube.com",
      origin: "tab",
      matrixId: "matrix-domain-youtube-com"
    }
  ],
  createdAt: "2025-01-15T10:30:00.000Z"
}
```

**Criado por**: `MatrixBuilder.createMatrices()`

**Consumido por**: `Exporter.toJSON()`, UI para renderização

---

## 📤 Estruturas de Exportação

### 4. ExportData (JSON)

**Propósito**: Formato de exportação JSON estruturado e versionado.

**Camada**: Core → Infrastructure (Download)

**Schema v1.0.0**:
```javascript
{
  version: string,               // Versão do schema (ex: "1.0.0")
  generatedAt: string,           // ISO-8601 timestamp
  source: string,                // Sempre "tab-url-extractor"
  metadata: {
    totalUrls: number,           // Total de URLs exportadas
    totalMatrices: number,       // Total de matrizes exportadas
    exportType: string,          // "full" | "partial"
    matrixIds?: Array<string>    // IDs das matrizes (se partial)
  },
  data: Array<{
    url: string,                 // URL original
    normalizedUrl: string,       // URL normalizada
    domain: string,              // Domínio extraído
    origin: string,              // Fonte (sempre "tab")
    matrixId: string,            // ID da matriz associada
    matrixLabel: string          // Label legível da matriz
  }>
}
```

**Regras de Validação**:
- `version` deve seguir SemVer (ex: "1.0.0")
- `generatedAt` deve ser ISO-8601 válido
- `source` deve ser "tab-url-extractor"
- `metadata.totalUrls` deve ser igual a `data.length`
- `metadata.totalMatrices` deve ser contagem única de `matrixId`
- `metadata.exportType` deve ser "full" ou "partial"
- `data` deve ser array de objetos válidos

**Exemplo (Exportação Completa)**:
```javascript
{
  "version": "1.0.0",
  "generatedAt": "2025-01-15T10:30:45.123Z",
  "source": "tab-url-extractor",
  "metadata": {
    "totalUrls": 5,
    "totalMatrices": 2,
    "exportType": "full"
  },
  "data": [
    {
      "url": "https://www.youtube.com/watch?v=abc123",
      "normalizedUrl": "https://youtube.com/watch?v=abc123",
      "domain": "youtube.com",
      "origin": "tab",
      "matrixId": "matrix-domain-youtube-com",
      "matrixLabel": "youtube.com"
    },
    {
      "url": "https://youtube.com/watch?v=def456",
      "normalizedUrl": "https://youtube.com/watch?v=def456",
      "domain": "youtube.com",
      "origin": "tab",
      "matrixId": "matrix-domain-youtube-com",
      "matrixLabel": "youtube.com"
    },
    {
      "url": "https://github.com/user/repo",
      "normalizedUrl": "https://github.com/user/repo",
      "domain": "github.com",
      "origin": "tab",
      "matrixId": "matrix-domain-github-com",
      "matrixLabel": "github.com"
    },
    {
      "url": "https://github.com/user/repo/issues/1",
      "normalizedUrl": "https://github.com/user/repo/issues/1",
      "domain": "github.com",
      "origin": "tab",
      "matrixId": "matrix-domain-github-com",
      "matrixLabel": "github.com"
    },
    {
      "url": "https://github.com/another/project",
      "normalizedUrl": "https://github.com/another/project",
      "domain": "github.com",
      "origin": "tab",
      "matrixId": "matrix-domain-github-com",
      "matrixLabel": "github.com"
    }
  ]
}
```

**Exemplo (Exportação Parcial)**:
```javascript
{
  "version": "1.0.0",
  "generatedAt": "2025-01-15T10:35:12.456Z",
  "source": "tab-url-extractor",
  "metadata": {
    "totalUrls": 2,
    "totalMatrices": 1,
    "exportType": "partial",
    "matrixIds": ["matrix-domain-youtube-com"]
  },
  "data": [
    {
      "url": "https://www.youtube.com/watch?v=abc123",
      "normalizedUrl": "https://youtube.com/watch?v=abc123",
      "domain": "youtube.com",
      "origin": "tab",
      "matrixId": "matrix-domain-youtube-com",
      "matrixLabel": "youtube.com"
    },
    {
      "url": "https://youtube.com/watch?v=def456",
      "normalizedUrl": "https://youtube.com/watch?v=def456",
      "domain": "youtube.com",
      "origin": "tab",
      "matrixId": "matrix-domain-youtube-com",
      "matrixLabel": "youtube.com"
    }
  ]
}
```

**Criado por**: `Exporter.toJSON()`

**Consumido por**: Aplicações externas

---

### 5. ExportData (TXT)

**Propósito**: Formato de exportação TXT simples (opção secundária).

**Nota de implementação**: existem dois modos TXT no código atual:
- `txt`: inclui headers e separação por matriz
- `txt-simple`: apenas URLs normalizadas, uma por linha (sem headers)

**Camada**: Core → Infrastructure (Download)

**Formato**:
```
# Generated by tab-url-extractor
# Date: 2025-01-15T10:30:45.123Z
# Total URLs: 5
# Total Matrices: 2
# Export Type: full

# Matrix: youtube.com (2 URLs)
https://youtube.com/watch?v=abc123
https://youtube.com/watch?v=def456

# Matrix: github.com (3 URLs)
https://github.com/user/repo
https://github.com/user/repo/issues/1
https://github.com/another/project
```

**Regras**:
- Linhas iniciadas com `#` são comentários (metadados)
- URLs normalizadas, uma por linha
- Agrupadas por matriz com header `# Matrix: {label} ({count} URLs)`
- Linha em branco entre matrizes

**Criado por**: `Exporter.toTXT()`

---

## 🔄 Estruturas de Comunicação (Mensagens)

### 6. AnalyzeRequest

**Propósito**: Mensagem enviada da UI para o Service Worker solicitando análise.

**Schema**:
```javascript
{
  action: "analyze"
}
```

**Enviado por**: `popup.js`

**Recebido por**: `service-worker.js`

---

### 7. AnalyzeResponse

**Propósito**: Resposta do Service Worker após análise.

**Schema (Success)**:
```javascript
{
  status: "success",
  matrices: Array<UrlMatrix>
}
```

**Schema (Error)**:
```javascript
{
  status: "error",
  error: string,           // Mensagem de erro legível
  code?: string            // Código de erro opcional (ex: "NO_TABS_FOUND")
}
```

**Exemplo (Success)**:
```javascript
{
  "status": "success",
  "matrices": [
    {
      "id": "matrix-domain-youtube-com",
      "label": "youtube.com",
      "criterion": "domain",
      "criterionValue": "youtube.com",
      "urlCount": 15,
      "urls": [/* ... */],
      "createdAt": "2025-01-15T10:30:00.000Z"
    },
    {
      "id": "matrix-domain-github-com",
      "label": "github.com",
      "criterion": "domain",
      "criterionValue": "github.com",
      "urlCount": 8,
      "urls": [/* ... */],
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Exemplo (Error)**:
```javascript
{
  "status": "error",
  "error": "Failed to collect tabs: Permission denied",
  "code": "PERMISSION_DENIED"
}
```

**Enviado por**: `service-worker.js`

**Recebido por**: `popup.js`

---

### 8. ExportRequest

**Propósito**: Mensagem enviada da UI para o Service Worker solicitando exportação.

**Schema**:
```javascript
{
  action: "export",
  matrixIds: Array<string>,    // IDs das matrizes a exportar ([] = todas)
  format: "json" | "txt" | "txt-simple"  // Formato desejado
}
```

**Exemplo (Exportação Parcial)**:
```javascript
{
  "action": "export",
  "matrixIds": ["matrix-domain-youtube-com"],
  "format": "json"
}
```

**Exemplo (Exportação Completa)**:
```javascript
{
  "action": "export",
  "matrixIds": [],
  "format": "json"
}
```

**Enviado por**: `popup.js`

**Recebido por**: `service-worker.js`

---

### 9. ExportResponse

**Propósito**: Resposta do Service Worker após exportação.

**Schema (Success)**:
```javascript
{
  status: "success",
  downloadId: number,          // ID do download do Chrome
  filename: string             // Nome do arquivo baixado
}
```

**Schema (Error)**:
```javascript
{
  status: "error",
  error: string,
  code?: string
}
```

**Exemplo (Success)**:
```javascript
{
  "status": "success",
  "downloadId": 42,
  "filename": "tab-urls-2025-01-15T10-30-45.json"
}
```

**Enviado por**: `service-worker.js`

**Recebido por**: `popup.js`

---

## 🔍 Transformações de Dados

### Pipeline de Transformação Completo

```
chrome.tabs.Tab
    ↓
[TabCollector.mapToRawTab()]
    ↓
RawTab { url, title, tabId, windowId }
    ↓
[UrlProcessor.normalize()]
    ↓
UrlEntry { url, normalizedUrl, domain, origin, metadata }
    ↓
[UrlProcessor.deduplicate()]
    ↓
UrlEntry[] (sem duplicatas)
    ↓
[MatrixBuilder.groupByDomain()]
    ↓
Map<string, UrlEntry[]>
    ↓
[MatrixBuilder.createMatrices()]
    ↓
UrlMatrix[] { id, label, criterion, urlCount, urls }
    ↓
[Exporter.toJSON() ou Exporter.toTXT()]
    ↓
ExportData (JSON) ou string (TXT)
    ↓
[DownloadManager.create()]
    ↓
Arquivo baixado
```

---

## 🛡️ Validação de Estruturas

### Validadores Implementados

#### Validators.isValidUrl(url)

**Propósito**: Valida se uma string é uma URL válida.

**Implementação**:
```javascript
static isValidUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}
```

**Uso**:
```javascript
Validators.isValidUrl('https://example.com'); // true
Validators.isValidUrl('not-a-url'); // false
Validators.isValidUrl('chrome://extensions'); // false
```

---

#### Validators.isValidUrlEntry(entry)

**Propósito**: Valida se um objeto é um `UrlEntry` válido.

**Implementação**:
```javascript
static isValidUrlEntry(entry) {
  return (
    entry &&
    typeof entry === 'object' &&
    typeof entry.url === 'string' &&
    typeof entry.normalizedUrl === 'string' &&
    typeof entry.domain === 'string' &&
    typeof entry.origin === 'string' &&
    this.isValidUrl(entry.url) &&
    this.isValidUrl(entry.normalizedUrl)
  );
}
```

**Uso**:
```javascript
const entry = {
  url: 'https://example.com',
  normalizedUrl: 'https://example.com',
  domain: 'example.com',
  origin: 'tab'
};

Validators.isValidUrlEntry(entry); // true
```

---

#### Validators.isValidMatrix(matrix)

**Propósito**: Valida se um objeto é um `UrlMatrix` válido.

**Implementação**:
```javascript
static isValidMatrix(matrix) {
  return (
    matrix &&
    typeof matrix === 'object' &&
    typeof matrix.id === 'string' &&
    typeof matrix.label === 'string' &&
    typeof matrix.criterion === 'string' &&
    typeof matrix.criterionValue === 'string' &&
    typeof matrix.urlCount === 'number' &&
    Array.isArray(matrix.urls) &&
    matrix.urlCount === matrix.urls.length &&
    matrix.urls.every(url => this.isValidUrlEntry(url))
  );
}
```

---

#### Validators.isValidExportFormat(format)

**Propósito**: Valida se um formato de exportação é válido.

**Implementação**:
```javascript
static isValidExportFormat(format) {
  return format === 'json' || format === 'txt' || format === 'txt-simple';
}
```

---

## 📋 Enums e Constantes

### EXPORT_FORMATS

```javascript
const EXPORT_FORMATS = {
  JSON: 'json',
  TXT: 'txt',
  TXT_SIMPLE: 'txt-simple'
};
```

### MATRIX_CRITERION

```javascript
const MATRIX_CRITERION = {
  DOMAIN: 'domain'
  // Futuro: TLD: 'tld', PATH: 'path'
};
```

### MESSAGE_ACTIONS

```javascript
const MESSAGE_ACTIONS = {
  ANALYZE: 'analyze',
  EXPORT: 'export'
};
```

### RESPONSE_STATUS

```javascript
const RESPONSE_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error'
};
```

### EXPORT_TYPES

```javascript
const EXPORT_TYPES = {
  FULL: 'full',
  PARTIAL: 'partial'
};
```

---

## 🧪 Exemplos de Uso

### Criando um UrlEntry

```javascript
const rawTab = {
  url: 'https://WWW.YouTube.COM/watch?v=abc123&utm_source=share',
  title: 'Video Title',
  tabId: 123
};

const urlEntry = {
  url: rawTab.url,
  normalizedUrl: UrlProcessor.normalizeUrl(rawTab.url),
  domain: UrlProcessor.extractDomain(rawTab.url),
  origin: 'tab',
  metadata: {
    title: rawTab.title,
    tabId: rawTab.tabId
  }
};

console.log(urlEntry);
// {
//   url: "https://WWW.YouTube.COM/watch?v=abc123&utm_source=share",
//   normalizedUrl: "https://youtube.com/watch?v=abc123",
//   domain: "youtube.com",
//   origin: "tab",
//   metadata: { title: "Video Title", tabId: 123 }
// }
```

### Criando um UrlMatrix

```javascript
const urlEntries = [
  { url: 'https://youtube.com/watch?v=abc', normalizedUrl: '...', domain: 'youtube.com', origin: 'tab' },
  { url: 'https://youtube.com/watch?v=def', normalizedUrl: '...', domain: 'youtube.com', origin: 'tab' }
];

const matrix = {
  id: MatrixBuilder.generateMatrixId('youtube.com'),
  label: 'youtube.com',
  criterion: 'domain',
  criterionValue: 'youtube.com',
  urlCount: urlEntries.length,
  urls: urlEntries.map(entry => ({ ...entry, matrixId: 'matrix-domain-youtube-com' })),
  createdAt: new Date().toISOString()
};

console.log(matrix);
// {
//   id: "matrix-domain-youtube-com",
//   label: "youtube.com",
//   criterion: "domain",
//   criterionValue: "youtube.com",
//   urlCount: 2,
//   urls: [...],
//   createdAt: "2025-01-15T10:30:00.000Z"
// }
```

### Exportando para JSON

```javascript
const matrices = [
  { id: 'matrix-domain-youtube-com', label: 'youtube.com', urlCount: 2, urls: [...] },
  { id: 'matrix-domain-github-com', label: 'github.com', urlCount: 3, urls: [...] }
];

const exportData = Exporter.toJSON(matrices, 'full');

console.log(exportData);
// {
//   version: "1.0.0",
//   generatedAt: "2025-01-15T10:30:00.000Z",
//   source: "tab-url-extractor",
//   metadata: { totalUrls: 5, totalMatrices: 2, exportType: "full" },
//   data: [...]
// }
```

---

## 🔮 Evolução Futura de Schemas

### Adição de Novos Campos (Backward Compatible)

**Versão 1.1.0**:
```javascript
// UrlEntry com novos campos opcionais
{
  url: string,
  normalizedUrl: string,
  domain: string,
  origin: string,
  matrixId: string,
  metadata: {
    title?: string,
    favicon?: string,        // NOVO
    lastVisited?: string     // NOVO
  }
}
```

### Mudanças Breaking (Requer Nova Versão Major)

**Versão 2.0.0**:
```javascript
// ExportData com estrutura modificada
{
  schema: {
    version: "2.0.0",
    format: "json"
  },
  generated: "2025-01-15T10:30:00.000Z",
  matrices: [
    {
      id: "...",
      urls: [...]
    }
  ]
}
```

---

**Estruturas de dados projetadas para clareza, validação e evolução controlada.**
