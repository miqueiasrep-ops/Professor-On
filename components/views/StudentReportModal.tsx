import React, { useState, useEffect } from 'react';
import { X, Printer, Sparkles, User, FileText, Calendar, ShieldCheck, Mail, Phone, BookOpen, AlertCircle, CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import { Student, CourseUnit } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StudentReportModalProps {
  student: Student;
  onClose: () => void;
}

export const StudentReportModal: React.FC<StudentReportModalProps> = ({ student, onClose }) => {
  const [aiReport, setAiReport] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // 1. Calculate General Statistics
  const courseUnits = student.courseUnits || [];
  const totalUnits = courseUnits.length;

  const overallGradeAverage = totalUnits > 0
    ? courseUnits.reduce((sum, unit) => sum + (unit.averageGrade || 0), 0) / totalUnits
    : 0;

  const totalHoursAccumulated = courseUnits.reduce((sum, unit) => sum + (unit.totalHours || 0), 0);
  const totalAbsencesAccumulated = courseUnits.reduce((sum, unit) => sum + (unit.absences || 0), 0);

  const overallAttendanceRate = totalHoursAccumulated > 0
    ? ((totalHoursAccumulated - totalAbsencesAccumulated) / totalHoursAccumulated) * 100
    : 100;

  // Evaluate Period Status
  // Rule: Fails if attendance on any unit is failed (absences >= 25% of hours)
  // Needs recovery if average grade is < 6.0 on any unit
  let periodStatus: 'approved' | 'recovery' | 'failed_absences' = 'approved';
  
  const hasFailedAbsence = courseUnits.some(unit => {
    if (unit.totalHours === 0) return false;
    return (unit.absences / unit.totalHours) * 100 >= 25;
  });

  const hasFailedGrades = courseUnits.some(unit => (unit.averageGrade || 0) < 6);

  if (hasFailedAbsence) {
    periodStatus = 'failed_absences';
  } else if (hasFailedGrades) {
    periodStatus = 'recovery';
  }

  // Load report from local storage if previously generated
  useEffect(() => {
    const cachedKey = `ai_report_${student.id}`;
    const cached = localStorage.getItem(cachedKey);
    if (cached) {
      setAiReport(cached);
    }
  }, [student.id]);

  // Handle AI Report Generation
  const handleGenerateAIReport = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/students/report-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student: {
            name: student.name,
            classGroup: student.classGroup,
            courseUnits: courseUnits.map(cu => ({
              name: cu.name,
              assessments: cu.assessments || [0, 0, 0, 0],
              averageGrade: cu.averageGrade || 0,
              totalHours: cu.totalHours || 0,
              absences: cu.absences || 0
            }))
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro ao gerar parecer com IA.');
      }

      const data = await response.json();
      if (data.report) {
        setAiReport(data.report);
        localStorage.setItem(`ai_report_${student.id}`, data.report);
      } else {
        throw new Error('Nenhum relatório foi retornado pelo servidor.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha de comunicação com o servidor Gemini.');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const chartData = courseUnits.map(unit => ({
    name: unit.name.length > 15 ? unit.name.substring(0, 15) + '...' : unit.name,
    'Média': parseFloat((unit.averageGrade || 0).toFixed(1)),
    'Frequência (%)': parseFloat((unit.totalHours > 0 ? ((unit.totalHours - unit.absences) / unit.totalHours * 100) : 100).toFixed(0))
  }));

  // Trigger print document representation
  const handlePrint = () => {
    window.print();
  };

  // Helper date function
  const formatDisplayDate = (dateString: string) => {
    const parts = dateString.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateString;
  };

  // Inline custom Markdown renderer
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return (
      <div className="space-y-3 print:space-y-2">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('###')) {
            return (
              <h4 key={idx} className="text-sm font-bold text-slate-800 mt-3 border-b pb-1">
                {trimmed.replace(/^###\s*/, '')}
              </h4>
            );
          }
          if (trimmed.startsWith('##')) {
            return (
              <h3 key={idx} className="text-sm font-bold text-indigo-900 mt-4 border-l-4 border-indigo-600 pl-2">
                {trimmed.replace(/^##\s*/, '')}
              </h3>
            );
          }
          if (trimmed.startsWith('#')) {
            return (
              <h2 key={idx} className="text-base font-bold text-indigo-950 mt-5 border-b-2 border-indigo-100 pb-1">
                {trimmed.replace(/^#\s*/, '')}
              </h2>
            );
          }
          if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
            return <p key={idx} className="text-xs font-bold text-slate-900">{trimmed.replace(/\*\*/g, '')}</p>;
          }
          if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
            const cleanLi = trimmed.replace(/^[-*]\s*/, '');
            return (
              <div key={idx} className="flex gap-2 text-xs text-slate-700 pl-2 leading-relaxed">
                <span className="text-indigo-500 font-bold">•</span>
                <span>{parseInlineStyles(cleanLi)}</span>
              </div>
            );
          }
          if (trimmed === '') {
            return <div key={idx} className="h-1" />;
          }
          return (
            <p key={idx} className="text-xs leading-relaxed text-slate-700 font-normal">
              {parseInlineStyles(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  const parseInlineStyles = (text: string) => {
    if (!text.includes('**')) return text;
    const parts = text.split('**');
    return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold text-slate-900">{part}</strong> : part);
  };

  // Compile Chronological Absences Log across ALL course units
  const allAbsenceLogs = courseUnits.flatMap(unit => 
    (unit.absenceLog || []).map(log => ({
      unitName: unit.name,
      date: log.date,
      hours: log.hours
    }))
  ).sort((a,b) => b.date.localeCompare(a.date)); // Sort latest first

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-0 md:p-6 shadow-2xl transition-all duration-300">
      
      {/* Injecting CSS rules specifically for printing layouts */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Main modal surface container */}
      <div className="w-full max-w-4xl bg-stone-50 md:rounded-2xl shadow-2xl flex flex-col h-full overflow-hidden border border-slate-200">
        
        {/* MODAL CONTROL HEADER (NO PRINT) */}
        <div className="no-print bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base">Relatório Individual Acadêmico</h2>
              <p className="text-xs text-slate-500 font-medium">Histórico acadêmico e parecer pedagógico</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Printer size={15} />
              Imprimir Relatório
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* PRINTABLE BODY PANELS */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 print:p-0 print:bg-white bg-slate-50">
          <div className="print-area bg-white border border-slate-200 print:border-none p-6 md:p-8 rounded-xl print:rounded-none shadow-sm print:shadow-none space-y-6">
            
            {/* 1. DOCUMENT IDENTIFICATION AND LOGO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-slate-200 pb-5 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-indigo-700 tracking-widest uppercase block">SISTEMA INTEGRADO DE ENSINO</span>
                <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">RELATÓRIO DE DESEMPENHO E APROVEITAMENTO</h1>
                <p className="text-[10px] text-slate-500 font-mono">Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
              </div>
              <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 px-4">
                <div className="text-indigo-700 font-extrabold text-xs">PROFESSOR CONECTADO</div>
              </div>
            </div>

            {/* 2. DEMOGRAPHIC INFRASTRUCTURE */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch bg-slate-50/50 print:bg-slate-50 border border-slate-100 rounded-xl p-4">
              {/* Profile image representations */}
              <div className="md:col-span-3 flex md:flex-col items-center justify-center gap-3 md:border-r border-slate-200 md:pr-4">
                <div className="w-16 h-16 rounded-full bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center overflow-hidden font-extrabold text-indigo-700 text-xl shadow-xs">
                  {student.avatar ? (
                    <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={28} />
                  )}
                </div>
                <div className="text-center md:text-left">
                  <span className="block text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Matrícula Ativa</span>
                  <p className="text-[11px] text-slate-500 font-mono">ID: {student.id.substring(0, 8).toUpperCase()}</p>
                </div>
              </div>

              {/* Data descriptors */}
              <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Estudante</span>
                  <p className="font-bold text-slate-800 text-sm">{student.name}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Período / Turma</span>
                  <p className="font-semibold text-slate-700">{student.classGroup}</p>
                </div>
                <div className="space-y-0.5 flex items-center gap-1.5 pt-1">
                  <Mail size={13} className="text-slate-400" />
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase leading-none">E-mail</span>
                    <span className="text-slate-700 font-medium">{student.email || 'Não cadastrado'}</span>
                  </div>
                </div>
                <div className="space-y-0.5 flex items-center gap-1.5 pt-1">
                  <Phone size={13} className="text-slate-400" />
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase leading-none">Contato</span>
                    <span className="text-slate-700 font-medium">{student.contact || 'Não cadastrado'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. PERFORMANCE STATS CARDS GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              {/* Media Card */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col justify-between shadow-xs">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Média Acadêmica</span>
                  <TrendingUp size={14} className="text-indigo-500" />
                </div>
                <div className="mt-2">
                  <span className={`text-2xl font-extrabold ${overallGradeAverage >= 6 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {overallGradeAverage.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Meta: 6.0 pontos</span>
                </div>
              </div>

              {/* Attendance Ratio */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col justify-between shadow-xs">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Frequência Total</span>
                  <ShieldCheck size={14} className="text-indigo-500" />
                </div>
                <div className="mt-2">
                  <span className={`text-2xl font-extrabold ${overallAttendanceRate >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {overallAttendanceRate.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Meta: Mínimo 75%</span>
                </div>
              </div>

              {/* Absences count */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col justify-between shadow-xs">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total de Faltas</span>
                  <AlertCircle size={14} className="text-amber-500" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-extrabold text-slate-800">
                    {totalAbsencesAccumulated}h
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">De {totalHoursAccumulated}h letivos</span>
                </div>
              </div>

              {/* General Recommendation Badge */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col justify-between shadow-xs col-span-2 md:col-span-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Resultado Geral</span>
                <div className="mt-2 flex items-center gap-1.5">
                  {periodStatus === 'approved' && (
                    <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-lg text-xs font-bold inline-flex items-center gap-1">
                      <CheckCircle size={12} /> APTO / APROVADO
                    </span>
                  )}
                  {periodStatus === 'recovery' && (
                    <span className="px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-150 rounded-lg text-xs font-bold inline-flex items-center gap-1">
                      <AlertTriangle size={12} /> EXAME / REFORÇO
                    </span>
                  )}
                  {periodStatus === 'failed_absences' && (
                    <span className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-150 rounded-lg text-xs font-bold inline-flex items-center gap-1">
                      <AlertCircle size={12} /> REPROVADO (FALTAS)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 4. VISUAL PERFORMANCE CHART (HIDDEN IN MINIMALIST OR COMPACT PRINT MODE IF CONVENIENT, BUT SHOWS BEAUTIFULLY) */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs print:break-inside-avoid">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b pb-1.5">Aproveitamento Acadêmico & Frequência por Matéria</span>
              
              {chartData.length > 0 ? (
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 9 }} tickLine={false} stroke="#94a3b8" domain={[0, 100]} />
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                      <Bar dataKey="Média" fill="#6366f1" radius={[4, 4, 0, 0]} name="Média (x10)" maxBarSize={30} />
                      <Bar dataKey="Frequência (%)" fill="#10b981" radius={[4, 4, 0, 0]} name="Presença %" maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">Nenhum dado disponível para gráfico.</p>
              )}
            </div>

            {/* 5. ACADEMIC DETAILS GRID MATRIX (TABLE STYLE) */}
            <div className="space-y-2 print:break-inside-avoid">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Grelha de Notas e Assiduidade por Unidade Curricular</span>
              
              <div className="overflow-hidden border border-slate-200 rounded-xl shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200 text-center">
                      <th className="py-2.5 px-3 text-left w-2/5">Unidade Curricular</th>
                      <th className="py-2.5 px-1">AV1</th>
                      <th className="py-2.5 px-1">AV2</th>
                      <th className="py-2.5 px-1">AV3</th>
                      <th className="py-2.5 px-1">AV4</th>
                      <th className="py-2.5 px-2">Média</th>
                      <th className="py-2.5 px-2">Faltas (h)</th>
                      <th className="py-2.5 px-2">Assiduidade</th>
                      <th className="py-2.5 px-3">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {courseUnits.map((unit, idx) => {
                      const presenceRate = unit.totalHours > 0 
                        ? ((unit.totalHours - unit.absences) / unit.totalHours) * 100 
                        : 100;
                      
                      const unitAbsenceFailed = presenceRate < 75;
                      const unitAverageFailed = unit.averageGrade < 6;

                      let unitStatusText = "Aprovado";
                      let unitStatusColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                      
                      if (unitAbsenceFailed) {
                        unitStatusText = "Rep. Faltas";
                        unitStatusColor = "bg-rose-50 text-rose-700 border-rose-100";
                      } else if (unitAverageFailed) {
                        unitStatusText = "Recuperação";
                        unitStatusColor = "bg-orange-50 text-orange-700 border-orange-100";
                      }

                      const assessments = unit.assessments || [0,0,0,0];

                      return (
                        <tr key={idx} className="hover:bg-slate-50 text-center text-slate-700 font-medium">
                          <td className="py-3 px-3 text-left font-bold text-slate-800 flex items-center gap-1.5">
                            <BookOpen size={12} className="text-slate-400 flex-shrink-0" />
                            <span className="truncate">{unit.name}</span>
                          </td>
                          <td className="py-3 px-1 text-slate-500">{assessments[0] ?? '-'}</td>
                          <td className="py-3 px-1 text-slate-500">{assessments[1] ?? '-'}</td>
                          <td className="py-3 px-1 text-slate-500">{assessments[2] ?? '-'}</td>
                          <td className="py-3 px-1 text-slate-500">{assessments[3] ?? '-'}</td>
                          <td className={`py-3 px-2 font-bold ${unit.averageGrade >= 6 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {unit.averageGrade.toFixed(1)}
                          </td>
                          <td className="py-3 px-2 text-slate-600 font-mono">{unit.absences}h</td>
                          <td className={`py-3 px-2 font-bold ${presenceRate >= 75 ? 'text-slate-700' : 'text-rose-600'}`}>
                            {presenceRate.toFixed(0)}%
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded border text-[10px] font-bold block ${unitStatusColor}`}>
                              {unitStatusText}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 6. CHRONOLOGICAL ABSENCES RECORD */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:break-inside-avoid">
              
              {/* ABSENCE REGISTER LIST */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b pb-1.5">Registro Cronológico de Faltas</span>
                  
                  {allAbsenceLogs.length > 0 ? (
                    <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1.5 mt-2">
                      {allAbsenceLogs.map((log, lIdx) => (
                        <div key={lIdx} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-xs border border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-slate-400" />
                            <span className="font-bold text-slate-800">{formatDisplayDate(log.date)}</span>
                            <span className="text-slate-400 font-normal">| {log.unitName}</span>
                          </div>
                          <span className="bg-amber-100 text-amber-800 font-mono px-1.5 py-0.5 rounded text-[10px] font-extrabold flex-shrink-0">
                            +{log.hours}h falta
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-6 text-center">Nenhum registro de falta lançado para este aluno.</p>
                  )}
                </div>

                <div className="pt-2">
                  <span className="text-[9px] text-slate-400 font-medium block leading-tight">Nota: O limite legal de faltas corresponde a no máximo 25% da carga horária de cada matéria.</span>
                </div>
              </div>

              {/* SIGNATURES AND VERIFIABILITY (FOR DOCUMENT PRINT AUTHENTICITY) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b pb-1.5">Firmas de Verificabilidade</span>
                  <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                    Este documento retrata o aproveitamento escolar do aluno, baseado nos parâmetros fornecidos no Portal do Professor Conectado, sob validação estatística da coordenação acadêmica.
                  </p>
                </div>

                {/* Simulated signature lines when printed */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="text-center">
                    <div className="border-b border-slate-350 h-5 w-full" />
                    <span className="text-[9px] text-slate-500 font-bold block mt-1 uppercase border-t pt-1">Professor Responsável</span>
                  </div>
                  <div className="text-center">
                    <div className="border-b border-slate-350 h-5 w-full animate-pulse-subtle" />
                    <span className="text-[9px] text-slate-500 font-bold block mt-1 uppercase border-t pt-1">Coordenação Pedagógica</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 7. PEDAGOGICAL STATEMENT WITH GEMINI AI DIRECT INTEGRATION */}
            <div className="space-y-3 bg-indigo-50/50 print:bg-white border border-indigo-100 print:border-slate-200 rounded-xl p-5 print:p-4 print:break-inside-avoid">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-indigo-100 pb-2">
                <div className="flex items-center gap-1.5 text-indigo-900">
                  <Sparkles size={16} className="text-indigo-600 animate-pulse" />
                  <span className="text-xs font-extrabold uppercase">Parecer Pedagógico Geral (IA Gemini)</span>
                </div>
                
                {/* AI Controller trigger - ONLY in UI (no print) */}
                <button
                  type="button"
                  onClick={handleGenerateAIReport}
                  disabled={loading}
                  className="no-print inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Sparkles size={12} className={loading ? 'animate-spin' : ''} />
                  {loading ? 'Analisando histórico...' : aiReport ? 'Regerar com IA' : 'Gerar Parecer com IA'}
                </button>
              </div>

              {/* Report content */}
              <div className="min-h-[100px]">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-8 text-indigo-700 space-y-2 animate-pulse">
                    <Sparkles size={24} className="animate-spin text-indigo-600" />
                    <span className="text-xs font-bold">O Coordenador Pedagógico Virtual está analisando as notas e presenças de {student.name.split(' ')[0]}...</span>
                    <span className="text-[10px] text-slate-400 font-normal">Identificando pontos fortes, pontos fracos e planos pedagógicos de intervenção...</span>
                  </div>
                ) : error ? (
                  <div className="flex items-center gap-2 text-rose-700 p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs">
                    <AlertCircle size={14} />
                    <span className="font-semibold">{error}</span>
                  </div>
                ) : aiReport ? (
                  <div className="prose prose-sm max-w-none text-xs leading-relaxed text-slate-700 animate-fade-in pl-1">
                    {renderMarkdown(aiReport)}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2 text-slate-400">
                    <Sparkles size={24} className="mx-auto text-indigo-300" />
                    <p className="font-semibold text-xs">Nenhum parecer emitido ainda.</p>
                    <p className="text-[11px] leading-snug px-6">
                      Clique no botão acima para usar o modelo de Inteligência Acadêmica **Gemini-3.5-flash** e obter uma análise pedagógica qualitativa automatizada para este aluno.
                    </p>
                  </div>
                )}
              </div>

              {/* Disclaimer */}
              {aiReport && !loading && (
                <div className="text-[9px] text-slate-400 pt-2 border-t border-indigo-50 font-medium leading-none flex items-center justify-between">
                  <span>*Análise de apoio gerada dinamicamente via Inteligência Coordenadora Pedagógica.</span>
                  <span className="font-mono">GEMINI API INSIGHTS</span>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
