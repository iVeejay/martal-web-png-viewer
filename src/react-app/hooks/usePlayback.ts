// requestAnimationFrame-based playback engine.
//
// Timing is driven by an accumulator (elapsed ms / frame duration) rather than
// setInterval, so playback stays accurate even when the display refresh rate
// doesn't divide evenly into the target FPS, and it can advance multiple frames
// if the tab was throttled. Direction handling covers reverse, loop, and
// ping-pong (bounce) modes.

import { useEffect, useRef } from "react";

interface UsePlaybackOptions {
	frameCount: number;
	fps: number;
	isPlaying: boolean;
	reverse: boolean;
	loop: boolean;
	pingPong: boolean;
	/** Advance/set the current frame index. */
	setIndex: (updater: (prev: number) => number) => void;
	/** Called when a non-looping sequence reaches its end. */
	onEnd: () => void;
}

export function usePlayback({
	frameCount,
	fps,
	isPlaying,
	reverse,
	loop,
	pingPong,
	setIndex,
	onEnd,
}: UsePlaybackOptions): void {
	// Live values read inside the rAF loop without restarting it.
	const fpsRef = useRef(fps);
	const loopRef = useRef(loop);
	const pingPongRef = useRef(pingPong);
	const countRef = useRef(frameCount);
	const setIndexRef = useRef(setIndex);
	const onEndRef = useRef(onEnd);

	// Current step direction (+1 forward, -1 backward). Reverse flips it; in
	// ping-pong it flips again whenever we hit an end.
	const dirRef = useRef(reverse ? -1 : 1);
	const prevReverseRef = useRef(reverse);

	// Keep live values in refs (updated after render) so the rAF loop can read
	// fresh data without being torn down and restarted on every change.
	useEffect(() => {
		fpsRef.current = fps;
		loopRef.current = loop;
		pingPongRef.current = pingPong;
		countRef.current = frameCount;
		setIndexRef.current = setIndex;
		onEndRef.current = onEnd;
	});

	// When the user toggles reverse, flip the live playback direction.
	useEffect(() => {
		if (prevReverseRef.current !== reverse) {
			dirRef.current *= -1;
			prevReverseRef.current = reverse;
		}
	}, [reverse]);

	useEffect(() => {
		if (!isPlaying || frameCount <= 1) return;

		let raf = 0;
		let last = performance.now();
		let acc = 0;

		const step = () => {
			const count = countRef.current;
			const lastIndex = count - 1;

			setIndexRef.current((prev) => {
				let next = prev + dirRef.current;

				if (next > lastIndex || next < 0) {
					// Reached an end.
					if (pingPongRef.current && count > 1) {
						dirRef.current *= -1;
						next = prev + dirRef.current; // bounce inward
					} else if (loopRef.current) {
						next = dirRef.current > 0 ? 0 : lastIndex; // wrap around
					} else {
						onEndRef.current();
						return prev > lastIndex ? lastIndex : prev < 0 ? 0 : prev;
					}
				}
				return Math.max(0, Math.min(lastIndex, next));
			});
		};

		const tick = (now: number) => {
			acc += now - last;
			last = now;
			const frameDuration = 1000 / Math.max(1, fpsRef.current);
			// Guard against huge accumulations after the tab was backgrounded.
			if (acc > frameDuration * 5) acc = frameDuration;
			while (acc >= frameDuration) {
				acc -= frameDuration;
				step();
			}
			raf = requestAnimationFrame(tick);
		};

		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
		// Restart only when play state or frame count changes; fps/mode are read
		// live via refs so changing them mid-play doesn't reset timing.
	}, [isPlaying, frameCount]);
}
