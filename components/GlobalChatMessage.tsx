import React from 'react';
import { User } from 'firebase/auth';
import { GlobalChatMessage as GlobalChatMessageType } from '../types';

interface GlobalChatMessageProps {
    message: GlobalChatMessageType;
    currentUser: User;
}

const GlobalChatMessage: React.FC<GlobalChatMessageProps> = ({ message, currentUser }) => {
    const { text, userEmail, userId, createdAt } = message;
    const isCurrentUser = currentUser.uid === userId;

    const formattedTime = createdAt
        ? new Date(createdAt.seconds * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : '';

    const containerClasses = isCurrentUser ? 'justify-end' : 'justify-start';
    const bubbleClasses = isCurrentUser
        ? 'bg-sky-600 text-white rounded-br-none'
        : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none';

    return (
        <div className={`flex items-end gap-3 ${containerClasses}`}>
            <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                {!isCurrentUser && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 px-2">{userEmail}</span>
                )}
                <div
                    className={`max-w-md lg:max-w-lg xl:max-w-2xl px-4 py-3 rounded-2xl shadow-md ${bubbleClasses}`}
                >
                    <p className="text-inherit whitespace-pre-wrap">{text}</p>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 px-2">{formattedTime}</span>
            </div>
        </div>
    );
};

export default GlobalChatMessage;