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
const connections = new Set();

// Quando um cliente se conecta via WebSocket
wss.on("connection", async (ws) => { // Tornar a função assíncrona se for usar await
  console.log("Novo cliente conectado.");
  connections.add(ws);

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
      
      if (type === "sync-scenario") {
        activeScenario = await loadScenarioFromServer(data)
     
                console.log("SCENARIO: "+activeScenario)
        console.log("Cenário ativo recebido do main.js e atualizado no servidor.");
              broadcast({
          type: "syncActiveScenario",
          data: activeScenario,
        })
    
          }
      
      // Manipula a requisição de histórico de um cliente específico
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
    connections.delete(ws);
    // MUDANÇA: Fechar o DB ao fechar o servidor, se for necessário.
    // Normalmente, você fecharia o DB quando o processo 'server.js' é encerrado.
    // if (db) {
    //   db.close();
    //   console.log('[Server Process] Banco de dados SQLite fechado.');
    // }
  });
});

async function broadcast(message) {
  console.log("Broadcasting!")
  for (const ws of connections) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}

// Servidor Express ouvindo na porta 5000
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://26.37.35.114:${PORT}`);
});