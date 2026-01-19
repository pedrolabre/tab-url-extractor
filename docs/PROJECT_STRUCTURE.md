# Estrutura do Projeto: tab-url-extractor

## 📁 Árvore de Diretórios Completa

```
tab-url-extractor/
├── generate_icons.py             # Script utilitário para gerar ícones (opcional)
├── manifest.json                 # Manifest V3 configuration
├── README.md                     # Documentação principal
├── LICENSE                        # Licença MIT
├── .gitignore                    # Arquivos ignorados pelo Git
│
├── popup/                        # UI Layer - Interface do usuário
│   ├── popup.html                # Estrutura HTML do popup
│   ├── popup.js                  # Lógica de controle e comunicação
│   ├── popup.css                 # Estilos visuais
│   └── assets/                   # Assets da UI
│       ├── icons/
│       │   ├── icon-16.png
│       │   ├── icon-48.png
│       │   └── icon-128.png
│
├── background/                   # Orchestration Layer - Service Worker
│   └── service-worker.js         # Orquestrador principal
│
├── core/                         # Business Logic Layer - Lógica de negócio
│   ├── url-processor.js          # Normalização e deduplicação de URLs
│   ├── matrix-builder.js         # Construção de URL-Matriz
│   └── exporter.js               # Formatação de exportação (JSON, TXT, TXT Simple)
│
├── infrastructure/               # Infrastructure Layer - Browser Interface
│   ├── tab-collector.js          # Coleta de abas via Chrome API
│   └── download-manager.js       # Gerenciamento de downloads
│
├── utils/                        # Shared Utilities - Utilitários compartilhados
│   ├── logger.js                 # Sistema de logging
│   ├── validators.js             # Validadores de dados
│   └── constants.js              # Constantes globais
│
├── types/                        # Type Definitions - Definições de tipos
│   └── index.js                  # JSDoc typedefs (RawTab, UrlEntry, UrlMatrix, ExportData)
│
├── docs/                         # Documentação completa
│   ├── VISION.md                 # Visão e filosofia do projeto
│   ├── SCOPE.md                  # Escopo detalhado
│   ├── ARCHITECTURE.md           # Arquitetura em camadas
│   ├── PROJECT_STRUCTURE.md      # Este arquivo
│   ├── DATA_STRUCTURES.md        # Estruturas de dados
│   ├── DATA_FLOW.md              # Fluxo de dados e comunicação
│   ├── MODULES.md                # Especificação de módulos
│   ├── EXPORT_FORMAT.md          # Formato de exportação
│   ├── INSTALLATION.md           # Guia de instalação
│   ├── USAGE.md                  # Guia de uso
│   └── TEST_EXAMPLES.md          # Cenários de teste
```

> Observação: este repositório não contém (por enquanto) `package.json` ou `/tests`.
> A documentação menciona esses itens como possíveis extensões futuras.

## 📂 Detalhamento por Diretório

### 1. Raiz do Projeto (`/`)

#### manifest.json
**Propósito**: Configuração principal da extensão Chrome (Manifest V3)

**Conteúdo mínimo**:
```json
{
  "manifest_version": 3,
  "name": "tab-url-extractor",
  "version": "1.1.0",
  "description": "Extract, normalize and export URLs from open tabs",
  "icons": {
    "16": "popup/assets/icons/icon-16.png",
    "48": "popup/assets/icons/icon-48.png",
    "128": "popup/assets/icons/icon-128.png"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "popup/assets/icons/icon-16.png",
      "48": "popup/assets/icons/icon-48.png",
      "128": "popup/assets/icons/icon-128.png"
    }
  },
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "permissions": [
    "tabs",
    "downloads"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

#### .gitignore
```
# Node modules
node_modules/

# Build outputs
dist/
build/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log

# Temporary files
*.tmp
.cache/
```

#### package.json (Opcional)
**Propósito**: Gerenciamento de dependências e scripts de build

```json
{
  "name": "tab-url-extractor",
  "version": "1.0.0",
  "description": "Chrome extension for URL extraction",
  "scripts": {
    "test": "jest",
    "lint": "eslint .",
    "build": "echo 'No build step required for MVP'"
  },
  "keywords": ["chrome-extension", "url-extractor", "tabs"],
  "author": "Your Name",
  "license": "MIT",
  "devDependencies": {
    "eslint": "^8.0.0",
    "jest": "^29.0.0"
  }
}
```

---

### 2. Popup (`/popup`)

**Propósito**: Contém toda a interface do usuário (UI Layer)

#### popup.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tab URL Extractor</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div id="app">
    <!-- Conteúdo dinâmico -->
  </div>
  <script src="popup.js" type="module"></script>
</body>
</html>
```

