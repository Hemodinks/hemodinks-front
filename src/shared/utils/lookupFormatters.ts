import type {
  HealthPlanLookup,
  HospitalLookup,
  MedicalUserLookup,
  OpmeSupplierLookup,
} from '../domain/medicalContracts';

const DISPLAY_TEXT_FIXES = new Map<string, string>([
  ['Bradesco Sa\u00c3\u00bade', 'Bradesco Saúde'],
  ['Bradesco Sa\uFFFDde', 'Bradesco Saúde'],
  ['Cemig Sa\u00c3\u00bade', 'Cemig Saúde'],
  ['Cemig Sa\uFFFDde', 'Cemig Saúde'],
  ['Sul Am\u00c3\u00a9rica', 'Sul América'],
  ['Sul Am\uFFFDrica', 'Sul América'],
  [
    'Unimed Uberl\u00c3\u00a2ndia - Plano  Unimed Interc\u00c3\u00a2mbio',
    'Unimed Uberlândia - Plano  Unimed Intercâmbio',
  ],
  [
    'Unimed Uberl\uFFFDndia - Plano  Unimed Interc\uFFFDmbio',
    'Unimed Uberlândia - Plano  Unimed Intercâmbio',
  ],
]);

export function normalizeDisplayText(value?: string | null) {
  const trimmedValue = value?.trim() ?? '';
  return DISPLAY_TEXT_FIXES.get(trimmedValue) ?? trimmedValue;
}

export function normalizeLookupText(value: string) {
  return normalizeDisplayText(value).trim().toLocaleLowerCase('pt-BR');
}

export function findMedicalUserByName<T extends MedicalUserLookup>(users: T[], name: string) {
  const normalizedName = normalizeLookupText(name);
  return normalizedName
    ? users.find((user) => normalizeLookupText(user.nome) === normalizedName)
    : undefined;
}

export function findConvenioByDescription<T extends HealthPlanLookup>(
  convenios: T[],
  descricao: string,
) {
  const normalizedDescricao = normalizeLookupText(descricao);
  return normalizedDescricao
    ? convenios.find(
        (convenio) => normalizeLookupText(convenio.descricaoConvenio) === normalizedDescricao,
      )
    : undefined;
}

export function findHospitalByName<T extends HospitalLookup>(hospitais: T[], nome: string) {
  const normalizedNome = normalizeLookupText(nome);
  return normalizedNome
    ? hospitais.find((hospital) => normalizeLookupText(hospital.nome) === normalizedNome)
    : undefined;
}

export function findOpmeFornecedorByName<T extends OpmeSupplierLookup>(
  fornecedores: T[],
  fornecedor: string,
) {
  const normalizedFornecedor = normalizeLookupText(fornecedor);
  return normalizedFornecedor
    ? fornecedores.find((item) => normalizeLookupText(item.fornecedor) === normalizedFornecedor)
    : undefined;
}
