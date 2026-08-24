import React, { useState, useEffect, useRef } from 'react';
import { SlideDeck, ArchivedSlideDeck } from '../../types';
import { Presentation, Loader2, Sparkles, ChevronLeft, ChevronRight, MonitorPlay, Image as ImageIcon, Download, AlertTriangle, FileText, Maximize2, Book, List, Archive, Eye, CheckCircle, X, FolderOpen } from 'lucide-react';

interface SlideGeneratorViewProps {
    archivedDecks?: ArchivedSlideDeck[];
    onArchive?: (deck: ArchivedSlideDeck) => void;
    initialDeck?: ArchivedSlideDeck | null; // Added prop
    logoUrl?: string;
}

export const SlideGeneratorView: React.FC<SlideGeneratorViewProps> = ({ archivedDecks = [], onArchive, initialDeck, logoUrl }) => {
  const [topic, setTopic] = useState('');
  const [curricularUnit, setCurricularUnit] = useState('');
  const [specificTopics, setSpecificTopics] = useState('');
  const [gradeLevel, setGradeLevel] = useState('Ensino Médio');
  const [slideCount, setSlideCount] = useState(5);
  
    const [isGenerating, setIsGenerating] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Criando Slides...');
    const [isDownloading, setIsDownloading] = useState(false);
    const [generatedDeck, setGeneratedDeck] = useState<SlideDeck | null>(null);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isArchived, setIsArchived] = useState(false);
    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const presentationContainerRef = useRef<HTMLDivElement>(null);

    const loadingMessages = [
        "Analisando o tema...",
        "Estruturando os tópicos...",
        "Redigindo o conteúdo pedagógico...",
        "Organizando as notas do orador...",
        "Quase pronto...",
        "Finalizando sua apresentação..."
    ];

    useEffect(() => {
        let interval: any;
        if (isGenerating) {
            let index = 0;
            interval = setInterval(() => {
                index = (index + 1) % loadingMessages.length;
                setLoadingMessage(loadingMessages[index]);
            }, 3000);
        } else {
            setLoadingMessage('Criando Slides...');
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

    // Load initial deck if provided (from Dashboard)
    useEffect(() => {
        if (initialDeck) {
            setGeneratedDeck(initialDeck);
            setTopic(initialDeck.topic);
            setGradeLevel(initialDeck.gradeLevel);
            setCurricularUnit(initialDeck.curricularUnit || '');
            setCurrentSlideIndex(0);
            setIsArchived(true);
        }
    }, [initialDeck]);

    const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setGeneratedDeck(null);
    setCurrentSlideIndex(0);
    setIsArchived(false);

    try {
      const response = await fetch('/api/gemini/slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topic: topic.trim(), 
          gradeLevel, 
          slideCount, 
          curricularUnit: curricularUnit.trim() || 'Geral', 
          specificTopics: specificTopics.trim() 
        })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Erro na geração do slide");
      }
      const result = await response.json();
      setGeneratedDeck(result);
    } catch (err: any) {
      setError(err.message || "Falha ao gerar os slides. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleArchive = () => {
    if (!generatedDeck || !onArchive) return;
    
    const deckToArchive: ArchivedSlideDeck = {
        ...generatedDeck,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        curricularUnit
    };
    
    onArchive(deckToArchive);
    setIsArchived(true);
  };

  const loadFromArchive = (deck: ArchivedSlideDeck) => {
      setGeneratedDeck(deck);
      setTopic(deck.topic);
      setGradeLevel(deck.gradeLevel);
      setCurricularUnit(deck.curricularUnit || '');
      setCurrentSlideIndex(0);
      setIsArchived(true); // It's from archive, so it's already saved
      setShowArchiveModal(false);
  };

  const nextSlide = () => {
    if (generatedDeck && currentSlideIndex < generatedDeck.slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!generatedDeck) return;
      
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        if (currentSlideIndex < generatedDeck.slides.length - 1) {
           setCurrentSlideIndex(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentSlideIndex > 0) {
           setCurrentSlideIndex(prev => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [generatedDeck, currentSlideIndex]);

  const toggleFullScreen = () => {
    if (!presentationContainerRef.current) return;

    if (!document.fullscreenElement) {
      presentationContainerRef.current.requestFullscreen().catch(err => {
        alert(`Erro ao tentar entrar em tela cheia: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleDownloadPDF = () => {
    if (!generatedDeck) return;
    
    setIsDownloading(true);
    const element = document.getElementById('full-presentation-export');
    
    if (element && typeof html2pdf !== 'undefined') {
      const opt = {
        margin: [0, 0, 0, 0],
        filename: `apresentacao_${generatedDeck.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
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

  const getImageUrl = (description: string, index: number) => {
      const encodedDesc = encodeURIComponent(description);
      
      // Create a hash from the description to ensure the seed is content-dependent but stable
      let hash = 0;
      for (let i = 0; i < description.length; i++) {
        hash = description.charCodeAt(i) + ((hash << 5) - hash);
      }
      
      // Combine hash with index and a large prime number to guarantee unique seeds for every slide
      const uniqueSeed = Math.abs(hash + (index + 1) * 7919);
      
      return `https://image.pollinations.ai/prompt/${encodedDesc}?width=1024&height=1024&nologo=true&seed=${uniqueSeed}&model=flux`;
  };

  const handleDownloadPPTX = async () => {
    if (!generatedDeck || typeof PptxGenJS === 'undefined') {
        alert("Biblioteca PPTX não carregada.");
        return;
    }

    try {
        const pres = new PptxGenJS();
        pres.layout = 'LAYOUT_16x9';
        pres.title = generatedDeck.topic;
        pres.author = 'Professor Conectado';

        // Add Slides
        generatedDeck.slides.forEach((slideData, index) => {
            const slide = pres.addSlide();
            const imgUrl = getImageUrl(slideData.imageDescription, index);

            // Background & Decor
            slide.background = { color: 'FFFFFF' };
            slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '2%', h: '100%', fill: '4F46E5' }); // Indigo bar

            // SENAI Logo (Top Left)
            slide.addImage({ 
                path: logoUrl || "https://upload.wikimedia.org/wikipedia/commons/8/8c/SENAI_S%C3%A3o_Paulo_logo.png", 
                x: '3%', y: '5%', w: 1.5, h: 0.5 
            });
            slide.addText("SERVIÇO NACIONAL DE APRENDIZAGEM INDUSTRIAL", {
                x: '3%', y: '13%', w: 2.5, h: 0.2,
                fontSize: 6, align: 'left', color: '6B7280', bold: true
            });

            // Slide Number
            slide.addText(`${index + 1} / ${generatedDeck.slides.length}`, {
                x: '90%', y: '92%', fontSize: 10, color: '9CA3AF'
            });

            // Title
            slide.addText(slideData.title, { 
                x: '5%', y: '16%', w: '80%', h: 1, 
                fontSize: 32, fontFace: 'Arial', bold: true, color: '312E81' 
            });

            // Content (Bullets)
            const bulletItems = slideData.content.map(text => ({ 
                text: text, 
                options: { breakLine: true, indentLevel: 0, bullet: true } 
            }));

            slide.addText(bulletItems, { 
                x: '5%', y: '30%', w: '50%', h: '60%', 
                fontSize: 18, color: '374151', paraSpaceAfter: 10 
            });

            // Image (Real Image via URL)
            // Note: PptxGenJS fetches the image. If the URL is unique, it fetches a unique image.
            slide.addImage({
                path: imgUrl,
                x: '60%',
                y: '20%',
                w: '35%',
                h: '60%',
                rounding: true
            });

            // Speaker Notes
            slide.addNotes(slideData.speakerNotes);
        });

        // Save
        const fileName = `apresentacao_${generatedDeck.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pptx`;
        await pres.writeFile({ fileName: fileName });

    } catch (err) {
        console.error("PPTX generation error:", err);
        setError("Erro ao gerar PPTX. Tente novamente.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-4rem)]">
      {/* Sidebar Controls */}
      <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-y-auto no-print">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    <Presentation size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Gerador</h2>
            </div>
            {/* Folder button removed as per user request (moved to Dashboard) */}
        </div>
        
        <form onSubmit={handleGenerate} className="space-y-5 flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Book size={14} /> Unidade Curricular (Opcional)
            </label>
            <input
              type="text"
              value={curricularUnit}
              onChange={(e) => setCurricularUnit(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex: Geral, Biologia, Mecânica, História..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tema Principal *
            </label>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex: Sistema Solar, Termodinâmica, Liderança..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <List size={14} /> Tópicos a Cobrir (Opcional)
            </label>
            <textarea
              value={specificTopics}
              onChange={(e) => setSpecificTopics(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[100px] text-sm"
              placeholder="Digite os tópicos ou capítulos que devem aparecer nos slides..."
            />
            <p className="text-xs text-gray-400 mt-1">A IA usará esses tópicos para estruturar a apresentação.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Público Alvo
            </label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg bg-white"
            >
              <option>Fundamental I</option>
              <option>Fundamental II</option>
              <option>Ensino Médio</option>
              <option>Ensino Superior</option>
              <option>Corporativo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número de Slides
            </label>
            <input
              type="number"
              min="3"
              max="15"
              value={slideCount}
              onChange={(e) => setSlideCount(Number(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg"
            />
          </div>

          <button
            type="submit"
            disabled={isGenerating || !topic.trim()}
            className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                {loadingMessage}
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Gerar Apresentação
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

        {generatedDeck && (
          <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
             <button 
              onClick={toggleFullScreen}
              className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 shadow-md shadow-purple-200 transition-all flex items-center justify-center gap-2 animate-pulse hover:animate-none"
            >
              <MonitorPlay size={20} />
              Iniciar Apresentação
            </button>

             <button 
              onClick={handleDownloadPPTX}
              className="w-full py-2 px-4 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <FileText size={18} />
              Baixar PPTX (PowerPoint)
            </button>
            <button 
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="w-full py-2 px-4 border border-gray-300 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
            >
              {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Baixar PDF
            </button>
            
            {onArchive && (
                <button
                    onClick={handleArchive}
                    disabled={isArchived}
                    className={`w-full py-2 px-4 border border-gray-300 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                        isArchived ? 'bg-green-50 text-green-700 border-green-200 cursor-default' : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    {isArchived ? (
                        <>
                            <CheckCircle size={16} /> Arquivado
                        </>
                    ) : (
                        <>
                            <Archive size={16} /> Arquivar Apresentação
                        </>
                    )}
                </button>
            )}
          </div>
        )}
      </div>

      {/* Slide Preview Area */}
      <div className="lg:col-span-9 flex flex-col">
        {generatedDeck ? (
          <div className="flex flex-col h-full gap-4">
            
            {/* Slide Viewer (16:9 Aspect Ratio) */}
            <div 
                ref={presentationContainerRef}
                className="flex-1 bg-gray-800 rounded-xl p-4 sm:p-8 flex items-center justify-center shadow-lg relative overflow-hidden group transition-all duration-300 fullscreen:rounded-none fullscreen:p-0"
            >
              {/* Fullscreen Hint */}
              <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm pointer-events-none">
                 Use as setas ⬅️ ➡️ para navegar
              </div>
              
              {/* Actual Slide Content */}
              <div className="bg-white w-full aspect-video max-h-full rounded-lg shadow-2xl overflow-hidden flex flex-col relative animate-fade-in fullscreen:w-screen fullscreen:h-screen fullscreen:rounded-none fullscreen:max-h-screen">
                
                {/* Header/Logo Overlay */}
                <div className="absolute top-8 left-12 z-10 opacity-80 flex flex-col items-start">
                   <img src={logoUrl || "https://upload.wikimedia.org/wikipedia/commons/8/8c/SENAI_S%C3%A3o_Paulo_logo.png"} alt="Logo" className="h-8 object-contain mb-0.5" />
                   <span className="text-[6px] font-bold text-gray-500 uppercase tracking-tight">Serviço Nacional de Aprendizagem Industrial</span>
                </div>
                
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl -mr-10 -mb-10 pointer-events-none"></div>

                <div className="flex-1 p-8 sm:p-12 flex flex-col z-0 mt-8">
                  <h1 className="text-3xl sm:text-4xl font-bold text-indigo-900 mb-8 border-b-2 border-indigo-100 pb-4">
                    {generatedDeck.slides[currentSlideIndex].title}
                  </h1>
                  
                  <div className="flex gap-8 h-full">
                    {/* Text Content */}
                    <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-hide">
                      {generatedDeck.slides[currentSlideIndex].content.map((point, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="mt-2 w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"></div>
                          <p className="text-xl text-gray-700 leading-relaxed">{point}</p>
                        </div>
                      ))}
                    </div>

                    {/* Real Generated Image */}
                    <div className="w-1/3 hidden md:flex flex-col gap-2 relative">
                       <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-100 shadow-inner relative group">
                          {/* KEY added to force re-render when image URL changes */}
                          <img 
                            key={getImageUrl(generatedDeck.slides[currentSlideIndex].imageDescription, currentSlideIndex)}
                            src={getImageUrl(generatedDeck.slides[currentSlideIndex].imageDescription, currentSlideIndex)}
                            alt="Slide Visual"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            loading="eager"
                          />
                       </div>
                    </div>
                  </div>
                </div>

                {/* Footer Number */}
                <div className="absolute bottom-4 right-6 text-gray-400 font-mono text-sm">
                   {currentSlideIndex + 1} / {generatedDeck.slides.length}
                </div>
              </div>

              {/* Navigation Arrows */}
              <button 
                onClick={prevSlide}
                disabled={currentSlideIndex === 0}
                className="absolute left-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all backdrop-blur-sm z-30"
              >
                <ChevronLeft size={32} />
              </button>
              <button 
                onClick={nextSlide}
                disabled={currentSlideIndex === generatedDeck.slides.length - 1}
                className="absolute right-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all backdrop-blur-sm z-30"
              >
                <ChevronRight size={32} />
              </button>
            </div>

            {/* Speaker Notes */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 no-print">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Notas do Orador</h3>
              <p className="text-gray-700 leading-relaxed">
                {generatedDeck.slides[currentSlideIndex].speakerNotes}
              </p>
            </div>

            {/* Pagination Dots */}
            <div className="flex justify-center gap-2 py-2 no-print">
              {generatedDeck.slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    currentSlideIndex === idx ? 'bg-indigo-600 w-8' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
            <div className="p-6 bg-white rounded-full mb-6 shadow-sm">
              <MonitorPlay size={48} className="text-indigo-200" />
            </div>
            <h3 className="text-xl font-bold text-gray-600">Visualizador de Slides</h3>
            <p className="text-gray-500 mt-2 max-w-md text-center">
              Preencha o formulário ao lado para criar uma nova apresentação.
            </p>
          </div>
        )}
      </div>

      {/* Internal Archive Modal Removed - Access is now via Dashboard */}

      {/* Hidden Container for PDF Generation - Renders ALL slides vertically */}
      {generatedDeck && (
        <div id="full-presentation-export" className="hidden fixed top-0 left-0 w-full z-[-1]" style={{ display: isDownloading ? 'block' : 'none' }}>
           {generatedDeck.slides.map((slide, idx) => (
             <div key={idx} className="w-[297mm] h-[210mm] bg-white relative break-after-page flex flex-col p-0 overflow-hidden" style={{ pageBreakAfter: 'always' }}>
                {/* Slide Design Replication for PDF */}
                <div className="w-full h-full p-16 flex flex-col relative border-b border-gray-100">
                    {/* Header/Logo Overlay */}
                    <div className="absolute top-8 left-12 z-10 opacity-80 flex flex-col items-start">
                        <img src={logoUrl || "https://upload.wikimedia.org/wikipedia/commons/8/8c/SENAI_S%C3%A3o_Paulo_logo.png"} alt="Logo" className="h-12 object-contain mb-1" />
                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-tight">Serviço Nacional de Aprendizagem Industrial</span>
                    </div>
                    
                    {/* Decorative Elements */}
                    <div className="absolute top-0 left-0 w-4 h-full bg-indigo-600"></div>

                    <div className="flex-1 flex flex-col z-0 pt-16">
                        <h1 className="text-5xl font-bold text-indigo-900 mb-12 border-b-4 border-indigo-100 pb-6">
                            {slide.title}
                        </h1>
                        
                        <div className="flex gap-12 h-full">
                            {/* Text Content */}
                            <div className="flex-1 space-y-6">
                                {slide.content.map((point, pIdx) => (
                                    <div key={pIdx} className="flex items-start gap-4">
                                        <div className="mt-3 w-3 h-3 rounded-full bg-indigo-500 flex-shrink-0"></div>
                                        <p className="text-3xl text-gray-700 leading-normal">{point}</p>
                                    </div>
                                ))}
                            </div>

                             {/* Real Image on Print */}
                             <div className="w-1/3 flex flex-col gap-2">
                                <div className="flex-1 bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                                   <img 
                                      src={getImageUrl(slide.imageDescription, idx)} 
                                      alt="Slide"
                                      className="w-full h-full object-cover"
                                   />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Number */}
                    <div className="absolute bottom-8 right-12 text-gray-400 font-mono text-xl">
                        {idx + 1} / {generatedDeck.slides.length}
                    </div>
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};