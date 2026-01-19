/**
 * Popup Controller - Interface do Usuário
 * Presentation Layer - Gerencia UI e comunicação com Service Worker
 * Versão: 1.0.0
 */

// Estados da aplicação
const AppState = {
  IDLE: 'idle',
  ANALYZING: 'analyzing',
  READY: 'ready',
  ERROR: 'error'
};

/**
 * Controlador principal do popup
 */
class PopupController {
  constructor() {
    this.state = AppState.IDLE;
    this.matrices = [];
    this.statistics = null;
    
    // Elementos DOM
    this.elements = {
      // Estados
      stateIdle: document.getElementById('state-idle'),
      stateAnalyzing: document.getElementById('state-analyzing'),
      stateReady: document.getElementById('state-ready'),
      stateError: document.getElementById('state-error'),
      
      // Botões
      analyzeBtn: document.getElementById('analyze-btn'),
      exportAllBtn: document.getElementById('export-all-btn'),
      newAnalysisBtn: document.getElementById('new-analysis-btn'),
      retryBtn: document.getElementById('retry-btn'),
      
      // Format selector
      formatSelect: document.getElementById('export-format'),
      
      // Containers
      matricesContainer: document.getElementById('matrices-container'),
      
      // Summary
      summaryUrls: document.getElementById('summary-urls'),
      summaryMatrices: document.getElementById('summary-matrices'),
      
      // Error
      errorMessage: document.getElementById('error-message'),
      
      // Toast
      toast: document.getElementById('toast'),
      toastMessage: document.getElementById('toast-message')
    };
    
    this.init();
  }
  
  /**
   * Inicializa o controlador
   */
  init() {
    this.bindEvents();
    this.render();
    this.log('Popup initialized');
  }
  
  /**
   * Vincula eventos aos elementos
   */
  bindEvents() {
    // Botão Analisar
    this.elements.analyzeBtn.addEventListener('click', () => {
      this.handleAnalyze();
    });
    
    // Botão Exportar Todos
    this.elements.exportAllBtn.addEventListener('click', () => {
      const format = this.elements.formatSelect.value;
      this.handleExport([], format);
    });
    
    // Botão Nova Análise
    this.elements.newAnalysisBtn.addEventListener('click', () => {
      this.resetToIdle();
    });
    
    // Botão Tentar Novamente
    this.elements.retryBtn.addEventListener('click', () => {
      this.handleAnalyze();
    });
  }
  
  /**
   * Renderiza UI baseada no estado atual
   */
  render() {
    // Esconde todos os estados
    this.elements.stateIdle.classList.add('hidden');
    this.elements.stateAnalyzing.classList.add('hidden');
    this.elements.stateReady.classList.add('hidden');
    this.elements.stateError.classList.add('hidden');
    
    // Mostra estado atual
    switch (this.state) {
      case AppState.IDLE:
        this.elements.stateIdle.classList.remove('hidden');
        break;
      
      case AppState.ANALYZING:
        this.elements.stateAnalyzing.classList.remove('hidden');
        break;
      
      case AppState.READY:
        this.elements.stateReady.classList.remove('hidden');
        this.renderMatrices();
        this.renderSummary();
        break;
      
      case AppState.ERROR:
        this.elements.stateError.classList.remove('hidden');
        break;
    }
  }
  
