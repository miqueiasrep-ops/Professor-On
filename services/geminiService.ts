
import { GoogleGenAI, Type, Schema, ThinkingLevel } from "@google/genai";
import { GeneratedQuizResponse, ExamType, LessonPlan, SlideDeck, GeneratedExerciseResponse, ExerciseType, ChatMessage } from "../types";

// Initialize the client lazily using a Proxy to prevent crashes on startup if the API key is not yet defined.
let cachedAi: GoogleGenAI | null = null;
const ai = new Proxy({} as any, {
  get(target, prop, receiver) {
    if (!cachedAi) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is required");
      }
      cachedAi = new GoogleGenAI({ apiKey });
    }
    return Reflect.get(cachedAi, prop, receiver);
  }
});

export const researchTopic = async (query: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: "Você é um especialista pedagógico acadêmico. Forneça resumos aprofundados, com rigor técnico e fontes confiáveis. Use formatação Markdown.",
      },
    });
    
    const text = response.text || "Não foi possível gerar uma resposta.";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    // Extract sources if available
    const sources = groundingChunks
      .filter((chunk: any) => chunk.web?.uri && chunk.web?.title)
      .map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri
      }));

    return { text, sources };
  } catch (error) {
    console.error("Error researching topic:", error);
    throw error;
  }
};

interface ChatPersona {
  name: string;
  role: string;
  context: string;
}

