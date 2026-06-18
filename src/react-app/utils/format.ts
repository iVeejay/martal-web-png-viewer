// Small formatting helpers for the info panel and clipboard export.

/** Human-readable byte size, e.g. 1536 -> "1.5 KB". */
export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	const units = ["KB", "MB", "GB"];
	let value = bytes / 1024;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit++;
	}
	return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

/** Playback duration in seconds for a sequence, e.g. "1.33 s". */
export function formatDuration(frameCount: number, fps: number): string {
	if (fps <= 0) return "—";
	return `${(frameCount / fps).toFixed(2)} s`;
}

/** Seconds as m:ss.t, e.g. 73.4 -> "1:13.4". */
export function formatTime(seconds: number): string {
	if (!isFinite(seconds) || seconds < 0) seconds = 0;
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	const t = Math.floor((seconds * 10) % 10);
	return `${m}:${s.toString().padStart(2, "0")}.${t}`;
}
