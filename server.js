// server.js
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const fs = require('fs');
const path = require('path');

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

// Adicione as referências aos manifestos de assets
const tokenManifestPath = path.join(__dirname, 'tokens.json');
const mapManifestPath = path.join(__dirname, 'maps.json');
const audioManifestPath = path.join(__dirname, 'audio.json');
const ASSETS_AUDIO_PATH = path.join(__dirname, 'assets', 'audios');

// Banco de dados em memória para armazenar o CENÁRIO ATIVO.
let activeScenario = null;
let db; // Objeto do banco de dados para o server.js

// NOVO: Estados para a iniciativa de combate
let initiativeState = {
    combatants: [],
    allies: [],
    enemies: [],
    currentTurnIndex: 0
};

// Caminho para o arquivo de histórico de chat JSON
const CHAT_HISTORY_FILE = path.join(__dirname, 'chatHistory.json');

// Histórico de chat em memória
let chatHistory = [];
const MAX_CHAT_HISTORY = 50;

// Função para carregar o histórico do chat do arquivo JSON
function loadChatHistory() {
    try {
        if (fs.existsSync(CHAT_HISTORY_FILE)) {
            const data = fs.readFileSync(CHAT_HISTORY_FILE, 'utf8');
            chatHistory = JSON.parse(data);
            console.log(`Histórico de chat carregado do ${CHAT_HISTORY_FILE}. Total: ${chatHistory.length} mensagens.`);
        }
    } catch (error) {
        console.error("Erro ao carregar histórico de chat:", error);
        chatHistory = []; // Redefine para vazio em caso de erro
    }
}

// Função para salvar o histórico do chat no arquivo JSON
function saveChatHistory() {
    try {
        fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(chatHistory, null, 2), 'utf8');
        console.log(`Histórico de chat salvo em ${CHAT_HISTORY_FILE}.`);
    } catch (error) {
        console.error("Erro ao salvar histórico de chat:", error);
    }
}

// Função para inicializar o banco de dados no servidor
async function initializeDatabaseServer() {
  try {
    db = await open({
      filename: path.join(__dirname, 'characters.db'),
      driver: sqlite3.Database
    });
    console.log('[Server Process] Banco de dados SQLite conectado.');
  } catch (error) {
    console.error("[Server Process] Erro ao inicializar o banco de dados no servidor:", error);
  }
}

// Função para carregar um cenário diretamente pelo server
async function loadScenarioFromServer(scenarioId) {
  if (!db) {
    console.error("[Server Process] Banco de dados não está conectado para carregar cenário.");
    return null;
  }
  try {
    const scenarioRow = await db.get('SELECT * FROM scenarios WHERE id = ?', scenarioId);
    if (!scenarioRow) return null;

    const mapsManifest = JSON.parse(fs.readFileSync(mapManifestPath, 'utf8'));
    const tokensManifest = JSON.parse(fs.readFileSync(tokenManifestPath, 'utf8'));

    const mapAsset = mapsManifest.find(map => map.id === scenarioRow.map_asset_id);
    const mapImageUrl = mapAsset ? `data:${mapAsset.type};base64,${mapAsset.data}` : null;

    const savedTokens = JSON.parse(scenarioRow.tokens);
    const scenarioTokens = savedTokens.map(savedToken => {
      const tokenAsset = tokensManifest.find(t => t.id === savedToken.assetId);
      if (!tokenAsset) return null;
      return {
        ...savedToken,
        name: tokenAsset.name,
        image: `data:${tokenAsset.type};base64,${tokenAsset.data}`,
        portraitUrl: `data:${tokenAsset.type};base64,${tokenAsset.data}`
      };
    }).filter(t => t !== null);

    return {
      mapImageUrl: mapImageUrl,
      tokens: scenarioTokens,
      fogGrid: JSON.parse(scenarioRow.fog_of_war),
      scenarioId: scenarioRow.id,
    };
  } catch (error) {
    console.error("[Server Process] Erro ao carregar cenário no servidor:", error);
    return null;
  }
}

// Inicializar o aplicativo Express
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Rota para servir arquivos de áudio
app.use('/audio-assets', express.static(ASSETS_AUDIO_PATH));

