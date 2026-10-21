import { describe, expect, it } from 'vitest';
import { calculatorReducer, initialCalculatorState } from './calculatorEngine';

function calculate(keys: string[]) {
  return keys.reduce(calculatorReducer, initialCalculatorState);
}

describe('calculadora independente', () => {
  it.each([
    ['10%', '0.1'], ['200+10%=', '220'], ['200-10%=', '180'],
    ['200*10%=', '20'], ['200/10%=', '2000'],
    ['200+10%%=', '220'], ['10%%', '0.1'], ['200+10%==', '240'],
    ['200*10%==', '2'], ['200+10%5=', '205'],
    ['10%+2=', '2.1'], ['200+0%=', '200'], ['0+10%=', '0'],
  ])('calcula porcentagem em %s como %s', (input, expected) => {
    expect(calculate([...input])).toMatchObject({ display: expected, error: null });
  });

  it('mantém sinal, edição explícita, resultado e entrada incompleta previsíveis após %', () => {
    expect(calculate([...('200+10%'), 'sign', '=']).display).toBe('180');
    expect(calculate([...('200+10%'), 'sign', '%', '=']).display).toBe('180');
    expect(calculate([...('200+10%'), 'backspace', '5', '=']).display).toBe('225');
    expect(calculate([...('200+10='), '%', '=']).display).toBe('2.1');
    expect(calculate([...('200+10%='), 'clear', ...'10%']).display).toBe('0.1');
    const pending = calculate([...'200+']);
    expect(calculatorReducer(pending, '%')).toEqual(pending);
    expect(calculate(['%', 'unknown', '1', '0', '%']).display).toBe('0.1');
  });

  it('aplica os limites e arredondamento existentes a porcentagem', () => {
    expect(calculate([...'999999999999%']).display).toBe('9999999999.99');
    expect(calculate([...'999999999999+999999999999%']).error).toMatch(/limite/);
    expect(calculate([...'0.00000000001%']).error).toMatch(/limite/);
    const failed = calculate([...'200/0%=']);
    expect(failed.error).toMatch(/zero/);
    expect(calculatorReducer(failed, '%')).toEqual(failed);
    expect(calculatorReducer(failed, 'clear')).toEqual(initialCalculatorState);
  });

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
