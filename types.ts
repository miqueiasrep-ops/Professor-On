

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  RESEARCH = 'RESEARCH',
  EXAMS = 'EXAMS',
  EXERCISE_GENERATOR = 'EXERCISE_GENERATOR',
  GRADES = 'GRADES',
  LESSON_PLAN = 'LESSON_PLAN',
  SLIDES = 'SLIDES',
  STUDENT_PORTAL = 'STUDENT_PORTAL',
  GOOGLE_FORMS = 'GOOGLE_FORMS',
  ACTIVITIES = 'ACTIVITIES',
  TEACHERS_CHAT = 'TEACHERS_CHAT',
  WHATSAPP = 'WHATSAPP'
}

export interface AbsenceEntry {
  date: string;
  hours: number; // Quantidade de horas perdidas neste dia
}

export interface CourseUnit {
  name: string;            
  assessmentCount: number; 
  assessments: number[];   // Array com as 4 notas: [Av1, Av2, Av3, Av4]
  averageGrade: number;    
  totalHours: number;      // Carga Horária Total
  absences: number;        // Total de Horas de Falta (Soma dos logs)
  absenceLog: AbsenceEntry[];    // Histórico detalhado (Data + Horas)
}

export interface AttendanceRecord {
  date: string;
  present: boolean;
}

export interface TeacherAccount {
  id: string;
  name: string;
  email: string;
  schoolName?: string;
  role?: string;
  createdAt: string;
}

export interface Student {
  id: string;
  teacherId?: string;
  name: string;
  classGroup: string;
  email: string;   
  contact: string; 
  avatar: string;
  courseUnits: CourseUnit[]; 
  attendanceRecords?: AttendanceRecord[]; // Mantendo histórico opcional para compatibilidade
}

export interface Question {
  question: string;
  options: string[];
  correctAnswer: number; // Index of the correct option
  explanation: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  sources?: Array<{
    title: string;
    uri: string;
  }>;
}

// Gemini Schema Types
export type ExamType = 'MULTIPLE_CHOICE' | 'OPEN_ENDED';
export type ExerciseType = 'TRUE_FALSE' | 'FILL_IN_THE_BLANKS' | 'MULTIPLE_CHOICE' | 'MIXED';

export interface GeneratedQuizResponse {
  title: string;
  type?: ExamType;
  questions: {
    questionText: string;
    // For Multiple Choice
    options?: string[];
    correctOptionIndex?: number;
    // For Open Ended
    expectedAnswer?: string;
    // Common
    explanation?: string;
  }[];
}

export interface GeneratedExerciseResponse {
  title: string;
  topic: string;
  exercises: {
    type: 'TRUE_FALSE' | 'FILL_IN_THE_BLANKS' | 'MULTIPLE_CHOICE' | 'OPEN';
    statement: string;
    // For True/False
    isTrue?: boolean;
    // For Fill Blanks
    answerKey: string;
    // For Multiple Choice
    options?: string[];
    correctIndex?: number;
  }[];
}

export interface ArchivedExam extends GeneratedQuizResponse {
  id: string;
  teacherId?: string;
  createdAt: string;
  courseUnit?: string;
  teacherName?: string;
  gradeLevel?: string;
}

export interface LessonPlan {
  title: string;
  topic: string;
  gradeLevel: string;
  duration: string;
  objectives: string[];
  materials: string[];
  activities: {
    time: string;
    description: string;
    methodology: string;
  }[];
  assessment: string;
}

export interface Slide {
  title: string;
  content: string[];
  imageDescription: string;
  speakerNotes: string;
}

export interface SlideDeck {
  topic: string;
  gradeLevel: string;
  slides: Slide[];
}

export interface ArchivedSlideDeck extends SlideDeck {
  id: string;
  teacherId?: string;
  createdAt: string;
  curricularUnit?: string;
}

// Activity Hub Types
export interface Activity {
  id: string;
  teacherId?: string;
  title: string;
  description: string;
  className: string;
  deadline: string;
  fileName?: string; // Nome do arquivo
  fileSize?: string; // Tamanho legível
  fileData?: string; // Conteúdo Base64 (Novo)
  fileType?: string; // MIME type (Novo)
  createdAt: string;
}

export interface Submission {
  id: string;
  teacherId?: string;
  activityId: string;
  studentName: string;
  fileName: string;
  fileType: string;
  fileData?: string; // Conteúdo do arquivo do aluno
  submittedAt: string;
  status: 'pending' | 'reviewed';
}

// External Libraries
declare global {
  var html2pdf: any;
  var PptxGenJS: any;
}