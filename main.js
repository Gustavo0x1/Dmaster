
const sharp = require('sharp');
const { app, BrowserWindow, ipcMain, dialog, protocol, session, Notification } = require("electron");
const helmet = require('helmet');
const WebSocket = require("ws");
const url = require('url');
const fs = require('fs');
const express = require('express');
const app2 = express();

const path = require('path');
const Database = require('better-sqlite3');
const DB_PATH = path.join(__dirname, 'characters.db');
const MAX_MAP_DIMENSION = 2048;
let MainWindow;
let ws;
let db;
let USERID; // <-- AGORA É UMA ÚNICA VARIÁVEL GLOBAL PARA O USERID NO MAIN PROCESS

const assetsPath = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsPath)) {
  fs.mkdirSync(assetsPath, { recursive: true });
}

function initializeAssetManifest(assetType) {
  const manifestPath = path.join(__dirname, `${assetType}.json`);
  if (!fs.existsSync(manifestPath)) {
    fs.writeFileSync(manifestPath, JSON.stringify([]));
  }
  return manifestPath;
}

const tokenManifestPath = initializeAssetManifest('tokens');
const mapManifestPath = initializeAssetManifest('maps');
const audioManifestPath = initializeAssetManifest('audio'); // Manter esta linha

// Mock database for demonstration. In a real app, this would be a database call.
const defaultCharacterData = {
  // Dados para a tabela 'characters'
  bioFields: {
    history: "Um herói misterioso, forjado na chama da aventura, com um passado ainda a ser desvendado.",
    appearance: "Alto e esguio, com cabelos escuros e olhos penetrantes que denotam sabedoria.",
    personality: "Determinado e corajoso, mas com um toque de melancolia. Leal aos seus aliados.",
    treasure: "Uma velha espada enferrujada (mas confiável), um punhado de moedas de cobre e um diário de viagens empoeirado."
  },
  essentialAttributes: {
    armor: 14,
    initiative: 'dex', // Exemplo: iniciativa baseada em Destreza
    proficiency: '+2', // Exemplo: bônus de proficiência
    speed: '30ft',
  },
  // MaxHp, CurrentHp, TempHp, Shield, Race, Class, SubClass, Level, XP, PLAYERNAME, CHARNAME
  MaxHp: 80,
  CurrentHp: 60,
  TempHp: 0,
  Shield: 0,
  Race: "Humano",
  Class: "Guerreiro",
  SubClass: "Nenhum",
  Level: 5,
  XP: 1250,
  // PLAYERNAME: "Mestre", // PLAYERNAME não está na tabela characters fornecida, remova ou ignore
  CHARNAME: "Herói Desconhecido",
  // PLayer_ID: 1, // Definir um ID padrão para o personagem inicial se necessário no DB
                     // O valor real será preenchido dinamicamente na initializeDatabase

  // Dados para a tabela 'character_attributes'
  myCharacterAttributes: [
    { id: 1, name: 'Força', value: 16, modifier: 3 }, // (16-10)/2 = 3
    { id: 2, name: 'Destreza', value: 14, modifier: 2 }, // (14-10)/2 = 2
    { id: 3, name: 'Constituição', value: 15, modifier: 2 }, // (15-10)/2 = 2.5 -> 2
    { id: 4, name: 'Inteligência', value: 12, modifier: 1 }, // (12-10)/2 = 1
    { id: 5, name: 'Sabedoria', value: 10, modifier: 0 }, // (10-10)/2 = 0
    { id: 6, name: 'Carisma', value: 8, modifier: -1 }, // (8-10)/2 = -1
  ],

  // Dados para a tabela 'character_skills'
  mySkills: [
    { name: 'Acrobacia', modifier: 'dex' },
    { name: 'Arcanismo', modifier: 'int' },
    { name: 'Atletismo', modifier: 'str' },
    { name: 'Atuação', modifier: 'car' },
    { name: 'Enganação', modifier: 'car' },
    { name: 'Furtividade', modifier: 'dex' },
    { name: 'Intimidação', modifier: 'car' },
    { name: 'Intuição', modifier: 'sab' },
    { name: 'Investigação', modifier: 'int' },
    { name: 'Medicina', modifier: 'sab' },
    { name: 'Natureza', modifier: 'int' },
    { name: 'Percepção', modifier: 'sab' },
    { name: 'Persuasão', modifier: 'car' },
    { name: 'Prestidigitação', modifier: 'dex' },
    { name: 'Religião', modifier: 'int' },
    { name: 'Sobrevivência', modifier: 'sab' },
  ],

  // Dados para a tabela 'character_actions'
  actions: [
    {
      // id não é passado, o DB vai auto-incrementar
      name: 'Ataque de Espada Longa',
      mainType: 'attack',
      effectCategory: 'damage',
      attackRange: 'Corpo a corpo',
      target: 'Uma criatura',
      damageDice: '1d8',
      damageType: 'Cortante',
      properties: ['Versátil (1d10)'],
      description: 'Um golpe padrão com sua espada longa.',
      isFavorite: true,
    },
    {
      name: 'Cura Leve de Ferimentos',
      mainType: 'spell',
      effectCategory: 'healing',
      castingTime: '1 Ação',
      duration: 'Instantânea',
      healingDice: '1d8 + modificador de Sabedoria',
      school: 'Evocação',
      description: 'Uma explosão de energia positiva que cura um alvo.',
      isFavorite: false,
    },
    {
      name: 'Inspiração Bárdica',
      mainType: 'utility',
      effectCategory: 'utility',
      utilityTitle: 'Bônus de Inspiração',
      utilityValue: '1d6',
      castingTime: '1 Ação Bônus',
      duration: '10 minutos',
      description: 'Você inspira uma criatura, que pode adicionar um d6 a um teste de atributo, ataque ou resistência.',
      isFavorite: false,
    },
  ]
};

