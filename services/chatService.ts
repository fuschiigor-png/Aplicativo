import {
    collection,
    addDoc,
    serverTimestamp,
    onSnapshot,
    query,
    orderBy,
    limit
} from "firebase/firestore";
import { db } from "./firebase";
import { GlobalChatMessage } from "../types";

const GLOBAL_CHAT_COLLECTION = 'global_chat';

// Send a new message to the global chat
export const sendGlobalMessage = async (
    userId: string,
    userEmail: string,
    text: string
): Promise<void> => {
    try {
        await addDoc(collection(db, GLOBAL_CHAT_COLLECTION), {
            userId,
            userEmail,
            text,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error sending global message:", error);
        throw error;
    }
};

// Listen for real-time updates on the global chat
export const getMessagesListener = (
    callback: (messages: GlobalChatMessage[]) => void
) => {
    const q = query(
        collection(db, GLOBAL_CHAT_COLLECTION),
        orderBy('createdAt', 'asc'),
        limit(100) // Limit to the last 100 messages to avoid performance issues
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const messages = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const createdAtTimestamp = data.createdAt; // Firestore Timestamp object or null

            // Manually construct the createdAt object to match the type
            const createdAt = createdAtTimestamp
                ? { seconds: createdAtTimestamp.seconds, nanoseconds: createdAtTimestamp.nanoseconds }
                : null;

            return {
                id: doc.id,
                text: data.text,
                userId: data.userId,
                userEmail: data.userEmail,
                createdAt: createdAt,
            } as GlobalChatMessage;
        });
        callback(messages);
    }, (error) => {
        console.error("Error fetching global messages:", error);
        callback([]);
    });

    return unsubscribe;
};