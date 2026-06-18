// dev.martal.ir — Martal Games developer-tools panel.
//
// A left rail switches between tools; each tool is self-contained and stays
// mounted (hidden) when inactive so its loaded media survives tab switches.
// Everything runs locally in the browser — no uploads.

import { useState } from "react";
import "./App.css";

import { ToolRail, type ToolId } from "./components/ToolRail";
import { SequenceTool } from "./tools/SequenceTool";
import { AudioTool } from "./tools/AudioTool";

function App() {
	const [tool, setTool] = useState<ToolId>("sequence");

	return (
		<div className="app">
			<ToolRail active={tool} onSelect={setTool} />

			<div className="tool-host">
				<div className="tool-pane" hidden={tool !== "sequence"}>
					<SequenceTool active={tool === "sequence"} />
				</div>
				<div className="tool-pane" hidden={tool !== "audio"}>
					<AudioTool active={tool === "audio"} />
				</div>
			</div>
		</div>
	);
}

export default App;
