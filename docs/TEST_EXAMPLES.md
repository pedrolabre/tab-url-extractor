# Cenários de Teste: tab-url-extractor

## 🧪 Visão Geral

Este documento fornece cenários de teste manuais completos para validar o funcionamento do **tab-url-extractor** em diferentes situações.

## 🎯 Objetivo dos Testes

- ✅ Validar funcionalidades principais
- ✅ Detectar edge cases e bugs
- ✅ Garantir qualidade antes de releases
- ✅ Documentar comportamento esperado

---

## 📋 Estrutura dos Cenários

Cada cenário segue este formato:

- **ID**: Identificador único
- **Título**: Nome descritivo
- **Objetivo**: O que está sendo testado
- **Pré-condições**: Estado inicial necessário
- **Passos**: Ações a executar
- **Resultado Esperado**: Comportamento correto
- **Critério de Sucesso**: Como validar o resultado

---

## ✅ Testes de Funcionalidade Básica

### TC-001: Análise com Abas Válidas

**Objetivo**: Testar coleta e agrupamento básico de URLs.

**Pré-condições**:
- Extensão instalada e ativada
- Navegador sem outras abas abertas (exceto chrome://)

**Passos**:
1. Abra 3 abas:
   - `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
   - `https://github.com/torvalds/linux`
   - `https://stackoverflow.com/questions/11227809`
2. Clique no ícone da extensão
3. Clique em "Analisar"
4. Aguarde processamento

**Resultado Esperado**:
- ✅ Loading aparece e desaparece
- ✅ 3 matrizes exibidas:
  - youtube.com (1 URL)
  - github.com (1 URL)
  - stackoverflow.com (1 URL)
- ✅ Cada matriz tem botão "Extrair"
- ✅ Botão "Extrair todos" visível no topo

**Critério de Sucesso**:
```
Número de matrizes === 3
Soma de urlCount === 3
```

---

### TC-002: Exportação JSON Completa

**Objetivo**: Testar exportação de todas as matrizes.

**Pré-condições**:
- TC-001 executado com sucesso
- Lista de matrizes visível no popup

**Passos**:
1. Clique em "Extrair todos"
2. Aguarde download
3. Abra arquivo JSON baixado
4. Valide estrutura

**Resultado Esperado**:
- ✅ Arquivo baixado com nome `tab-urls-YYYY-MM-DDTHH-MM-SS.json`
- ✅ JSON válido (parseia sem erro)
- ✅ `version: "1.0.0"`
- ✅ `source: "tab-url-extractor"`
- ✅ `metadata.exportType: "full"`
- ✅ `metadata.totalUrls: 3`
- ✅ `metadata.totalMatrices: 3`
- ✅ `data.length === 3`

**Critério de Sucesso**:
```javascript
const data = JSON.parse(fileContent);
assert(data.version === "1.0.0");
assert(data.metadata.totalUrls === 3);
assert(data.data.length === 3);
```

---

### TC-003: Exportação Parcial (Uma Matriz)

**Objetivo**: Testar exportação de matriz individual.

**Pré-condições**:
- TC-001 executado com sucesso

**Passos**:
1. Clique em "Extrair" apenas na matriz "youtube.com"
2. Aguarde download
3. Abra arquivo JSON
4. Valide conteúdo

**Resultado Esperado**:
- ✅ Arquivo baixado
- ✅ `metadata.exportType: "partial"`
- ✅ `metadata.totalUrls: 1`
- ✅ `metadata.totalMatrices: 1`
- ✅ `metadata.matrixIds: ["matrix-domain-youtube-com"]`
- ✅ `data.length === 1`
- ✅ `data[0].domain === "youtube.com"`

**Critério de Sucesso**:
```javascript
assert(data.metadata.exportType === "partial");
assert(data.data[0].domain === "youtube.com");
```

---

### TC-004: Nova Análise

**Objetivo**: Testar funcionalidade de reprocessamento.

**Pré-condições**:
- TC-001 executado
- Lista de matrizes visível

**Passos**:
1. Abra 2 novas abas:
   - `https://reddit.com/r/programming`
   - `https://news.ycombinator.com`
2. No popup, clique em "Nova análise"
3. Clique em "Analisar"

**Resultado Esperado**:
- ✅ Interface volta ao estado "Ocioso" ao clicar "Nova análise"
- ✅ Nova análise coleta 5 URLs (3 antigas + 2 novas)
- ✅ 5 matrizes exibidas
- ✅ Matrizes incluem reddit.com e news.ycombinator.com

**Critério de Sucesso**:
```
Número de matrizes === 5
```

---

## 🔄 Testes de Normalização

### TC-005: Normalização de Domínio

**Objetivo**: Validar lowercase e remoção de www.

**Pré-condições**: Extensão instalada

**Passos**:
1. Abra 3 abas com mesma página, mas variações:
   - `https://WWW.YouTube.COM/watch?v=abc123`
   - `https://YouTube.com/watch?v=abc123`
   - `https://youtube.com/watch?v=abc123`
2. Analise e exporte

**Resultado Esperado**:
- ✅ Apenas 1 URL no JSON exportado
- ✅ `normalizedUrl: "https://youtube.com/watch?v=abc123"`
- ✅ Domínio em lowercase: `"youtube.com"`

**Critério de Sucesso**:
```javascript
assert(data.metadata.totalUrls === 1);
assert(data.data[0].normalizedUrl === "https://youtube.com/watch?v=abc123");
```

---

### TC-006: Remoção de Tracking Parameters

**Objetivo**: Validar limpeza de parâmetros de rastreamento.

**Pré-condições**: Extensão instalada

**Passos**:
1. Abra 2 abas:
   - `https://example.com/page?utm_source=facebook&utm_campaign=test`
   - `https://example.com/page?fbclid=IwAR123456`
2. Analise e exporte

**Resultado Esperado**:
- ✅ Apenas 1 URL no JSON
- ✅ `normalizedUrl: "https://example.com/page"`
- ✅ Tracking params removidos

**Critério de Sucesso**:
```javascript
assert(data.metadata.totalUrls === 1);
assert(!data.data[0].normalizedUrl.includes('utm_'));
assert(!data.data[0].normalizedUrl.includes('fbclid'));
```

---

### TC-007: Remoção de Fragmentos

**Objetivo**: Validar remoção de hash (#).

**Pré-condições**: Extensão instalada

**Passos**:
1. Abra 2 abas:
   - `https://example.com/page#section1`
   - `https://example.com/page#section2`
2. Analise e exporte

**Resultado Esperado**:
- ✅ Apenas 1 URL no JSON
- ✅ `normalizedUrl: "https://example.com/page"`
- ✅ Fragmentos removidos

**Critério de Sucesso**:
```javascript
assert(data.metadata.totalUrls === 1);
assert(!data.data[0].normalizedUrl.includes('#'));
```

---

### TC-008: Trailing Slash

**Objetivo**: Validar tratamento de trailing slash.

**Pré-condições**: Extensão instalada

**Passos**:
1. Abra 2 abas:
   - `https://example.com/page`
   - `https://example.com/page/`
2. Analise e exporte

**Resultado Esperado**:
- ✅ Apenas 1 URL no JSON
- ✅ `normalizedUrl: "https://example.com/page"` (sem trailing slash)

**Critério de Sucesso**:
```javascript
assert(data.metadata.totalUrls === 1);
assert(data.data[0].normalizedUrl === "https://example.com/page");
```

---

## 🔍 Testes de Agrupamento

### TC-009: Agrupamento por Domínio

**Objetivo**: Validar criação de matrizes por domínio.

**Pré-condições**: Extensão instalada

**Passos**:
1. Abra 5 abas de YouTube:
   - `https://youtube.com/watch?v=video1`
   - `https://youtube.com/watch?v=video2`
   - `https://youtube.com/watch?v=video3`
   - `https://youtube.com/channel/UC12345`
   - `https://youtube.com/playlist?list=PL67890`
2. Abra 2 abas de GitHub:
   - `https://github.com/user1/repo1`
   - `https://github.com/user2/repo2`
3. Analise

**Resultado Esperado**:
- ✅ 2 matrizes:
  - youtube.com (5 URLs)
  - github.com (2 URLs)
- ✅ Matriz do YouTube aparece primeiro (maior urlCount)

**Critério de Sucesso**:
```
matrices[0].label === "youtube.com"
matrices[0].urlCount === 5
matrices[1].label === "github.com"
matrices[1].urlCount === 2
```

---

### TC-010: Subdomínios Separados

**Objetivo**: Validar que subdomínios diferentes geram matrizes diferentes.

**Pré-condições**: Extensão instalada

**Passos**:
1. Abra 3 abas:
   - `https://youtube.com/watch?v=abc`
   - `https://m.youtube.com/watch?v=abc`
   - `https://docs.github.com/en/get-started`
2. Analise

**Resultado Esperado**:
- ✅ 3 matrizes separadas:
  - youtube.com (1 URL)
  - m.youtube.com (1 URL)
  - docs.github.com (1 URL)

**Critério de Sucesso**:
```
Number of matrices === 3
Each domain is unique
```

---

### TC-011: Ordenação por URL Count

**Objetivo**: Validar que matrizes são ordenadas por quantidade decrescente.

**Pré-condições**: Extensão instalada

**Passos**:
1. Abra abas com diferentes quantidades por domínio:
   - 10 abas de youtube.com
   - 3 abas de github.com
   - 7 abas de stackoverflow.com
   - 1 aba de reddit.com
2. Analise

**Resultado Esperado**:
- ✅ Matrizes ordenadas:
  1. youtube.com (10 URLs)
  2. stackoverflow.com (7 URLs)
  3. github.com (3 URLs)
  4. reddit.com (1 URL)

**Critério de Sucesso**:
```javascript
assert(matrices[0].urlCount >= matrices[1].urlCount);
assert(matrices[1].urlCount >= matrices[2].urlCount);
assert(matrices[2].urlCount >= matrices[3].urlCount);
```

---

## ⚠️ Testes de Edge Cases

### TC-012: Nenhuma Aba Válida

**Objetivo**: Testar comportamento quando não há abas HTTP/HTTPS.

**Pré-condições**:
- Feche todas as abas
- Mantenha apenas abas de sistema (chrome://, chrome-extension://)

**Passos**:
1. Clique na extensão
2. Clique em "Analisar"

**Resultado Esperado**:
- ✅ Mensagem de erro: "Nenhuma aba válida encontrada"
- ✅ Interface no estado "Erro"
- ✅ Botão "Tentar novamente" visível

**Critério de Sucesso**:
```
Error message displayed
No matrices shown
```

---

### TC-013: Aba Única

**Objetivo**: Testar com apenas uma aba válida.

**Pré-condições**: Feche todas as abas

**Passos**:
1. Abra apenas 1 aba: `https://example.com`
2. Analise

**Resultado Esperado**:
- ✅ 1 matriz: example.com (1 URL)
- ✅ Funcionalidade normal

**Critério de Sucesso**:
```
Number of matrices === 1
totalUrls === 1
```

---

### TC-014: 100+ Abas

**Objetivo**: Testar performance com muitas abas.

**Pré-condições**: Extensão instalada

**Passos**:
1. Use script para abrir 100 abas (varie domínios)
2. Analise
3. Meça tempo de resposta

**Resultado Esperado**:
- ✅ Análise completa em < 5 segundos
- ✅ Todas as URLs coletadas
- ✅ Interface não trava
- ✅ Exportação funciona normalmente

**Critério de Sucesso**:
```
Processing time < 5000ms
All URLs collected
No UI freeze
```

---

### TC-015: URLs Muito Longas

**Objetivo**: Testar com URLs extremamente longas.

**Pré-condições**: Extensão instalada

**Passos**:
1. Abra aba com URL de 2000+ caracteres:
   ```
   https://example.com/page?param1=value1&param2=value2&...&param100=value100
   ```
2. Analise e exporte

**Resultado Esperado**:
- ✅ URL processada sem erro
- ✅ URL normalizada corretamente
- ✅ JSON gerado sem truncamento

**Critério de Sucesso**:
```
No errors in console
URL fully captured in JSON
```

---

### TC-016: Caracteres Especiais em URL

**Objetivo**: Testar URLs com encoding especial.

**Pré-condições**: Extensão instalada

**Passos**:
1. Abra abas com caracteres especiais:
   - `https://example.com/search?q=hello%20world`
   - `https://example.com/pagina-em-português`
   - `https://example.com/página%20com%20acentos`
2. Analise e exporte

**Resultado Esperado**:
- ✅ URLs processadas sem erro
- ✅ Encoding preservado ou normalizado consistentemente
- ✅ JSON válido

**Critério de Sucesso**:
```javascript
JSON.parse succeeds
All URLs present in data array
```

---

## 🔐 Testes de Permissões

### TC-017: Permissão de Abas

**Objetivo**: Verificar erro quando permissão `tabs` ausente.

**Pré-condições**:
- (Teste em ambiente controlado)
- Remover permissão `tabs` do manifest

**Passos**:
1. Recarregue extensão
2. Tente analisar

**Resultado Esperado**:
- ✅ Erro capturado
- ✅ Mensagem: "Permissão de acesso a abas negada"
- ✅ Console mostra erro claro

**Critério de Sucesso**:
```
Error message shown to user
Console log: "Permission denied"
```

---

### TC-018: Permissão de Downloads

**Objetivo**: Verificar erro quando permissão `downloads` ausente.

**Pré-condições**:
- Remover permissão `downloads` do manifest
- Recarregar extensão

**Passos**:
1. Analise abas normalmente
2. Tente exportar

**Resultado Esperado**:
- ✅ Erro ao criar download
- ✅ Mensagem: "Falha ao criar arquivo"
- ✅ Console mostra erro de permissão

**Critério de Sucesso**:
```
Export fails gracefully
Error message displayed
```

---

## 🌐 Testes Cross-Browser (Futuro)

### TC-019: Firefox Compatibility (Futuro)

**Objetivo**: Validar funcionamento no Firefox.

**Nota**: Requer adaptação para Manifest V3 do Firefox.

---

### TC-020: Edge Compatibility (Futuro)

**Objetivo**: Validar funcionamento no Microsoft Edge.

**Nota**: Chromium-based, deve funcionar com poucas modificações.

---

## 📊 Testes de Formato de Exportação

### TC-021: Validação de Schema JSON

**Objetivo**: Validar conformidade com JSON Schema.

**Pré-condições**:
- JSON Schema definido
- Validator (Ajv) configurado

**Passos**:
1. Exporte JSON de qualquer análise
2. Valide contra schema em `EXPORT_FORMAT.md`

**Resultado Esperado**:
- ✅ Validação passa sem erros
- ✅ Todos os campos obrigatórios presentes
- ✅ Tipos corretos

**Critério de Sucesso**:
```javascript
const valid = validate(exportData);
assert(valid === true);
```

---

### TC-022: Exportação TXT (Futuro)

**Objetivo**: Testar formato TXT quando implementado.

**Passos**:
1. Analise abas
2. Exporte em formato TXT
3. Abra arquivo

**Resultado Esperado**:
- ✅ Arquivo `.txt` gerado
- ✅ Header com metadados
- ✅ URLs agrupadas por matriz
- ✅ Formato legível

---

## 🔄 Testes de Regressão

### TC-023: Regressão Pós-Update

**Objetivo**: Validar que update não quebrou funcionalidades existentes.

**Pré-condições**: Nova versão instalada

**Passos**:
1. Execute TC-001 a TC-011 sequencialmente
2. Compare resultados com versão anterior

**Resultado Esperado**:
- ✅ Todos os testes passam
- ✅ Comportamento consistente com versão anterior
- ✅ Nenhuma funcionalidade quebrada

**Critério de Sucesso**:
```
All basic tests pass
No new errors in console
```

---

## 📝 Template para Novos Testes

```markdown
### TC-XXX: [Título do Teste]

**Objetivo**: [O que está sendo testado]

**Pré-condições**:
- [Condição 1]
- [Condição 2]

**Passos**:
1. [Passo 1]
2. [Passo 2]
3. [Passo 3]

**Resultado Esperado**:
- ✅ [Expectativa 1]
- ✅ [Expectativa 2]

**Critério de Sucesso**:
```
[Condição verificável]
```
```

---

## 📊 Matriz de Cobertura de Testes

| Funcionalidade | Teste(s) | Status |
|----------------|----------|--------|
| Análise básica | TC-001 | ✅ |
| Exportação full | TC-002 | ✅ |
| Exportação parcial | TC-003 | ✅ |
| Nova análise | TC-004 | ✅ |
| Normalização domínio | TC-005 | ✅ |
| Tracking params | TC-006 | ✅ |
| Fragmentos | TC-007 | ✅ |
| Trailing slash | TC-008 | ✅ |
| Agrupamento | TC-009 | ✅ |
| Subdomínios | TC-010 | ✅ |
| Ordenação | TC-011 | ✅ |
| Zero abas | TC-012 | ✅ |
| Aba única | TC-013 | ✅ |
| 100+ abas | TC-014 | ✅ |
| URLs longas | TC-015 | ✅ |
| Chars especiais | TC-016 | ✅ |
| Permissões | TC-017, TC-018 | ✅ |
| Schema validation | TC-021 | ✅ |
| Regressão | TC-023 | ✅ |

---

## 🎯 Checklist de Testes Pré-Release

Antes de cada release, executar:

- [ ] TC-001 (Análise básica)
- [ ] TC-002 (Exportação full)
- [ ] TC-003 (Exportação parcial)
- [ ] TC-005 (Normalização)
- [ ] TC-006 (Tracking params)
- [ ] TC-009 (Agrupamento)
- [ ] TC-012 (Zero abas - erro)
- [ ] TC-014 (100+ abas - performance)
- [ ] TC-021 (Schema validation)
- [ ] TC-023 (Regressão)

**Critério para release**: Todos os testes acima devem passar.

---

**Testes documentados para garantir qualidade e confiabilidade do produto.**
