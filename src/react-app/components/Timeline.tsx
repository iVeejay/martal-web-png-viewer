// Bottom frame strip. Thumbnails reuse the frames' object URLs (already in
// memory) and are lazy-loaded, so even long sequences stay responsive. The
// active frame is highlighted and scrolled into view.

import { memo, useEffect, useRef } from "react";
import type { Frame } from "../types";

interface TimelineProps {
	frames: Frame[];
	currentIndex: number;
	pixelated: boolean;
	onSelect: (index: number) => void;
}

const Thumb = memo(function Thumb({
	frame,
	index,
	active,
	pixelated,
	onSelect,
}: {
	frame: Frame;
	index: number;
	active: boolean;
	pixelated: boolean;
	onSelect: (index: number) => void;
}) {
	return (
		<button
			className={`thumb ${active ? "active" : ""}`}
			onClick={() => onSelect(index)}
			title={frame.name}
			data-index={index}
		>
			<img
				className={pixelated ? "thumb-img pixelated" : "thumb-img"}
				src={frame.url}
				alt=""
				loading="lazy"
				draggable={false}
			/>
			<span className="thumb-index">{index + 1}</span>
		</button>
	);
});

export function Timeline({
	frames,
	currentIndex,
	pixelated,
	onSelect,
}: TimelineProps) {
	const stripRef = useRef<HTMLDivElement>(null);

	// Keep the active thumbnail visible as playback advances.
	useEffect(() => {
		const strip = stripRef.current;
		if (!strip) return;
		const el = strip.querySelector<HTMLElement>(
			`[data-index="${currentIndex}"]`,
		);
		el?.scrollIntoView({ block: "nearest", inline: "nearest" });
	}, [currentIndex]);

	return (
		<div className="timeline">
			<div className="timeline-strip" ref={stripRef}>
				{frames.map((frame, i) => (
					<Thumb
						key={frame.id}
						frame={frame}
						index={i}
						active={i === currentIndex}
						pixelated={pixelated}
						onSelect={onSelect}
					/>
				))}
			</div>
		</div>
	);
}
