/**
 * Toolbar popup. It answers one question for the user: is this extension connected to the Nolo
 * Desktop app on this computer, and which protocol version are they on?
 *
 * It reads no page data and performs no actions.
 */
const dot = document.getElementById("dot");
const state = document.getElementById("state");
const hint = document.getElementById("hint");
const host = document.getElementById("host");
const protocol = document.getElementById("protocol");
const version = document.getElementById("version");

function renderDisconnected(reason) {
  dot.className = "dot off";
  state.textContent = "Not connected";
  hint.textContent =
    reason ||
    "Open Nolo Desktop on this computer and enable the Chrome connector, then reopen this popup.";
}

async function render() {
  try {
    const status = await chrome.runtime.sendMessage({ type: "connector_status" });
    version.textContent = status?.version ? `v${status.version}` : "—";
    host.textContent = status?.hostName || "—";
    protocol.textContent = status?.protocolVersion || "—";
    if (status?.connected) {
      dot.className = "dot ok";
      state.textContent = "Connected to Nolo Desktop";
      hint.textContent = "Your desktop agent can work in the tabs you ask about.";
      return;
    }
    renderDisconnected();
  } catch (error) {
    renderDisconnected(`Could not read connector status: ${error?.message ?? error}`);
  }
}

void render();
