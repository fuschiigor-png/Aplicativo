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

// Helper function to convert File to a GoogleGenerativeAI.Part
async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

export const generateImageInsights = async (imageFile: File, title: string): Promise<{ insights: string; transcript: string; }> => {
  try {
    const ai = getAI();
    const imagePart = await fileToGenerativePart(imageFile);
    const prompt = `Para uma imagem com o título '${title}', por favor, gere o seguinte no formato JSON: 1. Uma descrição detalhada do que está acontecendo na imagem (use a chave 'transcript'). 2. Insights e uma análise resumida do conteúdo da imagem (use a chave 'insights').`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [imagePart, {text: prompt}] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: {
              type: Type.STRING,
              description: 'Descrição detalhada do conteúdo da imagem.'
            },
            insights: {
              type: Type.STRING,
              description: 'Análise e insights sobre o conteúdo da imagem.'
            }
          },
          required: ['transcript', 'insights']
        }
      }
    });

    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString);
    
    return {
      insights: result.insights || "Não foi possível gerar insights.",
      transcript: result.transcript || "Não foi possível gerar a descrição."
    };

  } catch (error) {
    console.error("Error generating insights from Gemini:", error);
    throw new Error("Falha ao gerar insights da imagem.");
  }
};

export const generateChatResponse = async (prompt: string): Promise<string> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: "Você é um assistente de IA amigável e criativo, especializado em fornecer fatos rápidos e curiosidades interessantes sobre qualquer tópico em português. Seja conciso e divertido.",
            }
        });
        return response.text;
    } catch(error) {
        console.error("Error generating chat response from Gemini:", error);
        throw new Error("Falha ao gerar resposta do chat.");
    }
};
