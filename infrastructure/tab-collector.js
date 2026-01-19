/**
 * TabCollector - Coleta de Abas do Navegador
 * Infrastructure Layer - Interface com Chrome Tabs API
 * Versão: 1.0.0
 */

import { Logger } from '../utils/logger.js';
import { CONSTANTS } from '../utils/constants.js';

export class TabCollector {
  /**
   * Coleta todas as abas válidas de todas as janelas
   * @returns {Promise<Array<RawTab>>} Array de abas coletadas
   * @throws {Error} Se falhar ao acessar chrome.tabs
   */
  static async collect() {
    try {
      Logger.info('Collecting tabs from browser');
      
      // Verifica se chrome.tabs está disponível
      if (!chrome || !chrome.tabs) {
        throw new Error('Chrome Tabs API not available');
      }
      
      // Coleta todas as abas de todas as janelas
      const tabs = await chrome.tabs.query({});
      
      Logger.info(`Found ${tabs.length} total tab(s)`);
      
      // Filtra abas válidas
      const validTabs = tabs.filter(tab => this.isValidTab(tab));
      
      Logger.info(`Collected ${validTabs.length} valid tab(s) out of ${tabs.length} total`);
      
      // Mapeia para RawTab
      const rawTabs = validTabs.map(tab => this.mapToRawTab(tab));
      
      if (rawTabs.length === 0) {
        throw new Error('No valid tabs found');
      }
      
      return rawTabs;
    } catch (error) {
      Logger.error('Failed to collect tabs', error);
      
      // Propaga erro com contexto
      if (error.message === 'No valid tabs found') {
        throw error;
      }
      
      throw new Error(`Tab collection failed: ${error.message}`);
    }
  }
  
  /**
   * Verifica se uma aba é válida para coleta
   * @param {chrome.tabs.Tab} tab - Aba do Chrome
   * @returns {boolean} true se válida
   */
  static isValidTab(tab) {
    // Deve ter URL
    if (!tab.url) {
      Logger.warn('Tab without URL', { tabId: tab.id });
      return false;
    }
    
    // Ignora URLs de sistema
    const isSystemUrl = CONSTANTS.INVALID_URL_PREFIXES.some(prefix => 
      tab.url.startsWith(prefix)
    );
    
    if (isSystemUrl) {
      Logger.info('Skipping system URL', { url: tab.url });
      return false;
    }
    
    return true;
  }
  
  /**
   * Mapeia Tab do Chrome para RawTab
   * @param {chrome.tabs.Tab} tab - Aba do Chrome
   * @returns {RawTab} Objeto RawTab
   */
  static mapToRawTab(tab) {
    return {
      url: tab.url,
      title: tab.title || '',
      tabId: tab.id,
      windowId: tab.windowId
    };
  }
  
  /**
   * Coleta abas apenas da janela atual
   * @returns {Promise<Array<RawTab>>} Array de abas da janela atual
   */
  static async collectCurrentWindow() {
    try {
      Logger.info('Collecting tabs from current window');
      
      // Coleta abas apenas da janela ativa
      const tabs = await chrome.tabs.query({ currentWindow: true });
      
      const validTabs = tabs.filter(tab => this.isValidTab(tab));
      const rawTabs = validTabs.map(tab => this.mapToRawTab(tab));
      
      Logger.info(`Collected ${rawTabs.length} tab(s) from current window`);
      
      if (rawTabs.length === 0) {
        throw new Error('No valid tabs found in current window');
      }
      
      return rawTabs;
    } catch (error) {
      Logger.error('Failed to collect tabs from current window', error);
      throw new Error(`Current window tab collection failed: ${error.message}`);
    }
  }
  
  /**
   * Coleta apenas abas ativas (uma por janela)
   * @returns {Promise<Array<RawTab>>} Array de abas ativas
   */
  static async collectActiveTabs() {
    try {
      Logger.info('Collecting active tabs');
      
      const tabs = await chrome.tabs.query({ active: true });
      
      const validTabs = tabs.filter(tab => this.isValidTab(tab));
      const rawTabs = validTabs.map(tab => this.mapToRawTab(tab));
      
      Logger.info(`Collected ${rawTabs.length} active tab(s)`);
      
      return rawTabs;
    } catch (error) {
      Logger.error('Failed to collect active tabs', error);
      throw new Error(`Active tab collection failed: ${error.message}`);
    }
  }
  
  /**
   * Obtém estatísticas das abas
   * @returns {Promise<Object>} Estatísticas
   */
  static async getStatistics() {
    try {
      const tabs = await chrome.tabs.query({});
      const validTabs = tabs.filter(tab => this.isValidTab(tab));
      
      // Conta janelas únicas
      const windowIds = new Set(validTabs.map(tab => tab.windowId));
      
      // Conta domínios únicos
      const domains = new Set(
        validTabs
          .map(tab => {
            try {
              const url = new URL(tab.url);
              return url.hostname.toLowerCase();
            } catch {
              return null;
            }
          })
          .filter(domain => domain !== null)
      );
      
      return {
        totalTabs: tabs.length,
        validTabs: validTabs.length,
        invalidTabs: tabs.length - validTabs.length,
        windowCount: windowIds.size,
        uniqueDomains: domains.size
      };
    } catch (error) {
      Logger.error('Failed to get tab statistics', error);
      throw error;
    }
  }
  
  /**
   * Verifica se há permissão de acesso a abas
   * @returns {boolean} true se há permissão
   */
  static hasPermission() {
    return !!(chrome && chrome.tabs);
  }
}

// Exportação default para compatibilidade
export default TabCollector;
