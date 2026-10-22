type Operator = '+' | '-' | '*' | '/';

export interface CalculatorState {
  history: { expression: string; result: string }[];
  display: string;
  error: string | null;
  accumulator: number | null;
  operator: Operator | null;
  waiting: boolean;
  lastOperator: Operator | null;
  lastOperand: number | null;
  percentApplied: boolean;
}

export const initialCalculatorState: CalculatorState = {
  history: [],
  display: '0', error: null, accumulator: null, operator: null,
  waiting: false, lastOperator: null, lastOperand: null, percentApplied: false,
};

function apply(left: number, right: number, operator: Operator): number {
  switch (operator) {
    case '+': return left + right;
    case '-': return left - right;
    case '*': return left * right;
    case '/': return left / right;
  }
}

function displayResult(state: CalculatorState, value: number): CalculatorState {
  if (!Number.isFinite(value) || Math.abs(value) > 999999999999 || (value !== 0 && Math.abs(value) < 0.000000000001)) {
    return { ...initialCalculatorState, history: state.history, error: 'Resultado fora do limite da calculadora.' };
  }
  // Twelve significant digits avoid binary floating-point tails; twelve decimal
  // places also keep recurring fractions within the visible panel.
  const rounded = Number(Number(value.toPrecision(12)).toFixed(12));
  return { ...state, display: String(rounded), error: null };
}

function result(state: CalculatorState, operator: Operator, operand: number): CalculatorState {
  if (operator === '/' && operand === 0) {
    return { ...initialCalculatorState, history: state.history, error: 'Não é possível dividir por zero.' };
  }
  const left = state.accumulator ?? Number(state.display);
  const computed = displayResult(state, apply(left, operand, operator));
  if (computed.error) return computed;
  const symbol = operator === '*' ? '×' : operator === '/' ? '÷' : operator === '-' ? '−' : '+';
  return { ...computed, history: [{ expression: `${left} ${symbol} ${operand} =`, result: computed.display }, ...state.history] };
}

/** Immediate operations, like a basic desk calculator. Never evaluates expressions. */
export function calculatorReducer(state: CalculatorState, key: string): CalculatorState {
  if (key === 'clearHistory') return { ...state, history: [] };
  if (key === 'clear') return { ...initialCalculatorState, history: state.history };
  const digit = /^\d$/.test(key);
  const decimal = key === '.' || key === ',';
  if (state.error) {
    if (!digit && !decimal && key !== 'sign') return state;
    state = { ...initialCalculatorState, history: state.history };
  }
  if (digit || decimal) {
    const current = state.waiting || state.percentApplied ? '0' : state.display;
    if (decimal && current.includes('.')) return state;
    const next = decimal ? `${current}.` : current === '0' ? key : current === '-0' ? `-${key}` : current + key;
    if (next.replace(/[-.]/g, '').length > 12) return state;
    return { ...state, display: next, waiting: false, lastOperator: null, lastOperand: null, percentApplied: false };
  }
  if (key === '%') {
    // A percentage consumes the current entry once. Missing right operands are
    // left pending; repeating % never applies the same conversion twice.
    if (state.percentApplied || (state.waiting && state.operator)) return state;
    const fraction = Number(state.display) / 100;
    const value = state.operator === '+' || state.operator === '-'
      ? (state.accumulator ?? 0) * fraction : fraction;
    const computed = displayResult(state, value);
    if (!computed.error && !state.operator) {
      computed.history = [{ expression: `${state.display}% =`, result: computed.display }, ...state.history];
    }
    return computed.error ? computed : { ...computed, waiting: false, percentApplied: true, lastOperator: null, lastOperand: null };
  }
  if (key === 'sign') {
    const display = state.waiting && state.operator ? '-0' : state.display.startsWith('-') ? state.display.slice(1) : `-${state.display}`;
    return { ...state, display, waiting: false, lastOperator: null, lastOperand: null };
  }
  if (key === 'backspace') {
    if (state.waiting && state.operator) return state;
    const display = state.waiting ? '0' : state.display.slice(0, -1);
    return { ...state, display: display && display !== '-' ? display : '0', waiting: false, lastOperator: null, lastOperand: null, percentApplied: false };
  }
  if (key === '+' || key === '-' || key === '*' || key === '/') {
    const computed = state.operator && !state.waiting ? result(state, state.operator, Number(state.display)) : state;
    if (computed.error) return computed;
    return { ...computed, accumulator: Number(computed.display), operator: key, waiting: true, lastOperator: null, lastOperand: null, percentApplied: false };
  }
  if (key === '=') {
    const operator = state.operator ?? state.lastOperator;
    const operand = state.operator ? Number(state.display) : state.lastOperand;
    if (!operator || operand === null) return state;
    const computed = result(state, operator, operand);
    if (computed.error) return computed;
    return { ...computed, accumulator: null, operator: null, waiting: true, lastOperator: operator, lastOperand: operand, percentApplied: false };
  }
  return state;
}
