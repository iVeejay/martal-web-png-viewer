// Core domain types for the PNG sequence viewer.

/** A single decoded frame of the sequence. */
export interface Frame {
	/** Stable id (object URL works well as a unique key). */
	id: string;
	/** Original filename, e.g. "frame_10.png". */
	name: string;
	/** Relative path when dropped as a folder, else same as name. */
	path: string;
	/** Blob/object URL used by the <img> and canvas. Must be revoked on clear. */
	url: string;
	/** Decoded bitmap, ready to draw to canvas with no async cost. */
	image: HTMLImageElement;
	/** Natural pixel dimensions. */
	width: number;
	height: number;
	/** File size in bytes. */
	size: number;
}

/** Background rendering mode behind (possibly transparent) frames. */
export type BackgroundMode = "checker" | "dark" | "light" | "custom";

/** Image transform applied in the viewer and on export. */
export interface Transform {
	flipH: boolean;
	flipV: boolean;
	/** Rotation in degrees, normalised to 0 | 90 | 180 | 270. */
	rotation: number;
}

/** Loading progress while frames are being decoded. */
export interface LoadProgress {
	loaded: number;
	total: number;
}
