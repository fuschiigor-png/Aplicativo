import { GoogleGenAI, Chat, GenerateContentResponse, Content } from "@google/genai";
import { Message, MessageSender } from "../types";

const SYSTEM_INSTRUCTION = "Você é um assistente criativo e prestativo. Seu objetivo é dar respostas curtas e interessantes em português, focando em curiosidades ou fatos rápidos sobre o tópico que o usuário perguntar. Mantenha as respostas concisas, fascinantes e amigáveis.";

let chat: Chat | null = null;

const mapMessagesToGeminiHistory = (messages: Message[]): Content[] => {
  const conversationMessages = messages.filter(
    (msg) => msg.sender === MessageSender.USER || msg.sender === MessageSender.AI
  );

  // The Gemini API requires the history to start with a user message.
  const firstUserIndex = conversationMessages.findIndex(
    (msg) => msg.sender === MessageSender.USER
  );

  // If there are no user messages, the history is empty for the API.
  if (firstUserIndex === -1) {
    return [];
  }

  // Start the history from the first user message.
  const validHistoryMessages = conversationMessages.slice(firstUserIndex);

  return validHistoryMessages.map((msg) => ({
    role: msg.sender === MessageSender.USER ? 'user' : 'model',
    parts: [{ text: msg.text }],
  }));
};

export const initializeChat = (history: Message[]): void => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const geminiHistory = mapMessagesToGeminiHistory(history);

  chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    history: geminiHistory,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });
};

export const sendMessageToAI = async (message: string): Promise<string> => {
  if (!chat) {
    // Attempt to initialize chat if it's not already
    initializeChat([]);
    if (!chat) {
      throw new Error("Chat could not be initialized.");
    }
  }
  
  try {
    const response: GenerateContentResponse = await chat.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    throw new Error("Failed to get response from Gemini API.");
  }
};