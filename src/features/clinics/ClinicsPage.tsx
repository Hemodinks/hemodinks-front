import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Plus, RefreshCw } from 'lucide-react';
import type { AuthSession, SelectClinicResponse } from '../../types';
import { AlertMessage, Button, DataPanel, IconButton, ToastMessage } from '../../shared/components/ui';
import { ClinicForm } from './ClinicForm';
import { ClinicsTable } from './ClinicsTable';
import { useClinicsPage } from './useClinicsPage';
import { SUPER_ADMIN_PROFILE_ID } from '../../shared/utils/formatters';
import './clinics.css';

type ClinicsPageProps = {
  session: AuthSession;
  onClinicSelected: (result: SelectClinicResponse) => void;
};

export function ClinicsPage({ session, onClinicSelected }: ClinicsPageProps) {
  const page = useClinicsPage({ session, onClinicSelected });
  const isSuperAdmin = session.user.perfilId === SUPER_ADMIN_PROFILE_ID;
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedClinicId = Number(searchParams.get('editar'));

  useEffect(() => {
    if (page.loading || page.formOpen || !requestedClinicId) return;
    const requestedClinic = page.clinics.find((clinic) => clinic.id === requestedClinicId);
    if (!requestedClinic) return;
    page.openEdit(requestedClinic);
    setSearchParams({}, { replace: true });
  }, [page.loading, page.formOpen, page.clinics, requestedClinicId, setSearchParams]);

  return (
    <section className="workspace clinics-workspace" data-tour="clinics-overview">
      <DataPanel>
        <div className="data-header">
          <div><span className="eyebrow">Plataforma multiclinica</span><h2>{page.clinics.length} clinicas cadastradas</h2></div>
          <div className="table-tools">
            {isSuperAdmin && <Button onClick={page.openNew} data-tour="clinics-new"><Plus size={17} />Nova clinica</Button>}
            <IconButton label="Atualizar clinicas" onClick={() => void page.loadClinics()}><RefreshCw size={18} /></IconButton>
          </div>
        </div>
        {page.success && <ToastMessage type="success" icon={<CheckCircle2 size={17} />}>{page.success}</ToastMessage>}
        {page.error && <AlertMessage type="error">{page.error}</AlertMessage>}
        <ClinicsTable
          clinics={page.sortedClinics}
          loading={page.loading}
          currentClinicId={session.user.clinicaId}
          canManagePlatformClinics={isSuperAdmin}
          sortBy={page.sortBy}
          sortDirection={page.sortDirection}
          onSortChange={page.changeSort}
          onEdit={page.openEdit}
          onDeactivate={page.deactivate}
          onSwitch={page.switchClinic}
        />
      </DataPanel>
      {page.formOpen && (
        <ClinicForm
          session={session}
          editing={page.editing}
          form={page.form}
          setForm={page.setForm}
          photoPreview={page.photoPreview}
          setPhotoPreview={page.setPhotoPreview}
          saving={page.saving}
          onPhotoChange={page.handlePhotoChange}
          onSubmit={page.submit}
          onClose={page.closeForm}
        />
      )}
    </section>
  );
}
