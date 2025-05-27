// ChatBox.tsx
import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import img from '../img/1.png'; // Avatar padrão para 'other' ou o bot
import DiceApp from './Dice';

declare global {
  interface Window {
    DiceBoxInstance: any;
  }
}

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
}

// Constantes para o remetente padrão do sistema (Consistentes com Dice.tsx)
const DEFAULT_SYSTEM_SENDER_ID = '-1';
const DEFAULT_SYSTEM_SENDER_NAME = 'Sistema';
const DEFAULT_SYSTEM_SENDER_AVATAR = 'https://via.placeholder.com/50/808080/FFFFFF?text=SYS'; // Avatar cinza para o sistema

const Chat: React.FC<ChatProps> = ({ setSendChatMessage }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: 'Bem-vindo ao chat!', sender: { id: DEFAULT_SYSTEM_SENDER_ID, name: DEFAULT_SYSTEM_SENDER_NAME, avatar: DEFAULT_SYSTEM_SENDER_AVATAR } },
    { id: 2, text: 'Gostaria de saber mais sobre o projeto.', sender: { id: 'john_doe', name: 'João Silva', avatar: 'https://via.placeholder.com/50/FF5733/FFFFFF?text=JS' } },
    { id: 3, text: 'Olá! Em que posso ajudar?', sender: { id: 'user', name: 'Você', avatar: 'https://via.placeholder.com/50/3366FF/FFFFFF?text=VC' } },
  ]);
  const [showDiceApp, setShowDiceApp] = useState<boolean>(true); // Controla se o componente DiceApp é montado/desmontado
  const [newMessage, setNewMessage] = useState<string>('');
  // REMOVIDO: isDiceContainerVisible não é mais gerenciado aqui

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
            sendMessageRef.current(`Ignorando valor forçado. Rolando ${diceNotation} aleatoriamente.`, 'user', 'Você', 'https://via.placeholder.com/50/3366FF/FFFFFF?text=VC');
        }

        if (rollDiceInAppRef.current) {
            // REMOVIDO: setIsDiceContainerVisible(true); e o setTimeout para esconder

            rollDiceInAppRef.current(diceNotation, forcedValue); // O DiceApp agora gerencia sua própria visibilidade

            let forceMessage = '';
            if (forcedValue !== undefined) {
                forceMessage = ` (Forçando ${forcedValue === 'random' ? 'aleatório' : forcedValue})`;
            }
            const initialRollMessage = `Comando: Rolando ${diceNotation}${forceMessage}...`;

            if (sendMessageRef.current) {
                sendMessageRef.current(initialRollMessage, 'user', 'Você', 'https://via.placeholder.com/50/3366FF/FFFFFF?text=VC');
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
    if (newMessage.trim() !== '') {
      if (newMessage.startsWith('/')) {
        handleCommand(newMessage);
      } else {
        if (sendMessageRef.current) {
            sendMessageRef.current(newMessage, 'user', 'Você', 'https://via.placeholder.com/50/3366FF/FFFFFF?text=VC');
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
      {/* O DiceApp agora renderiza sua própria div #dice-container */}
      {showDiceApp && (
        <DiceApp
          onRollRequest={(rollFn) => { rollDiceInAppRef.current = rollFn; }}
          onSendChatMessage={sendMessage}
          // REMOVIDO: isVisible prop
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