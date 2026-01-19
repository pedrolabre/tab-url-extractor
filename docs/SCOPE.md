# Escopo do Projeto: tab-url-extractor

Este documento define com precisão o que está **dentro** e **fora** do escopo do projeto, estabelecendo limites claros para desenvolvimento, manutenção e evolução futura.

## ✅ Dentro do Escopo (In-Scope)

### 1. Coleta de URLs

#### 1.1 Fonte: Abas Abertas (Chrome Tabs API)

**Funcionalidades Incluídas**:
- ✅ Coletar URLs de todas as abas da janela atual
- ✅ Coletar URLs de todas as janelas abertas
- ✅ Acessar propriedades básicas: `url`, `title` (opcional para metadados)
- ✅ Tratar abas em diferentes estados (ativo, loading, complete)

**Limitações Aceitas**:
- URLs de extensões (`chrome://`, `chrome-extension://`) serão ignoradas
- Abas sem permissão de acesso (restrições do Chrome) serão puladas
- Não há coleta de conteúdo interno da página (DOM)

#### 1.2 Dados Coletados por Tab

**Campos Obrigatórios**:
- `url` (string): URL completa
- `origin` (string): "tab" (identificador da fonte)

**Campos Opcionais (metadados)**:
- `title` (string): Título da aba (se disponível)
- `tabId` (number): ID interno do Chrome (para debug)
- `windowId` (number): ID da janela (para agrupamento futuro)

### 2. Processamento de URLs

#### 2.1 Normalização Técnica

**Operações Incluídas**:
- ✅ Remoção de fragmentos (`#section` → removido, a menos que semanticamente relevante)
- ✅ Padronização de protocolo (`http://` vs `https://`)
- ✅ Conversão de domínio para lowercase (`YouTube.com` → `youtube.com`)
- ✅ Remoção de trailing slash quando apropriado (`/page/` → `/page`)
- ✅ Decodificação de percent-encoding quando seguro
- ✅ Remoção de query parameters opcionais conhecidos (ex: tracking parameters como `utm_*`, `fbclid`)

**Operações NÃO Incluídas**:
- ❌ Normalização semântica (não identifica URLs "similares")
- ❌ Resolução de redirects (não faz requisições HTTP)
- ❌ Detecção de shortened URLs (bit.ly, tinyurl)
- ❌ Parsing de query parameters específicos de plataformas

**Exemplo de Normalização**:
```
Entrada:  https://WWW.YouTube.COM/watch?v=abc123&utm_source=share#t=30
Saída:    https://youtube.com/watch?v=abc123
```

#### 2.2 Deduplicação

**Critérios de Duplicação**:
- ✅ Igualdade exata de URL normalizada
- ✅ Case-insensitive para domínio
- ✅ Primeira ocorrência é mantida (ordem de coleta)

**Algoritmo**:
```
1. Normalizar todas as URLs
2. Criar Set() com URLs normalizadas
3. Manter primeira ocorrência encontrada
4. Descartar duplicatas subsequentes
```

**O que NÃO é considerado duplicata**:
- ❌ URLs semanticamente similares mas tecnicamente diferentes
- ❌ Páginas de paginação (`/page/1`, `/page/2`)
- ❌ Query parameters diferentes (`?sort=asc` vs `?sort=desc`)

### 3. Agrupamento em URL-Matriz

#### 3.1 Conceito de URL-Matriz

Uma **URL-Matriz** é um agrupamento lógico e automático de URLs que compartilham um critério técnico comum.

**Critérios de Agrupamento (Fase 1 - MVP)**:
- ✅ Por domínio registrado (`youtube.com`, `github.com`)
- ✅ Por subdomínio completo (`docs.github.com` separado de `github.com`)

**Estrutura de uma URL-Matriz**:
```typescript
interface UrlMatrix {
  id: string;              // Identificador único (ex: "matrix-youtube-com")
  label: string;           // Rótulo legível (ex: "youtube.com")
  criterion: string;       // Critério usado (ex: "domain")
  criterionValue: string;  // Valor do critério (ex: "youtube.com")
  urlCount: number;        // Quantidade de URLs nesta matriz
  urls: UrlEntry[];        // Array de URLs associadas
}
```

#### 3.2 Geração Automática de URL-Matriz

**Processo**:
1. Após normalização e deduplicação
2. Extrair domínio de cada URL
3. Criar uma matriz para cada domínio único
4. Atribuir URLs às respectivas matrizes
5. Ordenar matrizes por quantidade de URLs (decrescente)

