export interface ImageAnalysis {
  id: string;
  title: string;
  imageUrl: string;
  storagePath: string;
  createdAt: { // Firestore Timestamp structure
    seconds: number;
    nanoseconds: number;
  };
  status: 'processing' | 'completed' | 'failed';
  insights?: string;
  transcript?: string;
}

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
