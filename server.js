const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const fs = require('fs');
const path = require('path');

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

// NOVO: Adicione as referências aos manifestos de assets, pois o servidor precisará delas
// Assumindo que os manifestos estão no mesmo diretório do server.js ou em um local acessível
const tokenManifestPath = path.join(__dirname, 'tokens.json');
const mapManifestPath = path.join(__dirname, 'maps.json');

// Banco de dados em memória para armazenar o CENÁRIO ATIVO.
// server.js agora também terá uma conexão com o DB.
let activeScenario = null;
let db; // Objeto do banco de dados para o server.js

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
// MUDANÇA: Agora usa sqlite3 e open para Promises
async function initializeDatabaseServer() {
  try {
    db = await open({
      filename: path.join(__dirname, 'characters.db'), // Assumindo que o DB está na mesma pasta do server.js
      driver: sqlite3.Database
    });
    console.log('[Server Process] Banco de dados SQLite conectado.');

    // Opcional: Carregar um cenário padrão/ativo do DB ao iniciar o servidor
    // Para simplificar, não faremos isso aqui, o main.js ainda enviará o cenário ativo.
    // Mas esta função estaria disponível se o server precisasse buscar dados.

  } catch (error) {
    console.error("[Server Process] Erro ao inicializar o banco de dados no servidor:", error);
    // Não saímos, mas o DB não estará disponível
  }
}

// NOVO: Função para carregar um cenário diretamente pelo server
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

// Carregar o histórico ao iniciar o servidor
loadChatHistory();
// Inicializar o banco de dados para o server.js
initializeDatabaseServer();

// Lista de conexões WebSocket
const connections = new Map(); // NOVO: Mapeia userId para a conexão WebSocket
const ipToUserMap = new Map();
// ADICIONE ESTAS FUNÇÕES:
async function sendToUser(targetUserId, message) {
    const wsClient = connections.get(targetUserId); // connections map é string para ws
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
    // Use a função broadcast existente para enviar para todos
    broadcast({ type: "connected-users-list", data: connectedUserIds });
}

