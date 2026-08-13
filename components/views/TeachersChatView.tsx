
import React, { useState, useRef, useEffect } from 'react';
import { Send, MoreVertical, Phone, Video, Search, Smile, Paperclip, CheckCheck, Circle } from 'lucide-react';
import { ChatMessage } from '../../types';

// Image assets
const IMAGES = {
  coordinator: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150",
  user: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150",
  roberto: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=150",
  amanda: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150",
  carlos: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
  marcos: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150"
};

// Types for local state
interface TeacherContact {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'busy' | 'offline';
  image: string;
  unreadCount?: number;
  persona: {
      name: string;
      role: string;
      context: string;
  };
}

// Teacher Data
const TEACHERS: TeacherContact[] = [
  { 
    id: 'flavia', 
    name: "Flávia Ribeiro (Coordenação)", 
    role: "Apoio Pedagógico", 
    status: "online", 
    image: IMAGES.coordinator,
    persona: {
      name: "Flávia Ribeiro",
      role: "Coordenadora Pedagógica",
      context: "Você coordena toda a equipe docente. Ajuda com metodologias, S.A., cronogramas escolares, problemas com alunos e organização de eventos."
    }
  },
  { 
    id: 'roberto', 
    name: "Prof. Roberto", 
    role: "Mecânica e Usinagem", 
    status: "busy", 
    image: IMAGES.roberto,
    unreadCount: 2,
    persona: {
      name: "Roberto",
      role: "Professor de Mecânica",
      context: "Você é um especialista experiente em tornos, fresadoras, CNC e desenho técnico mecânico. É prático, direto e gosta de falar sobre ferramentas e projetos de oficina."
    }
  },
  { 
    id: 'amanda', 
    name: "Prof. Amanda", 
    role: "Elétrica e Automação", 
    status: "online", 
    image: IMAGES.amanda,
    persona: {
      name: "Amanda",
      role: "Professora de Elétrica",
      context: "Você é especialista em circuitos, CLP, Arduino e robótica. Gosta de inovação, IoT e projetos maker. É muito didática e entusiasta de tecnologia."
    }
  },
  { 
    id: 'carlos', 
    name: "Prof. Carlos", 
    role: "Tecnologia da Informação", 
    status: "offline", 
    image: IMAGES.carlos,
    persona: {
      name: "Carlos",
      role: "Professor de T.I.",
      context: "Você ensina programação, redes e banco de dados. Fala sobre bugs, servidores, nuvem e segurança digital. É calmo e analítico."
    }
  },
  { 
    id: 'marcos', 
    name: "Prof. Marcos", 
    role: "Segurança do Trabalho", 
    status: "online", 
    image: IMAGES.marcos,
    persona: {
      name: "Marcos",
      role: "Instrutor de Segurança",
      context: "Você é rigoroso com Normas Regulamentadoras (NRs), EPIs e prevenção de acidentes. Sempre lembra os colegas sobre a segurança nas oficinas."
    }
  },
];

