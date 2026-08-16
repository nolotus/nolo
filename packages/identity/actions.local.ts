// Identity 写操作面：local edition no-op。
// 无账号模式下没有 signOut/changeUser/fetchUserProfile/initializeAuth 的语义。
// action creators 返回空 action（{ type: "identity/noop" }），
// selectUsers 返回空数组（无多用户）。
//
// thunk 类（fetchUserProfile、initializeAuth）返回 async () => NOOP_ACTION：
// Redux thunk middleware 会调用这个函数并 dispatch 返回值。
// local 模式下它返回 NOOP_ACTION，dispatch 后 reducer 忽略（authReducer 也是 noop）。
// 这不是严格的 thunk 签名（缺少 dispatch/getState 参数），但行为安全：
// 不产生任何状态变化。如果未来 identity 脱离 Redux（react-redux 弃用方向），
// 这些 no-op 应改为直接返回 Promise.resolve()，不假设 dispatch 存在。

const NOOP_ACTION = { type: "identity/noop" } as const;

export const signOut = () => NOOP_ACTION;
export const changeUser = (_user: unknown) => NOOP_ACTION;
export const fetchUserProfile = () => async () => NOOP_ACTION;
export const initializeAuth = () => async () => NOOP_ACTION;
export const deductBalance = (_amount: number) => NOOP_ACTION;
export const replaceCurrentToken = (_token: string) => NOOP_ACTION;

// local 模式无多用户列表
export const selectUsers = (_state: unknown): never[] => [];