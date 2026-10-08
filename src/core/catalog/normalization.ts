export function normalizeCatalogTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim()
    .replace(/[_./]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
