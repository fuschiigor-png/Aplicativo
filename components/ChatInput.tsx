import React, { useState, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onSendCuriosity: () => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, onSendCuriosity, isLoading }) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleCuriosityClick = () => {
    if (!isLoading) {
      onSendCuriosity();
    }
  };

  return (
    <div className="bg-transparent p-3 md:p-4">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex items-center gap-3">
        <button
          type="button"
          onClick={handleCuriosityClick}
          disabled={isLoading}
          className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-full flex-shrink-0 flex items-center justify-center text-amber-500 dark:text-amber-400 hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-110 active:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-950 focus:ring-amber-400"
          aria-label="Pedir uma curiosidade aleatória"
        >
          <svg 
            className="w-6 h-6" 
            fill="currentColor"
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.34 0 .68-.02 1.01-.07C10.13 20.2 8 16.91 8 13c0-3.31 2.69-6 6-6 1.66 0 3.16.67 4.24 1.76A9.959 9.959 0 0012 2zm-1 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" opacity=".3"/>
            <path d="M12 22c-3.09 0-5.87-1.73-7.2-4.32.1-.03.2-.08.3-.12.24-.09.49-.17.74-.24.2-.05.4-.1.6-.17.21-.07.43-.13.64-.2.2-.07.4-.15.58-.23l.1-.04c.28-.12.56-.25.82-.4.13-.07.26-.15.39-.22.25-.14.5-.29.75-.45.24-.16.48-.33.71-.51.23-.18.44-.38.65-.58.21-.2.4-.41.59-.62.18-.21.36-.43.51-.66.16-.23.3-.47.43-.71s.24-.49.33-.74c.1-.25.17-.5.24-.75.07-.25.12-.5.18-.75.05-.26.09-.52.13-.78.04-.27.06-.54.08-.81.02-.27.03-.55.03-.83 0-3.09-1.73-5.87-4.32-7.2.03.1.08.2.12.3.09.24.17.49.24.74.05.2.1.4.17.6.07.21.13.43.2.64.07.2.15.4.23.58l.04.1c.12.28.25.56.4.82.07.13.15.26.22.39.14.25.29.5.45.75.16.24.33.48.51.71.18.23.38.44.58.65.2.21.41.4.62.59.21.18.43.36.66.51.23.16.47.3.71.43s.49.24.74.33c.25.1.5.17.75.24.25.07.5.12.75.18.26.05.52.09.78.13.27.04.54.06.81.08.27.02.55.03.83.03 5.52 0 10-4.48 10-10S17.52 2 12 2c-.34 0-.68.02-1.01.07 2.89 1.71 4.76 4.89 4.76 8.43 0 3.69-2.08 6.9-5.13 8.58.63.29 1.33.42 2.06.42.06 0 .11 0 .17-.01z"/>
          </svg>
        </button>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Pergunte algo..."
          disabled={isLoading}
          rows={1}
          className="flex-1 bg-gray-200 dark:bg-gray-800 border-transparent rounded-full py-3 px-5 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50"
          aria-label="Caixa de mensagem"
        />
        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="w-12 h-12 bg-blue-600 rounded-full flex-shrink-0 flex items-center justify-center text-white hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transform hover:scale-110 active:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-950 focus:ring-blue-500"
          aria-label="Enviar mensagem"
        >
          <svg
            className="w-6 h-6 transform rotate-90"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            ></path>
          </svg>
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
