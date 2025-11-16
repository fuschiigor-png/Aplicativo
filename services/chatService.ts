
import {
    collection,
    addDoc,
    serverTimestamp,
    onSnapshot,
    query,
    orderBy,
    limit,
    doc,
    runTransaction,
    where,
    deleteDoc,
    getDocs,
    writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { GlobalChatMessage, ExchangeRateHistoryEntry, Order } from "../types";

const GLOBAL_CHAT_COLLECTION = 'global_chat';
const APP_CONFIG_COLLECTION = 'app_config';
const EXCHANGE_RATE_DOC_ID = 'exchange_rate';
const ORDER_COUNTER_DOC_ID = 'order_counter';
const HISTORY_SUBCOLLECTION = 'history';
const ORDERS_COLLECTION = 'orders';

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

// Update the reference rate and add a history entry
export const updateExchangeRateConfig = async (
    rate: number,
    userEmail: string
): Promise<void> => {
    const configDocRef = doc(db, APP_CONFIG_COLLECTION, EXCHANGE_RATE_DOC_ID);
    try {
        await runTransaction(db, async (transaction) => {
            const newHistoryRef = doc(collection(configDocRef, HISTORY_SUBCOLLECTION));
            
            transaction.set(configDocRef, {
                currentRate: rate,
                lastUpdatedBy: userEmail,
                lastUpdatedAt: serverTimestamp(),
            }, { merge: true });

            transaction.set(newHistoryRef, {
                rate: rate,
                updatedBy: userEmail,
                updatedAt: serverTimestamp(),
            });
        });
    } catch (error) {
        console.error("Error updating exchange rate config:", error);
        throw error;
    }
};

// Listen for real-time updates on the exchange rate config
export const getExchangeRateConfigListener = (
    callback: (config: { currentRate: number } | null) => void
) => {
    const docRef = doc(db, APP_CONFIG_COLLECTION, EXCHANGE_RATE_DOC_ID);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data() as { currentRate: number });
        } else {
            console.log("No exchange rate config found, using null.");
            callback(null);
        }
    }, (error) => {
        console.error("Error fetching exchange rate config:", error);
        callback(null);
    });

    return unsubscribe;
};

// Listen for real-time updates on the exchange rate history
export const getExchangeRateHistoryListener = (
    callback: (history: ExchangeRateHistoryEntry[]) => void
) => {
    const historyColRef = collection(db, APP_CONFIG_COLLECTION, EXCHANGE_RATE_DOC_ID, HISTORY_SUBCOLLECTION);
    const q = query(historyColRef, orderBy('updatedAt', 'desc'), limit(20));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const historyEntries = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const updatedAt = data.updatedAt ? { seconds: data.updatedAt.seconds, nanoseconds: data.updatedAt.nanoseconds } : null;
            return {
                id: doc.id,
                rate: data.rate,
                updatedBy: data.updatedBy,
                updatedAt: updatedAt,
            } as ExchangeRateHistoryEntry;
        });
        callback(historyEntries);
    }, (error) => {
        console.error("Error fetching exchange rate history:", error);
        callback([]);
    });

    return unsubscribe;
};

// Get the next sequential order number
export const getNextOrderNumber = async (): Promise<string> => {
    const counterDocRef = doc(db, APP_CONFIG_COLLECTION, ORDER_COUNTER_DOC_ID);
    try {
        const newOrderNumber = await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterDocRef);
            const STARTING_NUMBER = 1387;
            let nextNumber;

            if (!counterDoc.exists() || !counterDoc.data().lastOrderNumber) {
                nextNumber = STARTING_NUMBER;
            } else {
                const currentNumber = counterDoc.data().lastOrderNumber;
                // Ensure we don't go below the starting number if manually changed in DB
                nextNumber = Math.max(STARTING_NUMBER, currentNumber + 1);
            }
            
            transaction.set(counterDocRef, { lastOrderNumber: nextNumber }, { merge: true });
            return nextNumber;
        });
        return newOrderNumber.toString();
    } catch (error) {
        console.error("Error getting next order number:", error);
        throw new Error("Falha ao obter o número do próximo pedido.");
    }
};

// Delete an order from the database
export const deleteOrder = async (orderId: string): Promise<void> => {
    try {
        const orderDocRef = doc(db, ORDERS_COLLECTION, orderId);
        await deleteDoc(orderDocRef);
    } catch (error) {
        console.error("Error deleting order:", error);
        throw error;
    }
};

// Save a new order to the database
export const saveOrder = async (
    userId: string,
    userEmail: string,
    orderData: Omit<Order, 'id' | 'userId' | 'userEmail' | 'createdAt'>
): Promise<void> => {
    try {
        await addDoc(collection(db, ORDERS_COLLECTION), {
            ...orderData,
            userId,
            userEmail,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error saving order:", error);
        throw error;
    }
};

// Listen for real-time updates on a user's orders
export const getOrdersListener = (
    userId: string,
    callback: (orders: Order[]) => void
) => {
    const q = query(
        collection(db, ORDERS_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const orders = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const createdAtTimestamp = data.createdAt;
            const createdAt = createdAtTimestamp ? { seconds: createdAtTimestamp.seconds, nanoseconds: createdAtTimestamp.nanoseconds } : null;

            return {
                id: doc.id,
                ...data,
                createdAt: createdAt,
            } as Order;
        });
        callback(orders);
    }, (error) => {
        console.error("Error fetching orders:", error);
        callback([]);
    });

    return unsubscribe;
};

// Delete all orders for a user and reset the counter
export const deleteAllOrdersAndResetCounter = async (userId: string): Promise<void> => {
    try {
        const ordersCollectionRef = collection(db, ORDERS_COLLECTION);
        const q = query(ordersCollectionRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);

        const batch = writeBatch(db);

        querySnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });

        const counterDocRef = doc(db, APP_CONFIG_COLLECTION, ORDER_COUNTER_DOC_ID);
        // Set lastOrderNumber to 1386 so the next one will be 1387
        batch.set(counterDocRef, { lastOrderNumber: 1386 }, { merge: true });

        await batch.commit();
    } catch (error) {
        console.error("Error deleting all orders and resetting counter:", error);
        throw error;
    }
};