# Guia de Uso: tab-url-extractor

## 📖 Visão Geral

Este documento fornece instruções completas de uso do **tab-url-extractor**, desde operações básicas até cenários avançados.

## 🎯 Fluxo de Uso Básico

```
1. Abrir abas no navegador
2. Clicar no ícone da extensão
3. Clicar em "Analisar"
4. Visualizar URL-Matriz
5. Clicar em "Extrair" (individual) ou "Extrair todos"
6. Arquivo JSON baixado automaticamente
```

---

## 🚀 Operações Principais

### Operação 1: Analisar Abas

**Objetivo**: Coletar e agrupar URLs das abas abertas.

#### Passo a Passo

1. **Abra algumas abas** com sites diversos:
   - Exemplo: YouTube, GitHub, Stack Overflow, documentação técnica

2. **Clique no ícone da extensão** na barra de ferramentas
   - Popup abre

3. **Clique no botão "Analisar"**
   - Interface mostra loading spinner
   - Coleta e processamento acontecem em background

4. **Aguarde processamento** (geralmente < 2 segundos)

5. **Visualize os resultados**:
   - Lista de URL-Matriz aparece
   - Cada item mostra:
     - **Rótulo** (domínio)
     - **Contador** (quantidade de URLs)
     - **Botão "Extrair"**

#### Exemplo Visual da Interface

