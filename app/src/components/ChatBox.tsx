// ChatBox.tsx
import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import img from '../img/1.png'; // Avatar padrão para 'other' ou o bot
import BotImg from '../img/bot.png'
import DiceApp from './Dice';



// NOVO: Acessando ipcRenderer através do objeto 'electron' injetado
const electron = (window as any).electron;
const ipcRenderer = electron ? electron.ipcRenderer : null;


type Message = {
  id: number;
  text: string;
  sender: {
    id: string; // Um ID único para o remetente (ex: 'user', 'bot', 'john_doe', '-1' para sistema)
    name: string; // Nome do remetente
    avatar: string; // URL da imagem do avatar do remetente
  };
};

interface ChatProps {
  setSendChatMessage: (func: (message: string, senderId?: string, senderName?: string, senderAvatar?: string) => void) => void;
  userId:number;
}

// Constantes para o remetente padrão do sistema (Consistentes com Dice.tsx)
const DEFAULT_SYSTEM_SENDER_ID = '-1';
const DEFAULT_SYSTEM_SENDER_NAME = 'Sistema';
const DEFAULT_SYSTEM_SENDER_AVATAR = BotImg; // Avatar cinza para o sistema

const Chat: React.FC<ChatProps> = ({ setSendChatMessage,userId }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: 'Bem-vindo ao chat!', sender: { id: DEFAULT_SYSTEM_SENDER_ID, name: DEFAULT_SYSTEM_SENDER_NAME, avatar: DEFAULT_SYSTEM_SENDER_AVATAR } },
    { id: 2, text: 'Teste!.', sender: { id: 'john_doe', name: 'João Silva', avatar: img } },

  ]);
  const [showDiceApp, setShowDiceApp] = useState<boolean>(true); // Controla se o componente DiceApp é montado/desmontado
  const [newMessage, setNewMessage] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessageRef = useRef<((message: string, senderId?: string, senderName?: string, senderAvatar?: string) => void) | null>(null);

  const rollDiceInAppRef = useRef<((diceNotation: string, forcedValue?: number | 'random') => void) | null>(null);


  const sendMessage = useCallback((message: string, senderId?: string, senderName?: string, senderAvatar?: string): void => {
    const finalSenderId = senderId !== undefined ? senderId : DEFAULT_SYSTEM_SENDER_ID;
    const finalSenderName = senderName !== undefined ? senderName : DEFAULT_SYSTEM_SENDER_NAME;
    const finalSenderAvatar = senderAvatar !== undefined ? senderAvatar : DEFAULT_SYSTEM_SENDER_AVATAR;

    setMessages((prevMessages) => {
        return [
            ...prevMessages,
            { id: prevMessages.length + 1, text: message, sender: { id: finalSenderId, name: finalSenderName, avatar: finalSenderAvatar } },
        ];
    });
  }, []);

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  useLayoutEffect(() => {
    if (setSendChatMessage) {
      setSendChatMessage(() => sendMessage);
    }
  }, [setSendChatMessage, sendMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!electron) {
        console.warn('Objeto electron não encontrado. Ignorando listeners.');
        return;
   }
   console.log("HERE!")
   electron.on("chat-message",()=>console.log(1));

    return () => {
      electron.DoremoveListener("SyncTokenPosition",()=>console.log(1)); // CORREÇÃO: removeListener
    };
  }, [electron, sendMessage]);

  useEffect(() => {
    if (ipcRenderer) { 
 
      const handleDiceRollMessage = (event: Electron.IpcRendererEvent, message: string, senderId: string, senderName: string, senderAvatar: string) => {
        sendMessage(message, senderId, senderName, senderAvatar);
      };

      ipcRenderer.on('display-dice-roll-message', handleDiceRollMessage);

      // Cleanup: Remova o listener quando o componente for desmontado
      return () => {
        ipcRenderer.removeListener('display-dice-roll-message', handleDiceRollMessage);
      };
    }
  }, [sendMessage]);


  const handleCommand = (command: string) => {
    if (command.startsWith("/roll")) {
        const parts = command.split(' ');
        let diceNotation = "1d6";
        let forcedValue: number | 'random' | undefined = undefined;

        if (parts.length > 1) {
            diceNotation = parts[1];
        }

        forcedValue = 'random';
        if (parts.length > 2 && sendMessageRef.current) {
            sendMessageRef.current(`Ignorando valor forçado. Rolando ${diceNotation} aleatoriamente.`, 'user', 'Você', BotImg);
        }

        if (rollDiceInAppRef.current) {
            rollDiceInAppRef.current(diceNotation, forcedValue);

            let forceMessage = '';
            if (forcedValue !== undefined) {
                forceMessage = ` (Forçando ${forcedValue === 'random' ? 'aleatório' : forcedValue})`;
            }
            const initialRollMessage = `Comando: Rolando ${diceNotation}${forceMessage}...`;

            if (sendMessageRef.current) {
                sendMessageRef.current(initialRollMessage, 'user', 'Você', BotImg);
            }
            console.log("Comando /roll processado. Notificação e mensagem no chat gerenciadas pelo DiceApp.");

        } else {
            if (sendMessageRef.current) {
                sendMessageRef.current("Erro: Sistema de rolagem de dados não inicializado ou não pronto. Tente novamente em breve.", DEFAULT_SYSTEM_SENDER_ID, DEFAULT_SYSTEM_SENDER_NAME, DEFAULT_SYSTEM_SENDER_AVATAR);
            }
        }

    } else {
        if (sendMessageRef.current) {
            sendMessageRef.current(`Comando desconhecido: ${command}`, DEFAULT_SYSTEM_SENDER_ID, DEFAULT_SYSTEM_SENDER_NAME, DEFAULT_SYSTEM_SENDER_AVATAR);
        }
    }
  };

  const handleSendMessage = (): void => {

   electron.invoke("send-message", newMessage,userId);
   
    if (newMessage.trim() !== '') {
      if (newMessage.startsWith('/')) {
        handleCommand(newMessage);
      } else {
        if (sendMessageRef.current) {
            sendMessageRef.current(newMessage, 'user', 'Você', BotImg);
        }
      }
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="d-flex flex-column" style={{ height: 'calc(90vh)', overflow: 'hidden' }}>
      {showDiceApp && (
        <DiceApp
          onRollRequest={(rollFn) => { rollDiceInAppRef.current = rollFn; }}
          onSendChatMessage={sendMessage}
        />
      )}

      <div className="flex-grow-1 overflow-auto  p-3" style={{ overflowY: 'auto' }}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`d-flex mb-3 ${message.sender.id === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
          >
            {(message.sender.id !== 'user' && message.sender.id !== DEFAULT_SYSTEM_SENDER_ID) && (
              <div className="me-2 text-center">
                <img src={message.sender.avatar} style={{width:50,height:50, borderRadius: '50%'}} alt={message.sender.name}/>
                <small className="d-block text-muted" style={{fontSize: '0.7em'}}>{message.sender.name}</small>
              </div>
            )}
             {message.sender.id === DEFAULT_SYSTEM_SENDER_ID && (
              <div className="me-2 text-center">
                <img src={message.sender.avatar} style={{width:50,height:50, borderRadius: '50%'}} alt={message.sender.name}/>
                <small className="d-block text-muted" style={{fontSize: '0.7em'}}>{message.sender.name}</small>
              </div>
            )}
            <div
              className={`p-2 rounded shadow-sm ${
                message.sender.id === 'user' ? 'bg-primary text-white' : (message.sender.id === DEFAULT_SYSTEM_SENDER_ID ? 'bg-info text-white' : 'bg-secondary text-white')
              }`}
              style={{ maxWidth: '75%' }}
            >
              {message.text}
            </div>
            {message.sender.id === 'user' && (
              <div className="ms-2 text-center">
                <img src={message.sender.avatar} style={{width:50,height:50, borderRadius: '50%'}} alt={message.sender.name}/>
                <small className="d-block text-muted" style={{fontSize: '0.7em'}}>{message.sender.name}</small>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-top" >
        <div className="input-group">
          <textarea
            className="form-control"
            rows={1}
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{ resize: 'none' }}
          ></textarea>
          <button className="btn btn-primary" onClick={handleSendMessage}>
            Enviar
          </button>
        </div>
        <div className="d-flex justify-content-between mt-2">
          <button className="btn btn-success p-0">Função 1</button>
          <button className="btn btn-success p-0">Função 2</button>
          <button className="btn btn-success p-0">Função 3</button>
        </div>
      </div>
    </div>
  );
};

export default Chat;