export function updateSort(
  field: string,
  currentField: string,
  setCurrentPage: (page: number) => void,
  setField: (value: string) => void,
  setDirection: (value: 'asc' | 'desc' | ((current: 'asc' | 'desc') => 'asc' | 'desc')) => void,
  defaultDirection: 'asc' | 'desc',
) {
  setCurrentPage(1);

  if (currentField === field) {
    setDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    return;
  }

  setField(field);
  setDirection(defaultDirection);
}
