import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp, onSnapshot, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db, storage } from "./firebase";

// A funcionalidade de processamento de imagem foi removida.
// Este arquivo é mantido para preservar a estrutura do projeto, mas suas funções estão desativadas.

interface ImageAnalysis {
  id: string;
  [key: string]: any;
}

/**
 * @deprecated A funcionalidade de processamento de imagem não está mais em uso.
 */
export const processImage = async (
  userId: string,
  imageFile: File,
  title: string,
  onProgress: (message: string) => void
): Promise<void> => {
  console.warn("A função processImage está obsoleta e não executa nenhuma ação.");
  return Promise.resolve();
};

/**
 * @deprecated A funcionalidade de busca de imagem não está mais em uso.
 */
export const getUserImages = (
  userId: string,
  callback: (images: ImageAnalysis[]) => void
) => {
  console.warn("A função getUserImages está obsoleta e não executa nenhuma ação.");
  callback([]);
  return () => {}; // Retorna uma função de cancelamento de inscrição vazia.
};
