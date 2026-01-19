/**
 * MatrixBuilder - Construção de URL-Matriz
 * Core Logic Layer - Agnóstico ao navegador
 * Versão: 1.0.0
 */

import { Logger } from '../utils/logger.js';
import { CONSTANTS } from '../utils/constants.js';

export class MatrixBuilder {
  /**
   * Constrói URL-Matriz a partir de UrlEntries
   * @param {Array<UrlEntry>} urlEntries - Array de URLs processadas
   * @returns {Array<UrlMatrix>} Array de matrizes ordenadas por urlCount
   * @throws {Error} Se urlEntries não for um array válido
   */
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
    
    Logger.info('Matrices built', { 
      matrixCount: sorted.length,
      totalUrls: urlEntries.length
    });
    
    return sorted;
  }
  
  /**
   * Agrupa URLs por domínio
   * @param {Array<UrlEntry>} urlEntries - URLs a agrupar
   * @returns {Map<string, Array<UrlEntry>>} Map de domínio -> URLs
   */
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
    
    Logger.info('URLs grouped by domain', { 
      uniqueDomains: grouped.size 
    });
    
    return grouped;
  }
  
  /**
   * Cria objetos UrlMatrix a partir de URLs agrupadas
   * @param {Map<string, Array<UrlEntry>>} grouped - URLs agrupadas
   * @returns {Array<UrlMatrix>} Array de matrizes
   */
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
  
  /**
   * Ordena matrizes por quantidade de URLs (decrescente)
   * @param {Array<UrlMatrix>} matrices - Matrizes a ordenar
   * @returns {Array<UrlMatrix>} Matrizes ordenadas
   */
  static sortByUrlCount(matrices) {
    return matrices.sort((a, b) => b.urlCount - a.urlCount);
  }
  
  /**
   * Gera ID único para uma matriz
   * @param {string} criterionValue - Valor do critério (ex: "youtube.com")
   * @returns {string} ID sanitizado (ex: "matrix-domain-youtube-com")
   */
  static generateMatrixId(criterionValue) {
    // Sanitiza para uso em ID (remove caracteres especiais)
    const sanitized = criterionValue
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')  // Substitui não-alfanuméricos por hífen
      .replace(/-+/g, '-')          // Remove hífens duplicados
      .replace(/^-|-$/g, '');       // Remove hífens no início/fim
    
    return `matrix-domain-${sanitized}`;
  }
  
  /**
   * Filtra matrizes por IDs
   * @param {Array<UrlMatrix>} matrices - Todas as matrizes
   * @param {Array<string>} matrixIds - IDs desejados
   * @returns {Array<UrlMatrix>} Matrizes filtradas
   */
  static filterByIds(matrices, matrixIds) {
    if (!matrixIds || matrixIds.length === 0) {
      return matrices;
    }
    
    return matrices.filter(matrix => matrixIds.includes(matrix.id));
  }
  
  /**
   * Obtém estatísticas das matrizes
   * @param {Array<UrlMatrix>} matrices - Matrizes
   * @returns {Object} Estatísticas
   */
  static getStatistics(matrices) {
    const totalUrls = matrices.reduce((sum, m) => sum + m.urlCount, 0);
    const avgUrlsPerMatrix = matrices.length > 0 
      ? (totalUrls / matrices.length).toFixed(2) 
      : 0;
    
    const urlCountDistribution = matrices.map(m => m.urlCount);
    const maxUrls = Math.max(...urlCountDistribution, 0);
    const minUrls = Math.min(...urlCountDistribution, 0);
    
    return {
      totalMatrices: matrices.length,
      totalUrls: totalUrls,
      avgUrlsPerMatrix: parseFloat(avgUrlsPerMatrix),
      maxUrlsInMatrix: maxUrls,
      minUrlsInMatrix: minUrls,
      domains: matrices.map(m => m.label)
    };
  }
}

// Exportação default para compatibilidade
export default MatrixBuilder;
