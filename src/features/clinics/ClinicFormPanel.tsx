import { Building2, ImagePlus, Save, Trash2, X } from 'lucide-react';
import { CompanyLogo } from '../../shared/components/CompanyLogo';
import { Button, DataPanel, TextField } from '../../shared/components/ui';
import type { useClinicsController } from './useClinicsController';

const CLINIC_MODULE_OPTIONS = [
  { value: 'usuarios', label: 'Usuários' },
  { value: 'pacientes', label: 'Pacientes' },
  { value: 'faturamento', label: 'Faturamento médico' },
  { value: 'grupos-medicos', label: 'Grupos médicos' },
  { value: 'agenda', label: 'Agenda e notificações' },
];

type ClinicFormPanelProps = {
  controller: ReturnType<typeof useClinicsController>;
  isSuperAdmin: boolean;
};

export function ClinicFormPanel({ controller, isSuperAdmin }: ClinicFormPanelProps) {
  const { editing, form, setForm, photoPreview, setPhotoPreview } = controller;
  return (
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
      <form className="clinic-form" onSubmit={controller.submit}>
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
              onChange={(event) => void controller.handlePhotoChange(event)}
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
          <Button variant="primary" type="submit" disabled={controller.saving}>
            <Save size={18} />
            {controller.saving ? 'Salvando...' : editing ? 'Atualizar clínica' : 'Salvar clínica'}
          </Button>
          <Button variant="danger-ghost" onClick={() => controller.setFormOpen(false)}>
            <X size={17} />
            Cancelar
          </Button>
        </div>
      </form>
    </DataPanel>
  );
}
