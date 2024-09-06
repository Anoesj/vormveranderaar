export function formatDuration (ms: number) {
  // Log seconds, minutes or hours depending on the duration
  if (ms < 1000) {
    return `${numberFormatter.format(ms)} milliseconds`;
  }
  else if (ms < 60_000) {
    return `${numberFormatter.format(ms / 1000)} seconds`;
  }
  else if (ms < 3_600_000) {
    return `${numberFormatter.format(ms / 60_000)} minutes`;
  }
  else {
    return `${numberFormatter.format(ms / 3_600_000)} hours`;
  }
}
