const lang = 'nl-NL';

export const numberFormatter = new Intl.NumberFormat(lang, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
