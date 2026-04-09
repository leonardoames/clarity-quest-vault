// Detects potential duplicate financial entries using:
// - Same valor (exact)
// - Same vencimento date (exact)
// - Description similarity >= 70% (Jaccard on word sets, ignoring stopwords)
// Only checks records from the last 90 days.

const STOPWORDS = new Set(["de","do","da","dos","das","e","o","a","os","as","em","no","na","nos","nas","para","por","com","um","uma","uns","umas"]);

function tokenize(text: string): Set<string> {
  return new Set(
    (text || "").toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOPWORDS.has(w))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter(w => b.has(w)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

export interface DuplicateGroup {
  id: string; // unique group id
  records: any[]; // 2+ records that are potential duplicates
  similarity: number; // 0-1
}

// Returns the best available date for a record (vencimento → competencia → data_movimento)
function bestDate(r: any): string {
  if (r.vencimento) return r.vencimento;
  if (r.competencia) return r.competencia + "-01";
  if (r.data_movimento) return r.data_movimento;
  return "";
}

export function detectDuplicates(records: any[]): DuplicateGroup[] {
  // Filter to last 180 days (using best available date)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 180);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  // Include records with any valid date within window, OR records with no date at all
  const recent = records.filter(r => {
    const d = bestDate(r);
    return d === "" || d >= cutoffStr;
  });

  // Group by valor (as string with 2 decimals) + best available date
  const groups = new Map<string, any[]>();
  for (const r of recent) {
    const key = `${Number(r.valor || 0).toFixed(2)}|${bestDate(r)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const result: DuplicateGroup[] = [];

  for (const [, group] of groups) {
    if (group.length < 2) continue;

    // Check all pairs within the group for description similarity
    const seen = new Set<string>();
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        const tokA = tokenize(a.descricao || "");
        const tokB = tokenize(b.descricao || "");
        const sim = jaccard(tokA, tokB);
        if (sim >= 0.7) {
          // Check if either record is already in a group
          const keyA = `${a._tipo}|${a.id}`;
          const keyB = `${b._tipo}|${b.id}`;
          const groupKey = [keyA, keyB].sort().join(":");
          if (!seen.has(groupKey)) {
            seen.add(groupKey);
            // Find or create group for these records
            const existing = result.find(g =>
              g.records.some(r => `${r._tipo}|${r.id}` === keyA || `${r._tipo}|${r.id}` === keyB)
            );
            if (existing) {
              if (!existing.records.find(r => `${r._tipo}|${r.id}` === keyA)) existing.records.push(a);
              if (!existing.records.find(r => `${r._tipo}|${r.id}` === keyB)) existing.records.push(b);
              existing.similarity = Math.max(existing.similarity, sim);
            } else {
              result.push({
                id: groupKey,
                records: [a, b],
                similarity: sim,
              });
            }
          }
        }
      }
    }
  }

  return result;
}
