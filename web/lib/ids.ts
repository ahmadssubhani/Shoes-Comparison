export function toProductId(matchKey: string): string {
  return encodeURIComponent(matchKey);
}

export function fromProductId(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}
