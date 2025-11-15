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
import { BarudexIcon, MoonIcon, SunIcon, ModelsIcon, GlobalChatIcon, ExchangeRateIcon, LogoutIcon } from './components/Icons';

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
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
    }

    return unsubscribe;
  }, []);

  useEffect(() => {
      if (theme === 'dark') {
          document.documentElement.classList.add('dark');
          document.body.className = 'bg-gray-950';
      } else {
          document.documentElement.classList.remove('dark');
          document.body.className = 'bg-gradient-to-b from-blue-100 to-white';
      }
      localStorage.setItem('theme', theme);
  }, [theme]);
  
  const toggleTheme = () => {
      setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
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
    <div className="flex flex-col h-screen text-gray-800 dark:text-gray-200 font-sans">
      {view === 'home' && <HomePage setView={setView} />}
      {view === 'models' && <MachineModelsPage goToHome={goToHome} referenceRate={referenceRate} />}
      {view === 'chat' && <ChatPage goToHome={goToHome} />}
      {view === 'global-chat' && <GlobalChatPage user={user} goToHome={goToHome} />}
      {view === 'exchange-rate' && <ExchangeRatePage goToHome={goToHome} savedReferenceRate={referenceRate} history={exchangeRateHistory} onUpdateReferenceRate={handleUpdateReferenceRate} />}
      
      {/* Floating Action Buttons Container */}
      <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 flex justify-center z-20 pointer-events-none">
        
        {/* Theme Toggle Button (Center) */}
        <div className="pointer-events-auto">
            <button
                onClick={toggleTheme}
                className="p-3 rounded-full bg-gray-200/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-950 focus:ring-blue-500 transition-transform duration-300 ease-in-out hover:scale-110"
                aria-label="Toggle theme"
            >
                {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
        </div>
        
        {/* Logout Button (Bottom Right) */}
        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 pointer-events-auto">
            <button
                onClick={handleSignOut}
                className="p-3 rounded-full bg-red-600/90 backdrop-blur-md shadow-lg text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-950 focus:ring-red-500 transition-transform duration-300 ease-in-out hover:scale-110"
                aria-label="Sair"
            >
                <LogoutIcon className="w-6 h-6" />
            </button>
        </div>
      </div>
    </div>
  );
};

// Reusable Header Component
const AppHeader: React.FC<{
  title: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
}> = ({ title, showBackButton, onBackClick }) => {
  return (
    <header className="bg-white/70 dark:bg-gray-950/70 backdrop-blur-md p-4 flex justify-between items-center sticky top-0 z-10">
      <div className="flex-1 flex justify-start">
        {showBackButton && (
          <button
            onClick={onBackClick}
            className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-950 focus:ring-blue-500 rounded-full p-2"
            aria-label="Voltar para Home"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            <span className="hidden sm:inline">Home</span>
          </button>
        )}
      </div>

      <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-500 via-green-400 to-yellow-400 text-transparent bg-clip-text text-center mx-4 truncate">
        {title}
      </h1>

      <div className="flex-1"></div> {/* Spacer div */}
    </header>
  );
};


