export function formatMemory (memory: number) {
  // B -> kB -> MB
  memory /= 1024 ** 2;

  const unit = memory > 1024 ? 'GB' : 'MB';
  return `${numberFormatter.format(unit === 'GB' ? memory / 1024 : memory)} ${unit}`;
}
