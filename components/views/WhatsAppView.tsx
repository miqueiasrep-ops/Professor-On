import React, { useState, useEffect } from 'react';
import { Student, Activity } from '../../types';
import { MessageSquare, Send, Users, User, FileText, Check, Copy, ExternalLink, AlertTriangle, Calendar, Award, Phone, Sparkles } from 'lucide-react';

interface WhatsAppViewProps {
  students: Student[];
  activities: Activity[];
}

export const WhatsAppView: React.FC<WhatsAppViewProps> = ({ students, activities }) => {
  const [activeTab, setActiveTab] = useState<'activity' | 'report' | 'notice'>('activity');
  const [copied, setCopied] = useState(false);

  // --- TAB 1: ACTIVITY DISPATCH STATE ---
  const [selectedActivityId, setSelectedActivityId] = useState(activities[0]?.id || '');
  const [activityMessage, setActivityMessage] = useState('');

  // --- TAB 2: STUDENT BULLETIN STATE ---
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [studentContact, setStudentContact] = useState('');
  const [bulletinMessage, setBulletinMessage] = useState('');

  // --- TAB 3: CUSTOM NOTICES STATE ---
  const [noticeTemplate, setNoticeTemplate] = useState<'absence' | 'exam' | 'praise' | 'custom'>('absence');
  const [noticeStudentId, setNoticeStudentId] = useState(students[0]?.id || '');
  const [noticeMateria, setNoticeMateria] = useState('Matemática');
  const [noticeDate, setNoticeDate] = useState(new Date().toISOString().split('T')[0]);
  const [customNoticeText, setCustomNoticeText] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [noticeContact, setNoticeContact] = useState('');

  // Get unique classes
  const uniqueClasses = React.useMemo(() => {
    const classes = new Set(students.map(s => s.classGroup));
    return Array.from(classes).sort();
  }, [students]);

  // Clean phone numbers helper
  const cleanPhoneNumber = (num: string): string => {
    const digits = num.replace(/\D/g, '');
    if (digits.length === 11 && !digits.startsWith('55')) {
      return '55' + digits; // Add Brazil country code
    }
    if (digits.length === 10 && !digits.startsWith('55')) {
      return '55' + digits;
    }
    return digits;
  };

  // --- UPDATE ACTIVITY MESSAGE ---
  useEffect(() => {
    if (!selectedActivityId) {
      setActivityMessage('');
      return;
    }
    const act = activities.find(a => a.id === selectedActivityId);
    if (!act) return;

    const deadlineStr = act.deadline ? new Date(act.deadline).toLocaleDateString('pt-BR') : 'A definir';
    const msg = `📚 *NOVA ATIVIDADE AGENDADA* 📚\n\n` +
                `🏫 *Turma:* ${act.className}\n` +
                `📝 *Título:* ${act.title}\n` +
                `⏰ *Data de Entrega:* ${deadlineStr}\n\n` +
                `💬 *Descrição:* ${act.description}\n\n` +
                `👉 *Como entregar:* Acesse o Portal do Aluno, faça o login e envie seu arquivo antes do prazo!\n\n` +
                `_Gerado por Professor Conectado_`;
    setActivityMessage(msg);
  }, [selectedActivityId, activities]);

  // --- UPDATE BULLETIN MESSAGE ---
  useEffect(() => {
    if (!selectedStudentId) {
      setBulletinMessage('');
      setStudentContact('');
      return;
    }
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    setStudentContact(student.contact || '');

    let materiasStr = '';
    if (Array.isArray(student.courseUnits) && student.courseUnits.length > 0) {
      student.courseUnits.forEach(u => {
        const gradesStr = Array.isArray(u.assessments) ? u.assessments.map(n => n.toFixed(1)).join(' | ') : 'Sem notas';
        materiasStr += `📘 *${u.name}*\n` +
                       `   • Notas (Av1 a Av4): [ ${gradesStr} ]\n` +
                       `   • Média Final: *${u.averageGrade.toFixed(1)}*\n` +
                       `   • Faltas Acumuladas: ${u.absences}h\n\n`;
      });
    } else {
      materiasStr = 'Nenhuma disciplina cadastrada.\n\n';
    }

    const msg = `📊 *BOLETIM ESCOLAR INDIVIDUAL* 📊\n\n` +
                `👤 *Aluno(a):* ${student.name}\n` +
                `🏫 *Turma:* ${student.classGroup}\n\n` +
                `📋 *Desempenho por Disciplina:*\n\n${materiasStr}` +
                `👉 Para qualquer dúvida, entre em contato com a coordenação pedagógica.\n\n` +
                `_Gerado por Professor Conectado_`;
    setBulletinMessage(msg);
  }, [selectedStudentId, students]);

  // --- UPDATE NOTICE MESSAGE ---
  useEffect(() => {
    const student = students.find(s => s.id === noticeStudentId);
    if (!student) return;

    setNoticeContact(student.contact || '');

    const dateFormatted = noticeDate ? new Date(noticeDate + 'T00:00:00').toLocaleDateString('pt-BR') : '';

    let msg = '';
    if (noticeTemplate === 'absence') {
      msg = `⚠️ *AVISO DE FALTA ESCOLAR* ⚠️\n\n` +
            `Prezados responsáveis pelo(a) aluno(a) *${student.name}* (${student.classGroup}),\n\n` +
            `Gostaríamos de notificar que o(a) aluno(a) registrou ausência nas aulas do dia *${dateFormatted}* na disciplina de *${noticeMateria}*.\n\n` +
            `A presença regular é fundamental para o aprendizado e bom desempenho. Caso precise justificar a falta, favor enviar atestado ou entrar em contato.\n\n` +
            `Atenciosamente,\nCoordenação Pedagógica.`;
    } else if (noticeTemplate === 'exam') {
      msg = `📅 *ALERTA DE AVALIAÇÃO* 📅\n\n` +
            `Atenção aluno(a) *${student.name}* e responsáveis,\n\n` +
            `Gostaríamos de lembrar que teremos uma avaliação importante da disciplina *${noticeMateria}* agendada para o dia *${dateFormatted}*.\n\n` +
            `Recomendamos revisar os tópicos passados em sala de aula e se preparar com antecedência. Bons estudos!\n\n` +
            `Atenciosamente,\nProfessor da Disciplina.`;
    } else if (noticeTemplate === 'praise') {
      msg = `🌟 *ELOGIO & DESTAQUE PEDAGÓGICO* 🌟\n\n` +
            `Prezados responsáveis pelo(a) aluno(a) *${student.name}*,\n\n` +
            `É com imensa alegria que gostaríamos de elogiar o excelente desempenho e comportamento exemplar demonstrado pelo(a) aluno(a) recentemente nas aulas de *${noticeMateria}*.\n\n` +
            `Sua dedicação, participação ativa e esforço contínuo merecem destaque! Parabéns pelo empenho!\n\n` +
            `Atenciosamente,\nEquipe Docente.`;
    } else {
      msg = `📝 *COMUNICADO ESCOLAR* 📝\n\n` +
            `Prezado(a) *${student.name}* (e responsáveis),\n\n` +
            `${customNoticeText || 'Insira sua mensagem personalizada aqui...'}\n\n` +
            `Atenciosamente,\nEquipe Escolar.`;
    }
    setNoticeMessage(msg);
  }, [noticeTemplate, noticeStudentId, noticeMateria, noticeDate, customNoticeText, students]);

  // Copy to clipboard helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Open WhatsApp Link Helper
  const handleSendWhatsApp = (text: string, phoneNum?: string) => {
    const encodedText = encodeURIComponent(text);
    let url = `https://api.whatsapp.com/send?text=${encodedText}`;
    
    if (phoneNum) {
      const cleanPhone = cleanPhoneNumber(phoneNum);
      if (cleanPhone) {
        url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
      }
    }
    
    window.open(url, '_blank');
  };

  return (
    <div id="whatsapp-view-root" className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* View Header */}
      <div id="whatsapp-header" className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MessageSquare className="text-emerald-500" size={24} />
            WhatsApp Conectado
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Gere lembretes de atividades, envie boletins detalhados ou envie notificações para alunos e responsáveis no WhatsApp com um clique.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-100">
          <Sparkles size={14} className="animate-pulse" /> Ativo & Sincronizado
        </div>
      </div>

      {/* Tabs Menu */}
      <div id="whatsapp-tabs" className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 py-3 px-6 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
            activeTab === 'activity'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Users size={16} /> Disparar Atividade
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-2 py-3 px-6 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
            activeTab === 'report'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <FileText size={16} /> Boletim do Aluno
        </button>
        <button
          onClick={() => setActiveTab('notice')}
          className={`flex items-center gap-2 py-3 px-6 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
            activeTab === 'notice'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Award size={16} /> Avisos & Modelos
        </button>
      </div>

      {/* Main Grid View */}
      <div id="whatsapp-main-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-800 text-base mb-2">Configurar Disparo</h3>

          {/* TAB 1: ACTIVITY DISPATCH FORM */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Selecione a Atividade</label>
                <select
                  value={selectedActivityId}
                  onChange={(e) => setSelectedActivityId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-700 bg-white"
                >
                  <option value="">-- Selecione uma atividade --</option>
                  {activities.map(act => (
                    <option key={act.id} value={act.id}>{act.title} ({act.className})</option>
                  ))}
                </select>
                {activities.length === 0 && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <AlertTriangle size={12} /> Crie uma atividade na central primeiro.
                  </p>
                )}
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100/50">
                <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                  💡 <strong>Dica:</strong> Esta opção gera um lembrete estruturado com instruções para entrega. Ideal para colar no grupo geral da turma!
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: STUDENT BULLETIN FORM */}
          {activeTab === 'report' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Selecione o Aluno</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-700 bg-white"
                >
                  <option value="">-- Selecione um aluno --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.classGroup})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Número do WhatsApp (Aluno/Responsável)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={studentContact}
                    onChange={(e) => setStudentContact(e.target.value)}
                    placeholder="Ex: (11) 99999-9999"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-700"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">O formato será normalizado automaticamente para wa.me.</p>
              </div>

              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100/50">
                <p className="text-xs text-indigo-800 leading-relaxed font-medium">
                  📊 O boletim traz as notas de todas as quatro avaliações de cada matéria e a média final correspondente.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOM NOTICES FORM */}
          {activeTab === 'notice' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Selecione o Modelo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNoticeTemplate('absence')}
                    className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                      noticeTemplate === 'absence'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-500'
                    }`}
                  >
                    <AlertTriangle size={16} /> Falta Escolar
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoticeTemplate('exam')}
                    className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                      noticeTemplate === 'exam'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-500'
                    }`}
                  >
                    <Calendar size={16} /> Alerta de Prova
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoticeTemplate('praise')}
                    className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                      noticeTemplate === 'praise'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-500'
                    }`}
                  >
                    <Award size={16} /> Elogio/Destaque
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoticeTemplate('custom')}
                    className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                      noticeTemplate === 'custom'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-500'
                    }`}
                  >
                    <MessageSquare size={16} /> Personalizado
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Aluno Destinatário</label>
                <select
                  value={noticeStudentId}
                  onChange={(e) => setNoticeStudentId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-700 bg-white"
                >
                  <option value="">-- Selecione o Aluno --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.classGroup})</option>
                  ))}
                </select>
              </div>

              {noticeTemplate !== 'custom' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Matéria / Disciplina</label>
                    <input
                      type="text"
                      value={noticeMateria}
                      onChange={(e) => setNoticeMateria(e.target.value)}
                      placeholder="Ex: Matemática, História"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Data Relacionada</label>
                    <input
                      type="date"
                      value={noticeDate}
                      onChange={(e) => setNoticeDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-700 bg-white"
                    />
                  </div>
                </>
              )}

              {noticeTemplate === 'custom' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mensagem Personalizada</label>
                  <textarea
                    value={customNoticeText}
                    onChange={(e) => setCustomNoticeText(e.target.value)}
                    placeholder="Digite aqui o texto do seu comunicado..."
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-700 resize-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Contato do WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={noticeContact}
                    onChange={(e) => setNoticeContact(e.target.value)}
                    placeholder="Ex: (11) 99999-9999"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-700"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Live Preview & Direct Actions */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-slate-900 rounded-3xl p-6 flex-1 flex flex-col text-white shadow-xl min-h-[400px]">
            {/* WhatsApp Chat UI Header */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4 flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                PC
              </div>
              <div>
                <p className="font-bold text-sm">Professor Conectado</p>
                <p className="text-[10px] text-emerald-400">● Assistente de Envio</p>
              </div>
            </div>

            {/* Chat Body Bubble */}
            <div className="flex-1 overflow-y-auto mb-6 flex flex-col justify-end">
              <div className="bg-emerald-800/90 text-white rounded-2xl rounded-tr-none p-5 max-w-[90%] self-end shadow-md border border-emerald-700/50">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed outline-none">
                  {activeTab === 'activity' ? activityMessage || 'Nenhuma atividade selecionada.' : 
                   activeTab === 'report' ? bulletinMessage || 'Nenhum aluno selecionado.' : 
                   noticeMessage || 'Preencha o modelo para gerar a pré-visualização.'}
                </pre>
                <div className="text-right text-[10px] opacity-60 mt-2">
                  {new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})} ✓✓
                </div>
              </div>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 border-t border-slate-800 pt-4 flex-shrink-0">
              <button
                type="button"
                onClick={() => handleCopy(activeTab === 'activity' ? activityMessage : activeTab === 'report' ? bulletinMessage : noticeMessage)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm transition-all border border-slate-700/50"
              >
                {copied ? <Check className="text-emerald-400" size={16} /> : <Copy size={16} />}
                {copied ? 'Copiado!' : 'Copiar Texto'}
              </button>

              <button
                type="button"
                onClick={() => handleSendWhatsApp(
                  activeTab === 'activity' ? activityMessage : activeTab === 'report' ? bulletinMessage : noticeMessage,
                  activeTab === 'activity' ? undefined : activeTab === 'report' ? studentContact : noticeContact
                )}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-950/50"
              >
                <Send size={16} />
                {activeTab === 'activity' ? 'Compartilhar no Grupo' : 'Enviar via WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
