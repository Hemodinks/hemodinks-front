import { Pencil, RotateCcw, Trash2 } from 'lucide-react';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import { CompanyLogo } from '../../shared/components/CompanyLogo';
import { IconButton } from '../../shared/components/ui';
import { API_ASSET_BASE_URL } from '../../shared/utils/formatters';
import type { useClinicsController } from './useClinicsController';

type ClinicsController = ReturnType<typeof useClinicsController>;

type ClinicsTableProps = {
  controller: ClinicsController;
  session: AuthSession;
  isSuperAdmin: boolean;
};

export function ClinicsTable({ controller, session, isSuperAdmin }: ClinicsTableProps) {
  return (
    <div className="table-wrap">
      <table className="users-table clinics-table">
        <thead>
          <tr>
            <th>Clinica</th>
            <th>Plano</th>
            <th>Assinatura</th>
            <th>Usuarios</th>
            <th>Status</th>
            <th aria-label="Acoes" />
          </tr>
        </thead>
        <tbody>
          {controller.loading ? (
            <tr>
              <td colSpan={6} className="empty-row">
                Carregando clinicas...
              </td>
            </tr>
          ) : (
            controller.clinics.map((clinic) => (
              <tr key={clinic.id}>
                <td data-label="Clinica">
                  <div className="clinic-name-cell">
                    <CompanyLogo
                      companyName={clinic.nome}
                      photo={clinic.fotoUrl ? `${API_ASSET_BASE_URL}${clinic.fotoUrl}` : null}
                      className="clinic-list-logo"
                    />
                    <span>
                      <strong>{clinic.nome}</strong>
                      <small>{clinic.slug}</small>
                    </span>
                  </div>
                </td>
                <td data-label="Plano">{clinic.plano}</td>
                <td data-label="Assinatura">{clinic.assinaturaStatus}</td>
                <td data-label="Usuarios">{clinic.usuarios ?? '-'}</td>
                <td data-label="Status">
                  <span className={`status-pill ${clinic.ativa ? 'ok' : 'warning'}`}>
                    {clinic.ativa ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                <td data-label="Acoes">
                  <div className="row-actions">
                    {isSuperAdmin && clinic.ativa && clinic.id !== session.user.clinicaId && (
                      <IconButton
                        label={`Acessar ${clinic.nome}`}
                        onClick={() => void controller.switchClinic(clinic)}
                      >
                        <RotateCcw size={17} />
                      </IconButton>
                    )}
                    <IconButton
                      label={`Editar ${clinic.nome}`}
                      tone="muted"
                      onClick={() => controller.openEdit(clinic)}
                    >
                      <Pencil size={17} />
                    </IconButton>
                    {isSuperAdmin && clinic.ativa && clinic.id !== session.user.clinicaId && (
                      <IconButton
                        label={`Desativar ${clinic.nome}`}
                        tone="danger"
                        onClick={() => void controller.deactivate(clinic)}
                      >
                        <Trash2 size={17} />
                      </IconButton>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
