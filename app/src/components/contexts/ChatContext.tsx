// src/contexts/ChatContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
  useMemo
} from "react";
import img from '../../img/1.png'; // Avatar padrão para usuários, se necessário
import BotImg from '../../img/bot.png' // Avatar padrão para o sistema/bot

const electron = (window as any).electron;

export type Message = {
  id: number;
  text: string;
  sender: {
    id: number;
    name: string;
    avatar: string;
  };
  isActionCard?: boolean;
  actionCardData?: ActionCardData;
  timestamp?: number;
};

export interface ActionCardData {
  name: string;
  type: string;
  effectCategory?: string;
  description?: string;
  [key: string]: string | undefined;
}

interface ChatContextType {
  messages: Message[];
  sendChatMessage: (
    message: string,
    senderId?: number,
    senderName?: string,
    senderAvatar?: string
  ) => Promise<void>;
  parseActionCardString: (text: string) => ActionCardData | null;
  receiveHelloWorld: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const DEFAULT_SYSTEM_SENDER_ID = -1;
const DEFAULT_SYSTEM_SENDER_NAME = 'Sistema';
const DEFAULT_SYSTEM_SENDER_AVATAR = BotImg;

const parseActionCardString = (text: string): ActionCardData | null => {
    const pattern = /^__actioncard:\s*(.*)$/;
    const match = text.match(pattern);

    if (!match) {
      return null;
    }

    const dataString = match[1];
    const pairs = dataString.split(',').map(s => s.trim());
    const data: ActionCardData = { name: '', type: '' };

    pairs.forEach(pair => {
      const [key, ...values] = pair.split(':').map(s => s.trim());
      const value = values.join(':');

      if (key && value) {
        if (key === 'name') data.name = value;
        else if (key === 'type') data.type = value;
        else if (key === 'effectCategory') data.effectCategory = value;
        else if (key === 'description') data.description = value;
        else data[key] = value;
      }
    });

    if (data.name && data.type) {
      return data;
    }
    return null;
};


export const ChatProvider: React.FC<{ children: React.ReactNode; USERID: number; }> = ({ children, USERID }) => {
  const [messages, setMessages] = useState<Message[]>([]);

  const formatIncomingMessage = useCallback((msg: any): Message => {
    // Adicione um log ou uma verificação aqui para garantir que 'msg' não é undefined
    if (!msg) {
      console.error("formatIncomingMessage received undefined or null msg:", msg);
      // Retorne uma mensagem padrão ou lance um erro para depuração
      return {
        id: Date.now() + Math.random(),
        text: "Erro: Mensagem recebida inválida.",
        sender: { id: DEFAULT_SYSTEM_SENDER_ID, name: DEFAULT_SYSTEM_SENDER_NAME, avatar: DEFAULT_SYSTEM_SENDER_AVATAR },
        timestamp: Date.now()
      };
    }
    return {
      id: msg.id || Date.now() + Math.random(),
      text: msg.message || msg.text || '',
      sender: {
        id: msg.id || DEFAULT_SYSTEM_SENDER_ID, // Use msg.id do servidor, que é o senderId original
        name: msg.senderName || `Usuário ${msg.id}` || DEFAULT_SYSTEM_SENDER_NAME,
        avatar: msg.senderAvatar || DEFAULT_SYSTEM_SENDER_AVATAR
      },
      isActionCard: !!parseActionCardString(msg.message || msg.text || ''),
      actionCardData: parseActionCardString(msg.message || msg.text || '') || undefined,
      timestamp: msg.timestamp || Date.now()
    };
  }, []);

  const addMessageToState = useCallback((messageData: Message) => {
    setMessages(prevMessages => {
      const isDuplicate = prevMessages.some(
        (msg) => msg.id === messageData.id && msg.timestamp === messageData.timestamp
      );
      if (isDuplicate) {
        console.log("Mensagem duplicada detectada e ignorada:", messageData.text);
        return prevMessages;
      }

      const newMessages = [...prevMessages, messageData];
      return newMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    });
  }, []);

  const handleReceiveChatMessage = useCallback((messageFromMain: any) => {
    console.log("new-chat-message recebido do Main Process:", messageFromMain);
    const incomingMessage = formatIncomingMessage(messageFromMain);
    addMessageToState(incomingMessage);
  }, [formatIncomingMessage, addMessageToState]);

  const handleReceiveChatHistory = useCallback((historyData: any[]) => {
    console.log("Histórico recebido:", historyData);
    if (!Array.isArray(historyData)) {
      console.warn("Histórico de chat recebido não é um array:", historyData);
      return;
    }
    const formattedHistory = historyData.map(formatIncomingMessage);
    setMessages(formattedHistory.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)));
  }, [formatIncomingMessage]);

  const sendChatMessage = useCallback(async (
    messageText: string,
    senderId?: number,
    senderName?: string,
    senderAvatar?: string
  ): Promise<void> => {
    if (!electron || !electron.invoke) {
      console.warn('Electron API (invoke) não disponível para enviar mensagem.');
      return;
    }

    const finalSenderId = senderId !== undefined ? senderId : USERID;
    const finalSenderName = senderName !== undefined ? senderName : 'Você';
    const finalSenderAvatar = senderAvatar !== undefined ? senderAvatar : BotImg;

    const localMessage: Message = {
      id: Date.now(),
      text: messageText,
      sender: {
        id: finalSenderId,
        name: finalSenderName,
        avatar: finalSenderAvatar
      },
      isActionCard: !!parseActionCardString(messageText),
      actionCardData: parseActionCardString(messageText) || undefined,
      timestamp: Date.now()
    };

    addMessageToState(localMessage);

    try {
      await electron.invoke("send-message", messageText, finalSenderId, finalSenderName, finalSenderAvatar);
    } catch (error) {
      console.error("Erro na comunicação IPC ao enviar mensagem:", error);
    }
  }, [USERID, addMessageToState]);

  const receiveHelloWorld = useCallback(() => {
    const helloMessage: Message = {
      id: Date.now() + Math.random(),
      text: "Hello World!",
      sender: {
        id: DEFAULT_SYSTEM_SENDER_ID,
        name: DEFAULT_SYSTEM_SENDER_NAME,
        avatar: DEFAULT_SYSTEM_SENDER_AVATAR
      },
      timestamp: Date.now()
    };
    addMessageToState(helloMessage);
    console.log("Mensagem 'Hello World!' adicionada.");
  }, [addMessageToState]);

  // Função para requisitar o histórico de chat do processo principal
  const requestChatHistory = useCallback(async () => {
    if (electron && electron.invoke) {
      try {
        console.log("Requisitando histórico de chat do Main Process...");
        await electron.invoke("request-chat-history");
      } catch (error) {
        console.error("Erro ao requisitar histórico de chat:", error);
      }
    }
  }, []);

  // Configurar listeners IPC para novas mensagens e histórico
  useEffect(() => {
    console.log("ChatProvider useEffect para listeners IPC ativado.");

    if (!electron || !electron.on) {
      console.warn('Electron API (on) não encontrada. Não será possível receber mensagens.');
      return;
    }

    const unsubscribeNewMessage = electron.on("new-chat-message", handleReceiveChatMessage);
    const unsubscribeChatHistory = electron.on("chat-history", handleReceiveChatHistory);

    // Quando o componente monta e os listeners estão prontos, requisita o histórico
    requestChatHistory();

    return () => {
      console.log("Removendo listeners de chat do ChatContext.");
      if (unsubscribeNewMessage) unsubscribeNewMessage();
      if (unsubscribeChatHistory) unsubscribeChatHistory();
      if (electron.DoremoveListener) {
          electron.DoremoveListener("new-chat-message", handleReceiveChatMessage);
          electron.DoremoveListener("chat-history", handleReceiveChatHistory);
      } else if ((electron as any).off) {
          (electron as any).off("new-chat-message", handleReceiveChatMessage);
          (electron as any).off("chat-history", handleReceiveChatHistory);
      }
    };
  }, [handleReceiveChatMessage, handleReceiveChatHistory, requestChatHistory]); // Adicionar requestChatHistory às dependências

  const contextValue = useMemo(() => ({
    messages,
    sendChatMessage,
    parseActionCardString,
    receiveHelloWorld
  }), [messages, sendChatMessage, receiveHelloWorld]);

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};