function dateTime(value: string | null | undefined) {
  if (!value) return null;
  const displayDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const normalized = displayDate ? `${displayDate[3]}-${displayDate[2]}-${displayDate[1]}` : value;
  const time = Date.parse(normalized);
  return Number.isFinite(time) ? time : null;
}

export function compareDateValues(
  left: string | null | undefined,
  right: string | null | undefined,
  direction: 'asc' | 'desc',
) {
  const leftTime = dateTime(left);
  const rightTime = dateTime(right);
  // Missing dates stay last in either direction.
  if (leftTime === null) return rightTime === null ? 0 : 1;
  if (rightTime === null) return -1;
  return direction === 'asc' ? leftTime - rightTime : rightTime - leftTime;
}