function initializeDatabase() {
  try {
    db = new Database(DB_PATH, { verbose: console.log });


    // Criação das tabelas se não existirem
    // A tabela 'characters' usa INTEGER PRIMARY KEY AUTOINCREMENT para o id
db.exec(`
  CREATE TABLE IF NOT EXISTS scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    map_asset_id INTEGER,
    tokens TEXT,
    fog_of_war TEXT
  );
`);
    // MANTER ESTA ESTRUTURA, POIS VOCÊ CONFIRMOU QUE PLayer_ID JÁ EXISTE
    db.exec(`
      CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bioFields TEXT,
        essentialAttributes TEXT,
        MaxHp INTEGER,
        CurrentHp INTEGER,
        TempHp INTEGER,
        Shield INTEGER,
        Race TEXT,
        Class TEXT,
        SubClass TEXT,
        Level INTEGER,
        XP INTEGER,
        PLayer_ID INTEGER, -- ESTA COLUNA JÁ EXISTE NO SEU DB
        Token_image BLOB,
        CHARNAME TEXT
      );
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS character_attributes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER,
        name TEXT,
        value INTEGER,
        modifier INTEGER,
        FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
      );
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS character_skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER,
        name TEXT,
        modifier TEXT,
        FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
      );
    `);
        db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        user TEXT,
        password TEXT
      );
    `);
    // A tabela 'character_actions' agora usa INTEGER PRIMARY KEY AUTOINCREMENT para o id
    db.exec(`
      CREATE TABLE IF NOT EXISTS character_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER, -- Chave estrangeira referenciando o ID INTEGER da tabela characters
        name TEXT,
        mainType TEXT,
        effectCategory TEXT,
        attackRange TEXT,
        target TEXT,
        damageDice TEXT,
        damageType TEXT,
        healingDice TEXT,
        utilityTitle TEXT,
        utilityValue TEXT,
        properties TEXT,
        level INTEGER,
        castingTime TEXT,
        duration TEXT,
        school TEXT,
        saveDC TEXT,
        description TEXT,
        isFavorite INTEGER,
        FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
      );
    `);
        const insertPlayer = db.prepare(`INSERT INTO players (user, password) VALUES (?, ?)`);

    // --- Lógica para adicionar um personagem padrão se o DB estiver vazio ---
    const count = db.prepare('SELECT COUNT(*) FROM characters').get();
    if (count['COUNT(*)'] === 0) {
      console.log('[Main Process] Banco de dados vazio. Inserindo personagem padrão "Herói Desconhecido".');

      // Garantir que o 'admin' exista com ID 1, para vincular o personagem padrão
      let defaultPlayerId = 1;
      const playerExists = db.prepare('SELECT id FROM players WHERE user = ?').get('admin');
      if (!playerExists) {
     
          defaultPlayerId = playerInfo.lastInsertRowid;
          console.log(`[Main Process] Jogador padrão 'admin' inserido com ID: ${defaultPlayerId}`);
      } else {
          defaultPlayerId = playerExists.id;
          console.log(`[Main Process] Jogador padrão 'admin' já existe com ID: ${defaultPlayerId}`);
      }

      // Inserir o personagem principal e capturar o ID gerado automaticamente
      // Preenchendo todos os campos, incluindo o PLayer_ID
      const insertCharacterStmt = db.prepare(`
        INSERT INTO characters (
          bioFields, essentialAttributes, MaxHp, CurrentHp, TempHp, Shield,
          Race, Class, SubClass, Level, XP, PLayer_ID, Token_image, CHARNAME
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = insertCharacterStmt.run(
        JSON.stringify(defaultCharacterData.bioFields),
        JSON.stringify(defaultCharacterData.essentialAttributes),
        defaultCharacterData.MaxHp,
        defaultCharacterData.CurrentHp,
        defaultCharacterData.TempHp,
        defaultCharacterData.Shield,
        defaultCharacterData.Race,
        defaultCharacterData.Class,
        defaultCharacterData.SubClass,

        defaultCharacterData.Level,
        defaultCharacterData.XP,
        defaultPlayerId, // <<<< AGORA PREENCHE PLayer_ID
        defaultCharacterData.CHARNAME
      );
      const defaultCharacterDbId = info.lastInsertRowid; // Obtém o ID gerado

      // Agora use defaultCharacterDbId para as tabelas relacionadas
      // Inserir atributos
      const insertAttribute = db.prepare(`INSERT INTO character_attributes (character_id, name, value, modifier) VALUES (?, ?, ?, ?)`);
      defaultCharacterData.myCharacterAttributes.forEach(attr => {
        insertAttribute.run(defaultCharacterDbId, attr.name, attr.value, attr.modifier);
      });

      // Inserir habilidades
      const insertSkill = db.prepare(`INSERT INTO character_skills (character_id, name, modifier) VALUES (?, ?, ?)`);
      defaultCharacterData.mySkills.forEach(skill => {
        insertSkill.run(defaultCharacterDbId, skill.name, skill.modifier);
      });

      // Inserir ações
      const insertAction = db.prepare(`
        INSERT INTO character_actions (
            character_id, name, mainType, effectCategory, attackRange, target,
            damageDice, damageType, healingDice, utilityTitle, utilityValue,
            properties, level, castingTime, duration, school, saveDC, description, isFavorite
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      defaultCharacterData.actions.forEach(action => {
        insertAction.run(
          defaultCharacterDbId, action.name, action.mainType, action.effectCategory,
          action.attackRange || null, action.target || null, action.damageDice || null,
          action.damageType || null, action.healingDice || null, action.utilityTitle || null,
          action.utilityValue || null, JSON.stringify(action.properties || []),
          action.level || null, action.castingTime || null, action.duration || null,
          action.school || null, action.saveDC || null, action.description || null,
          action.isFavorite ? 1 : 0
        );
      });

      console.log(`[Main Process] Personagem padrão inserido com ID: ${defaultCharacterDbId} para Player ID: ${defaultPlayerId}`);
    }

  } catch (error) {
    console.error("[Main Process] Erro ao inicializar o banco de dados:", error);
    app.quit();
  }
}

// ... (startWebSocket, createMainWindow, app.whenReady, app.on('before-quit')) ...


ipcMain.handle('get-connected-users', async () => {
    return new Promise((resolve) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            const tempListener = (message) => {
                try {
                    const parsedMessage = JSON.parse(message);
                    if (parsedMessage.type === "connected-users-list") {
                        ws.off("message", tempListener);
                        // Convertendo os IDs de string para number para o frontend
                        const connectedIdsAsNumbers = parsedMessage.data.map(id => parseInt(id, 10));
                        resolve({ success: true, data: connectedIdsAsNumbers }); // Retorna numbers
                    }
                } catch (e) {
                    console.error("Erro ao parsear mensagem na get-connected-users:", e);
                }
            };
            ws.on("message", tempListener);
            ws.send(JSON.stringify({ type: "request-connected-users" }));
        } else {
            resolve({ success: false, message: "WebSocket não conectado." });
        }
    });
});
ipcMain.handle('send-audio-command', async (event, commandType, audioData) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        // audioData agora deve conter apenas o ID do áudio selecionado, não a URL completa
        // O frontend deve enviar apenas o ID do asset para cá.
        // Ex: audioData = { audioId: selectedAudio.id, volume: volume, loop: isMusic && loopMusic, targetUserId: targetUser }
        let messagePayload = { type: commandType, data: audioData };
        ws.send(JSON.stringify(messagePayload));
        console.log(`[Main Process] Comando de áudio '${commandType}' enviado ao servidor WebSocket. Target: ${audioData.targetUserId}`);
        return { success: true, message: "Comando de áudio enviado." };
    } else {
        console.error("[Main Process] WebSocket não está conectado. Comando de áudio não enviado.");
        return { success: false, message: "WebSocket não conectado." };
    }
});
ipcMain.handle('create-character', async (event, characterData) => {
  console.log(`[Main Process] Recebida requisição para criar personagem: ${characterData.CHARNAME} para Player ID: ${characterData.PLayer_ID}.`);
  try {
    const characterName = characterData.CHARNAME;
    const playerId = characterData.PLayer_ID;

    // Converte a imagem Base64 para Buffer se existir
    let tokenImageBuffer = null;
    if (characterData.Token_image && characterData.Token_image.startsWith('data:')) {
      const base64String = characterData.Token_image.split(',')[1];
      tokenImageBuffer = Buffer.from(base64String, 'base64');
    }

    const bioFields = characterData.bioFields || { history: "", appearance: "", personality: "", treasure: "" };
    const essentialAttributes = characterData.essentialAttributes || { armor: 10, initiative: 'dex', proficiency: '+2', speed: '30ft' };
    const myCharacterAttributes = characterData.myCharacterAttributes || [
      { id: 1, name: 'Força', value: 10, modifier: 0 }, { id: 2, name: 'Destreza', value: 10, modifier: 0 },
      { id: 3, name: 'Constituição', value: 10, modifier: 0 }, { id: 4, name: 'Inteligência', value: 10, modifier: 0 },
      { id: 5, name: 'Sabedoria', value: 10, modifier: 0 }, { id: 6, name: 'Carisma', value: 10, modifier: 0 },
    ];
    const mySkills = characterData.mySkills || [
      { name: 'Acrobacia', modifier: 'dex' }, { name: 'Arcanismo', modifier: 'int' },
      { name: 'Atletismo', modifier: 'str' }, { name: 'Atuação', modifier: 'car' },
      { name: 'Enganação', modifier: 'car' }, { name: 'Furtividade', modifier: 'dex' },
      { name: 'Intimidação', modifier: 'car' }, { name: 'Intuição', modifier: 'sab' },
      { name: 'Investigação', modifier: 'int' }, { name: 'Medicina', modifier: 'sab' },
      { name: 'Natureza', modifier: 'int' }, { name: 'Percepção', modifier: 'sab' },
      { name: 'Persuasão', modifier: 'car' }, { name: 'Prestidigitação', modifier: 'dex' },
      { name: 'Religião', modifier: 'int' }, { name: 'Sobrevivência', modifier: 'sab' },
    ];
    const actions = characterData.actions || [];

    const insertCharacterStmt = db.prepare(`
      INSERT INTO characters (
        bioFields, essentialAttributes, MaxHp, CurrentHp, TempHp, Shield,
        Race, Class, SubClass, Level, XP, PLayer_ID, Token_image, CHARNAME
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = insertCharacterStmt.run(
      JSON.stringify(bioFields),
      JSON.stringify(essentialAttributes),
      characterData.MaxHp || 10,
      characterData.CurrentHp || 10,
      characterData.TempHp || 0,
      characterData.Shield || 0,
      characterData.Race || "Sem raça",
      characterData.Class || "Sem classe",
      characterData.SubClass || "Sem subclasse",
      characterData.Level || 1,
      characterData.XP || 0,
      playerId,
      tokenImageBuffer, // Insere o Buffer da imagem
      characterName
    );

    const newCharacterId = info.lastInsertRowid;

    // ... (inserir atributos, habilidades, ações - sem mudanças) ...

    console.log(`[Main Process] Novo personagem '${characterName}' criado com ID: ${newCharacterId} e associado ao Player ID: ${playerId}.`);
    return { success: true, newCharacterId: newCharacterId, message: "Personagem criado com sucesso!" };

  } catch (error) {
    console.error(`[Main Process] Erro ao criar personagem:`, error);
    return { success: false, message: `Erro ao criar personagem: ${error.message}` };
  }
});

let loginPromiseResolve = null; // Variável para armazenar a função resolve da Promise de login

