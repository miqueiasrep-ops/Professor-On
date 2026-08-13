import React, { useState } from 'react';
import { LessonPlan } from '../../types';
import { BookOpenCheck, Download, Loader2, Sparkles, Clock, Target, Box, AlertTriangle, Printer } from 'lucide-react';

interface LessonPlanViewProps {
  logoUrl?: string;
}

export const LessonPlanView: React.FC<LessonPlanViewProps> = ({ logoUrl }) => {
  const [topic, setTopic] = useState('');
  const [gradeLevel, setGradeLevel] = useState('Ensino Médio');
  const [duration, setDuration] = useState('50 minutos');
  const [specifics, setSpecifics] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<LessonPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setGeneratedPlan(null);

    try {
      const response = await fetch('/api/gemini/lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, gradeLevel, duration, specifics })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao gerar o plano de aula");
      }
      const result = await response.json();
      setGeneratedPlan(result);
    } catch (err: any) {
      setError(err.message || "Falha ao gerar o plano de aula. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedPlan) return;
    
    setIsDownloading(true);
    const element = document.getElementById('lesson-plan-content');
    
    if (element && typeof html2pdf !== 'undefined') {
      const opt = {
        margin: [15, 15, 15, 15],
        filename: `plano_aula_${generatedPlan.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
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
              <BookOpenCheck size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Plano de Aula AI</h2>
          </div>
          
          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tema da Aula
              </label>
              <input
                required
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ex: Ciclo da Água, Verbo To Be, Leis de Newton..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nível Escolar
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option>Educação Infantil</option>
                <option>Fundamental I (1º ao 5º ano)</option>
                <option>Fundamental II (6º ao 9º ano)</option>
                <option>Ensino Médio</option>
                <option>Ensino Superior</option>
                <option>Educação de Jovens e Adultos (EJA)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duração Estimada
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option>30 minutos</option>
                <option>45 minutos</option>
                <option>50 minutos (Aula padrão)</option>
                <option>90 minutos (Aula dupla)</option>
                <option>2 horas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Objetivos Específicos / Observações
              </label>
              <textarea
                value={specifics}
                onChange={(e) => setSpecifics(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                placeholder="Ex: Focar em atividades práticas, incluir uso de tecnologia, adaptar para alunos com dificuldade..."
              />
            </div>

            <button
              type="submit"
              disabled={isGenerating || !topic}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Planejando...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Gerar Plano
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
        {generatedPlan ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:border-none">
            {/* Header with actions */}
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center print:hidden">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Plano Gerado</h3>
                <p className="text-gray-500 text-sm mt-1">
                  Revise o conteúdo antes de imprimir.
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
            <div id="lesson-plan-content" className="p-10 bg-white text-black max-w-[210mm] mx-auto">
              {/* Header Document */}
              <div className="mb-8 border-b-2 border-indigo-900 pb-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col">
                      <img src={logoUrl || "https://upload.wikimedia.org/wikipedia/commons/8/8c/SENAI_S%C3%A3o_Paulo_logo.png"} alt="Logo" className="h-16 object-contain mb-1 self-start" />
                      <span className="text-[10px] font-bold text-gray-800 uppercase tracking-tight">Serviço Nacional de Aprendizagem Industrial</span>
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{generatedPlan.title}</h1>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full print:bg-transparent print:p-0">
                        <span className="font-semibold">Tema:</span> {generatedPlan.topic}
                    </div>
                    <div className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full print:bg-transparent print:p-0">
                        <span className="font-semibold">Nível:</span> {generatedPlan.gradeLevel}
                    </div>
                    <div className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full print:bg-transparent print:p-0">
                        <Clock size={14} className="print:hidden" />
                        <span className="font-semibold">Duração:</span> {generatedPlan.duration}
                    </div>
                </div>
              </div>

              {/* Grid Layout */}
              <div className="space-y-8">
                
                {/* Objectives */}
                <section>
                    <div className="flex items-center gap-2 mb-3 text-indigo-800 print:text-black">
                        <Target size={20} className="print:hidden" />
                        <h2 className="text-lg font-bold uppercase tracking-wider">Objetivos de Aprendizagem</h2>
                    </div>
                    <ul className="list-disc pl-5 space-y-2 text-gray-800">
                        {generatedPlan.objectives.map((obj, idx) => (
                            <li key={idx} className="leading-relaxed">{obj}</li>
                        ))}
                    </ul>
                </section>

                {/* Materials */}
                <section>
                    <div className="flex items-center gap-2 mb-3 text-indigo-800 print:text-black">
                        <Box size={20} className="print:hidden" />
                        <h2 className="text-lg font-bold uppercase tracking-wider">Recursos e Materiais</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {generatedPlan.materials.map((mat, idx) => (
                            <span key={idx} className="bg-gray-50 border border-gray-200 px-3 py-1 rounded-md text-gray-700 text-sm print:border-black print:bg-transparent">
                                {mat}
                            </span>
                        ))}
                    </div>
                </section>

                {/* Activities Timeline */}
                <section>
                    <div className="flex items-center gap-2 mb-4 text-indigo-800 print:text-black">
                        <Clock size={20} className="print:hidden" />
                        <h2 className="text-lg font-bold uppercase tracking-wider">Cronograma e Metodologia</h2>
                    </div>
                    
                    <div className="border-l-2 border-indigo-100 pl-6 space-y-6 print:border-l-2 print:border-gray-300">
                        {generatedPlan.activities.map((act, idx) => (
                            <div key={idx} className="relative">
                                <span className="absolute -left-[31px] top-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold ring-4 ring-white print:bg-black print:ring-0">
                                    {idx + 1}
                                </span>
                                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-1">
                                    <h3 className="font-bold text-gray-900">{act.description}</h3>
                                    <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded print:text-black print:bg-transparent print:border print:border-black">
                                        {act.time}
                                    </span>
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed text-justify">
                                    {act.methodology}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Assessment */}
                <section className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 print:bg-gray-50 print:border-gray-300">
                    <h2 className="text-lg font-bold text-indigo-900 mb-2 print:text-black">Avaliação</h2>
                    <p className="text-gray-800 leading-relaxed">
                        {generatedPlan.assessment}
                    </p>
                </section>

              </div>
              
              {/* Footer for print */}
              <div className="hidden print:block mt-12 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
                  Gerado por Professor Conectado • {new Date().toLocaleDateString()}
              </div>

            </div>
          </div>
        ) : (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 no-print">
            <div className="p-4 bg-white rounded-full mb-4 shadow-sm">
              <BookOpenCheck size={40} className="text-gray-300" />
            </div>
            <p className="text-lg font-medium">Seu plano de aula aparecerá aqui</p>
            <p className="text-sm mt-2 max-w-xs text-center">Defina o tema, duração e nível escolar para gerar um roteiro completo.</p>
          </div>
        )}
      </div>
    </div>
  );
};