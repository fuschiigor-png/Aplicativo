import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  AuthError
} from "firebase/auth";
import { auth, db } from './firebase';
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export const handleSignIn = async (email: string, password: string): Promise<User | void> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    const authError = error as AuthError;
    if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Add user to the 'users' collection in Firestore
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            createdAt: serverTimestamp(),
        });

        return user;
      } catch (createError) {
        console.error("Error creating user:", createError);
        throw createError;
      }
    } else {
      console.error("Error signing in:", error);
      throw error;
    }
  }
};

export const handleSignOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

export const onAuthStateChangedListener = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
