import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { buildEmptyForm } from "./features/events/AgendaPage";
import * as api from "./services";
import { CbhpmLookupModal } from "./features/patients/CbhpmLookupModal";
import { queryClient } from "./queryClient";
import type { AuthSession, Paciente, PacienteObservacao, User } from "./types";
import {
  basePaciente,
  baseUser,
  buildMedicalLicense,
  mockSession,
  paged,
  SESSION_KEY,
} from "./test/appTestData";
import {
  getVisibleFirstColumnValues,
  openPatientsModule,
  openUsersModule,
  renderAuthenticatedApp,
} from "./test/appTestUi";
import { createJwtToken, setupAppTest } from "./test/appTestSetup";

vi.mock("./services", async () => {
  const { createAppServicesMock } = await import("./test/appServicesMock");
  return createAppServicesMock();
});


describe("App medical access", () => {
  beforeEach(setupAppTest);

  it("libera gestao de pacientes para medico com feature de gerenciamento", async () => {
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: "Medicos",
        nome: "Dra. Ana",
        licenca: buildMedicalLicense([
          "Dashboard.Visualizar",
          "Pacientes.Visualizar",
          "Pacientes.Gerenciar",
          "Cbhpm.Consultar",
        ]),
      },
    });

    expect(
      await screen.findByRole("heading", { name: "Painel inicial" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /abrir usuários/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /abrir meu cadastro/i }),
    ).toBeInTheDocument();

    await openPatientsModule(user);
    expect(await screen.findByText("Paciente Hemodinks")).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /novo paciente/i }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Cirurgião")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Convênio")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Procedimento")).not.toBeInTheDocument();
    expect(api.getPacientes).toHaveBeenCalledWith("jwt-token", {
      page: 1,
      pageSize: 10,
      search: "",
      sortBy: "recent",
      sortDirection: "desc",
    });
    expect(api.getScopedMedicalUsers).toHaveBeenCalledWith("jwt-token");

    await user.click(
      screen.getByRole("button", { name: /editar paciente hemodinks/i }),
    );

    expect(
      await screen.findByRole("heading", { name: "Editar paciente" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Cirurgião")).not.toBeInTheDocument();
    expect(screen.getByLabelText("E-mail de acesso")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /salvar paciente/i }),
    ).toBeInTheDocument();
  });

  it("carrega a licenca atual do medico quando ela nao vem no login e libera pacientes", async () => {
    vi.mocked(api.getCurrentLicenca).mockResolvedValue(
      buildMedicalLicense([
        "Dashboard.Visualizar",
        "Pacientes.Visualizar",
        "Pacientes.Gerenciar",
        "Cbhpm.Consultar",
      ]),
    );

    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: "Medicos",
        nome: "Dra. Ana",
        licenca: null,
      },
    });

    expect(
      await screen.findByRole("heading", { name: "Painel inicial" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(api.getCurrentLicenca).toHaveBeenCalledWith("jwt-token");
    });

    await openPatientsModule(user);
    expect(await screen.findByText("Paciente Hemodinks")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /novo paciente/i }),
    ).toBeInTheDocument();
  });

  it("libera cadastro, edicao, arquivos e foto para medico mesmo sem feature de gerenciamento", async () => {
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: "Medicos",
        nome: "Dra. Ana",
        licenca: buildMedicalLicense(),
      },
    });

    await openPatientsModule(user);
    expect(await screen.findByText("Paciente Hemodinks")).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /novo paciente/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /novo paciente/i }));
    expect(
      await screen.findByRole("heading", { name: "Novo paciente" }),
    ).toBeInTheDocument();
    await user.type(
      screen.getByLabelText("Nome completo"),
      "Paciente cadastral do médico",
    );
    expect(screen.getByLabelText("Nome completo")).toHaveValue(
      "Paciente cadastral do médico",
    );
    await user.click(
      screen.getByRole("button", { name: /voltar para lista/i }),
    );
    expect(await screen.findByText("Paciente Hemodinks")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /editar paciente hemodinks/i }),
    );

    expect(
      await screen.findByRole("heading", { name: "Editar paciente" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /salvar paciente/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Selecionar arquivos")).toBeInTheDocument();
    expect(screen.queryByLabelText("Foto do paciente")).not.toBeInTheDocument();
  });

  it("exibe pacientes para medico mesmo sem feature explicita de pacientes na licenca", async () => {
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: "Medicos",
        nome: "Dra. Ana",
        licenca: buildMedicalLicense([
          "Dashboard.Visualizar",
          "Cbhpm.Consultar",
        ]),
      },
    });

    expect(
      await screen.findByRole("heading", { name: "Painel inicial" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /abrir pacientes/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /abrir usuários/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /abrir configuração do sistema/i }),
    ).not.toBeInTheDocument();

    await openPatientsModule(user);
    expect(await screen.findByText("Paciente Hemodinks")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /novo paciente/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /editar paciente hemodinks/i }),
    ).toBeInTheDocument();
  });

  it("separa consulta CBHPM do cadastro de paciente para medico", async () => {
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: "Medicos",
        nome: "Dra. Ana",
        licenca: buildMedicalLicense([
          "Dashboard.Visualizar",
          "Pacientes.Visualizar",
          "Pacientes.Gerenciar",
        ]),
      },
    });

    await openPatientsModule(user);
    await user.click(screen.getByRole("button", { name: /novo paciente/i }));
    expect(
      screen.queryByRole("button", { name: /adicionar procedimento/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /dados clínicos, procedimentos e valores são registrados no atendimento/i,
      ),
    ).toBeInTheDocument();
  });

  it("preserva medico fora da lista escopada ao editar e salvar paciente", async () => {
    vi.mocked(api.getPaciente).mockResolvedValue({
      ...basePaciente,
      medicoUserId: 55,
      medico: "Dr. Fora da Lista",
      medicoAuxiliar1UserId: 2,
      medicoAuxiliar1: "Bruno Hemodinks",
      medicoAuxiliar2UserId: null,
      medicoAuxiliar2: "",
    });
    vi.mocked(api.updatePaciente).mockResolvedValue({
      ...basePaciente,
      medicoUserId: 55,
      medico: "Dr. Fora da Lista",
      medicoAuxiliar1UserId: 2,
      medicoAuxiliar1: "Bruno Hemodinks",
      medicoAuxiliar2UserId: null,
      medicoAuxiliar2: "",
    });

    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: "Medicos",
        nome: "Dra. Ana",
        licenca: buildMedicalLicense([
          "Dashboard.Visualizar",
          "Pacientes.Visualizar",
          "Pacientes.Gerenciar",
          "Cbhpm.Consultar",
        ]),
      },
    });

    await openPatientsModule(user);
    await user.click(
      screen.getByRole("button", { name: /editar paciente hemodinks/i }),
    );

    expect(
      await screen.findByRole("heading", { name: "Editar paciente" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Cirurgião")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /salvar paciente/i }));

    await waitFor(() => {
      expect(api.updatePaciente).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          medicoUserId: 55,
          medico: "Dr. Fora da Lista",
        }),
        "jwt-token",
      );
    });
  });

  it("nao exibe perfil paciente no cadastro de usuario", async () => {
    const { user } = await renderAuthenticatedApp();

    await openUsersModule(user);
    await user.click(
      await screen.findByRole("button", { name: /novo usuário/i }),
    );
    expect(
      await screen.findByRole("option", { name: "Médicos" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Paciente" }),
    ).not.toBeInTheDocument();
  });

  it("permite ao Super Administrador editar o próprio cadastro com todos os perfis e confirma a troca de perfil", async () => {
    const superUser: User = {
      ...baseUser,
      id: 99,
      nome: "George Marcone",
      email: "gmarcone@gmail.com",
      telefone: "+5581999999999",
      crm: null,
      crmUf: null,
      perfilId: 5,
      perfilNome: "SuperAdministrador",
    };
    vi.mocked(api.getUsers).mockResolvedValue(paged([superUser]));
    vi.mocked(api.getUser).mockResolvedValue(superUser);
    vi.mocked(api.updateUser).mockResolvedValue({
      ...superUser,
      perfilId: 1,
      perfilNome: "Administrador",
    });

    const { user } = await renderAuthenticatedApp({
      sessionOverrides: { perfilId: 5, perfilNome: "SuperAdministrador" },
    });

    await openUsersModule(user);
    await user.click(await screen.findByLabelText("Editar George Marcone"));

    const profileSelect = await screen.findByLabelText("Perfil");
    expect(within(profileSelect).getByRole("option", { name: "Administrador" })).toBeInTheDocument();
    expect(within(profileSelect).getByRole("option", { name: "Médicos" })).toBeInTheDocument();
    expect(within(profileSelect).getByRole("option", { name: "Paciente" })).toBeInTheDocument();
    expect(within(profileSelect).getByRole("option", { name: "Controller" })).toBeInTheDocument();
    expect(within(profileSelect).getByRole("option", { name: "SuperAdministrador" })).toBeInTheDocument();

    await user.selectOptions(profileSelect, "1");
    await user.click(screen.getByRole("button", { name: /salvar alterações/i }));

    expect(api.updateUser).not.toHaveBeenCalled();
    const confirmation = screen.getByRole("dialog", { name: "Alterar seu próprio perfil?" });
    expect(within(confirmation).getByText(/perder o acesso à administração/i)).toBeInTheDocument();
    await user.click(within(confirmation).getByRole("button", { name: /alterar meu perfil/i }));

    await waitFor(() => {
      expect(api.updateUser).toHaveBeenCalledWith(
        99,
        expect.objectContaining({ perfilId: 1 }),
        "jwt-token",
      );
    });
    expect(await screen.findByRole("heading", { name: "Acesso ao sistema" })).toBeInTheDocument();
  });


});
