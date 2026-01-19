# Instalação: tab-url-extractor

## ✅ Instalação (Modo Desenvolvedor)

A extensão é **Manifest V3** e pode ser carregada como extensão descompactada.

### Google Chrome

1. Abra `chrome://extensions/`
2. Ative **Modo do desenvolvedor**
3. Clique em **Carregar sem compactação**
4. Selecione a pasta raiz do projeto (onde está o `manifest.json`)

### Microsoft Edge (Chromium)

1. Abra `edge://extensions/`
2. Ative **Modo do desenvolvedor**
3. Clique em **Carregar sem compactação**
4. Selecione a pasta raiz do projeto

## 🔐 Permissões

- `tabs`: listar abas abertas e ler suas URLs
- `downloads`: baixar o arquivo exportado
- `host_permissions: <all_urls>`: necessário para ler URLs de qualquer domínio via Tabs API

## 🧩 Observações

- O Service Worker é carregado como módulo (`background.type: "module"`).
- A análise e a exportação usam mensagens via `chrome.runtime.sendMessage`.
- O estado (matrizes) é **temporário em memória**: faça uma análise antes de exportar.
