// src/components/ChatBox.tsx
import React, { useState, useRef, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import img from '../img/1.png';
import BotImg from '../img/bot.png'
import DiceApp from './Dice';

import { useChat, Message, ActionCardData } from '../components/contexts/ChatContext'; // Importe do seu ChatContext


interface ChatProps {
  USERID: number; // USERID é passado do Layout para o ChatBox
}

interface ActionCardDisplayProps {
  data: ActionCardData;
}


const DEFAULT_SYSTEM_SENDER_ID = -1;
const DEFAULT_SYSTEM_SENDER_NAME = 'Sistema';
const DEFAULT_SYSTEM_SENDER_AVATAR = BotImg;

const ActionCardDisplay: React.FC<ActionCardDisplayProps> = ({ data }) => {
  return (
    <div className="card text-white bg-dark-subtle border-secondary mb-2" style={{ maxWidth: '300px' }}>
      <div className="card-header text-highlight-warning fw-bold small">
        Ação: {data.name}
      </div>
      <div className="card-body p-2 small">
        <p className="card-text mb-1"><strong className="text-secondary-muted">Tipo:</strong> {data.type}</p>
        {data.effectCategory && <p className="card-text mb-1"><strong className="text-secondary-muted">Categoria:</strong> {data.effectCategory}</p>}
        {data.description && <p className="card-text mb-1"><strong className="text-secondary-muted">Descrição:</strong> {data.description}</p>}
        {/* Renderiza outros dados de forma dinâmica */}
        {Object.entries(data).map(([key, value]) => {
          if (!['name', 'type', 'effectCategory', 'description'].includes(key) && value) {
            return (
              <p key={key} className="card-text mb-1">
                <span className="d-flex">
                  <strong className="text-secondary-muted">{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {value}
                </span>
              </p>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};


const Chat: React.FC<ChatProps> = ({ USERID }) => {
  // AQUI: useChat() consome o contexto e o estado de mensagens e funções
  const { messages, sendChatMessage, parseActionCardString, receiveHelloWorld } = useChat(); // Adicione receiveHelloWorld aqui

  const [showDiceApp, setShowDiceApp] = useState<boolean>(true);
  const [newMessage, setNewMessage] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const rollDiceInAppRef = useRef<((diceNotation: string, forcedValue?: number | 'random') => void) | null>(null);

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
        if (parts.length > 2) {
            sendChatMessage(`Ignorando valor forçado. Rolando ${diceNotation} aleatoriamente.`, USERID, 'Você', BotImg);
        }

        if (rollDiceInAppRef.current) {
            rollDiceInAppRef.current(diceNotation, forcedValue);

            const initialRollMessage = `Comando: Rolando ${diceNotation}...`;

            sendChatMessage(initialRollMessage, USERID, 'Você', BotImg);
            console.log("Comando /roll processado. Notificação e mensagem no chat gerenciadas pelo DiceApp.");

        } else {
            sendChatMessage("Erro: Sistema de rolagem de dados não inicializado ou não pronto. Tente novamente em breve.", DEFAULT_SYSTEM_SENDER_ID, DEFAULT_SYSTEM_SENDER_NAME, DEFAULT_SYSTEM_SENDER_AVATAR);
        }

    } else {
        sendChatMessage(`Comando desconhecido: ${command}`, DEFAULT_SYSTEM_SENDER_ID, DEFAULT_SYSTEM_SENDER_NAME, DEFAULT_SYSTEM_SENDER_AVATAR);
    }
  };

  const handleSendMessage = (): void => {
    if (newMessage.trim() === '') {
      return;
    }

    if (newMessage.startsWith('/')) {
      handleCommand(newMessage);
    } else {
      sendChatMessage(newMessage, USERID, 'Você', BotImg);
    }
    setNewMessage('');
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
          onSendChatMessage={sendChatMessage}
        />
      )}

      <div className="flex-grow-1 overflow-auto  p-3" style={{ overflowY: 'auto' }}>
        {/* Messages são agora recebidas do useChat() */}
        {messages.map((message: Message) => {
          if (!message) return null; // Proteção extra contra mensagens undefined
          return (
            <div
              key={message.id + '-' + message.timestamp} // Chave combinada para evitar colisões
              className={`d-flex mb-3 ${message.sender.id === USERID ? 'justify-content-end' : 'justify-content-start'}`}
            >
              {(message.sender.id !== USERID && message.sender.id !== DEFAULT_SYSTEM_SENDER_ID) && (
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
              {/* Renderiza o card ou o texto da mensagem */}
              {message.isActionCard && message.actionCardData ? (
                <ActionCardDisplay data={message.actionCardData} />
              ) : (
                <div
                  className={`p-2 rounded shadow-sm ${
                    message.sender.id === USERID ? 'bg-primary text-white' : (message.sender.id === DEFAULT_SYSTEM_SENDER_ID ? 'bg-info text-white' : 'bg-secondary text-white')
                  }`}
                  style={{ maxWidth: '75%' }}
                >
                  {message.text}
                </div>
              )}
              {message.sender.id === USERID && (
                <div className="ms-2 text-center">
                  <img src={message.sender.avatar} style={{width:50,height:50, borderRadius: '50%'}} alt={message.sender.name}/>
                  <small className="d-block text-muted" style={{fontSize: '0.7em'}}>{message.sender.name}</small>
                </div>
              )}
            </div>
          );
        })}
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
          <button className="btn btn-success p-0" onClick={receiveHelloWorld}>Função 1 (Hello World)</button> {/* Botão para o Hello World! */}
          <button className="btn btn-success p-0">Função 2</button>
          <button className="btn btn-success p-0">Função 3</button>
        </div>
      </div>
    </div>
  );
};

export default Chat;