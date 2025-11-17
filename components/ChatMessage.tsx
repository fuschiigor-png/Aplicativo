import React, { useState, useEffect } from 'react';
import { Message, MessageSender } from '../types';
import { BarudexIcon } from './Icons';

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
  const isAI = sender === MessageSender.AI;
  const isError = sender === MessageSender.ERROR;

  const containerClasses = isUser ? 'justify-end' : 'justify-start';
  const bubbleClasses = isUser
    ? 'bg-primary text-white'
    : isError 
    ? 'bg-error text-white' 
    : 'bg-primary-light dark:bg-surface-dark text-text-primary dark:text-text-primary-dark shadow-sm';
  
  const manualSnippetRegex = /```manual\n([\s\S]+?)```/;
  const match = text.match(manualSnippetRegex);

  let mainText = text;
  let snippetText: string | null = null;

  if (match) {
    mainText = text.replace(manualSnippetRegex, '').trim();
    snippetText = match[1].trim();
  }

  return (
    <div className={`flex items-start gap-3 ${containerClasses} transition-all duration-500 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {isAI && <BarudexIcon className={`w-8 h-8 mt-1 transition-transform duration-300 ease-out delay-200 ${isVisible ? 'scale-100' : 'scale-0'}`} />}
      <div
        className={`max-w-md lg:max-w-lg xl:max-w-2xl px-4 py-3 rounded-2xl shadow-sm ${bubbleClasses}`}
      >
        {mainText && <p className="whitespace-pre-wrap">{mainText}</p>}
        {snippetText && (
            <div className={`${mainText ? 'mt-3' : ''} border border-border-color dark:border-border-dark rounded-lg p-3 bg-white/80 dark:bg-black/20`}>
                <p className="text-xs font-semibold text-text-subtle dark:text-text-secondary-dark mb-2">Trecho do Manual</p>
                <p className="text-sm font-mono whitespace-pre-wrap text-text-secondary dark:text-text-secondary-dark">{snippetText}</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;