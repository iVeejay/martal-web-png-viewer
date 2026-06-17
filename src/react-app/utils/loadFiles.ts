// Drag-and-drop / file-input helpers.
//
// Everything here is 100% local: we read File objects the browser already
// has in memory and never send them anywhere. Object URLs created for the
// frames are owned by the caller (useSequence) and revoked on clear.

import type { Frame, LoadProgress } from "../types";
import { naturalSortBy } from "./naturalSort";

/** Accepted image MIME types and extensions (PNG first, others welcome). */
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|avif)$/i;

function isImageFile(file: File): boolean {
	return file.type.startsWith("image/") || IMAGE_EXT.test(file.name);
}

/**
 * Recursively read a FileSystemEntry (from webkitGetAsEntry) into File objects,
 * preserving relative paths so folder drops sort sensibly. Falls back silently
 * on browsers without the directory API.
 */
function readEntry(
	entry: FileSystemEntry,
	path: string,
	out: { file: File; path: string }[],
): Promise<void> {
	return new Promise((resolve) => {
		if (entry.isFile) {
			(entry as FileSystemFileEntry).file(
				(file) => {
					out.push({ file, path: path + file.name });
					resolve();
				},
				() => resolve(),
			);
		} else if (entry.isDirectory) {
			const reader = (entry as FileSystemDirectoryEntry).createReader();
			// readEntries must be called repeatedly until it returns an empty array.
			const entries: FileSystemEntry[] = [];
			const readBatch = () => {
				reader.readEntries(
					(batch) => {
						if (batch.length === 0) {
							Promise.all(
								entries.map((e) => readEntry(e, path + entry.name + "/", out)),
							).then(() => resolve());
						} else {
							entries.push(...batch);
							readBatch();
						}
					},
					() => resolve(),
				);
			};
			readBatch();
		} else {
			resolve();
		}
	});
}

/**
 * Extract image files (with relative paths) from a drop event, supporting
 * both folder drops (webkitGetAsEntry) and plain multi-file drops.
 */
export async function filesFromDrop(
	dt: DataTransfer,
): Promise<{ file: File; path: string }[]> {
	const items = dt.items;
	const supportsEntries =
		items && items.length > 0 && typeof items[0].webkitGetAsEntry === "function";

	if (supportsEntries) {
		const entries: FileSystemEntry[] = [];
		for (let i = 0; i < items.length; i++) {
			const entry = items[i].webkitGetAsEntry();
			if (entry) entries.push(entry);
		}
		if (entries.length > 0) {
			const out: { file: File; path: string }[] = [];
			await Promise.all(entries.map((e) => readEntry(e, "", out)));
			return out.filter((x) => isImageFile(x.file));
		}
	}

	// Fallback: plain file list (no folder structure available).
	return Array.from(dt.files)
		.filter(isImageFile)
		.map((file) => ({ file, path: file.name }));
}

/** Extract image files from a <input type="file"> (supports webkitdirectory). */
export function filesFromInput(
	fileList: FileList,
): { file: File; path: string }[] {
	return Array.from(fileList)
		.filter(isImageFile)
		.map((file) => ({
			file,
			// webkitRelativePath is set when a directory input is used.
			path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
		}));
}

/**
 * Turn raw image files into fully-decoded Frames, naturally sorted by path.
 * Decoding up front (img.decode) means playback never stalls on a cold frame.
 *
 * @param onProgress called as each frame finishes decoding.
 */
export async function buildFrames(
	files: { file: File; path: string }[],
	onProgress?: (p: LoadProgress) => void,
): Promise<Frame[]> {
	const sorted = naturalSortBy(files, (f) => f.path);
	const total = sorted.length;
	let loaded = 0;

	const frames = await Promise.all(
		sorted.map(async ({ file, path }) => {
			const url = URL.createObjectURL(file);
			const image = new Image();
			image.src = url;
			try {
				// decode() resolves once the bitmap is ready to paint.
				await image.decode();
			} catch {
				// Corrupt/undecodable file — skip it but free its URL.
				URL.revokeObjectURL(url);
				loaded++;
				onProgress?.({ loaded, total });
				return null;
			}
			loaded++;
			onProgress?.({ loaded, total });
			const frame: Frame = {
				id: url,
				name: file.name,
				path,
				url,
				image,
				width: image.naturalWidth,
				height: image.naturalHeight,
				size: file.size,
			};
			return frame;
		}),
	);

	// Preserve sorted order, drop any that failed to decode.
	return frames.filter((f): f is Frame => f !== null);
}
