import { describe, expect, it } from 'vitest';
import { calculatorReducer, initialCalculatorState } from './calculatorEngine';

function calculate(keys: string[]) {
  return keys.reduce(calculatorReducer, initialCalculatorState);
}

describe('calculadora independente', () => {
  it.each([
    [['1', '2', '+', '3', '='], '15'],
    [['8', '-', '1', '0', '='], '-2'],
    [['6', '*', '7', '='], '42'],
    [['9', '/', '2', '='], '4.5'],
    [['0', '.', '1', '+', '0', ',', '2', '='], '0.3'],
    [['2', '+', '3', '*', '4', '='], '20'],
    [['2', '+', '3', '=', '='], '8'],
    [['9', '+', '*', '2', '='], '18'],
    [['5', 'sign', '*', '2', '='], '-10'],
    [['2', '+', '3', '=', 'sign'], '-5'],
    [['2', '+', '3', '=', 'sign', 'sign'], '5'],
    [['2', '+', 'sign', '3', '='], '-1'],
    [['1', '2', 'backspace', '3', '='], '13'],
    [['1', '.', '.', '2'], '1.2'],
    [['9', '+', 'clear', '2', '='], '2'],
    [['2', '+', '3', '=', '7'], '7'],
  ])('processa %j como %s', (keys, expected) => {
    expect(calculate(keys).display).toBe(expected);
  });

  it('informa divisão por zero e permite reiniciar digitando', () => {
    const failed = calculate(['8', '/', '0', '=']);
    expect(failed.error).toMatch(/zero/i);
    expect(calculatorReducer(failed, '3')).toMatchObject({ display: '3', error: null });
  });

  it('limita entradas e rejeita overflow sem Infinity ou NaN', () => {
    expect(calculate(Array(30).fill('9')).display).toBe('999999999999');
    const failed = calculate([...Array(12).fill('9'), '*', '9', '=']);
    expect(failed.error).toMatch(/limite/i);
    expect(failed.display).not.toMatch(/Infinity|NaN/);
    expect(calculate(['1', 'alert(1)', '2']).display).toBe('12');
  });

  it('arredonda resultados recorrentes e permite continuar a operação', () => {
    expect(calculate(['1', '/', '3', '=']).display).toBe('0.333333333333');
    expect(calculate(['3', '+', '=', 'clear']).display).toBe('0');
  });
});
