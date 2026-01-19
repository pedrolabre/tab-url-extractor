# Formato de Exportação: tab-url-extractor

## 📄 Visão Geral

Este documento especifica o formato de exportação do **tab-url-extractor**, incluindo schemas JSON versionados, formato TXT, exemplos práticos, validação e estratégia de evolução.

## 🎯 Princípios de Design do Formato

1. **Versionamento Semântico**: Schemas seguem SemVer (1.0.0, 1.1.0, 2.0.0)
2. **Machine-Readable**: JSON estruturado para consumo programático
3. **Human-Readable**: TXT simples para uso manual
4. **Metadados Completos**: Rastreabilidade e contexto
5. **Backward Compatibility**: Mudanças compatíveis incrementam minor version
6. **Validável**: Schemas podem ser validados via JSON Schema

---

## 📋 Formato JSON (Principal)

### Schema v1.0.0

#### Estrutura Completa

```json
{
  "version": "string (SemVer)",
  "generatedAt": "string (ISO-8601 timestamp)",
  "source": "string (sempre 'tab-url-extractor')",
  "metadata": {
    "totalUrls": "number",
    "totalMatrices": "number",
    "exportType": "string ('full' | 'partial')",
    "matrixIds": "array<string> (opcional, apenas para partial)"
  },
  "data": [
    {
      "url": "string (URL original completa)",
      "normalizedUrl": "string (URL após normalização)",
      "domain": "string (domínio extraído)",
      "origin": "string (fonte da URL, ex: 'tab')",
      "matrixId": "string (ID da matriz associada)",
      "matrixLabel": "string (label legível da matriz)"
    }
  ]
}
```