#### popup.js
**Responsabilidades**:
- Gerenciar estados da UI (Ocioso, Analisando, Pronto, Erro)
- Capturar eventos de clique
- Enviar mensagens ao Service Worker
- Renderizar lista de URL-Matriz
- Tratar respostas e erros

**Estrutura sugerida**:
```javascript
// Estado da aplicação
const AppState = {
  IDLE: 'idle',
  ANALYZING: 'analyzing',
  READY: 'ready',
  ERROR: 'error'
};

// Controle de UI
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
    // Event listeners
  }
  
  async handleAnalyze() {
    // Lógica de análise
  }
  
  async handleExport(matrixIds, format) {
    // Lógica de exportação
  }
  
  render() {
    // Renderização da UI
  }
}

// Inicialização
const app = new PopupController();
```

#### popup.css
**Responsabilidades**:
- Estilos visuais consistentes
- Responsividade (mínimo 300px width)
- Estados visuais (loading, hover, disabled)

**Estrutura sugerida**:
```css
/* Reset e variáveis */
:root {
  --primary-color: #4285f4;
  --secondary-color: #34a853;
  --error-color: #ea4335;
  --bg-color: #ffffff;
  --text-color: #202124;
}

/* Layout */
body { /* ... */ }

/* Componentes */
.btn-primary { /* ... */ }
.matrix-item { /* ... */ }
.loading-spinner { /* ... */ }
```

#### assets/
**Propósito**: Recursos estáticos da UI

