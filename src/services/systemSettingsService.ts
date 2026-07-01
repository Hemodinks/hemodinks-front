import type { SystemSettings, UpdateSystemSettingsPayload } from '../types';
import { get, getBlob, put } from './api';

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  id: 1,
  nomeEmpresa: 'Hemodinks',
  fotoEmpresa: null,
  dataCadastro: '',
  dataAtualizacao: null,
};

export function getSystemSettings() {
  return get<SystemSettings>('/api/configuracoes-sistema/current');
}

export function getSystemSettingsCompanyPhoto() {
  return getBlob('/api/configuracoes-sistema/current/foto-empresa');
}

export function updateSystemSettings(payload: UpdateSystemSettingsPayload, token: string) {
  return put<SystemSettings>('/api/configuracoes-sistema/current', payload, token);
}
