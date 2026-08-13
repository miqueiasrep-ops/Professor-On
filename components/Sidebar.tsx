import React from 'react';
import { ViewState, TeacherAccount } from '../types';
import { LayoutDashboard, Search, FileText, GraduationCap, LogOut, BookOpenCheck, Presentation, Sparkles, UserPlus, ListTodo, FolderUp, FileQuestion, MessageCircle, MessageSquare, UserCheck } from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onLogout: () => void;
  logoUrl: string;
  setLogoUrl: (url: string) => void;
  currentTeacher?: TeacherAccount | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onLogout, logoUrl, setLogoUrl, currentTeacher }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Painel Geral', icon: LayoutDashboard },
    { id: ViewState.WHATSAPP, label: 'WhatsApp Conectado', icon: MessageSquare },
    { id: ViewState.TEACHERS_CHAT, label: 'Sala dos Professores', icon: MessageCircle },
    { id: ViewState.RESEARCH, label: 'Pesquisa AI', icon: Search },
    { id: ViewState.LESSON_PLAN, label: 'Plano de Aula', icon: BookOpenCheck },
    { id: ViewState.SLIDES, label: 'Gerador de Slides', icon: Presentation },
    { id: ViewState.EXERCISE_GENERATOR, label: 'Gerador de Exercícios', icon: ListTodo },
    { id: ViewState.EXAMS, label: 'Criar Provas', icon: FileText },
    { id: ViewState.ACTIVITIES, label: 'Central de Atividades', icon: FolderUp },
    { id: ViewState.GOOGLE_FORMS, label: 'Google Forms', icon: FileQuestion },
    { id: ViewState.GRADES, label: 'Diário de Notas', icon: GraduationCap },
  ];

  return (
    <>
      <aside className="w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white h-screen flex flex-col fixed left-0 top-0 z-20 shadow-2xl border-r border-slate-700/50">
        {/* Logo Area */}
        <div className="p-6 pb-6 flex flex-col gap-2 flex-shrink-0">
          <div className="flex items-center gap-3 group relative">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-indigo-500/30 cursor-pointer relative transition-transform hover:scale-105 active:scale-95"
            >
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <Sparkles size={16} className="text-white" />
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleLogoChange} 
              className="hidden" 
              accept="image/*" 
            />
            <div className="flex-1">
               <h1 className="text-lg font-bold tracking-tight text-white leading-tight">Professor<br/><span className="text-indigo-400">Conectado</span></h1>
               <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] text-slate-500 hover:text-indigo-400 uppercase tracking-widest font-bold flex items-center gap-1 mt-0.5 transition-colors"
                >
                  Alterar Logo
                </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-2">
            Ferramentas
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-r-full blur-[1px]"></div>
                )}
                <Icon size={20} className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'} transition-colors duration-300`} />
                <span className="font-medium tracking-wide text-sm">{item.label}</span>
              </button>
            );
          })}

          <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-6">
            Acesso Público
          </div>
          
          <button
            onClick={() => setView(ViewState.STUDENT_PORTAL)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-emerald-400 transition-all duration-300 group"
          >
            <UserPlus size={20} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
            <span className="font-medium tracking-wide text-sm">Modo Aluno (Cadastro)</span>
          </button>

        </nav>

        {/* Active Teacher Profile Footer */}
        <div className="p-4 m-3 mt-auto rounded-2xl bg-slate-800/80 border border-slate-700/60 flex-shrink-0 space-y-3">
          {currentTeacher ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-bold flex-shrink-0">
                <UserCheck size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white truncate" title={currentTeacher.name}>
                  {currentTeacher.name}
                </h4>
                <p className="text-[10px] text-slate-400 truncate" title={currentTeacher.schoolName || currentTeacher.email}>
                  {currentTeacher.schoolName || currentTeacher.email}
                </p>
                <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[9px] font-bold">
                  Ambiente Privado
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400">
              Professores Conectados
            </div>
          )}

          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/60 hover:bg-red-950/40 text-slate-300 hover:text-red-300 border border-slate-700/50 hover:border-red-900/50 transition-all rounded-xl text-xs font-semibold group"
          >
            <span>Sair da Conta</span>
            <LogOut size={15} className="group-hover:-translate-x-0.5 transition-transform text-slate-400 group-hover:text-red-400" />
          </button>

          <div className="pt-1 text-center">
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Acesso Independente v2.5</p>
          </div>
        </div>
      </aside>
    </>
  );
};