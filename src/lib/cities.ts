export const DEFAULT_CITY = 'Junagadh';

const GUJARAT_CITY_HINTS = [
  'junagadh',
  'rajkot',
  'ahmedabad',
  'surat',
  'vadodara',
  'baroda',
  'jamnagar',
  'bhavnagar',
  'gandhinagar',
  'porbandar',
  'morbi',
  'amreli',
  'veraval',
  'keshod',
  'gondal',
  'jetpur',
  'dhoraji',
  'upleta',
  'sanand',
  'somnath',
  'prabhas patan',
  'una',
  'delvada',
  'kodinar',
  'mangrol',
  'vanthali',
  'mendarda',
  'visavadar',
  'manavadar',
  'bantwa',
  'chorwad',
  'gadu',
  'bhesan',
  'bilkha',
  'shapur',
  'joshipura',
  'dungarpur',
  'talala',
  'anand',
  'nadiad',
  'bharuch',
  'vapi',
  'navsari',
  'mehsana',
  'palanpur',
  'bhuj',
  'kutch',
  'valsad',
  'gandhidham',
  'surendranagar',
  'botad',
  'dwarka',
  'gir',
];

const GUJARAT_MAJOR_PRIORITY = [
  'junagadh',
  'junagadh (ho)',
  'junagadh city (sardarbag)',
  'rajkot',
  'ahmedabad',
  'surat',
  'vadodara',
  'jamnagar',
  'bhavnagar',
  'gandhinagar',
  'porbandar',
  'morbi',
  'amreli',
  'veraval (gir somnath)',
  'veraval',
  'keshod (junagadh)',
  'keshod',
  'gondal (rajkot)',
  'gondal',
  'jetpur (rajkot)',
  'jetpur',
];

export function isGujaratCity(name: string, state?: string, pincode?: string): boolean {
  const s = (state || '').trim().toLowerCase();
  if (s === 'gujarat' || s.includes('gujarat')) return true;
  if (s && s !== 'india' && s !== 'metro') return false;

  const p = (pincode || '').trim();
  if (/^3[6-9]\d{4}$/.test(p)) return true;

  const n = (name || '').trim().toLowerCase();
  if (!n) return false;
  return GUJARAT_CITY_HINTS.some(hint => n === hint || n.includes(hint));
}

function getCityPriorityRank(name: string, state?: string, pincode?: string, popular?: boolean): [number, number] {
  const n = (name || '').trim().toLowerCase();

  if (n === 'junagadh') return [0, 0];
  if (n.startsWith('junagadh')) {
    const idx = GUJARAT_MAJOR_PRIORITY.indexOf(n);
    return [1, idx >= 0 ? idx : 50];
  }

  if (isGujaratCity(name, state, pincode)) {
    const idx = GUJARAT_MAJOR_PRIORITY.indexOf(n);
    if (idx >= 0) return [2, idx];
    return [3, popular ? 0 : 100];
  }

  return [4, popular ? 0 : 100];
}

export function sortCityItems<T extends { name: string; state?: string; pincode?: string; popular?: boolean }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const [tierA, subA] = getCityPriorityRank(a.name, a.state, a.pincode, a.popular);
    const [tierB, subB] = getCityPriorityRank(b.name, b.state, b.pincode, b.popular);
    if (tierA !== tierB) return tierA - tierB;
    if (subA !== subB) return subA - subB;
    return a.name.localeCompare(b.name);
  });
}

export function sortCityNames(
  names: string[],
  metaLookup?: Record<string, { state?: string; pincode?: string; popular?: boolean }>
): string[] {
  return [...names].sort((a, b) => {
    const normA = a.trim().toLowerCase();
    const normB = b.trim().toLowerCase();
    if (normA === 'other') return 1;
    if (normB === 'other') return -1;
    const metaA = metaLookup?.[normA];
    const metaB = metaLookup?.[normB];
    const [tierA, subA] = getCityPriorityRank(a, metaA?.state, metaA?.pincode, metaA?.popular);
    const [tierB, subB] = getCityPriorityRank(b, metaB?.state, metaB?.pincode, metaB?.popular);
    if (tierA !== tierB) return tierA - tierB;
    if (subA !== subB) return subA - subB;
    return a.localeCompare(b);
  });
}
