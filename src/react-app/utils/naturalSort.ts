// Natural ("human") sorting so that frame_2 sorts before frame_10.
//
// Intl.Collator with { numeric: true } handles the common cases
// (frame_1, frame_2, ..., frame_10) correctly and is fast enough to
// reuse a single collator instance across many comparisons.
const collator = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: "base",
});

/** Compare two strings using natural/numeric ordering. */
export function naturalCompare(a: string, b: string): number {
	return collator.compare(a, b);
}

/** Sort a list of items by a string key using natural ordering. */
export function naturalSortBy<T>(items: T[], key: (item: T) => string): T[] {
	return [...items].sort((a, b) => naturalCompare(key(a), key(b)));
}
