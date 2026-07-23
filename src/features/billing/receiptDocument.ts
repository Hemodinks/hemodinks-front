import { jsPDF } from "jspdf";
import { formatCurrency } from "../../shared/utils/formatters";

export type GeneratedReceiptFormat = "pdf" | "jpg";

export type GeneratedReceiptData = {
  receiptId: number;
  documentNumber: string;
  patient: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  bankReference?: string | null;
  registeredBy: string;
};

function fileName(data: GeneratedReceiptData, extension: GeneratedReceiptFormat) {
  const document = data.documentNumber
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-");
  return `comprovante-${document || data.receiptId}.${extension}`;
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function receiptRows(data: GeneratedReceiptData) {
  return [
    ["Comprovante", `#${data.receiptId}`],
    ["Título", data.documentNumber],
    ["Paciente", data.patient],
    [
      "Data do recebimento",
      new Date(data.paymentDate).toLocaleString("pt-BR"),
    ],
    ["Valor recebido", formatCurrency(data.amount)],
    ["Forma de recebimento", data.paymentMethod],
    ["Referência bancária", data.bankReference || "Não informada"],
    ["Registrado por", data.registeredBy],
  ] as const;
}

function downloadPdf(data: GeneratedReceiptData) {
  const document = new jsPDF({ unit: "mm", format: "a4" });
  document.setFillColor(15, 118, 110);
  document.rect(0, 0, 210, 34, "F");
  document.setTextColor(255, 255, 255);
  document.setFont("helvetica", "bold");
  document.setFontSize(20);
  document.text("COMPROVANTE DE RECEBIMENTO", 18, 21);

  document.setTextColor(24, 33, 47);
  document.setFontSize(10);
  let top = 51;
  for (const [label, value] of receiptRows(data)) {
    document.setFont("helvetica", "bold");
    document.text(label.toUpperCase(), 18, top);
    document.setFont("helvetica", "normal");
    const lines = document.splitTextToSize(value, 112);
    document.text(lines, 76, top);
    top += Math.max(13, lines.length * 6 + 5);
    document.setDrawColor(220, 226, 232);
    document.line(18, top - 7, 192, top - 7);
  }

  document.setFontSize(9);
  document.setTextColor(90, 101, 116);
  document.text(
    "Documento gerado eletronicamente pelo Hemodinks.",
    18,
    Math.min(top + 10, 278),
  );
  triggerDownload(
    document.output("blob"),
    fileName(data, "pdf"),
  );
}

async function downloadJpg(data: GeneratedReceiptData) {
  const canvas = document.createElement("canvas");
  canvas.width = 1240;
  canvas.height = 1754;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Não foi possível gerar o comprovante em JPG.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#0f766e";
  context.fillRect(0, 0, canvas.width, 210);
  context.fillStyle = "#ffffff";
  context.font = "bold 52px Arial";
  context.fillText("COMPROVANTE DE RECEBIMENTO", 90, 125);

  let top = 315;
  for (const [label, value] of receiptRows(data)) {
    context.fillStyle = "#5a6574";
    context.font = "bold 24px Arial";
    context.fillText(label.toUpperCase(), 90, top);
    context.fillStyle = "#18212f";
    context.font = "32px Arial";
    context.fillText(value, 420, top);
    context.strokeStyle = "#dce2e8";
    context.beginPath();
    context.moveTo(90, top + 42);
    context.lineTo(1150, top + 42);
    context.stroke();
    top += 140;
  }

  context.fillStyle = "#5a6574";
  context.font = "24px Arial";
  context.fillText(
    "Documento gerado eletronicamente pelo Hemodinks.",
    90,
    1630,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(new Error("Não foi possível gerar o comprovante em JPG.")),
      "image/jpeg",
      0.94,
    );
  });
  triggerDownload(blob, fileName(data, "jpg"));
}

export async function downloadGeneratedReceipt(
  data: GeneratedReceiptData,
  format: GeneratedReceiptFormat,
) {
  if (format === "pdf") {
    downloadPdf(data);
    return;
  }
  await downloadJpg(data);
}
