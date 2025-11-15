import React, { useState } from 'react';
import { handleSignIn, handlePasswordResetRequest } from '../services/authService';

type View = 'login' | 'reset' | 'reset_sent';

const LoginPage: React.FC = () => {
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
        setError('Por favor, preencha todos os campos.');
        return;
    }
    if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        return;
    }

    setIsLoading(true);
    try {
      await handleSignIn(email, password);
    } catch (err: any) {
      setError('Falha ao entrar. Verifique seu e-mail e senha.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
        setError('Por favor, insira seu e-mail.');
        return;
    }
    
    setIsLoading(true);
    try {
        await handlePasswordResetRequest(email);
        setView('reset_sent');
    } catch (err: any) {
        setError('Falha ao enviar o e-mail. Verifique o endereço e tente novamente.');
    } finally {
        setIsLoading(false);
    }
  };

  const renderLoginView = () => (
    <>
      <h1 className="text-4xl font-bold text-center text-white mb-2">Bem-vindo(a)!</h1>
      <p className="text-center text-gray-400 mb-10">Faça login na sua conta para continuar</p>
      <form onSubmit={handleLoginSubmit} className="space-y-4">
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full bg-gray-800 border-transparent rounded-2xl py-4 px-6 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          className="w-full bg-gray-800 border-transparent rounded-2xl py-4 px-6 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="text-right">
            <button
              type="button"
              onClick={() => { setView('reset'); setError(null); }}
              className="text-sm text-blue-400 hover:underline focus:outline-none"
            >
              Esqueceu a senha?
            </button>
        </div>
        {error && <p className="text-red-500 text-sm text-center pt-2">{error}</p>}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-full shadow-sm text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 disabled:bg-gray-600 disabled:opacity-75"
          >
            {isLoading ? 'Entrando...' : 'Entrar / Registrar'}
          </button>
        </div>
      </form>
      <p className="text-center text-sm text-gray-500 mt-8">
        Não tem conta? O registro é automático ao entrar pela primeira vez.
      </p>
    </>
  );

  const renderResetView = () => (
    <>
        <h1 className="text-3xl font-bold text-center text-white mb-2">Redefinir Senha</h1>
        <p className="text-center text-gray-400 mb-10">Insira seu e-mail para receber o link de redefinição.</p>
        <form onSubmit={handleResetSubmit} className="space-y-4">
            <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full bg-gray-800 border-transparent rounded-2xl py-4 px-6 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="text-red-500 text-sm text-center pt-2">{error}</p>}
            <div className="pt-4">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-4 px-4 border border-transparent rounded-full shadow-sm text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 disabled:bg-gray-600"
                >
                    {isLoading ? 'Enviando...' : 'Enviar Link'}
                </button>
            </div>
        </form>
        <button
          onClick={() => { setView('login'); setError(null); }}
          className="text-center text-sm text-gray-400 mt-8 w-full hover:underline"
        >
          Voltar para o login
        </button>
    </>
  );

  const renderResetSentView = () => (
    <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Link Enviado!</h1>
        <p className="text-gray-300 mb-8">Verifique sua caixa de entrada (e spam) para redefinir sua senha.</p>
        <button
          onClick={() => { setView('login'); setEmail(''); setError(null); }}
          className="w-full flex justify-center py-4 px-4 border border-transparent rounded-full shadow-sm text-lg font-bold text-white bg-blue-600 hover:bg-blue-700"
        >
          Voltar para o Login
        </button>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white p-4">
      <div className="w-full max-w-sm pt-12">
        {view === 'login' && renderLoginView()}
        {view === 'reset' && renderResetView()}
        {view === 'reset_sent' && renderResetSentView()}
      </div>
    </div>
  );
};

export default LoginPage;