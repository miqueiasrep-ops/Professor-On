/**
 * Safely formats date strings (YYYY-MM-DD or ISO strings) into Brazilian format (DD/MM/YYYY)
 * preventing UTC timezone offset from retrogressing the day.
 */
export const formatDateBR = (dateStr?: string | null): string => {
  if (!dateStr) return 'Sem data';

  const cleanStr = dateStr.trim();

  // Matches YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
    const [year, month, day] = cleanStr.split('-');
    return `${day}/${month}/${year}`;
  }

  // Matches YYYY-MM-DD at the start of ISO string (e.g., 2026-08-15T...)
  if (/^\d{4}-\d{2}-\d{2}T/.test(cleanStr)) {
    const datePart = cleanStr.slice(0, 10);
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
  }

  // Fallback for other date string formats
  try {
    const dateObj = new Date(cleanStr.includes('T') ? cleanStr : `${cleanStr}T12:00:00`);
    if (isNaN(dateObj.getTime())) return cleanStr;
    return dateObj.toLocaleDateString('pt-BR');
  } catch {
    return cleanStr;
  }
};
