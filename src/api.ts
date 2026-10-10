export async function api<Result>(path: string, options?: RequestInit): Promise<Result> {
  const response = await fetch(path, { credentials: 'same-origin', ...options });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) throw new Error('Campus services are unavailable. Please retry once the deployment is ready.');
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.');
  return result;
}

export async function action(data: Record<string, unknown>) {
  return api<{ message: string }>('/api/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

export async function upload(file: File, collegeId: string, purpose: string) {
  if (file.size > 4 * 1024 * 1024) throw new Error('Please choose a file smaller than 4 MB.');
  const form = new FormData();
  form.set('file', file);
  form.set('collegeId', collegeId);
  form.set('purpose', purpose);
  return api<{ id: string }>('/api/upload', { method: 'POST', body: form });
}
