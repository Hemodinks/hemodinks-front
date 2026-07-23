import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession, ContaReceber, Faturamento } from "../../types";
import { BillingPage } from "./BillingPage";
import * as services from "../../services";
import * as receiptDocument from "./receiptDocument";

vi.mock("../../services", () => ({
  getAtendimentos: vi.fn(),
  getFaturamentos: vi.fn(),
  getContasReceber: vi.fn(),
  getConvenioProcedimentoPrecos: vi.fn(),
  getPacientes: vi.fn(),
  getHospitais: vi.fn(),
  getFinanceiroResumo: vi.fn(),
  createAtendimento: vi.fn(),
  updateAtendimento: vi.fn(),
  deleteAtendimento: vi.fn(),
  createFaturamento: vi.fn(),
  updateFaturamento: vi.fn(),
  deleteFaturamento: vi.fn(),
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

vi.mock("./receiptDocument", () => ({
  downloadGeneratedReceipt: vi.fn(),
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
  vi.mocked(services.updateAtendimento).mockResolvedValue(atendimento as never);
  vi.mocked(services.deleteAtendimento).mockResolvedValue(undefined);
  vi.mocked(services.createFaturamento).mockResolvedValue(draft);
  vi.mocked(services.updateFaturamento).mockResolvedValue(draft);
  vi.mocked(services.deleteFaturamento).mockResolvedValue(undefined);
  vi.mocked(services.updateFaturamentoItem).mockResolvedValue(draft);
  vi.mocked(services.registrarRecebimento).mockResolvedValue(conta);
  vi.mocked(services.estornarRecebimento).mockResolvedValue(conta);
  vi.mocked(services.updateFaturamentoStatus).mockResolvedValue(draft);
  vi.mocked(services.gerarContaReceber).mockResolvedValue(conta);
  vi.mocked(services.updateGlosa).mockResolvedValue(draft);
  vi.mocked(services.updateRecursoGlosa).mockResolvedValue(draft);
}

function page(
  section:
    "atendimentos" | "faturamento" | "financeiro" | "precos" = "atendimentos",
) {
  return (
    <BillingPage
      section={section}
      session={session}
      medicalUsers={[{ id: 2, nome: "Dra. Teste", email: "dra@teste.local" }]}
      convenios={[{ idConvenio: 1, descricaoConvenio: "Convênio Teste" }]}
      opmeFornecedores={[{ idFornecedor: 1, fornecedor: "Promedom" }]}
      isAdmin
      isMedical={false}
    />
  );
}

function renderPage(
  section:
    "atendimentos" | "faturamento" | "financeiro" | "precos" = "atendimentos",
) {
  return render(page(section));
}

describe("BillingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it("cadastra atendimento com procedimento selecionado, autorização, médico e hospital", async () => {
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
      target: { value: "Hospital Teste" },
    });
    fireEvent.change(screen.getByLabelText("Fornecedor OPME"), {
      target: { value: "Promedom" },
    });
    fireEvent.change(screen.getByLabelText("Médico responsável"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Consultar CBHPM" }));
    fireEvent.click(await screen.findByRole("button", { name: "Adicionar" }));
    fireEvent.change(screen.getByLabelText("Autorização"), {
      target: { value: "AUT-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar atendimento" }));
    await waitFor(() =>
      expect(services.createAtendimento).toHaveBeenCalledWith(
        expect.objectContaining({
          pacienteId: 1,
          hospitalId: 1,
          opmeFornecedorId: 1,
          medicoResponsavelId: 2,
          numeroAutorizacao: "AUT-1",
          procedimentos: [
            expect.objectContaining({
              cbhpmCodigo: "123",
              pesoPercentual: 100,
            }),
          ],
        }),
        "token",
      ),
    );
  });

  it("cadastra hospital, convênio e fornecedor OPME informados manualmente", async () => {
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
      target: { value: "Hospital Novo" },
    });
    fireEvent.change(screen.getByLabelText("Convênio"), {
      target: { value: "Convênio Novo" },
    });
    fireEvent.change(screen.getByLabelText("Fornecedor OPME"), {
      target: { value: "Fornecedor Novo" },
    });
    fireEvent.change(screen.getByLabelText("Médico responsável"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Consultar CBHPM" }));
    fireEvent.click(await screen.findByRole("button", { name: "Adicionar" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar atendimento" }));

    await waitFor(() =>
      expect(services.createAtendimento).toHaveBeenCalledWith(
        expect.objectContaining({
          hospitalId: null,
          hospital: "Hospital Novo",
          convenioId: null,
          convenio: "Convênio Novo",
          opmeFornecedorId: null,
          opmeFornecedor: "Fornecedor Novo",
        }),
        "token",
      ),
    );
  });

  it("registra valor e motivo da glosa no atendimento", async () => {
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
    renderPage();
    await screen.findByText("Paciente Teste");
    fireEvent.click(screen.getByRole("button", { name: /Novo atendimento/i }));
    fireEvent.change(screen.getByLabelText("Paciente"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Data da cirurgia"), {
      target: { value: "2026-07-10" },
    });
    fireEvent.change(screen.getByLabelText("Médico responsável"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Consultar CBHPM" }));
    fireEvent.click(await screen.findByRole("button", { name: "Adicionar" }));
    fireEvent.change(screen.getByLabelText("Valor da glosa"), {
      target: { value: "150" },
    });
    fireEvent.change(screen.getByLabelText("Motivo da glosa"), {
      target: { value: "Divergência contratual" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar atendimento" }));

    await waitFor(() =>
      expect(services.createAtendimento).toHaveBeenCalledWith(
        expect.objectContaining({
          valorGlosa: 150,
          motivoGlosa: "Divergência contratual",
        }),
        "token",
      ),
    );
  });

  it("permite editar e excluir um atendimento", async () => {
    renderPage();
    await screen.findByText("Paciente Teste");

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByLabelText("Paciente")).toHaveValue("1");
    fireEvent.change(screen.getByLabelText("Autorização"), {
      target: { value: "AUT-EDITADA" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Atualizar atendimento" }),
    );
    await waitFor(() =>
      expect(services.updateAtendimento).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ numeroAutorizacao: "AUT-EDITADA" }),
        "token",
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar" }),
    );
    await waitFor(() =>
      expect(services.deleteAtendimento).toHaveBeenCalledWith(1, "token"),
    );
  });

  it("limpa os campos depois de cadastrar um atendimento com sucesso", async () => {
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
    renderPage();
    await screen.findByText("Paciente Teste");
    fireEvent.click(screen.getByRole("button", { name: /Novo atendimento/i }));
    fireEvent.change(screen.getByLabelText("Paciente"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Data da cirurgia"), {
      target: { value: "2026-07-10" },
    });
    fireEvent.change(screen.getByLabelText("Diagnóstico"), {
      target: { value: "Diagnóstico anterior" },
    });
    fireEvent.change(screen.getByLabelText("Médico responsável"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Consultar CBHPM" }));
    fireEvent.click(await screen.findByRole("button", { name: "Adicionar" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar atendimento" }));

    await waitFor(() =>
      expect(screen.queryByLabelText("Paciente")).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Novo atendimento/i }));

    expect(screen.getByLabelText("Paciente")).toHaveValue("");
    expect(screen.getByLabelText("Data da cirurgia")).toHaveValue("");
    expect(screen.getByLabelText("Diagnóstico")).toHaveValue("");
    expect(screen.queryByText("Cirurgia")).not.toBeInTheDocument();
  });

  it("remove automaticamente a mensagem de sucesso", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
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
      renderPage();
      await screen.findByText("Paciente Teste");
      fireEvent.click(
        screen.getByRole("button", { name: /Novo atendimento/i }),
      );
      fireEvent.change(screen.getByLabelText("Paciente"), {
        target: { value: "1" },
      });
      fireEvent.change(screen.getByLabelText("Data da cirurgia"), {
        target: { value: "2026-07-10" },
      });
      fireEvent.change(screen.getByLabelText("Médico responsável"), {
        target: { value: "2" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Consultar CBHPM" }));
      fireEvent.click(await screen.findByRole("button", { name: "Adicionar" }));
      fireEvent.click(
        screen.getByRole("button", { name: "Salvar atendimento" }),
      );

      expect(
        await screen.findByText("Atendimento criado com snapshot de preço."),
      ).toBeInTheDocument();
      await act(async () => {
        await Promise.resolve();
      });
      act(() => {
        vi.advanceTimersByTime(10001);
      });
      expect(
        screen.queryByText("Atendimento criado com snapshot de preço."),
      ).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("limpa os dados do formulário após gerar o faturamento", async () => {
    renderPage("faturamento");

    fireEvent.click(
      await screen.findByRole("button", { name: /Novo faturamento/i }),
    );
    fireEvent.change(screen.getByLabelText("Atendimento"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Número da guia"), {
      target: { value: "GUIA-123" },
    });
    fireEvent.change(screen.getByLabelText("Número do lote"), {
      target: { value: "LOTE-456" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Gerar itens do faturamento" }),
    );

    await waitFor(() =>
      expect(services.createFaturamento).toHaveBeenCalledWith(
        expect.objectContaining({
          atendimentoCirurgicoId: 1,
          numeroGuia: "GUIA-123",
          numeroLote: "LOTE-456",
        }),
        "token",
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: /Novo faturamento/i }));
    expect(screen.getByLabelText("Atendimento")).toHaveValue("");
    expect(screen.getByLabelText("Número da guia")).toHaveValue("");
    expect(screen.getByLabelText("Número do lote")).toHaveValue("");
  });

  it("permite editar e excluir faturamento em rascunho", async () => {
    renderPage("faturamento");
    await screen.findByText("Paciente Teste");

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Número da guia"), {
      target: { value: "GUIA-EDITADA" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Atualizar faturamento" }),
    );
    await waitFor(() =>
      expect(services.updateFaturamento).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          numeroGuia: "GUIA-EDITADA",
          rowVersion: draft.rowVersion,
        }),
        "token",
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() =>
      expect(services.deleteFaturamento).toHaveBeenCalledWith(1, "token"),
    );
  });

  it("não transporta mensagens de sucesso para outro módulo", async () => {
    const view = renderPage("faturamento");

    fireEvent.click(
      await screen.findByRole("button", { name: /Novo faturamento/i }),
    );
    fireEvent.change(screen.getByLabelText("Atendimento"), {
      target: { value: "1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Gerar itens do faturamento" }),
    );

    expect(
      await screen.findByText("Faturamento criado a partir do atendimento."),
    ).toBeInTheDocument();

    view.rerender(page("financeiro"));

    expect(
      screen.queryByText("Faturamento criado a partir do atendimento."),
    ).not.toBeInTheDocument();
  });

  it("exibe snapshot e permite editar item somente no rascunho", async () => {
    renderPage("faturamento");
    await screen.findByText("Paciente Teste");
    fireEvent.click(screen.getByRole("button", { name: "Paciente Teste" }));
    expect(screen.getByText("Detalhe do faturamento")).toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: /Paciente Teste/ }),
    ).toHaveClass("billing-wide-modal", "billing-invoice-detail-modal");
    fireEvent.click(
      within(
        screen.getByRole("dialog", { name: /Paciente Teste/ }),
      ).getByRole("button", { name: "Editar item" }),
    );
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

  it("abre o retorno em modal largo e organiza a glosa por procedimento", async () => {
    vi.mocked(services.getFaturamentos).mockResolvedValue([
      { ...draft, status: "Enviado" },
    ]);

    renderPage("faturamento");

    fireEvent.click(
      await screen.findByRole("button", { name: "Registrar retorno" }),
    );

    const dialog = screen.getByRole("dialog", {
      name: "Registrar retorno do faturamento",
    });
    expect(dialog).toHaveClass("billing-wide-modal", "billing-return-modal");
    expect(screen.getByText("Procedimento 1")).toBeInTheDocument();
    expect(screen.getByText("Sem glosa para este procedimento")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Valor da glosa"), {
      target: { value: "100" },
    });

    expect(screen.getByLabelText("Motivo da glosa")).toBeInTheDocument();
  });

  it("filtra contas e mostra cards calculados pelo backend", async () => {
    renderPage("financeiro");
    await screen.findAllByText("Paciente Teste");
    expect(screen.getByText("Total previsto")).toBeInTheDocument();
    expect(screen.getByText("Total vencido")).toBeInTheDocument();
    const filtersAccordion = screen
      .getByText("Filtros financeiros")
      .closest("details");
    expect(filtersAccordion).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("Filtros financeiros"));
    expect(
      screen.getByLabelText("Buscar por documento ou paciente"),
    ).toHaveAttribute(
      "placeholder",
      "Ex.: FAT-1-01 ou nome do paciente",
    );
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
    expect(screen.getByText("Títulos faturados").closest(".data-panel")).toHaveClass(
      "billing-finance-titles-panel",
    );
    expect(
      screen
        .getByRole("heading", { name: "Registrar recebimento" })
        .closest(".data-panel"),
    ).toHaveClass("billing-finance-receipt-panel");
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
    expect(
      screen.getByRole("dialog", { name: "Confirmar estorno" }),
    ).toHaveClass("billing-reversal-modal");
    expect(
      screen.getByText(/saldo do título será recalculado automaticamente/i),
    ).toBeInTheDocument();
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

  it("exibe o erro do recebimento ao lado do botão por 10 segundos", async () => {
    vi.mocked(services.registrarRecebimento).mockRejectedValueOnce(
      new Error("Recebimento inválido ou superior ao saldo aberto."),
    );

    renderPage("financeiro");
    await screen.findAllByText("Paciente Teste");
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Valor recebido"), {
      target: { value: "700" },
    });

    vi.useFakeTimers();
    fireEvent.click(
      screen.getByRole("button", { name: "Registrar recebimento" }),
    );
    await act(async () => {
      await Promise.resolve();
    });

    const receiptPanel = screen
      .getByRole("heading", { name: "Registrar recebimento" })
      .closest(".data-panel");
    expect(receiptPanel).toHaveTextContent(
      "Recebimento inválido ou superior ao saldo aberto.",
    );

    act(() => {
      vi.advanceTimersByTime(9999);
    });
    expect(receiptPanel).toHaveTextContent(
      "Recebimento inválido ou superior ao saldo aberto.",
    );

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(receiptPanel).not.toHaveTextContent(
      "Recebimento inválido ou superior ao saldo aberto.",
    );
    vi.useRealTimers();
  });

  it("permite escolher PDF ou JPG para o comprovante gerado e valida o anexo bancário", async () => {
    renderPage("financeiro");
    await screen.findAllByText("Paciente Teste");

    const format = screen.getByLabelText("Formato do comprovante gerado");
    expect(format).toHaveValue("pdf");
    const fileInput = screen.getByLabelText(/Selecionar arquivo PDF ou JPG/);
    expect(fileInput).toHaveAttribute(
      "accept",
      ".pdf,.jpg,.jpeg,application/pdf,image/jpeg",
    );

    fireEvent.change(format, { target: { value: "jpg" } });
    expect(format).toHaveValue("jpg");

    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(["arquivo"], "comprovante.png", {
            type: "image/png",
          }),
        ],
      },
    });

    expect(
      screen.getAllByText(
        "Selecione um comprovante bancário no formato PDF ou JPG.",
      ),
    ).toHaveLength(2);
  });

  it("gera automaticamente o comprovante escolhido após registrar o recebimento", async () => {
    const updatedAccount = {
      ...conta,
      valorRecebido: 500,
      saldoAberto: 400,
      recebimentos: [
        ...conta.recebimentos,
        {
          id: 2,
          dataRecebimento: "2026-07-23T18:30:00Z",
          valorRecebido: 200,
          formaRecebimento: "Pix",
          referenciaBancaria: "PIX-123",
          estornado: false,
        },
      ],
    } as ContaReceber;
    vi.mocked(services.registrarRecebimento).mockResolvedValue(updatedAccount);

    renderPage("financeiro");
    await screen.findAllByText("Paciente Teste");
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Valor recebido"), {
      target: { value: "200" },
    });
    fireEvent.change(screen.getByLabelText("Referência bancária"), {
      target: { value: "PIX-123" },
    });
    fireEvent.change(screen.getByLabelText("Formato do comprovante gerado"), {
      target: { value: "jpg" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Registrar recebimento" }),
    );

    await waitFor(() =>
      expect(receiptDocument.downloadGeneratedReceipt).toHaveBeenCalledWith(
        expect.objectContaining({
          receiptId: 2,
          documentNumber: "TIT-1",
          patient: "Paciente Teste",
          amount: 200,
          paymentMethod: "Pix",
          bankReference: "PIX-123",
          registeredBy: "Admin",
        }),
        "jpg",
      ),
    );
    expect(screen.getByLabelText("Título")).toHaveValue("");
    expect(screen.getByLabelText("Valor recebido")).toHaveValue(null);
  });

  it("baixa o comprovante com a extensão correspondente ao conteúdo", async () => {
    vi.mocked(services.downloadComprovanteRecebimento).mockResolvedValue(
      new Blob(["%PDF"], { type: "application/pdf" }),
    );
    const createObjectUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:comprovante");
    const revokeObjectUrl = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    let downloadedName = "";
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadedName = this.download;
      });

    try {
      renderPage("financeiro");
      fireEvent.click(await screen.findByRole("button", { name: "TIT-1" }));
      fireEvent.click(screen.getByRole("button", { name: "Baixar" }));

      await waitFor(() =>
        expect(services.downloadComprovanteRecebimento).toHaveBeenCalledWith(
          1,
          "token",
        ),
      );
      expect(downloadedName).toBe("comprovante-1.pdf");
      expect(createObjectUrl).toHaveBeenCalled();
      expect(revokeObjectUrl).toHaveBeenCalledWith("blob:comprovante");
    } finally {
      anchorClick.mockRestore();
      createObjectUrl.mockRestore();
      revokeObjectUrl.mockRestore();
    }
  });

  it("abre o detalhe da conta no modal largo", async () => {
    renderPage("financeiro");
    const accountButton = await screen.findByRole("button", { name: "TIT-1" });

    fireEvent.click(accountButton);

    const dialog = screen.getByRole("dialog", { name: "TIT-1" });
    expect(dialog).toHaveClass(
      "billing-wide-modal",
      "billing-account-detail-modal",
    );
    expect(dialog.parentElement).toHaveClass(
      "modal-backdrop",
      "billing-account-detail-backdrop",
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

  it("exibe o procedimento selecionado sem informações de preço", async () => {
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
    renderPage();
    await screen.findByText("Paciente Teste");
    fireEvent.click(screen.getByRole("button", { name: /Novo atendimento/i }));
    fireEvent.click(screen.getByRole("button", { name: "Consultar CBHPM" }));
    expect(
      await screen.findByRole("dialog", { name: "Consultar procedimentos" }),
    ).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Adicionar" }));
    expect(screen.getByText("Cirurgia")).toBeInTheDocument();
    expect(screen.getByText("8A")).toBeInTheDocument();
    expect(
      screen.getByText("Valor de referência: R$ 1.000,00"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remover Cirurgia" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Pré-visualizar preço" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Preço que será preservado/),
    ).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "Consultar CBHPM" }));

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

  it("adiciona um procedimento manual pelo popup CBHPM", async () => {
    renderPage();
    await screen.findByText("Paciente Teste");
    fireEvent.click(screen.getByRole("button", { name: /Novo atendimento/i }));
    fireEvent.click(screen.getByRole("button", { name: "Consultar CBHPM" }));
    await screen.findByRole("dialog", { name: "Consultar procedimentos" });

    fireEvent.change(screen.getByLabelText("Código"), {
      target: { value: "9.99.99.99-9" },
    });
    fireEvent.change(screen.getByLabelText("Descrição do procedimento"), {
      target: { value: "Procedimento manual" },
    });
    fireEvent.change(screen.getByLabelText("Porte"), {
      target: { value: "2b" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Cadastrar manualmente" }),
    );

    expect(screen.getByText("99999999")).toBeInTheDocument();
    expect(screen.getByText("Procedimento manual")).toBeInTheDocument();
    expect(screen.getByText("2B")).toBeInTheDocument();
  });
});
