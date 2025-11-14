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

export const getExchangeRate = async (): Promise<number> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Qual a cotação atual de 1 Iene Japonês (JPY) para Real Brasileiro (BRL)? Responda apenas com o valor numérico com 4 casas decimais, por exemplo: 0.0354",
            config: {
                tools: [{googleSearch: {}}],
            },
        });

        const text = response.text;
        // Regex to find a number like 0.1234 or 0,1234
        const match = text.match(/(\d+[,.]\d+)/);
        if (match && match[0]) {
            // Replace comma with dot for float parsing
            const rateString = match[0].replace(',', '.');
            const rate = parseFloat(rateString);
            if (!isNaN(rate)) {
                return rate;
            }
        }
        
        console.error("Could not parse exchange rate from response:", text);
        throw new Error("Não foi possível extrair a taxa de câmbio da resposta.");

    } catch(error) {
        console.error("Error getting exchange rate from Gemini:", error);
        throw new Error("Falha ao buscar a taxa de câmbio.");
    }
};