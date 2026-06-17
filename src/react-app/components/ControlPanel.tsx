// Right-side control panel, organised into sections:
//   Playback · Transform · View · Sequence Info · Utilities

import type { ReactNode } from "react";
import type { BackgroundMode, Frame } from "../types";
import { formatBytes, formatDuration } from "../utils/format";

interface ControlPanelProps {
	// Playback
	frames: Frame[];
	currentIndex: number;
	isPlaying: boolean;
	fps: number;
	reverse: boolean;
	loop: boolean;
	pingPong: boolean;
	onTogglePlay: () => void;
	onStop: () => void;
	onPrev: () => void;
	onNext: () => void;
	onFpsChange: (fps: number) => void;
	onToggleReverse: () => void;
	onToggleLoop: () => void;
	onTogglePingPong: () => void;
	// Transform
	flipH: boolean;
	flipV: boolean;
	rotation: number;
	onToggleFlipH: () => void;
	onToggleFlipV: () => void;
	onRotateCW: () => void;
	onRotateCCW: () => void;
	// View
	backgroundMode: BackgroundMode;
	customColor: string;
	smoothing: boolean;
	onBackgroundModeChange: (mode: BackgroundMode) => void;
	onCustomColorChange: (color: string) => void;
	onToggleSmoothing: () => void;
	// Utilities
	onCopyInfo: () => void;
	onExportPng: () => void;
	copied: boolean;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="panel-section">
			<h3 className="panel-heading">{title}</h3>
			{children}
		</section>
	);
}

/** A labelled on/off toggle button. */
function Toggle({
	label,
	active,
	onClick,
	title,
}: {
	label: string;
	active: boolean;
	onClick: () => void;
	title?: string;
}) {
	return (
		<button
			className={`btn toggle ${active ? "active" : ""}`}
			onClick={onClick}
			aria-pressed={active}
			title={title}
		>
			{label}
		</button>
	);
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
	return (
		<div className="info-row">
			<span className="info-label">{label}</span>
			<span className="info-value">{value}</span>
		</div>
	);
}

