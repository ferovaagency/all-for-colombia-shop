// Small fuzzy-search helpers used by the search bar.
// Not a full engine — enough to tolerate typos like "logiteh" or "xiami".

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const v0 = new Array(bl + 1);
  const v1 = new Array(bl + 1);
  for (let i = 0; i <= bl; i++) v0[i] = i;
  for (let i = 0; i < al; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < bl; j++) {
      const cost = a.charCodeAt(i) === b.charCodeAt(j) ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= bl; j++) v0[j] = v1[j];
  }
  return v1[bl];
}

const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function fuzzyIncludes(haystack: string, needle: string): boolean {
  const h = norm(haystack);
  const n = norm(needle);
  if (!n) return true;
  if (h.includes(n)) return true;
  // token-by-token match with typo tolerance (Levenshtein <= 2 for words >= 4 chars)
  const tokens = h.split(/[^a-z0-9]+/).filter(Boolean);
  return n
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .every((nt) => {
      if (tokens.some((t) => t.includes(nt))) return true;
      const tol = nt.length >= 6 ? 2 : nt.length >= 4 ? 1 : 0;
      if (tol === 0) return false;
      return tokens.some((t) => Math.abs(t.length - nt.length) <= tol && levenshtein(t, nt) <= tol);
    });
}

export function fuzzyScore(haystack: string, needle: string): number {
  const h = norm(haystack);
  const n = norm(needle);
  if (!n) return 0;
  const idx = h.indexOf(n);
  if (idx >= 0) return 100 - idx; // earlier matches score higher
  const tokens = h.split(/[^a-z0-9]+/).filter(Boolean);
  let best = 0;
  for (const t of tokens) {
    const d = levenshtein(t, n);
    const score = 60 - d * 10;
    if (score > best) best = score;
  }
  return best;
}
