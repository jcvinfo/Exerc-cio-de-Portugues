import { DriveFileItem } from '../types/quiz';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

export const FOLDER_MIME = 'application/vnd.google-apps.folder';
export const GOOGLE_DOC_MIME = 'application/vnd.google-apps.document';

async function driveFetch(url: string, token: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

  if (res.status === 401) {
    const err = new Error('Sessão do Google Drive expirada. Conecte novamente.');
    (err as Error & { code?: number }).code = 401;
    throw err;
  }

  if (!res.ok) {
    let message = `Erro na API do Google Drive (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error?.message) message = data.error.message;
    } catch {
      // ignore json parse failure
    }
    throw new Error(message);
  }

  return res;
}

export interface ListDriveOptions {
  folderId?: string;
  query?: string;
  filter?: 'all' | 'folders' | 'exercises';
}

export async function listDriveFiles(
  token: string,
  options: ListDriveOptions = {}
): Promise<DriveFileItem[]> {
  const { folderId = 'root', query = '', filter = 'all' } = options;
  const clauses: string[] = ['trashed = false'];

  if (query.trim()) {
    const escaped = query.trim().replace(/'/g, "\\'");
    clauses.push(`name contains '${escaped}'`);
  } else {
    clauses.push(`'${folderId}' in parents`);
  }

  if (filter === 'folders') {
    clauses.push(`mimeType = '${FOLDER_MIME}'`);
  } else if (filter === 'exercises') {
    clauses.push(
      `(mimeType = '${FOLDER_MIME}' or mimeType = '${GOOGLE_DOC_MIME}' or mimeType = 'application/json' or mimeType = 'text/html' or mimeType = 'text/plain' or name contains '.json' or name contains '.html' or name contains '.txt')`
    );
  }

  const params = new URLSearchParams({
    q: clauses.join(' and '),
    fields:
      'files(id,name,mimeType,modifiedTime,size,parents,webViewLink)',
    orderBy: 'folder,modifiedTime desc',
    pageSize: '60',
  });

  const res = await driveFetch(`${DRIVE_API_BASE}/files?${params}`, token);
  const data = await res.json();
  return Array.isArray(data.files) ? data.files : [];
}

export async function getDriveFileMetadata(
  token: string,
  fileId: string
): Promise<DriveFileItem> {
  const params = new URLSearchParams({
    fields: 'id,name,mimeType,modifiedTime,size,parents,webViewLink',
  });
  const res = await driveFetch(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?${params}`,
    token
  );
  return res.json();
}

export async function readDriveFileContent(
  token: string,
  file: Pick<DriveFileItem, 'id' | 'mimeType'>
): Promise<string> {
  if (file.mimeType === GOOGLE_DOC_MIME) {
    const params = new URLSearchParams({ mimeType: 'text/plain' });
    const res = await driveFetch(
      `${DRIVE_API_BASE}/files/${encodeURIComponent(file.id)}/export?${params}`,
      token
    );
    return res.text();
  }

  const res = await driveFetch(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(file.id)}?alt=media`,
    token
  );
  return res.text();
}

export async function createDriveFolder(
  token: string,
  name: string,
  parentId = 'root'
): Promise<DriveFileItem> {
  const res = await driveFetch(`${DRIVE_API_BASE}/files`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name.trim(),
      mimeType: FOLDER_MIME,
      parents: [parentId],
    }),
  });
  return res.json();
}

function buildMultipartBody(
  metadata: Record<string, unknown>,
  content: string,
  mimeType: string,
  boundary: string
): string {
  return [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${mimeType}; charset=UTF-8`,
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n');
}

export async function createDriveFile(
  token: string,
  params: {
    name: string;
    content: string;
    mimeType: string;
    folderId?: string;
  }
): Promise<DriveFileItem> {
  const boundary = `studio_boundary_${Date.now()}`;
  const metadata: Record<string, unknown> = {
    name: params.name,
    mimeType: params.mimeType,
  };
  if (params.folderId && params.folderId !== 'root') {
    metadata.parents = [params.folderId];
  }

  const body = buildMultipartBody(
    metadata,
    params.content,
    params.mimeType,
    boundary
  );

  const query = new URLSearchParams({
    uploadType: 'multipart',
    fields: 'id,name,mimeType,modifiedTime,size,parents,webViewLink',
  });

  const res = await driveFetch(
    `${DRIVE_UPLOAD_BASE}/files?${query}`,
    token,
    {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  return res.json();
}

export async function updateDriveFile(
  token: string,
  params: {
    fileId: string;
    name?: string;
    content: string;
    mimeType: string;
  }
): Promise<DriveFileItem> {
  const boundary = `studio_boundary_${Date.now()}`;
  const metadata: Record<string, unknown> = {
    mimeType: params.mimeType,
  };
  if (params.name) metadata.name = params.name;

  const body = buildMultipartBody(
    metadata,
    params.content,
    params.mimeType,
    boundary
  );

  const query = new URLSearchParams({
    uploadType: 'multipart',
    fields: 'id,name,mimeType,modifiedTime,size,parents,webViewLink',
  });

  const res = await driveFetch(
    `${DRIVE_UPLOAD_BASE}/files/${encodeURIComponent(params.fileId)}?${query}`,
    token,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  return res.json();
}

export async function trashDriveFile(
  token: string,
  fileId: string
): Promise<void> {
  await driveFetch(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}`,
    token,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trashed: true }),
    }
  );
}

export async function shareDriveFilePublicRead(
  token: string,
  fileId: string
): Promise<void> {
  await driveFetch(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}/permissions`,
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    }
  );
}
