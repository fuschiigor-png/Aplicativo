import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { User } from 'firebase/auth';
import LoginPage from './components/LoginPage';
import { onAuthStateChangedListener, handleSignOut } from './services/authService';
import { Message, MessageSender, GlobalChatMessage as GlobalChatMessageType, ExchangeRateHistoryEntry } from './types';
import ChatInput from './components/ChatInput';
import ChatMessage from './components/ChatMessage';
import GlobalChatMessage from './components/GlobalChatMessage';
import { generateChatResponse, getExchangeRate } from './services/geminiService';
import { getMessagesListener, sendGlobalMessage, getExchangeRateConfigListener, getExchangeRateHistoryListener, updateExchangeRateConfig } from './services/chatService';


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
type View = 'home' | 'types' | 'models' | 'chat' | 'global-chat' | 'exchange-rate';

const MainDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [view, setView] = useState<View>('home');
  const [referenceRate, setReferenceRate] = useState<number | null>(null);
  const [exchangeRateHistory, setExchangeRateHistory] = useState<ExchangeRateHistoryEntry[]>([]);

  useEffect(() => {
    const unsubscribeConfig = getExchangeRateConfigListener((config) => {
        setReferenceRate(config ? config.currentRate : null);
    });

    const unsubscribeHistory = getExchangeRateHistoryListener((history) => {
        setExchangeRateHistory(history);
    });

    return () => {
        unsubscribeConfig();
        unsubscribeHistory();
    };
  }, []);

  const handleUpdateReferenceRate = async (newRate: number) => {
    if (user.email) {
        try {
            await updateExchangeRateConfig(newRate, user.email);
        } catch (error) {
            console.error("Failed to update reference rate:", error);
            throw error;
        }
    } else {
        throw new Error("Usuário não tem e-mail para registrar a alteração.");
    }
  };

  const goToHome = () => setView('home');

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-blue-900 text-white font-sans">
      {view === 'home' && <HomePage user={user} setView={setView} />}
      {view === 'types' && <MachineTypesPage user={user} goToHome={goToHome} />}
      {view === 'models' && <MachineModelsPage user={user} goToHome={goToHome} referenceRate={referenceRate} />}
      {view === 'chat' && <ChatPage user={user} goToHome={goToHome} />}
      {view === 'global-chat' && <GlobalChatPage user={user} goToHome={goToHome} />}
      {view === 'exchange-rate' && <ExchangeRatePage user={user} goToHome={goToHome} savedReferenceRate={referenceRate} history={exchangeRateHistory} onUpdateReferenceRate={handleUpdateReferenceRate} />}
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


// Reusable HomeCard component
const HomeCard: React.FC<{
    onClick: () => void;
    title: string;
    description: string;
}> = ({ onClick, title, description }) => (
    <div onClick={onClick} className="bg-gray-800/60 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-blue-800/30 cursor-pointer hover:bg-gray-700/80 hover:border-blue-600 transition-all duration-300 text-center w-full sm:w-80 flex flex-col justify-center">
        <h3 className="text-2xl font-semibold text-blue-200 mb-2">{title}</h3>
        <p className="text-gray-400">{description}</p>
    </div>
);


