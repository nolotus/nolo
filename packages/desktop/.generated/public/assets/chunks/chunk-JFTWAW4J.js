// packages/app/localFirst/localFirstLog.ts
var PREFIX = "[localFirst]";
function localFirstLog(event, data) {
  const safeEvent = event.trim() || "unknown";
  if (data && Object.keys(data).length > 0) {
    try {
      console.info(PREFIX, safeEvent, JSON.stringify(data));
    } catch {
      console.info(PREFIX, safeEvent, data);
    }
    return;
  }
  console.info(PREFIX, safeEvent);
}

export {
  localFirstLog
};
