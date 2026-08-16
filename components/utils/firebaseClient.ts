import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase client
const apps = getApps();
const app = apps.length === 0 ? initializeApp(firebaseConfig) : apps[0];

export const dbClient = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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

// Activity functions
export async function syncActivityToFirestore(activity: any) {
  try {
    if (!activity || !activity.id) return;
    const ref = doc(dbClient, 'activities', String(activity.id));
    await setDoc(ref, cleanObject(activity), { merge: true });
  } catch (err) {
    console.warn('Notice: Firestore client sync activity:', err);
  }
}

// Submission functions
export async function syncSubmissionToFirestore(submission: any) {
  try {
    if (!submission || !submission.id) return;
    const ref = doc(dbClient, 'submissions', String(submission.id));
    await setDoc(ref, cleanObject(submission), { merge: true });
  } catch (err) {
    console.warn('Notice: Firestore client sync submission:', err);
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
        if (data && data.id) {
          list.push(data);
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
        if (data && data.id) {
          list.push(data);
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
        if (data && data.id) {
          list.push(data);
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
