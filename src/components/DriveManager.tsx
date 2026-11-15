import React, { useCallback, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  FileCode2,
  FileJson,
  FileText,
  Folder,
  FolderPlus,
  HelpCircle,
  LogOut,
  RefreshCw,
  Save,
  Search,
  Share2,
  Trash2,
} from 'lucide-react';
import {
  ConfirmDialogState,
  DriveBreadcrumb,
  DriveFileItem,
  QuizProject,
} from '../types/quiz';
import {
  createDriveFile,
  createDriveFolder,
  FOLDER_MIME,
  GOOGLE_DOC_MIME,
  listDriveFiles,
  readDriveFileContent,
  shareDriveFilePublicRead,
  trashDriveFile,
  updateDriveFile,
} from '../services/googleDrive';
import { generateStandaloneHtml, parseImportedContent } from '../utils/htmlGenerator';
import { GoogleSignInButton } from './GoogleSignInButton';

interface DriveManagerProps {
  user: User | null;
  accessToken: string | null;
  isLoggingIn: boolean;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onSessionExpired: () => void;
  project: QuizProject;
  onLoadProjectFromDrive: (
    partial: Partial<QuizProject>,
    driveInfo: NonNullable<QuizProject['driveLink']>,
    summary: string,
    goToStudent?: boolean
  ) => void;
  onUpdateDriveLink: (driveInfo: NonNullable<QuizProject['driveLink']>) => void;
  onRequestConfirm: (dialog: Omit<ConfirmDialogState, 'isOpen'>) => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

function slugifyFileName(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'atividade_portugues'
  );
}