```
┌─────────────────────────────────────────┐
│  tab-url-extractor                      │
├─────────────────────────────────────────┤
│                                         │
│  ✓ Análise concluída!                   │
│                                         │
│  [Extrair todos] [Nova análise]         │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ youtube.com            15 URLs  │   │
│  │                     [Extrair]   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ github.com              8 URLs  │   │
│  │                     [Extrair]   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ stackoverflow.com       3 URLs  │   │
│  │                     [Extrair]   │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

#### O Que Acontece nos Bastidores

1. **Service Worker recebe mensagem** `{ action: "analyze" }`
2. **TabCollector** coleta todas as abas via `chrome.tabs.query()`
3. **UrlProcessor** normaliza e deduplica URLs
4. **MatrixBuilder** agrupa por domínio
5. **Resultado retornado** para o popup
6. **UI renderiza** lista de matrizes

---

### Operação 2: Exportar Matriz Individual

**Objetivo**: Exportar apenas URLs de um domínio específico.

#### Passo a Passo

1. **Após análise**, localize a matriz desejada na lista
   - Exemplo: "youtube.com" com 15 URLs

2. **Clique no botão "Extrair"** daquela matriz
   - Botão mostra loading brevemente

3. **Arquivo JSON é baixado automaticamente**
   - Nome: `tab-urls-2025-01-15T14-30-45.json`
   - Localização: Pasta de downloads padrão do Chrome

4. **Abra o arquivo** para verificar conteúdo:
   ```json
   {
     "version": "1.0.0",
     "metadata": {
       "totalUrls": 15,
       "totalMatrices": 1,
       "exportType": "partial",
       "matrixIds": ["matrix-domain-youtube-com"]
     },
     "data": [...]
   }
   ```

#### O Que Acontece nos Bastidores

1. **Service Worker recebe mensagem**: 
   ```javascript
   {
     action: "export",
     matrixIds: ["matrix-domain-youtube-com"],
     format: "json"
   }
   ```
2. **Matriz filtrada** do estado temporário
3. **Exporter.toJSON()** formata dados
4. **DownloadManager** gera uma Data URL (base64) e inicia download
5. **Chrome baixa arquivo** automaticamente

---

### Operação 3: Exportar Todas as Matrizes

**Objetivo**: Exportar todas as URLs de todos os domínios de uma vez.

#### Passo a Passo

1. **Após análise**, localize o botão **"Extrair todos"** no topo da lista

2. **Clique em "Extrair todos"**
   - Botão mostra loading

3. **Arquivo JSON completo é baixado**
   - Nome: `tab-urls-2025-01-15T14-32-10.json`

4. **Abra o arquivo** para verificar:
   ```json
   {
     "version": "1.0.0",
     "metadata": {
       "totalUrls": 26,
       "totalMatrices": 3,
       "exportType": "full"
     },
     "data": [
       // Todas as 26 URLs de todas as matrizes
     ]
   }
   ```

#### Diferença entre Full e Partial

| Aspecto | Full Export | Partial Export |
|---------|-------------|----------------|
| **matrixIds** | Todas as matrizes | IDs especificados |
| **exportType** | `"full"` | `"partial"` |
| **metadata.matrixIds** | Ausente | Presente com array de IDs |
| **Uso** | Backup completo | Filtragem específica |

---

### Operação 4: Nova Análise

**Objetivo**: Reprocessar abas após mudanças (abrir/fechar abas).

#### Passo a Passo

1. **Após uma análise**, clique em **"Nova análise"**

2. **Interface volta ao estado inicial**
   - Lista de matrizes desaparece
   - Botão "Analisar" reaparece

3. **Clique em "Analisar"** novamente
   - Novo processamento ocorre
   - Novas matrizes são geradas

#### Quando Fazer Nova Análise

- ✅ Abriu ou fechou abas
- ✅ Navegou para novas páginas
- ✅ Quer capturar estado atual diferente

#### Nota Importante

**Estado não é persistido**: Fechar o popup limpa tudo. Para preservar dados, sempre exporte antes de fechar.

---

## 🎨 Interface Detalhada

### Estados da Interface

#### Estado 1: Ocioso (Idle)

**Aparência**:
```
┌─────────────────────────────────────────┐
│  tab-url-extractor                      │
├─────────────────────────────────────────┤
│                                         │
│  Clique em Analisar para extrair URLs  │
│  das abas abertas.                      │
│                                         │
│         [Analisar]                      │
│                                         │
└─────────────────────────────────────────┘
```

**Ações disponíveis**:
- Clicar em "Analisar"

---

#### Estado 2: Analisando (Analyzing)

**Aparência**:
```
┌─────────────────────────────────────────┐
│  tab-url-extractor                      │
├─────────────────────────────────────────┤
│                                         │
│          ⏳ Analisando abas...          │
│                                         │
│          [◯ Loading spinner]            │
│                                         │
└─────────────────────────────────────────┘
```

**Duração típica**: 0.5 - 2 segundos

**Ações disponíveis**: Nenhuma (aguarde)

---

#### Estado 3: Pronto (Ready)

**Aparência**: (visto anteriormente - lista de matrizes)

**Ações disponíveis**:
- Clicar em "Extrair" em qualquer matriz
- Clicar em "Extrair todos"
- Clicar em "Nova análise"

---

#### Estado 4: Erro (Error)

**Aparência**:
```
┌─────────────────────────────────────────┐
│  tab-url-extractor                      │
├─────────────────────────────────────────┤
│                                         │
│  ❌ Erro ao analisar abas               │
│                                         │
│  Falha ao acessar abas do navegador.   │
│  Verifique as permissões.               │
│                                         │
│         [Tentar novamente]              │
│                                         │
└─────────────────────────────────────────┘
```

**Ações disponíveis**:
- Clicar em "Tentar novamente"

**Possíveis erros**:
- Permissões insuficientes
- Nenhuma aba válida encontrada
- Erro interno do Service Worker

---

## 📊 Cenários de Uso

### Cenário 1: Organizar Vídeos do YouTube

**Situação**: Você acumulou 30 abas de vídeos do YouTube e quer salvá-las para organizar depois.

**Passos**:

1. Clique na extensão
2. Clique "Analisar"
3. Localize matriz "youtube.com (30 URLs)"
4. Clique "Extrair" nessa matriz
5. Arquivo JSON baixado com 30 URLs do YouTube
6. Use aplicação externa (ex: youtube-organizer) para processar o JSON

**Resultado**: URLs salvas para processamento futuro.

---

### Cenário 2: Backup de Pesquisa de Documentação

**Situação**: Você está pesquisando sobre Python e abriu 20 abas de docs.python.org, Stack Overflow e Medium.

**Passos**:

1. Clique na extensão
2. Clique "Analisar"
3. Clique "Extrair todos"
4. Arquivo completo com todas as 20 URLs baixado

**Resultado**: Backup completo da sessão de pesquisa.

---

### Cenário 3: Compartilhar Links de Repositórios

**Situação**: Você quer compartilhar com um colega todos os repos do GitHub que você está consultando.

**Passos**:

1. Clique na extensão
2. Clique "Analisar"
3. Localize matriz "github.com (8 URLs)"
4. Clique "Extrair"
5. Envie o JSON para o colega

**Resultado**: Colega importa JSON e acessa todos os repos.

---

### Cenário 4: Análise de Padrões de Navegação

**Situação**: Você quer analisar quais domínios você visita mais durante trabalho.

**Passos**:

1. Trabalhe normalmente por 2 horas
2. Clique na extensão e "Analisar"
3. Observe matrizes ordenadas por quantidade
4. Clique "Extrair todos"
5. Importe JSON em ferramenta de análise (Python, Excel, etc.)

**Resultado**: Insights sobre seus padrões de navegação.

---

## 🔍 Detalhes Técnicos para Usuários Avançados

### Formato das URLs Exportadas

**URL Original** (como aparece no navegador):
```
https://WWW.YouTube.COM/watch?v=dQw4w9WgXcQ&utm_source=share&fbclid=abc#t=30
```

**URL Normalizada** (como aparece no JSON):
```
https://youtube.com/watch?v=dQw4w9WgXcQ
```

**Transformações aplicadas**:
1. ✅ Domínio em lowercase (`WWW.YouTube.COM` → `youtube.com`)
2. ✅ Remoção de `www.`
3. ✅ Remoção de tracking parameters (`utm_*`, `fbclid`)
4. ✅ Remoção de fragmentos (`#t=30`)
5. ✅ Remoção de trailing slash (quando aplicável)

---

### Critério de Agrupamento

**No MVP (v1.0.0)**: Agrupamento por **domínio completo**.

**Exemplos**:

