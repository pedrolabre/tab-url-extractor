/**
 * Constantes globais do sistema
 * Versão: 1.0.0
 */

export const CONSTANTS = {
  // Versão do formato de exportação
  VERSION: '1.0.0',
  
  // Formatos de exportação suportados
  EXPORT_FORMATS: {
    JSON: 'json',
    TXT: 'txt',
    TXT_SIMPLE: 'txt-simple'
  },
  
  // Critérios de agrupamento de URL-Matriz
  MATRIX_CRITERION: {
    DOMAIN: 'domain'
    // Futuro: TLD: 'tld', PATH: 'path'
  },
  
  // Ações de mensagens entre UI e Service Worker
  MESSAGE_ACTIONS: {
    ANALYZE: 'analyze',
    EXPORT: 'export'
  },
  
  // Status de resposta
  RESPONSE_STATUS: {
    SUCCESS: 'success',
    ERROR: 'error'
  },
  
  // Tipos de exportação
  EXPORT_TYPES: {
    FULL: 'full',
    PARTIAL: 'partial'
  },
  
  // Parâmetros de tracking conhecidos para remoção
  TRACKING_PARAMS: [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'fbclid',
    'gclid',
    'msclkid',
    '_ga',
    'mc_cid',
    'mc_eid'
  ],
  
  // Prefixos de URLs inválidas (sistema)
  INVALID_URL_PREFIXES: [
    'chrome://',
    'chrome-extension://',
    'about:',
    'edge://',
    'opera://',
    'brave://'
  ],
  
  // MIME types por formato
  MIME_TYPES: {
    json: 'application/json',
    txt: 'text/plain',
    csv: 'text/csv',
    xml: 'application/xml'
  }
};

// Exportação default para compatibilidade
export default CONSTANTS;
