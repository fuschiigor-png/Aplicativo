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

// MainDashboard: Handles navigation between Home, Chat, and other views
type View = 'home' | 'types' | 'models' | 'chat' | 'global-chat';

const MainDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [view, setView] = useState<View>('home');

  const goToHome = () => setView('home');

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-blue-900 text-white font-sans">
      {view === 'home' && <HomePage user={user} setView={setView} />}
      {view === 'types' && <MachineTypesPage user={user} goToHome={goToHome} />}
      {view === 'models' && <MachineModelsPage user={user} goToHome={goToHome} />}
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
const HomePage: React.FC<{ user: User; setView: (view: View) => void }> = ({ user, setView }) => {
  return (
    <>
      <AppHeader title="Catálogo de Máquinas de Bordado" user={user} />
      <main className="flex flex-col items-center justify-center flex-1 p-6">
        <h2 className="text-4xl font-bold text-white mb-4">Bem-vindo!</h2>
        <p className="text-lg text-gray-300 mb-12">Explore nosso catálogo ou converse com nosso assistente.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          <div onClick={() => setView('types')} className="bg-gray-800/60 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-blue-800/30 cursor-pointer hover:bg-gray-700/80 hover:border-blue-600 transition-all duration-300 text-center">
            <h3 className="text-2xl font-semibold text-blue-200 mb-2">Tipos de Máquinas</h3>
            <p className="text-gray-400">Navegue pelas categorias de máquinas.</p>
          </div>
          <div onClick={() => setView('models')} className="bg-gray-800/60 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-blue-800/30 cursor-pointer hover:bg-gray-700/80 hover:border-blue-600 transition-all duration-300 text-center">
            <h3 className="text-2xl font-semibold text-blue-200 mb-2">Modelos e Preços</h3>
            <p className="text-gray-400">Veja todos os modelos disponíveis.</p>
          </div>
          <div onClick={() => setView('chat')} className="bg-gray-800/60 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-blue-800/30 cursor-pointer hover:bg-gray-700/80 hover:border-blue-600 transition-all duration-300 text-center">
            <h3 className="text-2xl font-semibold text-blue-200 mb-2">Assistente de Chat</h3>
            <p className="text-gray-400">Tire suas dúvidas sobre bordados com a IA.</p>
          </div>
          <div onClick={() => setView('global-chat')} className="bg-gray-800/60 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-blue-800/30 cursor-pointer hover:bg-gray-700/80 hover:border-blue-600 transition-all duration-300 text-center">
            <h3 className="text-2xl font-semibold text-blue-200 mb-2">Bate-papo Global</h3>
            <p className="text-gray-400">Converse com outros entusiastas.</p>
          </div>
        </div>
      </main>
    </>
  );
};

// MachineTypesPage: Displays categories of embroidery machines
const MachineTypesPage: React.FC<{ user: User; goToHome: () => void }> = ({ user, goToHome }) => {
    const machineTypes = [
        { name: 'Doméstica', description: 'Ideal para iniciantes e projetos caseiros, com interfaces amigáveis e designs compactos.' },
        { name: 'Semi-industrial', description: 'Um passo à frente, oferecendo mais velocidade e durabilidade para pequenos negócios.' },
        { name: 'Industrial', description: 'Para produção em larga escala, com múltiplas agulhas e alta velocidade de operação.' },
        { name: 'Portátil', description: 'Leves e fáceis de transportar, perfeitas para eventos, feiras ou aulas de bordado.' },
    ];

    return (
        <>
            <AppHeader title="Tipos de Máquinas" user={user} showBackButton onBackClick={goToHome} />
            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                    {machineTypes.map(type => (
                        <div key={type.name} className="bg-gray-800/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-blue-800/30">
                            <h3 className="text-2xl font-bold text-blue-200 mb-3">{type.name}</h3>
                            <p className="text-gray-300">{type.description}</p>
                        </div>
                    ))}
                </div>
            </main>
        </>
    );
};

// MachineModelsPage: Displays specific models and prices
const MachineModelsPage: React.FC<{ user: User; goToHome: () => void }> = ({ user, goToHome }) => {
    const machineModels = [
        { name: 'Brother PE535', type: 'Doméstica', price: 'R$ 2.800,00', description: 'Ótima para iniciantes, com área de bordado de 10x10cm e 80 designs inclusos.' },
        { name: 'Singer EM200', type: 'Doméstica', price: 'R$ 3.200,00', description: 'Possui 200 designs de bordado e 6 opções de fontes, com área de 26x15cm.' },
        { name: 'Janome MC500E', type: 'Semi-industrial', price: 'R$ 8.500,00', description: 'Área de bordado de 28x20cm, velocidade de até 860 ppm e tela de toque colorida.' },
        { name: 'Brother PR680W', type: 'Industrial', price: 'R$ 45.000,00', description: 'Máquina de 6 agulhas, ideal para produção, com conexão wireless e câmera de posicionamento.' },
        { name: 'Elna eXpressive 830', type: 'Semi-industrial', price: 'R$ 12.000,00', description: 'Ampla área de trabalho e braço livre para bordar em peças fechadas.' },
    ];

    return (
        <>
            <AppHeader title="Modelos e Preços" user={user} showBackButton onBackClick={goToHome} />
            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-5xl mx-auto space-y-4">
                    {machineModels.map(model => (
                        <div key={model.name} className="bg-gray-800/70 backdrop-blur-sm p-5 rounded-xl shadow-lg border border-blue-800/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-blue-200">{model.name}</h3>
                                <p className="text-sm text-gray-400 mb-2">{model.type}</p>
                                <p className="text-gray-300 text-base">{model.description}</p>
                            </div>
                            <div className="text-lg font-semibold text-green-300 bg-green-900/50 px-4 py-2 rounded-lg whitespace-nowrap">
                                {model.price}
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </>
    );
};


// ChatPage: New page for the chat functionality
const ChatPage: React.FC<{ user: User; goToHome: () => void }> = ({ user, goToHome }) => {
  const [messages, setMessages] = useState<Message[]>([
    { sender: MessageSender.AI, text: "Olá! Sou seu assistente de máquinas de bordado. Em que posso ajudar?" },
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
    handleSendMessage("Me fale um fato interessante sobre bordado.");
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