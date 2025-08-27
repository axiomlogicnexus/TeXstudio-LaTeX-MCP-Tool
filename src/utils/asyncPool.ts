export async function asyncPool<T, R>(limit: number, items: T[], iterator: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  const workers: Promise<void>[] = [];

  async function worker() {
    while (true) {
      const current = i++;
      if (current >= items.length) break;
      results[current] = await iterator(items[current], current);
    }
  }

  const n = Math.min(Math.max(1, limit), items.length || 1);
  for (let w = 0; w < n; w++) workers.push(worker());
  await Promise.all(workers);
  return results;
}
