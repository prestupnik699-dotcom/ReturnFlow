export type DateGroupable = { createdAt: string };

export type DateSection<T> = {
  key: string;
  labelKind: 'today' | 'yesterday' | 'date';
  // Only set when labelKind is 'date' — the caller formats it however
  // it likes (locale-specific date formatting lives in the screen, not
  // here, since this is a pure/testable utility with no i18n dependency).
  dateIso: string | null;
  data: T[];
};

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Groups items into date buckets. Items keep whatever order the caller
// already sorted them in WITHIN each bucket (name, quantity, date — any
// of those), but the buckets themselves are always ordered newest-day-
// first regardless of the active sort, since the day-grouping headers
// only make sense chronologically.
export function groupByDate<T extends DateGroupable>(items: T[]): DateSection<T>[] {
  const todayStart = startOfDay(new Date());
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

  const groups = new Map<number, DateSection<T>>();

  for (const item of items) {
    const itemDayStart = startOfDay(new Date(item.createdAt));

    let section = groups.get(itemDayStart);

    if (!section) {
      const labelKind: DateSection<T>['labelKind'] =
        itemDayStart === todayStart
          ? 'today'
          : itemDayStart === yesterdayStart
            ? 'yesterday'
            : 'date';

      section = {
        key: String(itemDayStart),
        labelKind,
        dateIso: labelKind === 'date' ? item.createdAt : null,
        data: [],
      };
      groups.set(itemDayStart, section);
    }

    section.data.push(item);
  }

  return Array.from(groups.entries())
    .sort(([dayA], [dayB]) => dayB - dayA)
    .map(([, section]) => section);
}
