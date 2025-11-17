import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { GlobalChatMessage as GlobalChatMessageType } from '../types';

interface GlobalChatMessageProps {
    message: GlobalChatMessageType;
    currentUser: User;
}

const GlobalChatMessage: React.FC<GlobalChatMessageProps> = ({ message, currentUser }) => {
    const { text, userEmail, userId, createdAt } = message;
    const [isVisible, setIsVisible] = useState(false);
    
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 50);
        return () => clearTimeout(timer);
    }, []);

    const isCurrentUser = currentUser.uid === userId;

    const formattedTime = createdAt
        ? new Date(createdAt.seconds * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : '';

    const containerClasses = isCurrentUser ? 'justify-end' : 'justify-start';
    const bubbleClasses = isCurrentUser
        ? 'bg-primary text-white'
        : 'bg-primary-light dark:bg-surface-dark text-text-primary dark:text-text-primary-dark shadow-sm';

    return (
        <div className={`flex items-end gap-3 ${containerClasses} transition-all duration-500 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                {!isCurrentUser && (
                    <span className="text-xs text-text-subtle dark:text-text-secondary-dark mb-1 px-2">{userEmail}</span>
                )}
                <div
                    className={`max-w-md lg:max-w-lg xl:max-w-2xl px-4 py-3 rounded-2xl shadow-sm ${bubbleClasses}`}
                >
                    <p className="text-inherit whitespace-pre-wrap">{text}</p>
                </div>
                <span className="text-xs text-text-subtle dark:text-text-secondary-dark mt-1 px-2">{formattedTime}</span>
            </div>
        </div>
    );
};

export default GlobalChatMessage;