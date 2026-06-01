import type {
  ChangePasswordPayload,
  LoginResponse,
  Paciente,
  PacienteArquivo,
  PacienteFormData,
  User,
  UserFormData,
} from './types';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

async function parseError(response: Response) {
  if (response.status === 401) {
    return 'Credenciais invalidas ou sessao expirada.';
  }

  try {
    const data = await response.json();
    return data?.message || data?.error || 'Nao foi possivel concluir a operacao.';
  } catch {
    return 'Nao foi possivel concluir a operacao.';
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function uploadRequest<T>(path: string, body: FormData, token: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    body,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<T>;
}

export function authenticate(email: string, senha: string) {
  return request<LoginResponse>('/api/users/authenticate', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  });
}

export function getUsers(token: string) {
  return request<User[]>('/api/users/', {}, token);
}

export function createUser(payload: UserFormData, token: string) {
  return request<User>('/api/users/', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export function updateUser(id: number, payload: UserFormData, token: string) {
  return request<User>(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
}

export function deleteUser(id: number, token: string) {
  return request<void>(`/api/users/${id}`, {
    method: 'DELETE',
  }, token);
}

export function changePassword(id: number, payload: ChangePasswordPayload, token: string) {
  return request<{ id: number; precisaTrocarSenha: boolean; message: string }>(`/api/users/${id}/password`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
}

export function getPacientes(token: string) {
  return request<Paciente[]>('/api/pacientes/', {}, token);
}

export function createPaciente(payload: PacienteFormData, token: string) {
  return request<Paciente>('/api/pacientes/', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export function updatePaciente(id: number, payload: PacienteFormData, token: string) {
  return request<Paciente>(`/api/pacientes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
}

export function deletePaciente(id: number, token: string) {
  return request<void>(`/api/pacientes/${id}`, {
    method: 'DELETE',
  }, token);
}

export function uploadPacienteArquivo(id: number, file: File, token: string) {
  const body = new FormData();
  body.append('file', file);
  return uploadRequest<PacienteArquivo>(`/api/pacientes/${id}/arquivos`, body, token);
}

export function deletePacienteArquivo(id: number, arquivoId: number, token: string) {
  return request<void>(`/api/pacientes/${id}/arquivos/${arquivoId}`, {
    method: 'DELETE',
  }, token);
}
