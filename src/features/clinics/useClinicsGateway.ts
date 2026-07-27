import {
  createPlatformClinic,
  deactivatePlatformClinic,
  listPlatformClinics,
  selectSessionClinic,
  updatePlatformClinic,
} from "../../services";
import type { ClinicPayload } from "../../types";

export function useClinicsGateway(token: string) {
  return {
    list: () => listPlatformClinics(token),
    create: (payload: ClinicPayload) => createPlatformClinic(payload, token),
    update: (id: number, payload: ClinicPayload) =>
      updatePlatformClinic(id, payload, token),
    deactivate: (id: number) => deactivatePlatformClinic(id, token),
    select: (id: number) => selectSessionClinic(id, token),
  };
}