function startWebSocket() {
  ws = new WebSocket("ws://26.61.163.136:5000"); // Certifique-se de que este é o IP e porta CORRETOS do seu servidor!

  ws.on("open", () => {
    console.log("[Main Process] Conectado ao servidor WebSocket.");
    // Se houver uma requisição de login pendente no momento da conexão, envie-a
    if (loginPromiseResolve) {
      console.log("[Main Process] WebSocket reaberto, mas uma Promise de login já estava pendente. Isso pode indicar um problema de reconexão.");
      // Em um cenário de reconexão, você pode querer tentar reenviar a requisição de login
      // ou invalidar a Promise antiga para evitar que ela seja resolvida com dados antigos.
    }
  });

  ws.on("message", (message) => {

    try {
      const parsedMessage = JSON.parse(message); // Parseie a mensagem uma vez
      const { type, data } = parsedMessage;

      console.log(`[Main Process] Mensagem WebSocket recebida: Tipo = ${type}, Dados =`, data);

      if (!MainWindow) {
        console.warn("[Main Process] MainWindow ainda não está pronta para enviar mensagens.");
        // Continua processando mensagens que não dependem da MainWindow, como login-response
      }

   if (type === "remove-token-from-scenario") { // <--- ESTE `type` DEVE CORRESPONDER AO QUE O SERVIDOR BROADCASTA
        console.log("[Main Process] Recebida instrução do servidor para remover token:", data.tokenId, "do cenário:", data.scenarioId);
        if (MainWindow) MainWindow.webContents.send("remove-token-from-scenario-client", data.tokenId);
        return; // Consome a mensagem
    }

      if (type === "login-response") {
        console.log("[Main Process] Recebida resposta de login do servidor:", parsedMessage.success);
        if (parsedMessage.success) { // Se o login foi bem-sucedido
            USERID = parsedMessage.userId; // Define o USERID no main process
            if (MainWindow) {
                // Envia o USERID para o processo de renderização
                MainWindow.webContents.send('set-client-userid', USERID);
            }
        }
        if (loginPromiseResolve) {
          console.log("[Main Process] Resolvendo Promise de login com dados:", parsedMessage.userId);
          loginPromiseResolve(parsedMessage); // Resolve a Promise da IPC
          loginPromiseResolve = null; // Limpa a referência
        } else {
          console.warn("[Main Process] Resposta de login recebida, mas nenhuma Promise de login pendente.");
        }
        return; // Consome a mensagem de login
      }
if (type === "initiative-sync") {

 

    if (MainWindow) MainWindow.webContents.send("initiative-sync-from-server", data);
}


      if (type === "sendActiveScenarioToRequester") {
        console.log("[Main Process] Recebido cenário ativo exclusivo do servidor:", data);
        if (MainWindow) MainWindow.webContents.send("sendActiveScenarioToRequester", data);
        return;
      }
      if (type === "SyncTokenPosition") {
        if (MainWindow) MainWindow.webContents.send("SyncTokenPosition", data);
      }
      if (type === "syncActiveScenario") {
        console.log("[Main Process] Cenário ativo sincronizado:", data);
        if (MainWindow) MainWindow.webContents.send("syncActiveScenario", data);
      }
      if (type === "chat-history") {
        if (data && Array.isArray(data)) {
          console.log("[Main Process] Histórico de chat recebido. Enviando para o frontend.");
          if (MainWindow) MainWindow.webContents.send("chat-history", data);
        }
      }
      // --- CÓDIGO CRÍTICO PARA O CHAT: CORREÇÃO ---
      if (type === "chat-message") {
        // Agora, para o chat, o 'id' na mensagem é o remetente.
        // Se o remetente for o próprio usuário deste cliente, ignoramos o broadcast para evitar duplicidade.
        if (parsedMessage.id == USERID) { // Compara com o USERID global do main process
          console.log("[Main Process] Mensagem de chat própria, ignorando broadcast.");
          return;
        }
        if (MainWindow && MainWindow.webContents) {
          console.log("[Main Process] Nova mensagem de chat recebida. Enviando para o frontend.");
          MainWindow.webContents.send("new-chat-message", parsedMessage);
        } else {
          console.warn("[Main Process] MainWindow ou webContents não está pronto para mensagens de chat.");
        }
      }

      if (type === "syncAll") {
        console.log("[Main Process] Sincronização geral recebida. Enviando para o frontend.");
        if (MainWindow) MainWindow.webContents.send("sync-all", data);
      }

      // NOVOS HANDLERS PARA ÁUDIO DO SERVIDOR PARA O FRONTEND
if (type === "play-audio") { // Este é o tipo que o server.js envia para o cliente
    console.log("[Main Process] Recebida instrução de áudio do servidor. Enviando para o frontend.");
    if (MainWindow) MainWindow.webContents.send("play-audio-to-frontend", data);
}
if (type === "stop-audio") { // Este é o tipo que o server.js envia para o cliente
    console.log("[Main Process] Recebida instrução para parar áudio do servidor. Enviando para o frontend.");
    if (MainWindow) MainWindow.webContents.send("stop-audio-to-frontend", data);
}
if (type === "connected-users-list") {
    console.log("[Main Process] Lista de usuários conectados recebida do servidor. Enviando para o frontend.");
    // No main.js, é importante converter os IDs de string (que vêm do Map do servidor) para number
    // antes de enviar para o frontend, para que correspondam ao tipo esperado pelo TSX.
    const connectedIdsAsNumbers = data.map(id => parseInt(id, 10));
    if (MainWindow) MainWindow.webContents.send("connected-users-list-updated", connectedIdsAsNumbers); // Envia numbers
}


    } catch (err) {
      console.error("[Main Process] Erro ao processar mensagem do servidor:", err);
    }
  });


  ws.on("close", () => {
    console.log("[Main Process] Conexão WebSocket encerrada. Tentando reconectar em 5 segundos...");
    setTimeout(startWebSocket, 5000); // Reconnect após 5 segundos
  });

  ws.on("error", (error) => {
    console.error("[Main Process] Erro no WebSocket:", error);
  });
}
function createMainWindow(){

    MainWindow = new BrowserWindow({

        width:1280,
        height:720,
        backgroundColor:"#202020",
        resizable:false,
        autoHideMenuBar:true,
        webPreferences:{
            contextIsolation:true,
            nodeIntegration:true, // Embora nodeIntegration seja true aqui, contextIsolation é true, então o preload é a maneira segura.
      
            preload: path.join(__dirname,'preload.js')
        }
    });

    const startUrl = url.format({
        pathname:path.join(__dirname,'./app/build/index.html'),
        protocol:'file'
    })
    MainWindow.loadURL("http://localhost:3000") // Certifique-se de que este é o URL correto do seu React App
}

app.whenReady().then(()=>{
  
   session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
const csp = "default-src 'self'; " +
            "script-src 'self' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: file: asset:; " +
            "media-src 'self' data: blob: file: http://26.61.163.136:5000; " + // ALTERADO AQUI!
            "connect-src 'self' ws://26.61.163.136:5000;";
        callback({
                responseHeaders: {
                ...details.responseHeaders,
    'Content-Security-Policy': [csp]
            }
        });


    });
   // FIX 2: Corrigir a lógica do protocolo 'asset://' para usar o caminho correto

  createMainWindow();

  initializeDatabase();
  startWebSocket();
});


app.on('before-quit', () => {
  if (db) {
    db.close();
    console.log('[Main Process] Banco de dados SQLite fechado.');
  }
});
ipcMain.handle('get-all-characters-for-tokens', async () => {
  console.log(`[Main Process] Buscando todos os personagens para uso como tokens.`);
  try {
    // Seleciona id, CHARNAME, Token_image e PLayer_ID da tabela characters
    const characterRows = db.prepare('SELECT id, CHARNAME, Token_image, PLayer_ID FROM characters').all();

    const charactersWithImages = characterRows.map(row => {
        let tokenImageBase64 = null;
        if (row.Token_image) {
            // Converte o Buffer (BLOB) para Base64. Assumindo 'image/png' por padrão.
            // Se você armazena o mimeType, use-o aqui: `data:${row.Token_mimeType};base64,`
            tokenImageBase64 = `data:image/png;base64,${row.Token_image.toString('base64')}`;
        }
        return {
            id: row.id,
            name: row.CHARNAME, // Use 'name' to align with Token interface
            image: tokenImageBase64, // Use 'image' to align with Token interface
            portraitUrl: tokenImageBase64, // Use 'portraitUrl' for consistency if needed
            playerId: row.PLayer_ID,
            isPlayer: true,
            width: 1, // Default to 1x1 grid size
            height: 1, // Default to 1x1 grid size
            currentHp: 10,
            maxHp: 10,
            ac: 10,
            damageDealt: "1d4"
        };
    });

    return { success: true, data: charactersWithImages };
  } catch (error) {
    console.error(`[Main Process] Erro ao buscar todos os personagens para tokens:`, error);
    return { success: false, message: `Erro ao carregar personagens para tokens: ${error.message}` };
  }
});
ipcMain.handle('get-action-character-options', async () => {
  console.log(`[Main Process] Buscando IDs únicos de personagens com ações e seus nomes.`);
  try {
    // Primeiro, obtenha os character_id únicos da tabela character_actions
    const uniqueCharacterIdsRows = db.prepare('SELECT DISTINCT character_id FROM character_actions').all();

    // Extraia os IDs para uma array simples
    const uniqueCharacterIds = uniqueCharacterIdsRows.map(row => row.character_id);

    if (uniqueCharacterIds.length === 0) {
      return { success: true, data: [] }; // Nenhuma ação encontrada, retorna lista vazia
    }

    // Converta a array de IDs em uma string para a cláusula IN da SQL
    const placeholders = uniqueCharacterIds.map(() => '?').join(',');

    // Agora, selecione os nomes dos personagens com base nesses IDs
    const characterNamesRows = db.prepare(`SELECT id, CHARNAME FROM characters WHERE id IN (${placeholders})`).all(...uniqueCharacterIds);

    // Mapeie para o formato desejado { id: number, name: string }
    const characterOptions = characterNamesRows.map(row => ({
        id: row.id,
        name: row.CHARNAME
    }));

    return { success: true, data: characterOptions };
  } catch (error) {
    console.error(`[Main Process] Erro ao buscar opções de personagens com ações:`, error);
    return { success: false, message: `Erro ao carregar opções de personagens: ${error.message}` };
  }
});
ipcMain.on('request-initial-initiative-state', (event) => {
    console.log("[Main Process] Requisição de estado inicial da iniciativa recebida do frontend.");
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "request-initiative-state" })); //
        console.log("[Main Process] Enviando requisição de iniciativa para o server.js.");
    } else {
        console.warn("[Main Process] WebSocket não está aberto para requisitar iniciativa.");
        // Opcional: Enviar um estado vazio ou erro de volta para o frontend
        if (MainWindow) MainWindow.webContents.send("initiative-sync-from-server", { combatants: [], allies: [], enemies: [], currentTurnIndex: 0 });
    }
});

