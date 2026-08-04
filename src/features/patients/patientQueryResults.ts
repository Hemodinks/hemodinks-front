import { queryClient } from '../../queryClient';
import type { MedicalUserOption } from '../../shared/domain/clinicalContracts';
import {
  getPagedItems,
  getPagedTotal,
  getPagedTotalPages,
  sortConveniosByDescription,
  sortOpmeFornecedoresByName,
  sortPacientesForListing,
  sortUsersByName,
} from '../../shared/utils/listing';
import type { CbhpmGeral, Convenio, Hospital, OpmeFornecedor, Paciente } from './patientTypes';
import type { PagedResult } from '../../shared/domain/apiTypes';

export async function refreshPatientQuery(
  token: string | undefined,
  forceRefresh: boolean,
  queryKey: readonly unknown[],
  refetch: () => Promise<unknown>,
  allowed = true,
) {
  if (!token || !allowed) return;
  if (forceRefresh) await queryClient.invalidateQueries({ queryKey });
  await refetch();
}

export function selectPatientPage(data?: PagedResult<Paciente> | Paciente[]) {
  const result = data ?? [];
  return {
    items: sortPacientesForListing(getPagedItems(result)),
    totalItems: getPagedTotal(result),
    totalPages: getPagedTotalPages(result),
  };
}

export function selectMedicalUsers(data?: PagedResult<MedicalUserOption> | MedicalUserOption[]) {
  return sortUsersByName(getPagedItems(data ?? []));
}

export function selectConvenios(data: Convenio[] | undefined) {
  return sortConveniosByDescription(data ?? []);
}

export function selectOpmeFornecedores(data: OpmeFornecedor[] | undefined) {
  return sortOpmeFornecedoresByName(data ?? []);
}

export function selectHospitais(data: Hospital[] | undefined) {
  return data ?? [];
}

export function selectCbhpmPage(data?: PagedResult<CbhpmGeral> | CbhpmGeral[]) {
  const result = data ?? [];
  return {
    items: getPagedItems(result),
    totalItems: getPagedTotal(result),
    totalPages: getPagedTotalPages(result),
  };
}
