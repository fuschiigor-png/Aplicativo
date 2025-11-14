import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp, onSnapshot, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db, storage } from "./firebase";
import { generateImageInsights } from './geminiService';
import { ImageAnalysis } from "../types";

// Uploads image, creates Firestore doc, and then generates insights
export const processImage = async (
  userId: string,
  imageFile: File,
  title: string,
  onProgress: (message: string) => void
): Promise<void> => {
  if (!userId || !imageFile || !title) {
    throw new Error("Faltam informações para processar a imagem.");
  }

  let docId = "";

  try {
    // 1. Upload image to Storage
    onProgress("Enviando imagem...");
    const storagePath = `images/${userId}/${Date.now()}_${imageFile.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadResult = await uploadBytes(storageRef, imageFile);
    const imageUrl = await getDownloadURL(uploadResult.ref);

    // 2. Create document in Firestore
    onProgress("Salvando informações...");
    const imageCollectionRef = collection(db, `users/${userId}/images`);
    const docRef = await addDoc(imageCollectionRef, {
      title,
      imageUrl,
      storagePath,
      createdAt: serverTimestamp(),
      status: 'processing',
    });
    docId = docRef.id;

    // 3. Generate Insights using Gemini
    onProgress("Analisando imagem com IA...");
    const { insights, transcript } = await generateImageInsights(imageFile, title);

    // 4. Update document with insights
    onProgress("Finalizando...");
    const imageDocRef = doc(db, `users/${userId}/images`, docId);
    await updateDoc(imageDocRef, {
      status: 'completed',
      insights,
      transcript,
    });
     onProgress("Concluído!");

  } catch (error) {
    console.error("Erro no processamento da imagem:", error);
    // If something fails after the doc is created, update its status to 'failed'
    if (docId) {
      try {
        const imageDocRef = doc(db, `users/${userId}/images`, docId);
        await updateDoc(imageDocRef, {
          status: 'failed',
        });
      } catch (updateError) {
        console.error("Falha ao atualizar o status do documento para 'failed':", updateError);
      }
    }
    throw error; // re-throw to be caught by the UI
  }
};


// Listen for real-time updates on user's images
export const getUserImages = (
  userId: string,
  callback: (images: ImageAnalysis[]) => void
) => {
  const imageCollectionRef = collection(db, `users/${userId}/images`);
  const q = query(imageCollectionRef, orderBy('createdAt', 'desc'));
  
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const images = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const createdAtTimestamp = data.createdAt; // Firestore Timestamp object or null

      // Manually construct the createdAt object to match the type
      const createdAt = createdAtTimestamp
        ? { seconds: createdAtTimestamp.seconds, nanoseconds: createdAtTimestamp.nanoseconds }
        : null;

      return {
        id: doc.id,
        title: data.title,
        imageUrl: data.imageUrl,
        storagePath: data.storagePath,
        status: data.status,
        insights: data.insights,
        transcript: data.transcript,
        createdAt,
      } as ImageAnalysis;
    });
    callback(images);
  }, (error) => {
    console.error("Erro ao buscar imagens:", error);
    callback([]);
  });

  return unsubscribe;
};