ipcMain.handle('request-current-initiative-state', async (event) => {
    // É crucial que o server.js ou alguma parte do backend
    // mantenha o estado da iniciativa e o torne acessível aqui.
    // Por exemplo, se `setupWebSocketServer` retornar um objeto com um getter para o estado:
    if (wssInstance && wssInstance.getInitiativeState) {
        const currentState = wssInstance.getInitiativeState();
        return { success: true, data: currentState };
    } else {
        console.warn("WebSocket server instance or getInitiativeState not available.");
        // Retorne um estado padrão ou vazio se o servidor ainda não estiver pronto
        return { success: false, message: "Initiative state not available." };
    }
});
ipcMain.handle('get-characters-by-player-id', async (event, playerId) => {
  console.log(`[Main Process] Buscando personagens para o Player ID: ${playerId}.`);
  try {
    // Seleciona id, CHARNAME e Token_image da tabela characters
    const characterRows = db.prepare('SELECT id, CHARNAME, Token_image FROM characters WHERE PLayer_ID = ?').all(playerId);

    const charactersWithImages = characterRows.map(row => {
        let tokenImageBase64 = null;
        if (row.Token_image) {
            // Converte o Buffer (BLOB) para Base64. Assumindo 'image/png' por padrão.
            // Se você armazena o mimeType, use-o aqui: `data:${row.Token_mimeType};base64,`
            tokenImageBase64 = `data:image/png;base64,${row.Token_image.toString('base64')}`;
        }
        return {
            id: row.id,
            CHARNAME: row.CHARNAME,
            Token_image: tokenImageBase64 // Retorna a imagem como Base64
        };
    });

    return { success: true, data: charactersWithImages };
  } catch (error) {
    console.error(`[Main Process] Erro ao buscar personagens por Player ID:`, error);
    return { success: false, message: `Erro ao carregar personagens: ${error.message}` };
  }
});
ipcMain.handle('request-initial-scenario', async (event) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    // Envia uma mensagem específica para o servidor solicitando o cenário ativo
    ws.send(JSON.stringify({ type: "requestActiveScenario" }));
    console.log("[Main Process] Frontend pronto. Solicitando cenário ativo do servidor.");
    // Não retorna nada aqui, a resposta virá via 'sendActiveScenarioToRequester'
    return { success: true };
  } else {
    console.error("[Main Process] Não foi possível solicitar o cenário inicial, WebSocket não está conectado.");
    return { success: false, message: "WebSocket não conectado." };
  }
});
// Adicione esta função auxiliar em seu main.js (por exemplo, após ensureTokenAssetExists, se você a manteve)
async function upsertTokenAssetToManifest(tokenBase64Image, tokenId, tokenName, tokenType = 'image/png') {
    const manifestPath = tokenManifestPath; // O caminho para seu tokens.json
    const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    const base64DataOnly = tokenBase64Image.split(',')[1];

    let existingAssetIndex = -1;
    // Tenta encontrar pelo ID do token se ele já tem um ID de asset associado
    // ou se já existe um asset com a mesma data (imagem)
    existingAssetIndex = manifestData.findIndex(asset => 
        (asset.id === tokenId) || (asset.data === base64DataOnly)
    );

    if (existingAssetIndex !== -1) {
        // ATUALIZAÇÃO: Se o asset já existe (pelo ID ou pela data)
        const existingAsset = manifestData[existingAssetIndex];
        // Atualiza apenas se houver alguma mudança relevante ou para garantir consistência
        if (existingAsset.data !== base64DataOnly || existingAsset.name !== tokenName || existingAsset.type !== tokenType) {
            manifestData[existingAssetIndex] = {
                id: existingAsset.id, // Mantém o ID existente
                name: tokenName || existingAsset.name, // Atualiza nome se fornecido
                type: tokenType || existingAsset.type, // Atualiza tipo se fornecido
                data: base64DataOnly // Garante que os dados da imagem estejam atualizados
            };
            fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), 'utf8');
            console.log(`[Main Process - Asset] Asset '${tokenName}' (ID: ${existingAsset.id}) atualizado no manifest.`);
        } else {
            console.log(`[Main Process - Asset] Asset '${tokenName}' (ID: ${existingAsset.id}) já existe e está atualizado no manifest.`);
        }
        return manifestData[existingAssetIndex].id; // Retorna o ID existente
    } else {
        // INSERÇÃO: Se o asset não existe
        const newAsset = {
            id: Date.now(), // Gerar um novo ID para o asset no manifest. Considere usar UUID aqui se Date.now() for um problema.
            name: tokenName,
            type: tokenType,
            data: base64DataOnly
        };
        manifestData.push(newAsset);
        fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), 'utf8');
        console.log(`[Main Process - Asset] Novo asset '${tokenName}' adicionado ao manifest. ID: ${newAsset.id}`);
        return newAsset.id; // Retorna o ID do novo asset
    }
}
ipcMain.handle('update-scenario', async (event, scenarioId, scenarioData) => {
  console.log(`[Main Process] Recebida requisição para ATUALIZAR cenário ID: ${scenarioId}.`);

  if (!scenarioId) {
    return { success: false, message: "ID do cenário inválido para atualização." };
  }

  try {
    const mapsManifest = JSON.parse(fs.readFileSync(mapManifestPath, 'utf8'));
    const mapBase64Data = scenarioData.mapImageUrl.split(',')[1];
    const mapAsset = mapsManifest.find(map => map.data === mapBase64Data);
    if (!mapAsset) return { success: false, message: "Mapa não encontrado." };
    const mapAssetId = mapAsset.id;

    // Processar os tokens - AGORA USANDO upsertTokenAssetToManifest
    const processedTokensPromises = scenarioData.tokens.map(async token => {
        if (!token.image || typeof token.image !== 'string' || !token.image.startsWith('data:')) {
            console.warn(`Token inválido para atualização (sem imagem base64 válida ou formato data:):`, token);
            return null;
        }

        // NOVO: Garante que o asset da imagem do token esteja no manifest para atualização
        const assetIdForManifest = await upsertTokenAssetToManifest(
            token.image,
            token.id, // Passa o ID do token da grid
            token.name || `token-${token.id}`,
            'image/png'
        );

        if (!assetIdForManifest) {
          console.warn(`Falha ao garantir que o asset da imagem para '${token.name}' existe durante a atualização. Token será ignorado.`);
          return null;
        }

        return {
            id: token.id,
            assetId: assetIdForManifest, // Use o assetId garantido
            x: token.x,
            y: token.y,
            width: token.width,
            height: token.height,
            name: token.name,
            playerId: token.playerId || null,
            currentHp: token.currentHp,
            maxHp: token.maxHp,
            ac: token.ac,
            damageDealt: token.damageDealt,
            portraitUrl: token.portraitUrl
        };
    });
    const scenarioTokens = (await Promise.all(processedTokensPromises)).filter(t => t !== null);

    const tokensJson = JSON.stringify(scenarioTokens);
    const fogGridJson = JSON.stringify(scenarioData.fogGrid);

    // Query SQL de UPDATE
    const stmt = db.prepare(`
      UPDATE scenarios
      SET map_asset_id = ?, tokens = ?, fog_of_war = ?
      WHERE id = ?
    `);
    stmt.run(mapAssetId, tokensJson, fogGridJson, scenarioId);

    return { success: true, message: "Cenário atualizado com sucesso!" };

  } catch (error) {
    console.error(`[Main Process] Erro ao atualizar cenário ${scenarioId}:`, error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

ipcMain.handle('request-chat-history', async (event) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    // Envia uma mensagem para o servidor solicitando o histórico
    ws.send(JSON.stringify({ type: "request-chat-history" })); // Novo tipo de mensagem para o servidor
    console.log("[Main Process] Solicitando histórico de chat ao servidor WebSocket.");
    return { success: true, message: "Requisição de histórico enviada." };
  } else {
    console.error("[Main Process] WebSocket não está conectado. Não foi possível solicitar histórico.");
    return { success: false, message: "WebSocket não conectado." };
  }
});
// Manipular alterações de cenário enviadas pela interface
ipcMain.on("request-tokenMove", (event, data) => {
  const message = JSON.stringify({ type: "request-tokenMove", data });

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(message);
    console.log("[Main Process] Solicitando movimento de token ao servidor.");
  } else {
    console.error("[Main Process] WebSocket não está conectado. Mensagem de movimento de token não enviada.");
  }
});

// IPC handler para definir o USERID (o único) no main process
ipcMain.handle('set-userid', async (event, userid) => {
    USERID = userid; // Define o USERID globalmente no main process
    console.log("[Main Process] USER ID definido para: " + userid);
    // Opcional: Enviar o USERID para o processo de renderização também, se ele ainda não souber
    if (MainWindow) {
        MainWindow.webContents.send('set-client-userid', USERID);
    }
});
ipcMain.handle('get-userid', async (event) => { // Removi userid do argumento, pois USERID é global
        return USERID; // Retorna o USERID global do main process
});


ipcMain.handle('login-check', async (event, user, pass) => {
  console.log(`[Main Process] IPC 'login-check' recebido para usuário: ${user}`);
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log("[Main Process] WebSocket está ABERTO. Preparando para enviar requisição de login ao servidor.");
    return new Promise((resolve, reject) => {
      loginPromiseResolve = resolve; // Armazena a função resolve da Promise

      const message = JSON.stringify({
        type: "login-request",
        data: { username: user, password: pass }
      });
      ws.send(message);
      console.log("[Main Process] Requisição de login enviada ao servidor.");

      // Adiciona um timeout para a Promise, caso o servidor não responda
      setTimeout(() => {
        if (loginPromiseResolve) {
          console.warn("[Main Process] Tempo limite da requisição de login esgotado. Resolvendo com falha.");
          loginPromiseResolve({ success: false, message: "Tempo limite da requisição de login esgotado." });
          loginPromiseResolve = null;
        }
      }, 10000); // 10 segundos de timeout
    });
  } else {
    console.error("[Main Process] WebSocket não está conectado. Não foi possível realizar o login.");
    return { success: false, message: "Não foi possível conectar ao servidor de autenticação." };
  }
});
ipcMain.handle('update-character-main-fields', async (event, fieldsToUpdate) => { // Removi characterId, já que é passado em fieldsToUpdate.id
  const characterId = fieldsToUpdate.id; // Pegar o ID do objeto fieldsToUpdate
  console.log(`[Main Process] Atualizando campos principais do personagem ${characterId}:`, fieldsToUpdate);
  if (!characterId) {
    return { success: false, message: "ID do personagem é obrigatório para atualização de campos." };
  }

  // Constrói a parte SET da query dinamicamente
  const setParts = [];
  const values = [];

  for (const field in fieldsToUpdate) {
    if (Object.prototype.hasOwnProperty.call(fieldsToUpdate, field) && field !== 'id') { // Ignorar o 'id' ao construir o SET
      setParts.push(`${field} = ?`);
      // Lógica para Token_image (BLOB)
      if (field === 'Token_image' && fieldsToUpdate[field] && fieldsToUpdate[field].startsWith('data:')) {
        const base64String = fieldsToUpdate[field].split(',')[1];
        values.push(Buffer.from(base64String, 'base64'));
      } else {
        values.push(fieldsToUpdate[field]);
      }
    }
  }

  if (setParts.length === 0) {
    return { success: false, message: "Nenhum campo para atualizar." };
  }

  const query = `UPDATE characters SET ${setParts.join(', ')} WHERE id = ?`;
  values.push(characterId); // Adiciona o ID do personagem como último valor

  try {
    const info = db.prepare(query).run(...values);
    if (info.changes > 0) {
      console.log(`[Main Process] ${info.changes} campo(s) atualizado(s) para personagem ${characterId}.`);
      return { success: true, message: "Campos atualizados com sucesso!" };
    } else {
      return { success: false, message: "Nenhum campo foi alterado ou personagem não encontrado." };
    }
  } catch (error) {
    console.error(`[Main Process] Erro ao atualizar campos principais do personagem ${characterId}:`, error);
    return { success: false, message: `Erro ao atualizar campos: ${error.message}` };
  }
});
ipcMain.handle('request-character-data', async (event, characterId) => {
  console.log(`[Main Process] Carregando dados do personagem ${characterId} do SQLite.`);
  try {
    // AQUI: A query SELECT * FROM characters WHERE id = ? deveria pegar todos os campos.
    // Se não estiver pegando, o problema pode ser na DDL da tabela no initializeDatabase
    // ou que o campo não existe no DB.
    const characterRow = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);

    if (!characterRow) {
        console.warn(`[Main Process] Personagem ${characterId} não encontrado no DB. Retornando padrão.`);
        return {
            success: true,
            data: {
                bioFields: { history: "", appearance: "", personality: "", treasure: "" },
                myCharacterAttributes: [],
                mySkills: [],
                essentialAttributes: { armor: 0, initiative: '', proficiency: '', speed: '' },
                actions: [],
                MaxHp: 10, CurrentHp: 10, TempHp: 0, Shield: 0, // Valores padrão para o caso de não encontrar
                Race: "Raça Padrão", Class: "Classe Padrão", SubClass: "Subclasse Padrão",
                Level: 1, XP: 0, CHARNAME: "", PLayer_ID: null, Token_image: null
            }
        };
    }

    const bioFields = JSON.parse(characterRow.bioFields);
    const essentialAttributes = JSON.parse(characterRow.essentialAttributes);

    const attributes = db.prepare('SELECT id, name, value, modifier FROM character_attributes WHERE character_id = ?').all(characterRow.id);
    const skills = db.prepare('SELECT name, modifier FROM character_skills WHERE character_id = ?').all(characterRow.id);
    const actions = db.prepare('SELECT * FROM character_actions WHERE character_id = ?').all(characterRow.id).map(actionRow => ({
        ...actionRow,
        properties: actionRow.properties ? JSON.parse(actionRow.properties) : [],
        isFavorite: Boolean(actionRow.isFavorite)
    }));

    let tokenImageBase64 = null;
    if (characterRow.Token_image) {
      tokenImageBase64 = `data:image/png;base64,${characterRow.Token_image.toString('base64')}`;
    }

    const fullCharacterData = {
        id: characterRow.id,
        bioFields,
        myCharacterAttributes: attributes,
        mySkills: skills,
        essentialAttributes,
        actions,
        // Garanta que ESTES CAMPOS ESTÃO SENDO PUXADOS DE characterRow
        MaxHp: characterRow.MaxHp,
        CurrentHp: characterRow.CurrentHp,
        TempHp: characterRow.TempHp,
        Shield: characterRow.Shield,
        Race: characterRow.Race,
        Class: characterRow.Class, // Note: aqui é 'Class', não 'charClass'
        SubClass: characterRow.SubClass,
        Level: characterRow.Level,
        XP: characterRow.XP,
        CHARNAME: characterRow.CHARNAME,
        PLayer_ID: characterRow.PLayer_ID,
        Token_image: tokenImageBase64
    };

    return { success: true, data: fullCharacterData };

  } catch (error) {
    console.error(`[Main Process] Erro ao carregar personagem ${characterId} do SQLite:`, error);
    return { success: false, message: `Erro ao carregar dados: ${error.message}` };
  }
});


