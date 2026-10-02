/**
 * Toolbar popup. It answers one question for the user: is this extension connected to the Nolo
 * Desktop app on this computer, and which protocol version are they on?
 *
 * Every string comes from `_locales` so the popup follows the browser language; the literals here are
 * only fallbacks for a missing key. The popup reads no page data and performs no actions.
 */
const t = (key, fallback) => chrome.i18n.getMessage(key) || fallback;

const dot = document.getElementById("dot");
const state = document.getElementById("state");
const hint = document.getElementById("hint");
const host = document.getElementById("host");
const protocol = document.getElementById("protocol");
const version = document.getElementById("version");

document.getElementById("title").textContent = t("extName", "Nolo Browser Connector");
document.getElementById("label-desktop-app").textContent = t("popupDesktopApp", "Desktop app");
document.getElementById("label-protocol").textContent = t("popupProtocol", "Protocol");
document.getElementById("label-extension").textContent = t("popupExtensionVersion", "Extension");
document.getElementById("privacy").textContent = t(
  "popupPrivacy",
  "Page reads and actions run through Nolo Desktop. Cookies, passwords and profile databases are never read.",
);
// Shown until the status round-trip answers, so the popup never renders an empty line.
state.textContent = t("popupChecking", "Checking…");

function renderDisconnected(reason) {
  dot.className = "dot off";
  state.textContent = t("popupDisconnected", "Not connected");
  hint.textContent = reason || t(
    "popupDisconnectedHint",
    "Open Nolo Desktop on this computer and enable the Chrome connector, then reopen this popup.",
  );
}

async function render() {
  try {
    const status = await chrome.runtime.sendMessage({ type: "connector_status" });
    version.textContent = status?.version ? `v${status.version}` : "—";
    host.textContent = status?.hostName || "—";
    protocol.textContent = status?.protocolVersion || "—";
    if (status?.connected) {
      dot.className = "dot ok";
      state.textContent = t("popupConnected", "Connected to Nolo Desktop");
      hint.textContent = t("popupConnectedHint", "Your desktop agent can work in the tabs you ask about.");
      return;
    }
    renderDisconnected();
  } catch (error) {
    renderDisconnected(chrome.i18n.getMessage("popupStatusError", [String(error?.message ?? error)]));
  }
}

void render();
