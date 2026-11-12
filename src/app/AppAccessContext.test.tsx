import { render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ADMIN_PROFILE_ID as ADMIN, MEDICAL_PROFILE_ID as MEDICAL, PATIENT_PROFILE_ID as PATIENT } from '../shared/utils/formatterConstants';
import { mockSession } from '../test/appTestData';
import { getAppAccess, type AppAccess } from './appAccess';
import { AppAccessProvider, useAppAccess } from './AppAccessContext';

function withAccess(access: AppAccess) {
  return ({ children }: { children: ReactNode }) => <AppAccessProvider access={access}>{children}</AppAccessProvider>;
}

function ModulesProbe() {
  const { canAccessUsers, canDeletePatients, canAccessSettings, patientReadOnly } = useAppAccess();
  return (
    <ul>
      {canAccessUsers && <li>Usuários</li>}
      {canDeletePatients && <li>Excluir paciente</li>}
      {canAccessSettings && <li>Configurações</li>}
      {patientReadOnly && <li>Somente leitura</li>}
    </ul>
  );
}

describe('AppAccessContext', () => {
  it('entrega exatamente o acesso calculado por getAppAccess', () => {
    const access = getAppAccess(mockSession({ perfilId: ADMIN }));
    const { result } = renderHook(() => useAppAccess(), { wrapper: withAccess(access) });
    expect(result.current).toBe(access);
  });

  it('libera módulos administrativos apenas para o perfil com permissão', () => {
    render(<ModulesProbe />, { wrapper: withAccess(getAppAccess(mockSession({ perfilId: ADMIN }))) });
    expect(screen.getByText('Usuários')).toBeInTheDocument();
    expect(screen.getByText('Excluir paciente')).toBeInTheDocument();
    expect(screen.getByText('Configurações')).toBeInTheDocument();
  });

  it('não expõe módulos administrativos para médico nem paciente', () => {
    render(<ModulesProbe />, { wrapper: withAccess(getAppAccess(mockSession({ perfilId: MEDICAL }))) });
    expect(screen.queryByText('Usuários')).not.toBeInTheDocument();
    expect(screen.queryByText('Excluir paciente')).not.toBeInTheDocument();
    expect(screen.queryByText('Configurações')).not.toBeInTheDocument();
  });

  it('mantém paciente em somente leitura sem módulos administrativos', () => {
    render(<ModulesProbe />, { wrapper: withAccess(getAppAccess(mockSession({ perfilId: PATIENT }))) });
    expect(screen.getByText('Somente leitura')).toBeInTheDocument();
    expect(screen.queryByText('Usuários')).not.toBeInTheDocument();
  });

  it('recalcula ao trocar a sessão (ex.: outra clínica) sem manter permissões anteriores', () => {
    const admin = getAppAccess(mockSession({ perfilId: ADMIN }));
    const medical = getAppAccess(mockSession({ perfilId: MEDICAL }));
    const { rerender } = render(<AppAccessProvider access={admin}><ModulesProbe /></AppAccessProvider>);
    expect(screen.getByText('Usuários')).toBeInTheDocument();
    rerender(<AppAccessProvider access={medical}><ModulesProbe /></AppAccessProvider>);
    expect(screen.queryByText('Usuários')).not.toBeInTheDocument();
    expect(screen.queryByText('Configurações')).not.toBeInTheDocument();
  });

  it('respeita módulos contratados da clínica também via contexto', () => {
    const access = getAppAccess(mockSession({ perfilId: ADMIN, modulosLiberados: ['pacientes'] }));
    render(<ModulesProbe />, { wrapper: withAccess(access) });
    expect(screen.queryByText('Usuários')).not.toBeInTheDocument();
    expect(screen.getByText('Excluir paciente')).toBeInTheDocument();
  });

  it('falha fechado fora do provider, sem permissão padrão', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAppAccess())).toThrow('useAppAccess must be used inside AppAccessProvider.');
    consoleError.mockRestore();
  });
});
