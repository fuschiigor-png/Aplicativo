
import React from 'react';
import { Message, MessageSender } from '../types';

const UserIcon: React.FC = () => (
  <svg
    className="w-full h-full text-blue-300"
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

const AIIcon: React.FC = () => (
  <svg
    className="w-full h-full text-blue-300"
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M15 4c-2.34 0-4.37 1.2-5.52 3.02C8.75 6.47 8.03 6 7 6c-2.21 0-4 1.79-4 4s1.79 4 4 4c.3 0 .58-.04.85-.11-.56.88-1.22 1.64-2.02 2.24C4.33 17.18 3 19.34 3 22h2c0-2.3 1.34-4.22 3.26-5.23C9.73 16.27 12.5 16 15 16c4.42 0 8-3.58 8-8s-3.58-8-8-8zm-5 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm5-4c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
  </svg>
);

const ErrorIcon: React.FC = () => (
    <svg 
        className="w-full h-full text-red-300"
        fill="currentColor" 
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
);

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { sender, text } = message;

  const isUser = sender === MessageSender.USER;
  const isAI = sender === MessageSender.AI;
  const isError = sender === MessageSender.ERROR;

  const containerClasses = isUser ? 'justify-end' : 'justify-start';
  const bubbleClasses = isUser
    ? 'bg-blue-600 rounded-br-none'
    : isError ? 'bg-red-800/80 rounded-bl-none' : 'bg-gray-700 rounded-bl-none';
  const iconBgClass = isUser ? 'bg-blue-800' : isError ? 'bg-red-900' : 'bg-gray-800';
  
  const Icon = isUser ? UserIcon : isError ? ErrorIcon : AIIcon;

  return (
    <div className={`flex items-end gap-3 ${containerClasses}`}>
      {!isUser && (
        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center p-2 ${iconBgClass}`}>
          <Icon />
        </div>
      )}
      <div
        className={`max-w-md lg:max-w-lg xl:max-w-2xl px-4 py-3 rounded-2xl shadow-md transition-all duration-300 ${bubbleClasses}`}
      >
        <p className="text-white whitespace-pre-wrap">{text}</p>
      </div>
      {isUser && (
         <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center p-2 ${iconBgClass}`}>
            <Icon />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
