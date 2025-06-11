const { app, BrowserWindow, ipcMain } = require("electron");
const WebSocket = require("ws");
const url = require('url')
const path = require('path')
const Database = require('better-sqlite3');
const DB_PATH = path.join(app.getPath('userData'), 'characters.db');

let MainWindow;
let ws;
let db;
let USERID; // Este USERID é do Main Process, usado para identificar a janela atual ou o mestre.

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
  PLAYERNAME: "Mestre",
  CHARNAME: "Herói Desconhecido",

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
    console.log(`[Main Process] Banco de dados SQLite aberto em: ${DB_PATH}`);

    // Criação das tabelas se não existirem
    // A tabela 'characters' usa INTEGER PRIMARY KEY AUTOINCREMENT para o id
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
        PLAYERNAME TEXT,
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

    // --- Lógica para adicionar um personagem padrão se o DB estiver vazio ---
    const count = db.prepare('SELECT COUNT(*) FROM characters').get();
    if (count['COUNT(*)'] === 0) {
      console.log('[Main Process] Banco de dados vazio. Inserindo personagem padrão "Herói Desconhecido".');

      // Dados do personagem padrão. O ID principal será gerado automaticamente.

      // Inserir o personagem principal e capturar o ID gerado automaticamente
      const insertCharacterStmt = db.prepare(`INSERT INTO characters (bioFields, essentialAttributes) VALUES (?, ?)`);
      const info = insertCharacterStmt.run(
        JSON.stringify(defaultCharacterData.bioFields),
        JSON.stringify(defaultCharacterData.essentialAttributes)
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
      // O ID da ação não é passado, pois o DB vai auto-incrementar
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

      console.log(`[Main Process] Personagem padrão inserido com ID: ${defaultCharacterDbId}`);
    }

  } catch (error) {
    console.error("[Main Process] Erro ao inicializar o banco de dados:", error);
    app.quit();
  }
}

// Função para iniciar a conexão WebSocket
function startWebSocket() {
  ws = new WebSocket("ws://26.37.35.114:5000");

  ws.on("open", () => {
    console.log("Conectado ao servidor WebSocket.");
  });

ws.on("message", (message) => {
  try {
    const parsedMessage = JSON.parse(message); // Parseie a mensagem uma vez
    const { type, data } = parsedMessage;

    if (!MainWindow) {
      console.warn("MainWindow ainda não está pronta para enviar mensagens");
      return;
    }

    if (type === "SyncTokenPosition") {
      MainWindow.webContents.send("SyncTokenPosition", data);
    }
  if (type === "chat-history") {
        console.log("[Main Process] Recebido chat-history do servidor:", data);
        if (data && Array.isArray(data)) {
          // Encaminha o histórico para o frontend
          MainWindow.webContents.send("chat-history", data);
        }
      }
    // --- CÓDIGO CRÍTICO PARA O CHAT ---
    // --- CÓDIGO CRÍTICO PARA O CHAT: CORREÇÃO ---
if (type === "chat-message") {
        if(parsedMessage.id == USERID){
          return
        }
        if (MainWindow && MainWindow.webContents) {
          MainWindow.webContents.send("new-chat-message", parsedMessage);
        } else {
          console.warn("MainWindow ou webContents não está pronto.");
        }
      }
    // -
    if (type === "syncAll") {
      MainWindow.webContents.send("sync-all", data);
 
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
            nodeIntegration:true, // Embora nodeIntegration seja true aqui, contextIsolation é true, então o preload é a maneira segura.
            preload: path.join(__dirname,'preload.js')
        }
    });

    const startUrl = url.format({
        pathname:path.join(__dirname,'./app/build/index.html'),
        protocol:'file'
    })
    MainWindow.loadURL('http://localhost:3000/') // Certifique-se de que este é o URL correto do seu React App
}

app.whenReady().then(()=>{
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
    console.log("MOVING")
    console.log("Mensagem enviada ao servidor:", message);
  } else {
    console.error("WebSocket não está conectado. Mensagem não enviada.");
  }
});

ipcMain.handle('set-userid', async (event, userid) => {
        USERID = userid
        console.log("USER ID! : "+ userid)
});
ipcMain.handle('get-userid', async (event) => { // Removi userid do argumento, pois USERID é global
        return USERID;
});