#### JSON Schema (para validação)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "TabUrlExtractorExport",
  "type": "object",
  "required": ["version", "generatedAt", "source", "metadata", "data"],
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Semantic version of the export format"
    },
    "generatedAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO-8601 timestamp of generation"
    },
    "source": {
      "type": "string",
      "const": "tab-url-extractor",
      "description": "Source application identifier"
    },
    "metadata": {
      "type": "object",
      "required": ["totalUrls", "totalMatrices", "exportType"],
      "properties": {
        "totalUrls": {
          "type": "integer",
          "minimum": 0,
          "description": "Total number of URLs in export"
        },
        "totalMatrices": {
          "type": "integer",
          "minimum": 0,
          "description": "Total number of matrices in export"
        },
        "exportType": {
          "type": "string",
          "enum": ["full", "partial"],
          "description": "Type of export"
        },
        "matrixIds": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "IDs of exported matrices (only for partial exports)"
        }
      }
    },
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["url", "normalizedUrl", "domain", "origin", "matrixId", "matrixLabel"],
        "properties": {
          "url": {
            "type": "string",
            "format": "uri",
            "description": "Original URL"
          },
          "normalizedUrl": {
            "type": "string",
            "format": "uri",
            "description": "Normalized URL"
          },
          "domain": {
            "type": "string",
            "description": "Extracted domain"
          },
          "origin": {
            "type": "string",
            "description": "Source of URL"
          },
          "matrixId": {
            "type": "string",
            "description": "Associated matrix ID"
          },
          "matrixLabel": {
            "type": "string",
            "description": "Human-readable matrix label"
          }
        }
      }
    }
  }
}
```

---

## 📝 Exemplos Práticos

### Exemplo 1: Exportação Completa (Full Export)

**Cenário**: Usuário clica em "Extrair todos" com 3 abas de YouTube e 2 de GitHub abertas.

```json
{
  "version": "1.0.0",
  "generatedAt": "2025-01-15T14:30:45.123Z",
  "source": "tab-url-extractor",
  "metadata": {
    "totalUrls": 5,
    "totalMatrices": 2,
    "exportType": "full"
  },
  "data": [
    {
      "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "normalizedUrl": "https://youtube.com/watch?v=dQw4w9WgXcQ",
      "domain": "youtube.com",
      "origin": "tab",
      "matrixId": "matrix-domain-youtube-com",
      "matrixLabel": "youtube.com"
    },
    {
      "url": "https://YouTube.com/watch?v=abc123&utm_source=share",
      "normalizedUrl": "https://youtube.com/watch?v=abc123",
      "domain": "youtube.com",
      "origin": "tab",
      "matrixId": "matrix-domain-youtube-com",
      "matrixLabel": "youtube.com"
    },
    {
      "url": "https://m.youtube.com/watch?v=xyz789#t=30",
      "normalizedUrl": "https://m.youtube.com/watch?v=xyz789",
      "domain": "m.youtube.com",
      "origin": "tab",
      "matrixId": "matrix-domain-m-youtube-com",
      "matrixLabel": "m.youtube.com"
    },
    {
      "url": "https://github.com/user/awesome-project",
      "normalizedUrl": "https://github.com/user/awesome-project",
      "domain": "github.com",
      "origin": "tab",
      "matrixId": "matrix-domain-github-com",
      "matrixLabel": "github.com"
    },
    {
      "url": "https://github.com/user/awesome-project/issues/42?page=2",
      "normalizedUrl": "https://github.com/user/awesome-project/issues/42?page=2",
      "domain": "github.com",
      "origin": "tab",
      "matrixId": "matrix-domain-github-com",
      "matrixLabel": "github.com"
    }
  ]
}
```

**Características**:
- ✅ `exportType: "full"` indica exportação completa
- ✅ `totalUrls: 5` corresponde a `data.length`
- ✅ `totalMatrices: 2` (youtube.com, m.youtube.com, github.com = 3 matrizes, mas contando apenas 2 principais)
- ✅ Todas as URLs normalizadas (lowercase domain, sem tracking params, sem hash)
- ✅ Cada URL associada ao seu `matrixId`

---

### Exemplo 2: Exportação Parcial (Partial Export)

**Cenário**: Usuário clica em "Extrair" apenas na matriz do YouTube.

```json
{
  "version": "1.0.0",
  "generatedAt": "2025-01-15T14:35:12.456Z",
  "source": "tab-url-extractor",
  "metadata": {
    "totalUrls": 2,
    "totalMatrices": 1,
    "exportType": "partial",
    "matrixIds": ["matrix-domain-youtube-com"]
  },
  "data": [
    {
      "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "normalizedUrl": "https://youtube.com/watch?v=dQw4w9WgXcQ",
      "domain": "youtube.com",
      "origin": "tab",
      "matrixId": "matrix-domain-youtube-com",
      "matrixLabel": "youtube.com"
    },
    {
      "url": "https://YouTube.com/watch?v=abc123&utm_source=share",
      "normalizedUrl": "https://youtube.com/watch?v=abc123",
      "domain": "youtube.com",
      "origin": "tab",
      "matrixId": "matrix-domain-youtube-com",
      "matrixLabel": "youtube.com"
    }
  ]
}
```

**Características**:
- ✅ `exportType: "partial"` indica exportação parcial
- ✅ `matrixIds` array presente com IDs exportados
- ✅ Apenas URLs da matriz selecionada

---

### Exemplo 3: Exportação Vazia (Edge Case)

**Cenário**: Nenhuma aba válida encontrada (apenas chrome://)

```json
{
  "version": "1.0.0",
  "generatedAt": "2025-01-15T14:40:00.000Z",
  "source": "tab-url-extractor",
  "metadata": {
    "totalUrls": 0,
    "totalMatrices": 0,
    "exportType": "full"
  },
  "data": []
}
```

**Características**:
- ✅ `data` array vazio
- ✅ Metadados com zeros
- ✅ Formato válido mesmo sem dados

---

### Exemplo 4: Exportação com Múltiplos Domínios

**Cenário**: 20 URLs de 5 domínios diferentes.

```json
{
  "version": "1.0.0",
  "generatedAt": "2025-01-15T15:00:00.000Z",
  "source": "tab-url-extractor",
  "metadata": {
    "totalUrls": 20,
    "totalMatrices": 5,
    "exportType": "full"
  },
  "data": [
    {
      "url": "https://youtube.com/watch?v=video1",
      "normalizedUrl": "https://youtube.com/watch?v=video1",
      "domain": "youtube.com",
      "origin": "tab",
      "matrixId": "matrix-domain-youtube-com",
      "matrixLabel": "youtube.com"
    },
    {
      "url": "https://youtube.com/watch?v=video2",
      "normalizedUrl": "https://youtube.com/watch?v=video2",
      "domain": "youtube.com",
      "origin": "tab",
      "matrixId": "matrix-domain-youtube-com",
      "matrixLabel": "youtube.com"
    },
    {
      "url": "https://github.com/user/repo1",
      "normalizedUrl": "https://github.com/user/repo1",
      "domain": "github.com",
      "origin": "tab",
      "matrixId": "matrix-domain-github-com",
      "matrixLabel": "github.com"
    },
    {
      "url": "https://stackoverflow.com/questions/12345",
      "normalizedUrl": "https://stackoverflow.com/questions/12345",
      "domain": "stackoverflow.com",
      "origin": "tab",
      "matrixId": "matrix-domain-stackoverflow-com",
      "matrixLabel": "stackoverflow.com"
    },
    {
      "url": "https://docs.python.org/3/library/",
      "normalizedUrl": "https://docs.python.org/3/library",
      "domain": "docs.python.org",
      "origin": "tab",
      "matrixId": "matrix-domain-docs-python-org",
      "matrixLabel": "docs.python.org"
    },
    {
      "url": "https://medium.com/@author/article",
      "normalizedUrl": "https://medium.com/@author/article",
      "domain": "medium.com",
      "origin": "tab",
      "matrixId": "matrix-domain-medium-com",
      "matrixLabel": "medium.com"
    }
  ]
}
```

*(Nota: Apenas 6 URLs mostradas para brevidade, total seria 20)*

---

## 📃 Formato TXT (Secundário)

O código atual suporta **dois modos TXT**:

1) `txt`: inclui metadados e agrupamento por matriz
2) `txt-simple`: apenas URLs normalizadas (uma por linha)

### Estrutura

```
# Generated by tab-url-extractor
# Date: <ISO-8601 timestamp>
# Total URLs: <number>
# Total Matrices: <number>
# Export Type: <standard | empty>