// Quando um cliente se conecta via WebSocket
wss.on("connection", async (ws) => { // Tornar a função assíncrona se for usar await
  console.log("Novo cliente conectado.");

  // Enviar o cenário ativo atual para o cliente recém-conectado
  if (activeScenario) {
      ws.send(JSON.stringify({ type: "syncActiveScenario", data: activeScenario }));
      console.log("Cenário ativo enviado para o novo cliente.");
  }

  ws.on("message", async (message) => { // Tornar a função assíncrona
    try {
      const { type, data } = JSON.parse(message);
      
      if (type === "send-message") {
          chatHistory.push(data);
          if (chatHistory.length > MAX_CHAT_HISTORY) {
              chatHistory.shift();
          }
          saveChatHistory(); // Salva o histórico após adicionar uma nova mensagem
          console.log(`Mensagem adicionada ao histórico. Total: ${chatHistory.length}`);
          broadcast(data); // Continua fazendo broadcast de novas mensagens
      }
if (type === "login-request") {
        const { username, password } = data;
        console.log(`[Server] Tentativa de login para usuário: ${username}`);

        // Obtém o endereço IP da conexão.
        // ws._socket.remoteAddress pode retornar IPv6 com prefixo, então normalizamos para IPv4 se necessário.
        const remoteAddress = ws._socket.remoteAddress.replace('::ffff:', '');
        ws.remoteAddress = remoteAddress; // Armazena o IP na própria conexão WebSocket

        try {
            const player = await db.get('SELECT id FROM players WHERE user = ? AND password = ?', [username, password]);

            if (player) {
                const newUserId = player.id;

                // NOVO: Lógica para verificar e sobrescrever IP
                const existingUserIdForIp = ipToUserMap.get(remoteAddress);

                if (existingUserIdForIp && existingUserIdForIp !== newUserId) {
                    // Se o IP já está mapeado para um usuário DIFERENTE
                    console.log(`[Server] IP ${remoteAddress} já está em uso pelo Usuário ID ${existingUserIdForIp}. Desconectando o usuário anterior.`);

                    const existingWs = connections.get(existingUserIdForIp);
                    if (existingWs && existingWs.readyState === WebSocket.OPEN) {
                        existingWs.send(JSON.stringify({ type: "force-disconnect", message: "Outro usuário logou com o mesmo IP." }));
                        existingWs.close(1000, "IP em uso por outra sessão."); // Fecha a conexão anterior
                    }
                    connections.delete(existingUserIdForIp); // Remove o usuário anterior do mapa de conexões
                    // Não precisamos remover do ipToUserMap aqui, pois ele será sobrescrito logo abaixo
                } else if (existingUserIdForIp === newUserId) {
                    // Se o mesmo usuário está tentando logar do mesmo IP novamente
                    console.log(`[Server] Usuário ${newUserId} logou novamente do mesmo IP ${remoteAddress}.`);
                    const existingWs = connections.get(newUserId);
                    if (existingWs && existingWs.readyState === WebSocket.OPEN && existingWs !== ws) {
                        // Se houver uma conexão anterior para o MESMO usuário no MESMO IP (e não é a mesma WS)
                        existingWs.send(JSON.stringify({ type: "force-disconnect", message: "Nova sessão iniciada para sua conta." }));
                        existingWs.close(1000, "Nova sessão iniciada.");
                    }
                    connections.delete(newUserId); // Remove a conexão antiga do mesmo usuário
                }

                // Associa o novo usuário ao IP e à conexão WebSocket
                ipToUserMap.set(remoteAddress, newUserId);
                ws.userId = newUserId; // Armazena o userId na própria conexão WebSocket
                connections.set(newUserId, ws); // Mapeia userId para a conexão WebSocket

                console.log(`[Server] Login bem-sucedido para o usuário ${username}, ID: ${newUserId}. Conexão mapeada.`);
                ws.send(JSON.stringify({ type: "login-response", success: true, userId: newUserId }));
                broadcastConnectedUsers(); // Broadcasta a lista atualizada de usuários conectados

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
     
                console.log("SCENARIO: "+activeScenario)
        console.log("Cenário ativo recebido do main.js e atualizado no servidor.");
              broadcast({
          type: "syncActiveScenario",
          data: activeScenario,
        })
    
          }
if (type === "play-audio-command") { // Tipo unificado para play
    const { audioUrl, volume, loop, targetUserId } = data; // targetUserId já é number

    console.log(`[Server] Recebida requisição para tocar áudio. URL: ${audioUrl}, Target: ${targetUserId}`);

    // Cria o payload a ser enviado para os clientes
    const audioPayload = {
        audioUrl,
        volume,
        loop,
        targetUserId // Já é o número correto (-1 ou ID do jogador)
    };

    if (targetUserId === -1) { // -1 significa "all"
        broadcast({ type: "play-audio", data: audioPayload }); // Envia o comando "play-audio" para o frontend de TODOS os clientes
    } else {
        sendToUser(targetUserId, { type: "play-audio", data: audioPayload }); // Envia para o frontend do CLIENTE ESPECÍFICO
    }
}
if (type === "stop-audio-command") { // Tipo unificado para stop
    const { targetUserId } = data; // targetUserId já é number

    console.log(`[Server] Recebida requisição para parar áudio. Target: ${targetUserId}`);

    const stopPayload = {
        targetUserId // Já é o número correto (-1 ou ID do jogador)
    };

    if (targetUserId === -1) { // -1 significa "all"
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
          ws.send(JSON.stringify({ // Envia APENAS para o 'ws' que fez a requisição
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
          // Opcional: Enviar uma mensagem vazia ou de "histórico vazio"
          ws.send(JSON.stringify({ type: "chat-history", data: [] }));
        }
      }

      // NOVO: Recebe o cenário completo do main.js (ainda a forma preferencial)
      if (type === "setActiveScenario") {
        activeScenario = data; // Armazena o cenário recebido

        // Broadcast o cenário completo para todos os clientes
        broadcast({
          type: "syncActiveScenario",
          data: activeScenario,
        });
      }
      
      // NOVO: Exemplo de como o SERVER poderia ser instruído a carregar um cenário do seu DB
      // Isso seria acionado, por exemplo, por um botão "Carregar Cenário no Servidor" no GM.
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
          // Opcional: Enviar feedback ao cliente que requisitou
        }
      }


      // Modificado: Atualiza apenas a posição do token no cenário ativo em memória
      if (type === "request-tokenMove") {
        const { tokenId, posX, posY, sceneId } = data; // sceneId pode ser ignorado se só tivermos 1 cenário ativo
        console.log("All tokens: "+activeScenario.tokens)
        if (activeScenario && activeScenario.tokens) {
          const tokenIndex = activeScenario.tokens.findIndex(token => token.id === tokenId);
          if (tokenIndex !== -1) {
            activeScenario.tokens[tokenIndex].x = posX; // Assumindo 'x' e 'y' para posição
            activeScenario.tokens[tokenIndex].y = posY;
            
            console.log(`Token ${tokenId} movido para (${posX}, ${posY}) no cenário ativo.`);
            // Broadcast a atualização de posição específica
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
        // Envia o cenário ativo APENAS para o 'ws' que fez a requisição
        ws.send(JSON.stringify({ type: "sendActiveScenarioToRequester", data: activeScenario }));
        console.log("[Server] Cenário ativo enviado exclusivamente para o cliente requisitante.");
    } else {
        // Opcional: Enviar uma mensagem de que não há cenário ativo
        ws.send(JSON.stringify({ type: "sendActiveScenarioToRequester", data: null }));
        console.log("[Server] NENHUM cenário ativo para enviar ao cliente requisitante.");
    }
}
      if (type === "requestRefresh") {
        if (activeScenario) {
          ws.send(JSON.stringify({ type: "syncActiveScenario", data: activeScenario }));
          console.log("Cenário ativo enviado para o cliente solicitante (refresh).");
        } else {
          ws.send(JSON.stringify({ type: "syncActiveScenario", data: null })); // Ou um cenário vazio
        }
      }
    } catch (err) {
      console.error("Erro ao processar mensagem:", err);
    }
  });

 ws.on("close", () => {
        console.log("Cliente desconectado.");
        if (ws.userId) { // Verifica se o userId foi definido (ou seja, se o usuário estava logado)
            connections.delete(ws.userId); // Remove a conexão do Map
            console.log(`[Server] Usuário ${ws.userId} removido das conexões ativas.`);
            broadcastConnectedUsers(); // NOVO: Broadcasta a lista atualizada de usuários conectados
        }
    });
});

async function broadcast(message) {
    console.log("Broadcasting!");
    // Itera sobre os valores (conexões WebSocket) do Map
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