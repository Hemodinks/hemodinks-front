import type { Dispatch, SetStateAction } from 'react';
import type { TeamIdentificationMode } from '../../types';
import { PasswordInput } from '../../shared/components/PasswordInput';
import { TextField } from '../../shared/components/ui';
import { formatPhoneInput, MAX_EMAIL_LENGTH, MAX_NAME_LENGTH } from '../../shared/utils/formatters';
import { getTeamIdentificationDescription, TEAM_IDENTIFICATION_OPTIONS } from '../../shared/utils/teamIdentification';
import { MAX_ADMIN_PASSWORD_LENGTH, MAX_BRAZIL_MOBILE_MASK_LENGTH, type ClinicFormData } from './clinicFormModel';

type Props = { editing: boolean; form: ClinicFormData; setForm: Dispatch<SetStateAction<ClinicFormData>> };

export function ClinicFormTeamFields({ editing, form, setForm }: Props) {
  return (
    <fieldset className="clinic-team-fields" data-tour="clinics-team">
      <legend>{editing ? 'Adicionar equipe' : 'Equipe inicial'}</legend>
      <label className="clinic-team-toggle"><input type="checkbox" checked={form.criarEquipeInicial} onChange={(event) => setForm((current) => ({ ...current, criarEquipeInicial: event.target.checked }))} />{editing ? 'Adicionar uma nova equipe a esta clínica' : 'Cadastrar uma equipe junto com a clínica'}</label>
      <small className="file-hint">A equipe usará uma conta coletiva vinculada exclusivamente a esta clínica.</small>
      {form.criarEquipeInicial && <div className="clinic-team-content">
        <div className="clinic-form-grid">
          <TextField label="Nome da equipe" value={form.equipeNome} onValueChange={(equipeNome) => setForm((current) => ({ ...current, equipeNome: equipeNome.slice(0, MAX_NAME_LENGTH) }))} maxLength={MAX_NAME_LENGTH} required />
          <TextField label="E-mail coletivo" type="email" value={form.equipeEmail} onValueChange={(equipeEmail) => setForm((current) => ({ ...current, equipeEmail: equipeEmail.slice(0, MAX_EMAIL_LENGTH) }))} maxLength={MAX_EMAIL_LENGTH} required />
          <PasswordInput id="clinic-team-password" label="Senha coletiva inicial" value={form.equipeSenha} onChange={(equipeSenha) => setForm((current) => ({ ...current, equipeSenha: equipeSenha.slice(0, MAX_ADMIN_PASSWORD_LENGTH) }))} autoComplete="new-password" minLength={8} maxLength={MAX_ADMIN_PASSWORD_LENGTH} required />
          <TextField label="Telefone da equipe" type="tel" inputMode="tel" autoComplete="tel" value={form.equipeTelefone} onValueChange={(equipeTelefone) => setForm((current) => ({ ...current, equipeTelefone: formatPhoneInput(equipeTelefone) }))} maxLength={MAX_BRAZIL_MOBILE_MASK_LENGTH} placeholder="+55 (DDD) 99999-9999" />
        </div>
        <label>Identificação dos membros da equipe<select value={form.equipeModoIdentificacao} onChange={(event) => setForm((current) => ({ ...current, equipeModoIdentificacao: event.target.value as TeamIdentificationMode }))}>{TEAM_IDENTIFICATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <small className="file-hint">{getTeamIdentificationDescription(form.equipeModoIdentificacao)}</small>
        <div className="team-identification-options" aria-label="Explicação dos modos de identificação" data-tour="clinics-identification-mode">{TEAM_IDENTIFICATION_OPTIONS.map((option) => <p key={option.value}><strong>{option.label}:</strong> {option.description}</p>)}</div>
      </div>}
    </fieldset>
  );
}
