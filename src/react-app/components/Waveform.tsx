// Waveform display with a draggable playhead. Peaks are downsampled once per
// buffer; the (cheap) redraw on each frame just repaints bars + playhead, so
// the played portion fills in as audio progresses.

import { useCallback, useEffect, useMemo, useRef } from "react";

interface WaveformProps {
	/** Buffer currently being played (normal or reversed). */
	buffer: AudioBuffer | null;
	currentTime: number;
	duration: number;
	onSeek: (t: number) => void;
}

const BUCKETS = 3000;

export function Waveform({ buffer, currentTime, duration, onSeek }: WaveformProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const sizeRef = useRef({ w: 0, h: 0 });

	// Downsampled absolute-peak amplitudes (0..1) for channel 0.
	const peaks = useMemo(() => {
		if (!buffer) return null;
		const data = buffer.getChannelData(0);
		const block = Math.max(1, Math.floor(data.length / BUCKETS));
		const arr = new Float32Array(BUCKETS);
		for (let i = 0; i < BUCKETS; i++) {
			let max = 0;
			const start = i * block;
			for (let j = 0; j < block; j++) {
				const v = Math.abs(data[start + j] || 0);
				if (v > max) max = v;
			}
			arr[i] = max;
		}
		return arr;
	}, [buffer]);

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

		ctx.clearRect(0, 0, dw, dh);
		const mid = dh / 2;
		const playX = duration > 0 ? (currentTime / duration) * dw : 0;

		if (!peaks) {
			// Flat baseline when there's no data.
			ctx.strokeStyle = "#2a2f39";
			ctx.beginPath();
			ctx.moveTo(0, mid);
			ctx.lineTo(dw, mid);
			ctx.stroke();
			return;
		}

		for (let x = 0; x < dw; x++) {
			const amp = peaks[Math.floor((x / dw) * peaks.length)] ?? 0;
			const barH = Math.max(1, amp * mid * 0.92);
			ctx.fillStyle = x <= playX ? "#e0a567" : "#41474f"; // played vs unplayed
			ctx.fillRect(x, mid - barH, 1, barH * 2);
		}

		// Playhead.
		ctx.fillStyle = "#e8682c";
		ctx.fillRect(Math.min(dw - 1, Math.max(0, playX)), 0, 2 * dpr, dh);
	}, [peaks, currentTime, duration]);

	useEffect(() => {
		draw();
	}, [draw]);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const ro = new ResizeObserver((entries) => {
			const rect = entries[0].contentRect;
			sizeRef.current = { w: rect.width, h: rect.height };
			draw();
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, [draw]);

	// Click / drag to scrub.
	const dragging = useRef(false);
	const seekFromEvent = useCallback(
		(clientX: number) => {
			const canvas = canvasRef.current;
			if (!canvas || duration <= 0) return;
			const rect = canvas.getBoundingClientRect();
			const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
			onSeek(frac * duration);
		},
		[duration, onSeek],
	);
	const onPointerDown = (e: React.PointerEvent) => {
		(e.target as Element).setPointerCapture(e.pointerId);
		dragging.current = true;
		seekFromEvent(e.clientX);
	};
	const onPointerMove = (e: React.PointerEvent) => {
		if (dragging.current) seekFromEvent(e.clientX);
	};
	const onPointerUp = (e: React.PointerEvent) => {
		dragging.current = false;
		try {
			(e.target as Element).releasePointerCapture(e.pointerId);
		} catch {
			/* already released */
		}
	};

	return (
		<div className="waveform" ref={containerRef}>
			<canvas
				ref={canvasRef}
				className="waveform-canvas"
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
			/>
		</div>
	);
}