ipcMain.handle('login-check', async (event, user, pass) => {
  try {
    const characterRow = db.prepare('SELECT * FROM players WHERE user = ? and password = ?').get(user, pass);
    console.log("++++ " + characterRow);

    if (characterRow) {
      return { success: true, userId: characterRow.id };
    } else {
      return { success: false, message: 'Usuário ou senha inválidos.' };
    }

  } catch (error) {
    console.error(`[Main Process] Erro ao obter usuario e senha do SQLite:`, error);
    return { success: false, message: `Erro ao carregar dados: ${error.message}` };
  }
});
ipcMain.handle('request-character-data', async (event, characterId) => {
  console.log(`[Main Process] Carregando dados do personagem ${characterId} do SQLite.`);
  try {
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
            }
        };
    }

    const bioFields = JSON.parse(characterRow.bioFields);
    const essentialAttributes = JSON.parse(characterRow.essentialAttributes);

    const attributes = db.prepare('SELECT id,name, value, modifier FROM character_attributes WHERE character_id = ?').all(characterRow.id);
    const skills = db.prepare('SELECT name, modifier FROM character_skills WHERE character_id = ?').all(characterRow.id);
    const actions = db.prepare('SELECT * FROM character_actions WHERE character_id = ?').all(characterRow.id).map(actionRow => ({
        ...actionRow,
        properties: actionRow.properties ? JSON.parse(actionRow.properties) : [],
        isFavorite: Boolean(actionRow.isFavorite)
    }));

    const fullCharacterData = {
        id: characterRow.id,
        bioFields,
        myCharacterAttributes: attributes,
        mySkills: skills,
        essentialAttributes,
        actions
    };

    return { success: true, data: fullCharacterData };

  } catch (error) {
error(`[Main Process] Erro ao carregar personagem ${characterId} do SQLite:`, error);
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
    db.transaction(() => { // Garante atomicidade
      let actualCharacterId;

      if (characterId) { // Atualização de personagem existente
        db.prepare(`
          UPDATE characters
          SET bioFields = ?, essentialAttributes = ?
          WHERE id = ?
        `).run(
          JSON.stringify(characterData.bioFields),
          JSON.stringify(characterData.essentialAttributes),
          characterId
        );
        actualCharacterId = characterId;
      } else { // Novo personagem
        const insertResult = db.prepare(`
          INSERT INTO characters (bioFields, essentialAttributes)
          VALUES (?, ?)
        `).run(
          JSON.stringify(characterData.bioFields),
          JSON.stringify(characterData.essentialAttributes)
        );
        actualCharacterId = insertResult.lastInsertRowid;
      }

      // --- Salvamento de Atributos e Habilidades ---

      // 1. DELETAR todos os atributos existentes para este personagem
      db.prepare('DELETE FROM character_attributes WHERE character_id = ?').run(actualCharacterId);
      // 2. REINSERIR a lista completa de atributos que veio do frontend
      const insertAttribute = db.prepare(`INSERT INTO character_attributes (character_id, name, value, modifier) VALUES (?, ?, ?, ?)`);
      characterData.myCharacterAttributes.forEach(attr => {
        insertAttribute.run(actualCharacterId, attr.name, attr.value, attr.modifier);
      });

      // 1. DELETAR todas as habilidades existentes para este personagem
      db.prepare('DELETE FROM character_skills WHERE character_id = ?').run(actualCharacterId);
      // 2. REINSERIR a lista completa de habilidades que veio do frontend
      const insertSkill = db.prepare(`INSERT INTO character_skills (character_id, name, modifier) VALUES (?, ?, ?)`);
      characterData.mySkills.forEach(skill => {
        insertSkill.run(actualCharacterId, skill.name, skill.modifier);
      });

      // ... (Lógica de salvamento de ações, que já está configurada como delete e reinserir)
      db.prepare('DELETE FROM character_actions WHERE character_id = ?').run(actualCharacterId);
      const insertAction = db.prepare(`
        INSERT INTO character_actions (
            character_id, name, mainType, effectCategory, attackRange, target,
            damageDice, damageType, healingDice, utilityTitle, utilityValue,
            properties, level, castingTime, duration, school, saveDC, description, isFavorite
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      characterData.actions.forEach(action => {
        insertAction.run(
          actualCharacterId, action.name, action.mainType, action.effectCategory,
          action.attackRange || null, action.target || null, action.damageDice || null,
          action.damageType || null, action.healingDice || null, action.utilityTitle || null,
          action.utilityValue || null, JSON.stringify(action.properties || []),
          action.level || null, action.castingTime || null, action.duration || null,
          action.school || null, action.saveDC || null, action.description || null,
          action.isFavorite ? 1 : 0
        );
      });

      return { success: true, message: "Dados salvos com sucesso no SQLite!", newCharacterId: actualCharacterId };

    })(); // Executa a transação

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
    } else { // Nova ação (não tem ID ainda)
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