ipcMain.handle('update-character-skills', async (event, value,id) => {
  const characterId = id;
  console.log(value)
  console.log(id)
  try {
    db.transaction(() => {
      if (characterId) {
        db.prepare(`
          UPDATE character_skills
          SET modifier = ?
          WHERE character_id = ?
        `).run(
          value,
          characterId
        );

      }
      return { success: true, message: "Dados salvos com sucesso no SQLite!"};

    })(); // Executa a transação

    return { success: true, message: "Dados salvos com sucesso no SQLite!" };
  } catch (error) {
    console.error(`[Main Process] Erro ao salvar dados no SQLite:`, error);
    return { success: false, message: `Erro ao salvar dados: ${error.message}` };
  }
});
ipcMain.handle('update-character-bio', async (event, value,id) => {
  const characterId = id;
  console.log(value)
  console.log(id)
  try {
    db.transaction(() => {
      if (characterId) {
        db.prepare(`
          UPDATE characters
          SET bioFields = ?
          WHERE id = ?
        `).run(
          value,
          characterId
        );

      }
      return { success: true, message: "Dados salvos com sucesso no SQLite!"};

    })(); // Executa a transação

    return { success: true, message: "Dados salvos com sucesso no SQLite!" };
  } catch (error) {
    console.error(`[Main Process] Erro ao salvar dados no SQLite:`, error);
    return { success: false, message: `Erro ao salvar dados: ${error.message}` };
  }
});

ipcMain.handle('update-character-essentials', async (event, value,id) => {
  const characterId = id;
  try {
    db.transaction(() => {
      if (characterId) {
        db.prepare(`
          UPDATE characters
          SET essentialAttributes = ?
          WHERE id = ?
        `).run(
          value,
          characterId
        );

      }
      return { success: true, message: "Dados salvos com sucesso no SQLite!"};

    })(); // Executa a transação

    return { success: true, message: "Dados salvos com sucesso no SQLite!" };
  } catch (error) {
    console.error(`[Main Process] Erro ao salvar dados no SQLite:`, error);
    return { success: false, message: `Erro ao salvar dados: ${error.message}` };
  }
});

ipcMain.handle('send-message', async (event, messageText, senderId, senderName, senderAvatar) => {
  const messagePayload = {
    type: 'chat-message',
    timestamp: new Date().toISOString(),
    message: messageText,
    id: senderId,
    senderName: senderName,
    senderAvatar: senderAvatar
  };

  const testMessage = {
    type: 'send-message',
    timestamp: new Date().toISOString(),
    data: messagePayload
  };

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(testMessage));
    console.log(`[Main Process] Mensagem de chat enviada ao servidor WebSocket: ${JSON.stringify(testMessage)}`);
    return { success: true, message: "Mensagem enviada ao servidor." };
  } else {
    console.error("[Main Process] WebSocket não está conectado. Mensagem de chat não enviada.");
    return { success: false, message: "WebSocket não conectado." };
  }
});


ipcMain.handle('update-character-attributes', async (event, value,id) => {
  const characterId = id;
  try {
    db.transaction(() => {
      if (characterId) {
        db.prepare(`
          UPDATE character_attributes
          SET value = ?
          WHERE id = ?
        `).run(
          value,
          characterId
        );

      }
      return { success: true, message: "Dados salvos com sucesso no SQLite!"};

    })(); // Executa a transação

    return { success: true, message: "Dados salvos com sucesso no SQLite!" };
  } catch (error) {
    console.error(`[Main Process] Erro ao salvar dados no SQLite:`, error);
    return { success: false, message: `Erro ao salvar dados: ${error.message}` };
  }
});

