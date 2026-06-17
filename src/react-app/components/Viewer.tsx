// Center preview canvas.
//
// Everything is drawn with the 2D canvas API so background, flip, rotation,
// scale and smoothing all compose cleanly. The canvas is sized to its
// container in device pixels for crisp output on HiDPI screens.

import { useCallback, useEffect, useRef } from "react";
import type { BackgroundMode, Frame, Transform } from "../types";

export const MIN_SCALE = 0.05;
export const MAX_SCALE = 64;

interface ViewerProps {
	frame: Frame | null;
	transform: Transform;
	backgroundMode: BackgroundMode;
	customColor: string;
	smoothing: boolean;
	/** Explicit scale factor (1 = 100%) used when fitMode is off. */
	zoom: number;
	fitMode: boolean;
	pan: { x: number; y: number };
	onPanChange: (pan: { x: number; y: number }) => void;
	/** Wheel-zoom: new scale + pan that keeps the cursor point stable. */
	onZoomAt: (scale: number, pan: { x: number; y: number }) => void;
	/** Reports the effective on-screen scale so the UI can display it. */
	onScaleChange: (scale: number) => void;
}

/** Dimensions after applying 90/270° rotation (which swaps w/h). */
function rotatedSize(frame: Frame, rotation: number) {
	const swap = rotation === 90 || rotation === 270;
	return {
		w: swap ? frame.height : frame.width,
		h: swap ? frame.width : frame.height,
	};
}

export function Viewer({
	frame,
	transform,
	backgroundMode,
	customColor,
	smoothing,
	zoom,
	fitMode,
	pan,
	onPanChange,
	onZoomAt,
	onScaleChange,
}: ViewerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const sizeRef = useRef({ w: 0, h: 0 });
	const checkerRef = useRef<CanvasPattern | null>(null);
	const lastReportedScale = useRef(0);

	// Effective scale: fit-to-container when fitMode is on, else explicit zoom.
	const effectiveScale = useCallback((): number => {
		if (!frame) return zoom;
		if (!fitMode) return zoom;
		const { w, h } = sizeRef.current;
		if (w === 0 || h === 0) return zoom;
		const r = rotatedSize(frame, transform.rotation);
		return Math.min(w / r.w, h / r.h);
	}, [frame, fitMode, zoom, transform.rotation]);

	// Build (and cache) a checkerboard pattern at the current device ratio.
	const getChecker = useCallback(
		(ctx: CanvasRenderingContext2D, dpr: number): CanvasPattern | null => {
			if (checkerRef.current) return checkerRef.current;
			const tile = 16 * dpr;
			const pc = document.createElement("canvas");
			pc.width = pc.height = tile * 2;
			const pctx = pc.getContext("2d")!;
			pctx.fillStyle = "#3a3a3a";
			pctx.fillRect(0, 0, tile * 2, tile * 2);
			pctx.fillStyle = "#2b2b2b";
			pctx.fillRect(0, 0, tile, tile);
			pctx.fillRect(tile, tile, tile, tile);
			checkerRef.current = ctx.createPattern(pc, "repeat");
			return checkerRef.current;
		},
		[],
	);

	const draw = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const dpr = window.devicePixelRatio || 1;
		const { w, h } = sizeRef.current;
		const dw = Math.max(1, Math.round(w * dpr));
		const dh = Math.max(1, Math.round(h * dpr));
		if (canvas.width !== dw || canvas.height !== dh) {
			canvas.width = dw;
			canvas.height = dh;
		}

		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, dw, dh);

		// Background.
		if (backgroundMode === "checker") {
			const pattern = getChecker(ctx, dpr);
			ctx.fillStyle = pattern ?? "#2b2b2b";
		} else if (backgroundMode === "dark") {
			ctx.fillStyle = "#1a1a1a";
		} else if (backgroundMode === "light") {
			ctx.fillStyle = "#f5f5f5";
		} else {
			ctx.fillStyle = customColor;
		}
		ctx.fillRect(0, 0, dw, dh);

		if (!frame) return;

		// Image, transformed about the panned center.
		const scale = effectiveScale() * dpr;
		ctx.save();
		ctx.imageSmoothingEnabled = smoothing;
		ctx.translate((w / 2 + pan.x) * dpr, (h / 2 + pan.y) * dpr);
		ctx.rotate((transform.rotation * Math.PI) / 180);
		ctx.scale(transform.flipH ? -1 : 1, transform.flipV ? -1 : 1);
		ctx.scale(scale, scale);
		ctx.drawImage(
			frame.image,
			-frame.width / 2,
			-frame.height / 2,
			frame.width,
			frame.height,
		);
		ctx.restore();
	}, [
		frame,
		transform,
		backgroundMode,
		customColor,
		smoothing,
		pan,
		effectiveScale,
		getChecker,
	]);

	// Redraw whenever inputs change, and report the effective scale upward.
	useEffect(() => {
		draw();
		const s = effectiveScale();
		if (s !== lastReportedScale.current) {
			lastReportedScale.current = s;
			onScaleChange(s);
		}
	}, [draw, effectiveScale, onScaleChange]);

	// Track container size; redraw on resize.
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const ro = new ResizeObserver((entries) => {
			const rect = entries[0].contentRect;
			sizeRef.current = { w: rect.width, h: rect.height };
			draw();
			const s = effectiveScale();
			if (s !== lastReportedScale.current) {
				lastReportedScale.current = s;
				onScaleChange(s);
			}
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, [draw, effectiveScale, onScaleChange]);

	// Pointer drag to pan.
	const drag = useRef<{ x: number; y: number; pan: { x: number; y: number } } | null>(
		null,
	);
	const onPointerDown = (e: React.PointerEvent) => {
		(e.target as Element).setPointerCapture(e.pointerId);
		drag.current = { x: e.clientX, y: e.clientY, pan };
	};
	const onPointerMove = (e: React.PointerEvent) => {
		if (!drag.current) return;
		onPanChange({
			x: drag.current.pan.x + (e.clientX - drag.current.x),
			y: drag.current.pan.y + (e.clientY - drag.current.y),
		});
	};
	const onPointerUp = (e: React.PointerEvent) => {
		drag.current = null;
		try {
			(e.target as Element).releasePointerCapture(e.pointerId);
		} catch {
			/* pointer already released */
		}
	};

	// Wheel to zoom toward the cursor. Attached natively so we can prevent the
	// page from scrolling (React's onWheel is passive).
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const onWheel = (e: WheelEvent) => {
			e.preventDefault();
			const rect = canvas.getBoundingClientRect();
			const mx = e.clientX - rect.left;
			const my = e.clientY - rect.top;
			const current = effectiveScale();
			const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
			const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current * factor));
			const ratio = next / current;
			const { w, h } = sizeRef.current;
			const d = { x: mx - (w / 2 + pan.x), y: my - (h / 2 + pan.y) };
			onZoomAt(next, {
				x: pan.x + d.x * (1 - ratio),
				y: pan.y + d.y * (1 - ratio),
			});
		};
		canvas.addEventListener("wheel", onWheel, { passive: false });
		return () => canvas.removeEventListener("wheel", onWheel);
	}, [pan, effectiveScale, onZoomAt]);

	return (
		<div className="viewer" ref={containerRef}>
			<canvas
				ref={canvasRef}
				className="viewer-canvas"
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
			/>
		</div>
	);
}