app.get('/audio/:assetId', (req, res) => {
    const assetId = parseInt(req.params.assetId, 10);
    try {
        const audioManifest = JSON.parse(fs.readFileSync(audioManifestPath, 'utf8'));
        const audioAsset = audioManifest.find(a => a.id === assetId);

        if (audioAsset) {
            const filePath = path.join(ASSETS_AUDIO_PATH, audioAsset.name);
            if (fs.existsSync(filePath)) {
                res.setHeader('Content-Type', audioAsset.type);
                res.sendFile(filePath);
            } else {
                console.warn(`[Server] Arquivo de áudio não encontrado no disco para asset ID ${assetId}: ${filePath}`);
                const audioBuffer = Buffer.from(audioAsset.data, 'base64');
                res.setHeader('Content-Type', audioAsset.type);
                res.send(audioBuffer);
            }
        } else {
            res.status(404).send('Audio asset not found in manifest');
        }
    } catch (error) {
        console.error(`[Server] Erro ao servir arquivo de áudio para asset ID ${assetId}:`, error);
        res.status(500).send('Internal server error');
    }
});

// Carregar o histórico ao iniciar o servidor
loadChatHistory();
// Inicializar o banco de dados para o server.js
initializeDatabaseServer();

// Lista de conexões WebSocket
const connections = new Map();
const ipToUserMap = new Map();

async function sendToUser(targetUserId, message) {
    const wsClient = connections.get(targetUserId);
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
        console.log(`[Server] Enviando mensagem para o usuário ${targetUserId}:`, message);
        wsClient.send(JSON.stringify(message));
        return true;
    } else {
        console.warn(`[Server] Usuário ${targetUserId} não encontrado ou não conectado para enviar mensagem.`);
        return false;
    }
}

function getConnectedUsers() {
    return Array.from(connections.keys());
}

async function broadcastConnectedUsers() {
    const connectedUserIds = getConnectedUsers();
    console.log("[Server] Broadcastando lista de usuários conectados:", connectedUserIds);
    broadcast({ type: "connected-users-list", data: connectedUserIds });
}

// Função auxiliar para broadcast da iniciativa
function broadcastInitiativeState() {
    const message = JSON.stringify({
        type: 'initiative-sync',
        data: initiativeState
    });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}



