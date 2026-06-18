// Audio tool — load audio files and play them back with loop, reverse and
// variable speed. Fully local: files are decoded in-browser, never uploaded.
// Kept mounted while another tool is active so loaded audio survives switches.

import { useCallback, useEffect, useRef, useState } from "react";

import { useAudio } from "../hooks/useAudio";
import { filesFromDrop, filesFromInput, isAudioFile } from "../utils/loadFiles";
import { formatBytes, formatTime } from "../utils/format";
import { Waveform } from "../components/Waveform";

const RATE_PRESETS = [0.5, 1, 1.5, 2];
const RATE_MIN = 0.25;
const RATE_MAX = 4;

function Icon({ name }: { name: "play" | "pause" | "stop" }) {
	const common = {
		width: 16,
		height: 16,
		viewBox: "0 0 16 16",
		fill: "currentColor",
		"aria-hidden": true,
	} as const;
	if (name === "play") return <svg {...common}><path d="M4 2.5v11l9-5.5z" /></svg>;
	if (name === "pause")
		return (
			<svg {...common}>
				<rect x="3.5" y="2.5" width="3" height="11" />
				<rect x="9.5" y="2.5" width="3" height="11" />
			</svg>
		);
	return <svg {...common}><rect x="3" y="3" width="10" height="10" /></svg>;
}

