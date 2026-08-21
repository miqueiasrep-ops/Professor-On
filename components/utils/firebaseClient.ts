import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc, 
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase client
const apps = getApps();
const app = apps.length === 0 ? initializeApp(firebaseConfig) : apps[0];

export const dbClient = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const CHUNK_SIZE = 400000; // ~400KB per chunk to safely stay under Firestore's 1MB limit

// Helper to sanitize objects for Firestore (no undefined values)
function cleanObject(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(cleanObject);
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        cleaned[key] = cleanObject(obj[key]);
      }
    }
    return cleaned;
  }
  return obj;
}

// Student functions
export async function syncStudentToFirestore(student: any) {
  try {
    if (!student || !student.id) return;
    const ref = doc(dbClient, 'students', String(student.id));
    await setDoc(ref, cleanObject(student), { merge: true });
  } catch (err) {
    console.warn('Notice: Firestore client sync student:', err);
  }
}

export async function syncStudentsBulkToFirestore(students: any[]) {
  try {
    for (const s of students) {
      if (s && s.id) {
        const ref = doc(dbClient, 'students', String(s.id));
        await setDoc(ref, cleanObject(s), { merge: true });
      }
    }
  } catch (err) {
    console.warn('Notice: Firestore client bulk sync students:', err);
  }
}

export async function deleteStudentFromFirestore(studentId: string) {
  try {
    const ref = doc(dbClient, 'students', String(studentId));
    await deleteDoc(ref);
  } catch (err) {
    console.warn('Notice: Firestore client delete student:', err);
  }
}

// Helper to save large file payload in chunks
async function saveFilePayloadToFirestore(fileId: string, base64Data: string) {
  try {
    const totalChunks = Math.ceil(base64Data.length / CHUNK_SIZE);
    
    // Write manifest
    const fileRef = doc(dbClient, 'files', fileId);
    await setDoc(fileRef, {
      id: fileId,
      totalChunks,
      length: base64Data.length,
      updatedAt: Date.now()
    }, { merge: true });

    // Write chunks
    for (let i = 0; i < totalChunks; i++) {
      const chunkStr = base64Data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const chunkRef = doc(dbClient, 'file_chunks', `${fileId}_chunk_${i}`);
      await setDoc(chunkRef, {
        fileId,
        index: i,
        chunk: chunkStr
      });
    }
  } catch (e) {
    console.warn(`Notice: Error saving file payload ${fileId} in Firestore:`, e);
  }
}

// Retrieve file payload from Firestore
export async function getFileDataFromFirestore(fileId: string): Promise<string | null> {
  try {
    const fileRef = doc(dbClient, 'files', fileId);
    const fileSnap = await getDoc(fileRef);

    if (fileSnap.exists()) {
      const data = fileSnap.data();
      if (data?.base64Data) {
        return data.base64Data;
      }
      if (data?.totalChunks) {
        const totalChunks = data.totalChunks;
        const chunks: string[] = new Array(totalChunks);

        for (let i = 0; i < totalChunks; i++) {
          const chunkSnap = await getDoc(doc(dbClient, 'file_chunks', `${fileId}_chunk_${i}`));
          if (chunkSnap.exists()) {
            chunks[i] = chunkSnap.data()?.chunk || '';
          } else {
            console.warn(`Missing chunk ${i} for file ${fileId}`);
            return null;
          }
        }
        return chunks.join('');
      }
    }
  } catch (err) {
    console.warn(`Notice: Error fetching file ${fileId} from Firestore:`, err);
  }
  return null;
}

// Activity functions
export async function syncActivityToFirestore(activity: any) {
  try {
    if (!activity || !activity.id) return;

    const activityCopy = { ...activity };
    const base64Data = activityCopy.fileData;

    // If file is present, save file separately in chunks so activity doc is lightweight and reliable
    if (base64Data) {
      await saveFilePayloadToFirestore(String(activity.id), base64Data);
      // Keep fileData in activity doc only if under 300KB
      if (base64Data.length > 300000) {
        delete activityCopy.fileData;
      }
    }

    const ref = doc(dbClient, 'activities', String(activity.id));
    await setDoc(ref, cleanObject(activityCopy), { merge: true });
  } catch (err) {
    console.warn('Notice: Firestore client sync activity:', err);
  }
}

// Submission functions
export async function syncSubmissionToFirestore(submission: any): Promise<boolean> {
  try {
    if (!submission || !submission.id) return false;

    const submissionCopy = { ...submission };
    const base64Data = submissionCopy.fileData;

    // If fileData is present, always store chunks in Firestore files / file_chunks
    if (base64Data) {
      await saveFilePayloadToFirestore(String(submission.id), base64Data);
      // Keep fileData inside submission doc only if lightweight (< 300KB)
      if (base64Data.length > 300000) {
        delete submissionCopy.fileData;
      }
    }

    const ref = doc(dbClient, 'submissions', String(submission.id));
    await setDoc(ref, cleanObject(submissionCopy), { merge: true });
    return true;
  } catch (err) {
    console.error('Error in Firestore client sync submission:', err);
    return false;
  }
}

// Real-time listener for students, activities, submissions
export function subscribeToRealtimeFirestore(callbacks: {
  onStudents?: (students: any[]) => void;
  onActivities?: (activities: any[]) => void;
  onSubmissions?: (submissions: any[]) => void;
}) {
  const unsubscribers: (() => void)[] = [];

  if (callbacks.onStudents) {
    const unsubStudents = onSnapshot(collection(dbClient, 'students'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data) {
          list.push({ ...data, id: data.id || docSnap.id });
        }
      });
      callbacks.onStudents?.(list);
    }, (err) => {
      console.warn('Notice: Firestore realtime students listener:', err);
    });
    unsubscribers.push(unsubStudents);
  }

  if (callbacks.onActivities) {
    const unsubActivities = onSnapshot(collection(dbClient, 'activities'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data) {
          list.push({ ...data, id: data.id || docSnap.id });
        }
      });
      callbacks.onActivities?.(list);
    }, (err) => {
      console.warn('Notice: Firestore realtime activities listener:', err);
    });
    unsubscribers.push(unsubActivities);
  }

  if (callbacks.onSubmissions) {
    const unsubSubmissions = onSnapshot(collection(dbClient, 'submissions'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data) {
          list.push({ ...data, id: data.id || docSnap.id });
        }
      });
      callbacks.onSubmissions?.(list);
    }, (err) => {
      console.warn('Notice: Firestore realtime submissions listener:', err);
    });
    unsubscribers.push(unsubSubmissions);
  }

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}
