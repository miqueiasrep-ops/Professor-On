import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Student } from '../../types';
import { Search, Plus, TrendingUp, Users, Pencil, Check, X, Mail, Send, BookPlus, Trash2, BookOpen, AlertOctagon, AlertTriangle, CheckCircle2, Calendar, CalendarDays, Clock, RefreshCw, Filter, Layers, FileText, MessageCircle } from 'lucide-react';
import { StudentReportModal } from './StudentReportModal';

interface GradebookProps {
  students: Student[];
  onUpdateStudent: (student: Student) => void;
  onBulkUpdateStudents: (students: Student[]) => void;
  onAddStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onDeleteClassGroup?: (className: string, deleteStudents: boolean) => void;
}

const UNIT_COLORS = [
  { name: 'Blue',     bg: 'bg-blue-50',     border: 'border-blue-200',     borderLeft: 'border-l-blue-600',     text: 'text-blue-800',     iconBg: 'bg-blue-100',     iconColor: 'text-blue-600' },
  { name: 'Orange',   bg: 'bg-orange-50',   border: 'border-orange-200',   borderLeft: 'border-l-orange-600',   text: 'text-orange-800',   iconBg: 'bg-orange-100',   iconColor: 'text-orange-600' },
  { name: 'Emerald',  bg: 'bg-emerald-50',  border: 'border-emerald-200',  borderLeft: 'border-l-emerald-600',  text: 'text-emerald-800',  iconBg: 'bg-emerald-100',  iconColor: 'text-emerald-600' },
  { name: 'Purple',   bg: 'bg-purple-50',   border: 'border-purple-200',   borderLeft: 'border-l-purple-600',   text: 'text-purple-800',   iconBg: 'bg-purple-100',   iconColor: 'text-purple-600' },
  { name: 'Pink',     bg: 'bg-pink-50',     border: 'border-pink-200',     borderLeft: 'border-l-pink-600',     text: 'text-pink-800',     iconBg: 'bg-pink-100',     iconColor: 'text-pink-600' },
  { name: 'Red',      bg: 'bg-red-50',      border: 'border-red-200',      borderLeft: 'border-l-red-600',      text: 'text-red-800',      iconBg: 'bg-red-100',      iconColor: 'text-red-600' },
];

