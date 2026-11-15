import React, { useCallback, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FolderOpen,
  LayoutTemplate,
  PenLine,
  X,
  XCircle,
} from 'lucide-react';
import { DEFAULT_QUIZ_PROJECT } from './data/defaultQuiz';
import {
  ConfirmDialogState,
  PageConfig,
  QuizProject,
  QuizQuestion,
  WorkspaceTab,
} from './types/quiz';
import {
  clearAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from './services/googleAuth';
import {
  getDriveFileMetadata,
  readDriveFileContent,
} from './services/googleDrive';
import {
  generateStandaloneHtml,
  parseImportedContent,
} from './utils/htmlGenerator';
import { QuizPlayer } from './components/QuizPlayer';
import { ExerciseEditor } from './components/ExerciseEditor';
import { PageEditor } from './components/PageEditor';
import { DriveManager } from './components/DriveManager';
import { ConfirmModal } from './components/ConfirmModal';
import { GoogleSignInButton } from './components/GoogleSignInButton';

const STORAGE_KEY = 'studio_quiz_project_v1';

function loadInitialProject(): QuizProject {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_QUIZ_PROJECT;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.page &&
      Array.isArray(parsed.questions)
    ) {
      return {
        page: { ...DEFAULT_QUIZ_PROJECT.page, ...parsed.page },
        questions: parsed.questions,
        driveLink: parsed.driveLink || null,
      };
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_QUIZ_PROJECT;
}

export default function App() {
  const [project, setProject] = useState<QuizProject>(loadInitialProject);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('student');

  // Google Workspace Auth state (access token kept strictly in memory)
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // URL-targeted Drive exercise (?driveId=...)
  const [pendingDriveId, setPendingDriveId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('driveId');
  });
  const [loadingTargetDrive, setLoadingTargetDrive] = useState(false);

  // Notifications & Confirm Modal
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    description: '',
    confirmLabel: 'Confirmar',
    onConfirm: () => {},
  });

  const notify = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      setToast({ message, type });
    },
    []
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Persist teacher quiz draft locally (never stores OAuth tokens)
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch {
      // ignore quota errors
    }
  }, [project]);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser, token) => {
        setUser(authedUser);
        setAccessToken(token);
      },
      (existingUser) => {
        setUser(existingUser);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Load targeted Drive file when ?driveId= is present and token is ready
  useEffect(() => {
    if (!pendingDriveId || !accessToken) return;
    let cancelled = false;

    const loadTargeted = async () => {
      setLoadingTargetDrive(true);
      try {
        const meta = await getDriveFileMetadata(accessToken, pendingDriveId);
        const content = await readDriveFileContent(accessToken, meta);
        const { project: parsed, summary } = parseImportedContent(
          content,
          meta.name
        );
        if (cancelled) return;
        setProject((prev) => ({
          page: parsed.page ? { ...prev.page, ...parsed.page } : prev.page,
          questions: parsed.questions ?? prev.questions,
          driveLink: {
            fileId: meta.id,
            fileName: meta.name,
            folderId: meta.parents?.[0],
            webViewLink: meta.webViewLink,
            lastSyncedAt: new Date().toISOString(),
          },
        }));
        setPendingDriveId(null);
        setActiveTab('student');
        notify(`Atividade direcionada carregada: ${meta.name} (${summary})`);
      } catch (err) {
        if (!cancelled) {
          notify(
            err instanceof Error
              ? err.message
              : 'Não foi possível carregar o exercício direcionado do Google Drive.',
            'error'
          );
        }
      } finally {
        if (!cancelled) setLoadingTargetDrive(false);
      }
    };

    loadTargeted();
    return () => {
      cancelled = true;
    };
  }, [pendingDriveId, accessToken, notify]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      setUser(result.user);
      setAccessToken(result.accessToken);
      notify('Google Drive conectado com sucesso.');
    } catch (err) {
      notify(
        err instanceof Error
          ? err.message
          : 'Não foi possível conectar ao Google Drive.',
        'error'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    notify('Desconectado do Google Drive.');
  };

  const handleSessionExpired = useCallback(() => {
    clearAccessToken();
    setAccessToken(null);
  }, []);

  const handleDownloadHtml = () => {
    const html = generateStandaloneHtml(project);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const safeName =
      project.page.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'atividade';
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    notify('Arquivo HTML offline baixado.');
  };

  const handleChangeQuestions = (questions: QuizQuestion[]) => {
    setProject((prev) => ({ ...prev, questions }));
  };

  const handleChangePage = (page: PageConfig) => {
    setProject((prev) => ({ ...prev, page }));
  };

  const handleImportProject = (
    partial: Partial<QuizProject>,
    summary: string
  ) => {
    setProject((prev) => ({
      ...prev,
      page: partial.page ? { ...prev.page, ...partial.page } : prev.page,
      questions: partial.questions ?? prev.questions,
    }));
    notify(summary);
  };

  const handleLoadProjectFromDrive = (
    partial: Partial<QuizProject>,
    driveInfo: NonNullable<QuizProject['driveLink']>,
    summary: string,
    goToStudent = false
  ) => {
    setProject((prev) => ({
      page: partial.page ? { ...prev.page, ...partial.page } : prev.page,
      questions: partial.questions ?? prev.questions,
      driveLink: driveInfo,
    }));
    if (goToStudent) {
      setActiveTab('student');
    }
    notify(summary);
  };

  const handleUpdateDriveLink = (
    driveInfo: NonNullable<QuizProject['driveLink']>
  ) => {
    setProject((prev) => ({ ...prev, driveLink: driveInfo }));
  };

  const handleResetDefault = () => {
    setProject(DEFAULT_QUIZ_PROJECT);
    notify('Página e questões restauradas para o modelo original.');
  };

  const requestConfirm = (dialog: Omit<ConfirmDialogState, 'isOpen'>) => {
    setConfirmDialog({ ...dialog, isOpen: true });
  };

  const navItems: Array<{ id: WorkspaceTab; label: string }> = [
    { id: 'student', label: 'Atividade' },
    { id: 'exercises', label: 'Exercícios' },
    { id: 'page', label: 'Página' },
    { id: 'drive', label: 'Google Drive' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Zone 1: Brand Title */}
          <button
            type="button"
            onClick={() => setActiveTab('student')}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 text-left focus:outline-none"
          >
            Estúdio Pedagógico
          </button>

          {/* Zone 2: 4 single-line text nav links */}
          <nav
            aria-label="Navegação principal"
            className="flex items-center gap-5 overflow-x-auto sm:gap-7"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`border-b-2 py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-[#2457a6] text-[#2457a6]'
                      : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#2457a6] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1d4687] whitespace-nowrap shrink-0 sm:text-sm"
            >
              <Download className="h-4 w-4" />
              Baixar HTML
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {activeTab === 'student' && (
          <div>
            {/* Workspace Toolbar below header */}
            <div className="border-b border-slate-200 bg-white/80">
              <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
                <div className="text-xs text-slate-600 sm:text-sm">
                  <span className="font-semibold text-slate-900">
                    {project.page.title}
                  </span>
                  <span className="mx-2 text-slate-300">·</span>
                  <span className="font-mono-tabular">
                    {project.questions.length} questões
                  </span>
                  {project.driveLink && (
                    <>
                      <span className="mx-2 text-slate-300">·</span>
                      <span>
                        Drive: <strong>{project.driveLink.fileName}</strong>
                      </span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('exercises')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <PenLine className="h-3.5 w-3.5 text-slate-500" />
                    Editar Exercícios
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('page')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <LayoutTemplate className="h-3.5 w-3.5 text-slate-500" />
                    Modificar Página
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('drive')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <FolderOpen className="h-3.5 w-3.5 text-[#2457a6]" />
                    Google Drive
                  </button>
                  {project.driveLink?.webViewLink && (
                    <a
                      href={project.driveLink.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                      Ver no Drive
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Targeted Drive File Prompt if opened with ?driveId=... */}
            {pendingDriveId && !accessToken && (
              <div className="mx-auto mt-6 max-w-[720px] px-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h2 className="text-base font-semibold text-slate-900">
                    Atividade direcionada pelo Google Drive
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Esta página recebeu o link de uma lista de exercícios
                    específica no Google Drive. Conecte sua conta Google para
                    carregá-la agora.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <GoogleSignInButton
                      onClick={handleLogin}
                      loading={isLoggingIn}
                      label="Entrar com o Google para abrir"
                    />
                    <button
                      type="button"
                      onClick={() => setPendingDriveId(null)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Continuar com atividade atual
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loadingTargetDrive && (
              <div className="mx-auto mt-6 max-w-[720px] px-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
                  Carregando exercício direcionado do Google Drive...
                </div>
              </div>
            )}

            <QuizPlayer project={project} />
          </div>
        )}

        {activeTab === 'exercises' && (
          <ExerciseEditor
            project={project}
            onChangeQuestions={handleChangeQuestions}
            onImportProject={handleImportProject}
            onRequestConfirm={requestConfirm}
            onNotify={notify}
          />
        )}

        {activeTab === 'page' && (
          <PageEditor
            project={project}
            onChangePage={handleChangePage}
            onResetDefault={handleResetDefault}
            onRequestConfirm={requestConfirm}
          />
        )}

        {activeTab === 'drive' && (
          <DriveManager
            user={user}
            accessToken={accessToken}
            isLoggingIn={isLoggingIn}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onSessionExpired={handleSessionExpired}
            project={project}
            onLoadProjectFromDrive={handleLoadProjectFromDrive}
            onUpdateDriveLink={handleUpdateDriveLink}
            onRequestConfirm={requestConfirm}
            onNotify={notify}
          />
        )}
      </main>

      {/* Confirmation Modal */}
      <ConfirmModal
        dialog={confirmDialog}
        onClose={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      />

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-4 bottom-4 z-50 flex max-w-md items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg"
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16834a]" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#bd3434]" />
          )}
          <span className="text-sm font-medium text-slate-800">
            {toast.message}
          </span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-1 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar notificação"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
