/**
 * Sistema de logging estruturado
 * Níveis: INFO, WARN, ERROR
 * Versão: 1.0.0
 */

export class Logger {
  /**
   * Formata timestamp para logs
   * @returns {string} Timestamp ISO-8601
   */
  static getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Formata mensagem de log
   * @param {string} level - Nível do log (INFO, WARN, ERROR)
   * @param {string} message - Mensagem principal
   * @param {Object} data - Dados adicionais
   * @returns {string} Mensagem formatada
   */
  static formatMessage(level, message, data = {}) {
    const timestamp = this.getTimestamp();
    return `[${timestamp}] [${level}] ${message}`;
  }

  /**
   * Log de informação (operações normais)
   * @param {string} message - Mensagem
   * @param {Object} data - Dados opcionais
   */
  static info(message, data = {}) {
    const formattedMessage = this.formatMessage('INFO', message, data);
    
    if (Object.keys(data).length > 0) {
      console.log(formattedMessage, data);
    } else {
      console.log(formattedMessage);
    }
  }

  /**
   * Log de aviso (situações anormais mas não críticas)
   * @param {string} message - Mensagem
   * @param {Object} data - Dados opcionais
   */
  static warn(message, data = {}) {
    const formattedMessage = this.formatMessage('WARN', message, data);
    
    if (Object.keys(data).length > 0) {
      console.warn(formattedMessage, data);
    } else {
      console.warn(formattedMessage);
    }
  }

  /**
   * Log de erro (erros que impedem operação)
   * @param {string} message - Mensagem
   * @param {Error|Object} error - Erro ou dados
   */
  static error(message, error = null) {
    const formattedMessage = this.formatMessage('ERROR', message);
    
    if (error) {
      console.error(formattedMessage, error);
    } else {
      console.error(formattedMessage);
    }
  }

  /**
   * Log genérico com nível customizado
   * @param {string} level - Nível do log
   * @param {string} message - Mensagem
   * @param {Object} data - Dados opcionais
   */
  static log(level, message, data = {}) {
    switch (level.toUpperCase()) {
      case 'INFO':
        this.info(message, data);
        break;
      case 'WARN':
        this.warn(message, data);
        break;
      case 'ERROR':
        this.error(message, data);
        break;
      default:
        console.log(`[${level}] ${message}`, data);
    }
  }
}

// Exportação default para compatibilidade
export default Logger;
