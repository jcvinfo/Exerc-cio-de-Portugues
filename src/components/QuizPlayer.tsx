import React, { useEffect, useState } from 'react';
import { CheckCircle2, RotateCcw, XCircle, ArrowRight } from 'lucide-react';
import { PageConfig, QuizProject } from '../types/quiz';

interface QuizPlayerProps {
  project: QuizProject;
  compact?: boolean;
}

type Stage = 'start' | 'quiz' | 'result';

function getFontStyle(fontOption: PageConfig['fontOption']): string {
  switch (fontOption) {
    case 'serif':
      return 'Georgia, "Times New Roman", serif';
    case 'jakarta':
      return '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
    case 'sans':
    default:
      return 'Arial, Helvetica, sans-serif';
  }
}

function getRadiusClass(radius: PageConfig['cardRadius']): string {
  switch (radius) {
    case 'compact':
      return 'rounded-xl';
    case 'soft':
      return 'rounded-3xl';
    case 'rounded':
    default:
      return 'rounded-[18px]';
  }
}

export const QuizPlayer: React.FC<QuizPlayerProps> = ({
  project,
  compact = false,
}) => {
  const { page, questions } = project;
  const [stage, setStage] = useState<Stage>('start');
  const [index, setIndex] = useState(0);
  const [points, setPoints] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);

  // Reset stage cleanly if all questions are removed or index out of bounds
  useEffect(() => {
    if (index >= questions.length && questions.length > 0) {
      setIndex(0);
      setSelectedChoice(null);
    }
    if (questions.length === 0 && stage !== 'start') {
      setStage('start');
    }
  }, [questions.length, index, stage]);

  const startQuiz = () => {
    if (questions.length === 0) return;
    setIndex(0);
    setPoints(0);
    setSelectedChoice(null);
    setStage('quiz');
  };

  const handleChoose = (choiceIdx: number) => {
    if (selectedChoice !== null) return;
    setSelectedChoice(choiceIdx);
    const current = questions[index];
    if (current && choiceIdx === current.c) {
      setPoints((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (index < questions.length - 1) {
      setIndex((prev) => prev + 1);
      setSelectedChoice(null);
    } else {
      setStage('result');
    }
  };

  const currentQuestion = questions[index];
  const progressPercent =
    stage === 'result'
      ? 100
      : questions.length > 0
        ? (index / questions.length) * 100
        : 0;

  const getResultMessage = () => {
    if (questions.length === 0) return '';
    const ratio = points / questions.length;
    if (ratio === 1) return page.resultMessages.perfect;
    if (ratio >= 0.7) return page.resultMessages.great;
    if (ratio >= 0.5) return page.resultMessages.good;
    return page.resultMessages.retry;
  };

  const teacherMeta = [page.teacherName.trim(), page.targetGroup.trim()]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className={`w-full transition-colors ${compact ? 'p-4' : 'px-4 py-8 sm:px-6 sm:py-12'}`}
      style={{
        backgroundColor: page.pageBgColor,
        fontFamily: getFontStyle(page.fontOption),
      }}
    >
      <div
        className={`mx-auto w-full max-w-[720px] bg-white shadow-[0_8px_28px_rgba(23,37,84,0.09)] ${getRadiusClass(
          page.cardRadius
        )} ${compact ? 'p-6' : 'p-6 sm:p-8'}`}
      >
        {stage === 'start' && (
          <div>
            {teacherMeta && (
              <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500">
                {teacherMeta}
              </p>
            )}
            <h1
              className="text-2xl font-bold leading-tight sm:text-3xl"
              style={{ color: page.accentColor, textWrap: 'balance' }}
            >
              {page.title || 'Atividade sem título'}
            </h1>
            {page.subtitle && (
              <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
                {page.subtitle}
              </p>
            )}

            {page.bullets.filter((b) => b.trim()).length > 0 && (
              <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-600">
                {page.bullets
                  .filter((b) => b.trim())
                  .map((bullet, idx) => (
                    <li key={idx}>{bullet}</li>
                  ))}
              </ul>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={startQuiz}
                disabled={questions.length === 0}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] px-5 py-3 text-base font-bold text-white transition-opacity hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
                style={{ backgroundColor: page.accentColor }}
              >
                {page.startButtonLabel || 'Começar atividade'}
              </button>

              {questions.length === 0 && (
                <span className="text-sm font-medium text-amber-700">
                  Adicione ao menos 1 questão para iniciar.
                </span>
              )}
            </div>
          </div>
        )}

        {stage === 'quiz' && currentQuestion && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-slate-600">
              <span className="font-mono-tabular">
                Questão {index + 1} de {questions.length}
              </span>
              <span className="font-mono-tabular">Pontos: {points}</span>
            </div>

            <div className="my-4 h-[9px] w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full transition-all duration-200"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: page.accentColor,
                }}
              />
            </div>

            <h2 className="mt-5 text-lg font-bold leading-snug text-slate-900 sm:text-xl">
              {currentQuestion.q}
            </h2>

            <div className="mt-4 space-y-2.5">
              {currentQuestion.a.map((answer, i) => {
                const isAnswered = selectedChoice !== null;
                const isCorrectOption = i === currentQuestion.c;
                const isSelectedWrong =
                  isAnswered && i === selectedChoice && !isCorrectOption;

                let borderColor = 'transparent';
                let bgColor = page.lightTintColor;

                if (isAnswered && isCorrectOption) {
                  bgColor = '#e7f7ed';
                  borderColor = '#16834a';
                } else if (isSelectedWrong) {
                  bgColor = '#fff0f0';
                  borderColor = '#bd3434';
                }

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleChoose(i)}
                    className="flex min-h-[46px] w-full items-center justify-between gap-3 rounded-[10px] border-2 px-4 py-3 text-left text-[15px] font-semibold text-slate-900 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{
                      backgroundColor: bgColor,
                      borderColor,
                    }}
                    onMouseEnter={(e) => {
                      if (!isAnswered) {
                        e.currentTarget.style.borderColor = page.accentColor;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isAnswered) {
                        e.currentTarget.style.borderColor = 'transparent';
                      }
                    }}
                  >
                    <span>
                      {String.fromCharCode(65 + i)}) {answer}
                    </span>

                    {isAnswered && isCorrectOption && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#16834a] shrink-0">
                        <CheckCircle2 className="h-4 w-4" />
                        Correta
                      </span>
                    )}
                    {isSelectedWrong && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#bd3434] shrink-0">
                        <XCircle className="h-4 w-4" />
                        Incorreta
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedChoice !== null && (
              <div
                aria-live="polite"
                className="mt-4 flex items-start gap-2.5 rounded-[10px] p-3.5 text-sm leading-relaxed text-slate-800"
                style={{
                  backgroundColor:
                    selectedChoice === currentQuestion.c ? '#e7f7ed' : '#fff0f0',
                }}
              >
                {selectedChoice === currentQuestion.c ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#16834a]" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#bd3434]" />
                )}
                <div>
                  <span className="font-bold">
                    {selectedChoice === currentQuestion.c
                      ? 'Muito bem! Resposta correta. '
                      : 'Não foi dessa vez. '}
                  </span>
                  <span>{currentQuestion.e}</span>
                </div>
              </div>
            )}

            {selectedChoice !== null && (
              <div className="mt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] px-5 py-3 text-base font-bold text-white transition-opacity hover:opacity-95 whitespace-nowrap"
                  style={{ backgroundColor: page.accentColor }}
                >
                  {index === questions.length - 1
                    ? 'Ver resultado'
                    : 'Próxima questão'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {stage === 'result' && (
          <div>
            <h1
              className="text-2xl font-bold leading-tight sm:text-3xl"
              style={{ color: page.accentColor }}
            >
              {page.finishTitle || 'Atividade concluída!'}
            </h1>
            <h2 className="mt-4 font-mono-tabular text-xl font-bold text-slate-900">
              Você acertou {points} de {questions.length} questões (
              {questions.length > 0
                ? Math.round((points / questions.length) * 100)
                : 0}
              %).
            </h2>
            <p className="mt-2.5 text-[15px] leading-relaxed text-slate-600">
              {getResultMessage()}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startQuiz}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] px-5 py-3 text-base font-bold text-white transition-opacity hover:opacity-95 whitespace-nowrap"
                style={{ backgroundColor: page.accentColor }}
              >
                <RotateCcw className="h-4 w-4" />
                {page.retryButtonLabel || 'Refazer atividade'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
