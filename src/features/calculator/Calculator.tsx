import { useReducer, type KeyboardEvent } from 'react';
import { calculatorReducer, initialCalculatorState } from './calculatorEngine';
import './calculator.css';

const buttons = [
  { key: 'clear', text: 'C', label: 'Limpar' },
  { key: 'backspace', text: '⌫', label: 'Apagar último dígito' },
  { key: 'sign', text: '±', label: 'Inverter sinal' },
  { key: '/', text: '÷', label: 'Dividir' },
  { key: '7' }, { key: '8' }, { key: '9' }, { key: '*', text: '×', label: 'Multiplicar' },
  { key: '4' }, { key: '5' }, { key: '6' }, { key: '-', text: '−', label: 'Subtrair' },
  { key: '1' }, { key: '2' }, { key: '3' }, { key: '+', text: '+', label: 'Somar' },
  { key: '0', wide: true }, { key: ',', text: ',', label: 'Separador decimal' },
  { key: '=', text: '=', label: 'Igual' },
];

export function Calculator({ onClose }: { onClose?: () => void }) {
  const [state, dispatch] = useReducer(calculatorReducer, initialCalculatorState);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.ctrlKey || event.altKey || event.metaKey || event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' && event.target instanceof HTMLElement && event.target.closest('.calculator-close')) return;
    // Escape belongs to the surrounding dock, which restores focus on close.
    const key = event.key === 'Enter' ? '=' : event.key === 'Backspace' ? 'backspace' : event.key === 'Delete' ? 'clear' : event.key;
    if (!/^\d$/.test(key) && !['.', ',', '+', '-', '*', '/', '=', 'backspace', 'clear'].includes(key)) return;
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
        {buttons.map(({ key, text, label, wide }) => (
          <button key={key} type="button" aria-label={label ?? key}
            className={`${wide ? 'calculator-key-wide' : ''} ${key === '=' ? 'calculator-key-equals' : ''}`.trim() || undefined}
            onClick={() => dispatch(key)}>{text ?? key}</button>
        ))}
      </div>
      <p className="calculator-hint">Operações na ordem digitada. Até 12 dígitos; resultados arredondados.</p>
    </section>
  );
}
