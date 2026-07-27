import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  HorizontalTableScroller,
  ListToolbar,
  Pagination,
  SortableHeader,
  TableStateRow,
} from "./listing";

describe("listing components", () => {
  it("renders a toolbar with its actions", () => {
    render(
      <ListToolbar eyebrow="Pacientes" title="Lista">
        <button type="button">Novo</button>
      </ListToolbar>,
    );

    expect(screen.getByText("Pacientes")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Lista" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Novo" })).toBeInTheDocument();
  });

  it("reports sorting state and requests the selected field", () => {
    const onSortChange = vi.fn();
    render(
      <table>
        <thead>
          <tr>
            <SortableHeader
              field="nome"
              label="Nome"
              sortBy="nome"
              sortDirection="desc"
              onSortChange={onSortChange}
            />
          </tr>
        </thead>
      </table>,
    );

    const button = screen.getByRole("button", { name: /Nome/ });
    expect(button).toHaveAttribute("aria-sort", "descending");
    fireEvent.click(button);
    expect(onSortChange).toHaveBeenCalledWith("nome");
  });

  it("prioritizes loading and otherwise renders the empty state", () => {
    const { rerender } = render(
      <table>
        <tbody>
          <TableStateRow
            colSpan={3}
            loading
            empty
            loadingLabel="Carregando"
            emptyLabel="Sem registros"
          />
        </tbody>
      </table>,
    );
    expect(screen.getByText("Carregando")).toHaveAttribute("colspan", "3");

    rerender(
      <table>
        <tbody>
          <TableStateRow
            colSpan={3}
            loading={false}
            empty
            loadingLabel="Carregando"
            emptyLabel="Sem registros"
          />
        </tbody>
      </table>,
    );
    expect(screen.getByText("Sem registros")).toBeInTheDocument();
  });

  it("scrolls its table and changes pages within the allowed range", () => {
    const scrollBy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollBy", {
      configurable: true,
      value: scrollBy,
    });
    const onPageChange = vi.fn();
    render(
      <>
        <HorizontalTableScroller entityLabel="pacientes">
          <div>conteúdo</div>
        </HorizontalTableScroller>
        <Pagination
          entityLabel="pacientes"
          visibleStart={11}
          visibleEnd={20}
          totalItems={24}
          currentPage={2}
          totalPages={3}
          onPageChange={onPageChange}
        />
      </>,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Avançar no carrossel de pacientes",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Página anterior de pacientes" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Próxima página de pacientes" }),
    );

    expect(scrollBy).toHaveBeenCalledWith({
      left: 0,
      behavior: "smooth",
    });
    expect(screen.getByText("11-20 de 24")).toBeInTheDocument();
    expect(onPageChange).toHaveBeenCalledTimes(2);
    expect(onPageChange.mock.calls[0][0](2)).toBe(1);
    expect(onPageChange.mock.calls[1][0](2)).toBe(3);
  });
});
