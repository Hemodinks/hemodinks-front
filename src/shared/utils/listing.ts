import type { Convenio, MedicalUserOption, OpmeFornecedor, User } from '../../types';
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


export function sortUsersByName<T extends Pick<User | MedicalUserOption, 'nome'>>(items: T[]) {
  return [...items].sort((first, second) => listingNameCollator.compare(first.nome, second.nome));
}

export function sortConveniosByDescription(items: Convenio[]) {
  return [...items].sort((first, second) => listingNameCollator.compare(first.descricaoConvenio, second.descricaoConvenio));
}

export function sortOpmeFornecedoresByName(items: OpmeFornecedor[]) {
  return [...items].sort((first, second) => listingNameCollator.compare(first.fornecedor, second.fornecedor));
}