**Exemplo**:
```
10 URLs de youtube.com  → URL-Matriz: "youtube.com" (10 URLs)
5 URLs de github.com    → URL-Matriz: "github.com" (5 URLs)
3 URLs de docs.python.org → URL-Matriz: "docs.python.org" (3 URLs)
```

#### 3.3 Critérios Futuros (Fora do MVP, mas arquitetura preparada)

- ⏳ Agrupamento por TLD (`.com`, `.org`, `.edu`)
- ⏳ Agrupamento por path prefix (`/docs/*`, `/api/*`)
- ⏳ Agrupamento por regex pattern customizado
- ⏳ Agrupamento por tags manuais (requer persistência)

### 4. Interface do Usuário (Popup)

#### 4.1 Tela Inicial

**Elementos**:
- ✅ Botão "Analisar" (trigger da coleta)
- ✅ Indicador de estado: Ocioso | Analisando | Pronto | Erro
- ✅ Ícone da extensão (branding simples)

**Comportamento**:
- Ao clicar "Analisar", exibe loading spinner
- Após processamento, transiciona para Tela de Resultados

#### 4.2 Tela de Resultados

**Elementos**:
- ✅ Botão "Extrair todos" (no topo)
- ✅ Lista de URL-Matriz, cada item contendo:
  - Rótulo (ex: "youtube.com")
  - Badge com contador (ex: "42 URLs")
  - Botão "Extrair" individual
- ✅ Botão "Nova Análise" (reinicia o processo)

**Interações**:
- Clicar "Extrair" em uma matriz → Exporta apenas aquela matriz
- Clicar "Extrair todos" → Exporta todas as matrizes de uma vez
- Clicar "Nova Análise" → Volta à Tela Inicial

#### 4.3 Elementos NÃO Incluídos

- ❌ Filtros ou busca de URLs na lista
- ❌ Ordenação customizável
- ❌ Edição manual de URLs
- ❌ Preview de URLs antes de exportar
- ❌ Estatísticas avançadas (gráficos, charts)
- ❌ Configurações persistentes

### 5. Exportação de Dados

#### 5.1 Formato JSON (Prioritário)

**Schema Base (v1.0.0)**:
```json
{
  "version": "1.0.0",
  "generatedAt": "ISO-8601 timestamp",
  "source": "tab-url-extractor",
  "metadata": {
    "totalUrls": 0,
    "totalMatrices": 0,
    "exportType": "full | partial",
    "matrixIds": ["matrix-id-1", "..."]
  },
  "data": [
    {
      "url": "complete URL",
      "normalizedUrl": "normalized URL",
      "domain": "extracted domain",
      "origin": "tab",
      "matrixId": "associated matrix ID"
    }
  ]
}
```

**Características**:
- ✅ Versionamento semântico do schema
- ✅ Metadados rastreáveis (data, origem, tipo)
- ✅ Array de objetos com campos consistentes
- ✅ Validável via JSON Schema (documentado)

#### 5.2 Formato TXT (Secundário)

**Formato**:
```
# Exportado de tab-url-extractor em 2025-01-15T10:30:00.000Z
# Total: 42 URLs

https://youtube.com/watch?v=abc123
https://github.com/user/repo
https://example.com/page
```

**Características**:
- ✅ Uma URL por linha
- ✅ Comentários com metadados básicos (linhas iniciadas com `#`)
- ✅ URLs normalizadas

#### 5.3 Mecanismo de Download

**Implementação**:
- ✅ Uso de `chrome.downloads` API
- ✅ Sugestão de nome de arquivo: `tab-urls-[timestamp].[ext]`
- ✅ Download automático (sem prompt adicional)

**Formatos Futuros (Fora do MVP)**:
- ⏳ CSV com headers customizáveis
- ⏳ XML para integração enterprise
- ⏳ YAML para configuração

### 6. Arquitetura e Código

#### 6.1 Estrutura de Módulos

**Módulos Obrigatórios**:
- ✅ `popup/` - Interface do usuário
- ✅ `background/` - Service Worker (orquestrador)
- ✅ `core/` - Lógica de negócio agnóstica
- ✅ `infrastructure/` - Interação com Chrome APIs
- ✅ `types/` - Definições TypeScript (se aplicável)
- ✅ `utils/` - Utilitários compartilhados

#### 6.2 Linguagem e Tecnologias

**Stack Técnico (MVP)**:
- ✅ JavaScript (ES6+) ou TypeScript
- ✅ Manifest V3
- ✅ Chrome APIs: `tabs`, `downloads`
- ✅ HTML5 + CSS3 para popup
- ✅ Opcional: Framework leve (Preact, Vue) se justificado

