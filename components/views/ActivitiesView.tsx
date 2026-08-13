
import React, { useState, useRef } from 'react';
import { FolderUp, UploadCloud, File, Download, CheckCircle, Clock, Trash2, Plus, Paperclip, User, FileText, Mail, X, Search, Send, AlertTriangle, Save, Copy } from 'lucide-react';
import { Activity, Submission, Student } from '../../types';
import { formatDateBR } from '../utils/dateUtils';

interface ActivitiesViewProps {
  activities: Activity[];
  submissions: Submission[];
  students: Student[];
  onAddActivity: (activity: Activity) => void;
  onDeleteActivity: (id: string) => void;
}

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({ activities, submissions, students, onAddActivity, onDeleteActivity }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [className, setClassName] = useState('');
  const [deadline, setDeadline] = useState('');
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [isReadingFile, setIsReadingFile] = useState(false);

  // Email Sharing State
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedActivityForShare, setSelectedActivityForShare] = useState<Activity | null>(null);
  const [studentSearch, setStudentSearch] = useState('');

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Limit file size to 10MB (safe with IndexedDB)
      if (file.size > 10 * 1024 * 1024) {
          alert("O arquivo é muito grande (Máx: 10MB). Por favor, escolha um arquivo menor.");
          e.target.value = ''; // Reset input
          return;
      }

      setSelectedFile(file);
      setIsReadingFile(true);

      // Convert to Base64
      const reader = new FileReader();
      reader.onload = (event) => {
          if (event.target?.result) {
              setFileBase64(event.target.result as string);
              setIsReadingFile(false);
          }
      };
      reader.onerror = () => {
          alert("Erro ao ler o arquivo.");
          setIsReadingFile(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !className) return;
    if (isReadingFile) {
        alert("Aguarde o processamento do arquivo...");
        return;
    }

    const newActivity: Activity = {
      id: Date.now().toString(),
      title,
      description,
      className,
      deadline,
      fileName: selectedFile ? selectedFile.name : undefined,
      fileSize: selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : undefined,
      fileData: selectedFile ? fileBase64 : undefined,
      fileType: selectedFile ? selectedFile.type : undefined,
      createdAt: new Date().toLocaleDateString()
    };

    onAddActivity(newActivity);

    // Reset Form
    setTitle('');
    setDescription('');
    setClassName('');
    setDeadline('');
    setSelectedFile(null);
    setFileBase64('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadArchivedFile = (data: string | undefined, fileName: string | undefined) => {
      if (!data || !fileName) return;

      const link = document.createElement('a');
      link.href = data;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleDownloadFile = async (id: string, type: 'activity' | 'submission', fileName: string, localData?: string) => {
    if (localData) {
      downloadArchivedFile(localData, fileName);
      return;
    }
    setDownloadingId(id);
    try {
      const endpoint = type === 'activity' ? `/api/activities/${id}/file` : `/api/submissions/${id}/file`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data.fileData) {
          downloadArchivedFile(data.fileData, fileName);
        } else {
          alert("Arquivo não encontrado no servidor.");
        }
      } else {
        alert("Erro ao baixar o arquivo do servidor.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro de conexão ao baixar o arquivo.");
    } finally {
      setDownloadingId(null);
    }
  };

  const openShareModal = (activity: Activity) => {
    setSelectedActivityForShare(activity);
    setShowShareModal(true);
    setStudentSearch('');
  };

  const sendEmail = (student: Student) => {
    if (!selectedActivityForShare) return;

    if (!student.email) {
        alert("Este aluno não possui e-mail cadastrado.");
        return;
    }

    const subject = encodeURIComponent(`Nova Atividade: ${selectedActivityForShare.title}`);
    
    let bodyText = `Olá ${student.name},\n\nUma nova atividade foi postada para você.\n\n`;
    bodyText += `Título: ${selectedActivityForShare.title}\n`;
    bodyText += `Entrega: ${formatDateBR(selectedActivityForShare.deadline)}\n\n`;
    bodyText += `Descrição:\n${selectedActivityForShare.description}\n\n`;
    
    if (selectedActivityForShare.fileName) {
        bodyText += `[⚠️ ANEXAR ARQUIVO: ${selectedActivityForShare.fileName}]\n\n`;
        bodyText += `Estou enviando o arquivo "${selectedActivityForShare.fileName}" em anexo para você realizar a atividade.\n\n`;
    }

    bodyText += `Bons estudos!`;

    const body = encodeURIComponent(bodyText);
    
    const mailtoLink = `mailto:${student.email}?subject=${subject}&body=${body}`;
    
    window.location.href = mailtoLink;
  };

  const copyEmailTemplate = () => {
    if (!selectedActivityForShare) return;
    
    let text = `Assunto: Nova Atividade: ${selectedActivityForShare.title}\n\n`;
    text += `Olá Aluno,\n\nUma nova atividade foi postada.\n\n`;
    text += `Título: ${selectedActivityForShare.title}\n`;
    text += `Entrega: ${formatDateBR(selectedActivityForShare.deadline)}\n`;
    text += `Descrição: ${selectedActivityForShare.description}\n\n`;
    
    if (selectedActivityForShare.fileName) {
        text += `(Anexar arquivo: ${selectedActivityForShare.fileName})`;
    }

    navigator.clipboard.writeText(text);
    alert("Modelo copiado! Agora cole no seu e-mail.");
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.classGroup.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                <FolderUp size={28} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Central de Atividades</h2>
                <p className="text-gray-500">Envie materiais e receba as entregas dos alunos em um só lugar.</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Create Activity */}
        <div className="lg:col-span-1 flex flex-col gap-6">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                 <Plus size={20} className="text-indigo-600" />
                 Nova Atividade
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Título</label>
                    <input 
                      type="text" 
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      placeholder="Ex: Trabalho de História"
                    />
                 </div>

                 <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Turma</label>
                    <input 
                      type="text" 
                      required
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      placeholder="Ex: 9º Ano B"
                    />
                 </div>

                 <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Data de Entrega</label>
                    <input 
                      type="date" 
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                 </div>

                 <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição</label>
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm h-24 resize-none"
                      placeholder="Instruções para o aluno..."
                    />
                 </div>

                 {/* File Upload Area */}
                 <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Anexar Arquivo (Max 10MB)</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors group ${selectedFile ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:bg-gray-50 hover:border-indigo-400'}`}
                    >
                       <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          onChange={handleFileChange} 
                       />
                       {selectedFile ? (
                          <div className="flex flex-col items-center gap-1 text-indigo-600">
                             <CheckCircle size={24} />
                             <span className="text-sm font-medium truncate max-w-[200px] text-center">{selectedFile.name}</span>
                             <span className="text-xs text-gray-500">Pronto para arquivar</span>
                          </div>
                       ) : (
                          <>
                            <UploadCloud size={32} className="text-gray-300 group-hover:text-indigo-400 mb-2 transition-colors" />
                            <p className="text-xs text-gray-500 text-center">Clique para anexar arquivo</p>
                          </>
                       )}
                    </div>
                 </div>

                 <button 
                    type="submit" 
                    disabled={isReadingFile}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    <Save size={18} />
                    Salvar e Arquivar
                 </button>
              </form>
           </div>
        </div>

        {/* Right Column: Activity Feed & Submissions */}
        <div className="lg:col-span-2 space-y-6 overflow-y-auto">
            
            {/* Sent Activities */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <h3 className="font-bold text-lg text-gray-800 mb-4">Atividades Arquivadas</h3>
               {activities.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                     <p>Nenhuma atividade criada.</p>
                  </div>
               ) : (
                  <div className="space-y-3">
                     {activities.map(activity => (
                        <div key={activity.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-start gap-4 group hover:border-indigo-200 transition-all">
                           <div className="flex items-start gap-4 flex-1">
                              <div className="p-3 bg-white rounded-lg border border-gray-200 text-indigo-500 flex-shrink-0">
                                 {activity.fileName ? <File size={24} /> : <FileText size={24} />}
                              </div>
                              <div>
                                 <h4 className="font-bold text-gray-800">{activity.title}</h4>
                                 <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1">
                                    <span className="bg-white px-2 py-0.5 rounded border border-gray-200">{activity.className}</span>
                                    {activity.deadline && (
                                       <span className="flex items-center gap-1 bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100">
                                          <Clock size={10} /> Entrega: {formatDateBR(activity.deadline)}
                                       </span>
                                    )}
                                 </div>
                                 {activity.fileName && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <Paperclip size={12} /> {activity.fileName} ({activity.fileSize})
                                        </div>
                                        <button 
                                            onClick={() => handleDownloadFile(activity.id, 'activity', activity.fileName!, activity.fileData)}
                                            disabled={downloadingId === activity.id}
                                            className="flex items-center gap-1 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded hover:bg-green-200 transition-colors disabled:opacity-50"
                                        >
                                            <Download size={10} /> {downloadingId === activity.id ? 'Baixando...' : 'Baixar'}
                                        </button>
                                    </div>
                                 )}
                              </div>
                           </div>
                           
                           <div className="flex gap-2 self-end sm:self-start">
                              <button 
                                 onClick={() => openShareModal(activity)}
                                 className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                 title="Enviar via E-mail"
                              >
                                 <Mail size={14} />
                                 <span className="hidden sm:inline">Enviar</span>
                              </button>
                              <button 
                                 onClick={() => onDeleteActivity(activity.id)}
                                 className="text-gray-400 hover:text-red-500 p-1.5 transition-colors border border-transparent hover:border-red-100 rounded-lg"
                                 title="Excluir Atividade"
                              >
                                 <Trash2 size={18} />
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>

            {/* Received Submissions (Inbox) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-gray-800">Entregas dos Alunos</h3>
                  <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                     {submissions.length} arquivos
                  </span>
               </div>
               
               {submissions.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl">
                     <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                        <Download size={32} />
                     </div>
                     <p className="text-gray-400 font-medium">Nenhum arquivo recebido.</p>
                     <p className="text-xs text-gray-300 mt-1">Os uploads dos alunos aparecerão aqui.</p>
                  </div>
               ) : (
                  <div className="space-y-3">
                     {submissions.map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                 {sub.studentName.charAt(0)}
                              </div>
                              <div>
                                 <p className="font-bold text-gray-800 text-sm">{sub.studentName}</p>
                                 <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <File size={10} /> {sub.fileName} • {sub.submittedAt}
                                 </p>
                              </div>
                           </div>
                           
                           <div className="flex gap-2">
                              {sub.fileName && (
                                <button 
                                    onClick={() => handleDownloadFile(sub.id, 'submission', sub.fileName, sub.fileData)}
                                    disabled={downloadingId === sub.id}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                                >
                                    <Download size={14} /> {downloadingId === sub.id ? 'Baixando...' : 'Baixar'}
                                </button>
                              )}
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>

        </div>
      </div>

      {/* EMAIL SHARE MODAL */}
      {showShareModal && selectedActivityForShare && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-fade-in overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                 <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                    <Mail size={22} className="text-blue-600"/>
                    Enviar por E-mail
                 </h3>
                 <p className="text-xs text-gray-500 mt-1 truncate max-w-[250px]">{selectedActivityForShare.title}</p>
              </div>
              <button onClick={() => setShowShareModal(false)} className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-100">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text" 
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Buscar aluno..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            {selectedActivityForShare.fileName && (
                <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-100 text-yellow-800 text-xs flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <div>
                        <strong>Lembrete:</strong> Ao abrir o seu gerenciador de e-mail, não esqueça de anexar manualmente o arquivo <u>{selectedActivityForShare.fileName}</u>.
                        <br/>
                        <span className="opacity-75">Dica: Baixe o arquivo da lista arquivada se não tiver o original.</span>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-2">
                {filteredStudents.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <User size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhum aluno encontrado.</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {filteredStudents.map(student => (
                            <div key={student.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                                        <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-gray-800">{student.name}</p>
                                        <p className="text-xs text-gray-500">{student.email || 'Sem e-mail'}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => sendEmail(student)}
                                    disabled={!student.email}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all hover:-translate-y-0.5 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
                                >
                                    Enviar <Send size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-center flex justify-between items-center">
                <p className="text-xs text-gray-500">O sistema abrirá seu aplicativo de e-mail.</p>
                <button 
                  onClick={copyEmailTemplate} 
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                   <Copy size={12} /> Copiar Modelo
                </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
