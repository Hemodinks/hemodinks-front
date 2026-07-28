import type { FormEvent } from 'react';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import type { ConvenioProcedimentoPreco } from './billingDomainTypes';
import type { RunBillingAction, SetConfirmAction } from './billingWorkflowTypes';
import { createInitialPriceForm, type useProcedurePrices } from './useProcedurePrices';

type PriceState = ReturnType<typeof useProcedurePrices>;

type PriceWorkflowOptions = {
  session: AuthSession;
  prices: PriceState;
  run: RunBillingAction;
  setConfirmAction: SetConfirmAction;
};

export function usePriceWorkflow({ session, prices, run, setConfirmAction }: PriceWorkflowOptions) {
  const {
    deactivateProcedurePrice,
    editingPriceId,
    price,
    saveProcedurePrice,
    setEditingPriceId,
    setPrice,
  } = prices;

  const resetForm = () => {
    setEditingPriceId(null);
    setPrice(createInitialPriceForm());
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      id: editingPriceId,
      convenioId: Number(price.convenioId),
      cbhpmCodigo: price.cbhpmCodigo,
      valorNegociado: Number(price.valorNegociado),
      percentualPrincipal: Number(price.percentualPrincipal),
      percentualAuxiliar1: Number(price.percentualAuxiliar1),
      percentualAuxiliar2: Number(price.percentualAuxiliar2),
      vigenciaInicio: price.vigenciaInicio,
      vigenciaFinal: price.vigenciaFinal || null,
      ativo: true,
    };
    const completed = await run(
      () => saveProcedurePrice(editingPriceId, payload, session.token),
      editingPriceId ? 'Preço negociado atualizado.' : 'Preço negociado salvo com vigência.',
    );
    if (completed) resetForm();
  };

  const edit = (item: ConvenioProcedimentoPreco) => {
    setEditingPriceId(item.id);
    setPrice({
      convenioId: String(item.convenioId),
      cbhpmCodigo: item.cbhpmCodigo,
      valorNegociado: String(item.valorNegociado),
      percentualPrincipal: String(item.percentualPrincipal),
      percentualAuxiliar1: String(item.percentualAuxiliar1),
      percentualAuxiliar2: String(item.percentualAuxiliar2),
      vigenciaInicio: item.vigenciaInicio.slice(0, 10),
      vigenciaFinal: item.vigenciaFinal?.slice(0, 10) || '',
    });
  };

  const confirmDeactivate = (item: ConvenioProcedimentoPreco) => {
    setConfirmAction({
      title: 'Desativar preço',
      message: `Desativar o preço ${item.cbhpmCodigo}? O histórico será preservado.`,
      action: () => deactivateProcedurePrice(item.id, session.token),
      success: 'Preço desativado.',
    });
  };

  return { resetForm, submit, edit, confirmDeactivate };
}