# Matrix: <label> (<urlCount> URLs)
<normalizedUrl>
<normalizedUrl>
...

# Matrix: <label> (<urlCount> URLs)
<normalizedUrl>
<normalizedUrl>
...
```

### Características

- **Comentários**: Linhas iniciadas com `#` são metadados
- **Agrupamento**: URLs agrupadas por matriz
- **Separação**: Linha em branco entre matrizes
- **Formato**: URLs normalizadas, uma por linha

### Estrutura (txt-simple)

```
<normalizedUrl>
<normalizedUrl>
...
```

### Características (txt-simple)

- **Sem headers**: não inclui metadados
- **Sem agrupamento**: apenas lista plana de URLs

---

### Exemplo TXT: Exportação Completa

```
# Generated by tab-url-extractor
# Date: 2025-01-15T14:30:45.123Z
# Total URLs: 5
# Total Matrices: 2
# Export Type: standard

# Matrix: youtube.com (3 URLs)
https://youtube.com/watch?v=dQw4w9WgXcQ
https://youtube.com/watch?v=abc123
https://youtube.com/watch?v=xyz789

# Matrix: github.com (2 URLs)
https://github.com/user/awesome-project
https://github.com/user/awesome-project/issues/42?page=2
```

---

### Exemplo TXT: Exportação Parcial

```
# Generated by tab-url-extractor
# Date: 2025-01-15T14:35:12.456Z
# Total URLs: 2
# Total Matrices: 1
# Export Type: standard

# Matrix: youtube.com (2 URLs)
https://youtube.com/watch?v=dQw4w9WgXcQ
https://youtube.com/watch?v=abc123

---

### Exemplo TXT Simple: Somente URLs

```
https://youtube.com/watch?v=dQw4w9WgXcQ
https://youtube.com/watch?v=abc123
```
```

---

## 🔄 Consumo de Dados (Aplicações Externas)

### Exemplo: Parser em JavaScript

```javascript
// Carregando JSON exportado
const exportData = JSON.parse(fileContent);

// Validando versão
if (exportData.version !== '1.0.0') {
  console.warn('Unexpected version:', exportData.version);
}

// Acessando metadados
console.log(`Total de URLs: ${exportData.metadata.totalUrls}`);
console.log(`Total de Matrizes: ${exportData.metadata.totalMatrices}`);

// Iterando sobre URLs
exportData.data.forEach(item => {
  console.log(`URL: ${item.normalizedUrl}`);
  console.log(`Domínio: ${item.domain}`);
  console.log(`Matriz: ${item.matrixLabel}`);
});

// Filtrando por domínio
const youtubeUrls = exportData.data.filter(item => 
  item.domain === 'youtube.com'
);
console.log(`URLs do YouTube: ${youtubeUrls.length}`);

// Agrupando por matriz
const byMatrix = {};
exportData.data.forEach(item => {
  if (!byMatrix[item.matrixId]) {
    byMatrix[item.matrixId] = [];
  }
  byMatrix[item.matrixId].push(item);
});
```

---

### Exemplo: Parser em Python