// HomePage: The main landing page after login
const HomePage: React.FC<{ user: User; setView: (view: View) => void }> = ({ user, setView }) => {
  return (
    <>
      <AppHeader title="Catálogo de Máquinas de Bordado" user={user} />
      <main className="flex flex-col items-center justify-center flex-1 p-6">
        <h2 className="text-4xl font-bold text-white mb-4">Bem-vindo!</h2>
        <p className="text-lg text-gray-300 mb-12">Explore nosso catálogo ou converse com nosso assistente.</p>
        <div className="flex flex-wrap justify-center gap-8 w-full max-w-5xl">
            <HomeCard onClick={() => setView('types')} title="Tipos de Máquinas" description="Navegue pelas categorias de máquinas." />
            <HomeCard onClick={() => setView('models')} title="Modelos e Preços" description="Veja todos os modelos disponíveis." />
            <HomeCard onClick={() => setView('chat')} title="Assistente de Chat" description="Tire suas dúvidas sobre bordados com a IA." />
            <HomeCard onClick={() => setView('global-chat')} title="Bate-papo Global" description="Converse com outros entusiastas." />
            <HomeCard onClick={() => setView('exchange-rate')} title="Taxa JPY/BRL" description="Consulte e defina a cotação do Iene." />
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

// Data for machine models, organized by product type
const machineData: Record<string, { name: string; type: string; price: string; description: string; jpyPrice?: number }[]> = {
  '01 Cabeça': [
    { 
      name: 'BEKT-S1501CA II', 
      type: 'Industrial (Elite Jr)', 
      price: 'Consulte-nos', 
      jpyPrice: 2560000,
      description: 'Máquina de um cabeçote com 15 agulhas, ideal para peças fechadas e bonés prontos.\n\n• Velocidade Máxima: 1.200 PPM\n• Área de Bordado: 250x400mm\n• Valor de Referência: ¥2.560.000 (Iene)\n• O valor em Reais é calculado com base na cotação do dia da importação.' 
    },
    { name: 'BEKT-S1501CBIII', type: 'Industrial', price: 'Consulte', description: 'Modelo padrão com alta velocidade e precisão para diversos materiais.' },
    { name: 'BEKT-S1501CBIII (B32)', type: 'Industrial', price: 'Consulte', description: 'Versão com bastidor para bonés, otimizada para acessórios.' },
    { name: 'BEKT-S1501CBIII (B33)', type: 'Industrial', price: 'Consulte', description: 'Inclui conjunto de bastidores cilíndricos para mangas e calças.' },
    { name: 'BEKT-S1501CBIII (B42)', type: 'Industrial', price: 'Consulte', description: 'Equipada com bastidor de bonés largo para designs maiores.' },
    { name: 'BEKT-S1501CBIII (B43)', type: 'Industrial', price: 'Consulte', description: 'Pacote completo com bastidores cilíndricos e para bonés.' },
    { name: 'BEKT-S1501CBIII - Campo Estendido', type: 'Industrial', price: 'Consulte', description: 'Área de bordado ampliada para peças grandes como jaquetas e banners.' },
  ],
  '02 Cabeças': [
      { name: 'Modelo 2C-A', type: 'Industrial', price: 'R$ 25.000,00', description: 'Máquina de 2 cabeças para pequenas produções.' },
      { name: 'Modelo 2C-B', type: 'Industrial', price: 'R$ 28.500,00', description: 'Modelo avançado de 2 cabeças com painel touch.' },
  ],
  '04 Cabeças': [
      { name: 'Modelo 4C-Pro', type: 'Industrial', price: 'R$ 38.000,00', description: 'Alta velocidade e eficiência para produções médias.' },
  ],
  '06 Cabeças': [
    { name: 'Brother PR680W', type: 'Industrial', price: 'R$ 45.000,00', description: 'Máquina de 6 agulhas, ideal para produção, com conexão wireless e câmera de posicionamento.' },
  ],
  '08 Cabeças': [
     { name: 'Modelo 8C-Max', type: 'Industrial', price: 'R$ 65.000,00', description: 'Para grandes volumes de produção, robusta e confiável.' },
  ],
  '12 Cabeças': [
     { name: 'Modelo 12C-Ultra', type: 'Industrial', price: 'R$ 90.000,00', description: 'Performance máxima para a indústria de bordados.' },
  ],
  'Drop-Table': [
      { name: 'Mesa de Lantejoula DT-100', type: 'Acessório', price: 'R$ 15.000,00', description: 'Dispositivo para aplicação de lantejoulas em máquinas de mesa.' },
  ],
  'Acessórios': [
      { name: 'Kit de Agulhas Groz-Beckert', type: 'Consumível', price: 'R$ 150,00', description: 'Caixa com 100 agulhas de alta qualidade para diversos tecidos.' },
      { name: 'Bastidor Magnético 15x15cm', type: 'Acessório', price: 'R$ 450,00', description: 'Facilita a fixação de tecidos difíceis.' },
  ]
};

const productTypes = Object.keys(machineData);

// MachineModelsPage: Displays specific models and prices with interactive selectors
const MachineModelsPage: React.FC<{ user: User; goToHome: () => void; referenceRate: number | null }> = ({ user, goToHome, referenceRate }) => {
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [selectedModelName, setSelectedModelName] = useState<string>('');
    
    const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedProduct(e.target.value);
        setSelectedModelName(''); // Reset model selection when product changes
    };

    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedModelName(e.target.value);
    };

    const modelsForSelectedProduct = selectedProduct ? machineData[selectedProduct] : [];
    const selectedModelDetails = selectedModelName ? modelsForSelectedProduct.find(m => m.name === selectedModelName) : null;

    let calculatedPrice = selectedModelDetails?.price;
    let priceColor = 'text-green-300';
    let priceBg = 'bg-green-900/50';

    if (selectedModelDetails?.jpyPrice && referenceRate !== null) {
        const brlPrice = selectedModelDetails.jpyPrice * referenceRate;
        calculatedPrice = `R$ ${brlPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (selectedModelDetails?.jpyPrice && referenceRate === null) {
        calculatedPrice = 'Defina a taxa';
        priceColor = 'text-yellow-300';
        priceBg = 'bg-yellow-900/50';
    }

    return (
        <>
            <AppHeader title="Modelos e Preços" user={user} showBackButton onBackClick={goToHome} />
            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Selectors */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-800/70 backdrop-blur-sm p-5 rounded-xl shadow-lg border border-blue-800/30">
                        <div>
                            <label htmlFor="product-select" className="block text-sm font-medium text-gray-300 mb-2">Produto:</label>
                            <select
                                id="product-select"
                                value={selectedProduct}
                                onChange={handleProductChange}
                                className="w-full bg-gray-700/80 border border-gray-600 rounded-md py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Selecione um Produto</option>
                                {productTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="model-select" className="block text-sm font-medium text-gray-300 mb-2">Modelo:</label>
                            <select
                                id="model-select"
                                value={selectedModelName}
                                onChange={handleModelChange}
                                disabled={!selectedProduct}
                                className="w-full bg-gray-700/80 border border-gray-600 rounded-md py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-900 disabled:cursor-not-allowed"
                            >
                                <option value="">Selecione um Modelo</option>
                                {modelsForSelectedProduct.map(model => (
                                    <option key={model.name} value={model.name}>{model.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Model Details */}
                    {selectedModelDetails && (
                        <div className="bg-gray-800/70 backdrop-blur-sm p-5 rounded-xl shadow-lg border border-blue-800/30">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h3 className="text-2xl font-bold text-blue-200">{selectedModelDetails.name}</h3>
                                    <p className="text-md text-gray-400 mb-3">{selectedModelDetails.type}</p>
                                    <p className="text-gray-300 text-base whitespace-pre-wrap">{selectedModelDetails.description}</p>
                                </div>
                                <div className={`text-xl font-semibold ${priceColor} ${priceBg} px-4 py-2 rounded-lg whitespace-nowrap mt-4 md:mt-0`}>
                                    {calculatedPrice}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
};

// ExchangeRatePage: Fetches and displays JPY/BRL exchange rate, and manages the reference rate
const ExchangeRatePage: React.FC<{
    user: User;
    goToHome: () => void;
    savedReferenceRate: number | null;
    history: ExchangeRateHistoryEntry[];
    onUpdateReferenceRate: (newRate: number) => Promise<void>;
}> = ({ user, goToHome, savedReferenceRate, history, onUpdateReferenceRate }) => {
    const [currentRate, setCurrentRate] = useState<number | null>(null);
    const [inputRate, setInputRate] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRate = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const rate = await getExchangeRate();
                setCurrentRate(rate);
            } catch (err: any) {
                setError(err.message || "Ocorreu um erro ao buscar a cotação atual.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchRate();
    }, []);

    useEffect(() => {
        if (savedReferenceRate !== null) {
            setInputRate(savedReferenceRate.toString());
        }
    }, [savedReferenceRate]);

    const handleSave = async () => {
        const newRate = parseFloat(inputRate);
        if (isNaN(newRate) || newRate <= 0) {
            setError("Por favor, insira uma taxa válida.");
            return;
        }
        setIsSaving(true);
        setError(null);
        try {
            await onUpdateReferenceRate(newRate);
        } catch (err) {
            setError("Falha ao salvar a taxa. Tente novamente.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const inputRateNum = parseFloat(inputRate);
    let comparisonResult: { text: string; color: string } | null = null;

    if (currentRate !== null && !isNaN(inputRateNum) && inputRate.trim() !== '') {
        const diff = currentRate - inputRateNum;
        if (Math.abs(diff) < 0.00001) {
             comparisonResult = { text: 'A taxa atual é igual à sua referência.', color: 'text-gray-400' };
        } else if (diff > 0) {
            comparisonResult = { text: `A taxa atual está ${diff.toFixed(4)} BRL acima da sua referência.`, color: 'text-green-400' };
        } else {
            comparisonResult = { text: `A taxa atual está ${Math.abs(diff).toFixed(4)} BRL abaixo da sua referência.`, color: 'text-red-400' };
        }
    }

    return (
        <>
            <AppHeader title="Cotação JPY/BRL" user={user} showBackButton onBackClick={goToHome} />
            <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
                <div className="w-full max-w-lg bg-gray-800/70 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-blue-800/30 space-y-6 mb-6">
                    {isLoading && <p className="text-center text-blue-300 animate-pulse">Buscando cotação atual...</p>}
                    {error && <p className="text-center text-red-400">{error}</p>}
                    {currentRate !== null && (
                        <>
                            <div>
                                <p className="text-lg text-gray-400 text-center">Cotação Atual (Referência Google):</p>
                                <p className="text-4xl font-bold text-blue-200 text-center my-2">{currentRate.toFixed(4)} BRL</p>
                            </div>
                            
                            <div className="space-y-2">
                                <label htmlFor="reference-rate" className="block text-sm font-medium text-gray-300">Taxa de Referência Desejada (para Preços):</label>
                                <input
                                    id="reference-rate"
                                    type="number"
                                    step="0.0001"
                                    value={inputRate}
                                    onChange={(e) => setInputRate(e.target.value)}
                                    placeholder="Ex: 0.0340"
                                    className="w-full bg-gray-700/80 border border-gray-600 rounded-md py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {comparisonResult && (
                                <div className="text-center h-6">
                                    <p className={`text-md font-semibold ${comparisonResult.color}`}>{comparisonResult.text}</p>
                                </div>
                            )}

                            <button 
                                onClick={handleSave} 
                                disabled={isSaving || parseFloat(inputRate) === savedReferenceRate}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 disabled:bg-gray-600 disabled:opacity-75 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                {isSaving ? 'Salvando...' : 'Salvar Taxa de Referência'}
                            </button>
                        </>
                    )}
                </div>
                
                {history.length > 0 && (
                     <div className="w-full max-w-lg bg-gray-800/70 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-blue-800/30">
                        <h3 className="text-xl font-bold text-blue-200 mb-4 text-center">Histórico de Alterações</h3>
                        <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {history.map(entry => (
                                <li key={entry.id} className="text-sm p-3 bg-gray-700/50 rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-blue-300">{entry.rate.toFixed(4)} BRL</p>
                                        <p className="text-gray-400 text-xs">por: {entry.updatedBy}</p>
                                    </div>
                                    <p className="text-gray-500 text-xs">
                                        {entry.updatedAt ? new Date(entry.updatedAt.seconds * 1000).toLocaleString('pt-BR') : ''}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
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