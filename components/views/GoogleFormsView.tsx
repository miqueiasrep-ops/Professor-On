import React, { useState } from 'react';
import { FileQuestion, ExternalLink, Copy, CheckCircle, Sparkles, Link, Save } from 'lucide-react';
import QRCode from 'react-qr-code';

interface GoogleFormsViewProps {
  customRegistrationLink: string;
  onUpdateCustomLink: (link: string) => void;
}

export const GoogleFormsView: React.FC<GoogleFormsViewProps> = ({ 
  customRegistrationLink, 
  onUpdateCustomLink 
}) => {
  const [linkInput, setLinkInput] = useState(customRegistrationLink);
  const [showSavedMsg, setShowSavedMsg] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync state if prop changes
  React.useEffect(() => {
    setLinkInput(customRegistrationLink);
  }, [customRegistrationLink]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCustomLink(linkInput);
    setShowSavedMsg(true);
    setTimeout(() => setShowSavedMsg(false), 3000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(customRegistrationLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-xl text-purple-600">
                <FileQuestion size={28} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Formulários e Inscrição</h2>
                <p className="text-gray-500">Configure o link de inscrição dos alunos e crie provas digitais.</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Action Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden flex flex-col justify-between">
              <div className="p-8 relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 opacity-10 rounded-bl-full -mr-8 -mt-8"></div>
                  
                  <div className="flex items-center gap-3 mb-4">
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Google_Forms_2020_Logo.svg/1489px-Google_Forms_2020_Logo.svg.png" 
                        alt="Google Forms Logo" 
                        className="w-10 h-10 object-contain drop-shadow-sm"
                      />
                      <h3 className="text-xl font-bold text-gray-800">Criar Novo Formulário</h3>
                  </div>
                  
                  <p className="text-gray-600 mb-6 leading-relaxed text-sm">
                      Acesse a ferramenta oficial do Google para criar provas digitais, enquetes de inscrição ou coletar respostas automaticamente em sua planilha.
                  </p>
                  
                  <a 
                    href="https://docs.google.com/forms/u/0/create" 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg shadow-purple-100 hover:-translate-y-0.5 transition-all w-fit text-sm"
                  >
                      Criar novo no Google Forms
                      <ExternalLink size={16} />
                  </a>
              </div>

              {/* Dynamic Registration Link Manager */}
              <div className="p-8 border-t border-gray-100 bg-gray-50/50">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-2 text-base">
                      <Link size={18} className="text-purple-600" />
                      Vincular Link de Inscrição Oficial
                  </h3>
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                     Cole abaixo o link do formulário que você criou para inscrições/chamada. Ele será gravado no sistema e sincronizado em todos os painéis.
                  </p>

                  <form onSubmit={handleSave} className="space-y-3">
                      <div className="relative">
                          <input 
                              type="text"
                              value={linkInput}
                              onChange={(e) => setLinkInput(e.target.value)}
                              placeholder="Ex: https://forms.gle/exemplo ou outra URL"
                              className="w-full p-3 pr-12 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-sm shadow-inner"
                          />
                          {customRegistrationLink && (
                              <button
                                  type="button"
                                  onClick={handleCopy}
                                  className="absolute right-3 top-2.5 p-1 text-gray-400 hover:text-purple-600 transition-colors"
                                  title="Copiar link registrado"
                              >
                                  {copied ? <CheckCircle size={18} className="text-green-500 animate-bounce" /> : <Copy size={18} />}
                              </button>
                          )}
                      </div>

                      <div className="flex gap-2 items-center">
                          <button
                              type="submit"
                              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer"
                          >
                              <Save size={16} />
                              Salvar no Sistema
                          </button>
                          {showSavedMsg && (
                              <span className="text-xs text-green-600 font-bold flex items-center gap-1 animate-fade-in pl-2">
                                  <CheckCircle size={14} /> Link registrado e enviado ao sistema!
                              </span>
                          )}
                      </div>
                  </form>

                  {customRegistrationLink && (
                      <div className="mt-5 p-4 bg-white border border-gray-200 rounded-xl flex items-center gap-5 shadow-sm">
                          <div className="p-2 border border-gray-100 rounded-lg bg-white flex-shrink-0 shadow-sm">
                              <QRCode value={customRegistrationLink} size={65} />
                          </div>
                          <div className="flex-1">
                              <h4 className="font-bold text-gray-800 text-xs uppercase text-purple-600 tracking-wider">QR Code de Inscrição</h4>
                              <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">Os alunos podem escanear este código na tela ou na folha impressa para se inscreverem automaticamente.</p>
                              <a 
                                  href={customRegistrationLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-bold mt-1 bg-indigo-50 px-2 py-0.5 rounded-full"
                              >
                                  Testar Inscrição <ExternalLink size={10} />
                              </a>
                          </div>
                      </div>
                  )}
              </div>
          </div>

          {/* Tips Card */}
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Sparkles size={18} className="text-indigo-500" />
                      Dica de Produtividade
                  </h3>
                  
                  <div className="space-y-4">
                      <div className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">1</div>
                          <div>
                              <p className="font-medium text-gray-800 text-sm">Gere a prova aqui</p>
                              <p className="text-xs text-gray-500 mt-0.5">Use o menu "Criar Provas" para gerar questões com a Inteligência Artificial.</p>
                          </div>
                      </div>
                      
                      <div className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">2</div>
                          <div>
                              <p className="font-medium text-gray-800 text-sm">Copie o conteúdo</p>
                              <p className="text-xs text-gray-500 mt-0.5">Selecione o texto da prova gerada e copie (Ctrl+C).</p>
                          </div>
                      </div>
                      
                      <div className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">3</div>
                          <div>
                              <p className="font-medium text-gray-800 text-sm">Cole no Forms e Vincule</p>
                              <p className="text-xs text-gray-500 mt-0.5">Abra um novo formulário, cole as perguntas e depois vincule o link dele no painel ao lado.</p>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                  <h4 className="font-bold text-indigo-900 mb-2 text-sm">Por que usar Google Forms vinculado?</h4>
                  <ul className="space-y-2 text-xs text-indigo-800">
                      <li className="flex items-center gap-2">
                          <CheckCircle size={15} className="text-indigo-500 flex-shrink-0" /> Correção automática e notas instantâneas
                      </li>
                      <li className="flex items-center gap-2">
                          <CheckCircle size={15} className="text-indigo-500 flex-shrink-0" /> Gráficos de análise de faltas e acertos
                      </li>
                      <li className="flex items-center gap-2">
                          <CheckCircle size={15} className="text-indigo-500 flex-shrink-0" /> Facilidade para enviar para toda a turma por e-mail ou WhatsApp
                      </li>
                  </ul>
              </div>
          </div>
      </div>
    </div>
  );
};
