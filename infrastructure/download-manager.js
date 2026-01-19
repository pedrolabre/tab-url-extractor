/**
 * DownloadManager - Gerenciamento de Downloads
 * Infrastructure Layer - Interface com Chrome Downloads API
 * Versão: 1.0.0
 */

import { Logger } from '../utils/logger.js';
import { CONSTANTS } from '../utils/constants.js';

export class DownloadManager {
  /**
   * Cria download de conteúdo
   * @param {string} content - Conteúdo do arquivo
   * @param {string} filename - Nome do arquivo
   * @param {string} mimeType - MIME type
   * @returns {Promise<number>} Download ID
   * @throws {Error} Se falhar ao criar download
   */
  static async create(content, filename, mimeType) {
    try {
      Logger.info('Creating download', { filename, mimeType });
      
      // Verifica se chrome.downloads está disponível
      if (!chrome || !chrome.downloads) {
        throw new Error('Chrome Downloads API not available');
      }
      
      // No Service Worker (Manifest V3), não podemos usar URL.createObjectURL
      // Usamos data URL em vez disso
      const base64Content = btoa(unescape(encodeURIComponent(content)));
      const dataUrl = `data:${mimeType};base64,${base64Content}`;
      
      Logger.info('Data URL created', { 
        size: content.length,
        mimeType: mimeType
      });
      
      // Inicia download
      const downloadId = await chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false // Download automático sem prompt
      });
      
      Logger.info('Download created successfully', { 
        downloadId, 
        filename 
      });
      
      return downloadId;
    } catch (error) {
      Logger.error('Failed to create download', error);
      throw new Error(`Download creation failed: ${error.message}`);
    }
  }
  
  /**
   * Gera nome de arquivo com timestamp
   * @param {string} extension - Extensão do arquivo (ex: "json", "txt")
   * @returns {string} Nome do arquivo
   */
  static generateFilename(extension) {
    const timestamp = new Date()
      .toISOString()
      .replace(/:/g, '-')      // Substitui : por - (Windows compatibility)
      .replace(/\..+/, '');     // Remove milissegundos
    
    return `tab-urls-${timestamp}.${extension}`;
  }
  
  /**
   * Retorna MIME type para formato
   * @param {string} format - Formato ("json", "txt", "csv", etc.)
   * @returns {string} MIME type
   */
  static getMimeType(format) {
    const mimeType = CONSTANTS.MIME_TYPES[format];
    
    if (!mimeType) {
      Logger.warn('Unknown format, using text/plain', { format });
      return 'text/plain';
    }
    
    return mimeType;
  }
  
  /**
   * Cria download de JSON
   * @param {Object} data - Dados a exportar
   * @param {string} [customFilename] - Nome customizado (opcional)
   * @returns {Promise<number>} Download ID
   */
  static async createJSON(data, customFilename = null) {
    const content = JSON.stringify(data, null, 2);
    const filename = customFilename || this.generateFilename('json');
    const mimeType = this.getMimeType('json');
    
    return this.create(content, filename, mimeType);
  }
  
  /**
   * Cria download de TXT
   * @param {string} content - Conteúdo texto
   * @param {string} [customFilename] - Nome customizado (opcional)
   * @returns {Promise<number>} Download ID
   */
  static async createTXT(content, customFilename = null) {
    const filename = customFilename || this.generateFilename('txt');
    const mimeType = this.getMimeType('txt');
    
    return this.create(content, filename, mimeType);
  }
  
  /**
   * Cria download de CSV
   * @param {string} content - Conteúdo CSV
   * @param {string} [customFilename] - Nome customizado (opcional)
   * @returns {Promise<number>} Download ID
   */
  static async createCSV(content, customFilename = null) {
    const filename = customFilename || this.generateFilename('csv');
    const mimeType = this.getMimeType('csv');
    
    return this.create(content, filename, mimeType);
  }
  
  /**
   * Obtém status de um download
   * @param {number} downloadId - ID do download
   * @returns {Promise<Object>} Status do download
   */
  static async getDownloadStatus(downloadId) {
    try {
      const downloads = await chrome.downloads.search({ id: downloadId });
      
      if (downloads.length === 0) {
        return null;
      }
      
      const download = downloads[0];
      
      return {
        id: download.id,
        filename: download.filename,
        state: download.state,
        bytesReceived: download.bytesReceived,
        totalBytes: download.totalBytes,
        exists: download.exists
      };
    } catch (error) {
      Logger.error('Failed to get download status', error);
      return null;
    }
  }
  
  /**
   * Aguarda conclusão de um download
   * @param {number} downloadId - ID do download
   * @param {number} timeout - Timeout em ms (padrão: 5000)
   * @returns {Promise<boolean>} true se completou
   */
  static async waitForDownload(downloadId, timeout = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const status = await this.getDownloadStatus(downloadId);
      
      if (!status) {
        return false;
      }
      
      if (status.state === 'complete') {
        Logger.info('Download completed', { downloadId });
        return true;
      }
      
      if (status.state === 'interrupted') {
        Logger.error('Download interrupted', { downloadId });
        return false;
      }
      
      // Aguarda 100ms antes de verificar novamente
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    Logger.warn('Download timeout', { downloadId, timeout });
    return false;
  }
  
  /**
   * Abre o arquivo baixado
   * @param {number} downloadId - ID do download
   * @returns {Promise<void>}
   */
  static async openDownload(downloadId) {
    try {
      await chrome.downloads.open(downloadId);
      Logger.info('Download opened', { downloadId });
    } catch (error) {
      Logger.error('Failed to open download', error);
      throw error;
    }
  }
  
  /**
   * Mostra o arquivo baixado no explorador de arquivos
   * @param {number} downloadId - ID do download
   * @returns {Promise<void>}
   */
  static async showDownload(downloadId) {
    try {
      await chrome.downloads.show(downloadId);
      Logger.info('Download shown in file explorer', { downloadId });
    } catch (error) {
      Logger.error('Failed to show download', error);
      throw error;
    }
  }
  
  /**
   * Verifica se há permissão de downloads
   * @returns {boolean} true se há permissão
   */
  static hasPermission() {
    return !!(chrome && chrome.downloads);
  }
  
  /**
   * Valida tamanho do conteúdo
   * @param {string} content - Conteúdo a validar
   * @param {number} maxSizeMB - Tamanho máximo em MB (padrão: 10)
   * @returns {boolean} true se válido
   */
  static validateContentSize(content, maxSizeMB = 10) {
    // Calcula tamanho em bytes (cada caractere UTF-16 = 2 bytes aproximadamente)
    const sizeBytes = new TextEncoder().encode(content).length;
    const sizeMB = sizeBytes / (1024 * 1024);
    
    if (sizeMB > maxSizeMB) {
      Logger.warn('Content exceeds maximum size', {
        sizeMB: sizeMB.toFixed(2),
        maxSizeMB
      });
      return false;
    }
    
    return true;
  }
}

// Exportação default para compatibilidade
export default DownloadManager;
