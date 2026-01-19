/**
 * UrlProcessor - Normalização e Deduplicação de URLs
 * Core Logic Layer - Agnóstico ao navegador
 * Versão: 1.0.0
 */

import { Logger } from '../utils/logger.js';
import { Validators } from '../utils/validators.js';
import { CONSTANTS } from '../utils/constants.js';

export class UrlProcessor {
  /**
   * Processa array de RawTabs em UrlEntries normalizadas e deduplicadas
   * @param {Array<RawTab>} rawTabs - Array de abas brutas coletadas
   * @returns {Array<UrlEntry>} Array de URLs processadas
   * @throws {Error} Se rawTabs não for um array válido
   */
  static process(rawTabs) {
    if (!Array.isArray(rawTabs)) {
      throw new Error('rawTabs must be an array');
    }
    
    Logger.info('Processing URLs', { count: rawTabs.length });
    
    const normalized = this.normalize(rawTabs);
    const deduplicated = this.deduplicate(normalized);
    
    Logger.info('Processing complete', { 
      original: rawTabs.length,
      normalized: normalized.length,
      deduplicated: deduplicated.length,
      removed: rawTabs.length - deduplicated.length
    });
    
    return deduplicated;
  }
  
  /**
   * Normaliza array de RawTabs em UrlEntries
   * @param {Array<RawTab>} rawTabs - Array de abas brutas
   * @returns {Array<UrlEntry>} Array de URLs normalizadas
   */
  static normalize(rawTabs) {
    return rawTabs
      .map(rawTab => {
        try {
          // Valida RawTab
          if (!Validators.isValidRawTab(rawTab)) {
            Logger.warn('Invalid RawTab structure', { rawTab });
            return null;
          }
          
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
          Logger.warn('Failed to normalize URL', { 
            url: rawTab.url, 
            error: error.message 
          });
          return null;
        }
      })
      .filter(entry => entry !== null);
  }
  
  /**
   * Normaliza uma única URL aplicando regras de padronização
   * @param {string} url - URL a ser normalizada
   * @returns {string} URL normalizada
   * @throws {Error} Se URL for inválida
   */
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
    
    // Reconstruir search params ordenados
    urlObj.search = '';
    if (params.length > 0) {
      const sortedParams = new URLSearchParams();
      params.forEach(([key, value]) => {
        sortedParams.append(key, value);
      });
      urlObj.search = sortedParams.toString();
    }
    
    return urlObj.toString();
  }
  
  /**
   * Remove duplicatas exatas de um array de UrlEntries
   * @param {Array<UrlEntry>} urlEntries - Array de URLs
   * @returns {Array<UrlEntry>} Array sem duplicatas
   */
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
      Logger.info(`Removed ${duplicatesCount} duplicate URL(s)`);
    }
    
    return unique;
  }
  
  /**
   * Extrai domínio de uma URL
   * @param {string} url - URL completa
   * @returns {string} Domínio extraído (ex: "youtube.com")
   */
  static extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.toLowerCase();
    } catch (error) {
      Logger.warn('Failed to extract domain', { url, error: error.message });
      return '';
    }
  }
  
  /**
   * Verifica se uma URL deve ser processada
   * @param {string} url - URL a verificar
   * @returns {boolean} true se deve ser processada
   */
  static shouldProcessUrl(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }
    
    // Verifica prefixos inválidos
    return !CONSTANTS.INVALID_URL_PREFIXES.some(prefix => 
      url.startsWith(prefix)
    );
  }
}

// Exportação default para compatibilidade
export default UrlProcessor;
