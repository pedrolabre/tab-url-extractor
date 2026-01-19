/**
 * Service Worker - Orquestrador Principal
 * Orchestration Layer - Conecta UI, Core e Infrastructure
 * Versão: 1.0.0
 */

import { TabCollector } from '../infrastructure/tab-collector.js';
import { DownloadManager } from '../infrastructure/download-manager.js';
import { UrlProcessor } from '../core/url-processor.js';
import { MatrixBuilder } from '../core/matrix-builder.js';
import { Exporter } from '../core/exporter.js';
import { Logger } from '../utils/logger.js';
import { CONSTANTS } from '../utils/constants.js';

// Estado temporário (resetado a cada análise)
let currentMatrices = [];

// Log de inicialização
Logger.info('Service Worker initialized', {
  version: CONSTANTS.VERSION,
  timestamp: new Date().toISOString()
});

/**
 * Listener principal de mensagens
 * Escuta mensagens da UI via chrome.runtime.onMessage
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  Logger.info('Message received', { 
    action: message.action,
    sender: sender.id 
  });
  
  // Handler para análise de abas
  if (message.action === CONSTANTS.MESSAGE_ACTIONS.ANALYZE) {
    handleAnalyze(sendResponse);
    return true; // Mantém canal aberto para resposta assíncrona
  }
  
  // Handler para exportação
  if (message.action === CONSTANTS.MESSAGE_ACTIONS.EXPORT) {
    handleExport(message.matrixIds, message.format, sendResponse);
    return true; // Mantém canal aberto para resposta assíncrona
  }
  
  // Ação desconhecida
  Logger.warn('Unknown action received', { action: message.action });
  sendResponse({
    status: CONSTANTS.RESPONSE_STATUS.ERROR,
    error: `Unknown action: ${message.action}`,
    code: 'UNKNOWN_ACTION'
  });
  
  return false;
});

/**
 * Handler para análise de abas
 * @param {Function} sendResponse - Função de callback para resposta
 */
async function handleAnalyze(sendResponse) {
  Logger.info('Starting tab analysis');
  
  const startTime = Date.now();
  
  try {
    // Etapa 1: Coleta de abas
    Logger.info('Step 1/3: Collecting tabs');
    const rawTabs = await TabCollector.collect();
    Logger.info(`Collected ${rawTabs.length} tab(s)`);
    
    // Etapa 2: Processamento de URLs
    Logger.info('Step 2/3: Processing URLs');
    const urlEntries = UrlProcessor.process(rawTabs);
    Logger.info(`Processed ${urlEntries.length} unique URL(s)`);
    
    // Etapa 3: Construção de matrizes
    Logger.info('Step 3/3: Building matrices');
    const matrices = MatrixBuilder.build(urlEntries);
    Logger.info(`Built ${matrices.length} matrice(s)`);
    
    // Armazena estado temporário
    currentMatrices = matrices;
    
    // Calcula tempo de processamento
    const processingTime = Date.now() - startTime;
    
    // Obtém estatísticas
    const stats = MatrixBuilder.getStatistics(matrices);
    
    Logger.info('Tab analysis completed successfully', {
      processingTimeMs: processingTime,
      totalUrls: urlEntries.length,
      totalMatrices: matrices.length,
      statistics: stats
    });
    
    // Retorna sucesso com matrizes
    sendResponse({
      status: CONSTANTS.RESPONSE_STATUS.SUCCESS,
      matrices: matrices,
      statistics: {
        processingTimeMs: processingTime,
        ...stats
      }
    });
    
  } catch (error) {
    Logger.error('Tab analysis failed', error);
    
    // Limpa estado em caso de erro
    currentMatrices = [];
    
    // Determina código de erro
    let errorCode = 'ANALYSIS_FAILED';
    if (error.message.includes('No valid tabs')) {
      errorCode = 'NO_VALID_TABS';
    } else if (error.message.includes('permission')) {
      errorCode = 'PERMISSION_DENIED';
    } else if (error.message.includes('Tab collection failed')) {
      errorCode = 'TAB_COLLECTION_FAILED';
    }
    
    // Retorna erro
    sendResponse({
      status: CONSTANTS.RESPONSE_STATUS.ERROR,
      error: error.message,
      code: errorCode
    });
  }
}

/**
 * Handler para exportação de dados
 * @param {Array<string>} matrixIds - IDs das matrizes a exportar ([] = todas)
 * @param {string} format - Formato de exportação ("json" ou "txt")
 * @param {Function} sendResponse - Função de callback para resposta
 */
