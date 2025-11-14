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

type Theme = 'light' | 'dark';

// Main App component: Manages authentication state and view routing
const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener((user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });

    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
        setTheme(savedTheme);
    }

    return unsubscribe;
  }, []);

  useEffect(() => {
      if (theme === 'dark') {
          document.documentElement.classList.add('dark');
          document.body.classList.add('bg-slate-900');
          document.body.classList.remove('bg-slate-100');
      } else {
          document.documentElement.classList.remove('dark');
          document.body.classList.add('bg-slate-100');
          document.body.classList.remove('bg-slate-900');
      }
      localStorage.setItem('theme', theme);
  }, [theme]);
  
  const toggleTheme = () => {
      setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-white text-xl animate-pulse">Carregando...</div>
      </div>
    );
  }

  return currentUser ? <MainDashboard user={currentUser} theme={theme} toggleTheme={toggleTheme} /> : <LoginPage />;
};

// MainDashboard: Handles navigation between Home, Chat, and other views
type View = 'home' | 'models' | 'chat' | 'global-chat' | 'exchange-rate';

const MainDashboard: React.FC<{ user: User; theme: Theme; toggleTheme: () => void; }> = ({ user, theme, toggleTheme }) => {
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
    <div className="flex flex-col h-screen text-slate-800 dark:text-slate-200 font-sans transition-colors duration-300">
      {view === 'home' && <HomePage user={user} setView={setView} theme={theme} toggleTheme={toggleTheme} />}
      {view === 'models' && <MachineModelsPage user={user} goToHome={goToHome} referenceRate={referenceRate} theme={theme} toggleTheme={toggleTheme} />}
      {view === 'chat' && <ChatPage user={user} goToHome={goToHome} theme={theme} toggleTheme={toggleTheme} />}
      {view === 'global-chat' && <GlobalChatPage user={user} goToHome={goToHome} theme={theme} toggleTheme={toggleTheme} />}
      {view === 'exchange-rate' && <ExchangeRatePage user={user} goToHome={goToHome} savedReferenceRate={referenceRate} history={exchangeRateHistory} onUpdateReferenceRate={handleUpdateReferenceRate} theme={theme} toggleTheme={toggleTheme} />}
    </div>
  );
};

// Icons for Theme Toggle
const SunIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
);

const MoonIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
);


