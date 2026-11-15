export interface QuizQuestion {
  id: string;
  q: string;
  a: string[];
  c: number;
  e: string;
}

export type FontOption = 'sans' | 'serif' | 'jakarta';
export type CardRadiusOption = 'compact' | 'rounded' | 'soft';

export interface ResultMessages {
  perfect: string;
  great: string;
  good: string;
  retry: string;
}

export interface PageConfig {
  title: string;
  subtitle: string;
  teacherName: string;
  targetGroup: string;
  bullets: string[];
  startButtonLabel: string;
  finishTitle: string;
  retryButtonLabel: string;
  accentColor: string;
  lightTintColor: string;
  pageBgColor: string;
  fontOption: FontOption;
  cardRadius: CardRadiusOption;
  showOfflineNote: boolean;
  resultMessages: ResultMessages;
}

export interface DriveLinkInfo {
  fileId: string;
  fileName: string;
  folderId?: string;
  webViewLink?: string;
  lastSyncedAt?: string;
}

export interface QuizProject {
  page: PageConfig;
  questions: QuizQuestion[];
  driveLink?: DriveLinkInfo | null;
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  parents?: string[];
  webViewLink?: string;
}

export interface DriveBreadcrumb {
  id: string;
  name: string;
}

export type WorkspaceTab = 'student' | 'exercises' | 'page' | 'drive';

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  description: string;
  details?: string[];
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => Promise<void> | void;
}