async function handleExport(matrixIds, format, sendResponse) {
  Logger.info('Starting export', { 
    matrixIds: matrixIds || [],
    format: format 
  });
  
  const startTime = Date.now();
  
  try {
    // Validação: formato
    if (!format) {
      throw new Error('Format is required');
    }
    
    if (!Exporter.isValidFormat(format)) {
      throw new Error(`Invalid format: ${format}`);
    }
    
    // Validação: há matrizes no estado?
    if (!currentMatrices || currentMatrices.length === 0) {
      throw new Error('No matrices available. Please analyze tabs first.');
    }
    
    // Etapa 1: Filtra matrizes
    let matricesToExport;
    let exportType;
    
    if (!matrixIds || matrixIds.length === 0) {
      // Exportação completa
      matricesToExport = currentMatrices;
      exportType = CONSTANTS.EXPORT_TYPES.FULL;
      Logger.info('Full export: all matrices');
    } else {
      // Exportação parcial
      matricesToExport = MatrixBuilder.filterByIds(currentMatrices, matrixIds);
      exportType = CONSTANTS.EXPORT_TYPES.PARTIAL;
      Logger.info('Partial export', { 
        requestedIds: matrixIds.length,
        foundMatrices: matricesToExport.length 
      });
    }
    
    if (matricesToExport.length === 0) {
      throw new Error('No matrices found for the specified IDs');
    }
    
    // Etapa 2: Formata dados
    Logger.info('Formatting data', { format, exportType });
    
    const exportData = Exporter.export(matricesToExport, format, exportType);
    
    // Etapa 3: Prepara conteúdo para download
    let content;
    let fileExtension = format;
    
    // Para txt-simple, usamos extensão .txt
    if (format === CONSTANTS.EXPORT_FORMATS.TXT_SIMPLE) {
      fileExtension = 'txt';
    }
    
    const mimeType = DownloadManager.getMimeType(fileExtension);
    
    if (format === CONSTANTS.EXPORT_FORMATS.JSON) {
      content = JSON.stringify(exportData, null, 2);
    } else if (format === CONSTANTS.EXPORT_FORMATS.TXT || format === CONSTANTS.EXPORT_FORMATS.TXT_SIMPLE) {
      content = exportData; // já é string
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }
    
    // Validação: tamanho do conteúdo
    if (!DownloadManager.validateContentSize(content)) {
      Logger.warn('Content size exceeds recommended limit');
      // Continua mesmo assim, mas loga aviso
    }
    
    // Etapa 4: Cria download
    const filename = DownloadManager.generateFilename(fileExtension);
    Logger.info('Creating download', { filename, size: content.length });
    
    const downloadId = await DownloadManager.create(content, filename, mimeType);
    
    // Calcula tempo de processamento
    const processingTime = Date.now() - startTime;
    
    Logger.info('Export completed successfully', {
      downloadId,
      filename,
      processingTimeMs: processingTime,
      exportedUrls: matricesToExport.reduce((sum, m) => sum + m.urlCount, 0),
      exportedMatrices: matricesToExport.length
    });
    
    // Retorna sucesso
    sendResponse({
      status: CONSTANTS.RESPONSE_STATUS.SUCCESS,
      downloadId: downloadId,
      filename: filename,
      statistics: {
        processingTimeMs: processingTime,
        exportedUrls: matricesToExport.reduce((sum, m) => sum + m.urlCount, 0),
        exportedMatrices: matricesToExport.length,
        exportType: exportType
      }
    });
    
  } catch (error) {
    Logger.error('Export failed', error);
    
    // Determina código de erro
    let errorCode = 'EXPORT_FAILED';
    if (error.message.includes('No matrices available')) {
      errorCode = 'NO_MATRICES_AVAILABLE';
    } else if (error.message.includes('Invalid format')) {
      errorCode = 'INVALID_FORMAT';
    } else if (error.message.includes('No matrices found')) {
      errorCode = 'MATRIX_NOT_FOUND';
    } else if (error.message.includes('Download creation failed')) {
      errorCode = 'DOWNLOAD_FAILED';
    }
    
    // Retorna erro
    sendResponse({
      status: CONSTANTS.RESPONSE_STATUS.ERROR,
      error: error.message,
      code: errorCode
    });
  }
}

/**
 * Limpa estado temporário
 * Útil para liberar memória após exportação
 */
function clearState() {
  Logger.info('Clearing temporary state');
  currentMatrices = [];
}

/**
 * Obtém estado atual (para debug)
 * @returns {Object} Estado atual
 */
function getState() {
  return {
    matricesCount: currentMatrices.length,
    totalUrls: currentMatrices.reduce((sum, m) => sum + m.urlCount, 0),
    matrices: currentMatrices.map(m => ({
      id: m.id,
      label: m.label,
      urlCount: m.urlCount
    }))
  };
}

// Listener de instalação
chrome.runtime.onInstalled.addListener((details) => {
  Logger.info('Extension installed/updated', {
    reason: details.reason,
    version: chrome.runtime.getManifest().version
  });
  
  if (details.reason === 'install') {
    Logger.info('First installation - Welcome!');
    // Pode abrir página de boas-vindas aqui se desejar
  } else if (details.reason === 'update') {
    Logger.info('Extension updated', {
      previousVersion: details.previousVersion
    });
  }
});

// Listener de startup
chrome.runtime.onStartup.addListener(() => {
  Logger.info('Browser started, service worker active');
});

// Listener de suspend (quando service worker é pausado)
chrome.runtime.onSuspend.addListener(() => {
  Logger.info('Service worker suspending', {
    matricesInMemory: currentMatrices.length
  });
  
  // Limpa estado antes de suspender
  clearState();
});

// Log de health check periódico (a cada 5 minutos)
setInterval(() => {
  const state = getState();
  Logger.info('Health check', {
    uptime: 'active',
    matricesInMemory: state.matricesCount,
    timestamp: new Date().toISOString()
  });
}, 5 * 60 * 1000); // 5 minutos

// Exporta funções para debug (disponível no console do service worker)
globalThis.debug = {
  getState,
  clearState,
  getCurrentMatrices: () => currentMatrices,
  getConstants: () => CONSTANTS
};

Logger.info('Service Worker fully initialized and ready');