// Reusable Header Component
const AppHeader: React.FC<{
  title: string;
  user: User;
  showBackButton?: boolean;
  onBackClick?: () => void;
  theme: Theme;
  toggleTheme: () => void;
}> = ({ title, user, showBackButton, onBackClick, theme, toggleTheme }) => {
  return (
    <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4 border-b border-slate-200 dark:border-sky-900/50 shadow-sm flex justify-between items-center relative sticky top-0 z-10">
      <div className="absolute left-4">
        {showBackButton && (
          <button
            onClick={onBackClick}
            className="flex items-center gap-2 text-sky-600 dark:text-sky-300 hover:text-sky-800 dark:hover:text-sky-100 transition-colors duration-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-sky-500 rounded-lg p-2"
            aria-label="Voltar para Home"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            <span>Home</span>
          </button>
        )}
      </div>

      <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-sky-300 mx-auto">
        {title}
      </h1>

      <div className="absolute right-4 flex items-center gap-4">
        <span className="text-sm text-slate-600 dark:text-slate-300 hidden sm:block truncate max-w-xs" title={user.email ?? ''}>{user.email}</span>
        
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full text-slate-500 dark:text-sky-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-sky-500"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </button>

        <button
          onClick={handleSignOut}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-lg transition-colors duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-red-500"
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
    <div onClick={onClick} className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-sky-500 dark:hover:border-sky-500 transition-all duration-300 text-center w-full sm:w-80 flex flex-col justify-center transform hover:-translate-y-1">
        <h3 className="text-2xl font-semibold text-sky-600 dark:text-sky-400 mb-2">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400">{description}</p>
    </div>
);


// HomePage: The main landing page after login
const HomePage: React.FC<{ user: User; setView: (view: View) => void; theme: Theme; toggleTheme: () => void }> = ({ user, setView, theme, toggleTheme }) => {
  return (
    <>
      <AppHeader title="Lista de preços Barudan do Brasil" user={user} theme={theme} toggleTheme={toggleTheme} />
      <main className="flex flex-col items-center justify-center flex-1 p-6">
        <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Bem-vindo!</h2>
        <p className="text-lg text-slate-600 dark:text-slate-300 mb-12">Explore nosso catálogo ou converse com nosso assistente.</p>
        <div className="flex flex-wrap justify-center gap-8 w-full max-w-5xl">
            <HomeCard onClick={() => setView('models')} title="Modelos e Preços" description="Veja todos os modelos disponíveis." />
            <HomeCard onClick={() => setView('chat')} title="Assistente de Chat" description="Tire suas dúvidas sobre bordados com a IA." />
            <HomeCard onClick={() => setView('global-chat')} title="Bate-Papo (Recados)" description="Deixe uma mensagem para outros usuários." />
            <HomeCard onClick={() => setView('exchange-rate')} title="Taxa JPY/BRL" description="Consulte e defina a cotação do Iene." />
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
      description: 'Máquina de um cabeçote com 15 agulhas, ideal para peças fechadas e bonés prontos.\n\n• Velocidade Máxima: 1.200 PPM\n• Área de Bordado: 250x400mm\n• Valor de Referência: ¥2.560.000 (Iene)'
    },
    { 
      name: 'BEKT-S1501CBIII', 
      type: 'Industrial', 
      price: 'Consulte-nos',
      jpyPrice: 2850000,
      description: 'Máquina de um cabeçote com 15 agulhas, ideal para peças fechadas e bonés prontos.\n\n• Velocidade Máxima: 1.200 PPM\n• Área de Bordado: 360x500mm\n• Valor de Referência: ¥2.850.000 (Iene)'
    },
    { 
      name: 'BEKT-S1501CBIII (B32)', 
      type: 'Industrial', 
      price: 'Consulte-nos', 
      jpyPrice: 3380000,
      description: 'Equipada com dispositivo de Lantejoula SIMPLES (LF).\n\n• Área de Bordado: 360x500mm\n• Valor de Referência: ¥3.380.000 (Iene)'
    },
    { 
      name: 'BEKT-S1501CBIII (B33)', 
      type: 'Industrial', 
      price: 'Consulte-nos', 
      jpyPrice: 4000000,
      description: 'Equipada com dispositivo de Lantejoula DUPLO (LF+RH).\n\n• Área de Bordado: 360x500mm\n• Valor de Referência: ¥4.000.000 (Iene)'
    },
    { 
      name: 'BEKT-S1501CBIII (B42)', 
      type: 'Industrial', 
      price: 'Consulte', 
      jpyPrice: 3500000,
      description: 'Equipada com dispositivo de Lantejoula GEMINADA SIMPLES.\n\n• Área de Bordado: 360x500mm\n• Valor de Referência: ¥3.500.000 (Iene)'
    },
    { 
      name: 'BEKT-S1501CBIII (B43)', 
      type: 'Industrial', 
      price: 'Consulte', 
      jpyPrice: 3700000,
      description: 'Equipada com dispositivo de Lantejoula GEMINADA DUPLO.\n\n• Área de Bordado: 360x500mm\n• Valor de Referência: ¥3.700.000 (Iene)'
    },
    { 
      name: 'BEKT-S1501CBIII - Campo Estendido', 
      type: 'Industrial', 
      price: 'Consulte', 
      jpyPrice: 3960000,
      description: 'Máquina de um cabeçote com 15 agulhas e campo estendido.\n\n• Velocidade Máxima: 1.000 PPM\n• Área de Bordado: 360x1200mm\n• Valor de Referência: ¥3.960.000 (Iene)'
    },
  ],
  '02 Cabeças': [
      { name: 'Modelo 2C-A', type: 'Industrial', price: 'R$ 25.000,00', description: 'Máquina de 2 cabeças para pequenas produções.' },
      { name: 'Modelo 2C-B', type: 'Industrial', price: 'R$ 28.500,00', description: 'Modelo avançado de 2 cabeças com painel touch.' },
  ],
  '04 Cabeças': [
    { 
      name: 'BEKY Y904 HII', 
      type: 'Industrial', 
      price: 'Consulte-nos', 
      jpyPrice: 7720000,
      description: 'quatro cabeçotes, 9 ag., de ponte, 1200 ppm c/ lubrificação SEMIautomática das lançadeiras\n\n• Velocidade Máxima: 1.200 PPM\n• Área de Bordado: 450x350mm\n• Valor de Referência: ¥7.720.000 (Iene)'
    },
     { 
      name: 'BEKY Y904 HII - Campo Estendido', 
      type: 'Industrial', 
      price: 'Consulte-nos', 
      jpyPrice: 8100000,
      description: 'Campo extendido 1200 ppm c/ lubrificação SEMIautomática das lançadeiras\n\n• Velocidade Máxima: 1.200 PPM\n• Área de Bordado: 600x350mm\n• Valor de Referência: ¥8.100.000 (Iene)'
    },
    { 
      name: 'BEKY Y904 HII (Y39)', 
      type: 'Industrial', 
      price: 'Consulte-nos',
      jpyPrice: 8800000,
      description: 'C/ lantejoulas MULTICOLORIDA 1200 ppm c/ lubrificação SEMIautomática das lançadeiras\n\n• Velocidade Máxima: 1.200 PPM\n• Área de Bordado: 450x350mm\n• Valor de Referência: ¥8.800.000 (Iene)'
    },
    { 
      name: 'BEKY Y904 HII (Y49)', 
      type: 'Industrial', 
      price: 'Consulte-nos', 
      jpyPrice: 9350000,
      description: 'Lantej Multicolorida GEMINADA 1200 ppm c/ lubrificação SEMIautomática das lançadeiras\n\n• Velocidade Máxima: 1.200 PPM\n• Área de Bordado: 450x350mm\n• Valor de Referência: ¥9.350.000 (Iene)'
    },
  ],
  '06 Cabeças': [
    { 
      name: 'BEKY Y906 HII', 
      type: 'Industrial', 
      price: 'Consulte-nos', 
      jpyPrice: 8800000,
      description: 'seis cabeçotes, 9 ag., de ponte, 1200 ppm c/ lubrificação SEMIautomática das lançadeiras\n\n• Velocidade Máxima: 1.200 PPM\n• Área de Bordado: 450x350mm\n• Valor de Referência: ¥8.800.000 (Iene)'
    },
    { 
      name: 'BEKY Y906 HII - Campo Estendido', 
      type: 'Industrial', 
      price: 'Consulte-nos', 
      jpyPrice: 9180000,
      description: 'Campo extendido 1200 ppm c/ lubrificação SEMIautomática das lançadeiras\n\n• Velocidade Máxima: 1.200 PPM\n• Área de Bordado: 600x350mm\n• Valor de Referência: ¥9.180.000 (Iene)'
    },
    { 
      name: 'BEKY Y906 HII (Y39)', 
      type: 'Industrial', 
      price: 'Consulte-nos', 
      jpyPrice: 9880000,
      description: 'C/ lantejoulas MULTICOLORIDA 1200 ppm c/ lubrificação SEMIautomática das lançadeiras\n\n• Velocidade Máxima: 1.200 PPM\n• Área de Bordado: 450x350mm\n• Valor de Referência: ¥9.880.000 (Iene)'
    },
    { 
      name: 'BEKY Y906 HII (Y49)', 
      type: 'Industrial', 
      price: 'Consulte-nos', 
      jpyPrice: 10430000,
      description: 'Lantej Multicolorida GEMINADA 1200 ppm c/ lubrificação SEMIautomática das lançadeiras\n\n• Velocidade Máxima: 1.200 PPM\n• Área de Bordado: 450x350mm\n• Valor de Referência: ¥10.430.000 (Iene)'
    }
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
const MachineModelsPage: React.FC<{ user: User; goToHome: () => void; referenceRate: number | null; theme: Theme; toggleTheme: () => void; }> = ({ user, goToHome, referenceRate, theme, toggleTheme }) => {
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
    // Default style for "Consulte-nos" and other text-based prices
    let priceClasses = 'bg-gradient-to-br from-slate-500 to-slate-600 text-white dark:from-slate-600 dark:to-slate-700';

    if (selectedModelDetails?.jpyPrice && referenceRate !== null) {
        const brlPrice = selectedModelDetails.jpyPrice * referenceRate;
        calculatedPrice = `R$ ${brlPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        priceClasses = 'bg-gradient-to-br from-sky-500 to-green-500 text-white';
    } else if (selectedModelDetails?.jpyPrice && referenceRate === null) {
        calculatedPrice = 'Defina a taxa';
        priceClasses = 'bg-gradient-to-br from-yellow-500 to-orange-500 text-white';
    }


    return (
        <>
            <AppHeader title="Modelos e Preços" user={user} showBackButton onBackClick={goToHome} theme={theme} toggleTheme={toggleTheme} />
            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Selectors */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                        <div className="text-center mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                             <p className="text-lg text-slate-500 dark:text-slate-400">Taxa de Precificação (JPY/BRL)</p>
                            {referenceRate !== null ? (
                                <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">{referenceRate.toFixed(4)}</p>
                            ) : (
                                <p className="text-sm text-yellow-500 dark:text-yellow-400">Defina a taxa na página 'Taxa JPY/BRL'.</p>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            <div>
                                <label htmlFor="product-select" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Produto:</label>
                                <select
                                    id="product-select"
                                    value={selectedProduct}
                                    onChange={handleProductChange}
                                    className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-3 px-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                                >
                                    <option value="">Selecione um Produto</option>
                                    {productTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="model-select" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Modelo:</label>
                                <select
                                    id="model-select"
                                    value={selectedModelName}
                                    onChange={handleModelChange}
                                    disabled={!selectedProduct}
                                    className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-3 px-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-200 dark:disabled:bg-slate-900 disabled:cursor-not-allowed"
                                >
                                    <option value="">Selecione um Modelo</option>
                                    {modelsForSelectedProduct.map(model => (
                                        <option key={model.name} value={model.name}>{model.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Model Details */}
                    {selectedModelDetails && (
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h3 className="text-2xl font-bold text-sky-600 dark:text-sky-400">{selectedModelDetails.name}</h3>
                                    <p className="text-md text-slate-500 dark:text-slate-400 mb-3">{selectedModelDetails.type}</p>
                                    <p className="text-slate-600 dark:text-slate-300 text-base whitespace-pre-wrap">{selectedModelDetails.description}</p>
                                </div>
                                <div className={`text-3xl font-bold ${priceClasses} px-6 py-3 rounded-xl shadow-lg whitespace-nowrap mt-4 md:mt-0 transition-all duration-300`}>
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
    theme: Theme;
    toggleTheme: () => void;
}> = ({ user, goToHome, savedReferenceRate, history, onUpdateReferenceRate, theme, toggleTheme }) => {
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

    if (currentRate !== null && !isNaN(inputRateNum) && inputRate.trim() !== '' && inputRateNum > 0) {
        const percentageDiff = ((currentRate - inputRateNum) / inputRateNum) * 100;
        
        if (Math.abs(percentageDiff) < 0.01) {
             comparisonResult = { text: 'A taxa atual é igual à sua referência.', color: 'text-slate-500 dark:text-slate-400' };
        } else if (percentageDiff > 0) {
            comparisonResult = { text: `A taxa atual está ${percentageDiff.toFixed(2)}% acima da sua referência.`, color: 'text-green-600 dark:text-green-400' };
        } else {
            comparisonResult = { text: `A taxa atual está ${Math.abs(percentageDiff).toFixed(2)}% abaixo da sua referência.`, color: 'text-red-600 dark:text-red-400' };
        }
    } else if (currentRate !== null && !isNaN(inputRateNum) && inputRate.trim() !== '' && inputRateNum <= 0) {
        comparisonResult = { text: 'A referência deve ser maior que zero para comparação.', color: 'text-yellow-600 dark:text-yellow-400' };
    }


    return (
        <>
            <AppHeader title="Cotação JPY/BRL" user={user} showBackButton onBackClick={goToHome} theme={theme} toggleTheme={toggleTheme} />
            <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
                <div className="w-full max-w-lg bg-white dark:bg-slate-800 p-8 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 space-y-6 mb-6">
                    {isLoading && <p className="text-center text-sky-600 dark:text-sky-400 animate-pulse">Buscando cotação atual...</p>}
                    {error && <p className="text-center text-red-500">{error}</p>}
                    {currentRate !== null && (
                        <>
                            <div>
                                <p className="text-lg text-slate-500 dark:text-slate-400 text-center">Cotação Atual (Referência Google):</p>
                                <p className="text-4xl font-bold text-sky-600 dark:text-sky-400 text-center my-2">{currentRate.toFixed(4)} BRL</p>
                            </div>
                            
                            <div className="space-y-2">
                                <label htmlFor="reference-rate" className="block text-sm font-medium text-slate-600 dark:text-slate-300">Taxa para Precificação</label>
                                <input
                                    id="reference-rate"
                                    type="number"
                                    step="0.0001"
                                    value={inputRate}
                                    onChange={(e) => setInputRate(e.target.value)}
                                    placeholder="Ex: 0.0340"
                                    className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-3 px-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                    aria-describedby="rate-description"
                                />
                                <p id="rate-description" className="text-xs text-slate-500 dark:text-slate-400">
                                    Esta taxa será a praticada para precificar os modelos, não a cotação atual do Google.
                                </p>
                            </div>

                            {comparisonResult && (
                                <div className="text-center h-6">
                                    <p className={`text-md font-semibold ${comparisonResult.color}`}>{comparisonResult.text}</p>
                                </div>
                            )}

                            <button 
                                onClick={handleSave} 
                                disabled={isSaving || parseFloat(inputRate) === savedReferenceRate}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-sky-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:opacity-75 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                {isSaving ? 'Salvando...' : 'Salvar Taxa de Referência'}
                            </button>
                        </>
                    )}
                </div>
                
                {history.length > 0 && (
                     <div className="w-full max-w-lg bg-white dark:bg-slate-800 p-8 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                        <h3 className="text-xl font-bold text-sky-600 dark:text-sky-400 mb-4 text-center">Histórico de Alterações</h3>
                        <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {history.map(entry => (
                                <li key={entry.id} className="text-sm p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-sky-700 dark:text-sky-300">{entry.rate.toFixed(4)} BRL</p>
                                        <p className="text-slate-500 dark:text-slate-400 text-xs">por: {entry.updatedBy}</p>
                                    </div>
                                    <p className="text-slate-400 dark:text-slate-500 text-xs">
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
const ChatPage: React.FC<{ user: User; goToHome: () => void; theme: Theme; toggleTheme: () => void; }> = ({ user, goToHome, theme, toggleTheme }) => {
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
      <AppHeader title="Assistente de Chat" user={user} showBackButton onBackClick={goToHome} theme={theme} toggleTheme={toggleTheme} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col">
        <div className="flex-1 space-y-6 max-w-4xl mx-auto w-full">
          {messages.map((msg, index) => (
            <ChatMessage key={index} message={msg} />
          ))}
          {isLoading && <ChatMessage message={{ sender: MessageSender.AI, text: "Digitando..." }} />}
          <div ref={chatEndRef} />
        </div>
        <div className="mt-auto sticky bottom-0">
          <ChatInput onSendMessage={handleSendMessage} onSendCuriosity={handleSendCuriosity} isLoading={isLoading} />
        </div>
      </main>
    </>
  );
};


// GlobalChatPage: New page for the real-time global chat
const GlobalChatPage: React.FC<{ user: User; goToHome: () => void; theme: Theme; toggleTheme: () => void; }> = ({ user, goToHome, theme, toggleTheme }) => {
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
            <AppHeader title="Bate-Papo (Recados)" user={user} showBackButton onBackClick={goToHome} theme={theme} toggleTheme={toggleTheme} />
            <main className="flex-1 flex flex-col overflow-hidden p-4 md:p-6">
                <div className="flex-1 space-y-4 overflow-y-auto max-w-4xl mx-auto w-full p-2">
                    {messages.map((msg) => (
                        <GlobalChatMessage key={msg.id} message={msg} currentUser={user} />
                    ))}
                    <div ref={chatEndRef} />
                </div>
                <div className="mt-auto pt-4 border-t border-slate-200 dark:border-sky-900/50">
                    <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-3">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Digite sua mensagem..."
                            disabled={isLoading}
                            className="flex-1 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-full py-3 px-5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                            aria-label="Caixa de mensagem"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !newMessage.trim()}
                            className="bg-sky-600 text-white rounded-full p-3 hover:bg-sky-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors duration-200"
                            aria-label="Enviar mensagem"
                        >
                            <svg className="w-6 h-6 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                        </button>
                    </form>
                </div>
            </main>
        </>
    );
};

export default App;