**Build Tools**:
- ✅ Opcional: Bundler (Webpack, Rollup) se complexidade justificar
- ✅ NPM/Yarn para gerenciamento de dependências (se houver)

#### 6.3 Princípios de Código

**Obrigatórios**:
- ✅ Separação clara de responsabilidades
- ✅ Core agnóstico ao navegador
- ✅ Funções puras onde possível
- ✅ Tratamento de erros em todos os pontos de I/O
- ✅ Logging estruturado (com níveis: info, warn, error)
- ✅ Comentários JSDoc em funções públicas

### 7. Documentação

#### 7.1 Documentos Obrigatórios

- ✅ `README.md` - Visão geral e início rápido
- ✅ `docs/VISION.md` - Filosofia e objetivos
- ✅ `docs/SCOPE.md` - Este documento
- ✅ `docs/ARCHITECTURE.md` - Arquitetura em camadas
- ✅ `docs/PROJECT_STRUCTURE.md` - Estrutura de pastas
- ✅ `docs/DATA_STRUCTURES.md` - Estruturas de dados
- ✅ `docs/DATA_FLOW.md` - Fluxo de comunicação
- ✅ `docs/MODULES.md` - Especificação de módulos
- ✅ `docs/EXPORT_FORMAT.md` - Formato de exportação
- ✅ `docs/INSTALLATION.md` - Instalação detalhada (carregar extensão descompactada)
- ✅ `docs/USAGE.md` - Guia de uso
- ✅ `docs/TEST_EXAMPLES.md` - Cenários de teste

#### 7.2 Diagramas Obrigatórios

- ✅ Diagrama de arquitetura em camadas
- ✅ Diagrama de fluxo de dados
- ✅ Diagrama de comunicação (UI ↔ Service Worker ↔ Core)

## ❌ Fora do Escopo (Out-of-Scope)

### 1. Gerenciamento de Abas

**Não faremos**:
- ❌ Fechar abas automaticamente
- ❌ Reordenar ou agrupar abas visualmente
- ❌ Salvar/restaurar sessões de abas
- ❌ Suspender abas para economizar memória

**Justificativa**: Existem extensões especializadas (Tab Manager Plus, The Great Suspender) que fazem isso melhor.

### 2. Análise de Conteúdo

**Não faremos**:
- ❌ Scraping de conteúdo da página (DOM parsing)
- ❌ Extração de títulos, descrições, imagens
- ❌ Análise de metadados OpenGraph ou Schema.org
- ❌ Screenshot de páginas

**Justificativa**: Isso requereria content scripts, aumentaria complexidade e não é essencial para exportação de URLs.

### 3. Categorização Semântica

**Não faremos**:
- ❌ Detectar "tipo" de conteúdo (vídeo, artigo, documentação)
- ❌ Classificar por assunto (tecnologia, entretenimento, educação)
- ❌ Aplicar machine learning ou NLP
- ❌ Usar heurísticas complexas baseadas em URL patterns

**Justificativa**: Cada aplicação consumidora tem suas próprias necessidades de categorização. Manteremos neutralidade.

### 4. Funcionalidades Específicas de Plataforma

**Não faremos**:
- ❌ Lógica especial para YouTube (extração de video ID, playlist, canal)
- ❌ Lógica especial para GitHub (detecção de repos, issues, PRs)
- ❌ Lógica especial para redes sociais (Twitter, LinkedIn)
- ❌ Integração com APIs de terceiros

**Justificativa**: Isso acoplaria o projeto a plataformas específicas e criaria manutenção perpétua.

### 5. Persistência e Histórico

**Não faremos**:
- ❌ Salvar histórico de exportações
- ❌ Manter banco de dados local (IndexedDB, localStorage)
- ❌ Sincronizar dados entre dispositivos (Chrome Sync)
- ❌ Comparar exportações ao longo do tempo

**Justificativa**: Não há persistência por design. A extensão mantém apenas estado temporário em memória (entre "Analisar" e "Exportar"), e cada exportação depende de uma análise prévia.

### 6. Agendamento e Automação

**Não faremos**:
- ❌ Coleta automática periódica (cron jobs)
- ❌ Exportação automática em eventos (fechar janela, etc.)
- ❌ Integração com serviços externos (Google Drive, Dropbox)
- ❌ Webhooks ou APIs de push