// Quando um cliente se conecta via WebSocket
wss.on("connection", async (ws) => {
  console.log("Novo cliente conectado.");
  ws.send(JSON.stringify({
            type: 'initiative-sync',
            data: initiativeState
        }));
  // Enviar o cenário ativo atual para o cliente recém-conectado
  if (activeScenario) {
      ws.send(JSON.stringify({ type: "syncActiveScenario", data: activeScenario }));
      console.log("Cenário ativo enviado para o novo cliente.");
  }
  // NOVO: Enviar o estado de iniciativa atual para o cliente recém-conectado
  if (initiativeState.combatants.length > 0) {
      ws.send(JSON.stringify({ type: "initiative-sync", data: initiativeState }));
      console.log("Estado de iniciativa enviado para o novo cliente.");
  }


  ws.on("message", async (message) => {
    try {
      const { type, data } = JSON.parse(message);

      if (type === "send-message") {
          chatHistory.push(data);
          if (chatHistory.length > MAX_CHAT_HISTORY) {
              chatHistory.shift();
          }
          saveChatHistory();
          console.log(`Mensagem adicionada ao histórico. Total: ${chatHistory.length}`);
          broadcast(data);
      }

            
      if (type === "login-request") {
        const { username, password } = data;
        console.log(`[Server] Tentativa de login para usuário: ${username}`);

        const remoteAddress = ws._socket.remoteAddress.replace('::ffff:', '');
        ws.remoteAddress = remoteAddress;

        try {
            const player = await db.get('SELECT id FROM players WHERE user = ? AND password = ?', [username, password]);

            if (player) {
                const newUserId = player.id;

                const existingUserIdForIp = ipToUserMap.get(remoteAddress);

                if (existingUserIdForIp && existingUserIdForIp !== newUserId) {
                    console.log(`[Server] IP ${remoteAddress} já está em uso pelo Usuário ID ${existingUserIdForIp}. Desconectando o usuário anterior.`);
                    const existingWs = connections.get(existingUserIdForIp);
                    if (existingWs && existingWs.readyState === WebSocket.OPEN) {
                        existingWs.send(JSON.stringify({ type: "force-disconnect", message: "Outro usuário logou com o mesmo IP." }));
                        existingWs.close(1000, "IP em uso por outra sessão.");
                    }
                    connections.delete(existingUserIdForIp);
                } else if (existingUserIdForIp === newUserId) {
                    console.log(`[Server] Usuário ${newUserId} logou novamente do mesmo IP ${remoteAddress}.`);
                    const existingWs = connections.get(newUserId);
                    if (existingWs && existingWs.readyState === WebSocket.OPEN && existingWs !== ws) {
                        existingWs.send(JSON.stringify({ type: "force-disconnect", message: "Nova sessão iniciada para sua conta." }));
                        existingWs.close(1000, "Nova sessão iniciada.");
                    }
                    connections.delete(newUserId);
                }

                ipToUserMap.set(remoteAddress, newUserId);
                ws.userId = newUserId;
                connections.set(newUserId, ws);

                console.log(`[Server] Login bem-sucedido para o usuário ${username}, ID: ${newUserId}. Conexão mapeada.`);
                ws.send(JSON.stringify({ type: "login-response", success: true, userId: newUserId }));
                broadcastConnectedUsers();

            } else {
                console.log(`[Server] Falha no login para o usuário: ${username}`);
                ws.send(JSON.stringify({ type: "login-response", success: false, message: "Nome de usuário ou senha inválidos." }));
            }
        } catch (error) {
            console.error("[Server] Erro ao verificar credenciais no DB:", error);
            ws.send(JSON.stringify({ type: "login-response", success: false, message: "Erro interno do servidor ao tentar login." }));
        }
      }
      if (type === "sync-scenario") {
        activeScenario = await loadScenarioFromServer(data)
        console.log("Cenário ativo recebido do main.js e atualizado no servidor.");
        broadcast({
          type: "syncActiveScenario",
          data: activeScenario,
        })
      }
      if (type === "play-audio-command") {
          const { audioId, volume, loop, targetUserId } = data;
          console.log(`[Server] Recebida requisição para tocar áudio. ID: ${audioId}, Target: ${targetUserId}`);

          // Usar um IP real, ou uma configuração de ambiente
          const serverIp = "26.61.163.136";
          const audioDownloadUrl = `http://${serverIp}:5000/audio/${audioId}`;

          const audioPayload = {
              audioUrl: audioDownloadUrl,
              volume,
              loop,
              targetUserId
          };

          if (targetUserId === -1) {
              broadcast({ type: "play-audio", data: audioPayload });
          } else {
              sendToUser(targetUserId, { type: "play-audio", data: audioPayload });
          }
      }
      if (type === "stop-audio-command") {
          const { targetUserId } = data;

          console.log(`[Server] Recebida requisição para parar áudio. Target: ${targetUserId}`);

          const stopPayload = {
              targetUserId
          };

          if (targetUserId === -1) {
              broadcast({ type: "stop-audio", data: stopPayload });
          } else {
              sendToUser(targetUserId, { type: "stop-audio", data: stopPayload });
          }
      }
      if (type === "request-connected-users") {
        console.log("[Server] Requisição de lista de usuários conectados recebida.");
        ws.send(JSON.stringify({ type: "connected-users-list", data: getConnectedUsers() }));
      }
      if (type === "request-chat-history") {
        console.log("Requisição de histórico de chat recebida do cliente. Enviando para o cliente solicitante.");
        if (chatHistory.length > 0) {
          ws.send(JSON.stringify({
            type: "chat-history",
            data: chatHistory.map(msg => ({
              message: msg.message,
              id: msg.id,
              timestamp: msg.timestamp,
              senderName: msg.senderName,
              senderAvatar: msg.senderAvatar
            }))
          }));
        } else {
          ws.send(JSON.stringify({ type: "chat-history", data: [] }));
        }
      }
      if (type === "setActiveScenario") {
        activeScenario = data;
        broadcast({
          type: "syncActiveScenario",
          data: activeScenario,
        });
      }
      if (type === "serverLoadScenario") {
        const { scenarioId } = data;
        console.log(`[Server] Recebida requisição para carregar cenário ID: ${scenarioId}`);
        const loadedScenario = await loadScenarioFromServer(scenarioId);
        if (loadedScenario) {
          activeScenario = loadedScenario;
          broadcast({
            type: "syncActiveScenario",
            data: activeScenario,
          });
          console.log(`[Server] Cenário ${scenarioId} carregado e broadcastado.`);
        } else {
          console.warn(`[Server] Falha ao carregar cenário ${scenarioId}.`);
        }
      }
      if (type === "request-tokenMove") {
        const { tokenId, posX, posY, sceneId } = data;
        console.log("All tokens: "+activeScenario.tokens)
        if (activeScenario && activeScenario.tokens) {
          const tokenIndex = activeScenario.tokens.findIndex(token => token.id === tokenId);
          if (tokenIndex !== -1) {
            activeScenario.tokens[tokenIndex].x = posX;
            activeScenario.tokens[tokenIndex].y = posY;
            console.log(`Token ${tokenId} movido para (${posX}, ${posY}) no cenário ativo.`);
            broadcast({
              type: "SyncTokenPosition",
              data: {
                id: tokenId,
                x: posX,
                y: posY
              },
            });
          } else {
            console.warn(`Token com ID ${tokenId} não encontrado no cenário ativo.`);
          }
        } else {
          console.warn(`Nenhum cenário ativo ou tokens no cenário para mover.`);
        }
      }
      if (type === "requestActiveScenario") {
          console.log("[Server] Recebida requisição de cenário ativo de um cliente.");
          if (activeScenario) {
              ws.send(JSON.stringify({ type: "sendActiveScenarioToRequester", data: activeScenario }));
              console.log("[Server] Cenário ativo enviado exclusivamente para o cliente requisitante.");
          } else {
              ws.send(JSON.stringify({ type: "sendActiveScenarioToRequester", data: null }));
              console.log("[Server] NENHUM cenário ativo para enviar ao cliente requisitante.");
          }
      }
      if (type === "requestRefresh") {
        if (activeScenario) {
          ws.send(JSON.stringify({ type: "syncActiveScenario", data: activeScenario }));
          console.log("Cenário ativo enviado para o cliente solicitante (refresh).");
        } else {
          ws.send(JSON.stringify({ type: "syncActiveScenario", data: null }));
        }
      }
  
        if (type === 'request-initiative') { // <--- NOVO TIPO DE REQUISIÇÃO
            console.log("Cliente solicitou estado da iniciativa.");
            // Envia o estado atual da iniciativa de volta para o cliente que solicitou
            ws.send(JSON.stringify({
                type: 'initiative-response', // <--- NOVO TIPO DE RESPOSTA
                data: initiativeState
            }));
        }
      if (type === "add-tokens-to-initiative-server") {
          const newTokens = data; // newTokens will be an array of token objects
          const existingTokenIds = new Set(initiativeState.combatants.map(c => c.id));
          const filteredNewTokens = newTokens.filter(newToken => !existingTokenIds.has(newToken.id));

          // Clear allies and enemies before repopulating to ensure they are always fresh
          // This is important if tokens can change type or be removed from combat
          // Alternatively, you could just add/remove from these lists when adding/removing from combatants
          // For simplicity and ensuring consistency, we'll rebuild them each time combatants are added.
          // If performance is critical with very large lists, consider incremental updates.
          initiativeState.allies = [];
          initiativeState.enemies = [];

          // Add new tokens to combatants and categorize them
          filteredNewTokens.forEach(newToken => {
              initiativeState.combatants.push(newToken); // Add to main combatants list

              // Determine if the token is an 'ally' (player character) or 'enemy' (NPC/monster)
              // Logic: If it has a playerId AND is explicitly marked as isPlayer: true, it's an ally.
              // Otherwise, it's an an enemy.
              // You'll need to ensure the 'data' sent from the client includes 'isPlayer'
              if (newToken.playerId && newToken.isPlayer) { // Assuming isPlayer is a boolean
                  initiativeState.allies.push(newToken);
              } else {
                  initiativeState.enemies.push(newToken);
              }
          });
                // Sort the main combatants list by initiative (decrescente) after adding
          initiativeState.combatants.sort((a, b) => b.initiative - a.initiative);

          // After updating combatants, also re-sort allies and enemies if their order matters,
          // or if they are just for display. If they are merely filtered views, re-filtering is fine.
          // For now, they're just populated, sorting them would mean another sort operation.
          // Usually, only `combatants` needs to be sorted for turn order.

          // Reseta o índice do turno se estiver fora dos limites ou se não houver combatentes
          if (initiativeState.combatants.length === 0) {
              initiativeState.currentTurnIndex = 0;
          } else if (initiativeState.currentTurnIndex >= initiativeState.combatants.length) {
              initiativeState.currentTurnIndex = initiativeState.combatants.length - 1;
          }
          console.log(`[Server] Tokens adicionados à iniciativa. Combatentes totais: ${initiativeState.combatants.length}`);
          console.log(`[Server] Aliados: ${initiativeState.allies.length}, Inimigos: ${initiativeState.enemies.length}`);
          
          broadcastInitiativeState(); // Broadcast o novo estado de iniciativa
      }

      // NOVO: Handler para avançar o turno
      if (type === "next-turn-server") {
          if (initiativeState.combatants.length > 0) {
              initiativeState.currentTurnIndex = (initiativeState.currentTurnIndex + 1) % initiativeState.combatants.length;
              broadcastInitiativeState(); // Broadcast o novo estado de iniciativa
              console.log(`[Server] Próximo turno. Índice: ${initiativeState.currentTurnIndex}`);
          }
      }

      // NOVO: Handler para retroceder o turno
      if (type === "previous-turn-server") {
          if (initiativeState.combatants.length > 0) {
              initiativeState.currentTurnIndex = (initiativeState.currentTurnIndex - 1 + initiativeState.combatants.length) % initiativeState.combatants.length;
              broadcastInitiativeState(); // Broadcast o novo estado de iniciativa
              console.log(`[Server] Turno anterior. Índice: ${initiativeState.currentTurnIndex}`);
          }
      }
 if (type === "request-initiative-state") {
          console.log("[Server] Recebida requisição de estado inicial da iniciativa.");
       
            console.log("\n--- [Server] initiativeState inicializado ---");
for (const [key, value] of Object.entries(initiativeState)) {
    console.log(`Key: ${key}, Value:`, value);
    if (Array.isArray(value)) {
        console.log(`  -- Items in ${key} array:`);
        if (value.length === 0) {
            console.log(`    (Array is empty)`);
        } else {
            value.forEach((item, index) => {
                console.log(`    [${index}]:`, item);
            });
        }
    }
}
console.log("-------------------------------------------\n");
          ws.send(JSON.stringify({
              type: 'initiative-sync', //
              data: initiativeState
          }));
      }
      // NOVO: Handler para atualizar o valor de iniciativa de um combatente
      if (type === "update-initiative-value-server") {
          const { tokenId, newValue } = data;
          const tokenIndex = initiativeState.combatants.findIndex(t => t.id === tokenId);
          if (tokenIndex !== -1) {
              initiativeState.combatants[tokenIndex].initiative = newValue;
              // Re-ordenar após a mudança de valor e broadcast
              initiativeState.combatants.sort((a, b) => b.initiative - a.initiative);
              broadcastInitiativeState();
              console.log(`[Server] Iniciativa do token ${tokenId} atualizada para ${newValue}. Reordenando.`);
          }
      }
    } catch (err) {
      console.error("Erro ao processar mensagem:", err);
    }
  });

  ws.on("close", () => {
        console.log("Cliente desconectado.");
        if (ws.userId) {
            connections.delete(ws.userId);
            console.log(`[Server] Usuário ${ws.userId} removido das conexões ativas.`);
            broadcastConnectedUsers();
        }
    });
});

async function broadcast(message) {
    console.log("Broadcasting!");
    for (const wsClient of connections.values()) {
        if (wsClient.readyState === WebSocket.OPEN) {
            wsClient.send(JSON.stringify(message));
        }
    }
}
// Servidor Express ouvindo na porta 5000
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://26.37.35.114:${PORT}`);
});