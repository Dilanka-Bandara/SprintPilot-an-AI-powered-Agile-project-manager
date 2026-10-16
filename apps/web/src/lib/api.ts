export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // A JSON content type on a bodyless DELETE makes Fastify expect a JSON body.
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(`/api/demo${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.error?.message ??
        'Could not reach SprintPilot. Is the API running?',
    );
  }
  return response.json() as Promise<T>;
}
