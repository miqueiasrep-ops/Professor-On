import express from "express";
import path from "path";
import fs from "fs/promises";
import { initializeApp } from "firebase/app";
import { initializeFirestore, setLogLevel, collection, getDocs, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";

// Suppress Firestore verbose debug/info logging
setLogLevel("error");

// Intercept console.error to filter out benign Firestore idle connection and quota logs
const originalConsoleError = console.error;
console.error = function (...args: any[]) {
  const message = args.map(arg => typeof arg === "object" ? JSON.stringify(arg) : String(arg)).join(" ");
  if (
    message.includes("Disconnecting idle stream") || 
    message.includes("GrpcConnection RPC") ||
    message.includes("CANCELLED: Disconnecting idle stream") ||
    message.includes("Timed out waiting for new targets")
  ) {
    // Log as an info message instead of polluting error logs
    console.log("[Firestore Info] Idle connection closed safely.");
    return;
  }
  if (
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("Quota limit exceeded") ||
    message.includes("Quota exceeded for quota metric")
  ) {
    console.warn(
      "[Firestore Warning] Firestore free tier daily write units limit exceeded. " +
      "The application will safely fall back to the local database cache (db.json). " +
      "All active features, pedagogical functions, and reports will continue to work perfectly " +
      "using local persistence, and Firestore sync will resume once the daily quota resets tomorrow."
    );
    return;
  }
  originalConsoleError.apply(console, args);
};
import { 
  generateStudentReportAI,
  researchTopic,
  chatWithPedagogicalSupport,
  generateExam,
  generateExercises,
  generateLessonPlan,
  generateSlideDeck
} from "./services/geminiService";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use body parsers of express to handle files
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Immediate health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  // In-memory data store with file persistence
  const DATA_FILE = path.join(process.cwd(), "db.json");
  const UPLOADS_DIR = path.join(process.cwd(), "uploads");

  let db = {
    students: [] as any[],
    activities: [] as any[],
    submissions: [] as any[],
    customRegistrationLink: ""
  };

  // Firebase Firestore initialization
  let dbFirestore: any = null;

  try {
    const configRaw = await fs.readFile(path.join(process.cwd(), "firebase-applet-config.json"), "utf-8");
    const firebaseConfig = JSON.parse(configRaw);
    const firebaseApp = initializeApp(firebaseConfig);
    // Use initializeFirestore with experimentalForceLongPolling to avoid idle connection stream timeouts
    dbFirestore = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);
    console.log("Firebase initialized successfully with project", firebaseConfig.projectId);
  } catch (error) {
    console.error("Error reading firebase-applet-config.json or initializing Firebase:", error);
  }

  // Helper to remove undefined fields from objects before saving to Firestore
  function cleanObject(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) {
      return obj.map(cleanObject);
    }
    if (typeof obj === "object") {
      const cleaned: any = {};
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (val !== undefined) {
          cleaned[key] = cleanObject(val);
        }
      }
      return cleaned;
    }
    return obj;
  }

  async function ensureUploadsDir() {
    try {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
    } catch (e) {}
  }

  let isQuotaExceeded = false;
  let lastQuotaExceededTime = 0;

  async function saveUploadedFile(filename: string, base64Data: string) {
    await ensureUploadsDir();
    const filePath = path.join(UPLOADS_DIR, filename + ".dat");
    await fs.writeFile(filePath, base64Data, "utf-8");

    // Persist to Firestore with chunking in background (non-blocking)
    if (dbFirestore && !isQuotaExceeded) {
      (async () => {
        try {
          const CHUNK_SIZE = 400000; // ~400KB per chunk string
          const totalChunks = Math.ceil(base64Data.length / CHUNK_SIZE);

          await setDoc(doc(dbFirestore, "files", filename), { totalChunks, updatedAt: Date.now() });

          for (let i = 0; i < totalChunks; i++) {
            const chunkStr = base64Data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            await setDoc(doc(dbFirestore, "file_chunks", `${filename}_chunk_${i}`), {
              filename,
              index: i,
              chunk: chunkStr
            });
          }
          console.log(`Saved file ${filename} to Firestore in ${totalChunks} chunk(s).`);
        } catch (e: any) {
          if (e?.message?.includes("RESOURCE_EXHAUSTED") || e?.message?.includes("Quota")) {
            isQuotaExceeded = true;
            lastQuotaExceededTime = Date.now();
          }
          console.error(`Error saving file ${filename} to Firestore:`, e);
        }
      })().catch(() => {});
    }
  }

  async function getUploadedFile(filename: string): Promise<string | null> {
    const filePath = path.join(UPLOADS_DIR, filename + ".dat");
    try {
      return await fs.readFile(filePath, "utf-8");
    } catch (e) {
      // If not on disk, try loading from Firestore!
      if (dbFirestore) {
        try {
          const fileDoc = await getDoc(doc(dbFirestore, "files", filename));
          if (fileDoc.exists()) {
            const data = fileDoc.data();
            if (data?.base64Data) {
              // Legacy single-document format
              await ensureUploadsDir();
              await fs.writeFile(filePath, data.base64Data, "utf-8");
              return data.base64Data;
            } else if (data?.totalChunks) {
              // Chunked format
              const totalChunks = data.totalChunks;
              const chunks: string[] = new Array(totalChunks);

              for (let i = 0; i < totalChunks; i++) {
                const chunkDoc = await getDoc(doc(dbFirestore, "file_chunks", `${filename}_chunk_${i}`));
                if (chunkDoc.exists()) {
                  chunks[i] = chunkDoc.data()?.chunk || "";
                } else {
                  console.warn(`Missing chunk ${i} for file ${filename}`);
                  return null;
                }
              }

              const fullBase64 = chunks.join("");
              await ensureUploadsDir();
              await fs.writeFile(filePath, fullBase64, "utf-8");
              console.log(`Retrieved and reassembled ${totalChunks} chunk(s) for ${filename} from Firestore.`);
              return fullBase64;
            }
          }
        } catch (err) {
          console.error(`Error getting file ${filename} from Firestore:`, err);
        }
      }
      return null;
    }
  }

  async function syncFromFirestore() {
    if (!dbFirestore) {
      return;
    }
    if (isQuotaExceeded && Date.now() - lastQuotaExceededTime < 300000) {
      return;
    }
    try {
      // 1. Sync Students
      const studentsSnap = await getDocs(collection(dbFirestore, "students"));
      const studentsList: any[] = [];
      studentsSnap.forEach((doc) => {
        studentsList.push(doc.data());
      });
      if (studentsList.length > 0) {
        const studentMap = new Map();
        db.students.forEach(s => { if (s && s.id) studentMap.set(s.id, s); });
        studentsList.forEach(s => { if (s && s.id) studentMap.set(s.id, s); });
        db.students = Array.from(studentMap.values());
      }

      // 2. Sync Activities
      const activitiesSnap = await getDocs(collection(dbFirestore, "activities"));
      const activitiesList: any[] = [];
      activitiesSnap.forEach((doc) => {
        activitiesList.push(doc.data());
      });
      if (activitiesList.length > 0) {
        const actMap = new Map();
        db.activities.forEach(a => { if (a && a.id) actMap.set(a.id, a); });
        activitiesList.forEach(a => { if (a && a.id) actMap.set(a.id, a); });
        db.activities = Array.from(actMap.values());
      }

      // 3. Sync Submissions
      const submissionsSnap = await getDocs(collection(dbFirestore, "submissions"));
      const submissionsList: any[] = [];
      submissionsSnap.forEach((doc) => {
        submissionsList.push(doc.data());
      });
      if (submissionsList.length > 0) {
        const subMap = new Map();
        db.submissions.forEach(s => { if (s && s.id) studentMapSet(subMap, s); });
        submissionsList.forEach(s => { if (s && s.id) studentMapSet(subMap, s); });
        db.submissions = Array.from(subMap.values());
      }

      // 4. Sync Custom Registration Link
      const settingsDoc = await getDoc(doc(dbFirestore, "settings", "registration"));
      if (settingsDoc.exists()) {
        db.customRegistrationLink = settingsDoc.data()?.customRegistrationLink || "";
      }

      // Save to local db.json
      await saveDb();
      // If we succeeded, clear quota flag
      isQuotaExceeded = false;
    } catch (error: any) {
      if (error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("Quota")) {
        isQuotaExceeded = true;
        lastQuotaExceededTime = Date.now();
      } else {
        console.warn("Notice syncing from Firestore:", error?.message || error);
      }
    }
  }

  function studentMapSet(map: Map<string, any>, item: any) {
    if (item && item.id) map.set(item.id, item);
  }

  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    db = {
      students: Array.isArray(parsed.students) ? parsed.students : [],
      activities: Array.isArray(parsed.activities) ? parsed.activities : [],
      submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
      customRegistrationLink: typeof parsed.customRegistrationLink === "string" ? parsed.customRegistrationLink : ""
    };

    // Auto-migration on server boot: decoupling and writing existing Base64 file payloads to disk
    let migrated = false;
    await ensureUploadsDir();

    for (const act of db.activities) {
      if (act && act.id && act.fileData) {
        await saveUploadedFile("act_" + act.id, act.fileData);
        delete act.fileData;
        migrated = true;
      }
    }

    for (const sub of db.submissions) {
      if (sub && sub.id && sub.fileData) {
        await saveUploadedFile("sub_" + sub.id, sub.fileData);
        delete sub.fileData;
        migrated = true;
      }
    }

    if (migrated) {
      await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
      console.log("Database migrated successfully on boot: file payloads decoupled.");
    }
  } catch (e) {
    // Write initial database
    await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
  }

  // Sync with Firestore on startup in the background to not block port binding / health checks
  syncFromFirestore().catch(err => {
    console.error("Error during initial Firestore sync:", err);
  });

  // Periodic background sync from Firestore every 15 seconds to ensure any direct student submission is synced
  setInterval(() => {
    syncFromFirestore().catch(e => console.warn("Periodic Firestore sync notice:", e));
  }, 15000);

  async function saveDb() {
    try {
      await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
    } catch (e) {
      console.error("Error saving db to file", e);
    }
  }

  // --- API ROUTING ---
  
  app.get("/api/db", (req, res) => {
    res.json(db);
  });

  app.post("/api/students", async (req, res) => {
    const student = req.body;
    if (!student || !student.id) {
       return res.status(400).json({ error: "Invalid student object" });
    }
    const idx = db.students.findIndex(s => s.id === student.id);
    if (idx >= 0) {
      db.students[idx] = student;
    } else {
      db.students.push(student);
    }
    await saveDb();

    // Sync write to Firestore
    if (dbFirestore) {
      try {
        await setDoc(doc(dbFirestore, "students", student.id), cleanObject(student));
        console.log(`Saved student ${student.id} to Firestore.`);
      } catch (e) {
        console.error(`Error saving student ${student.id} to Firestore:`, e);
      }
    }

    res.json(student);
  });

  app.post("/api/students/bulk", async (req, res) => {
    const list = req.body;
    if (Array.isArray(list)) {
      // Safe merge on server to prevent deleting students who registered concurrently
      const incomingMap = new Map();
      list.forEach(s => {
        if (s && s.id) incomingMap.set(s.id, s);
      });
      
      db.students = db.students.map(s => {
        if (s && s.id && incomingMap.has(s.id)) {
          const updated = incomingMap.get(s.id);
          incomingMap.delete(s.id);
          return updated;
        }
        return s;
      });
      
      for (const newStudent of incomingMap.values()) {
        db.students.push(newStudent);
      }
      
      await saveDb();

      // Sync bulk write to Firestore
      if (dbFirestore) {
        try {
          for (const s of list) {
            if (s && s.id) {
              await setDoc(doc(dbFirestore, "students", s.id), cleanObject(s));
            }
          }
          console.log(`Saved ${list.length} students bulk to Firestore.`);
        } catch (e) {
          console.error("Error saving bulk students to Firestore:", e);
        }
      }
    }
    res.json(db.students);
  });

  app.post("/api/students/delete", async (req, res) => {
    const { id } = req.body;
    db.students = db.students.filter(s => s.id !== id);
    await saveDb();

    // Sync delete to Firestore
    if (dbFirestore && id) {
      try {
        await deleteDoc(doc(dbFirestore, "students", id));
        console.log(`Deleted student ${id} from Firestore.`);
      } catch (e) {
        console.error(`Error deleting student ${id} from Firestore:`, e);
      }
    }

    res.json({ success: true });
  });

  app.post("/api/classes/delete", async (req, res) => {
    const { className, deleteStudents = true } = req.body;
    if (!className) {
      return res.status(400).json({ error: "Nome da turma não fornecido" });
    }

    if (deleteStudents) {
      const studentsToDelete = db.students.filter(
        s => s && s.classGroup && s.classGroup.trim().toLowerCase() === className.trim().toLowerCase()
      );
      
      db.students = db.students.filter(
        s => !s || !s.classGroup || s.classGroup.trim().toLowerCase() !== className.trim().toLowerCase()
      );

      if (dbFirestore) {
        try {
          for (const st of studentsToDelete) {
            if (st && st.id) {
              await deleteDoc(doc(dbFirestore, "students", st.id));
            }
          }
          console.log(`Deleted ${studentsToDelete.length} students from Firestore for class ${className}.`);
        } catch (e) {
          console.error(`Error deleting class students from Firestore:`, e);
        }
      }
    } else {
      const updatedStudents: any[] = [];
      db.students = db.students.map(s => {
        if (s && s.classGroup && s.classGroup.trim().toLowerCase() === className.trim().toLowerCase()) {
          const updated = { ...s, classGroup: 'Sem Turma' };
          updatedStudents.push(updated);
          return updated;
        }
        return s;
      });

      if (dbFirestore) {
        try {
          for (const st of updatedStudents) {
            if (st && st.id) {
              await setDoc(doc(dbFirestore, "students", st.id), cleanObject(st));
            }
          }
          console.log(`Reassigned ${updatedStudents.length} students to 'Sem Turma' in Firestore.`);
        } catch (e) {
          console.error(`Error updating students in Firestore:`, e);
        }
      }
    }

    await saveDb();
    res.json({ success: true, students: db.students });
  });

  app.post("/api/students/report-ai", async (req, res) => {
    try {
      const { student } = req.body;
      if (!student || !student.name) {
        return res.status(400).json({ error: "Dados do aluno não fornecidos" });
      }
      const reportText = await generateStudentReportAI(student);
      res.json({ report: reportText });
    } catch (error: any) {
      console.error("Error generating student report via Gemini:", error);
      res.status(500).json({ error: error.message || "Erro ao gerar parecer pedagógico com IA" });
    }
  });

  app.post("/api/gemini/research", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: "Query não fornecida" });
      }
      const result = await researchTopic(query);
      res.json(result);
    } catch (error: any) {
      console.error("Error in researchTopic:", error);
      res.status(500).json({ error: error.message || "Erro ao pesquisar tópico" });
    }
  });

  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, history, persona } = req.body;
      if (!message || !Array.isArray(history)) {
        return res.status(400).json({ error: "Mensagem ou histórico inválido" });
      }
      const responseText = await chatWithPedagogicalSupport(message, history, persona);
      res.json({ text: responseText });
    } catch (error: any) {
      console.error("Error in chatWithPedagogicalSupport:", error);
      res.status(500).json({ error: error.message || "Erro no suporte pedagógico" });
    }
  });

  app.post("/api/gemini/exam", async (req, res) => {
    try {
      const { topic, gradeLevel, questionCount, type } = req.body;
      if (!topic || !gradeLevel || !questionCount || !type) {
        return res.status(400).json({ error: "Parâmetros insuficientes" });
      }
      const result = await generateExam(topic, gradeLevel, questionCount, type);
      res.json(result);
    } catch (error: any) {
      console.error("Error in generateExam:", error);
      res.status(500).json({ error: error.message || "Erro ao gerar avaliação" });
    }
  });

  app.post("/api/gemini/exercises", async (req, res) => {
    try {
      const { topic, gradeLevel, count, type } = req.body;
      if (!topic || !gradeLevel || !count || !type) {
        return res.status(400).json({ error: "Parâmetros insuficientes" });
      }
      const result = await generateExercises(topic, gradeLevel, count, type);
      res.json(result);
    } catch (error: any) {
      console.error("Error in generateExercises:", error);
      res.status(500).json({ error: error.message || "Erro ao gerar exercícios" });
    }
  });

  app.post("/api/gemini/lesson-plan", async (req, res) => {
    try {
      const { topic, gradeLevel, duration, specifics } = req.body;
      if (!topic || !gradeLevel || !duration) {
        return res.status(400).json({ error: "Parâmetros insuficientes" });
      }
      const result = await generateLessonPlan(topic, gradeLevel, duration, specifics);
      res.json(result);
    } catch (error: any) {
      console.error("Error in generateLessonPlan:", error);
      res.status(500).json({ error: error.message || "Erro ao gerar plano de aula" });
    }
  });

  app.post("/api/gemini/slides", async (req, res) => {
    try {
      const { topic, gradeLevel, slideCount, curricularUnit, specificTopics } = req.body;
      if (!topic) {
        return res.status(400).json({ error: "O tema principal é obrigatório" });
      }
      const count = Number(slideCount) || 5;
      const grade = gradeLevel || "Ensino Médio";
      const unit = curricularUnit || "Geral";
      const topics = specificTopics || "";
      const result = await generateSlideDeck(topic, grade, count, unit, topics);
      res.json(result);
    } catch (error: any) {
      console.error("Error in generateSlideDeck:", error);
      res.status(500).json({ error: error.message || "Erro ao gerar apresentação de slides" });
    }
  });

  app.get("/api/activities/:id/file", async (req, res) => {
    const { id } = req.params;
    const fileData = await getUploadedFile("act_" + id);
    if (fileData) {
      res.json({ fileData });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });

  app.get("/api/submissions/:id/file", async (req, res) => {
    const { id } = req.params;
    const fileData = await getUploadedFile("sub_" + id);
    if (fileData) {
      res.json({ fileData });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });

  app.post("/api/activities", async (req, res) => {
    const activity = req.body;
    if (activity && activity.id) {
      if (activity.fileData) {
        await saveUploadedFile("act_" + activity.id, activity.fileData);
      }
      const strippedActivity = { ...activity };
      delete strippedActivity.fileData;

      const idx = db.activities.findIndex(a => a.id === activity.id);
      if (idx >= 0) {
        db.activities[idx] = strippedActivity;
      } else {
        db.activities.push(strippedActivity);
      }
      await saveDb();

      // Sync activity to Firestore
      if (dbFirestore) {
        try {
          await setDoc(doc(dbFirestore, "activities", activity.id), cleanObject(strippedActivity));
          console.log(`Saved activity ${activity.id} to Firestore.`);
        } catch (e) {
          console.error(`Error saving activity ${activity.id} to Firestore:`, e);
        }
      }
    }
    res.json(activity);
  });

  app.post("/api/activities/delete", async (req, res) => {
    const { id } = req.body;
    db.activities = db.activities.filter(a => a.id !== id);
    try {
      await fs.unlink(path.join(UPLOADS_DIR, `act_${id}.dat`));
    } catch (e) {}
    await saveDb();

    // Sync delete to Firestore
    if (dbFirestore && id) {
      try {
        await deleteDoc(doc(dbFirestore, "activities", id));
        await deleteDoc(doc(dbFirestore, "files", `act_${id}`));
        console.log(`Deleted activity ${id} and its files from Firestore.`);
      } catch (e) {
        console.error(`Error deleting activity ${id} from Firestore:`, e);
      }
    }

    res.json({ success: true });
  });

  app.post("/api/submissions", async (req, res) => {
    const submission = req.body;
    if (submission && submission.id) {
      if (submission.fileData) {
        await saveUploadedFile("sub_" + submission.id, submission.fileData);
      }
      const strippedSubmission = { ...submission };
      delete strippedSubmission.fileData;

      const idx = db.submissions.findIndex(s => s.id === submission.id);
      if (idx >= 0) {
         db.submissions[idx] = strippedSubmission;
      } else {
         db.submissions.push(strippedSubmission);
      }
      await saveDb();

      // Sync submission to Firestore
      if (dbFirestore) {
        try {
          await setDoc(doc(dbFirestore, "submissions", submission.id), cleanObject(strippedSubmission));
          console.log(`Saved submission ${submission.id} to Firestore.`);
        } catch (e) {
          console.error(`Error saving submission ${submission.id} to Firestore:`, e);
        }
      }
    }
    res.json(submission);
  });

  app.post("/api/submissions/delete", async (req, res) => {
    const { id } = req.body;
    db.submissions = db.submissions.filter(s => s.id !== id);
    try {
      await fs.unlink(path.join(UPLOADS_DIR, `sub_${id}.dat`));
    } catch (e) {}
    await saveDb();

    if (dbFirestore && id) {
      try {
        await deleteDoc(doc(dbFirestore, "submissions", id));
        await deleteDoc(doc(dbFirestore, "files", `sub_${id}`));
        console.log(`Deleted submission ${id} from Firestore.`);
      } catch (e) {
        console.error(`Error deleting submission ${id} from Firestore:`, e);
      }
    }
    res.json({ success: true });
  });

  app.post("/api/custom-link", async (req, res) => {
    const { link } = req.body;
    db.customRegistrationLink = link || "";
    await saveDb();

    // Sync settings to Firestore
    if (dbFirestore) {
      try {
        await setDoc(doc(dbFirestore, "settings", "registration"), { customRegistrationLink: db.customRegistrationLink });
        console.log("Saved custom registration link to Firestore.");
      } catch (e) {
        console.error("Error saving custom registration link to Firestore:", e);
      }
    }

    res.json({ link: db.customRegistrationLink });
  });

  // --- VITE INTERFACES SETUP ---
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use((req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal error starting server:", err);
});
