import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI;

const getAI = () => {
  if (!ai) {
    if (!process.env.API_KEY) {
      console.warn("API_KEY environment variable not set. The application might not work as expected.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

export const generateChatResponse = async (prompt: string): Promise<string> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: "Você é um assistente especialista em máquinas de bordado. Responda a perguntas sobre modelos, preços, funcionalidades e dicas de bordado em português. Seja amigável e prestativo.",
            }
        });
        return response.text;
    } catch(error) {
        console.error("Error generating chat response from Gemini:", error);
        throw new Error("Falha ao gerar resposta do chat.");
    }
};
