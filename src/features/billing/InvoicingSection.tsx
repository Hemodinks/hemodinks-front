import { useMemo, useState } from 'react';
import { Button, DataPanel, SelectField, TextField } from '../../shared/components/ui';
import { InvoicingForm } from './InvoicingForm';
import { InvoicingTable } from './InvoicingTable';
import type { InvoicingSectionProps } from './invoicingSectionTypes';

export type { InvoicingSectionProps } from './invoicingSectionTypes';

function formatStatus(status: string) {
  return status.replace(/([a-zá-ú])([A-ZÁ-Ú])/g, '$1 $2');
}

export function InvoicingSection(props: InvoicingSectionProps) {
  const [patientFilter, setPatientFilter] = useState('');
  const [guideFilter, setGuideFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const filteredInvoices = useMemo(() => {
    const normalizedPatient = patientFilter.trim().toLocaleLowerCase('pt-BR');
    const normalizedGuide = guideFilter.trim().toLocaleLowerCase('pt-BR');
    return props.faturamentos.filter(
      (item) =>
        (!normalizedPatient ||
          item.paciente.toLocaleLowerCase('pt-BR').includes(normalizedPatient)) &&
        (!normalizedGuide ||
          (item.numeroGuia ?? '').toLocaleLowerCase('pt-BR').includes(normalizedGuide)) &&
        (!statusFilter || item.status === statusFilter),
    );
  }, [guideFilter, patientFilter, props.faturamentos, statusFilter]);

  return (
    <>
      <InvoicingForm {...props} />
      <DataPanel className="billing-table-panel">
        <div className="billing-list-filters" aria-label="Filtros de faturamento">
          <TextField
            label="Nome do paciente"
            value={patientFilter}
            onValueChange={setPatientFilter}
          />
          <TextField label="Guia" value={guideFilter} onValueChange={setGuideFilter} />
          <SelectField
            label="Status do faturamento"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">Todos</option>
            {[
              'Rascunho',
              'ProntoParaEnvio',
              'Enviado',
              'EmAnalise',
              'GlosadoParcial',
              'GlosadoTotal',
              'Aprovado',
              'ParcialmentePago',
              'Pago',
              'Cancelado',
            ].map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </SelectField>
          <Button
            type="button"
            onClick={() => {
              setPatientFilter('');
              setGuideFilter('');
              setStatusFilter('');
            }}
          >
            Limpar filtros
          </Button>
        </div>
        <InvoicingTable {...props} faturamentos={filteredInvoices} />
      </DataPanel>
    </>
  );
}