ipcMain.handle('save-character-data', async (event, characterData) => {
  console.log(`[Main Process] Recebida requisição para salvar dados do personagem.`);
  const characterId = characterData.id;

  try {
    db.transaction(() => {
      if (characterId) { // Atualização de personagem existente
        // Converte a imagem Base64 para Buffer se existir
        let tokenImageBuffer = null;
        if (characterData.Token_image && characterData.Token_image.startsWith('data:')) {
          const base64String = characterData.Token_image.split(',')[1];
          tokenImageBuffer = Buffer.from(base64String, 'base64');
        }

        db.prepare(`
          UPDATE characters
          SET
            bioFields = ?, essentialAttributes = ?, MaxHp = ?, CurrentHp = ?, TempHp = ?, Shield = ?,
            Race = ?, Class = ?, SubClass = ?, Level = ?, XP = ?, PLayer_ID = ?, Token_image = ?, CHARNAME = ?
          WHERE id = ?
        `).run(
          JSON.stringify(characterData.bioFields),
          JSON.stringify(characterData.essentialAttributes),
          characterData.MaxHp,
          characterData.CurrentHp,
          characterData.TempHp,
          characterData.Shield,
          characterData.Race,
          characterData.Class,
          characterData.SubClass,
          characterData.Level,
          characterData.XP,
          characterData.PLayer_ID,
          tokenImageBuffer, // Atualiza o BLOB
          characterData.CHARNAME,
          characterId
        );
      } else {
        console.error("[Main Process] save-character-data chamado sem ID do personagem para um personagem existente. ISSO É UM ERRO DE LÓGICA NO FRONTEND.");
        throw new Error("Tentativa de salvar personagem sem ID como atualização. Use 'create-character' para novos personagens.");
      }

      // ... (Salvamento de Atributos, Habilidades, Ações - sem mudanças) ...

      return { success: true, message: "Dados salvos com sucesso no SQLite!", newCharacterId: characterId };
    })();
    
    return { success: true, message: "Dados salvos com sucesso no SQLite!" };
  } catch (error) {
    console.error(`[Main Process] Erro ao salvar dados no SQLite:`, error);
    return { success: false, message: `Erro ao salvar dados: ${error.message}` };
  }
});
ipcMain.handle('save-attribute', async (event, characterId, attribute) => {
  console.log(`[Main Process] Salvando atributo ${attribute.name} para o personagem ${characterId}.`);
  try {
    // Tenta atualizar um atributo existente
    const updateStmt = db.prepare(`
      UPDATE character_attributes
      SET value = ?, modifier = ?
      WHERE character_id = ? AND name = ?
    `);
    const updateInfo = updateStmt.run(attribute.value, attribute.modifier, characterId, attribute.name);

    if (updateInfo.changes === 0) {
      // Se não atualizou (atributo não existia), insere um novo
      const insertStmt = db.prepare(`
        INSERT INTO character_attributes (character_id, name, value, modifier)
        VALUES (?, ?, ?, ?)
      `);
      insertStmt.run(characterId, attribute.name, attribute.value, attribute.modifier);
      console.log(`[Main Process] Atributo ${attribute.name} inserido.`);
    } else {
      console.log(`[Main Process] Atributo ${attribute.name} atualizado.`);
    }
    return { success: true, message: "Atributo salvo com sucesso!" };
  } catch (error) {
    console.error(`[Main Process] Erro ao salvar atributo para o personagem ${characterId}:`, error);
    return { success: false, message: `Erro ao salvar atributo: ${error.message}` };
  }
});

