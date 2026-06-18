// Global keyboard shortcuts for the viewer.
//
//   Space  play / pause      R  toggle reverse      H  flip horizontal
//   ←      previous frame    F  fit to screen       V  flip vertical
//   →      next frame
//
// Handlers are read through a ref so the listener is attached once and never
// goes stale, and shortcuts are ignored while typing in an input.

import { useEffect, useRef } from "react";

export interface ShortcutHandlers {
	togglePlay: () => void;
	prevFrame: () => void;
	nextFrame: () => void;
	toggleReverse: () => void;
	fit: () => void;
	flipH: () => void;
	flipV: () => void;
}

export function useKeyboardShortcuts(
	handlers: ShortcutHandlers,
	enabled = true,
): void {
	const ref = useRef(handlers);
	// Keep the latest handlers in the ref (after render) so the single listener
	// below never goes stale.
	useEffect(() => {
		ref.current = handlers;
	});

	useEffect(() => {
		if (!enabled) return;
		const onKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.isContentEditable)
			) {
				return;
			}

			const h = ref.current;
			switch (e.key) {
				case " ":
					e.preventDefault(); // stop page scroll
					h.togglePlay();
					break;
				case "ArrowLeft":
					e.preventDefault();
					h.prevFrame();
					break;
				case "ArrowRight":
					e.preventDefault();
					h.nextFrame();
					break;
				case "r":
				case "R":
					h.toggleReverse();
					break;
				case "f":
				case "F":
					h.fit();
					break;
				case "h":
				case "H":
					h.flipH();
					break;
				case "v":
				case "V":
					h.flipV();
					break;
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [enabled]);
}
