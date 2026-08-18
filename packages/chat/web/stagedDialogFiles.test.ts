import { describe, expect, it } from "bun:test";
import {
	stageFilesForDialog,
	takeStagedFilesForDialog,
} from "./stagedDialogFiles";

const makeFile = (name: string) => new File(["x"], name, { type: "text/plain" });

describe("stagedDialogFiles", () => {
	it("returns files staged for a dialog exactly once", () => {
		const key = `dialog-test-${Date.now()}-once`;
		stageFilesForDialog(key, [makeFile("a.txt")]);

		const taken = takeStagedFilesForDialog(key);
		expect(taken.map((f) => f.name)).toEqual(["a.txt"]);
		// consumed: second take is empty
		expect(takeStagedFilesForDialog(key)).toEqual([]);
	});

	it("appends repeated drops for the same dialog and isolates keys", () => {
		const keyA = `dialog-test-${Date.now()}-a`;
		const keyB = `dialog-test-${Date.now()}-b`;
		stageFilesForDialog(keyA, [makeFile("1.txt")]);
		stageFilesForDialog(keyA, [makeFile("2.txt")]);
		stageFilesForDialog(keyB, [makeFile("other.txt")]);

		expect(takeStagedFilesForDialog(keyA).map((f) => f.name)).toEqual([
			"1.txt",
			"2.txt",
		]);
		expect(takeStagedFilesForDialog(keyB).map((f) => f.name)).toEqual([
			"other.txt",
		]);
	});

	it("ignores empty staging and unknown keys", () => {
		const key = `dialog-test-${Date.now()}-empty`;
		stageFilesForDialog(key, []);
		stageFilesForDialog("", [makeFile("ignored.txt")]);
		expect(takeStagedFilesForDialog(key)).toEqual([]);
		expect(takeStagedFilesForDialog("dialog-test-unknown")).toEqual([]);
	});
});