  /**
   * Handler para análise de abas
   */
  async handleAnalyze() {
    this.log('Starting analysis');
    this.setState(AppState.ANALYZING);
    
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'analyze' 
      });
      
      this.log('Analysis response received', response);
      
      if (response.status === 'success') {
        this.matrices = response.matrices;
        this.statistics = response.statistics;
        this.setState(AppState.READY);
        this.log('Analysis completed successfully', {
          matrices: this.matrices.length,
          totalUrls: this.statistics?.totalUrls
        });
      } else {
        throw new Error(response.error || 'Unknown error');
      }
    } catch (error) {
      this.log('Analysis failed', error);
      this.showError(error.message || 'Falha ao analisar abas');
      this.setState(AppState.ERROR);
    }
  }
  
  /**
   * Handler para exportação
   * @param {Array<string>} matrixIds - IDs das matrizes ([] = todas)
   * @param {string} format - Formato de exportação
   */
  async handleExport(matrixIds, format) {
    const isFullExport = matrixIds.length === 0;
    const exportLabel = isFullExport ? 'todos' : 'matriz selecionada';
    
    this.log('Starting export', { matrixIds, format });
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'export',
        matrixIds: matrixIds,
        format: format
      });
      
      this.log('Export response received', response);
      
      if (response.status === 'success') {
        this.showToast(`Arquivo ${response.filename} baixado com sucesso!`);
        this.log('Export completed successfully', {
          downloadId: response.downloadId,
          filename: response.filename
        });
      } else {
        throw new Error(response.error || 'Unknown error');
      }
    } catch (error) {
      this.log('Export failed', error);
      this.showToast(`Erro ao exportar ${exportLabel}: ${error.message}`, 'error');
    }
  }
  
  /**
   * Renderiza lista de matrizes
   */
  renderMatrices() {
    this.elements.matricesContainer.innerHTML = '';
    
    if (this.matrices.length === 0) {
      this.elements.matricesContainer.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #5f6368;">
          Nenhuma matriz encontrada
        </div>
      `;
      return;
    }
    
    this.matrices.forEach(matrix => {
      const matrixElement = this.createMatrixElement(matrix);
      this.elements.matricesContainer.appendChild(matrixElement);
    });
  }
  
  /**
   * Cria elemento DOM para uma matriz
   * @param {Object} matrix - Objeto UrlMatrix
   * @returns {HTMLElement}
   */
  createMatrixElement(matrix) {
    const div = document.createElement('div');
    div.className = 'matrix-item';
    div.dataset.matrixId = matrix.id;
    
    div.innerHTML = `
      <div class="matrix-info">
        <div class="matrix-label" title="${matrix.label}">
          ${this.escapeHtml(matrix.label)}
        </div>
        <div class="matrix-count">
          <span class="matrix-count-value">${matrix.urlCount}</span> URL${matrix.urlCount !== 1 ? 's' : ''}
        </div>
      </div>
      <button class="btn btn-primary btn-extract" data-matrix-id="${matrix.id}">
        <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Extrair
      </button>
    `;
    
    // Event listener para botão de exportação
    const extractBtn = div.querySelector('.btn-extract');
    extractBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const format = this.elements.formatSelect.value;
      this.handleExport([matrix.id], format);
    });
    
    return div;
  }
  
  /**
   * Renderiza sumário de estatísticas
   */
  renderSummary() {
    const totalUrls = this.statistics?.totalUrls || 0;
    const totalMatrices = this.matrices.length;
    
    this.elements.summaryUrls.textContent = totalUrls;
    this.elements.summaryMatrices.textContent = totalMatrices;
  }
  
  /**
   * Mostra mensagem de erro
   * @param {string} message - Mensagem de erro
   */
  showError(message) {
    this.elements.errorMessage.textContent = message;
  }
  
  /**
   * Mostra notificação toast
   * @param {string} message - Mensagem
   * @param {string} type - Tipo (success, error)
   */
  showToast(message, type = 'success') {
    this.elements.toastMessage.textContent = message;
    this.elements.toast.classList.remove('hidden');
    
    // Auto-hide após 3 segundos
    setTimeout(() => {
      this.elements.toast.classList.add('hidden');
    }, 3000);
  }
  
  /**
   * Muda estado da aplicação
   * @param {string} newState - Novo estado
   */
  setState(newState) {
    this.log('State change', { from: this.state, to: newState });
    this.state = newState;
    this.render();
  }
  
  /**
   * Reseta para estado ocioso
   */
  resetToIdle() {
    this.matrices = [];
    this.statistics = null;
    this.setState(AppState.IDLE);
  }
  
  /**
   * Escape HTML para prevenir XSS
   * @param {string} text - Texto a escapar
   * @returns {string}
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Log helper
   * @param {string} message - Mensagem
   * @param {*} data - Dados adicionais
   */
  log(message, data = null) {
    const timestamp = new Date().toISOString();
    if (data) {
      console.log(`[${timestamp}] [POPUP] ${message}`, data);
    } else {
      console.log(`[${timestamp}] [POPUP] ${message}`);
    }
  }
}

// Inicialização quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  const app = new PopupController();
  
  // Expõe no global para debug
  window.popupController = app;
});
