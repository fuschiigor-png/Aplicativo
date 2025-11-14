import React, { useState } from 'react';
import { handleSignIn } from '../services/authService';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
        setError('Por favor, preencha todos os campos.');
        return;
    }
    setIsLoading(true);
    setError(null);
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
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-blue-900 text-white font-sans p-4">
      <div className="w-full max-w-md bg-gray-900/50 backdrop-blur-sm rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-blue-300 mb-2">
          Assistente Criativo
        </h1>
        <p className="text-center text-gray-400 mb-8">Faça login para continuar</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
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
              className="mt-1 block w-full bg-gray-700/80 border border-gray-600 rounded-md py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
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
              className="mt-1 block w-full bg-gray-700/80 border border-gray-600 rounded-md py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 disabled:bg-gray-600 disabled:opacity-75 disabled:cursor-not-allowed transition-all duration-200"
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
