import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "DialogPage.tsx"),
  "utf8"
);

describe("DialogPage LiveVoicePanel wiring (source)", () => {
  it("imports the LiveVoicePanel component and the live-audio predicate", () => {
    expect(source).toContain('import { LiveVoicePanel } from "chat/web/LiveVoicePanel"');
    expect(source).toContain(
      'import { isLiveAudioOnlyAgent } from "ai/agent/isLiveAudioOnlyAgent"'
    );
  });

  it("resolves the live-audio agent key from primaryAgentKey or first agent in cybots", () => {
    expect(source).toContain("const liveAudioAgentKey = useMemo(");
    expect(source).toContain("config.primaryAgentKey");
    expect(source).toContain("config.cybots");
  });

  it("fetches the live-audio agent and computes isLiveAudioOnlyAgentDialog", () => {
    expect(source).toContain("useFetchData<Agent>(liveAudioAgentKey)");
    expect(source).toContain("isLiveAudioOnlyAgentDialog = useMemo(");
    expect(source).toContain("isLiveAudioOnlyAgent(liveAudioAgent)");
  });

  it("auto-opens the voice panel once per dialog when the agent is live-audio", () => {
    expect(source).toContain("const [isLiveVoicePanelOpen, setIsLiveVoicePanelOpen] = useState(false)");
    expect(source).toContain("liveAudioAutoOpenedDialogKeyRef = useRef<string | null>(null)");
    expect(source).toContain("setIsLiveVoicePanelOpen(true);");
  });

  it("renders LiveVoicePanel with agentId and dialogId when opened", () => {
    expect(source).toContain("<LiveVoicePanel");
    expect(source).toContain("agentId={liveAudioAgentKey}");
    expect(source).toContain("dialogId={liveVoiceDialogId}");
    expect(source).toContain("onClose={() => setIsLiveVoicePanelOpen(false)}");
  });
});