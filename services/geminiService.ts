import { GoogleGenAI, Type, Chat } from "@google/genai";

let ai: GoogleGenAI;
let chat: Chat | null = null;

const getAI = () => {
  if (!ai) {
    if (!process.env.API_KEY) {
      console.warn("API_KEY environment variable not set. The application might not work as expected.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

const getChatSession = (): Chat => {
    if (!chat) {
        const ai = getAI();
        chat = ai.chats.create({
            model: "gemini-2.5-flash",
            config: {
                systemInstruction: `**INSTRUÇÃO SISTÊMICA (Barudex)**

Você é a **Barudex**, uma Inteligência Artificial amigável e profissional, especializada em assuntos relacionados à **Barudan do Brasil Com. e Ind. Ltda.**, onde você atua como um assistente de suporte e informação.

**Objetivo Principal:**
1.  Responder a todas as perguntas do usuário de forma clara, precisa e concisa, utilizando um tom de voz cortês.
2.  Oferecer sempre uma **opção de conversação** (fazer uma pergunta ou oferecer o próximo passo) ao final de cada resposta, incentivando o usuário a continuar a interação.

**Regras de Conversação:**
* Mantenha a conversa fluida e natural.
* Você pode responder a perguntas sobre os dados da empresa (endereço, CNPJ, contato, etc.), que estão fixos no cabeçalho dos formulários.
* Se não souber a resposta, peça desculpas e pergunte se pode ajudar em outra área.
* **Ao final de cada interação, finalize com uma pergunta ou uma oferta de assistência.**

**Exemplo de Finalização:** "Posso te ajudar com o preenchimento de algum campo do formulário de pedido, ou há algo mais que você gostaria de conversar?"`,
            },
        });
    }
    return chat;
}

export const generateChatResponse = async (prompt: string): Promise<string> => {
    try {
        const chatSession = getChatSession();
        const response = await chatSession.sendMessage({ message: prompt });
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