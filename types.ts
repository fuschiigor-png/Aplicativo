
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

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  createdAt: { seconds: number; nanoseconds: number; } | null;
  PEDIDO_NUMERO: string;
  PEDIDO_DATA: string;
  VENDEDOR_NOME: string;
  TIPO_VENDA: string;
  CLIENTE_RAZAO_SOCIAL: string;
  CLIENTE_CNPJ: string;
  CLIENTE_INSCRICAO_ESTADUAL: string;
  CLIENTE_ENDERECO: string;
  CLIENTE_BAIRRO: string;
  CLIENTE_CEP: string;
  CLIENTE_CIDADE: string;
  CLIENTE_UF: string;
  CLIENTE_TELEFONE: string;
  CLIENTE_EMAIL: string;
  CLIENTE_CONTATO_AC: string;
  TRANSPORTADORA: string;
  PRODUTO_QUANTIDADE: string;
  PRODUTO_DESCRICAO: string;
  PEDIDO_VALOR_TOTAL: string;
  OBSERVACAO_GERAL: string;
}