- **icons/**: Ícones em três tamanhos (16x16, 48x48, 128x128)
- **images/**: Imagens adicionais (logo, illustrations)

---

### 3. Background (`/background`)

**Propósito**: Orquestração central da extensão (Orchestration Layer)

#### service-worker.js
**Responsabilidades**:
- Escutar mensagens via `chrome.runtime.onMessage`
- Orquestrar operações entre Infrastructure e Core
- Gerenciar estado temporário durante análise
- Retornar respostas formatadas
- Log de operações

**Estrutura sugerida**:
```javascript
// Importações (se usando modules)
import { TabCollector } from '../infrastructure/tab-collector.js';
import { UrlProcessor } from '../core/url-processor.js';
import { MatrixBuilder } from '../core/matrix-builder.js';
import { Exporter } from '../core/exporter.js';
import { DownloadManager } from '../infrastructure/download-manager.js';
import { Logger } from '../utils/logger.js';

// Estado temporário
let currentMatrices = [];

// Listener de mensagens
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'analyze') {
    handleAnalyze(sendResponse);
    return true;
  }
  
  if (message.action === 'export') {
    handleExport(message.matrixIds, message.format, sendResponse);
    return true;
  }
});

// Handlers
async function handleAnalyze(sendResponse) { /* ... */ }
async function handleExport(matrixIds, format, sendResponse) { /* ... */ }
```

---

### 4. Core (`/core`)

**Propósito**: Lógica de negócio pura, agnóstica ao navegador (Business Logic Layer)

#### url-processor.js
**Responsabilidades**:
- Normalizar URLs (lowercase domain, remove trailing slash, etc.)
- Remover parâmetros de tracking (utm_*, fbclid, etc.)
- Deduplicar URLs exatas
- Extrair domínio

**Estrutura**:
```javascript
export class UrlProcessor {
  static process(rawTabs) { /* ... */ }
  static normalize(rawTabs) { /* ... */ }
  static normalizeUrl(url) { /* ... */ }
  static deduplicate(urlEntries) { /* ... */ }
  static extractDomain(url) { /* ... */ }
}
```

#### matrix-builder.js
**Responsabilidades**:
- Agrupar URLs por critério (domínio, subdomínio)
- Criar objetos UrlMatrix
- Ordenar por quantidade de URLs
- Gerar IDs únicos para matrizes

**Estrutura**:
```javascript
export class MatrixBuilder {
  static build(urlEntries) { /* ... */ }
  static groupByDomain(urlEntries) { /* ... */ }
  static createMatrices(grouped) { /* ... */ }
  static sortByUrlCount(matrices) { /* ... */ }
  static generateMatrixId(criterionValue) { /* ... */ }
}
```

#### exporter.js
**Responsabilidades**:
- Formatar matrizes em JSON versionado
- Formatar matrizes em TXT simples
- Adicionar metadados (timestamp, versão, contadores)
- Flatten de matrizes para array de URLs

**Estrutura**:
```javascript
export class Exporter {
  static toJSON(matrices, exportType) { /* ... */ }
  static toTXT(matrices) { /* ... */ }
  static buildMetadata(matrices, exportType) { /* ... */ }
  static flattenMatrices(matrices) { /* ... */ }
}
```

---

### 5. Infrastructure (`/infrastructure`)

**Propósito**: Abstração de Chrome APIs (Infrastructure Layer)

#### tab-collector.js
**Responsabilidades**:
- Coletar todas as abas via `chrome.tabs.query()`
- Filtrar abas inválidas (chrome://, chrome-extension://)
- Mapear para estrutura RawTab

**Estrutura**:
```javascript
export class TabCollector {
  static async collect() { /* ... */ }
  static isValidTab(tab) { /* ... */ }
  static mapToRawTab(tab) { /* ... */ }
}
```

#### download-manager.js
**Responsabilidades**:
- Criar downloads via `chrome.downloads.download()`
- Gerar Blobs de conteúdo
- Sugerir nomes de arquivo com timestamp
- Gerenciar MIME types

**Estrutura**:
```javascript
export class DownloadManager {
  static async create(content, filename, mimeType) { /* ... */ }
  static generateFilename(format) { /* ... */ }
  static getMimeType(format) { /* ... */ }
}
```

---

### 6. Utils (`/utils`)

**Propósito**: Utilitários compartilhados entre todas as camadas

#### logger.js
**Responsabilidades**:
- Logging estruturado com níveis (info, warn, error)
- Formatação consistente de mensagens
- Timestamp em logs

**Estrutura**:
```javascript
export class Logger {
  static info(message, data) { /* ... */ }
  static warn(message, data) { /* ... */ }
  static error(message, error) { /* ... */ }
  static log(level, message, data) { /* ... */ }
}
```

#### validators.js
**Responsabilidades**:
- Validar estrutura de URLs
- Validar objetos UrlEntry, UrlMatrix
- Validar formatos de exportação

**Estrutura**:
```javascript
export class Validators {
  static isValidUrl(url) { /* ... */ }
  static isValidUrlEntry(entry) { /* ... */ }
  static isValidMatrix(matrix) { /* ... */ }
  static isValidExportFormat(format) { /* ... */ }
}
```

#### constants.js
**Responsabilidades**:
- Constantes globais do sistema
- Enums e valores fixos
- Configurações padrão

**Estrutura**:
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
    'utm_source', 'utm_medium', 'utm_campaign',
    'fbclid', 'gclid', 'msclkid'
  ]
};
```

---

### 7. Types (`/types`)

**Propósito**: Definições de estruturas de dados (útil para documentação e futuro TypeScript)

#### index.js
As definições de tipos ficam centralizadas em `types/index.js` via JSDoc (ex.: `RawTab`, `UrlEntry`, `UrlMatrix`, `ExportData`).

Isso evita múltiplos arquivos de tipo no MVP e mantém a documentação alinhada ao código.

---

### 8. Docs (`/docs`)

**Propósito**: Documentação completa do projeto

**Arquivos**:
- `VISION.md` - Filosofia e objetivos
- `SCOPE.md` - Escopo detalhado
- `ARCHITECTURE.md` - Arquitetura em camadas
- `PROJECT_STRUCTURE.md` - Este arquivo
- `DATA_STRUCTURES.md` - Estruturas de dados
- `DATA_FLOW.md` - Fluxo de dados e comunicação
- `MODULES.md` - Especificação de módulos
- `EXPORT_FORMAT.md` - Formato de exportação
- `INSTALLATION.md` - Guia de instalação
- `USAGE.md` - Guia de uso
- `TEST_EXAMPLES.md` - Cenários de teste

---

### 9. Tests (`/tests`) - Futuro

**Propósito**: Testes unitários e de integração

**Estrutura**:
```
tests/
├── core/                    # Testes do Core (100% testável)
│   ├── url-processor.test.js
│   ├── matrix-builder.test.js
│   └── exporter.test.js
├── infrastructure/          # Testes com mocks
│   ├── tab-collector.test.js
│   └── download-manager.test.js
└── mocks/
    └── chrome-api.mock.js   # Mock do Chrome API
```