const getUnitStyle = (unitName: string) => {
  if (!unitName) return UNIT_COLORS[0];
  let hash = 0;
  for (let i = 0; i < unitName.length; i++) {
    hash = unitName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % UNIT_COLORS.length;
  return UNIT_COLORS[index];
};

export const GradebookView: React.FC<GradebookProps> = ({ students, onUpdateStudent, onBulkUpdateStudents, onAddStudent, onDeleteStudent, onDeleteClassGroup }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);

  // Delete Class Group State
  const [showDeleteClassModal, setShowDeleteClassModal] = useState(false);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);
  const [deleteClassOption, setDeleteClassOption] = useState<'delete_all' | 'keep_students'>('delete_all');
  const [showManageClassesModal, setShowManageClassesModal] = useState(false);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Student | null>(null);

  // Delete Confirm State
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Add Unit State (Single)
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [selectedStudentForUnit, setSelectedStudentForUnit] = useState<Student | null>(null);
  const [newUnitNameInput, setNewUnitNameInput] = useState('');

  // Add Unit State (Batch)
  const [showBatchAddUnitModal, setShowBatchAddUnitModal] = useState(false);
  const [batchUnitName, setBatchUnitName] = useState('');
  const [batchUnitHours, setBatchUnitHours] = useState(80);

  // Manage Absences State
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [activeUnitIndex, setActiveUnitIndex] = useState<number | null>(null);
  const [absenceDateInput, setAbsenceDateInput] = useState(() => {
    const local = new Date();
    local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
    return local.toISOString().slice(0, 10);
  });
  const [absenceHoursInput, setAbsenceHoursInput] = useState<number>(2); // Default 2 hours
  const [isEditingAbsence, setIsEditingAbsence] = useState(false); // To show Update button

  // Add Student State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [classOption, setClassOption] = useState(() => {
    const classes = Array.from(new Set(students.map(s => s.classGroup))).sort();
    return classes[0] || '9º Ano A';
  });
  const [customClass, setCustomClass] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentContact, setNewStudentContact] = useState('');
  const [addStudentMode, setAddStudentMode] = useState<'single' | 'bulk'>('single');
  const [bulkInput, setBulkInput] = useState('');
  const [bulkClassOption, setBulkClassOption] = useState(() => {
    const classes = Array.from(new Set(students.map(s => s.classGroup))).sort();
    return classes[0] || '9º Ano A';
  });
  const [bulkCustomClass, setBulkCustomClass] = useState('');
  
  // WhatsApp Mass Communication State
  const [showBulkWhatsAppModal, setShowBulkWhatsAppModal] = useState(false);
  const [bulkWhatsAppClass, setBulkWhatsAppClass] = useState<string>('all');
  const [bulkWhatsAppTemplate, setBulkWhatsAppTemplate] = useState(
    'Olá! Sou o professor(a) e gostaria de compartilhar o informativo sobre o desempenho escolar de {nome_aluno} na turma {turma}.\n\n{boletim_resumo}\n\nPor favor, se tiver dúvidas ou precisar de esclarecimentos, entre em contato.'
  );
  const [whatsappSentList, setWhatsappSentList] = useState<Record<string, boolean>>({});
  
  // Extract unique classes for the filter dropdown
  const uniqueClasses = useMemo(() => {
    const classes = new Set(students.map(s => s.classGroup));
    return Array.from(classes).sort();
  }, [students]);

  const handleConfirmDeleteClass = () => {
    if (!classToDelete) return;
    const isDeleteAll = deleteClassOption === 'delete_all';

    if (onDeleteClassGroup) {
      onDeleteClassGroup(classToDelete, isDeleteAll);
    } else {
      if (isDeleteAll) {
        const studentsInClass = students.filter(s => s.classGroup.trim().toLowerCase() === classToDelete.trim().toLowerCase());
        studentsInClass.forEach(s => onDeleteStudent(s.id));
      } else {
        const updated = students
          .filter(s => s.classGroup.trim().toLowerCase() === classToDelete.trim().toLowerCase())
          .map(s => ({ ...s, classGroup: 'Sem Turma' }));
        onBulkUpdateStudents(updated);
      }
    }

    if (selectedClass === classToDelete) {
      setSelectedClass('all');
    }
    setShowDeleteClassModal(false);
    setClassToDelete(null);
  };

  // Filter students based on search AND selected class
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = selectedClass === 'all' || s.classGroup === selectedClass;
      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, selectedClass]);

  // Calculate averages based on FILTERED students (so chart reflects the class)
  const calculateAverageGrade = (student: Student) => {
    if (student.courseUnits.length === 0) return 0;
    const sum = student.courseUnits.reduce((acc, unit) => acc + unit.averageGrade, 0);
    return sum / student.courseUnits.length;
  };

  const averageGradeOverall = filteredStudents.length 
    ? filteredStudents.reduce((acc, curr) => acc + calculateAverageGrade(curr), 0) / filteredStudents.length 
    : 0;

  const chartData = [
    { name: selectedClass === 'all' ? 'Média Geral' : `Média ${selectedClass}`, value: parseFloat(averageGradeOverall.toFixed(1)) },
  ];

  const handleEditClick = (student: Student) => {
    setEditingId(student.id);
    setEditForm(JSON.parse(JSON.stringify(student))); // Deep copy
  };

  const handleCancelClick = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSaveClick = () => {
    if (editForm) {
      onUpdateStudent(editForm);
      setEditingId(null);
      setEditForm(null);
    }
  };

  // Open the Delete Confirmation Modal
  const requestDelete = (student: Student) => {
      setStudentToDelete(student);
  };

  // Confirm Delete Action
  const confirmDelete = () => {
      if (studentToDelete) {
          onDeleteStudent(studentToDelete.id);
          setStudentToDelete(null);
      }
  };

  const handleSendWelcomeEmail = (student: Student) => {
    if (!student.email) {
        alert("Este aluno não tem e-mail cadastrado.");
        return;
    }
    const subject = encodeURIComponent("Bem-vindo ao Professor Conectado");
    const body = encodeURIComponent(`Olá ${student.name},\n\nSeja bem-vindo(a) à turma ${student.classGroup}.\n\nSeu cadastro foi realizado com sucesso. Aguarde as próximas atividades.\n\nAtenciosamente,\nProfessor Conectado`);
    window.location.href = `mailto:${student.email}?subject=${subject}&body=${body}`;
  };

  const handleSaveNewStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const finalClass = classOption === 'NEW_CLASS' ? customClass.trim() : classOption;

    const newStudent: Student = {
      id: Date.now().toString(),
      name: newStudentName,
      classGroup: finalClass || 'Sem Turma',
      email: newStudentEmail || '',
      contact: newStudentContact || 'Não informado',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newStudentName.replace(' ', '')}`,
      courseUnits: [],
      attendanceRecords: []
    };

    onAddStudent(newStudent);
    setNewStudentName('');
    setClassOption(uniqueClasses[0] || '9º Ano A');
    setCustomClass('');
    setNewStudentEmail('');
    setNewStudentContact('');
    setShowAddModal(false);
  };

  const openAddUnitModal = (student: Student) => {
      setSelectedStudentForUnit(student);
      setNewUnitNameInput('');
      setShowAddUnitModal(true);
  };

  const saveNewUnit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedStudentForUnit || !newUnitNameInput.trim()) return;

      const updatedStudent = {
          ...selectedStudentForUnit,
          courseUnits: [
              ...selectedStudentForUnit.courseUnits,
              { 
                name: newUnitNameInput, 
                assessmentCount: 4, 
                assessments: [0, 0, 0, 0],
                averageGrade: 0, 
                totalHours: 80, // Default 80h
                absences: 0,
                absenceLog: []
              }
          ]
      };

      onUpdateStudent(updatedStudent);
      setShowAddUnitModal(false);
      setSelectedStudentForUnit(null);
      setNewUnitNameInput('');
  };

  const handleBatchSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchUnitName.trim() || selectedClass === 'all') return;

    // Get all students from the selected class
    const studentsInClass = students.filter(s => s.classGroup === selectedClass);
    
    // Create new array with updated units
    const updatedStudents = studentsInClass.map(student => ({
      ...student,
      courseUnits: [
        ...student.courseUnits,
        {
          name: batchUnitName,
          assessmentCount: 4,
          assessments: [0, 0, 0, 0],
          averageGrade: 0,
          totalHours: Number(batchUnitHours) || 80,
          absences: 0,
          absenceLog: []
        }
      ]
    }));

    onBulkUpdateStudents(updatedStudents);
    setShowBatchAddUnitModal(false);
    setBatchUnitName('');
    setBatchUnitHours(80);
    alert(`Matéria "${batchUnitName}" adicionada para ${updatedStudents.length} alunos da turma ${selectedClass}.`);
  };

  const handleRemoveUnit = (index: number) => {
      if (!editForm) return;
      const newUnits = [...editForm.courseUnits];
      newUnits.splice(index, 1);
      setEditForm({ ...editForm, courseUnits: newUnits });
  };

  const handleUnitChange = (index: number, field: keyof Student['courseUnits'][0], value: string) => {
      if (!editForm) return;
      const newUnits = [...editForm.courseUnits];
      
      if (field === 'name') {
          newUnits[index].name = value;
      } else if (field === 'totalHours') {
          // For numeric fields (grades, hours, count)
          newUnits[index][field] = Number(value) as never;
      }
      
      setEditForm({ ...editForm, courseUnits: newUnits });
  };

  // New handler for individual assessment grades
  const handleGradeChange = (unitIndex: number, assessmentIndex: number, value: string) => {
      if (!editForm) return;
      const newUnits = [...editForm.courseUnits];
      const newAssessments = [...(newUnits[unitIndex].assessments || [0,0,0,0])];
      
      let numValue = Number(value);
      if (numValue < 0) numValue = 0;
      if (numValue > 10) numValue = 10;
      
      newAssessments[assessmentIndex] = numValue;
      
      newUnits[unitIndex].assessments = newAssessments;
      
      // Auto-calculate average
      const sum = newAssessments.reduce((a, b) => a + b, 0);
      newUnits[unitIndex].averageGrade = sum / 4;
      
      setEditForm({ ...editForm, courseUnits: newUnits });
  };

  const openAbsenceModal = (index: number) => {
    setActiveUnitIndex(index);
    // Reset date to today
    const local = new Date();
    local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
    const today = local.toISOString().slice(0, 10);
    
    setAbsenceDateInput(today);
    
    // Check if today already has absences
    if (editForm && editForm.courseUnits[index].absenceLog) {
        const existing = editForm.courseUnits[index].absenceLog.find(l => l.date === today);
        if (existing) {
            setAbsenceHoursInput(existing.hours);
            setIsEditingAbsence(true);
        } else {
            setAbsenceHoursInput(2);
            setIsEditingAbsence(false);
        }
    } else {
        setAbsenceHoursInput(2);
        setIsEditingAbsence(false);
    }
    
    setShowAbsenceModal(true);
  };

  const handleAbsenceDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = e.target.value;
      setAbsenceDateInput(newDate);

      if (editForm && activeUnitIndex !== null) {
          const unit = editForm.courseUnits[activeUnitIndex];
          const existingEntry = unit.absenceLog?.find(l => l.date === newDate);
          
          if (existingEntry) {
              setAbsenceHoursInput(existingEntry.hours);
              setIsEditingAbsence(true);
          } else {
              setAbsenceHoursInput(2); // Default
              setIsEditingAbsence(false);
          }
      }
  };

  const addAbsenceToUnit = () => {
    if (!editForm || activeUnitIndex === null || !absenceDateInput) return;

    // Create a deep copy of courseUnits to ensure React detects state change
    const newUnits = editForm.courseUnits.map((u, i) => {
        if (i !== activeUnitIndex) return u;

        // Clone unit and log
        const updatedUnit = { ...u };
        const newLog = updatedUnit.absenceLog ? [...updatedUnit.absenceLog] : [];

        const existingIndex = newLog.findIndex(l => l.date === absenceDateInput);
        const hoursToSet = Number(absenceHoursInput);

        if (existingIndex >= 0) {
            // Update Existing (Correction)
            newLog[existingIndex] = { ...newLog[existingIndex], hours: hoursToSet };
        } else {
            // Add new
            newLog.push({ date: absenceDateInput, hours: hoursToSet });
        }
        
        // Sort dates desc
        newLog.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // Update total absences (sum of hours) explicitly casting to Number to avoid string concat
        updatedUnit.absenceLog = newLog;
        updatedUnit.absences = newLog.reduce((acc, curr) => acc + Number(curr.hours), 0);

        return updatedUnit;
    });
        
    setEditForm({ ...editForm, courseUnits: newUnits });
    setIsEditingAbsence(true); // After save, it becomes an edit state for that date
  };

  const removeAbsenceFromUnit = (indexToRemove: number) => {
     if (editForm && activeUnitIndex !== null) {
        const newUnits = editForm.courseUnits.map((u, i) => {
            if (i !== activeUnitIndex) return u;

            const updatedUnit = { ...u };
            if (updatedUnit.absenceLog) {
                const newLog = [...updatedUnit.absenceLog];
                const removedDate = newLog[indexToRemove].date;
                
                newLog.splice(indexToRemove, 1);
                
                updatedUnit.absenceLog = newLog;
                updatedUnit.absences = newLog.reduce((acc, curr) => acc + Number(curr.hours), 0);

                // If deleted currently selected date, reset form
                if (removedDate === absenceDateInput) {
                    setAbsenceHoursInput(2);
                    setIsEditingAbsence(false);
                }
            }
            return updatedUnit;
        });

        setEditForm({ ...editForm, courseUnits: newUnits });
        // Force state update check if current selected date was deleted
        const unit = newUnits[activeUnitIndex];
        const stillExists = unit.absenceLog?.some(l => l.date === absenceDateInput);
        if (!stillExists) {
             setIsEditingAbsence(false);
             setAbsenceHoursInput(2);
        }
     }
  };

  const calculateAbsenceStatus = (absences: number, totalHours: number) => {
    if (totalHours === 0) return { pct: 0, status: 'regular' };
    const pct = (absences / totalHours) * 100;
    
    if (pct >= 25) return { pct, status: 'failed' };
    if (pct >= 20) return { pct, status: 'warning' };
    return { pct, status: 'regular' };
  };

  const formatDisplayDate = (dateString: string) => {
      const parts = dateString.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return dateString;
  };

  const getCleanPhoneNumber = (contact: string) => {
    const clean = contact.replace(/\D/g, '');
    if (!clean) return '';
    if (clean.startsWith('55')) return clean;
    return '55' + clean;
  };

  const getWhatsAppPersonalizedLink = (student: Student, template: string) => {
    const cleanPhone = getCleanPhoneNumber(student.contact);
    if (!cleanPhone) return '';
    
    let msg = template;
    msg = msg.replace(/{nome_aluno}/g, student.name);
    msg = msg.replace(/{turma}/g, student.classGroup);
    msg = msg.replace(/{email}/g, student.email || 'Não informado');
    
    let summary = '';
    if (student.courseUnits.length === 0) {
      summary = 'Nenhuma unidade curricular cadastrada no momento.';
    } else {
      summary = 'Resumo de Desempenho:\n' + student.courseUnits.map(unit => {
        const avg = unit.averageGrade.toFixed(1);
        const abs = unit.absences;
        return `• ${unit.name}: Média ${avg} | ${abs}h faltas`;
      }).join('\n');
    }
    msg = msg.replace(/{boletim_resumo}/g, summary);
    
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Diário de Classe</h2>
          <p className="text-gray-500 text-sm">Gerenciamento de notas e faltas por unidade curricular</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Class Filter */}
          <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-48">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Filter size={16} />
                </div>
                <select 
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none cursor-pointer"
                >
                    <option value="all">Todas as Turmas</option>
                    {uniqueClasses.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                </select>
              </div>
              
              {/* Batch Add Unit Button - Only visible when a class is selected */}
              {selectedClass !== 'all' && (
                  <button 
                    onClick={() => setShowBatchAddUnitModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm text-sm font-bold whitespace-nowrap"
                    title={`Adicionar matéria para todos de ${selectedClass}`}
                  >
                     <Layers size={16} />
                     <span className="hidden sm:inline">Add à Turma</span>
                  </button>
              )}

              {/* Delete Class Button - Only visible when a specific class is selected */}
              {selectedClass !== 'all' && (
                  <button 
                    onClick={() => {
                      setClassToDelete(selectedClass);
                      setShowDeleteClassModal(true);
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg transition-colors shadow-sm text-sm font-bold whitespace-nowrap"
                    title={`Excluir a turma ${selectedClass}`}
                  >
                     <Trash2 size={16} />
                     <span className="hidden sm:inline">Excluir Turma</span>
                  </button>
              )}

              {/* Manage Classes Button - Visible when 'all' is selected */}
              {selectedClass === 'all' && uniqueClasses.length > 0 && (
                  <button 
                    onClick={() => setShowManageClassesModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-sm text-sm font-bold whitespace-nowrap"
                    title="Gerenciar e Excluir Turmas"
                  >
                     <Users size={16} />
                     <span className="hidden sm:inline">Gerenciar Turmas</span>
                  </button>
              )}
          </div>

          <div className="relative flex-1 sm:w-64 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar aluno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <button 
             onClick={() => {
               setBulkWhatsAppClass(selectedClass);
               setShowBulkWhatsAppModal(true);
             }}
             className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm font-bold whitespace-nowrap"
             title="Comunicação em Massa via WhatsApp"
          >
            <MessageCircle size={18} />
            <span className="inline">WhatsApp em Massa</span>
          </button>
          <button 
             onClick={() => setShowAddModal(true)}
             className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span className="inline">Adicionar</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
            {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                    const isEditing = editingId === student.id;
                    const displayStudent = isEditing && editForm ? editForm : student;

                    return (
                        <div key={student.id} className={`bg-white rounded-xl shadow-sm border transition-all ${isEditing ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-100 hover:border-indigo-200'}`}>
                            {/* Header Row */}
                            <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-gray-50 gap-4">
                                <div className="flex items-center gap-3 w-full max-w-2xl">
                                    <img src={displayStudent.avatar} alt={displayStudent.name} className="w-10 h-10 flex-shrink-0 rounded-full bg-gray-200 object-cover" />
                                    {isEditing ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                                            <div>
                                                <label className="block text-[9px] font-bold text-gray-450 uppercase mb-0.5">Nome do Aluno</label>
                                                <input 
                                                    type="text" 
                                                    value={editForm?.name || ''} 
                                                    onChange={(e) => setEditForm(prev => prev ? { ...prev, name: e.target.value } : null)} 
                                                    className="w-full p-1 px-2 border border-indigo-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                                                    placeholder="Nome"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-bold text-gray-450 uppercase mb-0.5">Turma</label>
                                                <input 
                                                    type="text" 
                                                    list="edit-class-options"
                                                    value={editForm?.classGroup || ''} 
                                                    onChange={(e) => setEditForm(prev => prev ? { ...prev, classGroup: e.target.value } : null)} 
                                                    className="w-full p-1 px-2 border border-indigo-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 bg-white"
                                                    placeholder="Turma"
                                                />
                                                <datalist id="edit-class-options">
                                                    {uniqueClasses.map(cls => (
                                                        <option key={cls} value={cls} />
                                                    ))}
                                                </datalist>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-bold text-gray-450 uppercase mb-0.5">E-mail</label>
                                                <input 
                                                    type="email" 
                                                    value={editForm?.email || ''} 
                                                    onChange={(e) => setEditForm(prev => prev ? { ...prev, email: e.target.value } : null)} 
                                                    className="w-full p-1 px-2 border border-indigo-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                                                    placeholder="E-mail"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-bold text-gray-455 uppercase mb-0.5">Contato</label>
                                                <input 
                                                    type="text" 
                                                    value={editForm?.contact || ''} 
                                                    onChange={(e) => setEditForm(prev => prev ? { ...prev, contact: e.target.value } : null)} 
                                                    className="w-full p-1 px-2 border border-indigo-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                                                    placeholder="Telefone"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="min-w-0">
                                            <span className="font-bold text-gray-800 block text-sm sm:text-base truncate">{displayStudent.name}</span>
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                                                <span className="bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold text-gray-600">
                                                    <Users size={10} />
                                                    {displayStudent.classGroup}
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1"><Mail size={10}/> {displayStudent.email || 'Sem e-mail'}</span>
                                                {displayStudent.contact && displayStudent.contact !== 'Não informado' && (
                                                    <>
                                                        <span>•</span>
                                                        <a 
                                                            href={`https://wa.me/${displayStudent.contact.replace(/\D/g, '').startsWith('55') ? displayStudent.contact.replace(/\D/g, '') : '55' + displayStudent.contact.replace(/\D/g, '')}`}
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-green-600 hover:text-green-700 font-mono text-[11px] flex items-center gap-1 hover:underline"
                                                            title="Iniciar conversa no WhatsApp"
                                                        >
                                                            <MessageCircle size={12} className="text-green-500 fill-green-50" />
                                                            {displayStudent.contact}
                                                        </a>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-6 flex-shrink-0 self-end md:self-auto">
                                    {isEditing ? (
                                        <div className="flex items-center gap-2">
                                            <button onClick={handleSaveClick} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200" title="Salvar Alterações"><Check size={18} /></button>
                                            <button onClick={handleCancelClick} className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200" title="Cancelar"><X size={18} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => setSelectedStudentForReport(student)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Relatório Pessoal (IA)"><FileText size={18} /></button>
                                            <button onClick={() => openAddUnitModal(student)} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg" title="Adicionar Matéria"><BookPlus size={18} /></button>
                                            {student.contact && student.contact !== 'Não informado' && (
                                                <a 
                                                    href={`https://wa.me/${student.contact.replace(/\D/g, '').startsWith('55') ? student.contact.replace(/\D/g, '') : '55' + student.contact.replace(/\D/g, '')}`}
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg flex items-center justify-center" 
                                                    title="Enviar WhatsApp Particular"
                                                >
                                                    <MessageCircle size={18} />
                                                </a>
                                            )}
                                            <button onClick={() => handleSendWelcomeEmail(student)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Enviar E-mail"><Send size={18} /></button>
                                            <button onClick={() => handleEditClick(student)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Editar"><Pencil size={18} /></button>
                                            <button 
                                                onClick={() => requestDelete(student)} 
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" 
                                                title="Excluir Cadastro"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Detailed Units */}
                            <div className="p-4 bg-gray-50/30 overflow-x-auto">
                                {displayStudent.courseUnits.length === 0 && !isEditing ? (
                                    <div className="text-center py-4 text-gray-400 text-sm">Nenhuma unidade curricular cadastrada.</div>
                                ) : (
                                    <div className="space-y-3 min-w-[600px]">
                                        {(displayStudent.courseUnits.length > 0 || isEditing) && (
                                            <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-gray-400 uppercase px-2 mb-1 tracking-wider text-center">
                                                <div className="col-span-3 text-left">Unidade</div>
                                                <div className="col-span-4 grid grid-cols-4 gap-1">
                                                    <span>Av 1</span>
                                                    <span>Av 2</span>
                                                    <span>Av 3</span>
                                                    <span>Av 4</span>
                                                </div>
                                                <div className="col-span-1">Média</div>
                                                <div className="col-span-2">Faltas</div>
                                                <div className="col-span-2">Status</div>
                                            </div>
                                        )}

                                        {displayStudent.courseUnits.map((unit, idx) => {
                                            const styles = getUnitStyle(unit.name);
                                            const { pct, status } = calculateAbsenceStatus(unit.absences, unit.totalHours);
                                            // Ensure assessments exist for rendering
                                            const assessments = unit.assessments || [0,0,0,0];

                                            return (
                                              <div key={idx} className={`grid grid-cols-12 gap-2 items-center px-3 py-3 rounded-lg border shadow-sm transition-all ${styles.bg} ${styles.border} ${styles.borderLeft}`}>
                                                  {/* Unit Name */}
                                                  <div className="col-span-3">
                                                      {isEditing ? (
                                                          <div className="space-y-1">
                                                            <input type="text" value={unit.name} onChange={(e) => handleUnitChange(idx, 'name', e.target.value)} className="w-full p-1 border rounded text-xs outline-none" />
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[9px] uppercase font-bold text-gray-500">C.H:</span>
                                                                <input type="number" value={unit.totalHours} onChange={(e) => handleUnitChange(idx, 'totalHours', e.target.value)} className="w-12 p-0.5 border rounded text-[10px] text-center outline-none" placeholder="h" />
                                                            </div>
                                                          </div>
                                                      ) : (
                                                          <div className="flex flex-col">
                                                              <div className="flex items-center gap-2 mb-1">
                                                                <div className={`p-1 rounded ${styles.iconBg} ${styles.iconColor}`}><BookOpen size={12} /></div>
                                                                <span className={`text-sm font-bold ${styles.text} truncate`}>{unit.name}</span>
                                                              </div>
                                                              <span className="text-[10px] text-gray-500 font-medium ml-1">C.H: {unit.totalHours}h</span>
                                                          </div>
                                                      )}
                                                  </div>

                                                  {/* 4 Assessments Input/Display */}
                                                  <div className="col-span-4 grid grid-cols-4 gap-1">
                                                      {[0, 1, 2, 3].map((aIdx) => (
                                                          <div key={aIdx}>
                                                              {isEditing ? (
                                                                  <input 
                                                                    type="number" 
                                                                    step="0.1" 
                                                                    min="0" 
                                                                    max="10"
                                                                    value={assessments[aIdx] || 0}
                                                                    onChange={(e) => handleGradeChange(idx, aIdx, e.target.value)}
                                                                    className="w-full p-1 border rounded text-xs text-center outline-none focus:ring-1 focus:ring-indigo-500"
                                                                  />
                                                              ) : (
                                                                  <div className="bg-white/50 border border-gray-100 rounded text-center py-1">
                                                                     <span className="text-xs font-semibold text-gray-600">{assessments[aIdx] ?? '-'}</span>
                                                                  </div>
                                                              )}
                                                          </div>
                                                      ))}
                                                  </div>

                                                  {/* Média */}
                                                  <div className="col-span-1 text-center">
                                                      <div className="flex items-center justify-center h-full">
                                                          <span className={`text-sm font-bold ${unit.averageGrade >= 6 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {unit.averageGrade.toFixed(1)}
                                                          </span>
                                                      </div>
                                                  </div>

                                                  {/* Faltas + History Button */}
                                                  <div className="col-span-2 flex items-center justify-center gap-1">
                                                      <span className="text-xs font-bold text-gray-700">{unit.absences}h</span>
                                                      {isEditing && (
                                                          <button 
                                                            onClick={() => openAbsenceModal(idx)}
                                                            className="p-1 bg-white border border-gray-300 rounded text-gray-500 hover:text-indigo-600 hover:border-indigo-500 transition-colors"
                                                            title="Lançar Horas de Falta"
                                                          >
                                                              <Calendar size={12} />
                                                          </button>
                                                      )}
                                                  </div>

                                                  {/* Status Faltas */}
                                                  <div className="col-span-2 flex items-center justify-center gap-2">
                                                       {!isEditing && (
                                                           <div className={`flex items-center gap-1 px-1.5 py-1 rounded-full border w-full justify-center ${
                                                               status === 'failed' ? 'bg-red-100 text-red-700 border-red-200' : 
                                                               status === 'warning' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 
                                                               'bg-green-100 text-green-700 border-green-200'
                                                           }`}>
                                                               {status === 'failed' && <AlertOctagon size={10} />}
                                                               {status === 'warning' && <AlertTriangle size={10} />}
                                                               {status === 'regular' && <CheckCircle2 size={10} />}
                                                               <span className="text-[9px] font-bold">{pct.toFixed(0)}%</span>
                                                           </div>
                                                       )}
                                                       
                                                       {isEditing && (
                                                          <button 
                                                            onClick={() => handleRemoveUnit(idx)}
                                                            type="button" 
                                                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                            title="Remover Matéria"
                                                          >
                                                            <Trash2 size={14} />
                                                          </button>
                                                       )}
                                                  </div>
                                              </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="bg-white p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                    <Users size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="font-medium">Nenhum aluno encontrado.</p>
                    <p className="text-sm mt-1">Verifique o filtro de turma ou a busca.</p>
                </div>
            )}
        </div>

        {/* Analytics Panel */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-fit sticky top-6">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-6"><TrendingUp size={20} className="text-purple-600"/> Desempenho {selectedClass !== 'all' ? `(${selectedClass})` : 'Geral'}</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} domain={[0, 10]} />
                <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '8px', border: 'none'}} />
                <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
             <h4 className="font-bold text-gray-700 text-sm mb-2">Legenda de Faltas</h4>
             <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span> 0% - 19%: Regular</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> 20% - 24%: Alerta (Atenção)</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span> ≥ 25%: Reprovado</div>
             </div>
          </div>
        </div>
      </div>

      {/* MODAL: BATCH ADD UNIT (For Class) */}
      {showBatchAddUnitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
             <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                    <Layers size={24} />
                 </div>
                 <div>
                    <h3 className="font-bold text-lg text-gray-900">Adicionar à Turma</h3>
                    <p className="text-xs text-gray-500">Turma selecionada: <strong>{selectedClass}</strong></p>
                 </div>
             </div>
             <p className="text-sm text-gray-600 mb-6">
                Isso adicionará a matéria abaixo para <strong>TODOS</strong> os alunos desta turma.
             </p>
             <form onSubmit={handleBatchSaveUnit} className="space-y-4">
                <div>
                   <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nome da Matéria</label>
                   <input 
                      type="text" 
                      required 
                      value={batchUnitName} 
                      onChange={(e) => setBatchUnitName(e.target.value)} 
                      className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm" 
                      placeholder="Ex: Geografia" 
                      autoFocus 
                   />
                </div>
                <div>
                   <label className="text-xs font-bold text-gray-500 uppercase ml-1">Carga Horária Padrão</label>
                   <input 
                      type="number" 
                      required 
                      value={batchUnitHours} 
                      onChange={(e) => setBatchUnitHours(Number(e.target.value))} 
                      className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm" 
                      placeholder="80" 
                   />
                </div>
                
                <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setShowBatchAddUnitModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-200">Cancelar</button>
                    <button type="submit" className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-lg shadow-purple-200">Confirmar</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD UNIT (Single Student) */}
      {showAddUnitModal && selectedStudentForUnit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
             <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><BookPlus size={20} className="text-purple-600"/> Nova Matéria</h3>
             <p className="text-xs text-gray-500 mb-4">Adicionando para: <strong>{selectedStudentForUnit.name}</strong></p>
             <form onSubmit={saveNewUnit} className="space-y-4">
                <input type="text" required value={newUnitNameInput} onChange={(e) => setNewUnitNameInput(e.target.value)} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-purple-500" placeholder="Nome da Matéria" autoFocus />
                <div className="flex gap-2">
                    <button type="button" onClick={() => setShowAddUnitModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-600">Cancelar</button>
                    <button type="submit" className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold">Adicionar</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE STUDENT CONFIRMATION */}
      {studentToDelete && (
         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-fade-in">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={32} className="text-red-600" />
                </div>
                <h3 className="font-bold text-xl text-gray-900 mb-2">Excluir Cadastro?</h3>
                <p className="text-gray-500 text-sm mb-6">
                    Você está prestes a remover <strong>{studentToDelete.name}</strong>. 
                    <br/>Esta ação é irreversível e apagará todas as notas e faltas deste aluno.
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setStudentToDelete(null)}
                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-200"
                    >
                        Sim, Excluir
                    </button>
                </div>
            </div>
         </div>
      )}

      {/* MODAL: MANAGE ABSENCES HISTORY */}
      {showAbsenceModal && editForm && activeUnitIndex !== null && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
                  <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                          <Clock className="text-indigo-600" size={20} />
                          Lançamento de Horas
                      </h3>
                      <button onClick={() => setShowAbsenceModal(false)} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300">
                          <X size={16} />
                      </button>
                  </div>
                  
                  <div className="p-6">
                      <div className="mb-6 bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-center">
                           <p className="text-sm text-indigo-800 font-bold mb-1">{editForm.courseUnits[activeUnitIndex].name}</p>
                           <p className="text-3xl font-bold text-indigo-900">{editForm.courseUnits[activeUnitIndex].absences}h <span className="text-sm font-normal text-indigo-600">total de faltas</span></p>
                      </div>

                      <div className="flex gap-2 mb-6">
                          <div className="flex-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Data</label>
                              <input 
                                type="date" 
                                className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                value={absenceDateInput}
                                onChange={handleAbsenceDateChange}
                            />
                          </div>
                          <div className="w-24">
                              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Horas</label>
                              <input 
                                type="number"
                                min="0"
                                max="10"
                                className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-center"
                                value={absenceHoursInput}
                                onChange={(e) => setAbsenceHoursInput(Number(e.target.value))}
                              />
                          </div>
                      </div>
                      
                      <button 
                          onClick={addAbsenceToUnit}
                          className={`w-full py-3 text-white rounded-xl font-bold shadow-sm transition-colors mb-6 flex items-center justify-center gap-2 ${isEditingAbsence ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                      >
                          {isEditingAbsence ? (
                             <>
                               <RefreshCw size={18} />
                               Atualizar Faltas (Correção)
                             </>
                          ) : 'Registrar Faltas'}
                      </button>

                      <div className="border-t border-gray-100 pt-4">
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Histórico de Horas</h4>
                          
                          {/* HEADERS FOR LIST */}
                          <div className="flex justify-between px-3 mb-2 text-[10px] font-bold text-gray-400 uppercase">
                              <span>Dia da Falta</span>
                              <span>Qtd. Horas</span>
                          </div>

                          <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 scrollbar-zinc">
                              {(!editForm.courseUnits[activeUnitIndex].absenceLog || editForm.courseUnits[activeUnitIndex].absenceLog.length === 0) ? (
                                  <p className="text-center text-sm text-gray-400 py-4">Nenhuma falta registrada.</p>
                              ) : (
                                  editForm.courseUnits[activeUnitIndex].absenceLog.map((entry, idx) => (
                                      <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-white hover:border-gray-200 transition-colors">
                                          <div className="flex items-center gap-3">
                                              <CalendarDays size={16} className="text-indigo-400" />
                                              <span className="text-sm font-bold text-gray-700">{formatDisplayDate(entry.date)}</span>
                                          </div>
                                          <div className="flex items-center gap-4">
                                              <span className="text-xs font-bold bg-red-100 text-red-600 px-3 py-1 rounded-full border border-red-200 shadow-sm">{entry.hours}h</span>
                                              <button 
                                                  onClick={() => removeAbsenceFromUnit(idx)}
                                                  className="text-gray-400 hover:text-red-500 p-1"
                                                  title="Remover Falta"
                                              >
                                                  <Trash2 size={16} />
                                              </button>
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: ADD STUDENT */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            <h3 className="font-bold text-xl mb-4 flex items-center gap-2 flex-shrink-0 text-gray-800">
              <Users size={22} className="text-indigo-600"/> 
              Cadastro de Alunos
            </h3>

            {/* Mode selector tab */}
            <div className="flex p-1 bg-gray-100 rounded-xl mb-4 flex-shrink-0">
              <button 
                type="button"
                onClick={() => setAddStudentMode('single')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${addStudentMode === 'single' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Individual
              </button>
              <button 
                type="button"
                onClick={() => setAddStudentMode('bulk')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${addStudentMode === 'bulk' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Colar Lista / Excel / Forms
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {addStudentMode === 'single' ? (
                <form onSubmit={handleSaveNewStudent} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 ml-1">Nome Completo</label>
                    <input type="text" required value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Ex: Ana Souza" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 ml-1">Turma</label>
                    <select 
                      value={classOption}
                      onChange={(e) => setClassOption(e.target.value)}
                      className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold bg-white"
                    >
                      {uniqueClasses.map((cls) => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                      <option value="NEW_CLASS">+ Criar nova turma...</option>
                    </select>
                  </div>
                  {classOption === 'NEW_CLASS' && (
                    <div className="space-y-1 animate-fade-in">
                      <label className="text-xs font-bold text-gray-500 ml-1">Nome da Nova Turma</label>
                      <input 
                        type="text" 
                        required
                        value={customClass}
                        onChange={(e) => setCustomClass(e.target.value)}
                        className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
                        placeholder="Ex: 9º Ano B"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 ml-1">E-mail</label>
                    <input type="email" value={newStudentEmail} onChange={(e) => setNewStudentEmail(e.target.value)} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="exemplo@canal.com" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 ml-1">Telefone</label>
                    <input type="text" value={newStudentContact} onChange={(e) => setNewStudentContact(e.target.value)} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="(11) 98765-4321" />
                  </div>
                  <div className="flex gap-2 pt-4 flex-shrink-0">
                     <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-600 text-sm">Cancelar</button>
                     <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors">Salvar Aluno</button>
                  </div>
                </form>
              ) : (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!bulkInput.trim()) return;

                  const lines = bulkInput.split('\n');
                  let importedCount = 0;
                  const defaultGroup = bulkClassOption === 'NEW_CLASS' ? bulkCustomClass.trim() : bulkClassOption;

                  lines.forEach((line, idx) => {
                    const cleanLine = line.trim();
                    if (!cleanLine) return;

                    let parts: string[] = [];
                    if (cleanLine.includes('\t')) {
                      parts = cleanLine.split('\t');
                    } else if (cleanLine.includes(';')) {
                      parts = cleanLine.split(';');
                    } else if (cleanLine.includes(',')) {
                      parts = cleanLine.split(',');
                    } else {
                      parts = [cleanLine];
                    }

                    const studentName = parts[0]?.trim();
                    if (!studentName) return;

                    let email = '';
                    let contact = '';
                    let classGroup = defaultGroup || 'Sem Turma';

                    parts.slice(1).forEach(part => {
                      const val = part.trim();
                      if (!val) return;
                      if (val.includes('@')) {
                        email = val;
                      } else if (/^[0-9+()-\s]+$/.test(part) && val.length >= 8) {
                        contact = val;
                      }
                    });

                    onAddStudent({
                      id: (Date.now() + idx).toString(),
                      name: studentName,
                      classGroup,
                      email,
                      contact: contact || 'Não informado',
                      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${studentName.replace(' ', '')}`,
                      courseUnits: [],
                      attendanceRecords: []
                    });
                    importedCount++;
                  });

                  setBulkInput('');
                  setBulkClassOption(uniqueClasses[0] || '9º Ano A');
                  setBulkCustomClass('');
                  setShowAddModal(false);
                  setAddStudentMode('single');
                  alert(`${importedCount} alunos importados com sucesso!`);
                }} className="space-y-4">
                  <p className="text-xs text-gray-500 leading-relaxed mb-1">
                    Cole uma lista de nomes (um por linha) ou envie colunas copiadas diretamente de uma planilha (Excel ou Google Sheets) contendo <code className="bg-gray-100 px-1 rounded font-mono">Nome</code> | <code className="bg-gray-100 px-1 rounded font-mono">E-mail</code> | <code className="bg-gray-100 px-1 rounded font-mono">Telefone</code>. O sistema detecta os dados automaticamente.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 ml-1">Turma Padrão para os Alunos</label>
                      <select 
                        value={bulkClassOption}
                        onChange={(e) => setBulkClassOption(e.target.value)}
                        className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold bg-white"
                      >
                        {uniqueClasses.map((cls) => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                        <option value="NEW_CLASS">+ Criar nova turma...</option>
                      </select>
                    </div>
                    {bulkClassOption === 'NEW_CLASS' && (
                      <div className="space-y-1 animate-fade-in">
                        <label className="text-xs font-bold text-gray-500 ml-1">Nova Turma</label>
                        <input 
                          type="text" 
                          required
                          value={bulkCustomClass}
                          onChange={(e) => setBulkCustomClass(e.target.value)}
                          className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
                          placeholder="Ex: 9º Ano B"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 ml-1">Lista de Alunos (Colar abaixo)</label>
                    <textarea 
                      required
                      rows={6}
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                      className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-mono bg-slate-50"
                      placeholder="Exemplo de nomes simples:&#10;Ana Silva&#10;Carlos Oliveira&#10;Mariana Santos&#10;&#10;Ou colado do Excel/Forms:&#10;Ana Silva	ana@email.com	(11) 98888-8888&#10;Carlos Oliveira	carlos@email.com"
                    />
                  </div>

                  <div className="flex gap-2 pt-4 flex-shrink-0">
                     <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-600 text-sm">Cancelar</button>
                     <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors">Importar Lista</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BULK WHATSAPP */}
      {showBulkWhatsAppModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl p-6 max-h-[92vh] flex flex-col overflow-hidden animate-fade-in animate-duration-300">
             <div className="flex justify-between items-center pb-4 border-b border-gray-100 flex-shrink-0">
                 <div className="flex items-center gap-3">
                     <div className="p-2.5 bg-green-100 text-green-600 rounded-xl">
                        <MessageCircle size={24} className="fill-green-50" />
                     </div>
                     <div>
                        <h3 className="font-bold text-xl text-gray-900">Comunicação em Massa via WhatsApp</h3>
                        <p className="text-xs text-gray-500">Envie boletins, avisos ou feedbacks personalizados de forma ágil</p>
                     </div>
                 </div>
                 <button onClick={() => setShowBulkWhatsAppModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors text-gray-500">
                     <X size={18} />
                 </button>
             </div>

             <div className="flex-1 overflow-y-auto py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
                {/* Left Column: Template Editor */}
                <div className="lg:col-span-5 space-y-4 flex flex-col">
                    <div>
                        <label className="text-xs font-bold text-gray-600 uppercase ml-1">1. Selecionar Turma de Destino</label>
                        <select 
                          value={bulkWhatsAppClass}
                          onChange={(e) => setBulkWhatsAppClass(e.target.value)}
                          className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:outline-none cursor-pointer font-semibold"
                        >
                            <option value="all">Todas as Turmas ({students.length} alunos)</option>
                            {uniqueClasses.map(cls => {
                              const count = students.filter(s => s.classGroup === cls).length;
                              return <option key={cls} value={cls}>{cls} ({count} alunos)</option>;
                            })}
                        </select>
                    </div>

                    <div className="flex-1 flex flex-col">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-xs font-bold text-gray-600 uppercase">2. Mensagem Modelo</label>
                            <span className="text-[10px] text-gray-400 font-mono">Variáveis suportadas</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5 my-2">
                            <button 
                              type="button"
                              onClick={() => setBulkWhatsAppTemplate(prev => prev + ' {nome_aluno}')}
                              className="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 text-[10px] font-bold rounded-lg border border-green-200 transition-colors"
                              title="Insere o nome completo do aluno"
                            >
                              + {'{nome_aluno}'}
                            </button>
                            <button 
                              type="button"
                              onClick={() => setBulkWhatsAppTemplate(prev => prev + ' {turma}')}
                              className="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 text-[10px] font-bold rounded-lg border border-green-200 transition-colors"
                              title="Insere o grupo/turma do aluno"
                            >
                              + {'{turma}'}
                            </button>
                            <button 
                              type="button"
                              onClick={() => setBulkWhatsAppTemplate(prev => prev + ' {boletim_resumo}')}
                              className="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 text-[10px] font-bold rounded-lg border border-green-200 transition-colors"
                              title="Insere a tabela com médias e faltas de todas as matérias do aluno"
                            >
                              + {'{boletim_resumo}'}
                            </button>
                        </div>

                        <textarea 
                          required
                          value={bulkWhatsAppTemplate}
                          onChange={(e) => setBulkWhatsAppTemplate(e.target.value)}
                          rows={8}
                          className="w-full flex-1 p-3.5 border border-gray-300 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-xs leading-relaxed font-sans"
                          placeholder="Olá {nome_aluno}, aqui estão suas notas da turma {turma}..."
                        />
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-xs space-y-1.5">
                        <p className="font-bold flex items-center gap-1.5">
                            <AlertTriangle size={14} />
                            Como funciona o envio?
                        </p>
                        <p className="leading-relaxed">
                            O WhatsApp não autoriza disparos automatizados de contas pessoais. Para garantir a segurança do seu número:
                        </p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>Clique no botão <strong>Enviar</strong> ao lado de cada aluno.</li>
                            <li>Uma aba será aberta com a mensagem personalizada pronta para envio no WhatsApp Web ou app.</li>
                            <li>Basta clicar em enviar no WhatsApp e fechar a aba!</li>
                        </ul>
                    </div>
                </div>

                {/* Right Column: Students List & Preview */}
                <div className="lg:col-span-7 flex flex-col min-h-0 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="flex justify-between items-center mb-3 flex-shrink-0">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                           3. Destinatários e Visualização ({
                              students.filter(s => {
                                 const matchesClass = bulkWhatsAppClass === 'all' || s.classGroup === bulkWhatsAppClass;
                                 return matchesClass;
                              }).length
                           } alunos)
                        </h4>
                        <button 
                           onClick={() => setWhatsappSentList({})}
                           className="text-[10px] font-bold text-gray-500 hover:text-red-500 transition-colors flex items-center gap-1 bg-white border border-gray-200 px-2.5 py-1 rounded-lg shadow-xs"
                           title="Limpar progresso de envios"
                        >
                           <RefreshCw size={10} />
                           Reiniciar Progresso
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-zinc">
                       {(() => {
                           const targetStudents = students.filter(s => {
                               return bulkWhatsAppClass === 'all' || s.classGroup === bulkWhatsAppClass;
                           });

                           if (targetStudents.length === 0) {
                               return (
                                   <div className="h-full flex flex-col items-center justify-center text-center py-12 text-gray-400">
                                       <Users size={32} className="text-gray-300 mb-2" />
                                       <p className="font-medium text-sm">Nenhum aluno cadastrado nesta turma.</p>
                                   </div>
                               );
                           }

                           return targetStudents.map(student => {
                               const hasPhone = student.contact && student.contact !== 'Não informado';
                               const link = hasPhone ? getWhatsAppPersonalizedLink(student, bulkWhatsAppTemplate) : '';
                               const isSent = !!whatsappSentList[student.id];

                               // Process message text for display preview
                               let previewText = bulkWhatsAppTemplate;
                               previewText = previewText.replace(/{nome_aluno}/g, student.name);
                               previewText = previewText.replace(/{turma}/g, student.classGroup);
                               previewText = previewText.replace(/{email}/g, student.email || 'Não informado');
                               let summary = '';
                               if (student.courseUnits.length === 0) {
                                 summary = 'Nenhuma unidade curricular cadastrada no momento.';
                               } else {
                                 summary = student.courseUnits.map(unit => {
                                   return `${unit.name}: Média ${unit.averageGrade.toFixed(1)} | ${unit.absences}h faltas`;
                                 }).join(', ');
                               }
                               previewText = previewText.replace(/{boletim_resumo}/g, summary);

                               return (
                                   <div key={student.id} className={`bg-white border p-4 rounded-2xl flex flex-col gap-3 transition-all ${isSent ? 'border-green-300 bg-green-50/20' : 'border-gray-200'}`}>
                                       <div className="flex justify-between items-start gap-4">
                                           <div className="flex items-center gap-2.5">
                                               <img src={student.avatar} alt={student.name} className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0" />
                                               <div className="min-w-0">
                                                   <span className="font-bold text-gray-800 text-sm block truncate">{student.name}</span>
                                                   <span className="text-[10px] text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded-md">{student.classGroup}</span>
                                               </div>
                                           </div>

                                           {hasPhone ? (
                                               <div className="flex items-center gap-1.5">
                                                   <button 
                                                      type="button"
                                                      onClick={() => {
                                                          navigator.clipboard.writeText(previewText);
                                                          alert(`Mensagem copiada para ${student.name}!`);
                                                      }}
                                                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-semibold flex items-center gap-1"
                                                      title="Copiar texto da mensagem para área de transferência"
                                                   >
                                                      Copiar
                                                   </button>
                                                   
                                                   <a 
                                                      href={link}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      onClick={() => {
                                                          setWhatsappSentList(prev => ({ ...prev, [student.id]: true }));
                                                      }}
                                                      className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors ${
                                                          isSent ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-green-600 text-white hover:bg-green-700'
                                                      }`}
                                                   >
                                                      <MessageCircle size={14} className="fill-current" />
                                                      {isSent ? 'Enviado ✓' : 'Enviar'}
                                                   </a>
                                               </div>
                                           ) : (
                                               <span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 px-2 py-1 rounded-lg">Sem Telefone</span>
                                           )}
                                       </div>

                                       <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-[10px] text-gray-500 leading-relaxed font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">
                                           {previewText}
                                       </div>
                                   </div>
                               );
                           });
                       })()}
                    </div>
                </div>
             </div>

             <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
                 <button 
                   type="button" 
                   onClick={() => setShowBulkWhatsAppModal(false)} 
                   className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-600 text-sm"
                 >
                   Fechar
                 </button>
             </div>
          </div>
        </div>
      )}

      {/* Modal: Excluir Turma */}
      {showDeleteClassModal && classToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-fade-in overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-red-50/50">
              <h3 className="font-bold text-xl text-red-800 flex items-center gap-2">
                <Trash2 size={22} className="text-red-600"/>
                Excluir Turma: {classToDelete}
              </h3>
              <button 
                onClick={() => {
                  setShowDeleteClassModal(false);
                  setClassToDelete(null);
                }} 
                className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <AlertTriangle size={22} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">Atenção! Ação permanente</h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    A turma <strong className="font-bold">{classToDelete}</strong> possui{' '}
                    <strong className="font-bold">
                      {students.filter(s => s.classGroup.trim().toLowerCase() === classToDelete.trim().toLowerCase()).length}
                    </strong>{' '}
                    aluno(s) cadastrado(s). Escolha como deseja prosseguir com a exclusão.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Opções de Exclusão</label>
                
                <div 
                  onClick={() => setDeleteClassOption('delete_all')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    deleteClassOption === 'delete_all' 
                      ? 'border-red-500 bg-red-50/30 ring-2 ring-red-100' 
                      : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="deleteOption" 
                    checked={deleteClassOption === 'delete_all'} 
                    onChange={() => setDeleteClassOption('delete_all')}
                    className="mt-1 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <span className="font-bold text-gray-800 text-sm block">Excluir Turma e TODOS os Alunos</span>
                    <span className="text-xs text-gray-500 leading-relaxed block mt-0.5">
                      Remove a turma e apaga permanentemente todos os alunos cadastrados nela, juntamente com suas notas e histórico.
                    </span>
                  </div>
                </div>

                <div 
                  onClick={() => setDeleteClassOption('keep_students')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    deleteClassOption === 'keep_students' 
                      ? 'border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-100' 
                      : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="deleteOption" 
                    checked={deleteClassOption === 'keep_students'} 
                    onChange={() => setDeleteClassOption('keep_students')}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-bold text-gray-800 text-sm block">Excluir Turma e Manter Alunos ("Sem Turma")</span>
                    <span className="text-xs text-gray-500 leading-relaxed block mt-0.5">
                      A turma será excluída, mas os alunos serão preservados no sistema e movidos para a categoria "Sem Turma".
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => {
                    setShowDeleteClassModal(false);
                    setClassToDelete(null);
                  }} 
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={handleConfirmDeleteClass} 
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gerenciar Turmas */}
      {showManageClassesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-fade-in overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                <Users size={22} className="text-indigo-600"/>
                Gerenciar Turmas Cadastradas
              </h3>
              <button 
                onClick={() => setShowManageClassesModal(false)} 
                className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
              {uniqueClasses.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-6">Nenhuma turma cadastrada até o momento.</p>
              ) : (
                uniqueClasses.map(clsName => {
                  const count = students.filter(s => s.classGroup.trim().toLowerCase() === clsName.trim().toLowerCase()).length;
                  return (
                    <div key={clsName} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between gap-4 hover:border-indigo-200 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                          <Users size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800 text-base">{clsName}</h4>
                          <span className="text-xs text-gray-500 font-medium">{count} aluno(s) cadastrado(s)</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          setClassToDelete(clsName);
                          setShowManageClassesModal(false);
                          setShowDeleteClassModal(true);
                        }}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                        title={`Excluir turma ${clsName}`}
                      >
                        <Trash2 size={14} />
                        Excluir Turma
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setShowManageClassesModal(false)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedStudentForReport && (
        <StudentReportModal 
          student={selectedStudentForReport} 
          onClose={() => setSelectedStudentForReport(null)} 
        />
      )}
    </div>
  );
};