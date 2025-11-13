
import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageSender } from './types';
import { sendMessageToAI, initializeChat } from './services/geminiService';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';

const LOCAL_STORAGE_KEY = 'chatHistory';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const savedMessages = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedMessages && JSON.parse(savedMessages).length > 0) {
        return JSON.parse(savedMessages);
      }
    } catch (error) {
      console.error("Failed to load messages from local storage:", error);
    }
    return [
      {
        id: `ai-welcome-${Date.now()}`,
        sender: MessageSender.AI,
        text: "Olá! Sobre qual tópico você gostaria de uma curiosidade hoje?",
      },
    ];
  });

  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      // Initialize chat with history from local storage
      initializeChat(messages);
    } catch (error) {
      console.error("Failed to initialize chat:", error);
      const errorMessage: Message = {
        id: `error-init-${Date.now()}`,
        sender: MessageSender.ERROR,
        text: "Não foi possível conectar ao assistente. Por favor, verifique a configuração da sua chave de API.",
      };
      if (!messages.some(m => m.id.startsWith('error-init'))) {
         setMessages(prev => [...prev, errorMessage]);
      }
    }
  }, []); // Run only on initial mount

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error("Failed to save messages to local storage:", error);
    }
  }, [messages]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleSendMessage = async (inputText: string) => {
    if (isLoading || !inputText.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: MessageSender.USER,
      text: inputText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const aiResponseText = await sendMessageToAI(inputText);
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        sender: MessageSender.AI,
        text: aiResponseText,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error fetching AI response:", error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        sender: MessageSender.ERROR,
        text: "Oops! Tive um problema para processar sua solicitação. Vamos tentar de novo?",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCuriosity = () => {
    handleSendMessage("Me conte uma curiosidade aleatória");
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-blue-900 text-white font-sans">
      <header className="bg-gray-900/50 backdrop-blur-sm p-4 border-b border-blue-800/50 shadow-lg">
        <h1 className="text-xl md:text-2xl font-bold text-center text-blue-300">
          Assistente Criativo de Fatos
        </h1>
      </header>

      <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="flex justify-start items-center space-x-2 pl-12">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex-shrink-0"></div>
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
            </div>
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 left-0 right-0">
        <ChatInput 
          onSendMessage={handleSendMessage} 
          onSendCuriosity={handleSendCuriosity}
          isLoading={isLoading} 
        />
      </footer>
    </div>
  );
};

export default App;