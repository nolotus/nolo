import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(import.meta.dir, relativePath), "utf-8");

describe("remote server consumer source contract", () => {
  it("routes remote-only server lists through shared selectors", () => {
    const membershipsSource = readSource("../../create/space/member/fetchUserSpaceMembershipsAction.ts");
    const spaceAccessSource = readSource("../../create/space/spaceAccess.ts");
    const myAppsSource = readSource("../../app/hooks/useMyApps.ts");
    const emailAdminSource = readSource("../../app/pages/EmailAdmin.tsx");
    const shareActionSource = readSource("../../share/action.ts");
    const favoriteSource = readSource("../../app/favorite/favoriteStore.ts");
    const allViewSidebarSource = readSource("../../chat/web/sidebar/AllViewSidebar.tsx");
    const mySharesSource = readSource("../../app/pages/MySharesPage.tsx");
    const deleteUserHookSource = readSource("../../auth/hooks/useDeleteUser.ts");
    const deleteOwnAccountHookSource = readSource("../../auth/hooks/useDeleteOwnAccount.ts");

    expect(membershipsSource).toContain("selectSpaceRemoteAuth");
    expect(membershipsSource).not.toContain("getAllServers(");
    expect(spaceAccessSource).toContain("currentServer");
    expect(spaceAccessSource).toContain("syncServers");

    expect(myAppsSource).toContain("selectRemoteServers");
    expect(myAppsSource).not.toContain("getAllServers(");

    expect(emailAdminSource).toContain("selectRemoteServers");
    expect(emailAdminSource).not.toContain("getAllServers(");

    expect(shareActionSource).toContain("selectRemoteServers");
    expect(shareActionSource).not.toContain("getAllServers(");

    expect(favoriteSource).toContain("selectRemoteServers");
    expect(favoriteSource).not.toContain("selectCurrentServer");
    expect(favoriteSource).not.toContain("selectSyncServers");


    expect(mySharesSource).toContain("selectRemoteServers");
    expect(mySharesSource).not.toContain("selectRemoteSyncServers");

    expect(deleteUserHookSource).toContain("selectRemoteServers");
    expect(deleteUserHookSource).not.toContain("selectRemoteSyncServers");

    expect(deleteOwnAccountHookSource).toContain("selectRemoteServers");
    expect(deleteOwnAccountHookSource).not.toContain("selectRemoteSyncServers");
  });

  it("routes single-server authority views through selectRemoteServer", () => {
    const rechargeRecordSource = readSource("../../life/web/RechargeRecord.tsx");
    const inviteRewardsSource = readSource("../../life/web/InviteRewards.tsx");

    expect(rechargeRecordSource).toContain("selectRemoteServer");
    expect(rechargeRecordSource).not.toContain("selectCurrentServer");

    expect(inviteRewardsSource).toContain("selectRemoteServer");
    expect(inviteRewardsSource).not.toContain("selectCurrentServer");
  });
});
