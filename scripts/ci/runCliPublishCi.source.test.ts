/**
 * CLI 发布流水线的沉默失败模式。
 *
 * publish_or_update_dist_tag 原本在「版本已发布」时只把 dist-tag 重新指一遍
 * 然后 return 0：job 全绿、npm 上什么都没变、没人知道这次推送没产出版本。
 * 实测代价（2026-07-27）：dist-tags 停在 2026-07-21 的 0.1.57 整整六天，
 * 期间每次 push alpha/main 都"发布成功"。
 *
 * 这里锁定两件事：版本没 bump 时必须以非零退出，且两处版本号保持一致
 * （package.json 与 cliDownloads.ts，由 validate_cli_version_alignment 校验）。
 */
import { describe, expect, it } from "bun:test";

const publishScript = await Bun.file("scripts/ci/runCliPublishCi.sh").text();
const cliPkg = await Bun.file("packages/cli/package.json").json();
const downloads = await Bun.file("packages/app/constants/cliDownloads.ts").text();

describe("runCliPublishCi source contract", () => {
  it("says clearly when a push produced no new version, without failing the job", () => {
    const branch = /if \[\[ "\$published" == "1" \]\]; then([\s\S]*?)\n  fi/.exec(
      publishScript,
    )?.[1];
    expect(branch).toBeTruthy();
    // 必须把「本次没产出新版本」明说出来（stderr 两行，含该去 bump 哪两个文件）。
    expect(branch).toContain("本次推送不产出新版本");
    expect(branch).toContain("要发版请先 bump");
    // 但不失败：main 推送大量与 CLI 发布无关，全红会把信号训练成噪音。
    expect(branch).not.toContain("return 1");
    // 只有「dist-tag 已指向该版本」才算无产出；指向别的版本是合法的渠道提升。
    expect(branch).toContain('if [[ "$current_tag_version" == "$version" ]]');
    expect(branch).toContain("dist-tag add");
  });

  it("still allows promoting an already-published version to another dist-tag", () => {
    // alpha 先发 0.1.58、main 再把 latest 指过来，是正常发布流程，不能误判成无产出。
    expect(publishScript).toContain("promoting nolo-cli@$version to dist-tag");
  });

  it("waits through npm package processing before declaring dist-tag failure", () => {
    expect(publishScript).toContain(
      'NOLO_CLI_PUBLISH_TAG_VERIFY_ATTEMPTS:-180',
    );
    expect(publishScript).toContain('seq 1 "$max_attempts"');
  });

  it("keeps the two version sources aligned", () => {
    const declared = /NOLO_CLI_VERSION = "([^"]+)"/.exec(downloads)?.[1];
    expect(declared).toBe(cliPkg.version);
  });
});