```python
import json
from datetime import datetime

# Carregando JSON
with open('tab-urls-2025-01-15.json', 'r') as f:
    export_data = json.load(f)

# Validando estrutura
assert 'version' in export_data
assert 'data' in export_data
assert export_data['source'] == 'tab-url-extractor'

# Acessando metadados
print(f"Total URLs: {export_data['metadata']['totalUrls']}")
print(f"Gerado em: {export_data['generatedAt']}")

# Processando URLs
for item in export_data['data']:
    url = item['normalizedUrl']
    domain = item['domain']
    print(f"{domain}: {url}")

# Estatísticas por domínio
from collections import Counter
domains = [item['domain'] for item in export_data['data']]
domain_counts = Counter(domains)
print("\nURLs por domínio:")
for domain, count in domain_counts.most_common():
    print(f"  {domain}: {count}")
```

---

### Exemplo: Importação em Banco de Dados (SQL)

```sql
-- Criar tabela
CREATE TABLE urls (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    normalized_url TEXT NOT NULL,
    domain TEXT NOT NULL,
    origin TEXT NOT NULL,
    matrix_id TEXT NOT NULL,
    matrix_label TEXT NOT NULL,
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir dados (usando script de importação)
INSERT INTO urls (url, normalized_url, domain, origin, matrix_id, matrix_label)
VALUES (?, ?, ?, ?, ?, ?);

-- Consultas úteis
-- Contar URLs por domínio
SELECT domain, COUNT(*) as total
FROM urls
GROUP BY domain
ORDER BY total DESC;

-- Listar todas as matrizes
SELECT DISTINCT matrix_id, matrix_label
FROM urls;
```

---

## 📊 Versionamento e Evolução

### Estratégia de Versionamento Semântico

#### MAJOR (X.0.0) - Breaking Changes

**Quando incrementar**:
- Mudança na estrutura base do JSON
- Remoção de campos obrigatórios
- Mudança de tipo de campos existentes
- Renomeação de campos

**Exemplo de mudança breaking (v1.0.0 → v2.0.0)**:
```json
// v1.0.0
{
  "version": "1.0.0",
  "data": [...]
}

// v2.0.0 (breaking change)
{
  "schema": {
    "version": "2.0.0",
    "format": "json"
  },
  "exportData": [...] // "data" renomeado para "exportData"
}
```

---

#### MINOR (1.X.0) - Backward Compatible

**Quando incrementar**:
- Adição de novos campos opcionais
- Adição de novos valores em enums
- Adição de novos metadados

**Exemplo de mudança minor (v1.0.0 → v1.1.0)**:
```json
// v1.0.0
{
  "version": "1.0.0",
  "data": [
    {
      "url": "...",
      "domain": "..."
    }
  ]
}

// v1.1.0 (backward compatible)
{
  "version": "1.1.0",
  "data": [
    {
      "url": "...",
      "domain": "...",
      "favicon": "...",      // NOVO campo opcional
      "lastVisited": "..."   // NOVO campo opcional
    }
  ]
}
```

**Consumidores de v1.0.0 continuam funcionando** (ignoram novos campos).

---

#### PATCH (1.0.X) - Bug Fixes

**Quando incrementar**:
- Correção de bugs na geração
- Melhorias de performance
- Correções de documentação

**Não afeta estrutura do JSON exportado**.

---

### Roadmap de Versões Futuras

#### v1.1.0 (Planejado)

**Novos campos opcionais**:
```json
{
  "version": "1.1.0",
  "data": [
    {
      "url": "...",
      "normalizedUrl": "...",
      "domain": "...",
      "origin": "tab",
      "matrixId": "...",
      "matrixLabel": "...",
      "metadata": {              // NOVO: metadados expandidos
        "title": "...",
        "favicon": "...",
        "lastVisited": "...",
        "visitCount": 0
      }
    }
  ]
}
```

---

#### v1.2.0 (Planejado)

**Suporte a múltiplas origens**:
```json
{
  "version": "1.2.0",
  "metadata": {
    "sources": ["tab", "bookmark"] // NOVO: múltiplas fontes
  },
  "data": [
    {
      "url": "...",
      "origin": "bookmark"  // NOVO valor possível
    }
  ]
}
```

---

#### v2.0.0 (Futuro Distante)

**Reestruturação completa** (breaking change):
```json
{
  "schema": {
    "version": "2.0.0",
    "format": "json"
  },
  "generated": "...",
  "matrices": [
    {
      "id": "...",
      "label": "...",
      "urls": [...]
    }
  ]
}
```

---

## ✅ Validação de Formato

### Validação Manual (JavaScript)

