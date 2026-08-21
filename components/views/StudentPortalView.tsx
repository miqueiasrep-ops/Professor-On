import React, { useState, useRef, useEffect } from 'react';
import { Student, Activity, Submission } from '../../types';
import { UserPlus, CheckCircle2, Sparkles, LogOut, School, Phone, Hash, Mail, UploadCloud, File, Send, ArrowLeft, QrCode, X, Copy, ExternalLink, AlertTriangle, Edit3, Loader2 } from 'lucide-react';
import QRCode from 'react-qr-code';
import { StudentReportModal } from './StudentReportModal';
import { processAndCompressFile } from '../utils/fileUtils';
import { syncSubmissionToFirestore } from '../utils/firebaseClient';

interface StudentPortalProps {
  students: Student[];
  activities: Activity[];
  submissions?: Submission[];
  onRegister: (student: Student) => void;
  onSubmission: (submission: Submission) => void;
  onExit: () => void;
  isPublicMode?: boolean;
  customRegistrationLink?: string;
}

export const StudentPortalView: React.FC<StudentPortalProps> = ({ students, activities, submissions = [], onRegister, onSubmission, onExit, isPublicMode, customRegistrationLink }) => {
  const [activeTab, setActiveTab] = useState<'register' | 'submit'>('register');
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);

  const uniqueClasses = React.useMemo(() => {
    const classes = new Set(students.map(s => s.classGroup));
    if (classes.size === 0) {
      classes.add('9º Ano A');
    }
    return Array.from(classes).sort();
  }, [students]);

  // Register State
  const [name, setName] = useState('');
  const [classGroup, setClassGroup] = useState(() => uniqueClasses[0] || '9º Ano A');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Submission State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState('');
  const [isReadingFile, setIsReadingFile] = useState(false);

  // Calculate correct URL for QR Code
  useEffect(() => {
    if (typeof window !== 'undefined') {
        // Construct URL explicitly to ensure ?mode=student is present
        let origin = window.location.origin;
        if (origin.includes('ais-dev-')) {
          origin = origin.replace('ais-dev-', 'ais-pre-');
        }
        const url = new URL(origin + window.location.pathname);
        url.searchParams.set('mode', 'student');
        setQrUrl(url.toString());
    }
  }, []);

  // Handlers - Registration
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newStudentId = Date.now().toString();
    const newStudent: Student = {
      id: newStudentId,
      name: name,
      classGroup: classGroup || 'Sem Turma',
      email: email || '',
      contact: contact || 'Não informado',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(' ', '')}`,
      courseUnits: [], 
      attendanceRecords: []
    };

    onRegister(newStudent);
    setSelectedStudentId(newStudentId);
    setSuccessMsg('Você foi cadastrado na turma com sucesso!');
  };

  const resetRegisterForm = () => {
    setSuccessMsg('');
    setName('');
    setClassGroup(uniqueClasses[0] || '9º Ano A');
    setEmail('');
    setContact('');
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handlers - Submission
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
          alert("Arquivo muito grande (Máx: 15MB). Por favor, envie um arquivo menor.");
          e.target.value = '';
          return;
      }
      setSelectedFile(file);
      setIsReadingFile(true);
      try {
        const result = await processAndCompressFile(file);
        setFileBase64(result.base64);
      } catch (err) {
        console.error("Erro ao processar arquivo:", err);
        alert("Não foi possível processar o arquivo. Tente novamente.");
      } finally {
        setIsReadingFile(false);
      }
    }
  };

  const handleSubmitActivity = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedStudentId || !selectedActivityId || !selectedFile || isReadingFile || isSubmitting) return;

      const student = students.find(s => s.id === selectedStudentId);
      if (!student) return;

      setIsSubmitting(true);

      const submission: Submission = {
          id: Date.now().toString(),
          activityId: selectedActivityId,
          studentName: student.name,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileData: fileBase64,
          submittedAt: new Date().toLocaleString('pt-BR'),
          status: 'pending'
      };

      try {
        // Immediate direct sync to Firestore so the teacher's notebook receives it instantly
        await syncSubmissionToFirestore(submission);
        // Also update React in-memory state and trigger local hooks
        onSubmission(submission);
        setSuccessMsg(`Atividade "${selectedFile.name}" enviada com sucesso! O professor já recebeu no painel.`);
      } catch (err) {
        console.error("Erro ao enviar atividade:", err);
        onSubmission(submission);
        setSuccessMsg('Atividade enviada com sucesso!');
      } finally {
        setIsSubmitting(false);
        // Reset form
        setSelectedActivityId('');
        setSelectedFile(null);
        setFileBase64('');
      }
  };

  const handleReset = () => {
    setSuccessMsg('');
  };

  const copyLink = () => {
      navigator.clipboard.writeText(qrUrl);
      alert("Link copiado!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-indigo-400 opacity-10 rounded-full blur-3xl"></div>
      </div>

      <button 
        onClick={onExit}
        className="absolute top-6 left-6 text-white/50 hover:text-white flex items-center gap-2 text-sm bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm transition-all hover:bg-black/30 z-20"
      >
        <ArrowLeft size={14} />
        Voltar ao Início
      </button>

      {!isPublicMode && (
      <button 
        onClick={onExit}
        className="absolute top-6 right-6 text-white/50 hover:text-white flex items-center gap-2 text-sm bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm transition-all hover:bg-black/30 z-20"
      >
        <LogOut size={14} />
        Área do Professor
      </button>
      )}

      <div className="bg-white/95 backdrop-blur-md w-full max-w-md rounded-3xl shadow-2xl overflow-hidden z-10 animate-fade-in border border-white/50 flex flex-col max-h-[90vh]">
        
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-center text-white relative flex-shrink-0">
            <button 
                onClick={() => setShowQR(true)}
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                title="Mostrar QR Code"
            >
                <QrCode size={24} />
            </button>

            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center text-indigo-600 rotate-45 transform">
               <School size={24} className="-rotate-45" />
            </div>
            <h1 className="text-xl font-bold mb-1">Portal do Aluno</h1>
            <p className="text-indigo-100 text-xs">Conectado à sala de aula</p>
        </div>

        <div className="pt-10 px-6 pb-2">
            <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
                <button 
                    onClick={() => { setActiveTab('register'); setSuccessMsg(''); }}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'register' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Sou Novo
                </button>
                <button 
                    onClick={() => { setActiveTab('submit'); setSuccessMsg(''); }}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'submit' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Entregar Atividade
                </button>
            </div>
        </div>

        <div className="px-8 pb-8 flex-1 overflow-y-auto custom-scrollbar">
            {successMsg ? (
                <div className="text-center py-8 animate-fade-in">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={40} className="text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Sucesso!</h2>
                    <p className="text-gray-500 mb-6 px-4">{successMsg}</p>
                    
                    {activeTab === 'register' && (
                         <button 
                           onClick={() => { resetRegisterForm(); setActiveTab('submit'); }}
                           className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-teal-700 shadow-md transition-all mb-2 flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                         >
                           <span className="flex items-center justify-center gap-2"><Send size={18} /> Entregar Atividade Agora</span>
                         </button>
                    )}

                    <button 
                      onClick={handleReset}
                      className="w-full py-3 border border-gray-200 text-gray-500 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                    >
                      Voltar ao Início
                    </button>
                </div>
            ) : (
                <>
                    {/* REGISTER TAB */}
                    {activeTab === 'register' && (
                        <form onSubmit={handleRegister} className="space-y-4 animate-fade-in">
                            {customRegistrationLink && (
                                <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl flex flex-col gap-2 shadow-sm text-center">
                                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider mx-auto w-fit">Inscrição Oficial Disponível</span>
                                    <p className="text-[11px] text-gray-600 leading-relaxed">
                                        O seu professor disponibilizou um link de inscrição oficial para esta turma (Ex: Google Forms / Formulário Externo).
                                    </p>
                                    <a 
                                        href={customRegistrationLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm w-full font-sans"
                                    >
                                        Preencher Formulário Oficial <ExternalLink size={12} />
                                    </a>
                                    <div className="flex items-center gap-2 py-0.5">
                                        <div className="h-px bg-purple-200 flex-1"></div>
                                        <span className="text-[9px] text-purple-400 uppercase font-bold px-1">Ou faça inscrição rápida abaixo</span>
                                        <div className="h-px bg-purple-200 flex-1"></div>
                                    </div>
                                </div>
                            )}
                            <div className="text-center mb-4">
                                <p className="text-gray-500 text-sm">Preencha seus dados para entrar na lista de chamada.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Seu Nome</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm"
                                    placeholder="Ex: Ana Souza"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1 flex items-center gap-1"><Mail size={10} /> E-mail</label>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm"
                                    placeholder="seu@email.com"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase ml-1 flex items-center gap-1"><Hash size={10} /> Turma</label>
                                    <select 
                                        value={classGroup}
                                        onChange={(e) => setClassGroup(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm font-semibold text-gray-705"
                                    >
                                        {uniqueClasses.map((cls) => (
                                            <option key={cls} value={cls}>{cls}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase ml-1 flex items-center gap-1"><Phone size={10} /> Celular</label>
                                    <input 
                                        type="text" 
                                        value={contact}
                                        onChange={(e) => setContact(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm"
                                        placeholder="(XX) 9..."
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={!name.trim()}
                                className="w-full mt-4 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <UserPlus size={18} />
                                Confirmar Cadastro
                            </button>
                        </form>
                    )}

                    {/* SUBMIT ACTIVITY TAB */}
                    {activeTab === 'submit' && (
                        <form onSubmit={handleSubmitActivity} className="space-y-4 animate-fade-in">
                            <div className="text-center mb-4">
                                <p className="text-gray-500 text-sm">Selecione seu nome e o arquivo da atividade.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Quem é você?</label>
                                <select 
                                    value={selectedStudentId}
                                    onChange={(e) => setSelectedStudentId(e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm"
                                >
                                    <option value="">Selecione seu nome...</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.classGroup})</option>
                                    ))}
                                </select>
                                {selectedStudentId && (() => {
                                    const currentStudent = students.find(s => s.id === selectedStudentId);
                                    if (currentStudent && currentStudent.courseUnits && currentStudent.courseUnits.length > 0) {
                                        return (
                                            <div className="mt-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedStudentForReport(currentStudent)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                                                >
                                                    <File size={12} className="text-emerald-600" />
                                                    Ver Meu Boletim & Parecer IA
                                                </button>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Qual atividade?</label>
                                <select 
                                    value={selectedActivityId}
                                    onChange={(e) => setSelectedActivityId(e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm"
                                >
                                    <option value="">Selecione a atividade...</option>
                                    {activities.map(a => (
                                        <option key={a.id} value={a.id}>{a.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Arquivo (PDF, PNG, JPG)</label>
                                <div className="relative group">
                                    <input 
                                        type="file" 
                                        onChange={handleFileChange}
                                        className="hidden" 
                                        id="file-upload"
                                        accept=".pdf,image/*"
                                    />
                                    <label 
                                        htmlFor="file-upload"
                                        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${selectedFile ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50'}`}
                                    >
                                        {selectedFile ? (
                                            <div className="flex flex-col items-center text-green-600">
                                                <File size={24} className="mb-1" />
                                                <span className="text-xs font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                                                <span className="text-[10px] opacity-60">Toque para trocar</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center text-gray-400">
                                                <UploadCloud size={24} className="mb-1" />
                                                <span className="text-xs font-medium">Escolher arquivo</span>
                                                <span className="text-[10px]">Máx: 10MB</span>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={!selectedStudentId || !selectedActivityId || !selectedFile || isReadingFile || isSubmitting}
                                className="w-full mt-4 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isSubmitting ? (
                                  <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Enviando para o Professor...
                                  </>
                                ) : isReadingFile ? (
                                  <>
                                    <Sparkles size={18} className="animate-spin" />
                                    Processando Arquivo...
                                  </>
                                ) : (
                                  <>
                                    <Send size={18} />
                                    Enviar Atividade
                                  </>
                                )}
                            </button>

                            {selectedStudentId && (() => {
                                const student = students.find(s => s.id === selectedStudentId);
                                if (!student) return null;
                                const studentSubmissions = submissions.filter(sub => sub.studentName === student.name);
                                if (studentSubmissions.length === 0) return null;

                                return (
                                    <div className="mt-6 pt-5 border-t border-gray-100">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                            <CheckCircle2 size={14} className="text-emerald-500" />
                                            Minhas Atividades Enviadas ({studentSubmissions.length})
                                        </h4>
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                            {studentSubmissions.map(sub => {
                                                const activity = activities.find(a => a.id === sub.activityId);
                                                return (
                                                    <div key={sub.id} className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center justify-between text-xs">
                                                        <div className="pr-2 truncate">
                                                            <p className="font-semibold text-emerald-950 truncate">{activity?.title || 'Atividade'}</p>
                                                            <p className="text-[11px] text-emerald-700 truncate">{sub.fileName} • {sub.submittedAt}</p>
                                                        </div>
                                                        <span className="shrink-0 px-2 py-0.5 bg-emerald-200/60 text-emerald-800 font-medium rounded-md text-[10px]">
                                                            Armazenada
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                        </form>
                    )}
                </>
            )}
        </div>
      </div>

      {/* QR CODE MODAL */}
      {showQR && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full animate-fade-in relative shadow-2xl">
            <button 
              onClick={() => setShowQR(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
            >
              <X size={24} />
            </button>

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Link da Turma</h3>
              <p className="text-gray-500 text-sm">Compartilhe este QR para os alunos.</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl flex items-center justify-center border-2 border-indigo-100 mb-6">
              <div className="bg-white p-3 rounded-xl shadow-inner">
                <QRCode value={qrUrl} size={180} />
              </div>
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={copyLink}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 text-sm flex items-center justify-center gap-2"
                >
                    <Copy size={16} /> Link
                </button>
                <a 
                    href={qrUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 text-sm flex items-center justify-center gap-2"
                >
                    <ExternalLink size={16} /> Abrir
                </a>
            </div>
          </div>
        </div>
      )}

      {selectedStudentForReport && (
        <StudentReportModal 
          student={selectedStudentForReport} 
          onClose={() => setSelectedStudentForReport(null)} 
        />
      )}
    </div>
  );
};