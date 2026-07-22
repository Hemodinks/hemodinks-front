import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession, ContaReceber, Faturamento } from "../../types";
import { BillingPage } from "./BillingPage";
import * as services from "../../services";

vi.mock("../../services", () => ({
  getAtendimentos: vi.fn(),
  getFaturamentos: vi.fn(),
  getContasReceber: vi.fn(),
  getConvenioProcedimentoPrecos: vi.fn(),
  getPacientes: vi.fn(),
  getHospitais: vi.fn(),
  getFinanceiroResumo: vi.fn(),
  createAtendimento: vi.fn(),
  createFaturamento: vi.fn(),
  updateFaturamentoStatus: vi.fn(),
  registrarRetornoFaturamento: vi.fn(),
  registrarRecursoGlosa: vi.fn(),
  gerarContaReceber: vi.fn(),
  registrarRecebimento: vi.fn(),
  estornarRecebimento: vi.fn(),
  saveConvenioProcedimentoPreco: vi.fn(),
  uploadComprovanteRecebimento: vi.fn(),
  downloadComprovanteRecebimento: vi.fn(),
  searchContasReceber: vi.fn(),
  updateFaturamentoItem: vi.fn(),
  getCbhpmGeral: vi.fn(),
  updateGlosa: vi.fn(),
  deleteGlosa: vi.fn(),
  updateRecursoGlosa: vi.fn(),
  deleteRecursoGlosa: vi.fn(),
  updateContaReceber: vi.fn(),
  cancelContaReceber: vi.fn(),
  updateConvenioProcedimentoPreco: vi.fn(),
  deactivateConvenioProcedimentoPreco: vi.fn(),
}));

const session = {
  token: "token",
  user: {
    id: 1,
    clinicaId: 1,
    clinicaSlug: "hemodinks",
    nome: "Admin",
    email: "admin@test.local",
    precisaTrocarSenha: false,
    perfilId: 1,
    perfilNome: "Administrador",
  },
} as AuthSession;
const atendimento = {
  id: 1,
  pacienteId: 1,
  paciente: "Paciente Teste",
  dataProcedimento: "2026-07-10",
  convenioId: 1,
  medicoResponsavelId: 2,
  status: "Realizado",
  procedimentos: [
    {
      id: 1,
      cbhpmCodigo: "123",
      descricao: "Cirurgia",
      quantidade: 1,
      pesoPercentual: 100,
      valorReferencia: 1000,
      valorNegociado: 900,
      ordem: 1,
    },
  ],
} as const;
const draft = {
  id: 1,
  atendimentoCirurgicoId: 1,
  pacienteId: 1,
  paciente: "Paciente Teste",
  convenioId: 1,
  numeroGuia: "G-1",
  competencia: "2026-07-01",
  valorApresentado: 900,
  valorGlosado: 0,
  valorGlosaRecuperada: 0,
  valorReconhecido: 900,
  status: "Rascunho",
  rowVersion: "",
  itens: [
    {
      id: 1,
      codigo: "123",
      descricao: "Cirurgia",
      quantidade: 1,
      pesoPercentual: 100,
      valorUnitario: 900,
      valorApresentado: 900,
      valorGlosado: 0,
      valorAprovado: 900,
      status: "Rascunho",
      ordem: 1,
    },
  ],
  glosas: [],
} as Faturamento;
const conta = {
  id: 1,
  faturamentoId: 1,
  pacienteId: 1,
  paciente: "Paciente Teste",
  convenioId: 1,
  numeroDocumento: "TIT-1",
  descricao: "Honorários",
  competencia: "2026-07-01",
  dataEmissao: "2026-07-10",
  dataVencimento: "2026-07-20",
  valorOriginal: 900,
  valorAjustado: 900,
  valorRecebido: 300,
  saldoAberto: 600,
  status: "Vencido",
  rowVersion: "",
  recebimentos: [
    {
      id: 1,
      dataRecebimento: "2026-07-15",
      valorRecebido: 300,
      formaRecebimento: "Pix",
      documentoComprovante: "https://storage.test/file",
      estornado: false,
    },
  ],
} as ContaReceber;

