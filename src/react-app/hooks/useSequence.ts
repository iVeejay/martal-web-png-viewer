// Owns the loaded frame sequence and the lifecycle of its object URLs.
//
// All frames live here; clearing the sequence revokes every URL so we don't
// leak blob memory between loads.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Frame, LoadProgress } from "../types";
import { buildFrames } from "../utils/loadFiles";

interface UseSequenceResult {
	frames: Frame[];
	isLoading: boolean;
	progress: LoadProgress;
	error: string | null;
	/**
	 * Decode dropped/selected files into frames, replacing the current set.
	 * Resolves with the loaded frames (empty if nothing decoded) so the caller
	 * can reset view/playback state at the source rather than via an effect.
	 */
	load: (files: { file: File; path: string }[]) => Promise<Frame[]>;
	/** Revoke all URLs and clear the sequence. */
	clear: () => void;
}

export function useSequence(): UseSequenceResult {
	const [frames, setFrames] = useState<Frame[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [progress, setProgress] = useState<LoadProgress>({
		loaded: 0,
		total: 0,
	});
	const [error, setError] = useState<string | null>(null);

	// Mirror frames into a ref (updated after render) so callbacks and unmount
	// cleanup can revoke whatever is currently loaded without stale closures.
	const framesRef = useRef<Frame[]>([]);
	useEffect(() => {
		framesRef.current = frames;
	}, [frames]);

	const revokeAll = useCallback((list: Frame[]) => {
		for (const f of list) URL.revokeObjectURL(f.url);
	}, []);

	const clear = useCallback(() => {
		revokeAll(framesRef.current);
		setFrames([]);
		setProgress({ loaded: 0, total: 0 });
		setError(null);
	}, [revokeAll]);

	const load = useCallback(
		async (files: { file: File; path: string }[]): Promise<Frame[]> => {
			if (files.length === 0) {
				setError("No image files found in the drop.");
				return [];
			}
			setError(null);
			setIsLoading(true);
			setProgress({ loaded: 0, total: files.length });

			// Build the new set before swapping, then revoke the previous URLs.
			const previous = framesRef.current;
			try {
				const next = await buildFrames(files, setProgress);
				if (next.length === 0) {
					setError("None of the files could be decoded as images.");
					return [];
				}
				revokeAll(previous);
				setFrames(next);
				return next;
			} catch {
				setError("Something went wrong while loading the images.");
				return [];
			} finally {
				setIsLoading(false);
			}
		},
		[revokeAll],
	);

	// Revoke everything on unmount.
	useEffect(() => {
		return () => revokeAll(framesRef.current);
	}, [revokeAll]);

	return { frames, isLoading, progress, error, load, clear };
}
