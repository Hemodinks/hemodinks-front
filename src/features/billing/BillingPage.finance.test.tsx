import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContaReceber, Faturamento } from "../../types";
import * as services from "../../services";
import * as receiptDocument from "./receiptDocument";
import {
  atendimento,
  billingPage as page,
  conta,
  draft,
  renderBillingPage as renderPage,
  session,
  setupBillingMocks as setupMocks,
} from "./billingTestSetup";

vi.mock("../../services", async () => {
  const { createBillingServicesMock } = await import("./billingServicesMock");
  return createBillingServicesMock();
});
vi.mock("./receiptDocument", () => ({
  downloadGeneratedReceipt: vi.fn(),
}));


describe("BillingPage finance", () => {
  beforeEach(() => {
    setupMocks();
    vi.mocked(receiptDocument.downloadGeneratedReceipt).mockResolvedValue(undefined);
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


});
