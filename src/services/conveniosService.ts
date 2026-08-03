import type { Convenio } from '../shared/domain/patientContracts';
import { normalizeDisplayText } from '../shared/utils/formatters';
import { get } from './api';

export async function getConvenios(token: string) {
  const convenios = await get<Convenio[]>('/api/convenios/', token);

  return convenios.map((convenio) => ({
    ...convenio,
    descricaoConvenio: normalizeDisplayText(convenio.descricaoConvenio),
  }));
}
