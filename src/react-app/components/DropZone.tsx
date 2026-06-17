// Empty-state panel shown before a sequence is loaded. Drag-and-drop itself is
// handled at the app root (so you can also drop to replace a loaded sequence);
// this component provides the instructions and the "browse" entry points.

import type { LoadProgress } from "../types";

interface DropZoneProps {
	isLoading: boolean;
	progress: LoadProgress;
	error: string | null;
	onBrowseFiles: () => void;
	onBrowseFolder: () => void;
}

export function DropZone({
	isLoading,
	progress,
	error,
	onBrowseFiles,
	onBrowseFolder,
}: DropZoneProps) {
	const pct =
		progress.total > 0
			? Math.round((progress.loaded / progress.total) * 100)
			: 0;

	return (
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
					<rect x="3" y="3" width="18" height="18" rx="2" />
					<circle cx="8.5" cy="8.5" r="1.5" />
					<path d="M21 15l-5-5L5 21" />
				</svg>

				{isLoading ? (
					<>
						<h2>Preparing frames…</h2>
						<div className="progress-bar">
							<div className="progress-fill" style={{ width: `${pct}%` }} />
						</div>
						<p className="dropzone-hint">
							{progress.loaded} / {progress.total} decoded
						</p>
					</>
				) : (
					<>
						<h2>Drop a PNG sequence here</h2>
						<p className="dropzone-hint">
							Drag a folder or multiple images onto the page. PNG, JPG, WebP and
							GIF are supported. Everything stays in your browser — nothing is
							uploaded.
						</p>
						<div className="dropzone-actions">
							<button className="btn btn-primary" onClick={onBrowseFiles}>
								Browse files
							</button>
							<button className="btn" onClick={onBrowseFolder}>
								Browse folder
							</button>
						</div>
						{error && <p className="dropzone-error">{error}</p>}
					</>
				)}
			</div>
		</div>
	);
}
