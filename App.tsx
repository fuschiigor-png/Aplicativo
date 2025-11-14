import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { User } from 'firebase/auth';
import LoginPage from './components/LoginPage';
import { onAuthStateChangedListener, handleSignOut } from './services/authService';
import { Message, MessageSender, GlobalChatMessage as GlobalChatMessageType } from './types';
import ChatInput from './components/ChatInput';
import ChatMessage from './components/ChatMessage';
import GlobalChatMessage from './components/GlobalChatMessage';
import { generateChatResponse } from './services/geminiService';
import { getMessagesListener, sendGlobalMessage } from './services/chatService';


// Main App component: Manages authentication state and view routing
const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener((user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-blue-900">
        <div className="text-white text-xl animate-pulse">Carregando...</div>
      </div>
    );
  }

  return currentUser ? <MainDashboard user={currentUser} /> : <LoginPage />;
};

// MainDashboard: Handles navigation between Home, Chat, and Global Chat
const MainDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [view, setView] = useState<'home' | 'chat' | 'global-chat'>('home');

  const goToHome = () => setView('home');

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-blue-900 text-white font-sans">
      {view === 'home' && <HomePage user={user} setView={setView} />}
      {view === 'chat' && <ChatPage user={user} goToHome={goToHome} />}
      {view === 'global-chat' && <GlobalChatPage user={user} goToHome={goToHome} />}
    </div>
  );
};


// Reusable Header Component
const AppHeader: React.FC<{
  title: string;
  user: User;
  showBackButton?: boolean;
  onBackClick?: () => void;
}> = ({ title, user, showBackButton, onBackClick }) => {
  return (
    <header className="bg-gray-900/50 backdrop-blur-sm p-4 border-b border-blue-800/50 shadow-lg flex justify-between items-center relative">
      <div className="absolute left-4">
        {showBackButton && (
          <button
            onClick={onBackClick}
            className="flex items-center gap-2 text-blue-300 hover:text-blue-100 transition-colors duration-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 rounded-lg p-2"
            aria-label="Voltar para Home"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            <span>Home</span>
          </button>
        )}
      </div>

      <h1 className="text-xl md:text-2xl font-bold text-blue-300 mx-auto">
        {title}
      </h1>

      <div className="absolute right-4 flex items-center gap-4">
        <span className="text-sm text-gray-300 hidden sm:block truncate max-w-xs" title={user.email ?? ''}>{user.email}</span>
        <button
          onClick={handleSignOut}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-lg transition-colors duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500"
          aria-label="Sair"
        >
         Sair
        </button>
      </div>
    </header>
  );
};

// HomePage: The main landing page after login
const HomePage: React.FC<{ user: User; setView: (view: 'chat' | 'global-chat') => void }> = ({ user, setView }) => {
  return (
    <>
      <AppHeader title="Assistente Criativo" user={user} />
      <main className="flex flex-col items-center justify-center flex-1 p-6">
        <h2 className="text-4xl font-bold text-white mb-4">Bem-vindo!</h2>
        <p className="text-lg text-gray-300 mb-12">O que você gostaria de fazer hoje?</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          <div onClick={() => setView('chat')} className="bg-gray-800/60 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-blue-800/30 cursor-pointer hover:bg-gray-700/80 hover:border-blue-600 transition-all duration-300 text-center">
            <h3 className="text-2xl font-semibold text-blue-200 mb-2">Assistente de Chat</h3>
            <p className="text-gray-400">Converse com a IA para obter fatos rápidos e curiosidades.</p>
          </div>
          <div onClick={() => setView('global-chat')} className="bg-gray-800/60 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-blue-800/30 cursor-pointer hover:bg-gray-700/80 hover:border-blue-600 transition-all duration-300 text-center">
            <h3 className="text-2xl font-semibold text-blue-200 mb-2">Bate-papo Global</h3>
            <p className="text-gray-400">Converse com outros usuários em tempo real.</p>
          </div>
        </div>
      </main>
    </>
  );
};

// ChatPage: New page for the chat functionality
const ChatPage: React.FC<{ user: User; goToHome: () => void }> = ({ user, goToHome }) => {
  const [messages, setMessages] = useState<Message[]>([
    { sender: MessageSender.AI, text: "Olá! Sobre o que você gostaria de saber um fato curioso hoje?" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    setIsLoading(true);
    const newMessages: Message[] = [...messages, { sender: MessageSender.USER, text }];
    setMessages(newMessages);

    try {
      const aiResponse = await generateChatResponse(text);
      setMessages([...newMessages, { sender: MessageSender.AI, text: aiResponse }]);
    } catch (error) {
      console.error(error);
      setMessages([...newMessages, { sender: MessageSender.ERROR, text: "Desculpe, ocorreu um erro ao me comunicar com a IA. Tente novamente." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCuriosity = () => {
    handleSendMessage("Me conte uma curiosidade aleatória e interessante.");
  };

  return (
    <>
      <AppHeader title="Assistente de Chat" user={user} showBackButton onBackClick={goToHome} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col">
        <div className="flex-1 space-y-6 max-w-4xl mx-auto w-full">
          {messages.map((msg, index) => (
            <ChatMessage key={index} message={msg} />
          ))}
          {isLoading && <ChatMessage message={{ sender: MessageSender.AI, text: "Digitando..." }} />}
          <div ref={chatEndRef} />
        </div>
        <div className="mt-auto">
          <ChatInput onSendMessage={handleSendMessage} onSendCuriosity={handleSendCuriosity} isLoading={isLoading} />
        </div>
      </main>
    </>
  );
};


// GlobalChatPage: New page for the real-time global chat
const GlobalChatPage: React.FC<{ user: User; goToHome: () => void }> = ({ user, goToHome }) => {
    const [messages, setMessages] = useState<GlobalChatMessageType[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsubscribe = getMessagesListener((fetchedMessages) => {
            setMessages(fetchedMessages);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !user.email) return;

        setIsLoading(true);
        try {
            await sendGlobalMessage(user.uid, user.email, newMessage);
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
            // Optionally, show an error message to the user
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <AppHeader title="Bate-papo Global" user={user} showBackButton onBackClick={goToHome} />
            <main className="flex-1 flex flex-col overflow-hidden p-4 md:p-6">
                <div className="flex-1 space-y-4 overflow-y-auto max-w-4xl mx-auto w-full p-2">
                    {messages.map((msg) => (
                        <GlobalChatMessage key={msg.id} message={msg} currentUser={user} />
                    ))}
                    <div ref={chatEndRef} />
                </div>
                <div className="mt-auto pt-4 border-t border-blue-800/50">
                    <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-3">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Digite sua mensagem..."
                            disabled={isLoading}
                            className="flex-1 bg-gray-700/80 border border-gray-600 rounded-full py-3 px-5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Caixa de mensagem"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !newMessage.trim()}
                            className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
                            aria-label="Enviar mensagem"
                        >
                            <svg className="w-6 h-6 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                        </button>
                    </form>
                </div>
            </main>
        </>
    );
};

export default App;