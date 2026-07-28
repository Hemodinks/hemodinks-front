import { useState } from 'react';
import type { ConvenioProcedimentoPreco } from './billingDomainTypes';
import {
  deactivateConvenioProcedimentoPreco,
  getConvenioProcedimentoPrecos,
  saveConvenioProcedimentoPreco,
  updateConvenioProcedimentoPreco,
} from '../../services';
import type { ProcedurePricePayload } from '../../services/financeiroService';
import type { PriceFormState } from './billingPageTypes';

export function createInitialPriceForm(): PriceFormState {
  return {
    convenioId: '',
    cbhpmCodigo: '',
    valorNegociado: '',
    percentualPrincipal: '100',
    percentualAuxiliar1: '0',
    percentualAuxiliar2: '0',
    vigenciaInicio: new Date().toISOString().slice(0, 10),
    vigenciaFinal: '',
  };
}

export function useProcedurePrices() {
  const [precos, setPrecos] = useState<ConvenioProcedimentoPreco[]>([]);
  const [price, setPrice] = useState(createInitialPriceForm);
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const loadProcedurePrices = async (token: string) => {
    setPrecos(await getConvenioProcedimentoPrecos(token));
  };
  const saveProcedurePrice = (id: number | null, payload: ProcedurePricePayload, token: string) =>
    id
      ? updateConvenioProcedimentoPreco(id, payload, token)
      : saveConvenioProcedimentoPreco(payload, token);
  const deactivateProcedurePrice = (id: number, token: string) =>
    deactivateConvenioProcedimentoPreco(id, token);

  return {
    precos,
    setPrecos,
    price,
    setPrice,
    editingPriceId,
    setEditingPriceId,
    loadProcedurePrices,
    saveProcedurePrice,
    deactivateProcedurePrice,
  };
}
