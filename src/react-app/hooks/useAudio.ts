// Web Audio playback engine for the Audio tool.
//
// Uses AudioBufferSourceNodes (not <audio> elements) so we can:
//   - play the precomputed *reversed* buffer for the reverse toggle,
//   - change playbackRate live for speed,
//   - track an accurate play position for the waveform playhead/seek.
//
// Source nodes are one-shot (a node can't be paused/restarted), so pause/seek
// stop the current node and start a fresh one from a tracked offset.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AudioTrack, LoadProgress } from "../types";
import { buildTracks } from "../utils/audioFiles";

export interface UseAudioResult {
	tracks: AudioTrack[];
	activeId: string | null;
	activeTrack: AudioTrack | null;
	setActive: (id: string) => void;
	isPlaying: boolean;
	currentTime: number;
	duration: number;
	loop: boolean;
	reverse: boolean;
	rate: number;
	play: () => void;
	pause: () => void;
	toggle: () => void;
	stop: () => void;
	seek: (t: number) => void;
	setLoop: (v: boolean) => void;
	setReverse: (v: boolean) => void;
	setRate: (v: number) => void;
	load: (files: { file: File; path: string }[]) => Promise<void>;
	clear: () => void;
	isLoading: boolean;
	progress: LoadProgress;
	error: string | null;
}