export const chatWithPedagogicalSupport = async (message: string, history: ChatMessage[], persona?: ChatPersona) => {
  try {
    const prompt = `
    Histórico da conversa:
    ${history.slice(-5).map(h => `${h.role === 'user' ? 'Docente' : persona?.name || 'IA'}: ${h.text}`).join('\n')}
    
    Docente: ${message}
    `;

    // Default persona (Flávia) if none provided
    const systemInstruction = persona 
      ? `Você é "${persona.name}", ${persona.role} do SENAI.
         Contexto da sua atuação: ${persona.context}.
         
         Diretrizes:
         - Responda como um colega de trabalho no chat da escola.
         - Seja técnico na sua área específica, mas colaborativo.
         - Use linguagem natural, profissional mas próxima.
         - Se não souber algo fora da sua área, sugira falar com a Coordenação.`
      : `Você é "Flávia Ribeiro", Coordenadora Pedagógica do SENAI.
         Seu objetivo é ajudar docentes com Situações de Aprendizagem, cronogramas e metodologias (Metodologia SENAI).
         Seja parceira, incentive a inovação e o uso da Indústria 4.0.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: systemInstruction
      }
    });

    return response.text || "Olá! Posso ajudar com algo na minha área?";
  } catch (error) {
    console.error("Error in pedagogical chat:", error);
    return "Desculpe, estou verificando um equipamento agora (erro de conexão). Já respondo!";
  }
};

export const generateExam = async (topic: string, gradeLevel: string, questionCount: number, type: ExamType): Promise<GeneratedQuizResponse> => {
  try {
    let prompt = '';
    let schema: Schema = { type: Type.OBJECT, properties: {} };

    // Common instructions for higher difficulty
    const rigorInstruction = `
    DIRETRIZES DE ALTO NÍVEL:
    1. Crie questões desafiadoras que exijam pensamento crítico, análise e aplicação de conceitos, evitando a simples memorização.
    2. Utilize terminologia técnica adequada e rigor acadêmico compatível com o nível ${gradeLevel}.
    3. Contextualize as perguntas com situações-problema ou cenários reais sempre que possível.
    4. Eleve o grau de complexidade para testar o domínio real do aluno sobre o tema.`;

    if (type === 'MULTIPLE_CHOICE') {
      prompt = `Crie uma prova de MÚLTIPLA ESCOLHA com ALTO RIGOR ACADÊMICO sobre o tema: "${topic}". 
      Nível escolar: ${gradeLevel}. 
      Quantidade de questões: ${questionCount}.
      ${rigorInstruction}
      
      REGRAS CRÍTICAS DE BALANCEAMENTO (ANTI-VIÉS):
      1. As alternativas incorretas (distratores) devem ser plausíveis e inteligentes.
      2. MUITO IMPORTANTE: Todas as alternativas (corretas e incorretas) devem ter COMPRIMENTO DE TEXTO SEMELHANTE. 
      3. NÃO crie a resposta correta sendo a mais longa ou a mais detalhada. Se a correta for longa, escreva distratores igualmente longos. Se for curta, mantenha todas curtas.
      4. Evite que a resposta correta seja óbvia por ser a única "completa".

      Retorne apenas JSON válido.`;

      schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Título formal e acadêmico para a prova" },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                questionText: { type: Type.STRING, description: "Enunciado complexo e contextualizado" },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Exatamente 4 opções de resposta bem elaboradas e com tamanhos equilibrados"
                },
                correctOptionIndex: { type: Type.INTEGER, description: "Índice (0-3) da resposta correta" },
                explanation: { type: Type.STRING, description: "Explicação técnica detalhada do porquê a resposta está correta" }
              },
              required: ["questionText", "options", "correctOptionIndex", "explanation"]
            }
          }
        },
        required: ["title", "questions"]
      };
    } else {
      // OPEN ENDED
      prompt = `Crie uma prova de QUESTÕES ABERTAS (Dissertativas) com ALTO NÍVEL DE EXIGÊNCIA sobre o tema: "${topic}". 
      Nível escolar: ${gradeLevel}. 
      Quantidade de questões: ${questionCount}.
      ${rigorInstruction}
      Para cada questão, exija capacidade de argumentação, síntese e profundidade.
      Retorne apenas JSON válido.`;

      schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Título formal e acadêmico para a prova" },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                questionText: { type: Type.STRING, description: "O enunciado da questão dissertativa, exigindo análise profunda" },
                expectedAnswer: { type: Type.STRING, description: "Critérios de correção detalhados e pontos-chave que o aluno deve mencionar" }
              },
              required: ["questionText", "expectedAnswer"]
            }
          }
        },
        required: ["title", "questions"]
      };
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
      }
    });

    const body = response.text;
    if (body) {
      const parsed = JSON.parse(body) as GeneratedQuizResponse;
      
      // Safety Check: Ensure we respect the exact requested count if the AI over-generates
      if (parsed.questions && parsed.questions.length > questionCount) {
        parsed.questions = parsed.questions.slice(0, questionCount);
      }
      
      // SHUFFLE LOGIC: Ensure randomization of correct answers
      if (type === 'MULTIPLE_CHOICE' && parsed.questions) {
        parsed.questions = parsed.questions.map(q => {
          if (!q.options || q.correctOptionIndex === undefined) return q;

          // 1. Identify the correct answer string
          const correctAnswerText = q.options[q.correctOptionIndex];

          // 2. Create a shuffled copy of options using Fisher-Yates shuffle
          const shuffledOptions = [...q.options];
          for (let i = shuffledOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
          }

          // 3. Find the new index of the correct answer
          const newCorrectIndex = shuffledOptions.indexOf(correctAnswerText);

          return {
            ...q,
            options: shuffledOptions,
            correctOptionIndex: newCorrectIndex
          };
        });
      }
      
      // Inject the type back into the response so the UI knows how to render it
      return { ...parsed, type };
    }
    throw new Error("No data returned");
  } catch (error) {
    console.error("Error generating exam:", error);
    throw error;
  }
};

export const generateExercises = async (topic: string, gradeLevel: string, count: number, type: ExerciseType): Promise<GeneratedExerciseResponse> => {
  try {
    let prompt = `Crie uma LISTA DE EXERCÍCIOS de fixação DESAFIADORA e APROFUNDADA sobre: "${topic}".
    Nível: ${gradeLevel}.
    Quantidade: ${count} exercícios.
    
    DIRETRIZES:
    - Evite perguntas superficiais. Foque em detalhes técnicos e compreensão profunda.
    - Se for Verdadeiro ou Falso, use afirmações que exijam atenção aos detalhes.
    - Se for Lacunas, escolha palavras-chave conceituais importantes.
    `;

    if (type === 'TRUE_FALSE') {
      prompt += `
      Tipo: Verdadeiro ou Falso.
      Para cada item, forneça uma afirmação complexa e diga se é verdadeira ou falsa.`;
    } else if (type === 'FILL_IN_THE_BLANKS') {
      prompt += `
      Tipo: Complete as lacunas.
      Para cada item, forneça uma frase técnica com uma lacuna (representada por ____) que exige conhecimento específico.`;
    } else if (type === 'MULTIPLE_CHOICE') {
      prompt += `
      Tipo: Múltipla Escolha.
      Para cada item, forneça um enunciado robusto e 4 alternativas (A, B, C, D) plausíveis.`;
    } else {
      prompt += `
      Tipo: Misto.
      Crie uma variedade de estilos de perguntas (V/F, Lacunas, Múltipla Escolha e Dissertativas) que testem diferentes habilidades cognitivas.`;
    }

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Título técnico da lista de exercícios" },
        topic: { type: Type.STRING },
        exercises: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ['TRUE_FALSE', 'FILL_IN_THE_BLANKS', 'MULTIPLE_CHOICE', 'OPEN'] },
              statement: { type: Type.STRING, description: "O enunciado do exercício (complexo e detalhado)" },
              isTrue: { type: Type.BOOLEAN, description: "Apenas para Verdadeiro/Falso" },
              answerKey: { type: Type.STRING, description: "A resposta correta e técnica para o gabarito. Para múltipla escolha, indique a letra e o texto da opção." },
              options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Apenas para Múltipla Escolha (4 opções)" },
              correctIndex: { type: Type.INTEGER, description: "Apenas para Múltipla Escolha (0-3)" }
            },
            required: ["type", "statement", "answerKey"]
          }
        }
      },
      required: ["title", "topic", "exercises"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
      }
    });

    const body = response.text;
    if (body) {
      const parsed = JSON.parse(body) as GeneratedExerciseResponse;
      
      // Safety Check: Ensure we respect the exact requested count
      if (parsed.exercises && parsed.exercises.length > count) {
        parsed.exercises = parsed.exercises.slice(0, count);
      }

      return parsed;
    }
    throw new Error("No data returned for exercises");
  } catch (error) {
    console.error("Error generating exercises:", error);
    throw error;
  }
};

export const generateLessonPlan = async (topic: string, gradeLevel: string, duration: string, specifics: string): Promise<LessonPlan> => {
  try {
    const prompt = `Crie um PLANO DE AULA detalhado, estruturado e com rigor pedagógico.
    Tema: "${topic}"
    Nível Escolar: "${gradeLevel}"
    Duração da aula: "${duration}"
    Detalhes adicionais/foco: "${specifics}"
    
    O plano deve ser prático, engajador e educativo, focando no desenvolvimento de competências.`;

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Título da aula" },
        topic: { type: Type.STRING },
        gradeLevel: { type: Type.STRING },
        duration: { type: Type.STRING },
        objectives: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Lista de 3-5 objetivos de aprendizado claros e mensuráveis"
        },
        materials: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Lista de materiais necessários"
        },
        activities: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              time: { type: Type.STRING, description: "Duração estimada desta parte (ex: 10 min)" },
              description: { type: Type.STRING, description: "O que será feito" },
              methodology: { type: Type.STRING, description: "Estratégia pedagógica detalhada para o professor" }
            },
            required: ["time", "description", "methodology"]
          },
          description: "Cronograma passo a passo da aula (Introdução, Desenvolvimento, Conclusão)"
        },
        assessment: { type: Type.STRING, description: "Método de avaliação para verificar se os objetivos foram alcançados" }
      },
      required: ["title", "objectives", "materials", "activities", "assessment"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
      }
    });

    const body = response.text;
    if (body) {
      return JSON.parse(body) as LessonPlan;
    }
    throw new Error("No data returned for lesson plan");
  } catch (error) {
    console.error("Error generating lesson plan:", error);
    throw error;
  }
};

export const generateSlideDeck = async (topic: string, gradeLevel: string, slideCount: number, curricularUnit: string, specificTopics: string): Promise<SlideDeck> => {
  try {
    const prompt = `Crie uma apresentação de slides educacional EXPLICATIVA, DETALHADA e APROFUNDADA.
    Unidade Curricular: "${curricularUnit}"
    Tema Principal: "${topic}"
    Público Alvo: "${gradeLevel}"
    Número Aproximado de Slides: ${slideCount}

    TÓPICOS ESPECÍFICOS OBRIGATÓRIOS (Use estes tópicos para criar o conteúdo):
    ${specificTopics}
    
    DIRETRIZES CRUCIAIS PARA MAIOR CONTEÚDO:
    1. NÃO FAÇA APENAS LISTAS CURTAS. Você deve EXPLICAR o conteúdo de forma pedagógica.
    2. Cada slide deve ser uma "miniaula" sobre aquele ponto, com informações ricas e exemplos.
    3. Use frases completas, definições técnicas, exemplos práticos e contextos reais.
    4. O conteúdo deve ser substancial (mínimo de 40-60 palavras por slide), pronto para o aluno ler e realmente aprender o conceito. Evite rodeios desnecessários, mantendo-o denso e focado.
    5. Distribua os Tópicos Específicos fornecidos ao longo dos slides de forma lógica e crescente.`;

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING, description: "O tema principal (pode ser ajustado para ser mais atrativo)" },
        gradeLevel: { type: Type.STRING },
        slides: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Título impactante do slide" },
              content: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Desenvolva de 3 a 5 explicações ou pontos detalhados explicando o conceito. Seja claro, explicativo, informativo e educativo."
              },
              imageDescription: { type: Type.STRING, description: "Descrição visual detalhada para compor o slide (ex: paisagem, diagrama, objeto em fundo branco)" },
              speakerNotes: { type: Type.STRING, description: "Roteiro detalhado para a fala do professor, expandindo os tópicos e dando exemplos extras" }
            },
            required: ["title", "content", "imageDescription", "speakerNotes"]
          }
        }
      },
      required: ["topic", "gradeLevel", "slides"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
      }
    });

    const body = response.text;
    if (body) {
      return JSON.parse(body) as SlideDeck;
    }
    throw new Error("No data returned for slide deck");
  } catch (error) {
    console.error("Error generating slides:", error);
    throw error;
  }
};

interface StudentReportInput {
  name: string;
  classGroup: string;
  courseUnits: {
    name: string;
    assessments: number[];
    averageGrade: number;
    totalHours: number;
    absences: number;
  }[];
}

export const generateStudentReportAI = async (student: StudentReportInput) => {
  try {
    const prompt = `
    Analise o desempenho acadêmico e de frequência do seguinte estudante e gere um relatório pedagógico detalhado e ultra-profissional, em formato Markdown (com títulos de seção bem definidos em negrito, listas com pontos e parágrafos estruturados).

    Estudante: ${student.name}
    Turma: ${student.classGroup}
    
    Unidades Curriculares e Desempenho:
    ${student.courseUnits.map(cu => {
      const gradesStr = cu.assessments.join(", ");
      const attendanceRate = cu.totalHours > 0 ? ((cu.totalHours - cu.absences) / cu.totalHours * 100).toFixed(1) : "100";
      return `- ${cu.name}: Notas: [${gradesStr}], Média: ${cu.averageGrade.toFixed(1)}/10, Carga Horária: ${cu.totalHours}h, Faltas: ${cu.absences}h (Frequência: ${attendanceRate}%)`;
    }).join("\n")}
    
    Retorne um relatório pedagógico contendo:
    1. **Análise Geral de Desempenho** (Visão geral global das notas e do percentual de presença)
    2. **Pontos Fortes** (Matérias que se destaca, boa frequência/desempenho)
    3. **Áreas de Atenção** (Unidades onde notas estão baixas ou risco de reprovação por falta/notas)
    4. **Plano de Intervenção Pedagógica Recomendado** (Recomendações e passos concretos para o docente, a escola e o aluno)
    
    Escreva de forma empática, encorajadora, com tom altamente profissional e focado no crescimento acadêmico, estruturada em português.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: "Você é um Analista Coordenador Pedagógico sênior experiente. Sua função é emitir pareceres e relatórios de acompanhamento de estudantes com alto rigor pedagógico, empatia e clareza.",
      },
    });

    return response.text || "Não foi possível gerar o parecer pedagógico no momento.";
  } catch (error) {
    console.error("Error generating student report:", error);
    throw error;
  }
};