import { getMedicalGroups, listTeams } from '../../services';
import type { MedicalGroup, Team } from '../../types';
import { buildBillingRecords } from '../billing/billingUtils';
import { loadBillingPatients } from '../billing/billingPageUtils';
import type { ReportData } from './reportTypes';

async function loadAllMedicalGroups(token: string) {
  const groups: MedicalGroup[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await getMedicalGroups(token, { page, pageSize: 100, sortBy: 'recent', sortDirection: 'desc' });
    groups.push(...response.items);
    totalPages = response.totalPages;
    page += 1;
  } while (page <= totalPages);
  return groups;
}

export async function loadReportData(token: string): Promise<ReportData> {
  const [patientsResult, groupsResult, teamsResult] = await Promise.allSettled([
    loadBillingPatients(token, { search: '', medico: '', convenio: '', procedimento: '', competenciaInicio: '', competenciaFinal: '' }),
    loadAllMedicalGroups(token),
    listTeams(token),
  ]);

  if (patientsResult.status === 'rejected') throw patientsResult.reason;
  const unavailableCatalogs: string[] = [];
  if (groupsResult.status === 'rejected') unavailableCatalogs.push('grupos médicos');
  if (teamsResult.status === 'rejected' || !Array.isArray(teamsResult.value)) unavailableCatalogs.push('equipes');

  return {
    records: buildBillingRecords(patientsResult.value),
    medicalGroups: groupsResult.status === 'fulfilled' ? groupsResult.value : [],
    teams: teamsResult.status === 'fulfilled' && Array.isArray(teamsResult.value) ? teamsResult.value as Team[] : [],
    unavailableCatalogs,
  };
}
