const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');
contextBridge.exposeInMainWorld('electron',{
  send: (channel, data) => { // This is what MainGrids.tsx tries to call
    // Whitelist channels
    let validChannels = ['add-tokens-to-initiative', 'request-token-move','request-initial-initiative-state']; // Make sure 'request-token-move' is also here if used
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
    homeDir: ()=> os.homedir(),
    
    
    sendAudioCommand: (commandType, audioData) => ipcRenderer.invoke('send-audio-command', commandType, audioData),
    getAudioPool: () => ipcRenderer.invoke('manage-assets:get-audio-pool'),
addAudio: (newAudioName, newAudioType) => ipcRenderer.invoke('manage-assets:add-audio', newAudioName, newAudioType),
   getConnectedUsers: () => ipcRenderer.invoke('get-connected-users'),
 onPlayAudio: (callback) => ipcRenderer.on('play-audio-to-frontend', (event, args) => callback(args)),
    onStopAudio: (callback) => ipcRenderer.on('stop-audio-to-frontend', (event, args) => callback(args)),
   getUserId: () => ipcRenderer.invoke('get-userid'),
  onSetClientUserId: (callback) => ipcRenderer.on('set-client-userid', (event, userId) => callback(userId)),
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
    const validChannels = ['SyncTokenPosition',
      'initiative-sync-from-server', 'new-chat-message','send-message-ack','chat-history','syncActiveScenario','sendActiveScenarioToRequester','add-tokens-to-combat-tracker']; 

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
    const validChannels = ['SyncTokenPosition','initiative-sync-from-server', 'new-chat-message','send-message-ack','chat-history','syncActiveScenario','sendActiveScenarioToRequester','add-tokens-to-combat-tracker']; 

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
        'get-scenario-list',
      'save-action',
      'get-all-characters-for-tokens',
      'edit-action',
      'load-scenario',
       'update-scenario',
      'delete-action',
      'update-character-attributes',
      'remove-token-from-scenario',
      'remove-token-from-scenario-client',
      'send-message',
      'set-userid',
      'get-userid',
      'get-action-character-options',
      
      'manage-assets:get-pool',
      'manage-assets:add-image',
      'MovePlayersToScenario',
      'request-chat-history',
      'login-check',
      'save-scenario',
      'request-initial-scenario',
     'get-characters-by-player-id',
      'update-grid-state',
      'update-character-bio',
      'update-character-essentials',
      'update-character-skills',
      'save-character-data', // Exemplo: se você for salvar dados
      'delete-character',     // Exemplo: se você for deletar um personagem
      'create-character',     // Exemplo: se você for deletar um personagem
           'request-next-turn',        // NOVO: Para avançar o turno
      'request-previous-turn',    // NOVO: Para retroceder o turno
      'update-combatant-initiative',
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