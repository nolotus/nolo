// Handoff channel for files dropped onto a conversation entry outside the
// dialog page (e.g. the space content list). The dialog's message input
// consumes staged files when it mounts for that dialog and turns them into
// regular composer attachments.
//
// File objects cannot go through route state or Redux (non-serializable), so
// this is an in-memory map keyed by dialog key. Entries are removed when
// consumed; a stale entry is harmless (it only affects the next mount of
// that dialog's composer).

const stagedFilesByDialog = new Map<string, File[]>();

export function stageFilesForDialog(dialogKey: string, files: File[]): void {
	if (!dialogKey || files.length === 0) return;
	const existing = stagedFilesByDialog.get(dialogKey);
	stagedFilesByDialog.set(
		dialogKey,
		existing ? [...existing, ...files] : [...files]
	);
}

export function takeStagedFilesForDialog(dialogKey: string): File[] {
	const files = stagedFilesByDialog.get(dialogKey);
	if (!files?.length) return [];
	stagedFilesByDialog.delete(dialogKey);
	return files;
}
