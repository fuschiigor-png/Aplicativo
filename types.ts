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

// FIX: Export 'ImageAnalysis' type to fix import error in videoService.ts
export interface ImageAnalysis {
  id: string;
  title: string;
  imageUrl: string;
  storagePath: string;
  status: 'processing' | 'completed' | 'failed';
  insights?: string;
  transcript?: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  } | null;
}
