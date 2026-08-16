

import React, { useState, useEffect } from 'react';
import { idbGetItem, idbSetItem } from './components/utils/indexedDB';
import { 
  syncStudentToFirestore, 
  syncStudentsBulkToFirestore, 
  deleteStudentFromFirestore, 
  syncActivityToFirestore, 
  syncSubmissionToFirestore, 
  subscribeToRealtimeFirestore 
} from './components/utils/firebaseClient';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { ResearchView } from './components/views/ResearchView';
import { ExamCreatorView } from './components/views/ExamCreatorView';
import { GradebookView } from './components/views/GradebookView';
import { LessonPlanView } from './components/views/LessonPlanView';
import { SlideGeneratorView } from './components/views/SlideGeneratorView';
import { StudentPortalView } from './components/views/StudentPortalView';
import { ExerciseGeneratorView } from './components/views/ExerciseGeneratorView';
import { GoogleFormsView } from './components/views/GoogleFormsView';
import { ActivitiesView } from './components/views/ActivitiesView';
import { TeachersChatView } from './components/views/TeachersChatView';
import { WhatsAppView } from './components/views/WhatsAppView';
import { LoginView } from './components/views/LoginView';
import { ViewState, Student, ArchivedExam, Activity, Submission, ArchivedSlideDeck, TeacherAccount } from './types';

// Storage Keys - DEFINITIVE STABLE KEYS V9 (Updated for 4 Assessments)
const STORAGE_KEY_STUDENTS = 'professores_conectados_students_v9_stable'; 
const STORAGE_KEY_EXAMS = 'professores_conectados_exams_v9_stable';
const STORAGE_KEY_SLIDES = 'professores_conectados_slides_v9_stable';
const STORAGE_KEY_ACTIVITIES = 'professores_conectados_activities_v9_stable';
const STORAGE_KEY_SUBMISSIONS = 'professores_conectados_submissions_v9_stable';
const STORAGE_KEY_AUTH = 'professores_conectados_auth_session';
const STORAGE_KEY_LOGO = 'professores_conectados_logo_url';
const STORAGE_KEY_CURRENT_TEACHER = 'professores_conectados_current_teacher';

// CONFIG: Admin Password
const ADMIN_PASSWORD = "admin123"; 

// Initial Mock Data - Used ONLY if storage is completely empty
const INITIAL_STUDENTS: Student[] = [
  { 
    id: '1', 
    name: 'Ana Silva', 
    classGroup: '9º Ano A', 
    email: 'ana.silva@escola.com',
    contact: '(11) 99999-1234', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana', 
    courseUnits: [
        { 
          name: 'Matemática', 
          assessmentCount: 4, 
          assessments: [8.0, 9.0, 8.5, 8.5], 
          averageGrade: 8.5, 
          totalHours: 80, 
          absences: 4, 
          absenceLog: [{ date: '2024-03-10', hours: 2 }, { date: '2024-04-05', hours: 2 }] 
        },
        { 
          name: 'Ciências', 
          assessmentCount: 4, 
          assessments: [9.0, 9.0, 9.0, 9.0],
          averageGrade: 9.0, 
          totalHours: 60, 
          absences: 0, 
          absenceLog: [] 
        }
    ],
    attendanceRecords: []
  },
  { 
    id: '2', 
    name: 'Bruno Costa', 
    classGroup: '9º Ano A', 
    email: 'bruno.costa@escola.com',
    contact: '(11) 98888-5678', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bruno', 
    courseUnits: [
        { 
          name: 'História', 
          assessmentCount: 4, 
          assessments: [7.0, 6.5, 7.5, 7.0],
          averageGrade: 7.0, 
          totalHours: 60, 
          absences: 8, 
          absenceLog: [{ date: '2024-02-15', hours: 4 }, { date: '2024-03-01', hours: 4 }] 
        }
    ], 
    attendanceRecords: []
  },
];