function setupMocks() {
  vi.mocked(services.getAtendimentos).mockResolvedValue([atendimento as never]);
  vi.mocked(services.getFaturamentos).mockResolvedValue([draft]);
  vi.mocked(services.getContasReceber).mockResolvedValue([conta]);
  vi.mocked(services.getConvenioProcedimentoPrecos).mockResolvedValue([]);
  vi.mocked(services.getCbhpmGeral).mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
  });
  vi.mocked(services.getPacientes).mockResolvedValue({
    items: [{ id: 1, nomePaciente: "Paciente Teste" }],
    page: 1,
    pageSize: 100,
    totalItems: 1,
    totalPages: 1,
  } as never);
  vi.mocked(services.getHospitais).mockResolvedValue([
    { id: 1, nome: "Hospital Teste" },
  ]);
  vi.mocked(services.getFinanceiroResumo).mockResolvedValue({
    valorApresentado: 900,
    valorGlosado: 0,
    valorRecuperado: 0,
    valorReconhecido: 900,
    valorRecebido: 300,
    saldoAberto: 600,
    valorVencido: 600,
    recebimentosPeriodo: 300,
    titulosVencidos: 1,
    porCompetencia: [],
  });
  vi.mocked(services.searchContasReceber).mockResolvedValue({
    items: [conta],
    page: 1,
    pageSize: 10,
    totalItems: 1,
    totalPages: 1,
  });
  vi.mocked(services.createAtendimento).mockResolvedValue(atendimento as never);
  vi.mocked(services.updateFaturamentoItem).mockResolvedValue(draft);
  vi.mocked(services.registrarRecebimento).mockResolvedValue(conta);
  vi.mocked(services.estornarRecebimento).mockResolvedValue(conta);
  vi.mocked(services.updateFaturamentoStatus).mockResolvedValue(draft);
  vi.mocked(services.gerarContaReceber).mockResolvedValue(conta);
  vi.mocked(services.updateGlosa).mockResolvedValue(draft);
  vi.mocked(services.updateRecursoGlosa).mockResolvedValue(draft);
}

function renderPage(
  section:
    "atendimentos" | "faturamento" | "financeiro" | "precos" = "atendimentos",
) {
  return render(
    <BillingPage
      section={section}
      session={session}
      medicalUsers={[{ id: 2, nome: "Dra. Teste", email: "dra@teste.local" }]}
      convenios={[{ idConvenio: 1, descricaoConvenio: "Convênio Teste" }]}
      isAdmin
      isMedical={false}
    />,
  );
}

