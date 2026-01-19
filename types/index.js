/**
 * Definições de tipos do sistema via JSDoc
 * Útil para documentação e futuro TypeScript
 * Versão: 1.0.0
 */

/**
 * Aba bruta coletada do Chrome API
 * @typedef {Object} RawTab
 * @property {string} url - URL completa da aba
 * @property {string} [title] - Título da página
 * @property {number} [tabId] - ID interno do Chrome
 * @property {number} [windowId] - ID da janela
 */

/**
 * URL processada e normalizada
 * @typedef {Object} UrlEntry
 * @property {string} url - URL original completa
 * @property {string} normalizedUrl - URL após normalização
 * @property {string} domain - Domínio extraído (ex: "youtube.com")
 * @property {string} origin - Fonte da URL (ex: "tab")
 * @property {string} [matrixId] - ID da matriz associada
 * @property {Object} [metadata] - Metadados opcionais
 * @property {string} [metadata.title] - Título da página
 * @property {number} [metadata.tabId] - ID da aba
 * @property {number} [metadata.windowId] - ID da janela
 */

/**
 * Agrupamento lógico de URLs (URL-Matriz)
 * @typedef {Object} UrlMatrix
 * @property {string} id - Identificador único (ex: "matrix-domain-youtube-com")
 * @property {string} label - Rótulo legível (ex: "youtube.com")
 * @property {string} criterion - Critério de agrupamento (ex: "domain")
 * @property {string} criterionValue - Valor do critério (ex: "youtube.com")
 * @property {number} urlCount - Quantidade de URLs na matriz
 * @property {Array<UrlEntry>} urls - Array de URLs associadas
 * @property {string} createdAt - Timestamp ISO-8601 de criação
 */

/**
 * Metadados de exportação
 * @typedef {Object} ExportMetadata
 * @property {number} totalUrls - Total de URLs exportadas
 * @property {number} totalMatrices - Total de matrizes exportadas
 * @property {string} exportType - "full" ou "partial"
 * @property {Array<string>} [matrixIds] - IDs das matrizes (se partial)
 */

/**
 * Item de dados exportado
 * @typedef {Object} ExportDataItem
 * @property {string} url - URL original
 * @property {string} normalizedUrl - URL normalizada
 * @property {string} domain - Domínio extraído
 * @property {string} origin - Fonte da URL
 * @property {string} matrixId - ID da matriz associada
 * @property {string} matrixLabel - Label legível da matriz
 */

/**
 * Estrutura completa de exportação JSON
 * @typedef {Object} ExportData
 * @property {string} version - Versão do schema (SemVer)
 * @property {string} generatedAt - Timestamp ISO-8601
 * @property {string} source - Sempre "tab-url-extractor"
 * @property {ExportMetadata} metadata - Metadados da exportação
 * @property {Array<ExportDataItem>} data - Array de URLs exportadas
 */

/**
 * Mensagem de análise (UI -> Service Worker)
 * @typedef {Object} AnalyzeRequest
 * @property {string} action - "analyze"
 */

/**
 * Resposta de análise (Service Worker -> UI)
 * @typedef {Object} AnalyzeResponse
 * @property {string} status - "success" ou "error"
 * @property {Array<UrlMatrix>} [matrices] - Matrizes geradas (se success)
 * @property {string} [error] - Mensagem de erro (se error)
 * @property {string} [code] - Código de erro (se error)
 */

/**
 * Mensagem de exportação (UI -> Service Worker)
 * @typedef {Object} ExportRequest
 * @property {string} action - "export"
 * @property {Array<string>} matrixIds - IDs das matrizes a exportar ([] = todas)
 * @property {string} format - "json" ou "txt"
 */

/**
 * Resposta de exportação (Service Worker -> UI)
 * @typedef {Object} ExportResponse
 * @property {string} status - "success" ou "error"
 * @property {number} [downloadId] - ID do download (se success)
 * @property {string} [filename] - Nome do arquivo (se success)
 * @property {string} [error] - Mensagem de erro (se error)
 * @property {string} [code] - Código de erro (se error)
 */

// Exportações vazias para manter arquivo válido
export {};
