import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Copy,
  FileText,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { ConfirmDialogState, QuizProject, QuizQuestion } from '../types/quiz';
import { parseImportedContent, parsePlainTextExercises } from '../utils/htmlGenerator';

interface ExerciseEditorProps {
  project: QuizProject;
  onChangeQuestions: (questions: QuizQuestion[]) => void;
  onImportProject: (partial: Partial<QuizProject>, summary: string) => void;
  onRequestConfirm: (dialog: Omit<ConfirmDialogState, 'isOpen'>) => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export const ExerciseEditor: React.FC<ExerciseEditorProps> = ({
  project,
  onChangeQuestions,
  onImportProject,
  onRequestConfirm,
  onNotify,
}) => {
  const { questions, page } = project;
  const [selectedId, setSelectedId] = useState<string>(
    questions[0]?.id || ''
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkMode, setBulkMode] = useState<'append' | 'replace'>('append');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeQuestion =
    questions.find((q) => q.id === selectedId) || questions[0] || null;

  const filteredQuestions = questions.filter((q) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      q.q.toLowerCase().includes(term) ||
      q.a.some((opt) => opt.toLowerCase().includes(term)) ||
      q.e.toLowerCase().includes(term)
    );
  });

  const handleAddQuestion = () => {
    const newQ: QuizQuestion = {
      id: `q-${Date.now()}`,
      q: 'Nova questão de Língua Portuguesa',
      a: ['Alternativa A', 'Alternativa B', 'Alternativa C', 'Alternativa D'],
      c: 0,
      e: 'Explique aqui por que a alternativa selecionada é a correta.',
    };
    const next = [...questions, newQ];
    onChangeQuestions(next);
    setSelectedId(newQ.id);
    onNotify('Nova questão adicionada.');
  };

  const handleDuplicateQuestion = (q: QuizQuestion) => {
    const idx = questions.findIndex((item) => item.id === q.id);
    const copy: QuizQuestion = {
      ...q,
      id: `q-${Date.now()}`,
      q: `${q.q} (cópia)`,
      a: [...q.a],
    };
    const next = [...questions];
    next.splice(idx + 1, 0, copy);
    onChangeQuestions(next);
    setSelectedId(copy.id);
    onNotify('Questão duplicada.');
  };

  const handleMoveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChangeQuestions(next);
  };

  const handleDeleteQuestion = (q: QuizQuestion) => {
    onRequestConfirm({
      title: 'Excluir questão?',
      description:
        'Esta questão será removida da lista atual de exercícios.',
      details: [q.q],
      confirmLabel: 'Excluir questão',
      variant: 'danger',
      onConfirm: () => {
        const next = questions.filter((item) => item.id !== q.id);
        onChangeQuestions(next);
        if (activeQuestion?.id === q.id) {
          setSelectedId(next[0]?.id || '');
        }
        onNotify('Questão removida.');
      },
    });
  };

  const updateActive = (patch: Partial<QuizQuestion>) => {
    if (!activeQuestion) return;
    const next = questions.map((q) =>
      q.id === activeQuestion.id ? { ...q, ...patch } : q
    );
    onChangeQuestions(next);
  };

  const updateOption = (optIndex: number, value: string) => {
    if (!activeQuestion) return;
    const nextOptions = [...activeQuestion.a];
    nextOptions[optIndex] = value;
    updateActive({ a: nextOptions });
  };

  const addOption = () => {
    if (!activeQuestion || activeQuestion.a.length >= 6) return;
    updateActive({
      a: [
        ...activeQuestion.a,
        `Alternativa ${String.fromCharCode(65 + activeQuestion.a.length)}`,
      ],
    });
  };

  const removeOption = (optIndex: number) => {
    if (!activeQuestion || activeQuestion.a.length <= 2) return;
    const nextOptions = activeQuestion.a.filter((_, i) => i !== optIndex);
    let nextCorrect = activeQuestion.c;
    if (optIndex === activeQuestion.c) {
      nextCorrect = 0;
    } else if (optIndex < activeQuestion.c) {
      nextCorrect = activeQuestion.c - 1;
    }
    updateActive({ a: nextOptions, c: nextCorrect });
  };

  const handleLocalFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      const { project: parsed, summary } = parseImportedContent(
        content,
        file.name
      );
      onImportProject(parsed, summary);
      if (parsed.questions && parsed.questions[0]) {
        setSelectedId(parsed.questions[0].id);
      }
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Erro ao ler o arquivo.',
        'error'
      );
    } finally {
      e.target.value = '';
    }
  };

  const handleBulkSubmit = () => {
    const parsed = parsePlainTextExercises(bulkText);
    if (parsed.length === 0) {
      onNotify(
        'Nenhuma questão identificada. Use blocos separados por linha em branco com alternativas A), B), C), D).',
        'error'
      );
      return;
    }

    if (bulkMode === 'replace') {
      onRequestConfirm({
        title: 'Substituir todas as questões atuais?',
        description: `As ${questions.length} questões atuais serão substituídas pelas ${parsed.length} novas questões importadas do texto.`,
        confirmLabel: 'Substituir questões',
        variant: 'danger',
        onConfirm: () => {
          onChangeQuestions(parsed);
          setSelectedId(parsed[0].id);
          setShowBulkModal(false);
          setBulkText('');
          onNotify(`${parsed.length} questões importadas.`);
        },
      });
    } else {
      const next = [...questions, ...parsed];
      onChangeQuestions(next);
      setSelectedId(parsed[0].id);
      setShowBulkModal(false);
      setBulkText('');
      onNotify(`${parsed.length} questões adicionadas à atividade.`);
    }
  };

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Banco de Exercícios
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-mono-tabular font-semibold text-slate-800">
              {questions.length}
            </span>{' '}
            {questions.length === 1 ? 'questão ativa' : 'questões ativas'} ·
            Edite enunciados, gabarito e explicações imediatas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm,.json,.txt"
            onChange={handleLocalFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Upload className="h-4 w-4 text-slate-500" />
            Importar Arquivo
          </button>
          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <FileText className="h-4 w-4 text-slate-500" />
            Colar em Lote
          </button>
          <button
            type="button"
            onClick={handleAddQuestion}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#2457a6] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1d4687] whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            Nova Questão
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Question List */}
        <aside className="lg:col-span-5 xl:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar questões..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2457a6] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="mt-3 max-h-[600px] space-y-2 overflow-y-auto pr-1">
              {filteredQuestions.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  Nenhuma questão encontrada.
                </div>
              ) : (
                filteredQuestions.map((item) => {
                  const realIndex = questions.findIndex(
                    (q) => q.id === item.id
                  );
                  const isActive = activeQuestion?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`group rounded-lg border p-3 transition-colors ${
                        isActive
                          ? 'border-[#2457a6] bg-[#eef4ff]/60'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className="w-full text-left focus:outline-none"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span className="font-mono-tabular font-semibold text-slate-700">
                            Questão {realIndex + 1}
                          </span>
                          <span>
                            Gabarito: {String.fromCharCode(65 + item.c)} ·{' '}
                            {item.a.length} opções
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-900">
                          {item.q}
                        </p>
                      </button>

                      <div className="mt-2.5 flex items-center justify-end gap-1 border-t border-slate-100 pt-2">
                        <button
                          type="button"
                          onClick={() => handleMoveQuestion(realIndex, -1)}
                          disabled={realIndex === 0}
                          title="Mover para cima"
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveQuestion(realIndex, 1)}
                          disabled={realIndex === questions.length - 1}
                          title="Mover para baixo"
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateQuestion(item)}
                          title="Duplicar questão"
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-900"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(item)}
                          title="Excluir questão"
                          className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* Active Question Editor */}
        <section className="lg:col-span-7 xl:col-span-8">
          {activeQuestion ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Editar Questão{' '}
                    <span className="font-mono-tabular">
                      {questions.findIndex((q) => q.id === activeQuestion.id) +
                        1}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Alterações são aplicadas instantaneamente à visualização do
                    aluno.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteQuestion(activeQuestion)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 whitespace-nowrap"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover
                </button>
              </div>

              <div className="mt-5 space-y-5">
                <div>
                  <label
                    htmlFor="question-prompt"
                    className="block text-sm font-medium text-slate-800"
                  >
                    Enunciado da questão
                  </label>
                  <textarea
                    id="question-prompt"
                    rows={3}
                    value={activeQuestion.q}
                    onChange={(e) => updateActive({ q: e.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 focus:border-[#2457a6] focus:outline-none"
                    placeholder="Digite o enunciado da pergunta..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800">
                      Alternativas e gabarito
                    </span>
                    <button
                      type="button"
                      onClick={addOption}
                      disabled={activeQuestion.a.length >= 6}
                      className="text-xs font-semibold text-[#2457a6] hover:underline disabled:opacity-40"
                    >
                      + Adicionar alternativa
                    </button>
                  </div>

                  <div className="mt-2.5 space-y-2.5">
                    {activeQuestion.a.map((opt, idx) => {
                      const isCorrect = activeQuestion.c === idx;
                      const letter = String.fromCharCode(65 + idx);
                      return (
                        <div
                          key={idx}
                          className={`flex items-center gap-2.5 rounded-lg border p-2 ${
                            isCorrect
                              ? 'border-emerald-300 bg-emerald-50/50'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <label className="flex cursor-pointer items-center gap-2 px-1.5 text-xs font-semibold text-slate-700 shrink-0">
                            <input
                              type="radio"
                              name={`correct-${activeQuestion.id}`}
                              checked={isCorrect}
                              onChange={() => updateActive({ c: idx })}
                              className="h-4 w-4 accent-emerald-700"
                            />
                            <span className="font-mono-tabular">{letter})</span>
                          </label>

                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateOption(idx, e.target.value)}
                            className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-slate-900 focus:border-slate-300 focus:bg-white focus:outline-none"
                            placeholder={`Texto da alternativa ${letter}`}
                          />

                          {isCorrect && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 shrink-0 pr-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Correta
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => removeOption(idx)}
                            disabled={activeQuestion.a.length <= 2}
                            title="Remover alternativa"
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-700 disabled:opacity-25 shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="question-explanation"
                    className="block text-sm font-medium text-slate-800"
                  >
                    Explicação / Devolutiva imediata ao aluno
                  </label>
                  <textarea
                    id="question-explanation"
                    rows={3}
                    value={activeQuestion.e}
                    onChange={(e) => updateActive({ e: e.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 focus:border-[#2457a6] focus:outline-none"
                    placeholder="Mensagem exibida logo após o aluno responder..."
                  />
                </div>

                {/* Live Mini Preview */}
                <div className="border-t border-slate-100 pt-5">
                  <p className="mb-3 text-xs font-semibold tracking-wide text-slate-500">
                    Pré-visualização rápida na página do aluno
                  </p>
                  <div
                    className="rounded-xl border border-slate-200 p-5"
                    style={{ backgroundColor: page.pageBgColor }}
                  >
                    <div className="rounded-xl bg-white p-5 shadow-sm">
                      <p className="text-base font-bold text-slate-900">
                        {activeQuestion.q}
                      </p>
                      <div className="mt-3 space-y-2">
                        {activeQuestion.a.map((opt, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-lg border px-3.5 py-2 text-sm font-medium text-slate-800"
                            style={{
                              backgroundColor:
                                idx === activeQuestion.c
                                  ? '#e7f7ed'
                                  : page.lightTintColor,
                              borderColor:
                                idx === activeQuestion.c
                                  ? '#16834a'
                                  : 'transparent',
                            }}
                          >
                            <span>
                              {String.fromCharCode(65 + idx)}) {opt}
                            </span>
                            {idx === activeQuestion.c && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#16834a]">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Gabarito
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
              <p className="text-base font-medium text-slate-700">
                Nenhuma questão selecionada.
              </p>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#2457a6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4687]"
              >
                <Plus className="h-4 w-4" />
                Criar primeira questão
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Bulk Paste Modal */}
      {showBulkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Importar questões em lote por texto
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Separe cada questão por uma linha em branco. Use{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
                A) B) C) D)
              </code>{' '}
              para as alternativas,{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
                Resposta: B
              </code>{' '}
              e{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
                Explicação: ...
              </code>
              .
            </p>

            <textarea
              rows={9}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="mt-4 w-full rounded-lg border border-slate-200 p-3 font-mono-tabular text-xs leading-relaxed text-slate-900 focus:border-[#2457a6] focus:outline-none"
              placeholder={`1. Qual palavra é sinônimo de 'alegre'?\nA) Triste\nB) Contente\nC) Cansado\nD) Irritado\nResposta: B\nExplicação: 'Contente' possui sentido semelhante a 'alegre'.`}
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-sm text-slate-700">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="bulk-mode"
                    checked={bulkMode === 'append'}
                    onChange={() => setBulkMode('append')}
                  />
                  Adicionar às atuais
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="bulk-mode"
                    checked={bulkMode === 'replace'}
                    onChange={() => setBulkMode('replace')}
                  />
                  Substituir todas
                </label>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleBulkSubmit}
                  className="rounded-lg bg-[#2457a6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4687]"
                >
                  Importar questões
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
