import { Pencil, RotateCcw, Trash2 } from 'lucide-react';
import type { PlatformClinic } from '../../types';
import { CompanyLogo } from '../../shared/components/CompanyLogo';
import { SortableTableHeader } from '../../shared/components/SortableTableHeader';
import { IconButton } from '../../shared/components/ui';
import { API_ASSET_BASE_URL } from '../../shared/utils/formatters';
import type { ClinicSortField } from './clinicFormModel';

type Props = {
  clinics: PlatformClinic[];
  loading: boolean;
  currentClinicId?: number | null;
  sortBy: ClinicSortField;
  sortDirection: 'asc' | 'desc';
  onSortChange: (field: ClinicSortField) => void;
  onEdit: (clinic: PlatformClinic) => void;
  onDeactivate: (clinic: PlatformClinic) => void | Promise<void>;
  onSwitch: (clinic: PlatformClinic) => void | Promise<void>;
};

export function ClinicsTable({ clinics, loading, currentClinicId, sortBy, sortDirection, onSortChange, onEdit, onDeactivate, onSwitch }: Props) {
  const sortHeader = (field: ClinicSortField, label: string) => <SortableTableHeader field={field} label={label}
    activeField={sortBy} direction={sortDirection} onSortChange={onSortChange} />;

  return (
    <div className="table-wrap" data-tour="clinics-switch">
      <table className="users-table clinics-table">
        <thead><tr>{sortHeader('nome', 'Clinica')}{sortHeader('plano', 'Plano')}{sortHeader('assinatura', 'Assinatura')}{sortHeader('usuarios', 'Usuarios')}{sortHeader('status', 'Status')}<th aria-label="Acoes" /></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={6} className="empty-row">Carregando clinicas...</td></tr> : clinics.map((clinic) => (
            <tr key={clinic.id}>
              <td data-label="Clinica"><div className="clinic-name-cell"><CompanyLogo companyName={clinic.nome} photo={clinic.fotoUrl ? `${API_ASSET_BASE_URL}${clinic.fotoUrl}` : null} className="clinic-list-logo" /><span><strong>{clinic.nome}</strong><small>{clinic.slug}</small></span></div></td>
              <td data-label="Plano">{clinic.plano}</td><td data-label="Assinatura">{clinic.assinaturaStatus}</td><td data-label="Usuarios">{clinic.usuarios ?? '-'}</td>
              <td data-label="Status"><span className={`status-pill ${clinic.ativa ? 'ok' : 'warning'}`}>{clinic.ativa ? 'Ativa' : 'Inativa'}</span></td>
              <td data-label="Acoes"><div className="row-actions">
                {clinic.ativa && clinic.id !== currentClinicId && <IconButton label={`Acessar ${clinic.nome}`} onClick={() => void onSwitch(clinic)}><RotateCcw size={17} /></IconButton>}
                <IconButton label={`Editar ${clinic.nome}`} tone="muted" onClick={() => onEdit(clinic)}><Pencil size={17} /></IconButton>
                {clinic.ativa && clinic.id !== currentClinicId && <IconButton label={`Desativar ${clinic.nome}`} tone="danger" onClick={() => void onDeactivate(clinic)}><Trash2 size={17} /></IconButton>}
              </div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
