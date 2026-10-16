/**
 * Classic-BPF seccomp program for the Linux Bubblewrap backend (F6 fix,
 * owner option A). Handed to `bwrap --seccomp FD`; bwrap installs it with
 * PR_SET_NO_NEW_PRIVS right before exec'ing the payload. A seccomp filter
 * cannot be removed or relaxed afterwards: later filters added inside the
 * sandbox can only be stricter (the kernel applies the most restrictive
 * action across all filters, and ERRNO/KILL outrank ALLOW/TRACE/USER_NOTIF).
 *
 * Policy (both supported ABIs):
 *   - arch != the expected AUDIT_ARCH            -> KILL_PROCESS
 *   - x86_64: nr >= __X32_SYSCALL_BIT (x32 ABI)   -> KILL_PROCESS
 *   - socket(AF_UNIX, ...)                        -> ERRNO(EAFNOSUPPORT)
 *   - socketpair(AF_UNIX, STREAM|SEQPACKET, ...)  -> ALLOW
 *   - socketpair(AF_UNIX, any other type)         -> ERRNO(EACCES)
 *   - io_uring_setup/enter/register               -> ERRNO(ENOSYS)
 *   - everything else                             -> ALLOW
 *
 * Why socketpair is restricted by type (verified locally, see validation
 * report F6): an AF_UNIX SOCK_DGRAM socketpair endpoint can still sendto() a
 * pathname, or connect() to a new pathname peer, so it reaches any host
 * SOCK_DGRAM socket inside a mounted root. SOCK_RAW is mapped to SOCK_DGRAM
 * by the kernel for AF_UNIX, so only STREAM (1) and SEQPACKET (5) are allowed;
 * those are permanently connected to their pair (connect -> EPROTOTYPE /
 * EISCONN; a SEQPACKET sendto ignores the address). The base type is
 * `type & 0xf` (SOCK_TYPE_MASK; SOCK_CLOEXEC/SOCK_NONBLOCK are high bits).
 *
 * Other paths to an AF_UNIX socket, checked:
 *   - i386 `socketcall`/`int 0x80` on x86_64 runs with AUDIT_ARCH_I386 and
 *     arm32 compat on aarch64 runs with AUDIT_ARCH_ARM -> arch check kills.
 *   - x32 ABI (nr | 0x40000000) -> killed. aarch64 has no socketcall.
 *   - io_uring IORING_OP_SOCKET bypasses the socket() syscall -> io_uring
 *     syscalls denied entirely.
 *   - open()/openat() of a socket inode fails with ENXIO; it cannot connect.
 *   - Received fds (SCM_RIGHTS, pidfd_getfd) require an existing channel to a
 *     process outside the sandbox; the payload only inherits stdio pipes
 *     (stdin=/dev/null) and bwrap closes the root/seccomp fds.
 *   - accept() needs a listening socket the sandbox cannot create; bind() on
 *     a socketpair endpoint only creates a file, it cannot reach a host peer.
 * Out of scope: this filter does NOT restrict other address families
 * (network namespace already isolates them) nor any other syscall surface.
 */

export type SeccompArch = "x86_64" | "aarch64";

// <linux/audit.h>
export const AUDIT_ARCH_X86_64 = 0xc000003e;
export const AUDIT_ARCH_AARCH64 = 0xc00000b7;
export const X32_SYSCALL_BIT = 0x40000000;
export const AF_UNIX = 1;
export const SOCK_STREAM = 1;
export const SOCK_SEQPACKET = 5;
export const SOCK_TYPE_MASK = 0xf;
export const EACCES = 13;
export const ENOSYS = 38;
export const EAFNOSUPPORT = 97;
// <linux/seccomp.h>
export const SECCOMP_RET_KILL_PROCESS = 0x80000000;
export const SECCOMP_RET_ERRNO = 0x00050000;
export const SECCOMP_RET_ALLOW = 0x7fff0000;

// Syscall numbers: x86_64 <asm/unistd_64.h>; aarch64 asm-generic unistd.h.
export const SECCOMP_SYSCALLS: Record<SeccompArch, {
  audit: number; socket: number; socketpair: number;
  ioUringSetup: number; ioUringEnter: number; ioUringRegister: number;
}> = {
  x86_64: { audit: AUDIT_ARCH_X86_64, socket: 41, socketpair: 53, ioUringSetup: 425, ioUringEnter: 426, ioUringRegister: 427 },
  aarch64: { audit: AUDIT_ARCH_AARCH64, socket: 198, socketpair: 199, ioUringSetup: 425, ioUringEnter: 426, ioUringRegister: 427 },
};

// struct seccomp_data offsets (both ABIs little-endian): args[i] low 32 bits.
const OFF_NR = 0;
const OFF_ARCH = 4;
const OFF_ARG0_LO = 16;
const OFF_ARG1_LO = 24;
// BPF opcodes
export const BPF_LD_W_ABS = 0x20;
export const BPF_JMP_JEQ_K = 0x15;
export const BPF_JMP_JGE_K = 0x35;
export const BPF_ALU_AND_K = 0x54;
export const BPF_RET_K = 0x06;

/** Map Node/Bun `process.arch` to a supported seccomp ABI, or undefined. */
export function seccompArchFor(processArch: string): SeccompArch | undefined {
  if (processArch === "x64") return "x86_64";
  if (processArch === "arm64") return "aarch64";
  return undefined;
}

