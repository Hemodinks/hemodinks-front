import {
  Building2,
  CheckCircle2,
  ImagePlus,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import type { SelectClinicResponse } from './clinicTypes';
import { AlertMessage, Button, DataPanel, IconButton, TextField } from '../../shared/components/ui';
import { API_ASSET_BASE_URL } from '../../shared/utils/formatters';
import { CompanyLogo } from '../../shared/components/CompanyLogo';
import { useClinicsController } from './useClinicsController';
import './clinics.css';

const CLINIC_MODULE_OPTIONS = [
  { value: 'usuarios', label: 'Usuários' },
  { value: 'pacientes', label: 'Pacientes' },
  { value: 'faturamento', label: 'Faturamento médico' },
  { value: 'grupos-medicos', label: 'Grupos médicos' },
  { value: 'agenda', label: 'Agenda e notificações' },
];

type ClinicsPageProps = {
  session: AuthSession;
  isSuperAdmin: boolean;
  onClinicSelected: (result: SelectClinicResponse) => void;
};

export function ClinicsContainer({ session, isSuperAdmin, onClinicSelected }: ClinicsPageProps) {
  const {
    clinics,
    error,
    success,
    editing,
    formOpen,
    setFormOpen,
    form,
    setForm,
    photoPreview,
    setPhotoPreview,
    loading,
    saving,
    loadClinics,
    openNew,
    openEdit,
    handlePhotoChange,
    submit,
    deactivate,
    switchClinic,
  } = useClinicsController({ session, isSuperAdmin, onClinicSelected });

  return (
    <section className="workspace clinics-workspace">
      <DataPanel>
        <div className="data-header">
          <div>
            <span className="eyebrow">Plataforma multiclinica</span>
            <h2>{isSuperAdmin ? `${clinics.length} clínicas cadastradas` : 'Dados da clínica'}</h2>
          </div>
          <div className="table-tools">
            {isSuperAdmin && (
              <Button onClick={openNew}>
                <Plus size={17} />
                Nova clínica
              </Button>
            )}
            <IconButton label="Atualizar clinicas" onClick={() => void loadClinics()}>
              <RefreshCw size={18} />
            </IconButton>
          </div>
        </div>

        {success && (
          <AlertMessage type="success" icon={<CheckCircle2 size={17} />}>
            {success}
          </AlertMessage>
        )}
        {error && <AlertMessage type="error">{error}</AlertMessage>}

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
              {loading ? (
                <tr>
                  <td colSpan={6} className="empty-row">
                    Carregando clinicas...
                  </td>
                </tr>
              ) : (
                clinics.map((clinic) => (
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
                            onClick={() => void switchClinic(clinic)}
                          >
                            <RotateCcw size={17} />
                          </IconButton>
                        )}
                        <IconButton
                          label={`Editar ${clinic.nome}`}
                          tone="muted"
                          onClick={() => openEdit(clinic)}
                        >
                          <Pencil size={17} />
                        </IconButton>
                        {isSuperAdmin && clinic.ativa && clinic.id !== session.user.clinicaId && (
                          <IconButton
                            label={`Desativar ${clinic.nome}`}
                            tone="danger"
                            onClick={() => void deactivate(clinic)}
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
      </DataPanel>

      {formOpen && (
        <DataPanel className="clinic-form-panel">
          <div className="settings-section-heading">
            <span className="settings-section-icon">
              <Building2 size={19} />
            </span>
            <div>
              <span className="eyebrow">{editing ? 'Edicao' : 'Onboarding'}</span>
              <h3>{editing ? `Editar ${editing.nome}` : 'Nova clinica'}</h3>
            </div>
          </div>
          <form className="clinic-form" onSubmit={submit}>
            <div className="clinic-brand-editor">
              <CompanyLogo
                companyName={form.nome || 'Clinica'}
                photo={photoPreview}
                className="clinic-brand-photo"
              />
              <div className="clinic-brand-actions">
                <label className="ghost-button file-action" htmlFor="clinic-photo-input">
                  <ImagePlus size={17} />
                  Selecionar foto
                </label>
                <input
                  id="clinic-photo-input"
                  className="sr-only"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => void handlePhotoChange(event)}
                />
                {photoPreview && (
                  <Button
                    variant="danger-ghost"
                    onClick={() => {
                      setForm((current) => ({ ...current, fotoClinica: '' }));
                      setPhotoPreview(null);
                    }}
                  >
                    <Trash2 size={16} />
                    Remover foto
                  </Button>
                )}
              </div>
            </div>
            <div className="clinic-form-grid">
              <TextField
                label="Nome da clinica"
                value={form.nome}
                onValueChange={(nome) => setForm((current) => ({ ...current, nome }))}
                maxLength={120}
                required
              />
              <TextField
                label="Slug"
                value={form.slug}
                onValueChange={(slug) => setForm((current) => ({ ...current, slug }))}
                maxLength={120}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
              />
              {isSuperAdmin && (
                <>
                  <label>
                    Plano
                    <select
                      value={form.plano}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          plano: event.target.value,
                          trialAte: event.target.value === 'Trial' ? current.trialAte : '',
                          assinaturaStatus:
                            event.target.value === 'Trial'
                              ? 'Trial'
                              : current.assinaturaStatus === 'Trial'
                                ? 'Ativa'
                                : current.assinaturaStatus,
                        }))
                      }
                    >
                      <option value="Trial">Trial</option>
                      <option value="Parcial">Parcial</option>
                      <option value="Completa">Completa</option>
                    </select>
                  </label>
                  <label>
                    Status da assinatura
                    <select
                      value={form.assinaturaStatus}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, assinaturaStatus: event.target.value }))
                      }
                    >
                      <option>Trial</option>
                      <option>Ativa</option>
                      <option>Suspensa</option>
                      <option>Cancelada</option>
                    </select>
                  </label>
                  <TextField
                    label="Limite de usuarios"
                    type="number"
                    min={1}
                    value={form.limiteUsuarios}
                    onValueChange={(limiteUsuarios) =>
                      setForm((current) => ({ ...current, limiteUsuarios }))
                    }
                  />
                  {form.plano === 'Trial' && (
                    <TextField
                      label="Trial ate"
                      type="date"
                      value={form.trialAte}
                      onValueChange={(trialAte) => setForm((current) => ({ ...current, trialAte }))}
                    />
                  )}
                  <TextField
                    label="Assinatura valida ate"
                    type="date"
                    value={form.assinaturaValidaAte}
                    onValueChange={(assinaturaValidaAte) =>
                      setForm((current) => ({ ...current, assinaturaValidaAte }))
                    }
                  />
                  {editing && (
                    <label className="toggle-row">
                      <input
                        type="checkbox"
                        checked={form.ativa}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, ativa: event.target.checked }))
                        }
                      />
                      Clinica ativa
                    </label>
                  )}
                </>
              )}
            </div>
            {isSuperAdmin && form.plano === 'Parcial' && (
              <fieldset className="clinic-modules-fieldset">
                <legend>Módulos contratados</legend>
                <div className="clinic-module-options">
                  {CLINIC_MODULE_OPTIONS.map((module) => (
                    <label key={module.value}>
                      <input
                        type="checkbox"
                        checked={form.modulosLiberados.includes(module.value)}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            modulosLiberados: event.target.checked
                              ? [...current.modulosLiberados, module.value]
                              : current.modulosLiberados.filter((value) => value !== module.value),
                          }))
                        }
                      />
                      {module.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {!editing && (
              <fieldset className="clinic-admin-fields">
                <legend>Administrador inicial</legend>
                <div className="clinic-form-grid">
                  <TextField
                    label="Nome"
                    value={form.administradorNome}
                    onValueChange={(administradorNome) =>
                      setForm((current) => ({ ...current, administradorNome }))
                    }
                    required
                  />
                  <TextField
                    label="Email"
                    type="email"
                    value={form.administradorEmail}
                    onValueChange={(administradorEmail) =>
                      setForm((current) => ({ ...current, administradorEmail }))
                    }
                    required
                  />
                  <TextField
                    label="Senha inicial"
                    type="password"
                    minLength={8}
                    value={form.administradorSenha}
                    onValueChange={(administradorSenha) =>
                      setForm((current) => ({ ...current, administradorSenha }))
                    }
                    required
                  />
                  <TextField
                    label="Telefone"
                    value={form.administradorTelefone}
                    onValueChange={(administradorTelefone) =>
                      setForm((current) => ({ ...current, administradorTelefone }))
                    }
                  />
                </div>
              </fieldset>
            )}
            <div className="button-row">
              <Button variant="primary" type="submit" disabled={saving}>
                <Save size={18} />
                {saving ? 'Salvando...' : editing ? 'Atualizar clínica' : 'Salvar clínica'}
              </Button>
              <Button variant="danger-ghost" onClick={() => setFormOpen(false)}>
                <X size={17} />
                Cancelar
              </Button>
            </div>
          </form>
        </DataPanel>
      )}
    </section>
  );
}