describe("BillingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it("cadastra atendimento com procedimento, peso, autorização, médico e hospital", async () => {
    renderPage();
    await screen.findByText("Paciente Teste");
    fireEvent.click(screen.getByRole("button", { name: /Novo atendimento/i }));
    fireEvent.change(screen.getByLabelText("Paciente"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Data da cirurgia"), {
      target: { value: "2026-07-10" },
    });
    fireEvent.change(screen.getByLabelText("Hospital"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Médico responsável"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Código CBHPM"), {
      target: { value: "123" },
    });
    fireEvent.change(screen.getByLabelText("Peso percentual"), {
      target: { value: "80" },
    });
    fireEvent.change(screen.getByLabelText("Autorização"), {
      target: { value: "AUT-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar atendimento" }));
    await waitFor(() =>
      expect(services.createAtendimento).toHaveBeenCalledWith(
        expect.objectContaining({
          pacienteId: 1,
          hospitalId: 1,
          medicoResponsavelId: 2,
          numeroAutorizacao: "AUT-1",
          procedimentos: [
            expect.objectContaining({ cbhpmCodigo: "123", pesoPercentual: 80 }),
          ],
        }),
        "token",
      ),
    );
  });

  it("exibe snapshot e permite editar item somente no rascunho", async () => {
    renderPage("faturamento");
    await screen.findByText("Paciente Teste");
    fireEvent.click(screen.getByRole("button", { name: "Paciente Teste" }));
    expect(screen.getByText("Detalhe do faturamento")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Valor unitário"), {
      target: { value: "850" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar item" }));
    await waitFor(() =>
      expect(services.updateFaturamentoItem).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({ valorUnitario: 850 }),
        "token",
      ),
    );
  });

  it("filtra contas e mostra cards calculados pelo backend", async () => {
    renderPage("financeiro");
    await screen.findAllByText("Paciente Teste");
    expect(screen.getByText("Total previsto")).toBeInTheDocument();
    expect(screen.getByText("Total vencido")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "Vencido" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    await waitFor(() =>
      expect(services.searchContasReceber).toHaveBeenCalledWith(
        expect.objectContaining({ status: "Vencido", page: 1, pageSize: 10 }),
        "token",
      ),
    );
    expect(screen.getByText("Em atraso")).toBeInTheDocument();
  });

  it("lança pagamento parcial e exige motivo no estorno", async () => {
    renderPage("financeiro");
    await screen.findAllByText("Paciente Teste");
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Valor recebido"), {
      target: { value: "200" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Registrar recebimento" }),
    );
    await waitFor(() =>
      expect(services.registrarRecebimento).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ valorRecebido: 200 }),
        "token",
      ),
    );
    fireEvent.click(screen.getByTitle(/Estornar/));
    fireEvent.change(screen.getByLabelText("Motivo do estorno"), {
      target: { value: "Lançamento duplicado" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar estorno" }));
    await waitFor(() =>
      expect(services.estornarRecebimento).toHaveBeenCalledWith(
        1,
        "Lançamento duplicado",
        "token",
      ),
    );
  });

  it("envia explicitamente um faturamento depois de preparar", async () => {
    vi.mocked(services.getFaturamentos).mockResolvedValue([
      { ...draft, status: "ProntoParaEnvio" },
    ]);
    renderPage("faturamento");
    await screen.findByText("Paciente Teste");
    fireEvent.click(screen.getByRole("button", { name: "Enviar faturamento" }));
    await waitFor(() =>
      expect(services.updateFaturamentoStatus).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: "Enviado" }),
        "token",
      ),
    );
  });

  it("edita glosa e recurso pela tela de detalhe", async () => {
    const withAppeal = {
      ...draft,
      status: "GlosadoParcial",
      valorGlosado: 200,
      valorReconhecido: 700,
      glosas: [
        {
          id: 7,
          faturamentoItemId: 1,
          codigoMotivo: "M1",
          descricaoMotivo: "Divergência",
          valorGlosado: 200,
          dataGlosa: "2026-07-12",
          status: "ComRecurso",
          observacao: null,
          recursos: [
            {
              id: 8,
              dataEnvio: "2026-07-13",
              justificativa: "Documentação comprobatória",
              valorRecorrido: 200,
              dataResposta: null,
              valorRecuperado: 0,
              status: "Enviado",
              observacao: null,
            },
          ],
        },
      ],
    } as Faturamento;
    vi.mocked(services.getFaturamentos).mockResolvedValue([withAppeal]);
    vi.mocked(services.updateGlosa).mockResolvedValue(withAppeal);
    vi.mocked(services.updateRecursoGlosa).mockResolvedValue(withAppeal);
    renderPage("faturamento");
    await screen.findByText("Paciente Teste");
    fireEvent.click(screen.getByRole("button", { name: "Paciente Teste" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar glosa" }));
    fireEvent.change(screen.getByLabelText("Descrição do motivo"), {
      target: { value: "Divergência revisada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar glosa" }));
    await waitFor(() =>
      expect(services.updateGlosa).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ descricaoMotivo: "Divergência revisada" }),
        "token",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Paciente Teste" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar recurso" }));
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "Aceito" },
    });
    fireEvent.change(screen.getByLabelText("Valor recuperado"), {
      target: { value: "200" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar recurso" }));
    await waitFor(() =>
      expect(services.updateRecursoGlosa).toHaveBeenCalledWith(
        8,
        expect.objectContaining({ status: "Aceito", valorRecuperado: 200 }),
        "token",
      ),
    );
  });

  it("mantém a geração de título idempotente ao repetir a ação", async () => {
    vi.mocked(services.getFaturamentos).mockResolvedValue([
      { ...draft, status: "Aprovado" },
    ]);
    renderPage("faturamento");
    await screen.findByText("Paciente Teste");
    fireEvent.click(screen.getByRole("button", { name: /Gerar título/ }));
    await waitFor(() =>
      expect(services.gerarContaReceber).toHaveBeenCalledTimes(1),
    );
    fireEvent.click(screen.getByRole("button", { name: /Gerar título/ }));
    await waitFor(() =>
      expect(services.gerarContaReceber).toHaveBeenCalledTimes(2),
    );
    expect(vi.mocked(services.gerarContaReceber).mock.calls[0][0]).toBe(
      vi.mocked(services.gerarContaReceber).mock.calls[1][0],
    );
    expect(vi.mocked(services.gerarContaReceber).mock.calls[0][1]).toEqual(
      expect.objectContaining({
        faturamentoId: 1,
        numeroDocumento: "FAT-1-01",
      }),
    );
    expect(vi.mocked(services.gerarContaReceber).mock.calls[1][1]).toEqual(
      expect.objectContaining({
        faturamentoId: 1,
        numeroDocumento: "FAT-1-01",
      }),
    );
  });

  it("pré-visualiza CBHPM e valor negociado antes de salvar atendimento", async () => {
    vi.mocked(services.getCbhpmGeral).mockResolvedValue({
      items: [
        {
          id: 1,
          codigo: "123",
          procedimento: "Cirurgia",
          porte: "8A",
          valorReferencia: 1000,
        },
      ],
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });
    vi.mocked(services.getConvenioProcedimentoPrecos).mockImplementation(
      async (_token, params) =>
        Object.keys(params ?? {}).length
          ? [
              {
                id: 1,
                convenioId: 1,
                cbhpmCodigo: "123",
                valorNegociado: 850,
                percentualPrincipal: 100,
                percentualAuxiliar1: 0,
                percentualAuxiliar2: 0,
                vigenciaInicio: "2026-01-01",
                ativo: true,
              },
            ]
          : [],
    );
    renderPage();
    await screen.findByText("Paciente Teste");
    fireEvent.click(screen.getByRole("button", { name: /Novo atendimento/i }));
    fireEvent.click(
      screen.getByRole("button", { name: "Consultar procedimentos CBHPM" }),
    );
    expect(
      await screen.findByRole("dialog", { name: "Consultar procedimentos" }),
    ).toBeInTheDocument();
    await screen.findByRole("button", { name: "Selecionar" });
    fireEvent.click(screen.getByRole("button", { name: "Selecionar" }));
    expect(screen.getByLabelText("Código CBHPM")).toHaveValue("123");
    fireEvent.change(screen.getByLabelText("Data da cirurgia"), {
      target: { value: "2026-07-10" },
    });
    fireEvent.change(screen.getByLabelText("Convênio"), {
      target: { value: "1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Pré-visualizar preço" }),
    );
    expect(
      await screen.findByText(/Preço que será preservado no atendimento/),
    ).toHaveTextContent("R$ 850,00");
  });

  it("filtra e pagina os procedimentos CBHPM dentro do popup", async () => {
    vi.mocked(services.getCbhpmGeral).mockImplementation(
      async (_token, query) => ({
        items: [
          {
            id: query?.page ?? 1,
            codigo: query?.page === 2 ? "456" : "123",
            procedimento:
              query?.page === 2 ? "Cirurgia complementar" : "Cirurgia",
            porte: "8A",
            valorReferencia: 1000,
          },
        ],
        page: query?.page ?? 1,
        pageSize: 10,
        totalItems: 11,
        totalPages: 2,
      }),
    );

    renderPage();
    await screen.findByText("Paciente Teste");
    fireEvent.click(screen.getByRole("button", { name: /Novo atendimento/i }));
    fireEvent.click(
      screen.getByRole("button", { name: "Consultar procedimentos CBHPM" }),
    );

    await screen.findByRole("dialog", { name: "Consultar procedimentos" });
    await waitFor(() =>
      expect(services.getCbhpmGeral).toHaveBeenCalledWith(
        "token",
        expect.objectContaining({ page: 1, pageSize: 10 }),
      ),
    );

    fireEvent.change(screen.getByLabelText("Código"), {
      target: { value: "123" },
    });
    fireEvent.change(screen.getByLabelText("Descrição do procedimento"), {
      target: { value: "Cirurgia" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
    await waitFor(() =>
      expect(services.getCbhpmGeral).toHaveBeenCalledWith(
        "token",
        expect.objectContaining({
          page: 1,
          codigo: "123",
          procedimento: "Cirurgia",
        }),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));
    await waitFor(() =>
      expect(services.getCbhpmGeral).toHaveBeenCalledWith(
        "token",
        expect.objectContaining({
          page: 2,
          codigo: "123",
          procedimento: "Cirurgia",
        }),
      ),
    );
    expect(
      await screen.findByText("Cirurgia complementar"),
    ).toBeInTheDocument();
  });
});
