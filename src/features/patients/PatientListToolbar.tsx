import { Download, FileText, Plus, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PacienteExportScope } from '../../appTypes';
import { Button, IconButton, SearchField, SelectField } from '../../shared/components/ui';
import type { PatientListProps } from './patientListTypes';

type PatientListToolbarProps = Pick<PatientListProps,
  | 'pacientesTotalItems' | 'canCreatePatients' | 'pacienteSearchTerm' | 'pacienteExportScope'
  | 'pacienteExportLoading' | 'isAdmin' | 'isTeam' | 'onOpenNewPacienteForm' | 'onSearchChange'
  | 'onRefresh' | 'onExportScopeChange' | 'onExportPacientes'
> & { children?: ReactNode };

export function PatientListToolbar(props: PatientListToolbarProps) {
  return (
    <div className="data-header">
      <div>
        <span className="eyebrow">Cadastro de pacientes</span>
        <h2>{props.pacientesTotalItems} cadastrados</h2>
      </div>
      <div className="table-tools">
        {props.canCreatePatients && (
          <Button onClick={props.onOpenNewPacienteForm} data-tour="patients-new"><Plus size={17} />Novo paciente</Button>
        )}
        <div data-tour="patients-search">
          <SearchField label="Buscar pacientes" value={props.pacienteSearchTerm} onValueChange={props.onSearchChange} />
        </div>
        <IconButton label="Atualizar lista de pacientes" onClick={props.onRefresh} title="Atualizar lista"><RefreshCw size={18} /></IconButton>
        <div className="patient-export-actions" aria-label="Exportacoes de pacientes">
          <SelectField
            className="export-scope-field"
            label="Exportar"
            value={props.pacienteExportScope}
            onChange={(event) => props.onExportScopeChange(event.target.value as PacienteExportScope)}
          >
            <option value="all">Todos os pacientes</option>
            {(props.isAdmin || props.isTeam) && <option value="doctor">Cirurgiões selecionados</option>}
            <option value="visible">Dados da tela</option>
          </SelectField>
          <Button className="export-pdf-btn" onClick={() => void props.onExportPacientes('pdf')} disabled={props.pacienteExportLoading !== null}>
            <FileText size={17} />{props.pacienteExportLoading === 'pdf' ? 'Gerando...' : 'Exportar PDF'}
          </Button>
          <Button className="export-xlsx-btn" onClick={() => void props.onExportPacientes('xlsx')} disabled={props.pacienteExportLoading !== null}>
            <Download size={17} />{props.pacienteExportLoading === 'xlsx' ? 'Gerando...' : 'Exportar Planilha'}
          </Button>
        </div>
        {props.children}
      </div>
    </div>
  );
}
