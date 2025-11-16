

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { User } from 'firebase/auth';
import LoginPage from './components/LoginPage';
import { onAuthStateChangedListener, handleSignOut } from './services/authService';
import { Message, MessageSender, GlobalChatMessage as GlobalChatMessageType, ExchangeRateHistoryEntry, Order } from './types';
import ChatInput from './components/ChatInput';
import ChatMessage from './components/ChatMessage';
import GlobalChatMessage from './components/GlobalChatMessage';
import { generateChatResponse, getExchangeRate } from './services/geminiService';
import { getMessagesListener, sendGlobalMessage, getExchangeRateConfigListener, getExchangeRateHistoryListener, updateExchangeRateConfig, saveOrder, getOrdersListener, deleteOrder, getNextOrderNumber, deleteAllOrdersAndResetCounter } from './services/chatService';
import { BarudexIcon, MoonIcon, SunIcon, ModelsIcon, GlobalChatIcon, ExchangeRateIcon, LogoutIcon, DocumentIcon, HistoryIcon, CatalogIcon, TrashIcon } from './components/Icons';
import { generateOrderPdf } from './services/pdfService';

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
type View = 'home' | 'models' | 'chat' | 'global-chat' | 'exchange-rate' | 'order' | 'my-orders' | 'catalog';

const MainDashboard: React.FC<{ user: User; theme: Theme; toggleTheme: () => void; }> = ({ user, theme, toggleTheme }) => {
  const [view, setView] = useState<View>('home');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
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
  
  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    setView('order');
  };

  const handleNewOrder = () => {
    setSelectedOrder(null);
    setView('order');
  };

  return (
    <div className="flex flex-col h-screen text-gray-800 dark:text-gray-200 font-sans">
      {view === 'home' && <HomePage setView={setView} onNewOrderClick={handleNewOrder} />}
      {view === 'models' && <MachineModelsPage goToHome={goToHome} referenceRate={referenceRate} />}
      {view === 'chat' && <ChatPage goToHome={goToHome} />}
      {view === 'global-chat' && <GlobalChatPage user={user} goToHome={goToHome} />}
      {view === 'exchange-rate' && <ExchangeRatePage goToHome={goToHome} savedReferenceRate={referenceRate} history={exchangeRateHistory} onUpdateReferenceRate={handleUpdateReferenceRate} />}
      {view === 'order' && <OrderPage goToHome={goToHome} user={user} initialOrder={selectedOrder} />}
      {view === 'my-orders' && <MyOrdersPage goToHome={goToHome} user={user} onSelectOrder={handleSelectOrder} />}
      {view === 'catalog' && <CatalogPage goToHome={goToHome} />}
      
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

      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white text-center mx-4 truncate">
        {title}
      </h1>

      <div className="flex-1"></div> {/* Spacer div */}
    </header>
  );
};