## 🔧 Convenções de Nomenclatura

### Arquivos

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| JavaScript | kebab-case | `url-processor.js` |
| HTML | kebab-case | `popup.html` |
| CSS | kebab-case | `popup.css` |
| Markdown | UPPERCASE | `README.md` |
| JSON | lowercase | `manifest.json` |
| Testes | `.test.js` | `url-processor.test.js` |

### Classes

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Classes | PascalCase | `UrlProcessor` |
| Métodos | camelCase | `normalizeUrl()` |
| Constantes | UPPER_SNAKE_CASE | `EXPORT_FORMATS` |
| Variáveis | camelCase | `urlEntries` |

### Estruturas de Dados

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Tipos | PascalCase | `UrlEntry`, `UrlMatrix` |
| Propriedades | camelCase | `normalizedUrl`, `urlCount` |
| IDs | kebab-case | `matrix-youtube-com` |

## 📦 Módulos e Imports

### ES6 Modules (Recomendado)

**manifest.json**:
```json
{
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  }
}
```

**service-worker.js**:
```javascript
import { TabCollector } from '../infrastructure/tab-collector.js';
import { UrlProcessor } from '../core/url-processor.js';
```

### Alternativa: Script Tags Sequenciais

Se não usar modules, carregar na ordem correta:

**manifest.json**:
```json
{
  "background": {
    "service_worker": "background/service-worker.js"
  }
}
```

Todas as dependências devem ser incluídas no `service-worker.js` via `importScripts()`:
```javascript
importScripts(
  '../utils/constants.js',
  '../utils/logger.js',
  '../core/url-processor.js',
  '../core/matrix-builder.js',
  '../infrastructure/tab-collector.js'
);
```

## 🔍 Navegação Rápida por Funcionalidade

### "Onde está a lógica de normalização de URLs?"
→ `core/url-processor.js`

### "Onde são coletadas as abas?"
→ `infrastructure/tab-collector.js`

### "Como as matrizes são criadas?"
→ `core/matrix-builder.js`

### "Onde é gerado o JSON de exportação?"
→ `core/exporter.js`

### "Como funciona o download de arquivos?"
→ `infrastructure/download-manager.js`

### "Onde está a interface do usuário?"
→ `popup/popup.html`, `popup/popup.js`, `popup/popup.css`

### "Como a UI se comunica com o backend?"
→ `background/service-worker.js` (orquestrador)

## 📏 Tamanho de Arquivos (Estimativa)

| Arquivo | Linhas de Código (Estimativa) |
|---------|-------------------------------|
| `core/url-processor.js` | 100-150 linhas |
| `core/matrix-builder.js` | 80-120 linhas |
| `core/exporter.js` | 60-100 linhas |
| `infrastructure/tab-collector.js` | 40-60 linhas |
| `infrastructure/download-manager.js` | 40-60 linhas |
| `background/service-worker.js` | 80-120 linhas |
| `popup/popup.js` | 150-200 linhas |
| `popup/popup.html` | 50-80 linhas |
| `popup/popup.css` | 100-150 linhas |

**Total estimado**: ~800-1200 linhas de código (MVP)

## 🎯 Checklist de Implementação

### Fase 1: Setup
- [ ] Criar estrutura de pastas
- [ ] Configurar `manifest.json`
- [ ] Configurar `.gitignore`
- [ ] Criar `README.md` básico

### Fase 2: Core Logic
- [ ] Implementar `url-processor.js`
- [ ] Implementar `matrix-builder.js`
- [ ] Implementar `exporter.js`
- [ ] Testar Core isoladamente

### Fase 3: Infrastructure
- [ ] Implementar `tab-collector.js`
- [ ] Implementar `download-manager.js`
- [ ] Testar com mocks

### Fase 4: Orchestration
- [ ] Implementar `service-worker.js`
- [ ] Integrar Core + Infrastructure
- [ ] Testar fluxo completo

### Fase 5: UI
- [ ] Criar `popup.html` estrutura
- [ ] Implementar `popup.js` controle
- [ ] Estilizar `popup.css`
- [ ] Testar interações

### Fase 6: Integração e Testes
- [ ] Testar extensão no Chrome
- [ ] Validar exportações JSON/TXT
- [ ] Testar cenários de erro
- [ ] Ajustes finais

---

**Estrutura projetada para máxima clareza e manutenibilidade.**
