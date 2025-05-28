const { app, BrowserWindow, ipcMain } = require("electron");
const WebSocket = require("ws");
const url = require('url')
const path = require('path')
const sqlite3 = require('sqlite3').verbose();

let MainWindow;
let ws;
let db; // Declare db globally so it can be accessed in all ipcMain handlers

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
            nodeIntegration:false,
            preload: path.join(__dirname,'preload.js')
        }
    });

    const startUrl = url.format({
        pathname:path.join(__dirname,'./app/build/index.html'),
        protocol:'file'
    })
    MainWindow.loadURL('http://localhost:3000')
}

app.whenReady().then(()=>{

 db = new sqlite3.Database(path.join(app.getPath('userData'), 'actions.db'), (err) => {
        if (err) {
            console.error('Erro ao abrir o banco de dados:', err.message);
        } else {
            console.log('Conectado ao banco de dados SQLite.');
            db.run(`CREATE TABLE IF NOT EXISTS actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                mainType TEXT NOT NULL,
                effectCategory TEXT NOT NULL,
                isFavorite INTEGER,
                damageDice TEXT,
                damageType TEXT,
                healingDice TEXT,
                utilityTitle TEXT,
                utilityValue TEXT,
                attackRange TEXT,
                target TEXT,
                properties TEXT, -- Armazene como string JSON ou string separada por vírgulas
                level INTEGER,
                castingTime TEXT,
                duration TEXT,
                saveDC TEXT,
                school TEXT
            )`, (err) => {
                if (err) {
                    console.error('Erro ao criar a tabela:', err.message);
                } else {
                    console.log('Tabela "actions" verificada/criada.');
                }
            });
        }
    });



  createMainWindow();
    startWebSocket();
});


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
    // Fecha o banco de dados quando o aplicativo é fechado
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('Erro ao fechar o banco de dados:', err.message);
            } else {
                console.log('Conexão com o banco de dados fechada.');
            }
        });
    }
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

// Handler para buscar todas as ações
ipcMain.handle('get-all-actions', async () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM actions", (err, rows) => {
            if (err) {
                reject(err.message);
            } else {
                // Parse properties if they are stored as JSON strings
                const actions = rows.map(row => ({
                    ...row,
                    isFavorite: row.isFavorite === 1, // Convert 0/1 back to boolean
                    properties: row.properties ? JSON.parse(row.properties) : undefined
                }));
                resolve(actions);
            }
        });
    });
});

ipcMain.handle('add-action', async (event, actionData) => {
    return new Promise((resolve, reject) => {
        const {
            name, description, mainType, effectCategory, isFavorite, damageDice,
            damageType, healingDice, utilityTitle, utilityValue, attackRange,
            target, properties, level, castingTime, duration, saveDC, school
        } = actionData;

        // SQLite AUTOINCREMENT cuidará do ID
        const sql = `INSERT INTO actions (
            name, description, mainType, effectCategory, isFavorite, damageDice,
            damageType, healingDice, utilityTitle, utilityValue, attackRange,
            target, properties, level, castingTime, duration, saveDC, school
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const params = [
            name, description, mainType, effectCategory, isFavorite ? 1 : 0, damageDice,
            damageType, healingDice, utilityTitle, utilityValue, attackRange,
            target, properties ? JSON.stringify(properties) : null, // Salve arrays como JSON string
            level, castingTime, duration, saveDC, school
        ];

        db.run(sql, params, function (err) {
            if (err) {
                reject(err.message);
            } else {
                resolve({ id: this.lastID, ...actionData }); // Retorna a ação com o ID gerado pelo DB
            }
        });
    });
});
ipcMain.handle('update-action', async (event, actionId, actionData) => {
    return new Promise((resolve, reject) => {
        const {
            name, description, mainType, effectCategory, isFavorite, damageDice,
            damageType, healingDice, utilityTitle, utilityValue, attackRange,
            target, properties, level, castingTime, duration, saveDC, school
        } = actionData;

        const sql = `UPDATE actions SET
            name = ?,
            description = ?,
            mainType = ?,
            effectCategory = ?,
            isFavorite = ?,
            damageDice = ?,
            damageType = ?,
            healingDice = ?,
            utilityTitle = ?,
            utilityValue = ?,
            attackRange = ?,
            target = ?,
            properties = ?,
            level = ?,
            castingTime = ?,
            duration = ?,
            saveDC = ?,
            school = ?
            WHERE id = ?`;

        const params = [
            name, description, mainType, effectCategory, isFavorite ? 1 : 0, damageDice,
            damageType, healingDice, utilityTitle, utilityValue, attackRange,
            target, properties ? JSON.stringify(properties) : null,
            level, castingTime, duration, saveDC, school, actionId
        ];

        db.run(sql, params, function (err) {
            if (err) {
                reject(err.message);
            } else {
                resolve({ changes: this.changes, ...actionData, id: actionId }); // Retorna dados atualizados
            }
        });
    });
});
ipcMain.handle('delete-action', async (event, actionId) => {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM actions WHERE id = ?", actionId, function (err) {
            if (err) {
                reject(err.message);
            } else {
                resolve({ changes: this.changes });
            }
        });
    });
});
ipcMain.on("request-tokenMove", (event, data) => {
  const message = JSON.stringify({ type: "request-tokenMove", data });

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(message);
    console.log("Mensagem enviada ao servidor:", message);
  } else {
    console.error("WebSocket não está conectado. Mensagem não enviada.");
  }
});