export function ControlPanel(props: ControlPanelProps) {
	const {
		frames,
		currentIndex,
		isPlaying,
		fps,
		reverse,
		loop,
		pingPong,
		flipH,
		flipV,
		rotation,
		backgroundMode,
		customColor,
		smoothing,
		copied,
	} = props;

	const total = frames.length;
	const current = frames[currentIndex] ?? null;
	// Use the largest frame as the reported sequence size (sprites can vary).
	const dims = current ? `${current.width} × ${current.height}` : "—";

	return (
		<aside className="panel">
			{/* ---------------- Playback ---------------- */}
			<Section title="Playback">
				<div className="frame-readout">
					<span className="frame-counter">
						Frame {total ? currentIndex + 1 : 0} / {total}
					</span>
					<span className="frame-name" title={current?.name}>
						{current?.name ?? "—"}
					</span>
				</div>

				<div className="transport">
					<button
						className="btn btn-icon"
						onClick={props.onPrev}
						title="Previous frame (←)"
						aria-label="Previous frame"
					>
						<Icon name="prev" />
					</button>
					<button
						className="btn btn-icon btn-primary play-btn"
						onClick={props.onTogglePlay}
						title="Play / Pause (Space)"
						aria-label={isPlaying ? "Pause" : "Play"}
					>
						<Icon name={isPlaying ? "pause" : "play"} />
					</button>
					<button
						className="btn btn-icon"
						onClick={props.onStop}
						title="Stop"
						aria-label="Stop"
					>
						<Icon name="stop" />
					</button>
					<button
						className="btn btn-icon"
						onClick={props.onNext}
						title="Next frame (→)"
						aria-label="Next frame"
					>
						<Icon name="next" />
					</button>
				</div>

				<div className="field">
					<label className="field-label" htmlFor="fps-input">
						Frames per second
					</label>
					<div className="fps-control">
						<input
							id="fps-input"
							type="range"
							min={1}
							max={60}
							value={Math.min(60, fps)}
							onChange={(e) => props.onFpsChange(Number(e.target.value))}
						/>
						<input
							type="number"
							min={1}
							max={240}
							value={fps}
							onChange={(e) =>
								props.onFpsChange(
									Math.max(1, Math.min(240, Number(e.target.value) || 1)),
								)
							}
						/>
					</div>
				</div>

				<div className="toggle-row">
					<Toggle
						label="Reverse"
						active={reverse}
						onClick={props.onToggleReverse}
						title="Reverse playback (R)"
					/>
					<Toggle label="Loop" active={loop} onClick={props.onToggleLoop} />
					<Toggle
						label="Ping-pong"
						active={pingPong}
						onClick={props.onTogglePingPong}
						title="Bounce back and forth"
					/>
				</div>
			</Section>

			{/* ---------------- Transform ---------------- */}
			<Section title="Transform">
				<div className="toggle-row">
					<Toggle
						label="Flip H"
						active={flipH}
						onClick={props.onToggleFlipH}
						title="Flip horizontal (H)"
					/>
					<Toggle
						label="Flip V"
						active={flipV}
						onClick={props.onToggleFlipV}
						title="Flip vertical (V)"
					/>
				</div>
				<div className="toggle-row">
					<button className="btn" onClick={props.onRotateCCW} title="Rotate left">
						⟲ 90°
					</button>
					<button className="btn" onClick={props.onRotateCW} title="Rotate right">
						⟳ 90°
					</button>
					<span className="rotation-readout">{rotation}°</span>
				</div>
			</Section>

			{/* ---------------- View ---------------- */}
			<Section title="View">
				<div className="field">
					<span className="field-label">Background</span>
					<div className="bg-options">
						{(["checker", "dark", "light", "custom"] as BackgroundMode[]).map(
							(mode) => (
								<button
									key={mode}
									className={`bg-swatch bg-${mode} ${
										backgroundMode === mode ? "active" : ""
									}`}
									onClick={() => props.onBackgroundModeChange(mode)}
									title={mode}
									aria-label={`${mode} background`}
									aria-pressed={backgroundMode === mode}
								>
									{mode === "custom" && (
										<span
											className="bg-custom-preview"
											style={{ background: customColor }}
										/>
									)}
								</button>
							),
						)}
					</div>
					{backgroundMode === "custom" && (
						<input
							type="color"
							className="color-input"
							value={customColor}
							onChange={(e) => props.onCustomColorChange(e.target.value)}
						/>
					)}
				</div>

				<div className="toggle-row">
					<Toggle
						label={smoothing ? "Smooth" : "Pixelated"}
						active={!smoothing}
						onClick={props.onToggleSmoothing}
						title="Toggle pixel-art (nearest-neighbour) rendering"
					/>
				</div>
			</Section>

			{/* ---------------- Sequence Info ---------------- */}
			<Section title="Sequence Info">
				<InfoRow label="Total frames" value={total} />
				<InfoRow label="Image size" value={dims} />
				<InfoRow label="FPS" value={fps} />
				<InfoRow label="Duration" value={formatDuration(total, fps)} />
				<InfoRow
					label="Frame size"
					value={current ? formatBytes(current.size) : "—"}
				/>
			</Section>

			{/* ---------------- Utilities ---------------- */}
			<Section title="Utilities">
				<div className="util-actions">
					<button className="btn" onClick={props.onCopyInfo}>
						{copied ? "Copied!" : "Copy info"}
					</button>
					<button className="btn" onClick={props.onExportPng}>
						Export frame
					</button>
				</div>
			</Section>
		</aside>
	);
}

/** Minimal inline transport icons. */
function Icon({ name }: { name: "play" | "pause" | "stop" | "prev" | "next" }) {
	const common = {
		width: 16,
		height: 16,
		viewBox: "0 0 16 16",
		fill: "currentColor",
		"aria-hidden": true,
	} as const;
	switch (name) {
		case "play":
			return (
				<svg {...common}>
					<path d="M4 2.5v11l9-5.5z" />
				</svg>
			);
		case "pause":
			return (
				<svg {...common}>
					<rect x="3.5" y="2.5" width="3" height="11" />
					<rect x="9.5" y="2.5" width="3" height="11" />
				</svg>
			);
		case "stop":
			return (
				<svg {...common}>
					<rect x="3" y="3" width="10" height="10" />
				</svg>
			);
		case "prev":
			return (
				<svg {...common}>
					<path d="M11 2.5v11l-7-5.5z" />
					<rect x="3" y="2.5" width="2" height="11" />
				</svg>
			);
		case "next":
			return (
				<svg {...common}>
					<path d="M5 2.5v11l7-5.5z" />
					<rect x="11" y="2.5" width="2" height="11" />
				</svg>
			);
	}
}
