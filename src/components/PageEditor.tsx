import React from 'react';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import {
  CardRadiusOption,
  ConfirmDialogState,
  FontOption,
  PageConfig,
  QuizProject,
} from '../types/quiz';
import { QuizPlayer } from './QuizPlayer';

interface PageEditorProps {
  project: QuizProject;
  onChangePage: (page: PageConfig) => void;
  onResetDefault: () => void;
  onRequestConfirm: (dialog: Omit<ConfirmDialogState, 'isOpen'>) => void;
}

const COLOR_PRESETS: Array<{
  name: string;
  accent: string;
  tint: string;
  bg: string;
}> = [
  { name: 'Azul Clássico', accent: '#2457a6', tint: '#eef4ff', bg: '#f3f6fb' },
  { name: 'Verde Botânico', accent: '#15803d', tint: '#ecfdf5', bg: '#f3f8f5' },
  { name: 'Índigo Acadêmico', accent: '#4338ca', tint: '#eef2ff', bg: '#f5f6fb' },
  { name: 'Rubi Editorial', accent: '#b91c1c', tint: '#fef2f2', bg: '#faf5f5' },
  { name: 'Ardósia Sobria', accent: '#1e293b', tint: '#f1f5f9', bg: '#f8fafc' },
];

export const PageEditor: React.FC<PageEditorProps> = ({
  project,
  onChangePage,
  onResetDefault,
  onRequestConfirm,
}) => {
  const { page } = project;

  const update = (patch: Partial<PageConfig>) => {
    onChangePage({ ...page, ...patch });
  };

  const updateBullet = (idx: number, val: string) => {
    const next = [...page.bullets];
    next[idx] = val;
    update({ bullets: next });
  };

  const addBullet = () => {
    update({ bullets: [...page.bullets, 'Nova instrução da atividade;'] });
  };

  const removeBullet = (idx: number) => {
    update({ bullets: page.bullets.filter((_, i) => i !== idx) });
  };

  const handleReset = () => {
    onRequestConfirm({
      title: 'Restaurar página e questões originais?',
      description:
        'Todas as modificações feitas no texto, estilo visual e questões serão revertidas para o modelo original do Desafio da Língua Portuguesa.',
      confirmLabel: 'Restaurar original',
      variant: 'danger',
      onConfirm: onResetDefault,
    });
  };

  return (
    <div className="mx-auto max-w-[1360px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Personalizar Página da Atividade
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Modifique cabeçalho, instruções, cores, tipografia e mensagens
            finais com pré-visualização interativa ao lado.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          <RotateCcw className="h-4 w-4 text-slate-500" />
          Restaurar Modelo Original
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Controls Column */}
        <div className="space-y-6 lg:col-span-5">
          {/* Texts & Identity */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-slate-900">
              01. Identidade e Textos de Abertura
            </h2>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Nome do Professor
                  </label>
                  <input
                    type="text"
                    value={page.teacherName}
                    onChange={(e) => update({ teacherName: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#2457a6] focus:outline-none"
                    placeholder="Ex: Prof. Cláudio Lucena"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Turma / Tema Direcionado
                  </label>
                  <input
                    type="text"
                    value={page.targetGroup}
                    onChange={(e) => update({ targetGroup: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#2457a6] focus:outline-none"
                    placeholder="Ex: 8º Ano B · Semântica"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Título principal da página
                </label>
                <input
                  type="text"
                  value={page.title}
                  onChange={(e) => update({ title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 focus:border-[#2457a6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Texto de apresentação
                </label>
                <textarea
                  rows={2}
                  value={page.subtitle}
                  onChange={(e) => update({ subtitle: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#2457a6] focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-700">
                    Tópicos da tela inicial
                  </label>
                  <button
                    type="button"
                    onClick={addBullet}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#2457a6] hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar linha
                  </button>
                </div>
                <div className="mt-1.5 space-y-2">
                  {page.bullets.map((bullet, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={bullet}
                        onChange={(e) => updateBullet(idx, e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-[#2457a6] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeBullet(idx)}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700"
                        title="Remover tópico"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Botão iniciar
                  </label>
                  <input
                    type="text"
                    value={page.startButtonLabel}
                    onChange={(e) =>
                      update({ startButtonLabel: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#2457a6] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Botão refazer
                  </label>
                  <input
                    type="text"
                    value={page.retryButtonLabel}
                    onChange={(e) =>
                      update({ retryButtonLabel: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#2457a6] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Visual Theme */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-slate-900">
              02. Aparência e Tipografia
            </h2>

            <div className="mt-4 space-y-4">
              <div>
                <span className="block text-xs font-medium text-slate-700">
                  Paletas prontas
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {COLOR_PRESETS.map((preset) => {
                    const isSelected =
                      page.accentColor.toLowerCase() ===
                      preset.accent.toLowerCase();
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() =>
                          update({
                            accentColor: preset.accent,
                            lightTintColor: preset.tint,
                            pageBgColor: preset.bg,
                          })
                        }
                        className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                          isSelected
                            ? 'border-slate-900 bg-slate-50 text-slate-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: preset.accent }}
                        />
                        <span className="truncate">{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Cor principal
                  </label>
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
                    <input
                      type="color"
                      value={page.accentColor}
                      onChange={(e) => update({ accentColor: e.target.value })}
                      className="h-6 w-7 cursor-pointer border-0 bg-transparent p-0"
                    />
                    <span className="font-mono-tabular text-xs text-slate-600">
                      {page.accentColor}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Cor das opções
                  </label>
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
                    <input
                      type="color"
                      value={page.lightTintColor}
                      onChange={(e) =>
                        update({ lightTintColor: e.target.value })
                      }
                      className="h-6 w-7 cursor-pointer border-0 bg-transparent p-0"
                    />
                    <span className="font-mono-tabular text-xs text-slate-600">
                      {page.lightTintColor}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Fundo da página
                  </label>
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
                    <input
                      type="color"
                      value={page.pageBgColor}
                      onChange={(e) => update({ pageBgColor: e.target.value })}
                      className="h-6 w-7 cursor-pointer border-0 bg-transparent p-0"
                    />
                    <span className="font-mono-tabular text-xs text-slate-600">
                      {page.pageBgColor}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Tipografia da página
                  </label>
                  <select
                    value={page.fontOption}
                    onChange={(e) =>
                      update({ fontOption: e.target.value as FontOption })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#2457a6] focus:outline-none"
                  >
                    <option value="sans">Arial (Clássica leve)</option>
                    <option value="jakarta">Plus Jakarta Sans (Moderna)</option>
                    <option value="serif">Georgia (Editorial / Leitura)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Cantos do cartão
                  </label>
                  <select
                    value={page.cardRadius}
                    onChange={(e) =>
                      update({
                        cardRadius: e.target.value as CardRadiusOption,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#2457a6] focus:outline-none"
                  >
                    <option value="compact">Compacto (10px)</option>
                    <option value="rounded">Padrão (18px)</option>
                    <option value="soft">Suave (24px)</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Final Result Messages */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-slate-900">
              03. Mensagens de Desempenho Final
            </h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Título ao concluir
                </label>
                <input
                  type="text"
                  value={page.finishTitle}
                  onChange={(e) => update({ finishTitle: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#2457a6] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  100% de acertos
                </label>
                <input
                  type="text"
                  value={page.resultMessages.perfect}
                  onChange={(e) =>
                    update({
                      resultMessages: {
                        ...page.resultMessages,
                        perfect: e.target.value,
                      },
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-[#2457a6] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  70% a 99% de acertos
                </label>
                <input
                  type="text"
                  value={page.resultMessages.great}
                  onChange={(e) =>
                    update({
                      resultMessages: {
                        ...page.resultMessages,
                        great: e.target.value,
                      },
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-[#2457a6] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  50% a 69% de acertos
                </label>
                <input
                  type="text"
                  value={page.resultMessages.good}
                  onChange={(e) =>
                    update({
                      resultMessages: {
                        ...page.resultMessages,
                        good: e.target.value,
                      },
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-[#2457a6] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Abaixo de 50%
                </label>
                <input
                  type="text"
                  value={page.resultMessages.retry}
                  onChange={(e) =>
                    update({
                      resultMessages: {
                        ...page.resultMessages,
                        retry: e.target.value,
                      },
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-[#2457a6] focus:outline-none"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Live Preview Stage */}
        <div className="lg:col-span-7">
          <div className="sticky top-20 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-xs font-semibold text-slate-700">
                Pré-visualização interativa da página
              </span>
              <span className="font-mono-tabular text-xs text-slate-500">
                {project.questions.length} questões
              </span>
            </div>
            <QuizPlayer project={project} compact />
          </div>
        </div>
      </div>
    </div>
  );
};
