import React from 'react';

// Base64 encoded icon data to prevent extra network requests and ensure it's always available.
const barudexIconDataUri = 'data:image/png;base64,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';

export const BarudexIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`flex-shrink-0 ${className}`}>
    <img src={barudexIconDataUri} alt="Ícone do assistente Barudex" className="w-full h-full object-contain" />
  </div>
);

export const SunIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
);

export const MoonIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
);

export const ModelsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="3" y1="9" x2="21" y2="9"></line>
        <line x1="9" y1="21" x2="9" y2="9"></line>
    </svg>
);

export const GlobalChatIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
);

export const ExchangeRateIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="19" x2="12" y2="5"></line>
        <polyline points="5 12 12 5 19 12"></polyline>
    </svg>
);

export const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
    </svg>
);
