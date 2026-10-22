import { useReducer, type KeyboardEvent } from 'react';
import { calculatorReducer, initialCalculatorState } from './calculatorEngine';
import './calculator.css';

const buttons: { key: string; text?: string; label?: string; kind?: 'utility' | 'operator' | 'equals' }[] = [
  { key: 'clear', text: 'C', label: 'Limpar', kind: 'utility' },
  { key: 'backspace', text: '⌫', label: 'Apagar último dígito', kind: 'utility' },
  { key: '%', text: '%', label: 'Porcentagem', kind: 'operator' },
  { key: '/', text: '÷', label: 'Dividir', kind: 'operator' },
  { key: '7' }, { key: '8' }, { key: '9' }, { key: '*', text: '×', label: 'Multiplicar', kind: 'operator' },
  { key: '4' }, { key: '5' }, { key: '6' }, { key: '-', text: '−', label: 'Subtrair', kind: 'operator' },
  { key: '1' }, { key: '2' }, { key: '3' }, { key: '+', text: '+', label: 'Somar', kind: 'operator' },
  { key: 'sign', text: '±', label: 'Inverter sinal', kind: 'operator' },
  { key: '0' }, { key: ',', text: ',', label: 'Separador decimal' },
  { key: '=', text: '=', label: 'Igual', kind: 'equals' },
];

export function Calculator({ onClose }: { onClose?: () => void }) {
  const [state, dispatch] = useReducer(calculatorReducer, initialCalculatorState);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.ctrlKey || event.altKey || event.metaKey || event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' && event.target instanceof HTMLElement && event.target.closest('.calculator-close, .calculator-history-clear')) return;
    // Escape belongs to the surrounding dock, which restores focus on close.
    const key = event.key === 'Enter' ? '=' : event.key === 'Backspace' ? 'backspace' : event.key === 'Delete' ? 'clear' : event.key;
    if (!/^\d$/.test(key) && !['.', ',', '+', '-', '*', '/', '%', '=', 'backspace', 'clear'].includes(key)) return;
    event.preventDefault();
    event.stopPropagation();
    dispatch(key);
  }

  return (
    <section className="calculator" aria-label="Calculadora" onKeyDown={handleKeyDown}>
      <div className="calculator-heading">
        <h2>Calculadora</h2>
        {onClose && <button type="button" className="calculator-close" aria-label="Fechar painel da calculadora" onClick={onClose}>×</button>}
      </div>
      <output className="calculator-result" aria-label="Resultado da calculadora" aria-live="polite" aria-atomic="true">
        {state.error ? 'Erro' : state.display.replace('.', ',')}
      </output>
      {state.error && <p className="calculator-error" role="alert">{state.error}</p>}
      <div className="calculator-keys">
        {buttons.map(({ key, text, label, kind }) => (
          <button key={key} type="button" aria-label={label ?? key}
            className={`calculator-key calculator-key-${kind ?? 'number'}`}
            onClick={() => dispatch(key)}>{text ?? key}</button>
        ))}
      </div>
      <p className="calculator-hint">Operações na ordem digitada. Até 12 dígitos; resultados arredondados.</p>
      <section className="calculator-history" aria-label="Histórico de operações">
        <div className="calculator-history-heading">
          <h3>Histórico</h3>
          <button type="button" className="calculator-history-clear" disabled={!state.history.length}
            onClick={() => dispatch('clearHistory')}>Limpar histórico</button>
        </div>
        {state.history.length ? <ol tabIndex={0} aria-label="Operações realizadas">
          {state.history.map((entry, index) => <li key={state.history.length - index}>
            <span>{entry.expression.replaceAll('.', ',')}</span>
            <strong>{entry.result.replace('.', ',')}</strong>
          </li>)}
        </ol> : <p>Nenhuma operação nesta utilização.</p>}
        <p>Histórico temporário, apagado ao fechar a calculadora.</p>
      </section>
    </section>
  );
}
