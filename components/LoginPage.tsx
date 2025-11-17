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
  
  const inputClass = "h-11 w-full bg-surface-light dark:bg-surface-dark border border-border-color dark:border-border-dark rounded-lg py-2.5 px-4 text-text-primary dark:text-text-primary-dark placeholder-placeholder focus:outline-none focus:ring-2 focus:ring-primary focus:shadow-focus-ring";

  const renderLoginView = () => (
    <>
      <h1 className="text-3xl font-bold text-center text-text-primary dark:text-text-primary-dark mb-2">Bem-vindo(a)!</h1>
      <p className="text-center text-text-secondary dark:text-text-secondary-dark mb-10">Faça login na sua conta para continuar.</p>
      <form onSubmit={handleLoginSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-subtle dark:text-text-secondary-dark mb-1" htmlFor="email-login">Email</label>
          <input
            id="email-login"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-subtle dark:text-text-secondary-dark mb-1" htmlFor="password-login">Senha</label>
          <input
            id="password-login"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha"
            className={inputClass}
          />
        </div>
        <div className="text-right pt-1">
            <button
              type="button"
              onClick={() => { setView('reset'); setError(null); }}
              className="text-sm text-primary hover:underline focus:outline-none"
            >
              Esqueceu a senha?
            </button>
        </div>
        {error && <p className="text-error text-sm text-center pt-2">{error}</p>}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 flex justify-center items-center px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-light dark:focus:ring-offset-background-dark focus:ring-primary disabled:bg-primary/50 disabled:opacity-75"
          >
            {isLoading ? 'Entrando...' : 'Entrar / Registrar'}
          </button>
        </div>
      </form>
      <p className="text-center text-sm text-text-subtle dark:text-text-secondary-dark mt-8">
        Não tem conta? O registro é automático ao entrar pela primeira vez.
      </p>
    </>
  );

  const renderResetView = () => (
    <>
        <h1 className="text-3xl font-bold text-center text-text-primary dark:text-text-primary-dark mb-2">Redefinir Senha</h1>
        <p className="text-center text-text-secondary dark:text-text-secondary-dark mb-10">Insira seu e-mail para receber o link de redefinição.</p>
        <form onSubmit={handleResetSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-subtle dark:text-text-secondary-dark mb-1" htmlFor="email-reset">Email</label>
            <input
                id="email-reset"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className={inputClass}
            />
          </div>
            {error && <p className="text-error text-sm text-center pt-2">{error}</p>}
            <div className="pt-4">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 flex justify-center items-center px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-light dark:focus:ring-offset-background-dark focus:ring-primary disabled:bg-primary/50"
                >
                    {isLoading ? 'Enviando...' : 'Enviar Link'}
                </button>
            </div>
        </form>
        <button
          onClick={() => { setView('login'); setError(null); }}
          className="text-center text-sm text-text-subtle dark:text-text-secondary-dark mt-8 w-full hover:underline"
        >
          Voltar para o login
        </button>
    </>
  );

  const renderResetSentView = () => (
    <div className="text-center">
        <h1 className="text-3xl font-bold text-text-primary dark:text-text-primary-dark mb-4">Link Enviado!</h1>
        <p className="text-text-secondary dark:text-text-secondary-dark mb-8">Verifique sua caixa de entrada (e spam) para redefinir sua senha.</p>
        <button
          onClick={() => { setView('login'); setEmail(''); setError(null); }}
          className="w-full h-11 flex justify-center items-center px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-dark"
        >
          Voltar para o Login
        </button>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-text-primary-dark p-6">
      <div className="w-full max-w-sm pt-12">
        {view === 'login' && renderLoginView()}
        {view === 'reset' && renderResetView()}
        {view === 'reset_sent' && renderResetSentView()}
      </div>
    </div>
  );
};

export default LoginPage;