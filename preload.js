const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');
contextBridge.exposeInMainWorld('electron',{

    homeDir: ()=> os.homedir(),

 updateScenario: (scenarioId, tokens, map) =>
    ipcRenderer.send("update-scenario", { scenarioId, tokens, map }),
  requestTokenMove: (tokenId, posX, posY,sceneId) =>
    ipcRenderer.send("request-tokenMove", { tokenId,posX,posY,sceneId:0 }),
  onSyncScenario: (callback) =>
    ipcRenderer.on("sync-scenario", (event, data) => callback(data)),
  onSyncAll: (callback) =>
    ipcRenderer.on("sync-all", (event, data) => (callback(data))),
on: (channel, callback) => {
    // === LISTA DE CANAIS PERMITIDOS ===
    // Adicione AQUI todos os canais que seu renderer process OUVIRÁ (ex: 'SyncTokenPosition', 'chatMessage')
    const validChannels = ['SyncTokenPosition', 'chatMessage']; 

    if (validChannels.includes(channel)) {
      // Cria um wrapper para o callback para evitar que o objeto 'event' do Electron
      // seja exposto diretamente ao contexto do renderer.
      const wrappedCallback = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, wrappedCallback);
      // É VITAL retornar esta referência. É ela que 'off' precisará para remover o listener.
      return wrappedCallback; 
    }
    console.warn(`[preload.js] Attempted to register listener on invalid channel: ${channel}`);
    return null; // Retorna null para canais não permitidos
  },

  // Para remover listeners de eventos do processo principal
  off: (channel, callback) => {
    // === LISTA DE CANAIS PERMITIDOS ===
    // Adicione AQUI todos os canais que seu renderer process REMOVERÁ listeners
    const validChannels = ['SyncTokenPosition', 'chatMessage']; 

    if (validChannels.includes(channel) && callback) {
      // ipcRenderer.off é um alias para ipcRenderer.removeListener.
      // É crucial passar a MESMA REFERÊNCIA de função que foi usada para registrar.
      ipcRenderer.removeListener(channel, callback);
    } else {
      console.warn(`[preload.js] Attempted to remove listener on invalid channel or with invalid callback: ${channel}`);
    }
  },
   invoke: (channel, ...args) => {
    // Lista de canais IPC permitidos para invoke
    const validInvokeChannels = [
      'request-character-data',
      'save-action',
      'edit-action',
      'delete-action',
      
      'save-character-data', // Exemplo: se você for salvar dados
      'delete-character',     // Exemplo: se você for deletar um personagem
    ];

    if (validInvokeChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    // Opcional: logar ou lançar um erro se o canal não for válido
    console.error(`Attempted to invoke an invalid channel: ${channel}`);
    return Promise.reject(new Error(`Invalid IPC channel: ${channel}`));
  },
  DoremoveListener: (listener,func) => ipcRenderer.removeListener(listener,func),

});