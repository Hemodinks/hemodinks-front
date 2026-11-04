import { getMedicalGroups, listTeams } from '../../services';
import type { MedicalGroup, Team } from '../../types';
import { buildBillingRecords } from '../billing/billingUtils';
import { loadBillingPatients } from '../billing/billingPageUtils';
import type { ReportData } from './reportTypes';
import { collectConsistentPages } from '../../shared/utils/collectConsistentPages';
import { sessionEpoch } from '../../services/sessionEpoch';

async function loadAllMedicalGroups(token: string) {
  const epoch = sessionEpoch();
  return collectConsistentPages<MedicalGroup>(page => getMedicalGroups(token, { page, pageSize: 100, sortBy: 'recent', sortDirection: 'desc' }),
    () => epoch === sessionEpoch());
}

export async function loadReportData(token: string, tipoCirurgia?: import('../../shared/surgeryType').TipoCirurgia | ''): Promise<ReportData> {
  const [patientsResult, groupsResult, teamsResult] = await Promise.allSettled([
    loadBillingPatients(token, { tipoCirurgia, search: '', medico: '', convenio: '', procedimento: '', competenciaInicio: '', competenciaFinal: '' }),
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