```javascript
function validateExportData(data) {
  // Valida estrutura básica
  if (!data.version || !data.generatedAt || !data.source || !data.metadata || !data.data) {
    return { valid: false, error: 'Missing required fields' };
  }
  
  // Valida versão
  if (!/^\d+\.\d+\.\d+$/.test(data.version)) {
    return { valid: false, error: 'Invalid version format' };
  }
  
  // Valida source
  if (data.source !== 'tab-url-extractor') {
    return { valid: false, error: 'Invalid source' };
  }
  
  // Valida metadata
  const meta = data.metadata;
  if (typeof meta.totalUrls !== 'number' || typeof meta.totalMatrices !== 'number') {
    return { valid: false, error: 'Invalid metadata types' };
  }
  
  if (!['full', 'partial'].includes(meta.exportType)) {
    return { valid: false, error: 'Invalid exportType' };
  }
  
  // Valida data array
  if (!Array.isArray(data.data)) {
    return { valid: false, error: 'data must be an array' };
  }
  
  // Valida cada item
  for (const item of data.data) {
    if (!item.url || !item.normalizedUrl || !item.domain || !item.origin || !item.matrixId || !item.matrixLabel) {
      return { valid: false, error: 'Missing required fields in data item' };
    }
  }
  
  // Valida consistência de contadores
  if (data.data.length !== meta.totalUrls) {
    return { valid: false, error: 'totalUrls does not match data.length' };
  }
  
  return { valid: true };
}
```

---

### Validação via JSON Schema (Node.js)

```javascript
const Ajv = require('ajv');
const ajv = new Ajv();

const schema = {
  /* JSON Schema completo visto anteriormente */
};

const validate = ajv.compile(schema);

function validateExport(exportData) {
  const valid = validate(exportData);
  
  if (!valid) {
    console.error('Validation errors:', validate.errors);
    return false;
  }
  
  return true;
}
```

---

## 📦 Nome de Arquivo

### Padrão de Nomenclatura

```
tab-urls-<timestamp>.<extension>
```

**Exemplos**:
- `tab-urls-2025-01-15T14-30-45.json`
- `tab-urls-2025-01-15T14-35-12.txt`

**Formato de Timestamp**:
- ISO-8601 com `:` substituído por `-` (compatibilidade com sistemas de arquivo)
- Sem milissegundos

---

## 🎨 MIME Types

| Formato | MIME Type | Extensão |
|---------|-----------|----------|
| JSON | `application/json` | `.json` |
| TXT | `text/plain` | `.txt` |
| CSV (futuro) | `text/csv` | `.csv` |
| XML (futuro) | `application/xml` | `.xml` |

---

## 💡 Boas Práticas para Consumidores

### 1. Sempre Validar Versão

```javascript
const SUPPORTED_VERSIONS = ['1.0.0', '1.1.0'];

if (!SUPPORTED_VERSIONS.includes(exportData.version)) {
  console.warn(`Unsupported version: ${exportData.version}`);
  // Decidir se continua ou aborta
}
```

### 2. Usar Try-Catch ao Parsear

```javascript
let exportData;
try {
  exportData = JSON.parse(fileContent);
} catch (error) {
  console.error('Invalid JSON:', error);
  return;
}
```

### 3. Verificar Campos Opcionais

```javascript
const metadata = item.metadata || {};
const title = metadata.title || 'Untitled';
```

### 4. Tratar Campos Novos com Graça

```javascript
// Código deve ignorar campos desconhecidos (forward compatibility)
// Se v1.1.0 adicionar campo "favicon", código v1.0.0 não deve quebrar
```

---

## 🔮 Formatos Futuros

### CSV (Planejado para v1.x)

```csv
url,normalized_url,domain,origin,matrix_id,matrix_label
"https://youtube.com/watch?v=abc","https://youtube.com/watch?v=abc","youtube.com","tab","matrix-domain-youtube-com","youtube.com"
"https://github.com/user/repo","https://github.com/user/repo","github.com","tab","matrix-domain-github-com","github.com"
```

### XML (Planejado para v2.x)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<export version="2.0.0" generatedAt="2025-01-15T14:30:45.123Z" source="tab-url-extractor">
  <metadata totalUrls="2" totalMatrices="1" exportType="full" />
  <data>
    <url original="https://youtube.com/watch?v=abc" normalized="https://youtube.com/watch?v=abc" domain="youtube.com" origin="tab" matrixId="matrix-domain-youtube-com" matrixLabel="youtube.com" />
  </data>
</export>
```

---

**Formato de exportação projetado para máxima compatibilidade, extensibilidade e consumo programático.**
