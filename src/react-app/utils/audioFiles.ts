// Decode dropped/selected audio files into in-memory AudioTracks.
//
// Audio is decoded with the Web Audio API (not <audio> elements) because the
// "reverse" feature needs raw sample access — you can't play an <audio> tag
// backwards. We precompute a reversed copy of each buffer up front so toggling
// reverse during playback is instant.

import type { AudioTrack, LoadProgress } from "../types";
import { naturalSortBy } from "./naturalSort";

/** Return a new AudioBuffer with every channel's samples reversed. */
function reverseBuffer(ctx: BaseAudioContext, buffer: AudioBuffer): AudioBuffer {
	const reversed = ctx.createBuffer(
		buffer.numberOfChannels,
		buffer.length,
		buffer.sampleRate,
	);
	for (let c = 0; c < buffer.numberOfChannels; c++) {
		const src = buffer.getChannelData(c);
		const dst = reversed.getChannelData(c);
		for (let i = 0, j = buffer.length - 1; i < buffer.length; i++, j--) {
			dst[i] = src[j];
		}
	}
	return reversed;
}

/**
 * Decode audio files into tracks, naturally sorted by name.
 * @param onProgress called as each file finishes decoding.
 */
export async function buildTracks(
	ctx: AudioContext,
	files: { file: File; path: string }[],
	onProgress?: (p: LoadProgress) => void,
): Promise<AudioTrack[]> {
	const sorted = naturalSortBy(files, (f) => f.path);
	const total = sorted.length;
	let loaded = 0;

	const tracks = await Promise.all(
		sorted.map(async ({ file }) => {
			try {
				const data = await file.arrayBuffer();
				// decodeAudioData wants its own copy of the ArrayBuffer.
				const buffer = await ctx.decodeAudioData(data);
				const track: AudioTrack = {
					id: `${file.name}-${file.size}-${file.lastModified}`,
					name: file.name,
					buffer,
					reversed: reverseBuffer(ctx, buffer),
					duration: buffer.duration,
					size: file.size,
				};
				return track;
			} catch {
				return null; // skip files that can't be decoded
			} finally {
				loaded++;
				onProgress?.({ loaded, total });
			}
		}),
	);

	return tracks.filter((t): t is AudioTrack => t !== null);
}