ipcMain.handle('save-skill', async (event, characterId, skill) => {
  console.log(`[Main Process] Salvando habilidade ${skill.name} para o personagem ${characterId}.`);
  try {
    // Tenta atualizar uma habilidade existente
    const updateStmt = db.prepare(`
      UPDATE character_skills
      SET modifier = ?
      WHERE character_id = ? AND name = ?
    `);
    const updateInfo = updateStmt.run(skill.modifier, characterId, skill.name);

    if (updateInfo.changes === 0) {
      // Se não atualizou (habilidade não existia), insere uma nova
      const insertStmt = db.prepare(`
        INSERT INTO character_skills (character_id, name, modifier)
        VALUES (?, ?, ?)
      `);
      insertStmt.run(characterId, skill.name, skill.modifier);
      console.log(`[Main Process] Habilidade ${skill.name} inserida.`);
    } else {
      console.log(`[Main Process] Habilidade ${skill.name} atualizada.`);
    }
    return { success: true, message: "Habilidade salva com sucesso!" };
  } catch (error) {
    console.error(`[Main Process] Erro ao salvar habilidade para o personagem ${characterId}:`, error);
    return { success: false, message: `Erro ao salvar habilidade: ${error.message}` };
  }
});
ipcMain.handle('save-action', async (event, characterId, action) => {
  console.log(`[Main Process] Salvando ação ${action.name} para o personagem ${characterId}.`);
  try {
    console.log(action)
    let query;
 // Nova ação (não tem ID ainda)
      query = `
        INSERT INTO character_actions (
          character_id, name, mainType, effectCategory, attackRange, target,
          damageDice, damageType, healingDice, utilityTitle, utilityValue,
          properties, level, castingTime, duration, school, saveDC, description, isFavorite
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const info = db.prepare(query).run(
        characterId, action.name, action.mainType, action.effectCategory, action.attackRange || null, action.target || null,
        action.damageDice || null, action.damageType || null, action.healingDice || null, action.utilityTitle || null, action.utilityValue || null,
        JSON.stringify(action.properties || []), action.level || null, action.castingTime || null, action.duration || null, action.school || null, action.saveDC || null,
        action.description || null, action.isFavorite ? 1 : 0
      );
      action.id = info.lastInsertRowid; // Atribui o novo ID auto-incrementado à ação
      console.log(`[Main Process] Nova ação ${action.name} inserida com ID: ${action.id}.`);

    return { success: true, message: "Ação salva com sucesso!", newActionId: action.id };
  } catch (error) {
    console.error(`[Main Process] Erro ao salvar ação para o personagem ${characterId}:`, error);
    return { success: false, message: `Erro ao salvar ação: ${error.message}` };
  }
});
ipcMain.handle('edit-action', async (event, characterId, action) => {

  try {
    console.log(action)
    let query;
    if (action.id) { // Se a ação já tem um ID, é uma atualização
      query = `
        UPDATE character_actions SET
          name = ?, mainType = ?, effectCategory = ?, attackRange = ?, target = ?,
          damageDice = ?, damageType = ?, healingDice = ?, utilityTitle = ?, utilityValue = ?,
          properties = ?, level = ?, castingTime = ?, duration = ?, school = ?, saveDC = ?,
          description = ?, isFavorite = ?
        WHERE id = ? AND character_id = ?
      `;
      db.prepare(query).run(
        action.name, action.mainType, action.effectCategory, action.attackRange || null, action.target || null,
        action.damageDice || null, action.damageType || null, action.healingDice || null, action.utilityTitle || null, action.utilityValue || null,
        JSON.stringify(action.properties || []), action.level || null, action.castingTime || null, action.duration || null, action.school || null, action.saveDC || null,
        action.description || null, action.isFavorite ? 1 : 0, action.id, characterId
      );
      console.log(`[Main Process] Ação ${action.name} (ID: ${action.id}) atualizada.`);
    } else { // Nova ação (não tem ID ainda) // ESTE BLOCO DEVE SER REMOVIDO ou tratado como erro
      console.error("[Main Process] edit-action chamado para uma ação sem ID. Use 'save-action' para novas ações.");
      return { success: false, message: "ID da ação não fornecido para edição. Use 'save-action' para novas ações." };
    }
    return { success: true, message: "Ação salva com sucesso!", newActionId: action.id };
  } catch (error) {
    console.error(`[Main Process] Erro ao salvar ação para o personagem ${characterId}:`, error);
    return { success: false, message: `Erro ao salvar ação: ${error.message}` };
  }
});
ipcMain.handle('delete-action', async (event, characterId, actionId) => {
  console.log(`[Main Process] Deletando ação ${actionId} do personagem ${characterId}.`);
  try {
    const stmt = db.prepare('DELETE FROM character_actions WHERE id = ? AND character_id = ?');
    const info = stmt.run(actionId, characterId);
    if (info.changes > 0) {
      return { success: true, message: "Ação deletada com sucesso!" };
    } else {
      return { success: false, message: "Ação não encontrada ou não pertence ao personagem." };
    }
  } catch (error) {
    console.error(`[Main Process] Erro ao deletar ação ${actionId}:`, error);
    return { success: false, message: `Erro ao deletar ação: ${error.message}` };
  }
});
ipcMain.handle('delete-character', async (event, characterId) => {
  console.log(`[Main Process] Deletando personagem COMPLETO ${characterId} do SQLite.`);
  try {
    const result = db.prepare('DELETE FROM characters WHERE id = ?').run(characterId);
    if (result.changes > 0) {
      return { success: true, message: "Personagem deletado com sucesso!" };
    } else {
      return { success: false, message: "Personagem não encontrado para deleção." };
    }
  } catch (error) {
    console.error(`[Main Process] Erro ao deletar personagem ${characterId} do SQLite:`, error);
    return { success: false, message: `Erro ao deletar: ${error.message}` };
  }
});
ipcMain.handle('manage-assets:get-pool', async (event, assetType) => {
  const manifestPath = assetType === 'token' ? tokenManifestPath : mapManifestPath;
  const assetFolder = path.join(assetsPath, `${assetType}s`);
  if (!fs.existsSync(assetFolder)) {
    fs.mkdirSync(assetFolder);
}
  const data = fs.readFileSync(manifestPath);
  return JSON.parse(data);
});

// NOVO: IPC para carregar a lista de assets de áudio
ipcMain.handle('manage-assets:get-audio-pool', async (event) => {
  const assetFolder = path.join(assetsPath, `audios`);
  if (!fs.existsSync(assetFolder)) {
      fs.mkdirSync(assetFolder, { recursive: true });
  }
  const data = fs.readFileSync(audioManifestPath, 'utf8');
  return JSON.parse(data);
});


ipcMain.handle('manage-assets:add-image', async (event, assetType) => {
  const manifestPath = assetType === 'token' ? tokenManifestPath : mapManifestPath;

  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: `Adicionar Novo ${assetType === 'token' ? 'Token' : 'Mapa'}`,
    properties: ['openFile'],
    filters: [{ name: 'Imagens', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }]
  });

  if (canceled || filePaths.length === 0) {
    return null;
  }
  
  const originalPath = filePaths[0];

  let newAsset;
  const manifestData = JSON.parse(fs.readFileSync(manifestPath));
  
  // Inicia o pipeline de processamento com sharp para ambos os casos
  let imagePipeline = sharp(originalPath);
  
  // Pega os metadados para obter dimensões e formato
  const metadata = await imagePipeline.metadata();
  
  // SE FOR UM MAPA, APLICA O REDIMENSIONAMENTO SE NECESSÁRIO
  if (assetType === 'map') {
    if (metadata.width > MAX_MAP_DIMENSION || metadata.height > MAX_MAP_DIMENSION) {
      console.log(`[Main Process] Mapa grande detectado (${metadata.width}x${metadata.height}). Redimensionando...`);
      imagePipeline.resize({
        width: MAX_MAP_DIMENSION,
        height: MAX_MAP_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true
      });
    }
  }

  // CONVERTE O RESULTADO (REDIMENSIONADO OU NÃO) PARA BASE64
  // O método .toBuffer() obtém a imagem processada
  const processedImageBuffer = await imagePipeline.toBuffer();
  const base64Data = processedImageBuffer.toString('base64');
  
  // O formato é pego dos metadados para maior precisão
  const mimeType = `image/${metadata.format}`;

  // Cria o objeto do asset. Agora mapas e tokens têm a MESMA ESTRUTURA.
  newAsset = {
    id: Date.now(),
    name: path.basename(originalPath),
    type: mimeType,
    data: base64Data
  };
  
  manifestData.push(newAsset);
  fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2));

  return manifestData;
});
// NOVO: IPC para adicionar um arquivo de áudio
ipcMain.handle('manage-assets:add-audio', async (event, newAudioName, newAudioType) => { // ADD newAudioName and newAudioType here
  const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Adicionar Novo Arquivo de Áudio',
      properties: ['openFile'],
      filters: [{ name: 'Áudios', extensions: ['mp3', 'wav', 'ogg'] }]
  });

  if (canceled || filePaths.length === 0) {
      return null;
  }

  const originalPath = filePaths[0];
  const manifestData = JSON.parse(fs.readFileSync(audioManifestPath, 'utf8'));

  const audioAssetsDir = path.join(assetsPath, 'audios');
  if (!fs.existsSync(audioAssetsDir)) {
      fs.mkdirSync(audioAssetsDir, { recursive: true });
  }

  const fileName = path.basename(originalPath);
  const destinationPath = path.join(audioAssetsDir, fileName);

  fs.copyFileSync(originalPath, destinationPath);

  const audioBuffer = fs.readFileSync(destinationPath);
  const base64Data = audioBuffer.toString('base64');
  const mimeType = `audio/${path.extname(originalPath).substring(1)}`;

  const newAsset = {
      id: Date.now(),
      name: newAudioName.trim() || fileName, // This line will now correctly use newAudioName
      type: mimeType,
      category: newAudioType, // Save the category here!
      data: base64Data
  };

  manifestData.push(newAsset);
  fs.writeFileSync(audioManifestPath, JSON.stringify(manifestData, null, 2), 'utf8');

  return manifestData;
});
ipcMain.on('add-tokens-to-initiative', (event, tokens) => {
  if (MainWindow) {
    MainWindow.webContents.send('add-tokens-to-combat-tracker', tokens);
  }
});
  ipcMain.on('notify-my-turn', (event, { title, body, icon }) => {
    if (Notification.isSupported()) {
      const notificationOptions = {
        title: title,
        body: body,
        // Garante que o ícone seja um caminho absoluto se for um arquivo local
        icon: icon ? path.resolve(icon) : undefined, // Ajuste o caminho do ícone se necessário
      };
      new Notification(notificationOptions).show();
    } else {
      console.log('Notificações não são suportadas neste sistema operacional.');
    }
  });
ipcMain.on('add-tokens-to-initiative', (event, tokens) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "add-tokens-to-initiative-server", data: tokens }));
    console.log("[Main Process] Tokens de iniciativa enviados ao servidor.");
  } else {
    console.warn("[Main Process] WebSocket não conectado. Não foi possível adicionar tokens à iniciativa.");
  }
});

// NEW: IPC handler for next turn command
ipcMain.handle('request-next-turn', async () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "next-turn-server" }));
        console.log("[Main Process] Requisição de próximo turno enviada ao servidor.");
        return { success: true };
    } else {
        console.error("[Main Process] WebSocket não está conectado. Não foi possível avançar o turno.");
        return { success: false, message: "WebSocket não conectado." };
    }
});

// NEW: IPC handler for previous turn command
ipcMain.handle('request-previous-turn', async () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "previous-turn-server" }));
        console.log("[Main Process] Requisição de turno anterior enviada ao servidor.");
        return { success: true };
    } else {
        console.error("[Main Process] WebSocket não está conectado. Não foi possível retroceder o turno.");
        return { success: false, message: "WebSocket não conectado." };
    }
});

// NEW: IPC handler for updating a combatant's initiative value
ipcMain.handle('update-combatant-initiative', async (event, tokenId, newValue) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "update-initiative-value-server", data: { tokenId, newValue } }));
        console.log(`[Main Process] Atualização de iniciativa para token ${tokenId} enviada ao servidor.`);
        return { success: true };
    } else {
        console.error("[Main Process] WebSocket não está conectado. Não foi possível atualizar a iniciativa.");
        return { success: false, message: "WebSocket não conectado." };
    }
});
ipcMain.handle('save-scenario', async (event, scenarioData, scenarioName) => {
  if (ws) {
    console.log("[Main Process] Enviando sinal de sincronização de cenário para null.");
    ws.send(JSON.stringify({ type: "sync-scenario", data: null }));
  } else {
    console.log("[Main Process] WebSocket não está conectado. Não foi possível enviar sinal de sincronização.");
  }
  console.log('[Main Process] Recebida requisição para salvar cenário.');
  // >>> PONTO DE DEPURACAO 1: Logar scenarioData.tokens AQUI
  console.log('[Main Process] scenarioData.tokens recebido:', scenarioData.tokens); // Adicione esta linha

  try {
    const mapsManifest = JSON.parse(fs.readFileSync(mapManifestPath, 'utf8'));
    const mapBase64Data = scenarioData.mapImageUrl.split(',')[1];
    const mapAsset = mapsManifest.find(map => map.data === mapBase64Data);
    if (!mapAsset) {
      return { success: false, message: "Mapa do cenário não encontrado na biblioteca de mapas." };
    }
    const mapAssetId = mapAsset.id;

    // Processar os tokens - AGORA USANDO upsertTokenAssetToManifest
    const processedTokensPromises = scenarioData.tokens.map(async token => {
      // Verificação da imagem do token
      if (!token.image || typeof token.image !== 'string' || !token.image.startsWith('data:')) {
          console.warn(`Token inválido encontrado (sem imagem base64 válida ou formato data:):`, token);
          return null;
      }

      // NOVO: Garante que o asset da imagem do token (genérico ou de personagem) esteja no manifest
      // O 'token.id' é o ID da instância do token na grid, NÃO o ID do asset no manifest.
      // Vamos usar um ID derivado ou apenas a data base64 para a busca no manifest.
      // A função upsertTokenAssetToManifest cuidará do ID do asset.
      const assetIdForManifest = await upsertTokenAssetToManifest(
          token.image,
          token.id, // Passamos o ID do token da grid, a função pode usar isso ou gerar um novo ID para o asset.
                    // Se o ID do token da grid for o mesmo que o ID do personagem no DB (para tokens de personagem),
                    // isso ajuda a função a encontrar o asset existente.
          token.name || `token-${token.id}`, // Nome para o asset no manifest
          'image/png' // Tipo mime, você pode tentar inferir a partir de token.image se houver um tipo no prefixo data:
      );

      if (!assetIdForManifest) {
        console.warn(`Falha ao garantir que o asset da imagem para '${token.name}' existe. Token será ignorado.`);
        return null;
      }

      return {
        id: token.id, // O ID único do token na grid (Date.now())
        assetId: assetIdForManifest, // O ID do asset no manifest (gerado/encontrado por upsertTokenAssetToManifest)
        x: token.x,
        y: token.y,
        width: token.width,
        height: token.height,
        name: token.name,
        playerId: token.playerId || null,
        currentHp: token.currentHp,
        maxHp: token.maxHp,
        ac: token.ac,
        damageDealt: token.damageDealt,
        portraitUrl: token.portraitUrl
      };
    });

    const scenarioTokens = (await Promise.all(processedTokensPromises)).filter(t => t !== null);
    // >>> PONTO DE DEPURACAO 4: Logar o resultado final do processamento dos tokens
    console.log('[Main Process] scenarioTokens processados para salvar:', scenarioTokens); // Adicione esta linha


    // 3. Stringify dos dados complexos para armazenamento
    const tokensJson = JSON.stringify(scenarioTokens); // <<-- SE scenarioTokens ESTIVER VAZIO, ISSO SERÁ '[]'
    const fogGridJson = JSON.stringify(scenarioData.fogGrid);

    // >>> PONTO DE DEPURACAO 5: Logar a string JSON final dos tokens
    console.log('[Main Process] tokensJson final para DB:', tokensJson.substring(0, 500) + (tokensJson.length > 500 ? '...' : '')); // Log dos primeiros 500 caracteres


    // 4. Salvar no banco de dados (INSERT para criar um novo cenário)
    const stmt = db.prepare(`
      INSERT INTO scenarios (name, map_asset_id, tokens, fog_of_war)
      VALUES (?, ?, ?, ?)
    `);
    const info = stmt.run(scenarioName, mapAssetId, tokensJson, fogGridJson);
    const newScenarioId = info.lastInsertRowid; // Obtém o ID do cenário recém-salvo

    // Enviar sinal de sincronização para outros clientes via WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      const syncData = {
          scenarioId: newScenarioId, // Envia o ID do cenário recém-salvo
          mapAssetId: mapAssetId,
          tokens: scenarioTokens, // Enviando os tokens já processados
          fogOfWar: scenarioData.fogGrid,
      };
      ws.send(JSON.stringify({ type: "syncAll", data: syncData }));
      console.log("[Main Process] Cenário salvo e enviado para sincronização.");
    }

    return { success: true, message: "Cenário salvo com sucesso!", newId: newScenarioId };
  } catch (error) {
    console.error('[Main Process] Erro ao salvar cenário:', error);
    return { success: false, message: `Erro ao salvar cenário: ${error.message}` };
  }
});
ipcMain.handle('remove-token-from-scenario', async (event, scenarioId, tokenIdToRemove) => {
    console.log(`[Main Process] Recebida requisição para remover token ${tokenIdToRemove} do cenário ${scenarioId}.`);

    if (!scenarioId) {
        return { success: false, message: "ID do cenário é obrigatório para remover token." };
    }
    if (!tokenIdToRemove) {
        return { success: false, message: "ID do token é obrigatório para remover token." };
    }

    try {
        // 1. Carregar o cenário atual do DB
        const scenarioRow = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(scenarioId);
        if (!scenarioRow) {
            return { success: false, message: "Cenário não encontrado no banco de dados." };
        }

        let currentTokens = JSON.parse(scenarioRow.tokens);
        const initialTokenCount = currentTokens.length;

        // 2. Filtrar o token a ser removido
        const updatedTokens = currentTokens.filter(token => token.id !== tokenIdToRemove);

        if (updatedTokens.length === initialTokenCount) {
            // Token não foi encontrado no array, talvez já tenha sido removido ou o ID está errado
            console.warn(`[Main Process] Tentativa de remover token ${tokenIdToRemove}, mas não encontrado no cenário ${scenarioId}.`);
            // Retorna sucesso para evitar loops, mas loga o aviso.
            return { success: true, message: "Token não encontrado no cenário (já removido ou ID inválido)." };
        }

        // 3. Serializar o novo array de tokens
        const updatedTokensJson = JSON.stringify(updatedTokens);

        // 4. Atualizar o cenário no DB com a nova lista de tokens
        const stmt = db.prepare(`
            UPDATE scenarios
            SET tokens = ?
            WHERE id = ?
        `);
        const info = stmt.run(updatedTokensJson, scenarioId);

        if (info.changes === 0) {
            return { success: false, message: "Cenário não atualizado após remoção do token." };
        }

        // 5. Notificar outros clientes via WebSocket sobre a remoção
        if (ws && ws.readyState === WebSocket.OPEN) {
            // Envie a instrução para remover o token pelo ID para todos os clientes
            ws.send(JSON.stringify({ type: "remove-token-from-scenario", data: { scenarioId: scenarioId, tokenId: tokenIdToRemove } }));
            console.log(`[Main Process] Token ${tokenIdToRemove} removido do cenário ${scenarioId} e instrução enviada via WebSocket.`);
        }

        return { success: true, message: "Token removido com sucesso do cenário." };

    } catch (error) {
        console.error(`[Main Process] Erro ao remover token ${tokenIdToRemove} do cenário ${scenarioId}:`, error);
        return { success: false, message: `Erro ao remover token: ${error.message}` };
    }
});

ipcMain.handle('MovePlayersToScenario', async (event, scenarioId) => {

  if(ws){
    console.log("[Main Process] Solicitando movimento de jogadores para o cenário ID: " + scenarioId);
    ws.send(JSON.stringify({ type: "sync-scenario", data: scenarioId }))
    return { success:true}
  }
  return { success:false}

});
ipcMain.handle('load-scenario', async (event, scenarioId) => {
  console.log('[Main Process] Carregando cenário salvo.');
  try {
    const scenarioRow = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(scenarioId);

    if (!scenarioRow) {
      return { success: false, message: "Nenhum cenário salvo encontrado." };
    }

    // O processo inverso: reconstruir o objeto de cenário para o frontend
    const mapsManifest = JSON.parse(fs.readFileSync(mapManifestPath, 'utf8')); // Adicione 'utf8'
    const tokensManifest = JSON.parse(fs.readFileSync(tokenManifestPath, 'utf8')); // Adicione 'utf8'

    // 1. Encontrar o mapa
    const mapAsset = mapsManifest.find(map => map.id === scenarioRow.map_asset_id);
    if (!mapAsset) {
      return { success: false, message: "O mapa salvo não existe mais na biblioteca." };
    }
    const mapImageUrl = `data:${mapAsset.type};base64,${mapAsset.data}`;

    // 2. Reconstruir os tokens - *** ALTERADO AQUI ***
    const savedTokens = JSON.parse(scenarioRow.tokens); // Estes são os objetos salvos com id, assetId, x, y, width, height, etc.
    const scenarioTokens = savedTokens.map(savedToken => {
      const tokenAsset = tokensManifest.find(t => t.id === savedToken.assetId);
      if (!tokenAsset) {
        console.warn(`Asset para token salvo (assetId: ${savedToken.assetId}) não encontrado no manifest. Token será ignorado.`);
        return null;
      }
      
      // Recria o objeto completo que o frontend espera, usando os dados salvos E os dados do asset
      return {
        id: savedToken.id, // ID original salvo
        x: savedToken.x,
        y: savedToken.y,
        width: savedToken.width,
        height: savedToken.height,
        
        name: savedToken.name, // Nome customizado salvo
        image: `data:${tokenAsset.type};base64,${tokenAsset.data}`, // Imagem vem do asset
        portraitUrl: savedToken.portraitUrl, // Portrait URL salvo
        playerId: savedToken.playerId, // CRÍTICO: playerId salvo
        currentHp: savedToken.currentHp, // HP atual salvo
        maxHp: savedToken.maxHp, // HP máximo salvo
        ac: savedToken.ac, // AC salvo
        damageDealt: savedToken.damageDealt // damageDealt salvo
        // Garanta que todas as propriedades que você espera no frontend estejam aqui
      };
    }).filter(t => t !== null);

    // 3. Montar o objeto de cenário final
    const fullScenarioData = {
      mapImageUrl: mapImageUrl,
      tokens: scenarioTokens,
      fogGrid: JSON.parse(scenarioRow.fog_of_war),
    };

    return { success: true, data: fullScenarioData };

  } catch (error) {
    console.error('[Main Process] Erro ao carregar cenário:', error);
    return { success: false, message: `Erro ao carregar cenário: ${error.message}` };
  }
});
ipcMain.handle('get-scenario-list', async () => {
  try {
    // 1. Lê o manifest dos mapas para ter acesso às imagens
    const mapsManifest = JSON.parse(fs.readFileSync(mapManifestPath));

    // 2. Busca os cenários do DB, agora incluindo o ID do mapa
    const scenariosFromDb = db.prepare('SELECT id, name, map_asset_id FROM scenarios').all();

    // 3. Combina as informações
    const scenariosWithPreview = scenariosFromDb.map(scenario => {
      // Encontra o asset do mapa correspondente no manifest
      const mapAsset = mapsManifest.find(map => map.id === scenario.map_asset_id);

      // Retorna um novo objeto com os dados do preview
      return {
        id: scenario.id,
        name: scenario.name,
        // Envia os dados da imagem para o frontend, se o mapa for encontrado
        mapPreviewData: mapAsset ? mapAsset.data : null, // O base64 da imagem
        mapMimeType: mapAsset ? mapAsset.type : null     // O tipo da imagem (ex: 'image/png')
      };
    });

    return { success: true, data: scenariosWithPreview };

  } catch (error) {
    console.error('[Main Process] Erro ao buscar lista de cenários com preview:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