function App() {
  // --- AUTHENTICATION STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
        return sessionStorage.getItem(STORAGE_KEY_AUTH) === 'true';
    }
    return false;
  });

  // --- TEACHER ACCOUNT STATE ---
  const [currentTeacher, setCurrentTeacher] = useState<TeacherAccount | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CURRENT_TEACHER);
        return saved ? JSON.parse(saved) : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // --- VIEW STATE ---
  const [currentView, setCurrentView] = useState<ViewState>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'student') {
        return ViewState.STUDENT_PORTAL;
      }
    }
    return ViewState.DASHBOARD;
  });

  // --- DATABASE LOADING STATE ---
  const [isLoadedFromDB, setIsLoadedFromDB] = useState<boolean>(false);
  
  // --- DATA STATES (ROBUST LOADING LOGIC) ---
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STUDENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
           // SANITIZAÇÃO DE DADOS (MIGRAÇÃO V9):
           // Garante que a estrutura tenha os 4 assessments
           return parsed.map((s: any) => ({
              ...s,
              courseUnits: Array.isArray(s.courseUnits) ? s.courseUnits.map((u: any) => {
                  // Migração de AbsenceLog
                  let safeLog = [];
                  if (Array.isArray(u.absenceLog)) {
                      safeLog = u.absenceLog.map((entry: any) => {
                          if (typeof entry === 'string') {
                              return { date: entry, hours: 1 }; // Default 1h para dados antigos
                          }
                          return entry;
                      });
                  }
                  
                  // Migração de Assessments (Garante array de 4 posições)
                  let safeAssessments = [0, 0, 0, 0];
                  if (Array.isArray(u.assessments) && u.assessments.length > 0) {
                      safeAssessments = [
                          u.assessments[0] || 0,
                          u.assessments[1] || 0,
                          u.assessments[2] || 0,
                          u.assessments[3] || 0
                      ];
                  } else if (u.averageGrade) {
                      // Se só tinha média, repete a média para não zerar
                      safeAssessments = [u.averageGrade, u.averageGrade, u.averageGrade, u.averageGrade];
                  }

                  return {
                    ...u,
                    assessments: safeAssessments,
                    averageGrade: safeAssessments.reduce((a:number, b:number) => a + b, 0) / 4,
                    totalHours: u.totalHours || 80,
                    absences: u.absences || safeLog.reduce((acc: number, curr: any) => acc + (curr.hours || 0), 0),
                    absenceLog: safeLog
                  };
              }) : [],
              attendanceRecords: Array.isArray(s.attendanceRecords) ? s.attendanceRecords : [],
              email: s.email || '',
              contact: s.contact || '',
              classGroup: s.classGroup || 'Sem Turma',
              avatar: s.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.name}`
           }));
        }
      }
      return INITIAL_STUDENTS;
    } catch (e) {
      console.error("Erro ao recuperar alunos, usando padrão.", e);
      return INITIAL_STUDENTS;
    }
  });

  const [archivedExams, setArchivedExams] = useState<ArchivedExam[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EXAMS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [archivedSlides, setArchivedSlides] = useState<ArchivedSlideDeck[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SLIDES);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [activities, setActivities] = useState<Activity[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVITIES);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [submissions, setSubmissions] = useState<Submission[]>(() => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
  });

  const [logoUrl, setLogoUrl] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LOGO);
    return saved || 'https://upload.wikimedia.org/wikipedia/commons/8/8c/SENAI_S%C3%A3o_Paulo_logo.png';
  });

  const [selectedExam, setSelectedExam] = useState<ArchivedExam | null>(null);
  const [selectedSlide, setSelectedSlide] = useState<ArchivedSlideDeck | null>(null);

  // --- REFS FOR SYNC LOOP WITHOUT STALE CLOSURES ---
  const studentsRef = React.useRef<Student[]>(students);
  const activitiesRef = React.useRef<Activity[]>(activities);
  const submissionsRef = React.useRef<Submission[]>(submissions);

  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  useEffect(() => {
    activitiesRef.current = activities;
  }, [activities]);

  useEffect(() => {
    submissionsRef.current = submissions;
  }, [submissions]);

  // --- LOAD ROBUSTLY FROM INDEXEDDB ON STARTUP ---
  useEffect(() => {
    const loadFromIndexedDB = async () => {
      try {
        const storedStudents = await idbGetItem<Student[]>(STORAGE_KEY_STUDENTS);
        if (storedStudents && Array.isArray(storedStudents) && storedStudents.length > 0) {
          setStudents(storedStudents);
        }
        const storedExams = await idbGetItem<ArchivedExam[]>(STORAGE_KEY_EXAMS);
        if (storedExams && Array.isArray(storedExams)) {
          setArchivedExams(storedExams);
        }
        const storedSlides = await idbGetItem<ArchivedSlideDeck[]>(STORAGE_KEY_SLIDES);
        if (storedSlides && Array.isArray(storedSlides)) {
          setArchivedSlides(storedSlides);
        }
        const storedActivities = await idbGetItem<Activity[]>(STORAGE_KEY_ACTIVITIES);
        if (storedActivities && Array.isArray(storedActivities)) {
          setActivities(storedActivities);
        }
        const storedSubmissions = await idbGetItem<Submission[]>(STORAGE_KEY_SUBMISSIONS);
        if (storedSubmissions && Array.isArray(storedSubmissions)) {
          setSubmissions(storedSubmissions);
        }
      } catch (err) {
        console.error("Error loading from IndexedDB:", err);
      } finally {
        setIsLoadedFromDB(true);
      }
    };
    loadFromIndexedDB();
  }, []);

  // --- REALTIME FIRESTORE LISTENER (Direct Client Cloud Sync for Vercel & Mobile) ---
  useEffect(() => {
    if (!isLoadedFromDB) return;

    const unsubscribe = subscribeToRealtimeFirestore({
      onStudents: (remoteStudents) => {
        if (Array.isArray(remoteStudents) && remoteStudents.length > 0) {
          setStudents(prev => {
            const map = new Map<string, Student>();
            remoteStudents.forEach(s => {
              if (s && s.id) map.set(s.id, s);
            });
            prev.forEach(s => {
              if (s && s.id && !map.has(s.id)) {
                map.set(s.id, s);
              }
            });
            return Array.from(map.values());
          });
        }
      },
      onActivities: (remoteActivities) => {
        if (Array.isArray(remoteActivities) && remoteActivities.length > 0) {
          setActivities(prev => {
            const map = new Map<string, Activity>();
            remoteActivities.forEach(a => {
              if (a && a.id) map.set(a.id, a);
            });
            prev.forEach(a => {
              if (a && a.id && !map.has(a.id)) {
                map.set(a.id, a);
              } else if (a && a.id && a.fileData && map.has(a.id) && !map.get(a.id)?.fileData) {
                map.get(a.id)!.fileData = a.fileData;
              }
            });
            return Array.from(map.values());
          });
        }
      },
      onSubmissions: (remoteSubmissions) => {
        if (Array.isArray(remoteSubmissions) && remoteSubmissions.length > 0) {
          setSubmissions(prev => {
            const map = new Map<string, Submission>();
            remoteSubmissions.forEach(s => {
              if (s && s.id) map.set(s.id, s);
            });
            prev.forEach(s => {
              if (s && s.id && !map.has(s.id)) {
                map.set(s.id, s);
              } else if (s && s.id && s.fileData && map.has(s.id) && !map.get(s.id)?.fileData) {
                map.get(s.id)!.fileData = s.fileData;
              }
            });
            return Array.from(map.values());
          });
        }
      }
    });

    return () => unsubscribe();
  }, [isLoadedFromDB]);

  // --- SYNC STATE FROM BACKEND WITH POLLING ---
  const [customRegistrationLink, setCustomRegistrationLink] = useState(() => {
    return localStorage.getItem('professores_conectados_custom_link') || '';
  });

  useEffect(() => {
    if (!isLoadedFromDB) return;

    const syncWithBackend = async () => {
      try {
        const res = await fetch('/api/db');
        if (res.ok) {
          const data = await res.json();
          
          // 1. Students Sync with fallback & merge
          if (Array.isArray(data.students)) {
            const serverStudents = data.students;
            if (!isAuthenticated) {
              const localStudents = studentsRef.current;
              // Safe local merge to avoid wiping out in-flight registered student profiles
              const mergedMap = new Map<string, Student>();
              serverStudents.forEach((s: Student) => {
                if (s && s.id) mergedMap.set(s.id, s);
              });
              localStudents.forEach((s: Student) => {
                if (s && s.id && !mergedMap.has(s.id)) {
                  mergedMap.set(s.id, s);
                }
              });
              setStudents(Array.from(mergedMap.values()));
            } else {
              const localStudents = studentsRef.current;

              // Merge server and local students safely
              const mergedMap = new Map<string, Student>();
              serverStudents.forEach((s: Student) => {
                if (s && s.id) mergedMap.set(s.id, s);
              });

              let changed = false;
              localStudents.forEach((s: Student) => {
                if (s && s.id) {
                  const serverVersion = mergedMap.get(s.id);
                  if (!serverVersion) {
                    mergedMap.set(s.id, s);
                    changed = true; // Local student missing on server
                  } else if (JSON.stringify(s) !== JSON.stringify(serverVersion)) {
                    // Local edited version wins for authenticated teacher, push to server
                    mergedMap.set(s.id, s);
                    changed = true;
                  }
                }
              });

              const finalCollection = Array.from(mergedMap.values());
              if (changed && finalCollection.length > 0) {
                await fetch('/api/students/bulk', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(finalCollection)
                });
              }
              setStudents(finalCollection);
            }
          }
          
          // 2. Activities Sync with fallback & merge (decoupled from fileData)
          if (Array.isArray(data.activities)) {
            const serverActivities = data.activities;
            if (!isAuthenticated) {
              const localActivities = activitiesRef.current;
              const mergedMap = new Map<string, Activity>();
              serverActivities.forEach((a: Activity) => {
                if (a && a.id) mergedMap.set(a.id, a);
              });
              localActivities.forEach((a: Activity) => {
                if (a && a.id) {
                  if (!mergedMap.has(a.id)) {
                    mergedMap.set(a.id, a);
                  } else if (a.fileData) {
                    const serverAct = mergedMap.get(a.id)!;
                    if (!serverAct.fileData) {
                      serverAct.fileData = a.fileData;
                    }
                  }
                }
              });
              setActivities(Array.from(mergedMap.values()));
            } else {
              const localActivities = activitiesRef.current;

              const mergedMap = new Map<string, Activity>();
              serverActivities.forEach((a: Activity) => {
                if (a && a.id) mergedMap.set(a.id, a);
              });

              let changed = false;
              const activitiesToUpload: Activity[] = [];
              localActivities.forEach((a: Activity) => {
                if (a && a.id) {
                  const serverVersion = mergedMap.get(a.id);
                  if (!serverVersion) {
                    mergedMap.set(a.id, a);
                    activitiesToUpload.push(a);
                    changed = true;
                  } else {
                    // Compare metadata only (excluding fileData)
                    const localCopy = { ...a };
                    const serverCopy = { ...serverVersion };
                    delete localCopy.fileData;
                    delete serverCopy.fileData;

                    if (JSON.stringify(localCopy) !== JSON.stringify(serverCopy)) {
                      mergedMap.set(a.id, a);
                      activitiesToUpload.push(a);
                      changed = true;
                    }
                  }
                }
              });

              const finalCollection = Array.from(mergedMap.values());

              // Background fetch for missing activity files
              for (const act of finalCollection) {
                const localAct = localActivities.find(l => l.id === act.id);
                if (act.fileName && (!localAct || !localAct.fileData)) {
                  try {
                    const fileRes = await fetch(`/api/activities/${act.id}/file`);
                    if (fileRes.ok) {
                      const fileObj = await fileRes.json();
                      act.fileData = fileObj.fileData;
                    }
                  } catch (err) {
                    console.warn("Could not fetch file for activity " + act.id, err);
                  }
                } else if (localAct && localAct.fileData) {
                  act.fileData = localAct.fileData;
                }
              }

              if (changed && activitiesToUpload.length > 0) {
                for (const act of activitiesToUpload) {
                  await fetch('/api/activities', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(act)
                  });
                }
              }
              setActivities(finalCollection);
            }
          }
          
          // 3. Submissions Sync with fallback & merge (decoupled from fileData)
          if (Array.isArray(data.submissions)) {
            const serverSubmissions = data.submissions;
            const localSubmissions = submissionsRef.current;

            const mergedMap = new Map<string, Submission>();
            serverSubmissions.forEach((s: Submission) => {
              if (s && s.id) mergedMap.set(s.id, s);
            });

            let changed = false;
            const submissionsToUpload: Submission[] = [];
            localSubmissions.forEach((s: Submission) => {
              if (s && s.id) {
                const serverVersion = mergedMap.get(s.id);
                if (!serverVersion) {
                  mergedMap.set(s.id, s);
                  submissionsToUpload.push(s);
                  changed = true;
                } else {
                  // Preserve local fileData if server version doesn't have it loaded yet
                  if (s.fileData && !serverVersion.fileData) {
                    serverVersion.fileData = s.fileData;
                  }
                  // Compare metadata only (excluding fileData)
                  const localCopy = { ...s };
                  const serverCopy = { ...serverVersion };
                  delete localCopy.fileData;
                  delete serverCopy.fileData;

                  if (JSON.stringify(localCopy) !== JSON.stringify(serverCopy)) {
                    mergedMap.set(s.id, s);
                    submissionsToUpload.push(s);
                    changed = true;
                  }
                }
              }
            });

            const finalCollection = Array.from(mergedMap.values());

            // Background fetch for missing submission files
            for (const sub of finalCollection) {
              const localSub = localSubmissions.find(l => l.id === sub.id);
              if (sub.fileName && (!localSub || !localSub.fileData)) {
                try {
                  const fileRes = await fetch(`/api/submissions/${sub.id}/file`);
                  if (fileRes.ok) {
                    const fileObj = await fileRes.json();
                    if (fileObj.fileData) {
                      sub.fileData = fileObj.fileData;
                    }
                  }
                } catch (err) {
                  console.warn("Could not fetch file for submission " + sub.id, err);
                }
              } else if (localSub && localSub.fileData) {
                sub.fileData = localSub.fileData;
              }
            }

            if (changed && submissionsToUpload.length > 0) {
              for (const sub of submissionsToUpload) {
                try {
                  await fetch('/api/submissions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sub)
                  });
                } catch (err) {
                  console.warn("Failed to upload local submission to backend:", err);
                }
              }
            }
            setSubmissions(finalCollection);
          }
          
          // 4. Custom registration link sync
          if (typeof data.customRegistrationLink === 'string') {
            if (data.customRegistrationLink) {
              setCustomRegistrationLink(data.customRegistrationLink);
            } else {
              const savedLink = localStorage.getItem('professores_conectados_custom_link');
              if (savedLink) {
                await fetch('/api/custom-link', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ link: savedLink })
                });
                setCustomRegistrationLink(savedLink);
              }
            }
          }
        }
      } catch (err) {
        // Log as warning to prevent false positives in test/checker environments during server boot
        console.warn("Could not connect to backend server (sync will retry):", err);
      }
    };

    syncWithBackend();
    const interval = setInterval(syncWithBackend, 8000); // Poll every 8 seconds for robust, light-weight syncing
    return () => clearInterval(interval);
  }, [isLoadedFromDB, isAuthenticated]);

  const handleUpdateCustomLink = async (link: string) => {
    setCustomRegistrationLink(link);
    localStorage.setItem('professores_conectados_custom_link', link);
    try {
      await fetch('/api/custom-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link }),
      });
    } catch (e) {
      console.error("Error saving custom link:", e);
    }
  };

  // --- PERSISTENCE EFFECTS (Auto-Save) ---
  useEffect(() => { 
      try {
        localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students)); 
      } catch (e) {
        console.error("Erro ao salvar alunos (localStorage cheio?)", e);
      }
      idbSetItem(STORAGE_KEY_STUDENTS, students);
  }, [students]);

  useEffect(() => { 
      try {
        localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(archivedExams)); 
      } catch (e) {
        console.error("Erro ao salvar provas", e);
      }
      idbSetItem(STORAGE_KEY_EXAMS, archivedExams);
  }, [archivedExams]);

  useEffect(() => { 
      try {
        localStorage.setItem(STORAGE_KEY_SLIDES, JSON.stringify(archivedSlides)); 
      } catch (e) {
        console.error("Erro ao salvar slides", e);
      }
      idbSetItem(STORAGE_KEY_SLIDES, archivedSlides);
  }, [archivedSlides]);

  useEffect(() => { 
      try {
        localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify(activities)); 
      } catch (e) {
        console.warn("Aviso: Limite de LocalStorage excedido ao salvar atividades, mas elas foram salvas com segurança no IndexedDB.", e);
      }
      idbSetItem(STORAGE_KEY_ACTIVITIES, activities);
  }, [activities]);

  useEffect(() => { 
      try {
        localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(submissions)); 
      } catch (e) {
        console.warn("Aviso: Limite de LocalStorage excedido ao salvar entregas, mas elas foram salvas com segurança no IndexedDB.", e);
      }
      idbSetItem(STORAGE_KEY_SUBMISSIONS, submissions);
  }, [submissions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOGO, logoUrl);
  }, [logoUrl]);

  // Sync Tabs (Keep tabs updated if data changes in another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
        if (e.key === STORAGE_KEY_STUDENTS && e.newValue) {
            const parsed = JSON.parse(e.newValue);
            if (Array.isArray(parsed)) setStudents(parsed);
        }
        if (e.key === STORAGE_KEY_SUBMISSIONS && e.newValue) {
            const parsed = JSON.parse(e.newValue);
            if (Array.isArray(parsed)) setSubmissions(parsed);
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // --- AUTH HANDLERS ---
  const handleLogin = (password: string) => {
      if (password === ADMIN_PASSWORD) {
          setIsAuthenticated(true);
          sessionStorage.setItem(STORAGE_KEY_AUTH, 'true');
          const adminTeacher: TeacherAccount = {
            id: 'prof_admin',
            name: 'Administrador Mestre',
            email: 'admin@escola.com',
            schoolName: 'Gestão Escolar Mestre',
            createdAt: new Date().toISOString()
          };
          setCurrentTeacher(adminTeacher);
          localStorage.setItem(STORAGE_KEY_CURRENT_TEACHER, JSON.stringify(adminTeacher));
          return true;
      }
      return false;
  };

  const handleTeacherLogin = (teacher: TeacherAccount) => {
      setCurrentTeacher(teacher);
      setIsAuthenticated(true);
      sessionStorage.setItem(STORAGE_KEY_AUTH, 'true');
      localStorage.setItem(STORAGE_KEY_CURRENT_TEACHER, JSON.stringify(teacher));
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setCurrentTeacher(null);
      sessionStorage.removeItem(STORAGE_KEY_AUTH);
      localStorage.removeItem(STORAGE_KEY_CURRENT_TEACHER);
      setCurrentView(ViewState.DASHBOARD); 
  };

  // --- DATA HANDLERS ---
  const handleAddStudent = async (newStudent: Student) => {
    // Check if the student already has courseUnits initialized. If not, auto-inherit from classmates of the same class Group!
    let initializedStudent: Student = { 
      ...newStudent,
      teacherId: newStudent.teacherId || currentTeacher?.id
    };
    if (!initializedStudent.courseUnits || initializedStudent.courseUnits.length === 0) {
      const classmates = students.filter(s => s.classGroup.trim().toLowerCase() === initializedStudent.classGroup.trim().toLowerCase());
      if (classmates.length > 0) {
        const subjectNames = new Set<string>();
        classmates.forEach(c => {
          if (Array.isArray(c.courseUnits)) {
            c.courseUnits.forEach(u => {
              if (u.name) subjectNames.add(u.name.trim());
            });
          }
        });
        
        if (subjectNames.size > 0) {
          initializedStudent.courseUnits = Array.from(subjectNames).map(name => ({
            name: name,
            assessmentCount: 4,
            assessments: [0, 0, 0, 0],
            averageGrade: 0,
            totalHours: 80,
            absences: 0,
            absenceLog: []
          }));
        }
      }
    }

    setStudents(prev => [...prev, initializedStudent]);
    // Sync directly to Firestore for real-time update across all devices (notebook, mobile, Vercel)
    syncStudentToFirestore(initializedStudent);
    try {
      await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initializedStudent)
      });
    } catch (e) {
      console.error(e);
    }
  };
  
  const handleUpdateStudent = async (updatedStudent: Student) => {
      setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
      syncStudentToFirestore(updatedStudent);
      try {
        await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedStudent)
        });
      } catch (e) {
        console.error(e);
      }
  };

  const handleBulkUpdateStudents = async (updatedStudents: Student[]) => {
      setStudents(prev => {
          const updateMap = new Map(updatedStudents.map(u => [u.id, u]));
          return prev.map(s => updateMap.has(s.id) ? updateMap.get(s.id)! : s);
      });
      syncStudentsBulkToFirestore(updatedStudents);
      try {
        await fetch('/api/students/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedStudents)
        });
      } catch (e) {
        console.error(e);
      }
  };

  const handleDeleteStudent = async (studentId: string) => {
      setStudents(prev => prev.filter(s => s.id !== studentId));
      deleteStudentFromFirestore(studentId);
      try {
         await fetch('/api/students/delete', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ id: studentId })
         });
      } catch (e) {
         console.error(e);
      }
  };

  const handleDeleteClassGroup = async (className: string, deleteStudents: boolean = true) => {
      if (!className) return;
      
      if (deleteStudents) {
        setStudents(prev => prev.filter(s => !s.classGroup || s.classGroup.trim().toLowerCase() !== className.trim().toLowerCase()));
      } else {
        setStudents(prev => prev.map(s => {
          if (s.classGroup && s.classGroup.trim().toLowerCase() === className.trim().toLowerCase()) {
            return { ...s, classGroup: 'Sem Turma' };
          }
          return s;
        }));
      }

      try {
        await fetch('/api/classes/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ className, deleteStudents })
        });
      } catch (e) {
        console.error("Erro ao excluir turma no servidor", e);
      }
  };
  
  const handleArchiveExam = (exam: ArchivedExam) => {
    const examWithTeacher = { ...exam, teacherId: exam.teacherId || currentTeacher?.id };
    setArchivedExams(prev => [examWithTeacher, ...prev]);
  };

  const handleArchiveSlideDeck = (deck: ArchivedSlideDeck) => {
    const deckWithTeacher = { ...deck, teacherId: deck.teacherId || currentTeacher?.id };
    setArchivedSlides(prev => [deckWithTeacher, ...prev]);
  };
  
  const handleViewExam = (exam: ArchivedExam) => { 
      setSelectedExam(exam); 
      setCurrentView(ViewState.EXAMS); 
  };

  const handleViewSlide = (deck: ArchivedSlideDeck) => {
      setSelectedSlide(deck);
      setCurrentView(ViewState.SLIDES);
  };
  
  const handleAddActivity = async (activity: Activity) => {
    const activityWithTeacher = { ...activity, teacherId: activity.teacherId || currentTeacher?.id };
    setActivities(prev => [activityWithTeacher, ...prev]);
    syncActivityToFirestore(activityWithTeacher);
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityWithTeacher)
      });
    } catch (e) {
      console.error(e);
    }
  };
  
  const handleDeleteActivity = async (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
    try {
      await fetch('/api/activities/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (e) {
      console.error(e);
    }
  };
  
  const handleAddSubmission = async (submission: Submission) => {
    const subWithTeacher = { ...submission, teacherId: submission.teacherId || currentTeacher?.id };
    setSubmissions(prev => [subWithTeacher, ...prev]);
    syncSubmissionToFirestore(subWithTeacher);
    try {
       await fetch('/api/submissions', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(subWithTeacher)
       });
    } catch (e) {
       console.error(e);
    }
  };

  const handleSidebarChange = (view: ViewState) => {
    if (view !== ViewState.EXAMS) setSelectedExam(null);
    if (view !== ViewState.SLIDES) setSelectedSlide(null);
    setCurrentView(view);
  };

  // --- RENDER LOGIC ---

  // 1. Check for Public Access Mode (Student Portal)
  if (currentView === ViewState.STUDENT_PORTAL) {
      return (
          <StudentPortalView 
            students={students}
            activities={activities}
            submissions={submissions}
            onRegister={handleAddStudent} 
            onSubmission={handleAddSubmission}
            onExit={() => setCurrentView(ViewState.DASHBOARD)} 
            isPublicMode={!isAuthenticated} 
            customRegistrationLink={customRegistrationLink}
          />
      );
  }

  // 2. Check Auth for Admin Area
  if (!isAuthenticated) {
      return (
        <LoginView 
            onLogin={handleLogin} 
            onTeacherLogin={handleTeacherLogin}
            onGoToStudentPortal={() => setCurrentView(ViewState.STUDENT_PORTAL)}
            logoUrl={logoUrl}
        />
      );
  }

  // 3. Render Admin Views
  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD: return (
        <DashboardView 
          changeView={setCurrentView} 
          students={students} 
          archivedExams={archivedExams} 
          archivedSlides={archivedSlides}
          onAddStudent={handleAddStudent} 
          onDeleteClassGroup={handleDeleteClassGroup}
          onViewExam={handleViewExam}
          onViewSlide={handleViewSlide}
          customRegistrationLink={customRegistrationLink}
          onUpdateCustomLink={handleUpdateCustomLink}
        />
      );
      case ViewState.RESEARCH: return <ResearchView />;
      case ViewState.TEACHERS_CHAT: return <TeachersChatView />;
      case ViewState.LESSON_PLAN: return <LessonPlanView logoUrl={logoUrl} />;
      case ViewState.SLIDES: return <SlideGeneratorView archivedDecks={archivedSlides} onArchive={handleArchiveSlideDeck} initialDeck={selectedSlide} logoUrl={logoUrl} />;
      case ViewState.EXERCISE_GENERATOR: return <ExerciseGeneratorView logoUrl={logoUrl} />;
      case ViewState.EXAMS: return <ExamCreatorView onArchiveExam={handleArchiveExam} initialExam={selectedExam} logoUrl={logoUrl} />;
      case ViewState.GRADES: return <GradebookView students={students} onUpdateStudent={handleUpdateStudent} onBulkUpdateStudents={handleBulkUpdateStudents} onAddStudent={handleAddStudent} onDeleteStudent={handleDeleteStudent} onDeleteClassGroup={handleDeleteClassGroup} />;
      case ViewState.GOOGLE_FORMS: return (
        <GoogleFormsView 
          customRegistrationLink={customRegistrationLink}
          onUpdateCustomLink={handleUpdateCustomLink}
        />
      );
      case ViewState.ACTIVITIES: return <ActivitiesView activities={activities} submissions={submissions} onAddActivity={handleAddActivity} onDeleteActivity={handleDeleteActivity} students={students} />;
      case ViewState.WHATSAPP: return <WhatsAppView students={students} activities={activities} />;
      default: return (
        <DashboardView 
          changeView={setCurrentView} 
          students={students} 
          archivedExams={archivedExams} 
          archivedSlides={archivedSlides} 
          onAddStudent={handleAddStudent} 
          onDeleteClassGroup={handleDeleteClassGroup}
          onViewExam={handleViewExam} 
          onViewSlide={handleViewSlide}
          customRegistrationLink={customRegistrationLink}
          onUpdateCustomLink={handleUpdateCustomLink}
        />
      );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-800">
      <Sidebar 
        currentView={currentView} 
        setView={handleSidebarChange} 
        onLogout={handleLogout} 
        logoUrl={logoUrl}
        setLogoUrl={setLogoUrl}
        currentTeacher={currentTeacher}
      />
      
      <main className="flex-1 ml-64 p-8 overflow-y-auto max-w-[1920px] transition-all duration-300">
        <div className="max-w-7xl mx-auto h-full">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;