**Justificativa**: Isso requer permissões adicionais e aumenta complexidade. Foco é ação manual.

### 7. UI Avançada

**Não faremos**:
- ❌ Filtros ou busca de URLs
- ❌ Ordenação customizável (por domínio, data, alfabética)
- ❌ Preview de URLs com thumbnails
- ❌ Edição in-line de URLs
- ❌ Drag-and-drop para reordenar
- ❌ Temas dark/light customizáveis

**Justificativa**: UI minimalista mantém o projeto simples e focado. Complexidade visual não agrega valor ao core.

### 8. Detecção de Duplicatas Avançada

**Não faremos**:
- ❌ Duplicatas semânticas (URLs que apontam para o mesmo conteúdo)
- ❌ Detecção de redirects (301, 302)
- ❌ Resolução de shortened URLs
- ❌ Comparação de conteúdo via hash

**Justificativa**: Isso requereria requisições HTTP externas, aumentaria latência e complexidade.

### 9. Multilinguagem e Localização

**Não faremos (MVP)**:
- ❌ Tradução da interface (i18n)
- ❌ Suporte a múltiplos idiomas
- ❌ Detecção automática de locale

**Justificativa**: Interface é mínima e em inglês técnico. Pode ser adicionado no futuro se houver demanda.

### 10. Análise e Estatísticas

**Não faremos**:
- ❌ Gráficos de distribuição de domínios
- ❌ Estatísticas de uso da extensão
- ❌ Telemetria ou analytics
- ❌ Relatórios de tendências ao longo do tempo

**Justificativa**: Não é um produto analytics. Aplicações consumidoras podem gerar suas próprias estatísticas.

## ⏳ Escopo Futuro (Roadmap Possível)

### Fase 2 (Pós-MVP)

**Candidatos para Expansão**:
- ➕ Content scripts para coletar URLs de páginas (links na página)
- ➕ Coleta de bookmarks
- ➕ Coleta de histórico de navegação (com filtros de data)
- ➕ Formato CSV com headers customizáveis
- ➕ Filtros básicos na UI (por domínio, por quantidade)

### Fase 3 (Médio Prazo)

**Candidatos para Expansão**:
- ➕ Agrupamento por TLD
- ➕ Agrupamento por path pattern
- ➕ Regex customizado para filtros
- ➕ Whitelist/blacklist de domínios
- ➕ Exportação XML

### Fase 4 (Longo Prazo)

**Candidatos para Expansão**:
- ➕ API pública para outras extensões
- ➕ Webhooks para serviços externos
- ➕ Plugin system para extensibilidade
- ➕ Agendamento de coletas

## 🎯 Critérios de Aceitação do Escopo

Para manter o projeto no escopo, toda nova feature proposta deve passar por estes critérios:

### ✅ Feature Aceita Se:

1. **Alinhamento**: Contribui diretamente para "extração e exportação de URLs"
2. **Neutralidade**: Não impõe lógica de negócio específica de domínio
3. **Simplicidade**: Pode ser implementada sem aumentar significativamente a complexidade
4. **Documentabilidade**: Pode ser claramente documentada e testada
5. **Extensibilidade**: Segue a arquitetura existente sem quebrar módulos

### ❌ Feature Rejeitada Se:

1. **Desvio**: Desvia do propósito core de "extrator de URLs"
2. **Complexidade**: Adiciona complexidade desproporcional ao benefício
3. **Acoplamento**: Cria dependência de plataformas ou serviços externos
4. **Manutenção**: Requer manutenção perpétua devido a mudanças externas
5. **Duplicação**: Funcionalidade já existe em outras extensões especializadas

## 📊 Matriz de Escopo Rápido

| Funcionalidade | In-Scope | Out-Scope | Futuro |
|----------------|----------|-----------|--------|
| Coletar abas | ✅ | | |
| Normalizar URLs | ✅ | | |
| Deduplicar exatas | ✅ | | |
| Agrupar por domínio | ✅ | | |
| Exportar JSON | ✅ | | |
| Exportar TXT | ✅ | | |
| UI popup simples | ✅ | | |
| Categorizar semanticamente | | ❌ | |
| Analisar conteúdo | | ❌ | |
| Gerenciar abas | | ❌ | |
| Lógica específica de plataforma | | ❌ | |
| Histórico/persistência | | ❌ | |
| Coleta de bookmarks | | | ⏳ |
| Exportar CSV | | | ⏳ |
| Filtros avançados | | | ⏳ |

---

**Manter o escopo claro é fundamental para um projeto sustentável e de alta qualidade.**
