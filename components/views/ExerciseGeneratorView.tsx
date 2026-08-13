
import React, { useState } from 'react';
import { GeneratedExerciseResponse, ExerciseType } from '../../types';
import { ListTodo, ListChecks, CheckSquare, AlignLeft, Shuffle, Download, Loader2, Sparkles, Printer, AlertTriangle } from 'lucide-react';

interface ExerciseGeneratorViewProps {
  logoUrl?: string;
}

export const ExerciseGeneratorView: React.FC<ExerciseGeneratorViewProps> = ({ logoUrl }) => {
  const [topic, setTopic] = useState('');
  const [gradeLevel, setGradeLevel] = useState('Ensino Médio');
  const [exerciseCount, setExerciseCount] = useState(10);
  const [exerciseType, setExerciseType] = useState<ExerciseType>('MIXED');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [generatedList, setGeneratedList] = useState<GeneratedExerciseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setGeneratedList(null);

    try {
      const response = await fetch('/api/gemini/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, gradeLevel, count: exerciseCount, type: exerciseType })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao gerar os exercícios");
      }
      const result = await response.json();
      setGeneratedList(result);
    } catch (err: any) {
      setError(err.message || "Falha ao gerar os exercícios. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedList) return;
    
    setIsDownloading(true);
    const element = document.getElementById('exercise-list-content');
    
    if (element && typeof html2pdf !== 'undefined') {
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `exercicios_${generatedList.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(() => setIsDownloading(false))
        .catch((err: any) => {
          console.error("PDF generation failed", err);
          setIsDownloading(false);
          window.print();
        });
    } else {
      window.print();
      setIsDownloading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
      {/* Configuration Panel */}
      <div className="lg:col-span-1 no-print">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
              <ListTodo size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Gerador de Exercícios</h2>
          </div>
          
          <form onSubmit={handleGenerate} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conteúdo / Tópico
              </label>
              <textarea
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                placeholder="Ex: Verbos no Passado, Frações, Capitanias Hereditárias..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Atividade
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExerciseType('MIXED')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                    exerciseType === 'MIXED'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Shuffle size={20} className="mb-1" />
                  <span className="text-[10px] font-bold">Misto</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExerciseType('MULTIPLE_CHOICE')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                    exerciseType === 'MULTIPLE_CHOICE'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ListChecks size={20} className="mb-1" />
                  <span className="text-[10px] font-bold">Múltipla Escolha</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExerciseType('TRUE_FALSE')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                    exerciseType === 'TRUE_FALSE'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <CheckSquare size={20} className="mb-1" />
                  <span className="text-[10px] font-bold">V ou F</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExerciseType('FILL_IN_THE_BLANKS')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                    exerciseType === 'FILL_IN_THE_BLANKS'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <AlignLeft size={20} className="mb-1" />
                  <span className="text-[10px] font-bold">Lacunas</span>
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
                  Quantidade
                </label>
                <input
                  type="number"
                  min="3"
                  max="30"
                  value={exerciseCount}
                  onChange={(e) => setExerciseCount(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating || !topic}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Criando Lista...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Gerar Exercícios
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
        {generatedList ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:border-none">
            {/* Header with actions */}
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center print:hidden">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{generatedList.title}</h3>
                <p className="text-gray-500 text-sm mt-1">
                  {generatedList.exercises.length} Questões • {gradeLevel}
                </p>
              </div>
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

            {/* Content Area */}
            <div id="exercise-list-content" className="p-10 bg-white text-black max-w-[210mm] mx-auto min-h-[297mm]">
              
              {/* Header Document */}
              <div className="mb-8 border-b-2 border-gray-200 pb-4">
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                        <img src={logoUrl || "https://upload.wikimedia.org/wikipedia/commons/8/8c/SENAI_S%C3%A3o_Paulo_logo.png"} alt="Logo" className="h-12 object-contain mb-1 self-start" />
                        <span className="text-[10px] font-bold text-gray-800 uppercase tracking-tight">Serviço Nacional de Aprendizagem Industrial</span>
                    </div>
                    <div className="text-right mt-2">
                        <h2 className="text-xl font-bold uppercase tracking-wide text-gray-800">Lista de Exercícios</h2>
                    </div>
                 </div>
                 
                 <div className="flex flex-wrap gap-4 text-sm text-gray-600 font-medium">
                    <div className="bg-gray-100 px-3 py-1 rounded print:bg-transparent print:p-0">
                       Tópico: {generatedList.topic}
                    </div>
                    <div className="bg-gray-100 px-3 py-1 rounded print:bg-transparent print:p-0">
                       Aluno(a): __________________________________________________
                    </div>
                 </div>
              </div>

              {/* Exercises List */}
              <div className="space-y-6">
                {generatedList.exercises.map((ex, idx) => (
                    <div key={idx} className="break-inside-avoid">
                        <div className="flex gap-3">
                            <span className="font-bold text-indigo-700 print:text-black">{idx + 1}.</span>
                            <div className="flex-1">
                                {ex.type === 'TRUE_FALSE' ? (
                                    <div className="flex items-start gap-4">
                                        <div className="flex gap-2 font-mono text-sm pt-0.5 whitespace-nowrap" dir="ltr">
                                            <span>( ) V</span>
                                            <span>( ) F</span>
                                        </div>
                                        <p className="text-gray-900 leading-relaxed">{ex.statement}</p>
                                    </div>
                                ) : ex.type === 'MULTIPLE_CHOICE' ? (
                                    <div className="space-y-3">
                                        <p className="text-gray-900 leading-relaxed mb-2">{ex.statement}</p>
                                        <div className="grid grid-cols-1 gap-2 ml-2">
                                            {ex.options?.map((opt, oIdx) => (
                                                <div key={oIdx} className="flex items-start gap-2 text-sm text-gray-700">
                                                    <span className="font-bold">{String.fromCharCode(65 + oIdx)})</span>
                                                    <span>{opt}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-900 leading-relaxed">{ex.statement}</p>
                                )}
                                
                                {ex.type === 'OPEN' && (
                                    <div className="mt-2 border-b border-gray-300 h-6 w-full print:block hidden"></div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
              </div>

              {/* Answer Key (Gabarito) */}
              {!isDownloading && (
                  <div className="mt-12 pt-8 border-t-2 border-dashed border-gray-300 print:break-before-page">
                    <h3 className="font-bold text-gray-800 mb-4 uppercase tracking-wider text-sm flex items-center gap-2">
                        <CheckSquare size={16} /> Gabarito (Uso do Professor)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {generatedList.exercises.map((ex, idx) => (
                            <div key={idx} className="text-sm border-b border-gray-100 pb-2">
                                <span className="font-bold text-indigo-600 mr-2">{idx + 1}.</span>
                                <span className="text-gray-700">
                                    {ex.type === 'TRUE_FALSE' 
                                        ? (ex.isTrue ? 'Verdadeiro' : 'Falso') 
                                        : ex.answerKey
                                    }
                                </span>
                            </div>
                        ))}
                    </div>
                  </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 no-print">
            <div className="p-4 bg-white rounded-full mb-4 shadow-sm">
              <ListTodo size={40} className="text-gray-300" />
            </div>
            <p className="text-lg font-medium">Sua lista aparecerá aqui</p>
            <p className="text-sm mt-2 max-w-xs text-center">
              Perfeito para dever de casa, fixação rápida ou atividades em sala de aula.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
