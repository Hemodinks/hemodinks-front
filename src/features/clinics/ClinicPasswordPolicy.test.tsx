import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError, type AxiosResponse } from 'axios';
import { afterEach, expect, it, vi } from 'vitest';
import { apiClient } from '../../services/api';
import { ClinicsPage } from './ClinicsPage';
import { mockSession } from '../../test/appTestData';

const response = (data: unknown, status = 200) => ({ data, status, headers: {}, config: { headers: {} }, statusText: '' }) as AxiosResponse;
const clinic = { id: 1, nome: 'Clínica teste', slug: 'teste', ativa: true, plano: 'Completa', assinaturaStatus: 'Ativa', modulosLiberados: [], cnpj: '11222333000181' };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it.each(['create', 'create-team', 'edit', 'edit-team'] as const)('preserva dados e associa contrato no provisionamento: %s', async (flow) => {
  const editing = flow.startsWith('edit');
  const withTeam = flow.endsWith('team');
  let refuse = true;
  const writes: unknown[] = [];
  vi.spyOn(apiClient, 'request').mockImplementation(async (config) => {
    if (config.method === 'GET') return response(config.url === '/api/platform/clinicas' ? [clinic] : []);
    writes.push(config.data);
    if (refuse) throw new AxiosError('Failed', undefined, undefined, undefined, response({ code: 'password_compromised' }, 400));
    return response(clinic);
  });
  render(<MemoryRouter><ClinicsPage session={mockSession({ perfilId: 5 })} onClinicSelected={vi.fn()} /></MemoryRouter>);
  await screen.findByText('Clínica teste');
  fireEvent.click(screen.getByRole('button', { name: editing ? /editar.*teste/i : /nova clinica/i }));
  const change = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
  if (!editing) {
    change('Nome da clinica', 'Clínica nova'); change('Slug', 'nova'); change('CNPJ', '11222333000181');
    change('Nome', 'Administrador'); change('Email', 'admin@example.com'); change('Senha inicial', 'password');
  } else if (!withTeam) change('Definir nova senha', 'password');
  const toggle = screen.getByRole('checkbox', { name: editing ? /adicionar uma nova equipe/i : /cadastrar uma equipe/i });
  if ((toggle as HTMLInputElement).checked !== withTeam) fireEvent.click(toggle);
  if (withTeam) { change('Nome da equipe', 'Equipe teste'); change('E-mail coletivo', 'equipe@example.com'); change('Senha coletiva inicial', 'password'); }
  fireEvent.click(screen.getByRole('button', { name: 'Salvar clinica' }));
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Escolha outra senha');
  const label = withTeam ? 'Senha coletiva inicial' : editing ? 'Definir nova senha' : 'Senha inicial';
  const password = screen.getByLabelText(label);
  expect(password).toHaveAttribute('aria-invalid', 'true');
  expect(document.getElementById(password.getAttribute('aria-describedby')!)).toContainElement(alert);
  expect(screen.getByLabelText('Nome da clinica')).toHaveValue(editing ? clinic.nome : 'Clínica nova');
  if (!editing) expect(screen.getByLabelText('Email')).toHaveValue('admin@example.com');
  refuse = false;
  const phrase = '  uma frase senha longa  ';
  change(label, phrase);
  if (!editing && withTeam) change('Senha inicial', phrase);
  fireEvent.click(screen.getByRole('button', { name: 'Salvar clinica' }));
  await waitFor(() => expect(writes).toHaveLength(2));
  expect(writes[1]).toMatchObject(withTeam ? (editing ? { novaEquipe: { senha: phrase } } : { equipeInicial: { senha: phrase } }) : editing ? { administradorNovaSenha: phrase } : { administradorSenha: phrase });
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Salvar clinica' })).not.toBeInTheDocument());
});
