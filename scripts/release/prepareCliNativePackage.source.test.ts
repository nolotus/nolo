import { describe, expect, it } from "bun:test";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { assertBinaryMagicBytes } from "./prepareCliNativePackage";

const TMP_DIR = join(import.meta.dir, ".tmp-magic-byte-test");

function writeBytes(path: string, bytes: number[]): void {
  writeFileSync(path, Buffer.from(bytes));
}

describe("assertBinaryMagicBytes", () => {
  // Minimal valid Mach-O 64-bit LE arm64 header (at least 20 bytes for our checks)
  const MACHO_ARM64 = [
    0xcf, 0xfa, 0xed, 0xfe, // MH_MAGIC_64 little-endian
    0x0c, 0x00, 0x00, 0x01, // cputype = CPU_TYPE_ARM64 (0x0100000c) LE
    0x00, 0x00, 0x00, 0x00, // cpusubtype
    0x00, 0x00, 0x00, 0x00, // filetype
    0x00, 0x00, 0x00, 0x00, // ncmds
  ];

  // Minimal ELF x86-64 header
  const ELF_X64 = [
    0x7f, 0x45, 0x4c, 0x46, // ELF magic
    0x02, 0x01, 0x01, 0x00, // class=64, data=LE, version, osabi
    0x00, 0x00, 0x00, 0x00, // padding
    0x00, 0x00, 0x00, 0x00, // padding
    0x00, 0x00,             // e_type (offset 16)
    0x3e, 0x00,             // e_machine = EM_X86_64 (0x3e) at offset 18
  ];

  // Minimal ELF aarch64 header (wrong arch)
  const ELF_AARCH64 = [
    0x7f, 0x45, 0x4c, 0x46,
    0x02, 0x01, 0x01, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00,             // e_type
    0xb7, 0x00,             // e_machine = EM_AARCH64 (0xb7) at offset 18
  ];

  // Fat binary header (padded to 20 bytes for validation)
  const FAT_BINARY = [
    0xca, 0xfe, 0xba, 0xbe, // FAT_MAGIC
    0x00, 0x00, 0x00, 0x01, // nfat_arch
    0x00, 0x00, 0x00, 0x00, // padding
    0x00, 0x00, 0x00, 0x00, // padding
    0x00, 0x00, 0x00, 0x00, // padding
  ];

  const darwinPlatform = { os: "darwin", cpu: "arm64", binaryName: "nolo" };
  const linuxPlatform = { os: "linux", cpu: "x64", binaryName: "nolo" };

  it("accepts Mach-O arm64 for darwin-arm64", () => {
    const dir = join(TMP_DIR, "macho-ok");
    mkdirSync(dir, { recursive: true });
    const bin = join(dir, "nolo");
    writeBytes(bin, MACHO_ARM64);
    expect(() => assertBinaryMagicBytes(bin, darwinPlatform)).not.toThrow();
    rmSync(dir, { recursive: true, force: true });
  });

  it("accepts fat binary for darwin-arm64", () => {
    const dir = join(TMP_DIR, "fat-ok");
    mkdirSync(dir, { recursive: true });
    const bin = join(dir, "nolo");
    writeBytes(bin, FAT_BINARY);
    expect(() => assertBinaryMagicBytes(bin, darwinPlatform)).not.toThrow();
    rmSync(dir, { recursive: true, force: true });
  });

  it("rejects ELF for darwin-arm64", () => {
    const dir = join(TMP_DIR, "elf-darwin-bad");
    mkdirSync(dir, { recursive: true });
    const bin = join(dir, "nolo");
    writeBytes(bin, ELF_X64);
    expect(() => assertBinaryMagicBytes(bin, darwinPlatform)).toThrow(
      /darwin binary magic-byte mismatch/,
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("accepts ELF x86-64 for linux-x64", () => {
    const dir = join(TMP_DIR, "elf-ok");
    mkdirSync(dir, { recursive: true });
    const bin = join(dir, "nolo");
    writeBytes(bin, ELF_X64);
    expect(() => assertBinaryMagicBytes(bin, linuxPlatform)).not.toThrow();
    rmSync(dir, { recursive: true, force: true });
  });

  it("rejects ELF aarch64 for linux-x64", () => {
    const dir = join(TMP_DIR, "elf-aarch64-bad");
    mkdirSync(dir, { recursive: true });
    const bin = join(dir, "nolo");
    writeBytes(bin, ELF_AARCH64);
    expect(() => assertBinaryMagicBytes(bin, linuxPlatform)).toThrow(
      /linux binary is ELF but not x86-64/,
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("rejects Mach-O for linux-x64", () => {
    const dir = join(TMP_DIR, "macho-linux-bad");
    mkdirSync(dir, { recursive: true });
    const bin = join(dir, "nolo");
    writeBytes(bin, MACHO_ARM64);
    expect(() => assertBinaryMagicBytes(bin, linuxPlatform)).toThrow(
      /linux binary magic-byte mismatch/,
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("rejects Mach-O x86-64 (wrong cputype) for darwin-arm64", () => {
    const dir = join(TMP_DIR, "macho-x64-bad");
    mkdirSync(dir, { recursive: true });
    const bin = join(dir, "nolo");
    // Mach-O 64 LE with cputype = CPU_TYPE_X86_64 (0x01000007)
    const machoX64 = [
      0xcf, 0xfa, 0xed, 0xfe,
      0x07, 0x00, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
    ];
    writeBytes(bin, machoX64);
    expect(() => assertBinaryMagicBytes(bin, darwinPlatform)).toThrow(
      /not arm64/,
    );
    rmSync(dir, { recursive: true, force: true });
  });
});