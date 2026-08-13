

import React, { useState } from 'react';
import { Users, BookOpen, Star, AlertCircle, Plus, X, FileText, Eye, ArrowRight, Clock, Calendar, Trash2, Bell, Hash, Phone, Mail, Presentation, Link as LinkIcon, CheckCircle, Copy } from 'lucide-react';
import { ViewState, Student, ArchivedExam, ArchivedSlideDeck } from '../../types';
import QRCode from 'react-qr-code';

interface DashboardProps {
  changeView: (view: ViewState) => void;
  students: Student[];
  archivedExams: ArchivedExam[];
  archivedSlides?: ArchivedSlideDeck[]; // Added prop
  onAddStudent: (student: Student) => void;
  onDeleteClassGroup?: (className: string, deleteStudents: boolean) => void;
  onViewExam?: (exam: ArchivedExam) => void;
  onViewSlide?: (deck: ArchivedSlideDeck) => void; // Added prop
  customRegistrationLink?: string;
  onUpdateCustomLink?: (link: string) => void;
}

interface Reminder {
  id: string;
  text: string;
  date: string;
  color: 'orange' | 'blue' | 'purple' | 'emerald';
}

export const DashboardView: React.FC<DashboardProps> = ({ 
  changeView, 
  students, 
  archivedExams, 
  archivedSlides = [], 
  onAddStudent, 
  onViewExam, 
  onViewSlide,
  customRegistrationLink = '',
  onUpdateCustomLink
}) => {
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showExamsModal, setShowExamsModal] = useState(false);
  const [showSlidesModal, setShowSlidesModal] = useState(false); // New modal state
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPortalLink, setCopiedPortalLink] = useState(false);

  const uniqueClasses = React.useMemo(() => {
    const classes = new Set(students.map(s => s.classGroup));
    if (classes.size === 0) {
      classes.add('9º Ano A');
    }
    return Array.from(classes).sort();
  }, [students]);

  const [newStudentName, setNewStudentName] = useState('');
  const [classOption, setClassOption] = useState(() => uniqueClasses[0] || '9º Ano A');
  const [customClass, setCustomClass] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentContact, setNewStudentContact] = useState('');

  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');

  const [reminders, setReminders] = useState<Reminder[]>([
    { id: '1', text: 'Corrigir provas do 9º Ano', date: 'Entrega Sexta', color: 'orange' },
    { id: '2', text: 'Reunião pedagógica', date: 'Quarta, 14:00', color: 'blue' },
  ]);

  const getPublicStudentLink = () => {
    if (typeof window === 'undefined') return '';
    let origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      origin = origin.replace('ais-dev-', 'ais-pre-');
    }
    return `${origin}/?mode=student`;
  };

  const totalStudents = students.length;
  const createdExamsCount = archivedExams.length;
  const createdSlidesCount = archivedSlides.length;
  
  const calculateGlobalAverage = () => {
    if (totalStudents === 0) return '0.0';
    let totalGrade = 0;
    let totalUnits = 0;

    students.forEach(student => {
        if (student.courseUnits.length > 0) {
            student.courseUnits.forEach(unit => {
                totalGrade += unit.averageGrade;
                totalUnits++;
            });
        }
    });

    return totalUnits > 0 ? (totalGrade / totalUnits).toFixed(1) : '0.0';
  };
  
  const classAverage = calculateGlobalAverage();

  // ATENÇÃO: Se nota < 6 OU (% Faltas >= 20%)
  const attentionCount = students.filter(s => 
    s.courseUnits.some(u => {
        const absencePct = u.totalHours > 0 ? (u.absences / u.totalHours) * 100 : 0;
        return u.averageGrade < 6 || absencePct >= 20;
    })
  ).length;

  const stats = [
    { label: 'Total de Alunos', value: totalStudents.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-100', action: () => setShowStudentModal(true) },
    { label: 'Provas Criadas', value: createdExamsCount.toString(), icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-100', action: () => setShowExamsModal(true) },
    { label: 'Slides Gerados', value: createdSlidesCount.toString(), icon: Presentation, color: 'text-purple-600', bg: 'bg-purple-100', action: () => setShowSlidesModal(true) },
    { label: 'Média Geral', value: classAverage, icon: Star, color: 'text-amber-600', bg: 'bg-amber-100', action: () => changeView(ViewState.GRADES) },
    { label: 'Atenção Necessária', value: attentionCount.toString(), icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-100', action: () => changeView(ViewState.GRADES) },
  ];

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const finalClass = classOption === 'NEW_CLASS' ? customClass.trim() : classOption;

    const newStudent: Student = {
      id: Date.now().toString(),
      name: newStudentName,
      classGroup: finalClass || 'Sem Turma',
      email: newStudentEmail || '',
      contact: newStudentContact || 'Não informado',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newStudentName.replace(' ', '')}`,
      courseUnits: [], 
      attendanceRecords: []
    };

    onAddStudent(newStudent);
    setNewStudentName('');
    setClassOption(uniqueClasses[0] || '9º Ano A');
    setCustomClass('');
    setNewStudentEmail('');
    setNewStudentContact('');
    setShowStudentModal(false);
  };

  const handleSaveReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderText.trim()) return;

    const colors: Reminder['color'][] = ['orange', 'blue', 'purple', 'emerald'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newReminder: Reminder = {
      id: Date.now().toString(),
      text: newReminderText,
      date: newReminderDate || 'Hoje',
      color: randomColor
    };

    setReminders([...reminders, newReminder]);
    setNewReminderText('');
    setNewReminderDate('');
    setShowReminderModal(false);
  };

  const handleDeleteReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  const getReminderClasses = (color: string) => {
    switch (color) {
      case 'orange': return { bg: 'bg-orange-50', border: 'border-orange-100', dot: 'bg-orange-500', text: 'text-orange-700', badge: 'bg-orange-100' };
      case 'blue': return { bg: 'bg-blue-50', border: 'border-blue-100', dot: 'bg-blue-500', text: 'text-blue-700', badge: 'bg-blue-100' };
      case 'purple': return { bg: 'bg-purple-50', border: 'border-purple-100', dot: 'bg-purple-500', text: 'text-purple-700', badge: 'bg-purple-100' };
      case 'emerald': return { bg: 'bg-emerald-50', border: 'border-emerald-100', dot: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-100' };
      default: return { bg: 'bg-gray-50', border: 'border-gray-100', dot: 'bg-gray-500', text: 'text-gray-700', badge: 'bg-gray-100' };
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 to-indigo-600 text-white shadow-xl shadow-indigo-200 min-h-[220px] flex items-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl z-0"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-black opacity-10 rounded-full -ml-10 -mb-10 blur-2xl z-0"></div>
        
        <div className="absolute right-0 bottom-0 h-full w-1/2 md:w-5/12 overflow-hidden z-0">
           <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 via-indigo-700/80 to-transparent z-10"></div>
           <img 
             src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
             alt="Professor" 
             className="w-full h-full object-cover object-top opacity-90"
           />
        </div>

        <div className="relative p-8 md:p-10 flex flex-col justify-center gap-6 w-full z-20">
          <div className="max-w-xl">
             <div className="flex flex-col gap-1 mb-4">
                 <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg border border-white/20 shadow-sm w-fit">
                    <Calendar size={16} className="text-indigo-100"/>
                    <span className="font-medium text-sm text-white">{new Date().toLocaleDateString('pt-BR')}</span>
                 </div>
             </div>

            <h2 className="text-3xl font-bold mb-2">{getGreeting()}, Professor(a)!</h2>
            <p className="text-indigo-100 text-lg leading-relaxed">
              Pronto para transformar a educação hoje? Suas ferramentas de IA estão prontas para ajudar a criar aulas incríveis.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index} 
              onClick={stat.action ? stat.action : undefined}
              className={`bg-white p-6 rounded-2xl shadow-lg shadow-gray-100 border border-gray-100 transition-all duration-300 ${stat.action ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl group' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              {stat.action && (
                 <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                    <Plus size={12} /> Ver Detalhes
                 </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-lg shadow-gray-100 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
             <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
               <Star className="text-yellow-500 fill-yellow-500" size={20} />
               Acesso Rápido
             </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <button 
              onClick={() => changeView(ViewState.RESEARCH)}
              className="group p-5 rounded-2xl border border-gray-100 bg-gradient-to-br from-indigo-50 to-white hover:to-indigo-50 transition-all text-left hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex justify-between items-start mb-3">
                 <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors text-indigo-600">
                    <BookOpen size={24} />
                 </div>
                 <ArrowRight size={20} className="text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all"/>
              </div>
              <h4 className="font-bold text-gray-800 group-hover:text-indigo-700">Pesquisar Conteúdo</h4>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">Encontre referências e materiais atualizados.</p>
            </button>

            <button 
              onClick={() => changeView(ViewState.EXAMS)}
              className="group p-5 rounded-2xl border border-gray-100 bg-gradient-to-br from-indigo-50 to-white hover:to-indigo-50 transition-all text-left hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex justify-between items-start mb-3">
                 <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors text-indigo-600">
                    <FileText size={24} />
                 </div>
                 <ArrowRight size={20} className="text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all"/>
              </div>
              <h4 className="font-bold text-gray-800 group-hover:text-indigo-700">Criar Nova Prova</h4>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">Gere avaliações completas em segundos com IA.</p>
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 my-8"></div>

          {/* Compartilhamento de Links com Alunos */}
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <LinkIcon className="text-indigo-600" size={20} />
              Seus Links de Acesso / Compartilhar com Alunos
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* CARD 1: Portal Integrado do Aluno */}
              <div className="p-6 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl flex flex-col md:flex-row items-center gap-6">
                <div className="p-3 bg-white border border-indigo-100 rounded-xl shadow-sm flex-shrink-0">
                  <QRCode value={getPublicStudentLink()} size={90} />
                </div>
                <div className="flex-1 w-full text-center md:text-left">
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full uppercase tracking-wider">Portal Integrado</span>
                  <h4 className="font-bold text-gray-800 text-base mt-2 mb-1">Seu Link do Portal do Aluno</h4>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">
                    Envie aos alunos para que eles realizem matrículas automáticas sozinhos, vejam notas/faltas e enviem tarefas escolares de qualquer aparelho.
                  </p>
                  
                  <div className="flex flex-wrap gap-2.5 justify-center md:justify-start">
                    <button
                      onClick={() => {
                        const link = getPublicStudentLink();
                        navigator.clipboard.writeText(link);
                        setCopiedPortalLink(true);
                        setTimeout(() => setCopiedPortalLink(false), 2000);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 hover:border-indigo-300 text-gray-700 hover:text-indigo-700 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer animate-none"
                    >
                      {copiedPortalLink ? <CheckCircle className="text-green-500" size={14} /> : <Copy size={14} />}
                      {copiedPortalLink ? 'Copiado!' : 'Copiar Meu Link'}
                    </button>
                    
                    <a
                      href={getPublicStudentLink() || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                    >
                      Abrir Portal <ArrowRight size={12} />
                    </a>
                  </div>
                </div>
              </div>

              {/* CARD 2: Google Forms / Formulário Externo */}
              {customRegistrationLink ? (
                <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl flex flex-col md:flex-row items-center gap-6">
                  <div className="p-3 bg-white border border-purple-100 rounded-xl shadow-sm flex-shrink-0">
                    <QRCode value={customRegistrationLink} size={90} />
                  </div>
                  <div className="flex-1 w-full text-center md:text-left">
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full uppercase tracking-wider">Formulário Externo</span>
                    <h4 className="font-bold text-gray-800 text-base mt-2 mb-1">Inscrição Sincronizada</h4>
                    <p className="text-xs text-gray-500 leading-relaxed mb-3">
                      Seus alunos podem preencher o formulário externo que você vinculou para enviar informações extras de cadastro para seu banco de dados.
                    </p>
                    
                    <div className="flex flex-wrap gap-2.5 justify-center md:justify-start">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(customRegistrationLink);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-700 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        {copiedLink ? <CheckCircle className="text-green-500" size={14} /> : <Copy size={14} />}
                        {copiedLink ? 'Copiado!' : 'Copiar URL'}
                      </button>
                      
                      <a
                        href={customRegistrationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        Acessar Link <ArrowRight size={12} />
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-slate-50 border border-dashed border-gray-200 rounded-2xl text-center flex flex-col justify-center items-center">
                  <div className="inline-flex p-3 bg-gray-100 text-gray-400 rounded-full mb-3">
                    <LinkIcon size={24} />
                  </div>
                  <h4 className="font-bold text-gray-700 text-sm mb-1">Formulário Google Forms Externo</h4>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4 leading-relaxed">
                    Você ainda não vinculou um formulário do Google Forms. Vincule um formulário personalizado para capturar contatos externos.
                  </p>
                  <button
                    onClick={() => changeView(ViewState.GOOGLE_FORMS)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={14} /> Vincular Google Forms
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-lg shadow-gray-100 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Clock className="text-indigo-500" size={20} />
            Lembretes
          </h3>
          <div className="space-y-4">
            {reminders.map((reminder) => {
              const styles = getReminderClasses(reminder.color);
              return (
                <div key={reminder.id} className={`p-4 rounded-2xl ${styles.bg} border ${styles.border} flex items-start gap-4 group relative`}>
                  <div className={`w-2 h-2 mt-2 rounded-full ${styles.dot} flex-shrink-0`}></div>
                  <div className="flex-1">
                    <p className="text-gray-800 font-semibold">{reminder.text}</p>
                    <p className={`text-xs ${styles.text} font-medium mt-1 ${styles.badge} inline-block px-2 py-0.5 rounded-full`}>{reminder.date}</p>
                  </div>
                  <button 
                    onClick={() => handleDeleteReminder(reminder.id)}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}

            <div 
              onClick={() => setShowReminderModal(true)}
              className="p-4 rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-sm cursor-pointer hover:bg-gray-100 transition-colors"
            >
               <Plus size={16} className="mr-2" /> Novo lembrete
            </div>
          </div>
        </div>
      </div>

      {showStudentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-in overflow-hidden transform scale-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                <Users size={22} className="text-indigo-600"/>
                Cadastrar Aluno
              </h3>
              <button onClick={() => setShowStudentModal(false)} className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nome Completo</label>
                <input 
                  type="text" 
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                  placeholder="Ex: João da Silva"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                        <Hash size={14} /> Turma
                    </label>
                    <select 
                      value={classOption}
                      onChange={(e) => setClassOption(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-semibold text-sm"
                    >
                      {uniqueClasses.map((cls) => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                      <option value="NEW_CLASS">+ Criar nova turma...</option>
                    </select>
                  </div>
                  {classOption === 'NEW_CLASS' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nova Turma
                      </label>
                      <input 
                        type="text" 
                        required
                        value={customClass}
                        onChange={(e) => setCustomClass(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-sm font-semibold"
                        placeholder="Ex: 9º Ano B"
                      />
                    </div>
                  )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    <Mail size={14} /> E-mail
                </label>
                <input 
                  type="email" 
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                  placeholder="aluno@escola.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    <Phone size={14} /> Telefone
                </label>
                <input 
                  type="text" 
                  value={newStudentContact}
                  onChange={(e) => setNewStudentContact(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                  placeholder="Ex: (11) 99999-9999"
                />
              </div>

              <div className="pt-2">
                 <button 
                  type="submit" 
                  className="w-full py-3.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5"
                >
                  Salvar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReminderModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-in overflow-hidden transform scale-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                <Bell size={22} className="text-orange-500"/>
                Novo Lembrete
              </h3>
              <button onClick={() => setShowReminderModal(false)} className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveReminder} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tarefa / Lembrete</label>
                <input 
                  type="text" 
                  required
                  value={newReminderText}
                  onChange={(e) => setNewReminderText(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all outline-none"
                  placeholder="Ex: Reunião de pais"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Data / Prazo</label>
                <input 
                  type="text" 
                  value={newReminderDate}
                  onChange={(e) => setNewReminderDate(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all outline-none"
                  placeholder="Ex: Amanhã, 15:00"
                />
              </div>
              <div className="pt-2">
                 <button 
                  type="submit" 
                  className="w-full py-3.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-bold shadow-lg shadow-orange-200 transition-all hover:-translate-y-0.5"
                >
                  Adicionar Lembrete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExamsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl animate-fade-in overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                <BookOpen size={22} className="text-emerald-600"/>
                Arquivo de Provas
              </h3>
              <button onClick={() => setShowExamsModal(false)} className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 bg-gray-50/50">
              {archivedExams.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                   <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText size={32} className="text-gray-300" />
                   </div>
                   <p className="text-lg font-medium text-gray-600">Nenhuma prova arquivada</p>
                   <p className="text-sm mt-1">Gere e arquive provas no menu "Criar Provas".</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {archivedExams.map((exam) => (
                    <div key={exam.id} className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex justify-between items-center group">
                       <div className="flex gap-4 items-center">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${exam.type === 'MULTIPLE_CHOICE' ? 'bg-indigo-100 text-indigo-600' : 'bg-purple-100 text-purple-600'}`}>
                             {exam.type === 'MULTIPLE_CHOICE' ? <FileText size={20}/> : <FileText size={20}/>}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800 text-lg">{exam.title}</h4>
                            <div className="flex flex-wrap gap-2 mt-1">
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                  {new Date(exam.createdAt).toLocaleDateString()}
                                </span>
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                  {exam.gradeLevel}
                                </span>
                            </div>
                          </div>
                       </div>
                       
                       <button 
                          onClick={() => {
                            if (onViewExam) onViewExam(exam);
                            setShowExamsModal(false);
                          }}
                          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 rounded-xl text-sm font-semibold transition-all shadow-sm"
                          title="Visualizar e Imprimir"
                       >
                          <Eye size={18} />
                          Abrir
                       </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-white text-right">
              <button onClick={() => setShowExamsModal(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-semibold transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW MODAL: ARCHIVED SLIDES */}
      {showSlidesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl animate-fade-in overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                <Presentation size={22} className="text-purple-600"/>
                Slides Gerados
              </h3>
              <button onClick={() => setShowSlidesModal(false)} className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 bg-gray-50/50">
                {archivedSlides.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Presentation size={32} className="text-gray-300" />
                        </div>
                        <p className="text-lg font-medium text-gray-600">Nenhuma apresentação arquivada</p>
                        <p className="text-sm mt-1">Gere slides e clique em "Arquivar" para salvá-los aqui.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {archivedSlides.map((deck) => (
                            <div key={deck.id} className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg hover:border-purple-300 transition-all group flex flex-col">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                                        <Presentation size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800 line-clamp-2 leading-tight">{deck.topic}</h4>
                                        <p className="text-xs text-gray-500 mt-1">{deck.curricularUnit}</p>
                                    </div>
                                </div>
                                
                                <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                                        {new Date(deck.createdAt).toLocaleDateString()}
                                    </span>
                                    <button 
                                        onClick={() => {
                                            if (onViewSlide) onViewSlide(deck);
                                            setShowSlidesModal(false);
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-sm transition-colors text-sm font-bold"
                                    >
                                        <Eye size={16} /> Abrir
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-white text-right">
              <button onClick={() => setShowSlidesModal(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-semibold transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