function formatDate(iso?: string): string {
  if (!iso) return 'Data desconhecida';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function describeMime(item: DriveFileItem): string {
  if (item.mimeType === FOLDER_MIME) return 'Pasta';
  if (item.mimeType === GOOGLE_DOC_MIME) return 'Google Docs';
  if (item.name.endsWith('.html') || item.mimeType === 'text/html')
    return 'Página HTML';
  if (item.name.endsWith('.json') || item.mimeType === 'application/json')
    return 'Pacote JSON';
  if (item.name.endsWith('.txt') || item.mimeType === 'text/plain')
    return 'Texto';
  return 'Arquivo';
}

export const DriveManager: React.FC<DriveManagerProps> = ({
  user,
  accessToken,
  isLoggingIn,
  onLogin,
  onLogout,
  onSessionExpired,
  project,
  onLoadProjectFromDrive,
  onUpdateDriveLink,
  onRequestConfirm,
  onNotify,
}) => {
  const [breadcrumbs, setBreadcrumbs] = useState<DriveBreadcrumb[]>([
    { id: 'root', name: 'Meu Drive' },
  ]);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'exercises' | 'all' | 'folders'>(
    'exercises'
  );

  // New folder state
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Save/Publish form state
  const [saveBaseName, setSaveBaseName] = useState(() =>
    slugifyFileName(project.page.title)
  );
  const [saveFormat, setSaveFormat] = useState<'html' | 'json' | 'both'>('both');
  const [showDocGuide, setShowDocGuide] = useState(false);

  const currentFolder = breadcrumbs[breadcrumbs.length - 1];

  const loadFiles = useCallback(async () => {
    if (!accessToken) return;
    setLoadingFiles(true);
    try {
      const items = await listDriveFiles(accessToken, {
        folderId: currentFolder.id,
        query: searchQuery,
        filter: filterMode,
      });
      setFiles(items);
    } catch (err) {
      const errWithCode = err as Error & { code?: number };
      if (errWithCode.code === 401) {
        onSessionExpired();
      }
      onNotify(
        err instanceof Error
          ? err.message
          : 'Erro ao listar arquivos do Google Drive.',
        'error'
      );
    } finally {
      setLoadingFiles(false);
    }
  }, [accessToken, currentFolder.id, searchQuery, filterMode, onNotify, onSessionExpired]);

  useEffect(() => {
    if (accessToken) {
      loadFiles();
    } else {
      setFiles([]);
    }
  }, [accessToken, loadFiles]);

  const handleOpenFolder = (folder: DriveFileItem) => {
    setSearchQuery('');
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    setSearchQuery('');
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newFolderName.trim()) return;
    setBusyActionId('new-folder');
    try {
      await createDriveFolder(
        accessToken,
        newFolderName.trim(),
        currentFolder.id
      );
      setNewFolderName('');
      setShowNewFolder(false);
      onNotify('Pasta criada no Google Drive.');
      await loadFiles();
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Falha ao criar pasta.',
        'error'
      );
    } finally {
      setBusyActionId(null);
    }
  };

  const handleImportFromDrive = async (
    item: DriveFileItem,
    goToStudent = false
  ) => {
    if (!accessToken) return;
    setBusyActionId(item.id);
    try {
      const content = await readDriveFileContent(accessToken, item);
      const { project: parsed, summary } = parseImportedContent(
        content,
        item.name
      );
      onLoadProjectFromDrive(
        parsed,
        {
          fileId: item.id,
          fileName: item.name,
          folderId: item.parents?.[0],
          webViewLink: item.webViewLink,
          lastSyncedAt: new Date().toISOString(),
        },
        `${item.name}: ${summary}`,
        goToStudent
      );
    } catch (err) {
      onNotify(
        err instanceof Error
          ? err.message
          : 'Não foi possível importar este arquivo.',
        'error'
      );
    } finally {
      setBusyActionId(null);
    }
  };

  const handlePublishNewFiles = async () => {
    if (!accessToken) return;
    const cleanBase = slugifyFileName(saveBaseName || project.page.title);
    setBusyActionId('publish-new');
    try {
      let linkedItem: DriveFileItem | null = null;

      if (saveFormat === 'json' || saveFormat === 'both') {
        const jsonContent = JSON.stringify(
          { page: project.page, questions: project.questions },
          null,
          2
        );
        linkedItem = await createDriveFile(accessToken, {
          name: `${cleanBase}.json`,
          content: jsonContent,
          mimeType: 'application/json',
          folderId: currentFolder.id,
        });
      }

      if (saveFormat === 'html' || saveFormat === 'both') {
        const htmlContent = generateStandaloneHtml(project);
        const htmlItem = await createDriveFile(accessToken, {
          name: `${cleanBase}.html`,
          content: htmlContent,
          mimeType: 'text/html',
          folderId: currentFolder.id,
        });
        if (!linkedItem) linkedItem = htmlItem;
      }

      if (linkedItem) {
        onUpdateDriveLink({
          fileId: linkedItem.id,
          fileName: linkedItem.name,
          folderId: currentFolder.id,
          webViewLink: linkedItem.webViewLink,
          lastSyncedAt: new Date().toISOString(),
        });
      }

      onNotify(
        `Atividade salva em "${currentFolder.name}" no Google Drive.`
      );
      await loadFiles();
    } catch (err) {
      onNotify(
        err instanceof Error
          ? err.message
          : 'Falha ao salvar no Google Drive.',
        'error'
      );
    } finally {
      setBusyActionId(null);
    }
  };

  const handleConfirmOverwriteFile = (target: {
    fileId: string;
    fileName: string;
  }) => {
    if (!accessToken) return;
    const isHtml = target.fileName.toLowerCase().endsWith('.html');
    const isJson = target.fileName.toLowerCase().endsWith('.json');
    if (!isHtml && !isJson) {
      onNotify(
        'Atualização direta é suportada apenas para arquivos .html e .json. Use "Salvar na pasta" para criar um novo arquivo a partir de um Google Doc.',
        'error'
      );
      return;
    }

    onRequestConfirm({
      title: 'Sobrescrever arquivo no Google Drive?',
      description:
        'O conteúdo atual deste arquivo no seu Google Drive será substituído pela atividade editada no estúdio.',
      details: [
        `Arquivo: ${target.fileName}`,
        `Questões atuais: ${project.questions.length}`,
      ],
      confirmLabel: 'Atualizar arquivo',
      variant: 'primary',
      onConfirm: async () => {
        const content = isHtml
          ? generateStandaloneHtml(project)
          : JSON.stringify(
              { page: project.page, questions: project.questions },
              null,
              2
            );
        const updated = await updateDriveFile(accessToken, {
          fileId: target.fileId,
          name: target.fileName,
          content,
          mimeType: isHtml ? 'text/html' : 'application/json',
        });
        onUpdateDriveLink({
          fileId: updated.id,
          fileName: updated.name,
          folderId: updated.parents?.[0],
          webViewLink: updated.webViewLink,
          lastSyncedAt: new Date().toISOString(),
        });
        onNotify(`"${updated.name}" atualizado no Google Drive.`);
        await loadFiles();
      },
    });
  };

  const handleConfirmTrashFile = (item: DriveFileItem) => {
    if (!accessToken) return;
    onRequestConfirm({
      title: 'Mover arquivo para a lixeira do Google Drive?',
      description:
        'O item será movido para a lixeira da sua conta do Google Drive.',
      details: [`Item: ${item.name}`],
      confirmLabel: 'Mover para lixeira',
      variant: 'danger',
      onConfirm: async () => {
        await trashDriveFile(accessToken, item.id);
        onNotify(`"${item.name}" movido para a lixeira.`);
        await loadFiles();
      },
    });
  };

  const handleCopyDirectLink = (fileId: string) => {
    const url = `${window.location.origin}/?driveId=${encodeURIComponent(fileId)}`;
    navigator.clipboard.writeText(url);
    onNotify('Link direcionado do estúdio copiado para a área de transferência.');
  };

  const handleConfirmPublicShare = (item: DriveFileItem) => {
    if (!accessToken) return;
    onRequestConfirm({
      title: 'Tornar arquivo visível para quem tiver o link?',
      description:
        'Isso alterará a permissão deste arquivo no Google Drive para que qualquer aluno com o link possa visualizá-lo e abrir a atividade.',
      details: [`Arquivo: ${item.name}`, 'Permissão: Leitura para quem tem o link'],
      confirmLabel: 'Liberar acesso e copiar link',
      variant: 'primary',
      onConfirm: async () => {
        await shareDriveFilePublicRead(accessToken, item.id);
        const targetLink =
          item.webViewLink ||
          `https://drive.google.com/file/d/${item.id}/view`;
        await navigator.clipboard.writeText(targetLink);
        onNotify('Permissão atualizada e link do Google Drive copiado.');
      },
    });
  };

  if (!accessToken) {
    return (
      <div className="mx-auto max-w-[960px] px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10">
          <div className="max-w-xl">
            <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              Exercícios Direcionados via Google Drive
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
              Conecte sua conta Google para navegar pelas pastas da escola ou
              turma, importar atividades de Google Docs, HTML ou JSON, e salvar
              novas versões personalizadas diretamente no seu Google Drive.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <GoogleSignInButton
                onClick={onLogin}
                loading={isLoggingIn}
                label="Conectar com Google Drive"
              />
              {user && (
                <span className="text-xs text-slate-500">
                  Sessão anterior ({user.email}) precisa de nova permissão de
                  acesso ao Drive.
                </span>
              )}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  1. Organize por turma
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Crie pastas no Drive para cada turma e direcione listas
                  específicas de Semântica, Gramática ou Interpretação.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  2. Importe do Google Docs
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Escreva questões em um Google Doc ou importe arquivos HTML
                  existentes para editar tudo no painel.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  3. Publique para alunos
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Salve a página HTML pronta para funcionar offline direto na
                  pasta compartilhada da turma.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Connected Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Google Drive do Professor
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Conectado como{' '}
            <span className="font-medium text-slate-900">
              {user?.displayName || user?.email}
            </span>
            {user?.email ? ` (${user.email})` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadFiles}
            disabled={loadingFiles}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw
              className={`h-4 w-4 ${loadingFiles ? 'animate-spin' : ''}`}
            />
            Atualizar
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <LogOut className="h-4 w-4 text-slate-500" />
            Sair
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Drive File Browser */}
        <section className="lg:col-span-8">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            {/* Breadcrumbs & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <nav
                aria-label="Caminho da pasta"
                className="flex flex-wrap items-center gap-1 text-sm"
              >
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.id}>
                    {idx > 0 && (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                    <button
                      type="button"
                      onClick={() => handleBreadcrumbClick(idx)}
                      className={`rounded px-2 py-1 font-medium transition-colors ${
                        idx === breadcrumbs.length - 1
                          ? 'text-slate-900'
                          : 'text-[#2457a6] hover:bg-slate-100'
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </nav>

              <button
                type="button"
                onClick={() => setShowNewFolder((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <FolderPlus className="h-4 w-4 text-slate-500" />
                Nova Pasta
              </button>
            </div>

            {showNewFolder && (
              <form
                onSubmit={handleCreateFolder}
                className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nome da pasta (ex: 9º Ano - Semântica)"
                  className="min-w-[220px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-[#2457a6] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={busyActionId === 'new-folder' || !newFolderName.trim()}
                  className="rounded-lg bg-[#2457a6] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1d4687] disabled:opacity-50"
                >
                  Criar Pasta
                </button>
              </form>
            )}

            {/* Search & Filter */}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome no Google Drive..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2457a6] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setFilterMode('exercises')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    filterMode === 'exercises'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Atividades e Docs
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('folders')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    filterMode === 'folders'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pastas
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    filterMode === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos
                </button>
              </div>
            </div>

            {/* File List */}
            <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
              {loadingFiles ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  Carregando arquivos do Google Drive...
                </div>
              ) : files.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  Nenhum arquivo compatível encontrado nesta pasta. Crie uma
                  pasta ou salve sua atividade atual no painel ao lado.
                </div>
              ) : (
                files.map((item) => {
                  const isFolder = item.mimeType === FOLDER_MIME;
                  const isHtmlOrJson =
                    item.name.endsWith('.html') ||
                    item.name.endsWith('.json') ||
                    item.mimeType === 'text/html' ||
                    item.mimeType === 'application/json';
                  const isBusy = busyActionId === item.id;
                  const isLinked = project.driveLink?.fileId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          {isFolder ? (
                            <Folder className="h-4 w-4 text-[#2457a6]" />
                          ) : item.name.endsWith('.html') ? (
                            <FileCode2 className="h-4 w-4 text-emerald-700" />
                          ) : item.name.endsWith('.json') ? (
                            <FileJson className="h-4 w-4 text-[#2457a6]" />
                          ) : (
                            <FileText className="h-4 w-4 text-slate-600" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {isFolder ? (
                              <button
                                type="button"
                                onClick={() => handleOpenFolder(item)}
                                className="truncate text-left text-sm font-semibold text-slate-900 hover:text-[#2457a6] hover:underline"
                              >
                                {item.name}
                              </button>
                            ) : (
                              <span className="truncate text-sm font-semibold text-slate-900">
                                {item.name}
                              </span>
                            )}
                            {isLinked && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 shrink-0">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Em edição
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {describeMime(item)} ·{' '}
                            <span className="font-mono-tabular">
                              {formatDate(item.modifiedTime)}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        {isFolder ? (
                          <button
                            type="button"
                            onClick={() => handleOpenFolder(item)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                          >
                            Abrir pasta
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleImportFromDrive(item, false)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
                            >
                              {isBusy ? 'Abrindo...' : 'Editar'}
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleImportFromDrive(item, true)}
                              className="rounded-lg bg-[#eef4ff] px-2.5 py-1.5 text-xs font-semibold text-[#2457a6] hover:bg-[#dce8ff] disabled:opacity-50 whitespace-nowrap"
                            >
                              Aplicar ao Aluno
                            </button>
                            {isHtmlOrJson && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleConfirmOverwriteFile({
                                    fileId: item.id,
                                    fileName: item.name,
                                  })
                                }
                                title="Sobrescrever este arquivo com a atividade atual"
                                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                              >
                                <Save className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCopyDirectLink(item.id)}
                              title="Copiar link direcionado para abrir esta atividade"
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirmPublicShare(item)}
                              title="Liberar acesso de leitura no Drive e copiar link"
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </button>
                            {item.webViewLink && (
                              <a
                                href={item.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                title="Abrir no Google Drive"
                                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleConfirmTrashFile(item)}
                              title="Mover para a lixeira"
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Save / Publish Panel */}
        <aside className="space-y-5 lg:col-span-4">
          {project.driveLink && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Arquivo vinculado no Drive
                  </h2>
                  <p className="mt-1 text-xs font-medium text-slate-700">
                    {project.driveLink.fileName}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Vinculado
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(project.driveLink.fileName.endsWith('.html') ||
                  project.driveLink.fileName.endsWith('.json')) && (
                  <button
                    type="button"
                    onClick={() =>
                      handleConfirmOverwriteFile({
                        fileId: project.driveLink!.fileId,
                        fileName: project.driveLink!.fileName,
                      })
                    }
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#2457a6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1d4687] whitespace-nowrap"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Atualizar no Drive
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    handleCopyDirectLink(project.driveLink!.fileId)
                  }
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar Link Direcionado
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-slate-900">
              Salvar Atividade em "{currentFolder.name}"
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Grave a versão atual ({project.questions.length} questões e
              layout personalizado) diretamente na pasta aberta do Google Drive.
            </p>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Nome do arquivo (sem extensão)
                </label>
                <input
                  type="text"
                  value={saveBaseName}
                  onChange={(e) => setSaveBaseName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#2457a6] focus:outline-none"
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-700">
                  Formato para salvar
                </span>
                <div className="mt-1.5 space-y-2 text-xs text-slate-700">
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-2.5 hover:bg-slate-50">
                    <input
                      type="radio"
                      name="save-format"
                      checked={saveFormat === 'both'}
                      onChange={() => setSaveFormat('both')}
                      className="mt-0.5"
                    />
                    <span>
                      <strong className="block text-slate-900">
                        HTML Offline + Projeto JSON
                      </strong>
                      Salva a página pronta para o aluno e o projeto editável.
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-2.5 hover:bg-slate-50">
                    <input
                      type="radio"
                      name="save-format"
                      checked={saveFormat === 'html'}
                      onChange={() => setSaveFormat('html')}
                      className="mt-0.5"
                    />
                    <span>
                      <strong className="block text-slate-900">
                        Somente Página HTML (.html)
                      </strong>
                      Arquivo único interativo que funciona offline.
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-2.5 hover:bg-slate-50">
                    <input
                      type="radio"
                      name="save-format"
                      checked={saveFormat === 'json'}
                      onChange={() => setSaveFormat('json')}
                      className="mt-0.5"
                    />
                    <span>
                      <strong className="block text-slate-900">
                        Somente Pacote JSON (.json)
                      </strong>
                      Leve e ideal para direcionar turmas pelo estúdio.
                    </span>
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePublishNewFiles}
                disabled={busyActionId === 'publish-new'}
                className="flex w-full min-h-[42px] items-center justify-center gap-2 rounded-lg bg-[#2457a6] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4687] disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {busyActionId === 'publish-new'
                  ? 'Salvando no Drive...'
                  : 'Salvar nesta pasta do Drive'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <button
              type="button"
              onClick={() => setShowDocGuide((v) => !v)}
              className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-900"
            >
              <span className="inline-flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-[#2457a6]" />
                Formato para importar de Google Docs
              </span>
              <span className="text-xs text-slate-500">
                {showDocGuide ? 'Ocultar' : 'Ver modelo'}
              </span>
            </button>

            {showDocGuide && (
              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600">
                <p>
                  No Google Docs, escreva cada questão separada por uma linha em
                  branco seguindo este padrão:
                </p>
                <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 font-mono-tabular text-[11px] text-slate-800">
{`1. Qual palavra é sinônimo de 'feliz'?
A) Triste
B) Contente
C) Bravo
D) Cansado
Resposta: B
Explicação: 'Contente' tem sentido semelhante a 'feliz'.`}
                </pre>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