export const TeachersChatView: React.FC = () => {
  const [activeChatId, setActiveChatId] = useState<string>('flavia');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Store separate chat histories for each contact
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({
    'flavia': [{
      id: '1', role: 'model', 
      text: 'Olá! Sou a Flávia. Precisa de ajuda com alguma Situação de Aprendizagem ou alinhamento pedagógico?' 
    }],
    'roberto': [{
      id: '1', role: 'model', 
      text: 'Opa, fala aí! Precisando de algo na oficina de usinagem? As fresadoras estão livres hoje à tarde.' 
    }],
    'amanda': [{
      id: '1', role: 'model', 
      text: 'Oi! Estava testando uns sensores novos aqui. Quer discutir alguma integração para o projeto dos alunos?' 
    }],
    'carlos': [{
      id: '1', role: 'model', 
      text: 'E aí. Se for sobre a rede wi-fi, já abri chamado. Se for sobre código, pode mandar.' 
    }],
    'marcos': [{
      id: '1', role: 'model', 
      text: 'Olá. Lembre-se sempre: Segurança em primeiro lugar. Alguma dúvida sobre as NRs para a próxima aula?' 
    }]
  });

  const activeContact = TEACHERS.find(t => t.id === activeChatId) || TEACHERS[0];
  const currentMessages = chatHistories[activeChatId] || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages, activeChatId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue
    };

    // Update UI immediately with user message
    setChatHistories(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), userMessage]
    }));
    
    setInputValue('');
    setIsLoading(true);

    try {
      // Fetch AI response using the specific persona of the active contact
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.text,
          history: currentMessages,
          persona: activeContact.persona
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Erro no suporte de chat");
      }

      const result = await response.json();
      const replyText = result.text;
      
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: replyText
      };

      // Update UI with bot response
      setChatHistories(prev => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), botMessage]
      }));

    } catch (error) {
      console.error("Chat error", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-6">
      
      {/* Sidebar / Contacts List */}
      <div className="w-80 bg-white rounded-2xl shadow-sm border border-gray-100 hidden lg:flex flex-col overflow-hidden">
         <div className="p-4 bg-gray-50 border-b border-gray-100">
             <h3 className="font-bold text-gray-800 text-lg mb-4">Sala dos Docentes</h3>
             <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                 <input 
                   type="text" 
                   placeholder="Buscar docente..." 
                   className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                 />
             </div>
         </div>
         
         <div className="flex-1 overflow-y-auto p-2">
             <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 py-2">Equipe Técnica</div>
             {TEACHERS.map((teacher) => {
                 const isActive = activeChatId === teacher.id;
                 return (
                     <div 
                        key={teacher.id} 
                        onClick={() => setActiveChatId(teacher.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                            isActive 
                            ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                            : 'bg-white border-transparent hover:bg-gray-50'
                        }`}
                     >
                         <div className="relative">
                             <img 
                                src={teacher.image} 
                                alt={teacher.name}
                                className="w-12 h-12 rounded-full object-cover border border-gray-200"
                             />
                             <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                 teacher.status === 'online' ? 'bg-green-500' : 
                                 teacher.status === 'busy' ? 'bg-red-500' : 'bg-gray-400'
                             }`}></div>
                         </div>
                         <div className="flex-1 min-w-0">
                             <div className="flex justify-between items-baseline mb-0.5">
                                 <h4 className={`font-bold text-sm truncate ${isActive ? 'text-indigo-900' : 'text-gray-800'}`}>
                                    {teacher.name.split(' (')[0]}
                                 </h4>
                                 {teacher.unreadCount && !isActive && (
                                     <span className="flex items-center justify-center w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full">
                                         {teacher.unreadCount}
                                     </span>
                                 )}
                             </div>
                             <p className={`text-xs truncate ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}>
                                 {teacher.role}
                             </p>
                         </div>
                     </div>
                 );
             })}
         </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                  <div className="relative">
                      <img 
                        src={activeContact.image} 
                        alt={activeContact.name} 
                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                      />
                      <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${
                          activeContact.status === 'online' ? 'bg-green-500' : 
                          activeContact.status === 'busy' ? 'bg-red-500' : 'bg-gray-400'
                      }`}></div>
                  </div>
                  <div>
                      <h3 className="font-bold text-gray-800">{activeContact.name}</h3>
                      <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500">
                             {activeContact.status === 'online' ? 'Online agora' : activeContact.status === 'busy' ? 'Ocupado' : 'Visto por último hoje'} • {activeContact.role}
                          </span>
                      </div>
                  </div>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                  <button className="p-2 hover:bg-gray-100 rounded-full"><Phone size={20} /></button>
                  <button className="p-2 hover:bg-gray-100 rounded-full"><Video size={20} /></button>
                  <button className="p-2 hover:bg-gray-100 rounded-full"><MoreVertical size={20} /></button>
              </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f0f2f5] custom-scrollbar">
              {currentMessages.map((msg, index) => (
                  <div key={msg.id || index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                      <div className={`flex max-w-[85%] md:max-w-[70%] gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                          <img 
                            src={msg.role === 'user' ? IMAGES.user : activeContact.image}
                            alt="Avatar"
                            className="w-8 h-8 rounded-full flex-shrink-0 object-cover border border-gray-200 mt-1"
                          />
                          
                          <div className={`p-3.5 rounded-2xl shadow-sm text-sm leading-relaxed ${
                              msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                          }`}>
                              <p className="whitespace-pre-wrap">{msg.text}</p>
                              <div className={`flex items-center justify-end gap-1 mt-1.5 opacity-70 text-[10px] ${msg.role === 'user' ? 'text-indigo-100' : 'text-gray-400'}`}>
                                  <span>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                  {msg.role === 'user' && <CheckCheck size={12} />}
                              </div>
                          </div>
                      </div>
                  </div>
              ))}
              
              {isLoading && (
                  <div className="flex justify-start">
                       <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-2">
                           <img 
                                src={activeContact.image} 
                                className="w-5 h-5 rounded-full" 
                                alt="typing" 
                           />
                           <div className="flex gap-1">
                               <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                               <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                               <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                           </div>
                       </div>
                  </div>
              )}
              <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-100">
              <div className="flex items-end gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all shadow-inner">
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors mb-0.5">
                      <Smile size={20} />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors mb-0.5">
                      <Paperclip size={20} />
                  </button>
                  
                  <textarea 
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                          }
                      }}
                      placeholder={`Enviar mensagem para ${activeContact.name.split(' ')[0]}...`}
                      className="flex-1 bg-transparent border-none focus:ring-0 text-sm max-h-32 min-h-[44px] py-3 resize-none custom-scrollbar placeholder:text-gray-400"
                      rows={1}
                  />

                  <button 
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isLoading}
                      className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-200 mb-0.5 hover:scale-105 active:scale-95"
                  >
                      <Send size={18} />
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};