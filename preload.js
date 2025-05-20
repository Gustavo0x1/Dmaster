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
});