export function AudioTool({ active }: { active: boolean }) {
	const audio = useAudio();
	const {
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
		toggle,
		pause,
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
	} = audio;

	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const hasTracks = tracks.length > 0;

	// Pause when this tool is hidden behind another.
	useEffect(() => {
		if (!active && isPlaying) pause();
	}, [active, isPlaying, pause]);

	const openFiles = () => fileInputRef.current?.click();
	const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) load(filesFromInput(e.target.files, isAudioFile));
		e.target.value = "";
	};
	const onDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);
			load(await filesFromDrop(e.dataTransfer, isAudioFile));
		},
		[load],
	);
	const onDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		if (!isDragging) setIsDragging(true);
	};
	const onDragLeave = (e: React.DragEvent) => {
		if (e.relatedTarget === null) setIsDragging(false);
	};

	// Space toggles play while the audio tool is active.
	useEffect(() => {
		if (!active) return;
		const onKey = (e: KeyboardEvent) => {
			const t = e.target as HTMLElement | null;
			if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
			if (e.key === " " && hasTracks) {
				e.preventDefault();
				toggle();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [active, hasTracks, toggle]);

	const currentBuffer = activeTrack
		? reverse
			? activeTrack.reversed
			: activeTrack.buffer
		: null;

	const pct =
		progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;

	return (
		<div className="tool" onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}>
			<header className="topbar">
				<h1 className="tool-title">Audio</h1>
				{hasTracks && (
					<div className="topbar-controls">
						<button className="btn btn-sm" onClick={openFiles}>
							Open
						</button>
						<button className="btn btn-sm btn-danger" onClick={clear}>
							Clear
						</button>
					</div>
				)}
			</header>

			<div className="main">
				<div className="stage">
					{hasTracks ? (
						<div className="audio-stage">
							<div className="audio-now">
								<span className="audio-name" title={activeTrack?.name}>
									{activeTrack?.name ?? "—"}
								</span>
								<span className="audio-time">
									{formatTime(currentTime)} / {formatTime(duration)}
								</span>
							</div>

							<Waveform
								buffer={currentBuffer}
								currentTime={currentTime}
								duration={duration}
								onSeek={seek}
							/>

							<div className="audio-transport">
								<button
									className="btn btn-icon btn-primary play-btn"
									onClick={toggle}
									aria-label={isPlaying ? "Pause" : "Play"}
									title="Play / Pause (Space)"
								>
									<Icon name={isPlaying ? "pause" : "play"} />
								</button>
								<button
									className="btn btn-icon"
									onClick={stop}
									aria-label="Stop"
									title="Stop"
								>
									<Icon name="stop" />
								</button>
							</div>

							{/* Loaded tracks */}
							<div className="track-list">
								{tracks.map((t) => (
									<button
										key={t.id}
										className={`track-item ${t.id === activeId ? "active" : ""}`}
										onClick={() => setActive(t.id)}
										title={t.name}
									>
										<span className="track-name">{t.name}</span>
										<span className="track-dur">{formatTime(t.duration)}</span>
									</button>
								))}
							</div>
						</div>
					) : (
						<div className="dropzone">
							<div className="dropzone-inner">
								<svg
									className="dropzone-icon"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
									aria-hidden="true"
								>
									<path d="M9 18V5l12-2v13" />
									<circle cx="6" cy="18" r="3" />
									<circle cx="18" cy="16" r="3" />
								</svg>
								{isLoading ? (
									<>
										<h2>Decoding audio…</h2>
										<div className="progress-bar">
											<div className="progress-fill" style={{ width: `${pct}%` }} />
										</div>
										<p className="dropzone-hint">
											{progress.loaded} / {progress.total} decoded
										</p>
									</>
								) : (
									<>
										<h2>Drop audio files here</h2>
										<p className="dropzone-hint">
											MP3, WAV, OGG, FLAC, M4A and more. Loop, reverse and change
											speed. Everything stays in your browser — nothing is
											uploaded.
										</p>
										<div className="dropzone-actions">
											<button className="btn btn-primary" onClick={openFiles}>
												Browse files
											</button>
										</div>
										{error && <p className="dropzone-error">{error}</p>}
									</>
								)}
							</div>
						</div>
					)}
				</div>

				{hasTracks && (
					<aside className="panel">
						<section className="panel-section">
							<h3 className="panel-heading">Playback</h3>
							<div className="toggle-row">
								<button
									className="btn btn-primary"
									style={{ flex: 1 }}
									onClick={toggle}
								>
									{isPlaying ? "Pause" : "Play"}
								</button>
								<button className="btn" onClick={stop}>
									Stop
								</button>
							</div>
						</section>

						<section className="panel-section">
							<h3 className="panel-heading">Speed</h3>
							<div className="field">
								<div className="fps-control">
									<input
										type="range"
										min={RATE_MIN}
										max={RATE_MAX}
										step={0.05}
										value={rate}
										onChange={(e) => setRate(Number(e.target.value))}
									/>
									<input
										type="number"
										min={RATE_MIN}
										max={RATE_MAX}
										step={0.05}
										value={rate}
										onChange={(e) =>
											setRate(
												Math.max(
													RATE_MIN,
													Math.min(RATE_MAX, Number(e.target.value) || 1),
												),
											)
										}
									/>
								</div>
								<div className="rate-presets">
									{RATE_PRESETS.map((r) => (
										<button
											key={r}
											className={`btn btn-sm ${rate === r ? "active toggle" : ""}`}
											onClick={() => setRate(r)}
										>
											{r}×
										</button>
									))}
								</div>
							</div>
						</section>

						<section className="panel-section">
							<h3 className="panel-heading">Options</h3>
							<div className="toggle-row">
								<button
									className={`btn toggle ${loop ? "active" : ""}`}
									onClick={() => setLoop(!loop)}
									aria-pressed={loop}
								>
									Loop
								</button>
								<button
									className={`btn toggle ${reverse ? "active" : ""}`}
									onClick={() => setReverse(!reverse)}
									aria-pressed={reverse}
									title="Play the audio backwards"
								>
									Reverse
								</button>
							</div>
						</section>

						<section className="panel-section">
							<h3 className="panel-heading">Track Info</h3>
							<div className="info-row">
								<span className="info-label">Tracks</span>
								<span className="info-value">{tracks.length}</span>
							</div>
							<div className="info-row">
								<span className="info-label">Duration</span>
								<span className="info-value">{formatTime(duration)}</span>
							</div>
							<div className="info-row">
								<span className="info-label">Sample rate</span>
								<span className="info-value">
									{activeTrack ? `${(activeTrack.buffer.sampleRate / 1000).toFixed(1)} kHz` : "—"}
								</span>
							</div>
							<div className="info-row">
								<span className="info-label">Channels</span>
								<span className="info-value">
									{activeTrack?.buffer.numberOfChannels ?? "—"}
								</span>
							</div>
							<div className="info-row">
								<span className="info-label">File size</span>
								<span className="info-value">
									{activeTrack ? formatBytes(activeTrack.size) : "—"}
								</span>
							</div>
						</section>
					</aside>
				)}
			</div>

			<input
				ref={fileInputRef}
				type="file"
				accept="audio/*"
				multiple
				hidden
				onChange={onFileInput}
			/>

			{isDragging && (
				<div className="drag-overlay">
					<div className="drag-overlay-box">Drop to load audio</div>
				</div>
			)}
		</div>
	);
}
