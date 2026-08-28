# Space state ownership

Space state is Redux-free. Do not add new state fields to `spaceSlice.ts`.

| Concern | Source of truth | React API |
|---|---|---|
| Current space, selected space id, view mode | `spaceCurrentStore.ts` | `useCurrentSpaceId`, `useViewMode` |
| DB entity fallback for current space | `spaceCurrentSelectors.ts` | `useCurrentSpaceFromEntity` |
| Membership list and loading status | `spaceMembershipStore.ts` | `useAllMemberSpaces`, `useMembershipStatus`, `useSpaceLoading` |
| Dialog runtime/SSE state | `spaceDialogStore.ts` | `useDialogStatus`, `useIsDialogUnread` |
| Favorites/category collapse UI | `spaceUiStore.ts` | `useFavoritesCollapsed`, `useCollapsedCategories` |
| Durable entities and persistence | database stores/actions | Use the existing database API |

## Non-React code

Use the owning module's `get*` getter and `set*`/`update*` mutator. Do not
mutate objects returned by getters directly; all changes must go through a
mutator so subscribers are notified.

## Compatibility boundary

`spaceSlice.ts` remains a thin action/thunk compatibility shell. Its legacy
selectors are plain functions, not memoized selectors, because module-store
changes do not change the Redux input object. New code must import directly
from the owning module store. The shell is removable after remaining action
consumers are moved.