// HomePage: The main landing page after login
const HomePage: React.FC<{ setView: (view: View) => void; }> = ({ setView }) => {
  const [buttonsVisible, setButtonsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setButtonsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const navItems = [
      { 
        onClick: () => setView('models'), 
        title: "Modelos e Preços", 
        icon: <ModelsIcon className="w-9 h-9 text-blue-600 dark:text-blue-400" />,
        color: "bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/80"
      },
      { 
        onClick: () => setView('chat'), 
        title: "Pesquise com Barudex", 
        icon: <BarudexIcon className="w-10 h-10" />,
        color: "bg-cyan-100 dark:bg-cyan-900/40 hover:bg-cyan-200 dark:hover:bg-cyan-900/80"
      },
      { 
        onClick: () => setView('global-chat'), 
        title: "Bate-Papo", 
        icon: <GlobalChatIcon className="w-9 h-9 text-green-600 dark:text-green-400" />,
        color: "bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-900/80"
      },
      { 
        onClick: () => setView('exchange-rate'), 
        title: "Taxa JPY/BRL", 
        icon: <ExchangeRateIcon className="w-9 h-9 text-amber-600 dark:text-amber-400" />,
        color: "bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/80"
      },
  ];

  return (
    <>
      <AppHeader title="Lista de preços Barudan do Brasil" />
      <main className="flex flex-col items-center justify-center flex-1 p-6">
        <div className="flex flex-wrap justify-center items-start gap-x-8 gap-y-12 w-full max-w-3xl">
            {navItems.map((item, index) => (
                <div 
                    key={item.title} 
                    className={`transition-all duration-500 ease-out ${buttonsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`} 
                    style={{ transitionDelay: `${index * 100}ms`}}
                >
                    <button 
                      onClick={item.onClick}
                      className="flex flex-col items-center gap-3 text-center w-40 group"
                      aria-label={item.title}
                    >
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${item.color}`}>
                        {item.icon}
                      </div>
                      <span className="font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.title}</span>
                    </button>
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
const MachineModelsPage: React.FC<{ goToHome: () => void; referenceRate: number | null; }> = ({ goToHome, referenceRate }) => {
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [selectedModelName, setSelectedModelName] = useState<string>('');
    const [isAnimatingDetails, setIsAnimatingDetails] = useState(false);
    
    useEffect(() => {
        if (selectedModelName) {
            setIsAnimatingDetails(false);
            const timer = setTimeout(() => setIsAnimatingDetails(true), 50);
            return () => clearTimeout(timer);
        }
    }, [selectedModelName]);

    const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedProduct(e.target.value);
        setSelectedModelName('');
    };

    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedModelName(e.target.value);
    };

    const modelsForSelectedProduct = selectedProduct ? machineData[selectedProduct] : [];
    const selectedModelDetails = selectedModelName ? modelsForSelectedProduct.find(m => m.name === selectedModelName) : null;

    let calculatedPrice = selectedModelDetails?.price;
    let priceClasses = 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200';

    if (selectedModelDetails?.jpyPrice && referenceRate !== null) {
        const brlPrice = selectedModelDetails.jpyPrice * referenceRate;
        calculatedPrice = `R$ ${brlPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        priceClasses = 'bg-gradient-to-br from-blue-500 to-green-500 text-white';
    } else if (selectedModelDetails?.jpyPrice && referenceRate === null) {
        calculatedPrice = 'Defina a taxa';
        priceClasses = 'bg-gradient-to-br from-amber-500 to-orange-500 text-white';
    }


    return (
        <>
            <AppHeader title="Modelos e Preços" showBackButton onBackClick={goToHome} />
            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Selectors */}
                    <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-3xl">
                        <div className="text-center mb-5 pb-5 border-b border-gray-200 dark:border-gray-700">
                             <p className="text-lg text-gray-500 dark:text-gray-400">Taxa de Precificação (JPY/BRL)</p>
                            {referenceRate !== null ? (
                                <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{referenceRate.toFixed(4)}</p>
                            ) : (
                                <p className="text-sm text-amber-500 dark:text-amber-400">Defina a taxa na página 'Taxa JPY/BRL'.</p>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            <div>
                                <label htmlFor="product-select" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Produto:</label>
                                <select
                                    id="product-select"
                                    value={selectedProduct}
                                    onChange={handleProductChange}
                                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl py-3 px-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Selecione um Produto</option>
                                    {productTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="model-select" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Modelo:</label>
                                <select
                                    id="model-select"
                                    value={selectedModelName}
                                    onChange={handleModelChange}
                                    disabled={!selectedProduct}
                                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl py-3 px-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 dark:disabled:bg-gray-800/50 disabled:cursor-not-allowed"
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
                        <div className={`bg-gray-100 dark:bg-gray-800 p-8 rounded-3xl transition-all duration-500 ease-out ${isAnimatingDetails ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{selectedModelDetails.name}</h3>
                                    <p className="text-md text-gray-500 dark:text-gray-400 mb-4">{selectedModelDetails.type}</p>
                                    <p className="text-gray-600 dark:text-gray-300 text-base whitespace-pre-wrap">{selectedModelDetails.description}</p>
                                </div>
                                <div className={`text-3xl font-bold ${priceClasses} px-6 py-4 rounded-2xl shadow-md whitespace-nowrap mt-4 md:mt-0`}>
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
    goToHome: () => void;
    savedReferenceRate: number | null;
    history: ExchangeRateHistoryEntry[];
    onUpdateReferenceRate: (newRate: number) => Promise<void>;
}> = ({ goToHome, savedReferenceRate, history, onUpdateReferenceRate }) => {
    const [currentRate, setCurrentRate] = useState<number | null>(null);
    const [inputRate, setInputRate] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isContentVisible, setIsContentVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsContentVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

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
             comparisonResult = { text: 'A taxa atual é igual à sua referência.', color: 'text-gray-500 dark:text-gray-400' };
        } else if (percentageDiff > 0) {
            comparisonResult = { text: `A taxa atual está ${percentageDiff.toFixed(2)}% acima da sua referência.`, color: 'text-emerald-600 dark:text-emerald-400' };
        } else {
            comparisonResult = { text: `A taxa atual está ${Math.abs(percentageDiff).toFixed(2)}% abaixo da sua referência.`, color: 'text-red-600 dark:text-red-400' };
        }
    } else if (currentRate !== null && !isNaN(inputRateNum) && inputRate.trim() !== '' && inputRateNum <= 0) {
        comparisonResult = { text: 'A referência deve ser maior que zero para comparação.', color: 'text-amber-600 dark:text-amber-400' };
    }


    return (
        <>
            <AppHeader title="Cotação JPY/BRL" showBackButton onBackClick={goToHome} />
            <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
                <div className={`w-full max-w-lg bg-gray-100 dark:bg-gray-800 p-8 rounded-3xl space-y-6 mb-8 transition-all duration-500 ease-out ${isContentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
                    {isLoading && <p className="text-center text-gray-500 dark:text-gray-400 animate-pulse">Buscando cotação atual...</p>}
                    {error && <p className="text-center text-red-500">{error}</p>}
                    {currentRate !== null && (
                        <>
                            <div>
                                <p className="text-lg text-gray-500 dark:text-gray-400 text-center">Cotação Atual (Referência Google):</p>
                                <p className="text-4xl font-bold text-gray-800 dark:text-gray-100 text-center my-2">{currentRate.toFixed(4)} BRL</p>
                            </div>
                            
                            <div className="space-y-2">
                                <label htmlFor="reference-rate" className="block text-sm font-medium text-gray-600 dark:text-gray-300">Taxa para Precificação</label>
                                <input
                                    id="reference-rate"
                                    type="number"
                                    step="0.0001"
                                    value={inputRate}
                                    onChange={(e) => setInputRate(e.target.value)}
                                    placeholder="Ex: 0.0340"
                                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl py-3 px-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    aria-describedby="rate-description"
                                />
                                <p id="rate-description" className="text-xs text-gray-500 dark:text-gray-400">
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
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-950 focus:ring-blue-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:opacity-75 disabled:cursor-not-allowed"
                            >
                                {isSaving ? 'Salvando...' : 'Salvar Taxa de Referência'}
                            </button>
                        </>
                    )}
                </div>
                
                {history.length > 0 && (
                     <div className={`w-full max-w-lg bg-gray-100 dark:bg-gray-800 p-8 rounded-3xl transition-all duration-500 ease-out ${isContentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`} style={{transitionDelay: '150ms'}}>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">Histórico de Alterações</h3>
                        <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {history.map(entry => (
                                <li key={entry.id} className="text-sm p-3 bg-white dark:bg-gray-700/50 rounded-xl flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-gray-800 dark:text-gray-100">{entry.rate.toFixed(4)} BRL</p>
                                        <p className="text-gray-500 dark:text-gray-400 text-xs">por: {entry.updatedBy}</p>
                                    </div>
                                    <p className="text-gray-400 dark:text-gray-500 text-xs">
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
const ChatPage: React.FC<{ goToHome: () => void; }> = ({ goToHome }) => {
  const [messages, setMessages] = useState<Message[]>([
    { sender: MessageSender.AI, text: "Olá! Eu sou Barudex, o assistente virtual da Barudan do Brasil. Como posso te ajudar hoje?" },
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
      <AppHeader title="Pesquise com Barudex" showBackButton onBackClick={goToHome} />
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
const GlobalChatPage: React.FC<{ user: User; goToHome: () => void; }> = ({ user, goToHome }) => {
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
            <AppHeader title="Bate-Papo (Recados)" showBackButton onBackClick={goToHome} />
            <main className="flex-1 flex flex-col overflow-hidden p-4 md:p-6">
                <div className="flex-1 space-y-4 overflow-y-auto max-w-4xl mx-auto w-full p-2">
                    {messages.map((msg) => (
                        <GlobalChatMessage key={msg.id} message={msg} currentUser={user} />
                    ))}
                    <div ref={chatEndRef} />
                </div>
                <div className="mt-auto bg-transparent">
                    <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-3 py-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Digite sua mensagem..."
                            disabled={isLoading}
                            className="flex-1 bg-gray-200 dark:bg-gray-800 border-transparent rounded-full py-3 px-5 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Caixa de mensagem"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !newMessage.trim()}
                            className="bg-blue-600 text-white rounded-full p-3 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
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