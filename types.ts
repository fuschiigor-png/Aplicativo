
export enum MessageSender {
  USER = 'user',
  AI = 'ai',
  ERROR = 'error',
}

export interface Message {
  id: string;
  sender: MessageSender;
  text: string;
}
