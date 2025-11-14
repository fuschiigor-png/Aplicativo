import React, { useState, useEffect } from 'react';
import { Message, MessageSender } from '../types';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { sender, text } = message;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const isUser = sender === MessageSender.USER;
  const isError = sender === MessageSender.ERROR;

  const containerClasses = isUser ? 'justify-end' : 'justify-start';
  const bubbleClasses = isUser
    ? 'bg-blue-600 text-white'
    : isError 
    ? 'bg-red-100 dark:bg-red-900/50 text-red-900 dark:text-red-100' 
    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  
  return (
    <div className={`flex items-start gap-3 ${containerClasses} transition-all duration-500 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div
        className={`max-w-md lg:max-w-lg xl:max-w-2xl px-4 py-3 rounded-2xl shadow-sm ${bubbleClasses}`}
      >
        <p className="whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
};

export default ChatMessage;
