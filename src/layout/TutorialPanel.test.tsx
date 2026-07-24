import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TutorialPanel } from "./TutorialPanel";

describe("TutorialPanel", () => {
  it("mostra o conteúdo correspondente ao módulo ativo", () => {
    const { rerender } = render(<TutorialPanel activeView="billing" />);

    expect(
      screen.getByRole("complementary", {
        name: "Tutorial do módulo Faturamento",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Etapa 1 do tutorial" }),
    ).toHaveAttribute("aria-expanded", "true");

    rerender(<TutorialPanel activeView="finance" />);

    expect(
      screen.getByRole("complementary", {
        name: "Tutorial do módulo Financeiro",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Etapa 1 do tutorial" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Consultar títulos")).toBeInTheDocument();
  });

  it("abre seções e permite recolher o painel", () => {
    render(<TutorialPanel activeView="patients" />);

    const filesSection = screen.getByRole("button", {
      name: "Etapa 3 do tutorial",
    });
    fireEvent.click(filesSection);

    expect(filesSection).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(
        "Anexe documentos relevantes e registre observações úteis ao atendimento.",
      ),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Recolher tutorial" }));

    const openTutorial = screen.getByRole("button", {
      name: "Tutorial",
    });
    expect(openTutorial).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(openTutorial);
    expect(
      screen.getByRole("complementary", {
        name: "Tutorial do módulo Pacientes",
      }),
    ).toBeInTheDocument();
  });
});
