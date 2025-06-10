const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const fs = require('fs'); // Importar o módulo 'fs'
const path = require('path'); // Importar o módulo 'path'

// Banco de dados em memória para armazenar cenários
const scenarios = {};

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

// Inicializar o aplicativo Express
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Carregar o histórico ao iniciar o servidor
loadChatHistory();

// Lista de conexões WebSocket
const connections = new Set();
if (!scenarios[0]) {
  scenarios[0] = {
    tokens: [
      { id: 1, x: 0, y: 0, image: "0.png" },
        { id: 2, x: 5, y: 5, image: "0.png" }

    ],
    map: "3.jpeg"
  };
  console.log(`Cenário padrão "${0}" criado no servidor.`);
}
// Quando um cliente se conecta via WebSocket
wss.on("connection", (ws) => {
  console.log("Novo cliente conectado.");
  connections.add(ws);

  // Enviar todos os cenários para o cliente recém-conectado (isso pode continuar)
  ws.send(JSON.stringify({ type: "syncAll", data: scenarios }));

  ws.on("message", (message) => {
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

      if (type === "updateScenario") {
        const { scenarioId, tokens, map } = data;
        scenarios[scenarioId] = { tokens, map };
        console.log(`Cenário atualizado: ${scenarioId}`);
        broadcast({
          type: "syncScenario",
          data: { scenarioId, tokens, map },
        });
      }

      if (type === "request-tokenMove") {
        const { tokenId, posX, posY ,sceneId} = data;
        if (scenarios[sceneId]) {
          const scenario = scenarios[sceneId];
          const tokenIndex = scenario.tokens.findIndex(token => token.id === tokenId);
          if (tokenIndex !== -1) {
            scenario.tokens[tokenIndex].posx = posX;
            scenario.tokens[tokenIndex].posy = posY;
            broadcast({
              type: "SyncTokenPosition",
              data: {
                id: tokenId,
                x: posX,
                y:posY
              },
            });
          } else {
            console.warn(`Token com ID ${tokenId} não encontrado no cenário ${sceneId}.`);
          }
        } else {
          console.warn(`Cenário com ID ${sceneId} não encontrado.`);
        }
      }
    
      if (type === "requestRefresh") {
        ws.send(JSON.stringify({ type: "syncAll", data: scenarios }));
      }
    } catch (err) {
      console.error("Erro ao processar mensagem:", err);
    }
  });

  ws.on("close", () => {
    console.log("Cliente desconectado.");
    connections.delete(ws);
  });
});

function broadcast(message) {
  console.log("BROADCASTING!!!");
  for (const ws of connections) {
    if (ws.readyState === WebSocket.OPEN) {
      console.log("broadcasting: ",JSON.stringify(message));
      ws.send(JSON.stringify(message));
    }
  }
}

// Servidor Express ouvindo na porta 5000
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://26.37.35.114:${PORT}`);
});