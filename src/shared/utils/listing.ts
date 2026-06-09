import type { Convenio, Paciente, User } from '../../types';
import { PAGE_SIZE } from './formatters';

export function getPagedItems<T>(result: { items: T[] } | T[]) {
  return Array.isArray(result) ? result : result.items;
}

export function getPagedTotal<T>(result: { totalItems: number } | T[]) {
  return Array.isArray(result) ? result.length : result.totalItems;
}

export function getPagedTotalPages<T>(result: { totalPages: number } | T[]) {
  return Array.isArray(result) ? Math.max(1, Math.ceil(result.length / PAGE_SIZE)) : result.totalPages;
}

const listingNameCollator = new Intl.Collator('pt-BR', {
  numeric: true,
  sensitivity: 'base',
});

const updateDateFields = ['dataAtualizacao', 'dataAlteracao', 'updatedAt', 'modifiedAt'] as const;
const creationDateFields = ['dataCadastro', 'dataCriacao', 'createdAt'] as const;

function getDateFieldTime(item: Record<string, unknown>, fields: readonly string[]) {
  return fields.reduce((latest, field) => {
    const value = item[field];

    if (typeof value !== 'string' || !value) {
      return latest;
    }

    const time = new Date(value).getTime();
    return Number.isNaN(time) ? latest : Math.max(latest, time);
  }, 0);
}

function getRecordActivityTime(item: Record<string, unknown> & { id: number }) {
  const updatedTime = getDateFieldTime(item, updateDateFields);
  const createdTime = getDateFieldTime(item, creationDateFields);
  return Math.max(updatedTime, createdTime) || item.id;
}

function compareByRecentActivityThenName<T extends Record<string, unknown> & { id: number }>(
  first: T,
  second: T,
  getName: (item: T) => string,
) {
  const activityDiff = getRecordActivityTime(second) - getRecordActivityTime(first);

  if (activityDiff !== 0) {
    return activityDiff;
  }

  const nameDiff = listingNameCollator.compare(getName(first), getName(second));

  if (nameDiff !== 0) {
    return nameDiff;
  }

  return second.id - first.id;
}

export function sortUsersForListing(items: User[]) {
  return [...items].sort((first, second) => compareByRecentActivityThenName(first, second, (user) => user.nome));
}

export function sortPacientesForListing(items: Paciente[]) {
  return [...items].sort((first, second) => compareByRecentActivityThenName(first, second, (paciente) => paciente.nomePaciente));
}

export function sortUsersByName(items: User[]) {
  return [...items].sort((first, second) => listingNameCollator.compare(first.nome, second.nome));
}

export function sortConveniosByDescription(items: Convenio[]) {
  return [...items].sort((first, second) => listingNameCollator.compare(first.descricaoConvenio, second.descricaoConvenio));
}
