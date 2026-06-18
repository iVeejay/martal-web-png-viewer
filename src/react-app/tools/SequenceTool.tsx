// PNG Sequence tool — a local, browser-only animation preview for game artists.
// All sequence state lives here; nothing is uploaded. Kept mounted while the
// panel is on another tool so the loaded sequence survives tab switches.

import { useCallback, useEffect, useRef, useState } from "react";

import { ControlPanel } from "../components/ControlPanel";
import { DropZone } from "../components/DropZone";
import { Timeline } from "../components/Timeline";
import { TopBar } from "../components/TopBar";
import { MAX_SCALE, MIN_SCALE, Viewer } from "../components/Viewer";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { usePlayback } from "../hooks/usePlayback";
import { useSequence } from "../hooks/useSequence";
import type { BackgroundMode } from "../types";
import { filesFromDrop, filesFromInput } from "../utils/loadFiles";
import { formatBytes, formatDuration } from "../utils/format";

export function SequenceTool({ active }: { active: boolean }) {
	const { frames, isLoading, progress, error, load, clear } = useSequence();

	// --- Playback state ---
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [fps, setFps] = useState(12);
	const [reverse, setReverse] = useState(false);
	const [loop, setLoop] = useState(true);
	const [pingPong, setPingPong] = useState(false);

	// --- Transform state ---
	const [flipH, setFlipH] = useState(false);
	const [flipV, setFlipV] = useState(false);
	const [rotation, setRotation] = useState(0);

	// --- View state ---
	const [zoom, setZoom] = useState(1);
	const [fitMode, setFitMode] = useState(true);
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const [smoothing, setSmoothing] = useState(false); // pixel-art by default
	const [displayScale, setDisplayScale] = useState(1);

	// --- Background state ---
	const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>("checker");
	const [customColor, setCustomColor] = useState("#1e2230");

	// --- Misc UI state ---
	const [isDragging, setIsDragging] = useState(false);
	const [copied, setCopied] = useState(false);

	const fileInputRef = useRef<HTMLInputElement>(null);
	const folderInputRef = useRef<HTMLInputElement>(null);
	const hasFrames = frames.length > 0;

	// Enable folder selection on the folder input (not in the TS DOM types).
	useEffect(() => {
		const el = folderInputRef.current;
		if (el) {
			el.setAttribute("webkitdirectory", "");
			el.setAttribute("directory", "");
		}
	}, []);

	// Reset view + playback for a freshly loaded (or cleared) sequence.
	const resetForSequence = useCallback((count: number) => {
		setCurrentIndex(0);
		setPan({ x: 0, y: 0 });
		setFitMode(true);
		setIsPlaying(count > 1); // auto-play multi-frame sequences
	}, []);

	const handleLoad = useCallback(
		async (files: { file: File; path: string }[]) => {
			const next = await load(files);
			if (next.length > 0) resetForSequence(next.length);
		},
		[load, resetForSequence],
	);

	const handleClear = useCallback(() => {
		clear();
		resetForSequence(0);
	}, [clear, resetForSequence]);

	// --- Playback engine (only runs while this tool is active) ---
	usePlayback({
		frameCount: frames.length,
		fps,
		isPlaying: isPlaying && active,
		reverse,
		loop,
		pingPong,
		setIndex: setCurrentIndex,
		onEnd: () => setIsPlaying(false),
	});

	// --- File loading ---
	const openFiles = () => fileInputRef.current?.click();
	const openFolder = () => folderInputRef.current?.click();

	const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) handleLoad(filesFromInput(e.target.files));
		e.target.value = ""; // allow re-selecting the same files
	};

	const onDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);
			const files = await filesFromDrop(e.dataTransfer);
			handleLoad(files);
		},
		[handleLoad],
	);

	const onDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		if (!isDragging) setIsDragging(true);
	};
	const onDragLeave = (e: React.DragEvent) => {
		// Only clear when leaving the window, not when moving between children.
		if (e.relatedTarget === null) setIsDragging(false);
	};

	// --- Frame navigation ---
	const wrap = useCallback(
		(i: number) => (frames.length ? (i + frames.length) % frames.length : 0),
		[frames.length],
	);
	const prevFrame = useCallback(() => {
		setIsPlaying(false);
		setCurrentIndex((i) => wrap(i - 1));
	}, [wrap]);
	const nextFrame = useCallback(() => {
		setIsPlaying(false);
		setCurrentIndex((i) => wrap(i + 1));
	}, [wrap]);
	const stop = useCallback(() => {
		setIsPlaying(false);
		setCurrentIndex(0);
	}, []);
	const togglePlay = useCallback(() => {
		if (frames.length > 1) setIsPlaying((p) => !p);
	}, [frames.length]);
	const selectFrame = useCallback((i: number) => {
		setIsPlaying(false);
		setCurrentIndex(i);
	}, []);

	// --- Transform handlers ---
	const toggleFlipH = useCallback(() => setFlipH((v) => !v), []);
	const toggleFlipV = useCallback(() => setFlipV((v) => !v), []);
	const rotateCW = () => setRotation((r) => (r + 90) % 360);
	const rotateCCW = () => setRotation((r) => (r + 270) % 360);

	// --- Zoom handlers ---
	const fit = useCallback(() => {
		setFitMode(true);
		setPan({ x: 0, y: 0 });
	}, []);
	const actualSize = () => {
		setFitMode(false);
		setZoom(1);
		setPan({ x: 0, y: 0 });
	};
	const zoom200 = () => {
		setFitMode(false);
		setZoom(2);
		setPan({ x: 0, y: 0 });
	};
	const zoomBy = (factor: number) => {
		setFitMode(false);
		setZoom(Math.min(MAX_SCALE, Math.max(MIN_SCALE, displayScale * factor)));
	};
	const onZoomAt = useCallback(
		(scale: number, newPan: { x: number; y: number }) => {
			setFitMode(false);
			setZoom(scale);
			setPan(newPan);
		},
		[],
	);

	// --- Utilities ---
	const infoText = useCallback(() => {
		const first = frames[0];
		const dims = first ? `${first.width} × ${first.height}` : "—";
		return [
			"Martal Sequence Viewer",
			`Frames: ${frames.length}`,
			`Image size: ${dims}`,
			`FPS: ${fps}`,
			`Duration: ${formatDuration(frames.length, fps)}`,
			`Total size: ${formatBytes(frames.reduce((s, f) => s + f.size, 0))}`,
			`First file: ${frames[0]?.name ?? "—"}`,
			`Last file: ${frames[frames.length - 1]?.name ?? "—"}`,
		].join("\n");
	}, [frames, fps]);

	const copyInfo = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(infoText());
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			/* clipboard unavailable */
		}
	}, [infoText]);

	// Export the current frame as a PNG with flip/rotation baked in.
	const exportPng = useCallback(() => {
		const frame = frames[currentIndex];
		if (!frame) return;
		const swap = rotation === 90 || rotation === 270;
		const cw = swap ? frame.height : frame.width;
		const ch = swap ? frame.width : frame.height;
		const canvas = document.createElement("canvas");
		canvas.width = cw;
		canvas.height = ch;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.imageSmoothingEnabled = smoothing;
		ctx.translate(cw / 2, ch / 2);
		ctx.rotate((rotation * Math.PI) / 180);
		ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
		ctx.drawImage(
			frame.image,
			-frame.width / 2,
			-frame.height / 2,
			frame.width,
			frame.height,
		);
		canvas.toBlob((blob) => {
			if (!blob) return;
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = frame.name.replace(/\.[^.]+$/, "") + "_export.png";
			a.click();
			URL.revokeObjectURL(url);
		}, "image/png");
	}, [frames, currentIndex, rotation, flipH, flipV, smoothing]);

	// --- Keyboard shortcuts (only while this tool is active) ---
	useKeyboardShortcuts(
		{
			togglePlay,
			prevFrame,
			nextFrame,
			toggleReverse: () => setReverse((v) => !v),
			fit,
			flipH: toggleFlipH,
			flipV: toggleFlipV,
		},
		active,
	);

	const zoomPercent = Math.round(displayScale * 100);
	// Guard the index against the brief gap between loading a new sequence and
	// the reset taking effect.
	const safeIndex = frames.length
		? Math.min(currentIndex, frames.length - 1)
		: 0;

	return (
		<div
			className="tool"
			onDrop={onDrop}
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
		>
			<TopBar
				title="PNG Sequence"
				hasFrames={hasFrames}
				zoomPercent={zoomPercent}
				onOpen={openFiles}
				onClear={handleClear}
				onFit={fit}
				onActualSize={actualSize}
				onZoom200={zoom200}
				onZoomIn={() => zoomBy(1.25)}
				onZoomOut={() => zoomBy(1 / 1.25)}
			/>

			<div className="main">
				<div className="stage">
					{hasFrames ? (
						<Viewer
							frame={frames[safeIndex] ?? null}
							transform={{ flipH, flipV, rotation }}
							backgroundMode={backgroundMode}
							customColor={customColor}
							smoothing={smoothing}
							zoom={zoom}
							fitMode={fitMode}
							pan={pan}
							onPanChange={setPan}
							onZoomAt={onZoomAt}
							onScaleChange={setDisplayScale}
						/>
					) : (
						<DropZone
							isLoading={isLoading}
							progress={progress}
							error={error}
							onBrowseFiles={openFiles}
							onBrowseFolder={openFolder}
						/>
					)}

					{hasFrames && (
						<Timeline
							frames={frames}
							currentIndex={safeIndex}
							pixelated={!smoothing}
							onSelect={selectFrame}
						/>
					)}
				</div>

				{hasFrames && (
					<ControlPanel
						frames={frames}
						currentIndex={safeIndex}
						isPlaying={isPlaying}
						fps={fps}
						reverse={reverse}
						loop={loop}
						pingPong={pingPong}
						onTogglePlay={togglePlay}
						onStop={stop}
						onPrev={prevFrame}
						onNext={nextFrame}
						onFpsChange={setFps}
						onToggleReverse={() => setReverse((v) => !v)}
						onToggleLoop={() => setLoop((v) => !v)}
						onTogglePingPong={() => setPingPong((v) => !v)}
						flipH={flipH}
						flipV={flipV}
						rotation={rotation}
						onToggleFlipH={toggleFlipH}
						onToggleFlipV={toggleFlipV}
						onRotateCW={rotateCW}
						onRotateCCW={rotateCCW}
						backgroundMode={backgroundMode}
						customColor={customColor}
						smoothing={smoothing}
						onBackgroundModeChange={setBackgroundMode}
						onCustomColorChange={setCustomColor}
						onToggleSmoothing={() => setSmoothing((v) => !v)}
						onCopyInfo={copyInfo}
						onExportPng={exportPng}
						copied={copied}
					/>
				)}
			</div>

			{/* Hidden inputs that back the "browse" buttons. */}
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				multiple
				hidden
				onChange={onFileInput}
			/>
			<input ref={folderInputRef} type="file" hidden onChange={onFileInput} />

			{/* Drag overlay shown while a drag is over the window. */}
			{isDragging && (
				<div className="drag-overlay">
					<div className="drag-overlay-box">Drop to load sequence</div>
				</div>
			)}
		</div>
	);
}
