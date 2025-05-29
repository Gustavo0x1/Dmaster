

const { app, BrowserWindow, ipcMain } = require("electron");
const WebSocket = require("ws");
const url = require('url')
const path = require('path')


let MainWindow;
let ws;

// Função para iniciar a conexão WebSocket
function startWebSocket() {
  ws = new WebSocket("ws://26.37.35.114:5000");

  ws.on("open", () => {
    console.log("Conectado ao servidor WebSocket.");
  });

ws.on("message", (message) => {
  try {
    const { type, data } = JSON.parse(message);

    if (!MainWindow) {
      console.warn("MainWindow ainda não está pronta para enviar mensagens");
      return;
    }

    if (type === "SyncTokenPosition") {
    
      MainWindow.webContents.send("SyncTokenPosition", data);

    }

    if (type === "syncAll") {
      MainWindow.webContents.send("sync-all", data);
      console.log(1)
    }
  } catch (err) {
    console.error("Erro ao processar mensagem do servidor:", err);
  }
});


  ws.on("close", () => {
    console.log("Conexão WebSocket encerrada. Tentando reconectar...");
    setTimeout(startWebSocket, 5000); // Reconnect após 5 segundos
  });

  ws.on("error", (error) => {
    console.error("Erro no WebSocket:", error);
  });
}
function createMainWindow(){

    MainWindow = new BrowserWindow({

        width:1280,
        height:720,
        backgroundColor:"#202020",
        resizable:false,
        webPreferences:{
            contextIsolation:true,
            nodeIntegration:true,
            preload: path.join(__dirname,'preload.js')
        }
    });

    const startUrl = url.format({
        pathname:path.join(__dirname,'./app/build/index.html'),
        protocol:'file'
    })
    MainWindow.loadURL(startUrl)
}

app.whenReady().then(()=>{
  createMainWindow();
    startWebSocket();
});



// Manipular alterações de cenário enviadas pela interface
ipcMain.on("update-scenario", (event, data) => {
  const message = JSON.stringify({ type: "updateScenario", data });

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(message);
    console.log("Mensagem enviada ao servidor:", message);
  } else {
    console.error("WebSocket não está conectado. Mensagem não enviada.");
  }
});
// Manipular alterações de cenário enviadas pela interface
ipcMain.on("request-tokenMove", (event, data) => {
  const message = JSON.stringify({ type: "request-tokenMove", data });

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(message);
    console.log("Mensagem enviada ao servidor:", message);
  } else {
    console.error("WebSocket não está conectado. Mensagem não enviada.");
  }
});
