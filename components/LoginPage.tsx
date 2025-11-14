import React, { useState } from 'react';
import { handleSignIn } from '../services/authService';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Limpa erros anteriores

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
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white font-sans p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
        <h1 className="text-3xl font-bold text-center text-sky-600 dark:text-sky-400 mb-2">
          Lista de preços Barudan do Brasil
        </h1>
        <p className="text-center text-slate-500 dark:text-slate-400 mb-8">Faça login para continuar</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-600 dark:text-slate-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-3 px-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-600 dark:text-slate-300">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-3 px-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-sky-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:opacity-75 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? 'Entrando...' : 'Entrar / Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;