// Browser-only compatibility surface. Binding truth and lifecycle authorization
// stay on the server; the browser cannot verify bindings and always denies.

/**
 * fail-closed 授权器：仅保留浏览器侧调用面 `isBound`（恒 false），
 * 直接以授权器调用形态被消费时也如实拒绝（{ allowed: false }）。
 */
export function getDockerBindingAuthorizer() {
  const deny = async (): Promise<{ allowed: false }> => ({ allowed: false });
  return Object.assign(deny, { isBound: (_caller: string) => false });
}
