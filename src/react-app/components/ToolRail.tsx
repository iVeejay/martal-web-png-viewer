// Left activity rail: global Martal branding + tool switcher. New panel tools
// get a button here. Mirrors the dev-panel "activity bar" pattern.

export type ToolId = "sequence" | "audio";

interface ToolRailProps {
	active: ToolId;
	onSelect: (id: ToolId) => void;
}

const TOOLS: { id: ToolId; label: string; icon: React.ReactNode }[] = [
	{
		id: "sequence",
		label: "Sequence",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
				<rect x="3" y="4" width="18" height="14" rx="2" />
				<path d="M3 16l5-4 4 3 5-5 4 4" />
				<circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
			</svg>
		),
	},
	{
		id: "audio",
		label: "Audio",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
				<path d="M9 18V5l11-2v13" />
				<circle cx="6" cy="18" r="3" />
				<circle cx="17" cy="16" r="3" />
			</svg>
		),
	},
];

export function ToolRail({ active, onSelect }: ToolRailProps) {
	return (
		<nav className="rail" aria-label="Tools">
			<img
				className="rail-logo"
				src="/Martal-logo-circle-500x500-web.png"
				alt="Martal Games"
				title="Martal Games · Dev Tools"
			/>
			<div className="rail-tools">
				{TOOLS.map((t) => (
					<button
						key={t.id}
						className={`rail-btn ${active === t.id ? "active" : ""}`}
						onClick={() => onSelect(t.id)}
						title={t.label}
						aria-label={t.label}
						aria-current={active === t.id}
					>
						<span className="rail-icon">{t.icon}</span>
						<span className="rail-label">{t.label}</span>
					</button>
				))}
			</div>
		</nav>
	);
}
