import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { User } from 'firebase/auth';
import LoginPage from './components/LoginPage';
import { onAuthStateChangedListener, handleSignOut } from './services/authService';
import { getUserImages, processImage } from './services/videoService';
import { ImageAnalysis, Message, MessageSender } from './types';
import ChatInput from './components/ChatInput';
import ChatMessage from './components/ChatMessage';
import { generateChatResponse } from './services/geminiService';

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

// MainDashboard: Handles navigation between Home, Image Analyzer, and Chat
const MainDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [view, setView] = useState<'home' | 'image-analyzer' | 'chat'>('home');

  const goToHome = () => setView('home');

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-blue-900 text-white font-sans">
      {view === 'home' && <HomePage user={user} setView={setView} />}
      {view === 'image-analyzer' && <ImageAnalysisPage user={user} goToHome={goToHome} />}
      {view === 'chat' && <ChatPage user={user} goToHome={goToHome} />}
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
const HomePage: React.FC<{ user: User; setView: (view: 'image-analyzer' | 'chat') => void }> = ({ user, setView }) => {
  return (
    <>
      <AppHeader title="Assistente Criativo" user={user} />
      <main className="flex flex-col items-center justify-center flex-1 p-6">
        <h2 className="text-4xl font-bold text-white mb-4">Bem-vindo!</h2>
        <p className="text-lg text-gray-300 mb-12">O que você gostaria de fazer hoje?</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          <div onClick={() => setView('image-analyzer')} className="bg-gray-800/60 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-blue-800/30 cursor-pointer hover:bg-gray-700/80 hover:border-blue-600 transition-all duration-300 text-center">
            <h3 className="text-2xl font-semibold text-blue-200 mb-2">Analisador de Imagem</h3>
            <p className="text-gray-400">Envie uma imagem e receba insights detalhados gerados por IA.</p>
          </div>
          <div onClick={() => setView('chat')} className="bg-gray-800/60 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-blue-800/30 cursor-pointer hover:bg-gray-700/80 hover:border-blue-600 transition-all duration-300 text-center">
            <h3 className="text-2xl font-semibold text-blue-200 mb-2">Assistente de Chat</h3>
            <p className="text-gray-400">Converse com a IA para obter fatos rápidos e curiosidades.</p>
          </div>
        </div>
      </main>
    </>
  );
};

// ImageAnalysisPage: The existing image analysis feature, now as a separate page
const ImageAnalysisPage: React.FC<{ user: User; goToHome: () => void }> = ({ user, goToHome }) => {
  const [images, setImages] = useState<ImageAnalysis[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = getUserImages(user.uid, (fetchedImages) => {
      setImages(fetchedImages as ImageAnalysis[]);
    });
    return () => unsubscribe();
  }, [user]);

  const handleProcessImage = async (imageFile: File, title: string) => {
    setIsProcessing(true);
    setError(null);
    setProgressMessage("Iniciando processo...");
    try {
      await processImage(user.uid, imageFile, title, setProgressMessage);
    } catch (err) {
      console.error(err);
      setError("Ocorreu um erro ao processar a imagem. Tente novamente.");
    } finally {
      setIsProcessing(false);
      setProgressMessage('');
    }
  };

  return (
    <>
      <AppHeader title="Analisador de Imagem" user={user} showBackButton onBackClick={goToHome} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
        <ImageUploadForm onSubmit={handleProcessImage} isProcessing={isProcessing} progressMessage={progressMessage} error={error} />
        <HistoryList images={images} />
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


// ImageUploadForm component
const ImageUploadForm: React.FC<{
  onSubmit: (imageFile: File, title: string) => void;
  isProcessing: boolean;
  progressMessage: string;
  error: string | null;
}> = ({ onSubmit, isProcessing, progressMessage, error }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (imageFile && title && !isProcessing) {
      onSubmit(imageFile, title);
      setTitle('');
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-gray-800/60 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-blue-800/30">
      <h2 className="text-2xl font-semibold mb-4 text-blue-200">Analisar Nova Imagem</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">Título da Imagem</label>
          <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Pôr do sol na praia" required className="w-full bg-gray-700/80 border border-gray-600 rounded-md py-2 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label htmlFor="imageFile" className="block text-sm font-medium text-gray-300 mb-1">Arquivo de Imagem</label>
          <input id="imageFile" type="file" accept="image/*" ref={fileInputRef} onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)} required className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition" />
        </div>
        <button type="submit" disabled={isProcessing || !imageFile || !title} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 disabled:bg-gray-600 disabled:opacity-75 disabled:cursor-not-allowed transition-all">
          {isProcessing ? 'Processando...' : 'Enviar e Analisar'}
        </button>
        {isProcessing && <p className="text-center text-blue-300 animate-pulse mt-2">{progressMessage}</p>}
        {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
      </form>
    </div>
  );
};

// HistoryList component
const HistoryList: React.FC<{ images: ImageAnalysis[] }> = ({ images }) => {
  if (images.length === 0) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-semibold text-blue-200 mb-2">Histórico de Análises</h2>
        <p className="text-gray-400">Você ainda não analisou nenhuma imagem.</p>
      </div>
    );
  }
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4 text-blue-200">Histórico de Análises</h2>
      <div className="space-y-4">
        {images.map(image => <HistoryItem key={image.id} image={image} />)}
      </div>
    </div>
  );
};

// HistoryItem component
const HistoryItem: React.FC<{ image: ImageAnalysis }> = ({ image }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const formattedDate = image.createdAt ? new Date(image.createdAt.seconds * 1000).toLocaleString('pt-BR') : 'Data indisponível';

  const statusPill = {
    completed: 'bg-green-600/80 text-green-100',
    processing: 'bg-yellow-600/80 text-yellow-100 animate-pulse',
    failed: 'bg-red-600/80 text-red-100',
  }[image.status];

  return (
    <div className="bg-gray-800/60 backdrop-blur-sm rounded-lg shadow-md border border-blue-800/30 overflow-hidden">
      <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div>
          <h3 className="font-bold text-lg text-white">{image.title}</h3>
          <p className="text-xs text-gray-400">{formattedDate}</p>
        </div>
        <div className="flex items-center gap-4 mt-2 md:mt-0">
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusPill}`}>{image.status}</span>
          <svg className={`w-6 h-6 text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {isExpanded && image.status === 'completed' && (
        <div className="p-4 border-t border-blue-800/30 bg-gray-900/50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <img src={image.imageUrl} alt={image.title} className="w-full rounded-lg" />
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-blue-200 mb-2">Insights</h4>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{image.insights}</p>
              </div>
              <div>
                <h4 className="font-semibold text-blue-200 mb-2">Descrição</h4>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{image.transcript}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {isExpanded && image.status !== 'completed' && (
        <div className="p-4 text-center border-t border-blue-800/30 bg-gray-900/50">
          <p className="text-gray-400">Os detalhes estarão disponíveis quando o processamento for concluído.</p>
        </div>
      )}
    </div>
  );
};


export default App;