export function useAudio(): UseAudioResult {
	const [tracks, setTracks] = useState<AudioTrack[]>([]);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [loop, setLoopState] = useState(false);
	const [reverse, setReverseState] = useState(false);
	const [rate, setRateState] = useState(1);
	const [isLoading, setIsLoading] = useState(false);
	const [progress, setProgress] = useState<LoadProgress>({ loaded: 0, total: 0 });
	const [error, setError] = useState<string | null>(null);

	const activeTrack = useMemo(
		() => tracks.find((t) => t.id === activeId) ?? null,
		[tracks, activeId],
	);
	const duration = activeTrack?.duration ?? 0;

	// --- Live values read by the audio graph (kept fresh without restarts) ---
	const ctxRef = useRef<AudioContext | null>(null);
	const sourceRef = useRef<AudioBufferSourceNode | null>(null);
	const rafRef = useRef(0);
	const posRef = useRef(0); // offset (s) within the buffer where this segment started
	const startedAtRef = useRef(0); // ctx time when this segment started
	const stoppingRef = useRef(false); // ignore the onended from a manual stop

	const isPlayingRef = useRef(false);
	const durationRef = useRef(0);
	const activeTrackRef = useRef<AudioTrack | null>(null);
	const rateRef = useRef(rate);
	const loopRef = useRef(loop);
	const reverseRef = useRef(reverse);

	useEffect(() => {
		isPlayingRef.current = isPlaying;
	}, [isPlaying]);
	useEffect(() => {
		activeTrackRef.current = activeTrack;
		durationRef.current = activeTrack?.duration ?? 0;
	}, [activeTrack]);

	const getCtx = useCallback((): AudioContext => {
		if (!ctxRef.current) {
			const Ctor =
				window.AudioContext ||
				(window as unknown as { webkitAudioContext: typeof AudioContext })
					.webkitAudioContext;
			ctxRef.current = new Ctor();
		}
		return ctxRef.current;
	}, []);

	const cancelRaf = useCallback(() => {
		if (rafRef.current) cancelAnimationFrame(rafRef.current);
		rafRef.current = 0;
	}, []);

	// Live play position within the current buffer.
	const currentPos = useCallback((): number => {
		const ctx = ctxRef.current;
		const dur = durationRef.current;
		if (!isPlayingRef.current || !ctx) return posRef.current;
		let p = posRef.current + (ctx.currentTime - startedAtRef.current) * rateRef.current;
		if (loopRef.current && dur > 0) p %= dur;
		else if (p > dur) p = dur;
		return p;
	}, []);

	const startRaf = useCallback(() => {
		cancelRaf();
		const tick = () => {
			setCurrentTime(currentPos());
			rafRef.current = requestAnimationFrame(tick);
		};
		rafRef.current = requestAnimationFrame(tick);
	}, [cancelRaf, currentPos]);

	const stopSource = useCallback(() => {
		if (sourceRef.current) {
			stoppingRef.current = true;
			try {
				sourceRef.current.stop();
			} catch {
				/* already stopped */
			}
			sourceRef.current.disconnect();
			sourceRef.current = null;
		}
	}, []);

	// Start (or restart) playback from an offset using the current buffer/rate.
	const startPlayback = useCallback(
		(offset: number) => {
			const track = activeTrackRef.current;
			if (!track) return;
			const ctx = getCtx();
			if (ctx.state === "suspended") void ctx.resume();
			stopSource();

			const buffer = reverseRef.current ? track.reversed : track.buffer;
			const source = ctx.createBufferSource();
			source.buffer = buffer;
			source.loop = loopRef.current;
			source.playbackRate.value = rateRef.current;
			source.connect(ctx.destination);

			let off = offset;
			if (off >= track.duration || off < 0) off = 0;

			source.onended = () => {
				if (stoppingRef.current) {
					stoppingRef.current = false;
					return; // manual stop/restart — ignore
				}
				// Reached the natural end (non-looping).
				sourceRef.current = null;
				posRef.current = track.duration;
				setCurrentTime(track.duration);
				setIsPlaying(false);
				cancelRaf();
			};

			source.start(0, off);
			sourceRef.current = source;
			posRef.current = off;
			startedAtRef.current = ctx.currentTime;
			setIsPlaying(true);
			startRaf();
		},
		[getCtx, stopSource, startRaf, cancelRaf],
	);

	const play = useCallback(() => {
		if (!activeTrackRef.current) return;
		let off = posRef.current;
		if (off >= durationRef.current) off = 0; // restart if parked at the end
		startPlayback(off);
	}, [startPlayback]);

	const pause = useCallback(() => {
		if (!isPlayingRef.current) return;
		const p = currentPos();
		stopSource();
		posRef.current = p;
		setCurrentTime(p);
		setIsPlaying(false);
		cancelRaf();
	}, [currentPos, stopSource, cancelRaf]);

	const stop = useCallback(() => {
		stopSource();
		posRef.current = 0;
		setCurrentTime(0);
		setIsPlaying(false);
		cancelRaf();
	}, [stopSource, cancelRaf]);

	const toggle = useCallback(() => {
		if (isPlayingRef.current) pause();
		else play();
	}, [pause, play]);

	const seek = useCallback(
		(t: number) => {
			const clamped = Math.max(0, Math.min(durationRef.current, t));
			posRef.current = clamped;
			setCurrentTime(clamped);
			if (isPlayingRef.current) startPlayback(clamped);
		},
		[startPlayback],
	);

	const setRate = useCallback((r: number) => {
		// Apply live: rebase the position tracking, then change the AudioParam.
		if (isPlayingRef.current && sourceRef.current && ctxRef.current) {
			let p = posRef.current + (ctxRef.current.currentTime - startedAtRef.current) * rateRef.current;
			if (loopRef.current && durationRef.current > 0) p %= durationRef.current;
			posRef.current = p;
			startedAtRef.current = ctxRef.current.currentTime;
			sourceRef.current.playbackRate.value = r;
		}
		rateRef.current = r;
		setRateState(r);
	}, []);

	const setLoop = useCallback((l: boolean) => {
		if (sourceRef.current) sourceRef.current.loop = l;
		loopRef.current = l;
		setLoopState(l);
	}, []);

	const setReverse = useCallback(
		(rev: boolean) => {
			const dur = durationRef.current;
			const p = isPlayingRef.current ? currentPos() : posRef.current;
			const mirrored = Math.max(0, Math.min(dur, dur - p));
			reverseRef.current = rev;
			setReverseState(rev);
			posRef.current = mirrored;
			if (isPlayingRef.current) startPlayback(mirrored);
			else setCurrentTime(mirrored);
		},
		[currentPos, startPlayback],
	);

	const setActive = useCallback(
		(id: string) => {
			stop();
			setActiveId(id);
		},
		[stop],
	);

	const load = useCallback(
		async (files: { file: File; path: string }[]) => {
			if (files.length === 0) {
				setError("No audio files found in the drop.");
				return;
			}
			setError(null);
			setIsLoading(true);
			setProgress({ loaded: 0, total: files.length });
			try {
				const next = await buildTracks(getCtx(), files, setProgress);
				if (next.length === 0) {
					setError("None of the files could be decoded as audio.");
					return;
				}
				stop();
				setTracks(next);
				setActiveId(next[0].id);
			} catch {
				setError("Something went wrong while loading the audio.");
			} finally {
				setIsLoading(false);
			}
		},
		[getCtx, stop],
	);

	const clear = useCallback(() => {
		stop();
		setTracks([]);
		setActiveId(null);
		setProgress({ loaded: 0, total: 0 });
		setError(null);
	}, [stop]);

	// Tear down the audio graph on unmount.
	useEffect(() => {
		return () => {
			if (sourceRef.current) {
				try {
					sourceRef.current.stop();
				} catch {
					/* already stopped */
				}
				sourceRef.current.disconnect();
			}
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
			void ctxRef.current?.close();
		};
	}, []);

	return {
		tracks,
		activeId,
		activeTrack,
		setActive,
		isPlaying,
		currentTime,
		duration,
		loop,
		reverse,
		rate,
		play,
		pause,
		toggle,
		stop,
		seek,
		setLoop,
		setReverse,
		setRate,
		load,
		clear,
		isLoading,
		progress,
		error,
	};
}
