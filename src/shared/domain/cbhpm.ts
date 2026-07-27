import type { Paciente, PacienteProcedimento } from "../../types";

export function normalizeCbhpmCodigo(value?: string | null) {
  return value?.replace(/\D/g, "") ?? "";
}

export function normalizePacienteProcedimentos(
  procedimentos: PacienteProcedimento[],
) {
  const seen = new Set<string>();

  return procedimentos
    .map((item) => ({
      cbhpmCodigo: normalizeCbhpmCodigo(item.cbhpmCodigo) || null,
      cbhpmPorte: item.cbhpmPorte?.trim() || null,
      procedimento: item.procedimento.trim(),
      valorReferencia: item.valorReferencia ?? null,
    }))
    .filter((item) => item.procedimento)
    .filter((item) => {
      const key = item.cbhpmCodigo
        ? `codigo:${item.cbhpmCodigo}`
        : `livre:${item.procedimento}:${item.cbhpmPorte || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function getPacienteProcedimentosFromPaciente(paciente: Paciente) {
  return normalizePacienteProcedimentos(
    paciente.procedimentos?.length
      ? paciente.procedimentos
      : [
          {
            cbhpmCodigo: paciente.cbhpmCodigo,
            cbhpmPorte: paciente.cbhpmPorte,
            procedimento: paciente.procedimento || "",
          },
        ],
  );
}
