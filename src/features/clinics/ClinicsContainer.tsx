import { CheckCircle2, Plus, RefreshCw } from 'lucide-react';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import { AlertMessage, Button, DataPanel, IconButton } from '../../shared/components/ui';
import type { SelectClinicResponse } from './clinicTypes';
import { ClinicFormPanel } from './ClinicFormPanel';
import { ClinicsTable } from './ClinicsTable';
import { useClinicsController } from './useClinicsController';
import './clinics.css';

type ClinicsPageProps = {
  session: AuthSession;
  isSuperAdmin: boolean;
  onClinicSelected: (result: SelectClinicResponse) => void;
};

export function ClinicsContainer({ session, isSuperAdmin, onClinicSelected }: ClinicsPageProps) {
  const controller = useClinicsController({ session, isSuperAdmin, onClinicSelected });

  return (
    <section className="workspace clinics-workspace">
      <DataPanel>
        <div className="data-header">
          <div>
            <span className="eyebrow">Plataforma multiclinica</span>
            <h2>
              {isSuperAdmin
                ? `${controller.clinics.length} clínicas cadastradas`
                : 'Dados da clínica'}
            </h2>
          </div>
          <div className="table-tools">
            {isSuperAdmin && (
              <Button onClick={controller.openNew}>
                <Plus size={17} />
                Nova clínica
              </Button>
            )}
            <IconButton label="Atualizar clinicas" onClick={() => void controller.loadClinics()}>
              <RefreshCw size={18} />
            </IconButton>
          </div>
        </div>
        {controller.success && (
          <AlertMessage type="success" icon={<CheckCircle2 size={17} />}>
            {controller.success}
          </AlertMessage>
        )}
        {controller.error && <AlertMessage type="error">{controller.error}</AlertMessage>}
        <ClinicsTable controller={controller} session={session} isSuperAdmin={isSuperAdmin} />
      </DataPanel>
      {controller.formOpen && (
        <ClinicFormPanel controller={controller} isSuperAdmin={isSuperAdmin} />
      )}
    </section>
  );
}
