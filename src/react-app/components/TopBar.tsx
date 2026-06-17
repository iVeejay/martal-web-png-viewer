// Top toolbar: Martal branding on the left, file + zoom controls on the right.
// Zoom lives here to keep the viewer itself distraction-free.

interface TopBarProps {
	hasFrames: boolean;
	zoomPercent: number;
	onOpen: () => void;
	onClear: () => void;
	onFit: () => void;
	onActualSize: () => void;
	onZoom200: () => void;
	onZoomIn: () => void;
	onZoomOut: () => void;
}

export function TopBar({
	hasFrames,
	zoomPercent,
	onOpen,
	onClear,
	onFit,
	onActualSize,
	onZoom200,
	onZoomIn,
	onZoomOut,
}: TopBarProps) {
	return (
		<header className="topbar">
			<div className="brand">
				<img
					className="brand-logo"
					src="/Martal-logo-circle-500x500-web.png"
					alt="Martal Games"
				/>
				<div className="brand-text">
					<span className="brand-title">Sequence Viewer</span>
					<span className="brand-sub">Martal Games · Dev Tools</span>
				</div>
			</div>

			{hasFrames && (
				<div className="topbar-controls">
					<div className="btn-group" role="group" aria-label="Zoom">
						<button className="btn btn-sm" onClick={onFit} title="Fit to screen (F)">
							Fit
						</button>
						<button className="btn btn-sm" onClick={onActualSize} title="Actual size">
							100%
						</button>
						<button className="btn btn-sm" onClick={onZoom200} title="2× zoom">
							200%
						</button>
						<button
							className="btn btn-sm btn-icon"
							onClick={onZoomOut}
							title="Zoom out"
							aria-label="Zoom out"
						>
							−
						</button>
						<span className="zoom-readout" title="Current zoom">
							{zoomPercent}%
						</span>
						<button
							className="btn btn-sm btn-icon"
							onClick={onZoomIn}
							title="Zoom in"
							aria-label="Zoom in"
						>
							+
						</button>
					</div>

					<button className="btn btn-sm" onClick={onOpen} title="Open another sequence">
						Open
					</button>
					<button
						className="btn btn-sm btn-danger"
						onClick={onClear}
						title="Clear the loaded sequence"
					>
						Clear
					</button>
				</div>
			)}
		</header>
	);
}
