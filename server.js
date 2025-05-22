const express = require("express");
const http = require("http");
const WebSocket = require("ws");

// Banco de dados em memória para armazenar cenários
const scenarios = {};

// Inicializar o aplicativo Express
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Lista de conexões WebSocket
const connections = new Set();
if (!scenarios[0]) { // Verifica se já existe para não sobrescrever em reinícios/reloads complexos
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
  console.log(scenarios[0])
  connections.add(ws);

  // Enviar todos os cenários para o cliente recém-conectado
  ws.send(JSON.stringify({ type: "syncAll", data: scenarios }));

  ws.on("message", (message) => {
    try {
      const { type, data } = JSON.parse(message);

      if (type === "updateScenario") {
        const { scenarioId, tokens, map } = data;

        // Atualiza o banco de dados em memória
        scenarios[scenarioId] = { tokens, map };
        console.log(`Cenário atualizado: ${scenarioId}`);

        // Faz broadcast para todos os clientes
        broadcast({
          type: "syncScenario",
          data: { scenarioId, tokens, map },
        });
      }

      if (type === "request-tokenMove") { // NOVO TIPO DE MENSAGEM
  const { tokenId, posX, posY ,sceneId} = data;

  console.log(sceneId +  "!=" + 0)
  if (scenarios[sceneId]) {
    const scenario = scenarios[sceneId];
    const tokenIndex = scenario.tokens.findIndex(token => token.id === tokenId);
    console.log(tokenIndex)
    if (tokenIndex !== -1) {
      // Atualiza o token no array
      scenario.tokens[tokenIndex].posx = posX;
      scenario.tokens[tokenIndex].posy = posY;
      
      // Faz broadcast do cenário ATUALIZADO para todos os clientes
      broadcast({
        type: "SyncTokenPosition", // Ou um novo tipo como "tokenUpdated"
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
      // Cliente pediu para enviar todos os cenários atuais só pra ele
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

// Função para enviar mensagem a todos os clientes conectados
function broadcast(message) {

  for (const ws of connections) {
    if (ws.readyState === WebSocket.OPEN) {
      console.log("broadcasting: ",JSON.stringify(message))
      ws.send(JSON.stringify(message));
    }
  }
}
const intervalo = setInterval(minhaFuncao, 3000);

setTimeout(() => {
    clearInterval(intervalo);
    console.log("Timer parado.");
}, 30000);
function minhaFuncao() {
          broadcast({
        type: "SyncTokenPosition", // Ou um novo tipo como "tokenUpdated"
        data: {
          id: 1,
          x: Math.floor(Math.random() * 5),
          y:Math.floor(Math.random() * 5)
        
        },
      });
    console.log("Testando..");
}
// Servidor Express ouvindo na porta 5000
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