// HomePage: The main landing page after login
const HomePage: React.FC<{ setView: (view: View) => void; onNewOrderClick: () => void; }> = ({ setView, onNewOrderClick }) => {
  const [buttonsVisible, setButtonsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setButtonsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const navItems = [
      { 
        onClick: () => setView('models'), 
        title: "Modelos e Preços", 
        description: "Consulte especificações e valores",
        icon: <ModelsIcon className="w-6 h-6 text-white" />,
        iconBgColor: "bg-blue-600"
      },
      { 
        onClick: () => setView('catalog'), 
        title: "Catálogo", 
        description: "Insumos e acessórios para bordado",
        icon: <CatalogIcon className="w-6 h-6 text-white" />,
        iconBgColor: "bg-teal-500"
      },
      { 
        onClick: () => setView('chat'), 
        title: "Pesquise com Barudex", 
        description: "Tire suas dúvidas com nosso assistente",
        icon: <BarudexIcon className="w-6 h-6" />,
        iconBgColor: "bg-cyan-500"
      },
      { 
        onClick: () => setView('global-chat'), 
        title: "Bate-Papo", 
        description: "Deixe um recado para a equipe",
        icon: <GlobalChatIcon className="w-6 h-6 text-white" />,
        iconBgColor: "bg-green-500"
      },
      { 
        onClick: () => setView('exchange-rate'), 
        title: "Taxa JPY/BRL", 
        description: "Ajuste a taxa de precificação",
        icon: <ExchangeRateIcon className="w-6 h-6 text-white" />,
        iconBgColor: "bg-amber-500"
      },
      { 
        onClick: onNewOrderClick, 
        title: "Gerar Pedido", 
        description: "Crie um novo pedido de compra",
        icon: <DocumentIcon className="w-6 h-6 text-white" />,
        iconBgColor: "bg-purple-500"
      },
      { 
        onClick: () => setView('my-orders'), 
        title: "Meus Pedidos", 
        description: "Consulte seus pedidos salvos",
        icon: <HistoryIcon className="w-6 h-6 text-white" />,
        iconBgColor: "bg-pink-500"
      },
  ];

  return (
    <>
      <AppHeader title="Lista de preços Barudan" />
      <main className="flex flex-col items-center flex-1 p-4 sm:p-6">
        <div className="w-full max-w-2xl space-y-3">
            {navItems.map((item, index) => (
                <button 
                    key={item.title}
                    onClick={item.onClick}
                    className={`w-full flex items-center gap-4 text-left p-3 rounded-3xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700/60 active:bg-gray-300/80 dark:active:bg-gray-900/60 transition-all duration-500 ease-out ${buttonsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
                    style={{ transitionDelay: `${index * 100}ms` }}
                    aria-label={item.title}
                >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${item.iconBgColor}`}>
                        {item.icon}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-md font-semibold text-gray-800 dark:text-gray-100">{item.title}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                    </div>
                    <svg className="w-5 h-5 ml-auto text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
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

// CatalogPage: Displays a grid of products
const catalogData = [
    {
      name: 'Linha de Bordar Ricamare',
      price: 'R$ 15,00',
      image: 'https://i.ibb.co/6gYCFyN/linha-ricamare.jpg'
    },
    {
      name: 'Agulhas Groz-Beckert',
      price: 'R$ 150,00',
      image: 'https://i.ibb.co/pwns0yV/agulha-groz-beckert.jpg'
    },
    {
      name: 'Entretela Rasgável',
      price: 'R$ 80,00',
      image: 'https://i.ibb.co/fDbk3G6/entretela-rasgavel.jpg'
    },
    {
      name: 'Óleo Singer',
      price: 'R$ 12,00',
      image: 'https://i.ibb.co/hK7dYgR/oleo-singer.jpg'
    },
    {
      name: 'Bastidor Magnético',
      price: 'R$ 450,00',
      image: 'https://i.ibb.co/zNcz7z0/bastidor-magnetico.jpg'
    },
    {
      name: 'Tesoura de Arremate',
      price: 'R$ 25,00',
      image: 'https://i.ibb.co/R9m4HjX/tesoura-arremate.jpg'
    },
];

const CatalogPage: React.FC<{ goToHome: () => void }> = ({ goToHome }) => {
    const [itemsVisible, setItemsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setItemsVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            <AppHeader title="Catálogo" showBackButton onBackClick={goToHome} />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                    {catalogData.map((item, index) => (
                        <div
                            key={item.name}
                            className={`bg-gray-100 dark:bg-gray-800 rounded-3xl p-4 flex flex-col items-center text-center transition-all duration-500 ease-out ${itemsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
                            style={{ transitionDelay: `${index * 75}ms` }}
                        >
                            <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-32 sm:h-40 object-cover rounded-2xl mb-4 bg-gray-200 dark:bg-gray-700"
                                loading="lazy"
                            />
                            <h3 className="flex-1 font-semibold text-gray-800 dark:text-gray-100 text-sm sm:text-base">{item.name}</h3>
                            <p className="mt-2 text-blue-500 font-bold text-lg">{item.price}</p>
                        </div>
                    ))}
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

// OrderPage component with a complete form
const OrderPage: React.FC<{ goToHome: () => void; user: User; initialOrder: Order | null }> = ({ goToHome, user, initialOrder }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    PEDIDO_NUMERO: initialOrder?.PEDIDO_NUMERO || '',
    PEDIDO_DATA: initialOrder?.PEDIDO_DATA || new Date().toISOString().split('T')[0],
    VENDEDOR_NOME: initialOrder?.VENDEDOR_NOME || '',
    TIPO_VENDA: initialOrder?.TIPO_VENDA || '',
    CLIENTE_RAZAO_SOCIAL: initialOrder?.CLIENTE_RAZAO_SOCIAL || '',
    CLIENTE_CNPJ: initialOrder?.CLIENTE_CNPJ || '',
    CLIENTE_ENDERECO: initialOrder?.CLIENTE_ENDERECO || '',
    CLIENTE_BAIRRO: initialOrder?.CLIENTE_BAIRRO || '',
    CLIENTE_CEP: initialOrder?.CLIENTE_CEP || '',
    CLIENTE_CIDADE: initialOrder?.CLIENTE_CIDADE || '',
    CLIENTE_UF: initialOrder?.CLIENTE_UF || '',
    CLIENTE_TELEFONE: initialOrder?.CLIENTE_TELEFONE || '',
    CLIENTE_CONTATO_AC: initialOrder?.CLIENTE_CONTATO_AC || '',
    TRANSPORTADORA: initialOrder?.TRANSPORTADORA || '',
    PRODUTO_QUANTIDADE: initialOrder?.PRODUTO_QUANTIDADE || '1',
    PRODUTO_DESCRICAO: initialOrder?.PRODUTO_DESCRICAO || '',
    PEDIDO_VALOR_TOTAL: initialOrder?.PEDIDO_VALOR_TOTAL || '',
    OBSERVACAO_GERAL: initialOrder?.OBSERVACAO_GERAL || ''
  });

  const isViewMode = !!initialOrder;

  useEffect(() => {
    if (!isViewMode) {
      setFormData(prev => ({ ...prev, PEDIDO_NUMERO: 'Carregando...' }));
      const fetchOrderNumber = async () => {
        try {
          const nextNumber = await getNextOrderNumber();
          setFormData(prev => ({ ...prev, PEDIDO_NUMERO: nextNumber }));
        } catch (error) {
          console.error("Failed to fetch next order number:", error);
          setFormData(prev => ({ ...prev, PEDIDO_NUMERO: 'ERRO!' }));
          alert("Não foi possível obter um número de pedido automático. Por favor, tente recarregar a página.");
        }
      };
      fetchOrderNumber();
    }
  }, [isViewMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isViewMode && (formData.PEDIDO_NUMERO === 'Carregando...' || formData.PEDIDO_NUMERO === 'ERRO!')) {
        alert("Aguarde o número do pedido ser gerado ou recarregue a página se houver um erro.");
        return;
    }

    setIsSaving(true);
    
    const formElementId = 'order-form-container';
    const fileName = `Pedido-${formData.PEDIDO_NUMERO || 'Novo'}`;

    try {
        if (!isViewMode) {
             if (!user.email) throw new Error("Usuário sem e-mail.");
             await saveOrder(user.uid, user.email, formData);
        }
        await generateOrderPdf(formElementId, fileName);
        if (!isViewMode) {
            alert("Pedido salvo e PDF gerado com sucesso!");
        }
    } catch (error) {
        console.error("Falha ao processar o pedido:", error);
        alert("Ocorreu um erro. Verifique o console para mais detalhes.");
    } finally {
        setIsSaving(false);
    }
  };

  const inputClass = "text-sm w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-1.5 px-2 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 read-only:bg-gray-200 dark:read-only:bg-gray-800/50";
  const labelClass = "block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1";
  
  return (
    <>
      <AppHeader title={isViewMode ? "Detalhes do Pedido" : "Gerar Pedido"} showBackButton onBackClick={goToHome} />
      <main className="flex-1 overflow-y-auto p-2 sm:p-4">
        <form onSubmit={handleSubmit} id="order-form-container" className="max-w-3xl mx-auto space-y-3 mb-24 p-4 bg-white dark:bg-gray-800 shadow-lg rounded-xl">
            
            <div className="flex flex-row justify-between items-start gap-4 border-b border-gray-200 dark:border-gray-700 pb-3">
                <div className="text-left text-[10px] leading-tight text-gray-600 dark:text-gray-400 space-y-0.5">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">Barudan do Brasil Com. e Ind. Ltda.</h2>
                    <p>Av. Gomes Freire, 574 - Centro Rio de Janeiro - RJ - Cep: 20231-015</p>
                    <p>Tel.: (21) 2506-0050 - Fax: (21) 2506-0070</p>
                    <p>Website: www.barudan.com.br - E-mail: sac@barudan.com.br</p>
                    <p>CNPJ: 40.375.636/0001-32 - Inscrição Estadual: 84.369.381</p>
                </div>
                
                <div className="flex-shrink-0 w-auto">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                        <div><label htmlFor="PEDIDO_NUMERO" className={labelClass}>Nº Pedido</label><input type="text" name="PEDIDO_NUMERO" id="PEDIDO_NUMERO" value={formData.PEDIDO_NUMERO} className={inputClass} readOnly /></div>
                        <div><label htmlFor="PEDIDO_DATA" className={labelClass}>Data</label><input type="date" name="PEDIDO_DATA" id="PEDIDO_DATA" value={formData.PEDIDO_DATA} onChange={handleInputChange} className={inputClass} readOnly={isViewMode} /></div>
                        <div className="col-span-2"><label htmlFor="VENDEDOR_NOME" className={labelClass}>Vendedor</label><input type="text" name="VENDEDOR_NOME" id="VENDEDOR_NOME" value={formData.VENDEDOR_NOME} onChange={handleInputChange} className={inputClass} readOnly={isViewMode} /></div>
                        <div className="col-span-2"><label htmlFor="TIPO_VENDA" className={labelClass}>Tipo de Venda</label><input type="text" name="TIPO_VENDA" id="TIPO_VENDA" value={formData.TIPO_VENDA} onChange={handleInputChange} className={inputClass} readOnly={isViewMode} /></div>
                    </div>
                </div>
            </div>

            <section>
                <h2 className="text-base font-semibold mb-2 text-gray-800 dark:text-gray-200">Dados do Cliente</h2>
                <div className="grid grid-cols-12 gap-x-3 gap-y-2">
                    <div className="col-span-12">
                        <label htmlFor="CLIENTE_RAZAO_SOCIAL" className={labelClass}>Razão Social</label>
                        <input type="text" name="CLIENTE_RAZAO_SOCIAL" id="CLIENTE_RAZAO_SOCIAL" value={formData.CLIENTE_RAZAO_SOCIAL} onChange={handleInputChange} className={inputClass} readOnly={isViewMode} />
                    </div>
                    
                    <div className="col-span-12 md:col-span-5">
                        <label htmlFor="CLIENTE_CNPJ" className={labelClass}>CNPJ</label>
                        <input type="text" name="CLIENTE_CNPJ" id="CLIENTE_CNPJ" value={formData.CLIENTE_CNPJ} onChange={handleInputChange} className={inputClass} readOnly={isViewMode} maxLength={18} />
                    </div>

                    <div className="col-span-12 md:col-span-7">
                        <label htmlFor="CLIENTE_TELEFONE" className={labelClass}>Telefone</label>
                        <input type="tel" name="CLIENTE_TELEFONE" id="CLIENTE_TELEFONE" value={formData.CLIENTE_TELEFONE} onChange={handleInputChange} className={inputClass} readOnly={isViewMode} maxLength={20} />
                    </div>

                    <div className="col-span-12">
                        <label htmlFor="CLIENTE_ENDERECO" className={labelClass}>Endereço</label>
                        <input type="text" name="CLIENTE_ENDERECO" id="CLIENTE_ENDERECO" value={formData.CLIENTE_ENDERECO} onChange={handleInputChange} className={inputClass} readOnly={isViewMode} />
                    </div>

                    <div className="col-span-12 md:col-span-6">
                        <label htmlFor="CLIENTE_BAIRRO" className={labelClass}>Bairro</label>
                        <input type="text" name="CLIENTE_BAIRRO" id="CLIENTE_BAIRRO" value={formData.CLIENTE_BAIRRO} onChange={handleInputChange} className={inputClass} readOnly={isViewMode} />
                    </div>

                    <div className="col-span-12 md:col-span-6">
                        <label htmlFor="CLIENTE_CIDADE" className={labelClass}>Cidade</label>
                        <input type="text" name="CLIENTE_CIDADE" id="CLIENTE_CIDADE" value={formData.CLIENTE_CIDADE} onChange={handleInputChange} className={inputClass} readOnly={isViewMode} />
                    </div>
                    
                    <div className="col-span-12 md:col-span-4">
                        <label htmlFor="CLIENTE_CEP" className={labelClass}>CEP</label>
                        <input type="text" name="CLIENTE_CEP" id="CLIENTE_CEP" value={formData.CLIENTE_CEP} onChange={handleInputChange} className={inputClass} readOnly={isViewMode} maxLength={9} />
                    </div>

                    <div className="col-span-12 md:col-span-2">
                        <label htmlFor="CLIENTE_UF" className={labelClass}>UF</label>
                        <input type="text" name="CLIENTE_UF" id="CLIENTE_UF" value={formData.CLIENTE_UF} onChange={handleInputChange} className={inputClass} readOnly={isViewMode} maxLength={2} />
                    </div>

                    <div className="col-span-12 md:col-span-6">
                        <label htmlFor="CLIENTE_CONTATO_AC" className={labelClass}>Contato (A/C)</label>
                        <input type="text" name="CLIENTE_CONTATO_AC" id="CLIENTE_CONTATO_AC" value={formData.CLIENTE_CONTATO_AC} onChange={handleInputChange} className={inputClass} readOnly={isViewMode} />
                    </div>
                </div>
            </section>

            <section>
                <h2 className="text-base font-semibold mb-2 text-gray-800 dark:text-gray-200">Produto / Observações</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-x-3 gap-y-2">
                     <div className="md:col-span-1"><label htmlFor="PRODUTO_QUANTIDADE" className={labelClass}>Quantidade</label><input type="number" name="PRODUTO_QUANTIDADE" id="PRODUTO_QUANTIDADE" value={formData.PRODUTO_QUANTIDADE} onChange={handleInputChange} className={inputClass} readOnly={isViewMode} /></div>
                     <div className="md:col-span-3"><label htmlFor="PRODUTO_DESCRICAO" className={labelClass}>Descrição do Produto</label><textarea name="PRODUTO_DESCRICAO" id="PRODUTO_DESCRICAO" value={formData.PRODUTO_DESCRICAO} onChange={handleInputChange} className={`${inputClass} h-20`} readOnly={isViewMode}></textarea></div>
                     <div className="md:col-span-4"><label htmlFor="OBSERVACAO_GERAL" className={labelClass}>Observação Geral</label><textarea name="OBSERVACAO_GERAL" id="OBSERVACAO_GERAL" value={formData.OBSERVACAO_GERAL} onChange={handleInputChange} className={`${inputClass} h-20`} readOnly={isViewMode}></textarea></div>
                </div>
            </section>
            
            <section>
                <h2 className="text-base font-semibold mb-2 text-gray-800 dark:text-gray-200">Condições Comerciais</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-2">
                    <div><label htmlFor="PEDIDO_VALOR_TOTAL" className={labelClass}>Valor Total (R$)</label><input type="text" name="PEDIDO_VALOR_TOTAL" id="PEDIDO_VALOR_TOTAL" value={formData.PEDIDO_VALOR_TOTAL} onChange={handleInputChange} className={inputClass} readOnly={isViewMode} /></div>
                </div>
            </section>

            <section>
                <h2 className="text-base font-semibold mb-2 text-gray-800 dark:text-gray-200">Transporte</h2>
                <div className="grid grid-cols-1">
                    <div><label htmlFor="TRANSPORTADORA" className={labelClass}>Transportadora</label><input type="text" name="TRANSPORTADORA" id="TRANSPORTADORA" value={formData.TRANSPORTADORA} onChange={handleInputChange} className={inputClass} readOnly={isViewMode} /></div>
                </div>
            </section>


            <div className="pt-4 flex justify-end">
                <button type="submit" disabled={isSaving} className="w-full sm:w-auto flex justify-center py-2 px-6 border border-transparent rounded-full shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-blue-500 disabled:bg-gray-400 dark:disabled:bg-gray-600">
                    {isSaving ? 'Processando...' : (isViewMode ? 'Baixar PDF Novamente' : 'Salvar e Gerar PDF')}
                </button>
            </div>
        </form>
      </main>
    </>
  );
};


const MyOrdersPage: React.FC<{ goToHome: () => void; user: User; onSelectOrder: (order: Order) => void; }> = ({ goToHome, user, onSelectOrder }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        const unsubscribe = getOrdersListener(user.uid, (fetchedOrders) => {
            setOrders(fetchedOrders);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [user.uid]);

    const handleDeleteOrder = async (orderId: string) => {
        if (window.confirm('Tem certeza que deseja excluir este pedido? A ação não pode ser desfeita.')) {
            try {
                await deleteOrder(orderId);
            } catch (error) {
                console.error("Failed to delete order:", error);
                alert("Falha ao excluir o pedido.");
            }
        }
    };

    const handleDeleteAllOrders = async () => {
        if (window.confirm('TEM CERTEZA?\n\nIsso excluirá TODOS os seus pedidos e reiniciará a contagem de numeração para 1387. Esta ação é irreversível.')) {
            try {
                await deleteAllOrdersAndResetCounter(user.uid);
                alert('Todos os pedidos foram excluídos e o contador foi reiniciado com sucesso.');
            } catch (error) {
                console.error("Failed to delete all orders:", error);
                alert("Falha ao excluir todos os pedidos.");
            }
        }
    };

    return (
        <>
            <AppHeader title="Meus Pedidos" showBackButton onBackClick={goToHome} />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="max-w-4xl mx-auto space-y-4">
                     {!isLoading && orders.length > 0 && (
                        <div className="flex justify-end mb-2">
                            <button
                                onClick={handleDeleteAllOrders}
                                className="flex items-center gap-2 text-sm text-red-500 bg-red-100/50 dark:text-red-400 dark:bg-red-900/40 hover:bg-red-100 dark:hover:bg-red-900/80 font-semibold px-4 py-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-red-500"
                                aria-label="Excluir todos os pedidos e reiniciar contagem"
                            >
                                <TrashIcon className="w-4 h-4" />
                                <span>Limpar Tudo e Reiniciar</span>
                            </button>
                        </div>
                    )}
                    {isLoading && <p className="text-center text-gray-500 dark:text-gray-400 animate-pulse">Carregando pedidos...</p>}
                    {!isLoading && orders.length === 0 && (
                        <div className="text-center py-10 bg-gray-100 dark:bg-gray-800 rounded-3xl">
                            <p className="text-lg text-gray-600 dark:text-gray-300">Você ainda não tem pedidos salvos.</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Crie um novo pedido na tela inicial.</p>
                        </div>
                    )}
                    {orders.map(order => (
                        <div
                            key={order.id}
                            onClick={() => onSelectOrder(order)}
                            className="w-full flex items-center justify-between text-left p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700/60 transition-colors cursor-pointer"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectOrder(order); }}
                            aria-label={`Ver detalhes do pedido ${order.PEDIDO_NUMERO || 'N/A'}`}
                        >
                            <div className="flex-1 flex items-center justify-between text-left">
                                <div>
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">Pedido Nº: {order.PEDIDO_NUMERO || 'N/A'}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Cliente: {order.CLIENTE_RAZAO_SOCIAL}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : ''}
                                    </p>
                                    <span className="text-blue-500 text-sm font-semibold">Ver Detalhes</span>
                                </div>
                            </div>
                             <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteOrder(order.id);
                                }}
                                className="ml-4 flex-shrink-0 p-2 rounded-full text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-500 dark:hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-red-500"
                                aria-label={`Excluir pedido ${order.PEDIDO_NUMERO || 'N/A'}`}
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            </main>
        </>
    );
};


export default App;