| URL | Domínio | Matriz |
|-----|---------|--------|
| `https://youtube.com/watch?v=abc` | `youtube.com` | `matrix-domain-youtube-com` |
| `https://m.youtube.com/watch?v=abc` | `m.youtube.com` | `matrix-domain-m-youtube-com` |
| `https://docs.github.com/en` | `docs.github.com` | `matrix-domain-docs-github-com` |
| `https://github.com/user/repo` | `github.com` | `matrix-domain-github-com` |

**Nota**: Subdomínios diferentes geram matrizes diferentes.

---

### Deduplicação

**Regra**: URLs são consideradas duplicatas se `normalizedUrl` for idêntica.

**Exemplo de deduplicação**:

**Entrada**:
```
https://WWW.YouTube.COM/watch?v=abc123
https://youtube.com/watch?v=abc123
https://YouTube.com/watch?v=abc123&utm_source=test
```

**Saída** (após normalização e deduplicação):
```
https://youtube.com/watch?v=abc123
```

**Resultado**: 3 abas → 1 URL única.

---

## 🎯 Dicas e Melhores Práticas

### Dica 1: Exporte Regularmente

**Por quê**: O popup não mantém estado entre sessões.

**Como**: 
- Sempre exporte dados antes de fechar o popup
- Considere exportar periodicamente durante pesquisas longas

---

### Dica 2: Use Exportação Parcial para Filtragem

**Cenário**: Você tem 50 abas de 10 domínios diferentes, mas só quer processar YouTube.

**Como**:
- Não use "Extrair todos"
- Clique apenas em "Extrair" na matriz youtube.com
- JSON exportado contém apenas YouTube

---

### Dica 3: Nomeie Arquivos Logicamente

**Problema**: Múltiplas exportações com nomes genéricos.

**Solução**: Após baixar, renomeie o arquivo:
```
tab-urls-2025-01-15T14-30-45.json
    ↓ renomeie para ↓
youtube-research-python-tutorials-2025-01-15.json
```

---

### Dica 4: Versione Suas Exportações

**Cenário**: Pesquisa longa com múltiplas sessões.

**Como**:
```
research-session-1-2025-01-15.json
research-session-2-2025-01-16.json
research-final-2025-01-20.json
```

---

### Dica 5: Combine com Ferramentas Externas

**Fluxo recomendado**:

```
tab-url-extractor (extração)
    ↓
JSON exportado
    ↓
Python/Node.js (processamento)
    ↓
Banco de dados / Planilha / App customizado
```

**Exemplo Python**:
```python
import json

with open('tab-urls-2025-01-15.json') as f:
    data = json.load(f)

# Filtrar apenas YouTube
youtube_urls = [
    item for item in data['data'] 
    if item['domain'] == 'youtube.com'
]

print(f"Encontradas {len(youtube_urls)} URLs do YouTube")
```

---

## ⚠️ Limitações Conhecidas

### 1. Sem Persistência

**Limitação**: Fechar popup perde todos os dados.

**Workaround**: Sempre exporte antes de fechar.

**Futuro**: Considerar adicionar cache local (IndexedDB).

---

### 2. Não Captura Histórico

**Limitação**: Apenas abas abertas no momento são analisadas.

**Workaround**: Use extensão de gerenciamento de abas para salvar sessões.

**Futuro**: Integração com histórico do Chrome.

---

### 3. Não Detecta Conteúdo Dinâmico

**Limitação**: URLs carregadas via JavaScript após carregamento da página não são capturadas.

**Explicação**: A extensão usa `chrome.tabs.query()`, que retorna apenas a URL principal da aba.

**Futuro**: Content scripts para analisar DOM.

---

### 4. Subdomínios Separados

**Limitação**: `youtube.com` e `m.youtube.com` geram matrizes diferentes.

**Workaround**: Processar JSON externamente para mesclar.

**Futuro**: Opção de agrupamento por domínio raiz (TLD).

---

## 🔄 Atualizações e Feedback

### Reportar Bugs

Se encontrar problemas:

1. Verifique se está na versão mais recente
2. Abra issue no GitHub: https://github.com/seu-usuario/tab-url-extractor/issues
3. Inclua:
   - Descrição do problema
   - Passos para reproduzir
   - Logs do console (Service Worker e Popup)
   - Screenshot (se aplicável)

### Sugerir Melhorias

Para sugestões de features:

1. Verifique se já não existe issue similar
2. Abra issue com tag `enhancement`
3. Descreva:
   - Caso de uso
   - Comportamento esperado
   - Mockups (se aplicável)

---

## 📚 Próximos Passos

Após dominar o uso básico:

1. **Explore cenários de teste**: [TEST_EXAMPLES.md](TEST_EXAMPLES.md)
2. **Entenda o formato de exportação**: [EXPORT_FORMAT.md](EXPORT_FORMAT.md)
3. **Desenvolva integrações**: Use JSON em suas aplicações
4. **Contribua com o projeto**: [README.md](../README.md)

---

**Aproveite o tab-url-extractor para otimizar seu fluxo de trabalho!**
