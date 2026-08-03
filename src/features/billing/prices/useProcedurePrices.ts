import { useState, type SetStateAction } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ConvenioProcedimentoPreco } from '../billingDomainTypes';
import {
  deactivateConvenioProcedimentoPreco,
  getConvenioProcedimentoPrecos,
  saveConvenioProcedimentoPreco,
  updateConvenioProcedimentoPreco,
} from '../../../services';
import type { ProcedurePricePayload } from '../../../services/financeiroService';
import type { PriceFormState } from '../billingPageTypes';
import { queryKeys } from '../../../shared/queryKeys';

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

export function useProcedurePrices(token = '') {
  const queryClient = useQueryClient();
  const pricesQuery = useQuery({
    queryKey: queryKeys.billingPrices(token),
    queryFn: () => getConvenioProcedimentoPrecos(token),
    enabled: false,
  });
  const setPrecos = (value: SetStateAction<ConvenioProcedimentoPreco[]>) => {
    queryClient.setQueryData<ConvenioProcedimentoPreco[]>(
      queryKeys.billingPrices(token),
      (current = []) => (typeof value === 'function' ? value(current) : value),
    );
  };
  const [price, setPrice] = useState(createInitialPriceForm);
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const loadProcedurePrices = async (_token: string) => {
    await pricesQuery.refetch();
  };
  const saveProcedurePrice = (id: number | null, payload: ProcedurePricePayload, token: string) =>
    id
      ? updateConvenioProcedimentoPreco(id, payload, token)
      : saveConvenioProcedimentoPreco(payload, token);
  const deactivateProcedurePrice = (id: number, token: string) =>
    deactivateConvenioProcedimentoPreco(id, token);

  return {
    precos: pricesQuery.data ?? [],
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
