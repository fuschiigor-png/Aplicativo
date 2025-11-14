// FIX: Add Message and MessageSender types to resolve import errors in components/ChatMessage.tsx.
export enum MessageSender {
  USER = 'user',
  AI = 'ai',
  ERROR = 'error',
}

export interface Message {
  sender: MessageSender;
  text: string;
}

export interface GlobalChatMessage {
  id: string;
  text: string;
  createdAt: { // Firestore Timestamp structure
    seconds: number;
    nanoseconds: number;
  } | null;
  userId: string;
  userEmail: string;
}

export interface ExchangeRateHistoryEntry {
  id: string;
  rate: number;
  updatedBy: string; // user email
  updatedAt: {
    seconds: number;
    nanoseconds: number;
  } | null;
}