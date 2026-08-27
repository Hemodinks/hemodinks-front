import { Search, X } from 'lucide-react';
import type { PacienteProcedimento } from '../../../types';
import { Button, IconButton } from '../../../shared/components/ui';
import { formatCurrency } from '../../../shared/utils/formatters';

type Props = {
  procedimentos: PacienteProcedimento[];
  formReadOnly: boolean;
  onOpen: () => void;
  onRemove: (index: number) => void;
};

export function PatientProceduresSection({ procedimentos, formReadOnly, onOpen, onRemove }: Props) {
  return (
    <div className="procedure-field">
      <span className="field-label">Procedimento</span>
      <div className="procedure-selector">
        <Button className="procedure-select-button" onClick={onOpen} disabled={formReadOnly} data-tour="patients-procedure">
          <Search size={17} />
          Adicionar procedimento
        </Button>
        {procedimentos.length ? (
          <div className="selected-procedure-list">
            {procedimentos.map((procedimento, index) => (
              <div className="selected-procedure" key={`${procedimento.cbhpmCodigo || procedimento.procedimento}-${index}`}>
                <div className="selected-procedure-main">
                  <span>{procedimento.cbhpmCodigo || 'Sem código'}</span>
                  <strong>{procedimento.procedimento}</strong>
                  {procedimento.valorReferencia != null && <small>Valor referência: {formatCurrency(procedimento.valorReferencia)}</small>}
                </div>
                <div className="selected-procedure-actions">
                  {procedimento.cbhpmPorte && <span className="status-pill active">{procedimento.cbhpmPorte}</span>}
                  {!formReadOnly && (
                    <IconButton label="Remover procedimento" tone="muted" className="mini" onClick={() => onRemove(index)}>
                      <X size={14} />
                    </IconButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : <span className="file-hint">Nenhum procedimento selecionado.</span>}
      </div>
    </div>
  );
}