type Insn = { code: number; jt: number | string; jf: number | string; k: number; label?: string };

/** Build the filter as encoded `struct sock_filter[]` bytes (8 bytes each). */
export function buildSeccompFilter(arch: SeccompArch): Uint8Array {
  const nr = SECCOMP_SYSCALLS[arch];
  if (!nr) throw new Error(`Unsupported seccomp architecture: ${String(arch)}`);
  const ld = (k: number, label?: string): Insn => ({ code: BPF_LD_W_ABS, jt: 0, jf: 0, k, label });
  const jeq = (k: number, jt: number | string, jf: number | string): Insn => ({ code: BPF_JMP_JEQ_K, jt, jf, k });
  const ret = (k: number, label: string): Insn => ({ code: BPF_RET_K, jt: 0, jf: 0, k, label });
  const prog: Insn[] = [
    ld(OFF_ARCH),
    jeq(nr.audit, 0, "kill"),
    ld(OFF_NR),
    ...(arch === "x86_64" ? [{ code: BPF_JMP_JGE_K, jt: "kill", jf: 0, k: X32_SYSCALL_BIT } as Insn] : []),
    jeq(nr.socket, "socket", 0),
    jeq(nr.socketpair, "socketpair", 0),
    jeq(nr.ioUringSetup, "enosys", 0),
    jeq(nr.ioUringEnter, "enosys", 0),
    jeq(nr.ioUringRegister, "enosys", "allow"),
    ld(OFF_ARG0_LO, "socket"),
    jeq(AF_UNIX, "deny_socket", "allow"),
    ld(OFF_ARG0_LO, "socketpair"),
    jeq(AF_UNIX, 0, "allow"),
    ld(OFF_ARG1_LO),
    { code: BPF_ALU_AND_K, jt: 0, jf: 0, k: SOCK_TYPE_MASK },
    jeq(SOCK_STREAM, "allow", 0),
    jeq(SOCK_SEQPACKET, "allow", "deny_pair"),
    ret(SECCOMP_RET_ERRNO | EAFNOSUPPORT, "deny_socket"),
    ret(SECCOMP_RET_ERRNO | EACCES, "deny_pair"),
    ret(SECCOMP_RET_ERRNO | ENOSYS, "enosys"),
    ret(SECCOMP_RET_KILL_PROCESS, "kill"),
    // Classic BPF only jumps forward, so the default verdict is last.
    ret(SECCOMP_RET_ALLOW, "allow"),
  ];
  const labels = new Map<string, number>();
  prog.forEach((insn, i) => { if (insn.label) labels.set(insn.label, i); });
  const offset = (target: number | string, i: number): number => {
    if (typeof target === "number") return target;
    const at = labels.get(target);
    const rel = at === undefined ? -1 : at - i - 1;
    if (rel < 0 || rel > 255) throw new Error(`Bad seccomp jump to ${target}`);
    return rel;
  };
  const bytes = new Uint8Array(prog.length * 8);
  const view = new DataView(bytes.buffer);
  prog.forEach((insn, i) => {
    view.setUint16(i * 8, insn.code, true);
    view.setUint8(i * 8 + 2, offset(insn.jt, i));
    view.setUint8(i * 8 + 3, offset(insn.jf, i));
    view.setUint32(i * 8 + 4, insn.k >>> 0, true);
  });
  return bytes;
}

export type DecodedInsn = { code: number; jt: number; jf: number; k: number };
export function decodeSeccompFilter(bytes: Uint8Array): DecodedInsn[] {
  if (bytes.byteLength % 8 !== 0) throw new Error("Truncated sock_filter");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: DecodedInsn[] = [];
  for (let i = 0; i < bytes.byteLength; i += 8) {
    out.push({ code: view.getUint16(i, true), jt: view.getUint8(i + 2), jf: view.getUint8(i + 3), k: view.getUint32(i + 4, true) });
  }
  return out;
}

/**
 * Tiny reference interpreter for the opcodes above (tests only): evaluates the
 * program against a synthetic seccomp_data so the rule table is checked
 * semantically on both architectures, not just structurally.
 */
export function evalSeccompFilter(bytes: Uint8Array, data: { nr: number; arch: number; args?: number[] }): number {
  const prog = decodeSeccompFilter(bytes);
  const word = (off: number): number => {
    if (off === OFF_NR) return data.nr >>> 0;
    if (off === OFF_ARCH) return data.arch >>> 0;
    if (off >= 16 && off < 64 && (off - 16) % 8 === 0) return (data.args?.[(off - 16) / 8] ?? 0) >>> 0;
    throw new Error(`Unexpected load offset ${off}`);
  };
  let a = 0;
  for (let pc = 0; pc < prog.length; pc++) {
    const { code, jt, jf, k } = prog[pc];
    if (code === BPF_LD_W_ABS) a = word(k);
    else if (code === BPF_ALU_AND_K) a = (a & k) >>> 0;
    else if (code === BPF_JMP_JEQ_K) pc += a === k ? jt : jf;
    else if (code === BPF_JMP_JGE_K) pc += a >= k ? jt : jf;
    else if (code === BPF_RET_K) return k;
    else throw new Error(`Unexpected opcode ${code}`);
  }
  throw new Error("Program fell off the end");
}
