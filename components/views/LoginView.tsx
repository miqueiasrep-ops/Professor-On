import React, { useState } from 'react';
import { Lock, ArrowRight, UserPlus, Sparkles, User, Mail, Building, LogIn, CheckCircle2 } from 'lucide-react';
import { TeacherAccount } from '../../types';

interface LoginViewProps {
  onLogin: (password: string) => boolean;
  onTeacherLogin: (teacher: TeacherAccount) => void;
  onGoToStudentPortal: () => void;
  logoUrl?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, onTeacherLogin, onGoToStudentPortal, logoUrl }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'ADMIN_PASS'>('LOGIN');
  
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register form state
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');

  // Common error / feedback state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick Master Pass state
  const [adminPass, setAdminPass] = useState('');

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('Por favor, preencha o e-mail e a senha.');
      return;
    }

    // Check saved accounts in localStorage
    try {
      const savedTeachers = JSON.parse(localStorage.getItem('professores_conectados_accounts') || '[]');
      const found = savedTeachers.find((t: any) => t.email.toLowerCase() === email.trim().toLowerCase());
      
      if (found) {
        if (found.password && found.password !== password) {
          setErrorMsg('Senha incorreta para esta conta.');
          return;
        }
        onTeacherLogin({
          id: found.id,
          name: found.name,
          email: found.email,
          schoolName: found.schoolName || 'Escola / Instituição',
          createdAt: found.createdAt || new Date().toISOString()
        });
        return;
      }

      // If no account found, create one automatically or fallback
      const newTeacher: TeacherAccount = {
        id: `prof_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: email.split('@')[0].replace('.', ' ').toUpperCase(),
        email: email.trim(),
        schoolName: 'Instituição de Ensino',
        createdAt: new Date().toISOString()
      };
      
      const updatedList = [...savedTeachers, { ...newTeacher, password }];
      localStorage.setItem('professores_conectados_accounts', JSON.stringify(updatedList));

      onTeacherLogin(newTeacher);
    } catch (err) {
      setErrorMsg('Erro ao realizar login. Tente novamente.');
    }
  };

  const handleTeacherRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name || !regEmail || !regPassword) {
      setErrorMsg('Preencha os campos obrigatórios (Nome, E-mail e Senha).');
      return;
    }

    try {
      const savedTeachers = JSON.parse(localStorage.getItem('professores_conectados_accounts') || '[]');
      const exists = savedTeachers.some((t: any) => t.email.toLowerCase() === regEmail.trim().toLowerCase());

      if (exists) {
        setErrorMsg('Este e-mail já possui uma conta. Faça login.');
        return;
      }

      const newTeacher: TeacherAccount = {
        id: `prof_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: name.trim(),
        email: regEmail.trim(),
        schoolName: schoolName.trim() || 'Minha Escola',
        createdAt: new Date().toISOString()
      };

      const updatedList = [...savedTeachers, { ...newTeacher, password: regPassword }];
      localStorage.setItem('professores_conectados_accounts', JSON.stringify(updatedList));

      setSuccessMsg('Conta criada com sucesso! Redirecionando...');
      setTimeout(() => {
        onTeacherLogin(newTeacher);
      }, 800);
    } catch (err) {
      setErrorMsg('Erro ao cadastrar conta.');
    }
  };

  const handleAdminPassLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onLogin(adminPass);
    if (!success) {
      setErrorMsg('Senha mestre incorreta.');
      setAdminPass('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row animate-fade-in border border-slate-700/50">
        
        {/* Left Side - Brand */}
        <div className="md:w-5/12 bg-gradient-to-br from-indigo-600 to-violet-800 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute top-10 right-10 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/20">
               <Sparkles size={26} className="text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 leading-tight">
              Professor<br/>Conectado
            </h1>
            <p className="text-indigo-100 text-sm leading-relaxed">
              Plataforma SaaS multi-docente com inteligência artificial para gestão de turmas, provas e notas.
            </p>
          </div>

          <div className="relative z-10 mt-8 pt-6 border-t border-indigo-400/30">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 block mb-1">
                Acesso IndependenteAtivo
              </span>
              <p className="text-xs text-white/90">
                Cada professor possui ambiente isolado com turmas e notas privativas.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-3">
               <img 
                 src={logoUrl || "https://upload.wikimedia.org/wikipedia/commons/8/8c/SENAI_S%C3%A3o_Paulo_logo.png"} 
                 className="h-7 brightness-0 invert opacity-80" 
                 alt="Logo" 
               />
            </div>
          </div>
        </div>

        {/* Right Side - Auth Forms */}
        <div className="md:w-7/12 p-6 sm:p-10 flex flex-col justify-between bg-white">
          <div>
            {/* Nav Tabs */}
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-2xl mb-8">
              <button
                type="button"
                onClick={() => { setMode('LOGIN'); setErrorMsg(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'LOGIN' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <LogIn size={16} /> Entrar
              </button>
              <button
                type="button"
                onClick={() => { setMode('REGISTER'); setErrorMsg(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'REGISTER' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <UserPlus size={16} /> Criar Conta
              </button>
              <button
                type="button"
                onClick={() => { setMode('ADMIN_PASS'); setErrorMsg(null); }}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  mode === 'ADMIN_PASS' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-400 hover:text-gray-700'
                }`}
                title="Senha Mestre"
              >
                <Lock size={14} /> Mestre
              </button>
            </div>

            {errorMsg && (
              <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold animate-pulse flex items-center gap-2">
                <Lock size={16} className="flex-shrink-0 text-red-500"/>
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} className="flex-shrink-0 text-emerald-600"/>
                {successMsg}
              </div>
            )}

            {/* MODE: LOGIN */}
            {mode === 'LOGIN' && (
              <form onSubmit={handleTeacherLogin} className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail size={14} className="text-indigo-600"/> E-mail do Professor
                  </label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    placeholder="seu.email@escola.com"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock size={14} className="text-indigo-600"/> Senha
                  </label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    placeholder="Sua senha secreta"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-base shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 mt-2"
                >
                  Acessar Meu Painel <ArrowRight size={18} />
                </button>
              </form>
            )}

            {/* MODE: REGISTER */}
            {mode === 'REGISTER' && (
              <form onSubmit={handleTeacherRegister} className="space-y-3.5 animate-fade-in">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={14} className="text-indigo-600"/> Nome Completo
                  </label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none text-sm font-medium"
                    placeholder="Prof. Maria Santos"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                    <Building size={14} className="text-indigo-600"/> Escola / Instituição (Opcional)
                  </label>
                  <input 
                    type="text" 
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none text-sm font-medium"
                    placeholder="Escola Municipal Modelo / SENAI"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail size={14} className="text-indigo-600"/> E-mail Comercial
                  </label>
                  <input 
                    type="email" 
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none text-sm font-medium"
                    placeholder="maria.santos@escola.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock size={14} className="text-indigo-600"/> Criar Senha
                  </label>
                  <input 
                    type="password" 
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none text-sm font-medium"
                    placeholder="Mínimo 4 caracteres"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-base shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 mt-2"
                >
                  Criar Minha Conta Profissional <ArrowRight size={18} />
                </button>
              </form>
            )}

            {/* MODE: ADMIN_PASS */}
            {mode === 'ADMIN_PASS' && (
              <form onSubmit={handleAdminPassLogin} className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock size={14} className="text-indigo-600"/> Senha Mestre de Administrador
                  </label>
                  <input 
                    type="password" 
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    placeholder="Digite a senha mestre..."
                    autoFocus
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  Entrar Modo Mestre <ArrowRight size={18} />
                </button>
              </form>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <button 
              type="button"
              onClick={onGoToStudentPortal}
              className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-xl font-bold hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 group text-sm"
            >
               <UserPlus size={18} className="group-hover:scale-110 transition-transform text-indigo-500"/>
               Sou Aluno (Portal Público)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};