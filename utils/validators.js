/**
 * Validadores de dados
 * Validação de URLs, estruturas de dados e formatos
 * Versão: 1.0.0
 */

import { CONSTANTS } from './constants.js';

export class Validators {
  /**
   * Valida se uma string é uma URL válida HTTP/HTTPS
   * @param {string} url - URL a validar
   * @returns {boolean} true se válida
   */
  static isValidUrl(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }

    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Valida se um objeto é um RawTab válido
   * @param {Object} rawTab - Objeto a validar
   * @returns {boolean} true se válido
   */
  static isValidRawTab(rawTab) {
    return (
      rawTab &&
      typeof rawTab === 'object' &&
      typeof rawTab.url === 'string' &&
      this.isValidUrl(rawTab.url)
    );
  }

  /**
   * Valida se um objeto é um UrlEntry válido
   * @param {Object} entry - Objeto a validar
   * @returns {boolean} true se válido
   */
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

  /**
   * Valida se um objeto é um UrlMatrix válido
   * @param {Object} matrix - Objeto a validar
   * @returns {boolean} true se válido
   */
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

  /**
   * Valida se um formato de exportação é válido
   * @param {string} format - Formato a validar
   * @returns {boolean} true se válido
   */
  static isValidExportFormat(format) {
    return (
      format === CONSTANTS.EXPORT_FORMATS.JSON ||
      format === CONSTANTS.EXPORT_FORMATS.TXT
    );
  }

  /**
   * Valida se uma versão segue padrão SemVer
   * @param {string} version - Versão a validar
   * @returns {boolean} true se válido
   */
  static isValidVersion(version) {
    if (typeof version !== 'string') {
      return false;
    }
    
    const semverPattern = /^\d+\.\d+\.\d+$/;
    return semverPattern.test(version);
  }

  /**
   * Valida se um exportType é válido
   * @param {string} exportType - Tipo a validar
   * @returns {boolean} true se válido
   */
  static isValidExportType(exportType) {
    return (
      exportType === CONSTANTS.EXPORT_TYPES.FULL ||
      exportType === CONSTANTS.EXPORT_TYPES.PARTIAL
    );
  }

  /**
   * Valida estrutura completa de ExportData
   * @param {Object} exportData - Dados de exportação
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  static validateExportData(exportData) {
    const errors = [];

    // Valida campos obrigatórios
    if (!exportData.version) {
      errors.push('Missing field: version');
    } else if (!this.isValidVersion(exportData.version)) {
      errors.push('Invalid version format');
    }

    if (!exportData.generatedAt) {
      errors.push('Missing field: generatedAt');
    }

    if (!exportData.source) {
      errors.push('Missing field: source');
    } else if (exportData.source !== 'tab-url-extractor') {
      errors.push('Invalid source value');
    }

    if (!exportData.metadata) {
      errors.push('Missing field: metadata');
    } else {
      // Valida metadata
      const meta = exportData.metadata;
      
      if (typeof meta.totalUrls !== 'number') {
        errors.push('Invalid metadata.totalUrls');
      }
      
      if (typeof meta.totalMatrices !== 'number') {
        errors.push('Invalid metadata.totalMatrices');
      }
      
      if (!this.isValidExportType(meta.exportType)) {
        errors.push('Invalid metadata.exportType');
      }
    }

    if (!exportData.data) {
      errors.push('Missing field: data');
    } else if (!Array.isArray(exportData.data)) {
      errors.push('Field data must be an array');
    } else {
      // Valida consistência de contadores
      if (exportData.metadata && exportData.data.length !== exportData.metadata.totalUrls) {
        errors.push('Mismatch: data.length !== metadata.totalUrls');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
}

// Exportação default para compatibilidade
export default Validators;
