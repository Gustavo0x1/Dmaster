import React, { useState ,useRef,useEffect} from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import img from '../img/1.png'

type Message = {
  id: number;
  text: string;
  sender: 'user' | 'other';
};

const Chat: React.FC = () => {

  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: 'Olá! Como posso te ajudar?', sender: 'user' },
    { id: 2, text: 'Gostaria de saber mais sobre o projeto.', sender: 'other' },
  ]);

 const [newMessage, setNewMessage] = useState<string>('');
  const handleCommand = (command: string) => {
    if (command.startsWith("/roll")) {

    }
  };
  const handleSendMessage = (): void => {
    if (newMessage.trim() !== '') {
      if (newMessage.startsWith('/')) {
        handleCommand(newMessage);
      } else {
        setMessages((prevMessages) => [
          ...prevMessages,
          { id: prevMessages.length + 1, text: newMessage, sender: 'user' },
        ]);
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

      <div className="flex-grow-1 overflow-auto  p-3" style={{ overflowY: 'auto' }}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`d-flex mb-3 ${message.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
          >
            {message.sender === 'other' && (
              <div className="me-2">
                <img src={img} style={{width:50,height:50}}/>
           
           
              </div>
            )}
            <div
              className={`p-2 rounded shadow-sm ${
                message.sender === 'user' ? 'bg-primary text-white' : 'bg-secondary text-white'
              }`}
              style={{ maxWidth: '75%' }}
            >
              {message.text}
            </div>
          </div>
        ))}
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