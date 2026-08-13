
import React, { useState, useEffect } from 'react';
import { GeneratedQuizResponse, ExamType, ArchivedExam } from '../../types';
import { Wand2, CheckCircle, Save, RefreshCw, AlertTriangle, FileText, Download, Loader2, ListChecks, AlignLeft, User, Book, Archive, RotateCcw } from 'lucide-react';

interface ExamCreatorProps {
  onArchiveExam: (exam: ArchivedExam) => void;
  initialExam?: ArchivedExam | null;
  logoUrl?: string;
}

export const ExamCreatorView: React.FC<ExamCreatorProps> = ({ onArchiveExam, initialExam, logoUrl }) => {
  const [topic, setTopic] = useState('');
  const [gradeLevel, setGradeLevel] = useState('Ensino Médio');
  const [questionCount, setQuestionCount] = useState(5);
  const [examType, setExamType] = useState<ExamType>('MULTIPLE_CHOICE');
  
  // Header Info State
  const [courseUnit, setCourseUnit] = useState('');
  const [teacherName, setTeacherName] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [generatedExam, setGeneratedExam] = useState<GeneratedQuizResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [isArchived, setIsArchived] = useState(false);

  // Load initial exam if provided (Visualizar mode)
  useEffect(() => {
    if (initialExam) {
      setGeneratedExam(initialExam);
      setTopic(initialExam.title); // Use title as topic for simplicity in display
      setGradeLevel(initialExam.gradeLevel || 'Ensino Médio');
      setExamType(initialExam.type || 'MULTIPLE_CHOICE');
      setCourseUnit(initialExam.courseUnit || '');
      setTeacherName(initialExam.teacherName || '');
      setIsArchived(true); // Since it comes from archive, it is archived
    } else {
        // Reset if null (explicit navigation to "Create New")
        handleReset();
    }
  }, [initialExam]);

  const handleReset = () => {
    setGeneratedExam(null);
    setTopic('');
    setCourseUnit('');
    setTeacherName('');
    setIsArchived(false);
    setError(null);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setGeneratedExam(null);
    setIsArchived(false);

    try {
      const response = await fetch('/api/gemini/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, gradeLevel, questionCount, type: examType })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao gerar a prova");
      }
      const result = await response.json();
      setGeneratedExam(result);
    } catch (err: any) {
      setError(err.message || "Falha ao gerar a prova. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleArchive = () => {
    if (!generatedExam) return;

    const examToArchive: ArchivedExam = {
      ...generatedExam,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      courseUnit,
      teacherName,
      gradeLevel
    };

    onArchiveExam(examToArchive);
    setIsArchived(true);
  };

  const handleDownload = () => {
    if (!generatedExam) return;
    
    setIsDownloading(true);
    const element = document.getElementById('exam-content');
    
    if (element && typeof html2pdf !== 'undefined') {
      const opt = {
        margin: [10, 15, 10, 15], // top, left, bottom, right (mm)
        filename: `${generatedExam.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(() => setIsDownloading(false))
        .catch((err: any) => {
          console.error("PDF generation failed", err);
          setIsDownloading(false);
          // Fallback to print if library fails
          window.print();
        });
    } else {
      // Fallback
      window.print();
      setIsDownloading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
      {/* Configuration Panel - Hidden on Print */}
      <div className="lg:col-span-1 no-print">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                <Wand2 size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Criador de Provas</h2>
            </div>
            {generatedExam && (
                <button 
                    onClick={handleReset}
                    className="text-gray-400 hover:text-indigo-600 transition-colors"
                    title="Limpar e Criar Nova"
                >
                    <RotateCcw size={20} />
                </button>
            )}
          </div>
          
          <form onSubmit={handleGenerate} className="space-y-5">
            {/* Header Information Section */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cabeçalho da Prova</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Book size={14} /> Unidade Curricular
                </label>
                <input
                  type="text"
                  value={courseUnit}
                  onChange={(e) => setCourseUnit(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 text-sm"
                  placeholder="Ex: História Geral"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <User size={14} /> Nome do Docente
                </label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 text-sm"
                  placeholder="Ex: Prof. Silva"
                />
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Exam Content Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tópico ou Conteúdo
              </label>
              <textarea
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[80px]"
                placeholder="Ex: Revolução Francesa, Fotossíntese..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Prova
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExamType('MULTIPLE_CHOICE')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                    examType === 'MULTIPLE_CHOICE'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ListChecks size={24} className="mb-1" />
                  <span className="text-xs font-medium">Múltipla Escolha</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExamType('OPEN_ENDED')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                    examType === 'OPEN_ENDED'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <AlignLeft size={24} className="mb-1" />
                  <span className="text-xs font-medium">Dissertativa</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nível
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                >
                  <option>Fundamental I</option>
                  <option>Fundamental II</option>
                  <option>Ensino Médio</option>
                  <option>Ensino Superior</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Qtd. Questões
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating || !topic}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="animate-spin" size={20} />
                  Gerando...
                </>
              ) : (
                <>
                  <Wand2 size={20} />
                  Gerar Prova
                </>
              )}
            </button>
          </form>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Preview Panel */}
      <div className="lg:col-span-2">
        {generatedExam ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:border-none">
            {/* Header with actions */}
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center print:hidden">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{generatedExam.title}</h3>
                <p className="text-gray-500 text-sm mt-1">
                  {generatedExam.questions.length} Questões • {gradeLevel} • 
                  {generatedExam.type === 'MULTIPLE_CHOICE' ? ' Múltipla Escolha' : ' Dissertativa'}
                </p>
              </div>
              <div className="flex gap-2">
                 <button 
                  onClick={handleArchive}
                  disabled={isArchived}
                  className={`flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm transition-colors text-sm font-medium ${isArchived ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                   {isArchived ? (
                     <>
                        <CheckCircle size={16} className="text-green-600" />
                        Arquivada
                     </>
                   ) : (
                     <>
                        <Archive size={16} />
                        Arquivar Prova
                     </>
                   )}
                </button>
                <button 
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDownloading ? (
                     <Loader2 size={16} className="animate-spin" />
                  ) : (
                     <Download size={16} />
                  )}
                  {isDownloading ? 'Baixando...' : 'Baixar PDF'}
                </button>
              </div>
            </div>

            {/* Printable Content Area */}
            {/* We conditionally adjust classes based on isDownloading to compact the PDF layout */}
            <div 
              id="exam-content" 
              className={`p-8 bg-white text-black max-w-[210mm] min-h-[297mm] mx-auto ${isDownloading ? 'space-y-4' : 'space-y-8'} print:space-y-4 print:p-0`}
            >
              {/* Printable Header (Visible only in PDF/Print) */}
              <div className={`hidden print:block pb-2 border-b-2 border-gray-800 ${isDownloading ? 'mb-4' : 'mb-8'} print:mb-4`} style={{ display: isDownloading ? 'block' : undefined }}>
                 {/* Top Row: Logo and Title */}
                 <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                        <img src={logoUrl || "https://upload.wikimedia.org/wikipedia/commons/8/8c/SENAI_S%C3%A3o_Paulo_logo.png"} alt="Logo" className="h-10 object-contain mb-1 self-start" />
                        <span className="text-[9px] font-bold text-gray-800 uppercase tracking-tight">Serviço Nacional de Aprendizagem Industrial</span>
                    </div>
                    <div className="text-right mt-1">
                        <h2 className="text-lg font-bold uppercase tracking-wide text-gray-900">Avaliação</h2>
                    </div>
                 </div>
                 
                 {/* Info Grid - Compact for Print */}
                 <div className="border border-black p-2 mb-3">
                    <div className="grid grid-cols-12 gap-y-1 gap-x-2 text-xs font-serif">
                        <div className="col-span-8 flex items-end border-b border-dotted border-gray-400 pb-0.5">
                            <span className="font-bold mr-1 whitespace-nowrap">UC:</span> 
                            <span className="flex-1 px-1">{courseUnit || ''}</span>
                        </div>
                         <div className="col-span-4 flex items-end border-b border-dotted border-gray-400 pb-0.5">
                            <span className="font-bold mr-1">Data:</span> 
                            <span className="flex-1">___/___/____</span>
                        </div>
                        <div className="col-span-12 flex items-end border-b border-dotted border-gray-400 pb-0.5 pt-0.5">
                            <span className="font-bold mr-1">Docente:</span> 
                            <span className="flex-1 px-1">{teacherName || ''}</span>
                        </div>
                        <div className="col-span-12 flex items-end pt-1 pb-0.5">
                             <span className="font-bold mr-1">Aluno(a):</span> 
                             <span className="flex-1 border-b border-dotted border-gray-400"></span>
                        </div>
                    </div>
                 </div>

                 {/* Exam Title */}
                 <div className="text-center">
                    <h1 className="text-xl font-bold text-gray-900">{generatedExam.title}</h1>
                 </div>
              </div>

              {generatedExam.questions.map((q, idx) => (
                <div 
                  key={idx} 
                  className={`rounded-xl border border-gray-200/60 print:border-none print:p-0 break-inside-avoid ${
                    isDownloading ? 'p-0 bg-transparent mb-4' : 'p-6 bg-gray-50 mb-0'
                  }`}
                >
                  <div className="flex gap-3">
                    <span 
                      className={`flex-shrink-0 flex items-center justify-center font-bold print:bg-black print:text-white print:w-5 print:h-5 print:text-[10px] ${
                        isDownloading 
                          ? 'w-5 h-5 bg-black text-white text-[10px] rounded' 
                          : 'w-8 h-8 bg-indigo-600 text-white rounded-full text-sm'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex-1 w-full">
                      <p className={`font-medium text-gray-900 print:text-sm print:mb-1 ${isDownloading ? 'text-sm mb-1' : 'text-lg mb-4'}`}>
                        {q.questionText}
                      </p>
                      
                      {/* RENDER MULTIPLE CHOICE */}
                      {generatedExam.type === 'MULTIPLE_CHOICE' && q.options && (
                        <>
                          <div className={`print:space-y-1 ${isDownloading ? 'space-y-1' : 'space-y-3'}`}>
                            {q.options.map((opt, optIdx) => (
                              <div 
                                key={optIdx} 
                                className={`flex items-center gap-2 transition-colors border-transparent print:p-0 ${
                                  isDownloading ? 'p-0.5' : 'p-3 rounded-lg border'
                                } ${
                                  !isDownloading && optIdx === q.correctOptionIndex 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-white border-gray-200'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 print:border-black ${
                                  !isDownloading && optIdx === q.correctOptionIndex 
                                    ? 'border-green-500 text-green-500' 
                                    : 'border-gray-400'
                                }`}>
                                   {/* Empty circle for print */}
                                </div>
                                <span className={`text-gray-900 print:text-xs ${isDownloading ? 'text-xs' : 'text-base'}`}>
                                  {opt}
                                </span>
                              </div>
                            ))}
                          </div>
                          {!isDownloading && q.explanation && (
                            <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500 print:hidden">
                              <span className="font-semibold text-indigo-600">Explicação:</span> {q.explanation}
                            </div>
                          )}
                        </>
                      )}

                      {/* RENDER OPEN ENDED */}
                      {generatedExam.type === 'OPEN_ENDED' && (
                        <>
                           {/* Lines for student to write - Compact for print */}
                           <div className={`w-full mt-1 border-gray-300 print:space-y-6 ${isDownloading ? 'space-y-6 mb-2' : 'space-y-8 mb-4'}`}>
                              <div className="border-b border-gray-400 w-full h-4"></div>
                              <div className="border-b border-gray-400 w-full h-4"></div>
                              <div className="border-b border-gray-400 w-full h-4"></div>
                           </div>
                           
                           {/* Teacher's key (Hidden on print) */}
                           {!isDownloading && q.expectedAnswer && (
                            <div className="mt-6 pt-4 border-t border-gray-200 text-sm bg-yellow-50 p-4 rounded-lg border-yellow-100 print:hidden">
                              <span className="font-semibold text-yellow-800 block mb-1">Gabarito Sugerido / Critérios:</span> 
                              <span className="text-gray-700">{q.expectedAnswer}</span>
                            </div>
                          )}
                        </>
                      )}

                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 no-print">
            <div className="p-4 bg-white rounded-full mb-4 shadow-sm">
              <FileText size={40} className="text-gray-300" />
            </div>
            <p className="text-lg font-medium">Sua prova aparecerá aqui</p>
            <p className="text-sm mt-2 max-w-xs text-center">Configure o tipo de prova, o tópico e o nível para gerar uma avaliação personalizada.</p>
          </div>
        )}
      </div>
    </div>
  );
};
