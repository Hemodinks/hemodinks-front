import type { PublicHoliday } from '../types';
import { getExternal } from './api';

export async function getBrazilPublicHolidays(year: number) {
  try {
    return await getExternal<PublicHoliday[]>(`https://date.nager.at/api/v3/PublicHolidays/${year}/BR`);
  } catch {
    throw new Error('Nao foi possivel carregar feriados nacionais.');
  }
}
