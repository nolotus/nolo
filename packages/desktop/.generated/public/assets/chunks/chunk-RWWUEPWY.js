import {
  client_default
} from "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import {
  asTrimmedString,
  clearSyncMappings,
  isLevelNotFoundError
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  getIsDesktopApp,
  isProduction
} from "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuCircleAlert,
  LuCircleCheck,
  LuLoaderCircle,
  LuX
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  BUILTIN_NOLO_AGENT_KEY,
  BUILTIN_PLATFORM_AGENT_KEYS,
  PUBLIC_DEEPSEEK_V4_FLASH_AGENT_KEY,
  PUBLIC_KIMI_K26_IMAGE_AGENT_KEY,
  buildDialogUrl,
  createSpaceKey,
  normalizeSpaceId
} from "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  asNonEmptyStringArray,
  asOptionalTrimmedString,
  asTrimmedNonEmptyStringArray
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  abortActiveControllers,
  addPageReferenceToRuntime,
  applyClearDialogStateRuntime,
  applyUpdateTokensFulfilled,
  clearActiveControllers,
  clearPendingAttachments,
  clearPendingUserInputQueue,
  compactWhitespace,
  deleteDialogRuntime,
  extractCustomId,
  extractUserId,
  getActiveDialogKey,
  getDialogRuntimeTokens,
  resetDialogRuntimeSessionState,
  selectCurrentDialogKey,
  setActiveDialogKey,
  setDialogConfigError
} from "/public/assets/chunks/chunk-JOOBQBMM.js";
import {
  current,
  isDraft,
  isDraftable,
  produce
} from "/public/assets/chunks/chunk-7OO56Y7L.js";
import {
  ALL_MODELS
} from "/public/assets/chunks/chunk-NKT4VBPJ.js";
import {
  MODEL_LOOKUP_MAP,
  findModelConfig,
  getApproxPricePerImage,
  getModelConfig,
  isCliProvider,
  isLocalServerUrl
} from "/public/assets/chunks/chunk-LPS7IE46.js";
import {
  asOptionalFiniteNumber,
  asOptionalPositiveFiniteNumber
} from "/public/assets/chunks/chunk-RUG5F6GD.js";
import {
  normalizeServerOrigin
} from "/public/assets/chunks/chunk-XJRNNKKF.js";
import {
  isRecord
} from "/public/assets/chunks/chunk-IRTDRTXE.js";
import {
  asTrimmedLowercaseString
} from "/public/assets/chunks/chunk-VCXOIOLL.js";
import {
  require_react_dom
} from "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  toErrorMessage
} from "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __commonJS,
  __publicField,
  __require,
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// node_modules/ulid/stubs/crypto.js
var require_crypto = __commonJS({
  "node_modules/ulid/stubs/crypto.js"() {
  }
});

// (disabled):crypto
var require_crypto2 = __commonJS({
  "(disabled):crypto"() {
  }
});

// node_modules/tweetnacl/nacl-fast.js
var require_nacl_fast = __commonJS({
  "node_modules/tweetnacl/nacl-fast.js"(exports, module) {
    (function(nacl4) {
      "use strict";
      var gf = function(init) {
        var i2, r = new Float64Array(16);
        if (init) for (i2 = 0; i2 < init.length; i2++) r[i2] = init[i2];
        return r;
      };
      var randombytes = function() {
        throw new Error("no PRNG");
      };
      var _0 = new Uint8Array(16);
      var _9 = new Uint8Array(32);
      _9[0] = 9;
      var gf0 = gf(), gf1 = gf([1]), _121665 = gf([56129, 1]), D2 = gf([30883, 4953, 19914, 30187, 55467, 16705, 2637, 112, 59544, 30585, 16505, 36039, 65139, 11119, 27886, 20995]), D22 = gf([61785, 9906, 39828, 60374, 45398, 33411, 5274, 224, 53552, 61171, 33010, 6542, 64743, 22239, 55772, 9222]), X2 = gf([54554, 36645, 11616, 51542, 42930, 38181, 51040, 26924, 56412, 64982, 57905, 49316, 21502, 52590, 14035, 8553]), Y2 = gf([26200, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214]), I2 = gf([41136, 18958, 6951, 50414, 58488, 44335, 6150, 12099, 55207, 15867, 153, 11085, 57099, 20417, 9344, 11139]);
      function ts64(x2, i2, h3, l) {
        x2[i2] = h3 >> 24 & 255;
        x2[i2 + 1] = h3 >> 16 & 255;
        x2[i2 + 2] = h3 >> 8 & 255;
        x2[i2 + 3] = h3 & 255;
        x2[i2 + 4] = l >> 24 & 255;
        x2[i2 + 5] = l >> 16 & 255;
        x2[i2 + 6] = l >> 8 & 255;
        x2[i2 + 7] = l & 255;
      }
      function vn(x2, xi, y3, yi, n) {
        var i2, d3 = 0;
        for (i2 = 0; i2 < n; i2++) d3 |= x2[xi + i2] ^ y3[yi + i2];
        return (1 & d3 - 1 >>> 8) - 1;
      }
      function crypto_verify_16(x2, xi, y3, yi) {
        return vn(x2, xi, y3, yi, 16);
      }
      function crypto_verify_32(x2, xi, y3, yi) {
        return vn(x2, xi, y3, yi, 32);
      }
      function core_salsa20(o, p, k2, c2) {
        var j0 = c2[0] & 255 | (c2[1] & 255) << 8 | (c2[2] & 255) << 16 | (c2[3] & 255) << 24, j1 = k2[0] & 255 | (k2[1] & 255) << 8 | (k2[2] & 255) << 16 | (k2[3] & 255) << 24, j2 = k2[4] & 255 | (k2[5] & 255) << 8 | (k2[6] & 255) << 16 | (k2[7] & 255) << 24, j3 = k2[8] & 255 | (k2[9] & 255) << 8 | (k2[10] & 255) << 16 | (k2[11] & 255) << 24, j4 = k2[12] & 255 | (k2[13] & 255) << 8 | (k2[14] & 255) << 16 | (k2[15] & 255) << 24, j5 = c2[4] & 255 | (c2[5] & 255) << 8 | (c2[6] & 255) << 16 | (c2[7] & 255) << 24, j6 = p[0] & 255 | (p[1] & 255) << 8 | (p[2] & 255) << 16 | (p[3] & 255) << 24, j7 = p[4] & 255 | (p[5] & 255) << 8 | (p[6] & 255) << 16 | (p[7] & 255) << 24, j8 = p[8] & 255 | (p[9] & 255) << 8 | (p[10] & 255) << 16 | (p[11] & 255) << 24, j9 = p[12] & 255 | (p[13] & 255) << 8 | (p[14] & 255) << 16 | (p[15] & 255) << 24, j10 = c2[8] & 255 | (c2[9] & 255) << 8 | (c2[10] & 255) << 16 | (c2[11] & 255) << 24, j11 = k2[16] & 255 | (k2[17] & 255) << 8 | (k2[18] & 255) << 16 | (k2[19] & 255) << 24, j12 = k2[20] & 255 | (k2[21] & 255) << 8 | (k2[22] & 255) << 16 | (k2[23] & 255) << 24, j13 = k2[24] & 255 | (k2[25] & 255) << 8 | (k2[26] & 255) << 16 | (k2[27] & 255) << 24, j14 = k2[28] & 255 | (k2[29] & 255) << 8 | (k2[30] & 255) << 16 | (k2[31] & 255) << 24, j15 = c2[12] & 255 | (c2[13] & 255) << 8 | (c2[14] & 255) << 16 | (c2[15] & 255) << 24;
        var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7, x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14, x15 = j15, u2;
        for (var i2 = 0; i2 < 20; i2 += 2) {
          u2 = x0 + x12 | 0;
          x4 ^= u2 << 7 | u2 >>> 32 - 7;
          u2 = x4 + x0 | 0;
          x8 ^= u2 << 9 | u2 >>> 32 - 9;
          u2 = x8 + x4 | 0;
          x12 ^= u2 << 13 | u2 >>> 32 - 13;
          u2 = x12 + x8 | 0;
          x0 ^= u2 << 18 | u2 >>> 32 - 18;
          u2 = x5 + x1 | 0;
          x9 ^= u2 << 7 | u2 >>> 32 - 7;
          u2 = x9 + x5 | 0;
          x13 ^= u2 << 9 | u2 >>> 32 - 9;
          u2 = x13 + x9 | 0;
          x1 ^= u2 << 13 | u2 >>> 32 - 13;
          u2 = x1 + x13 | 0;
          x5 ^= u2 << 18 | u2 >>> 32 - 18;
          u2 = x10 + x6 | 0;
          x14 ^= u2 << 7 | u2 >>> 32 - 7;
          u2 = x14 + x10 | 0;
          x2 ^= u2 << 9 | u2 >>> 32 - 9;
          u2 = x2 + x14 | 0;
          x6 ^= u2 << 13 | u2 >>> 32 - 13;
          u2 = x6 + x2 | 0;
          x10 ^= u2 << 18 | u2 >>> 32 - 18;
          u2 = x15 + x11 | 0;
          x3 ^= u2 << 7 | u2 >>> 32 - 7;
          u2 = x3 + x15 | 0;
          x7 ^= u2 << 9 | u2 >>> 32 - 9;
          u2 = x7 + x3 | 0;
          x11 ^= u2 << 13 | u2 >>> 32 - 13;
          u2 = x11 + x7 | 0;
          x15 ^= u2 << 18 | u2 >>> 32 - 18;
          u2 = x0 + x3 | 0;
          x1 ^= u2 << 7 | u2 >>> 32 - 7;
          u2 = x1 + x0 | 0;
          x2 ^= u2 << 9 | u2 >>> 32 - 9;
          u2 = x2 + x1 | 0;
          x3 ^= u2 << 13 | u2 >>> 32 - 13;
          u2 = x3 + x2 | 0;
          x0 ^= u2 << 18 | u2 >>> 32 - 18;
          u2 = x5 + x4 | 0;
          x6 ^= u2 << 7 | u2 >>> 32 - 7;
          u2 = x6 + x5 | 0;
          x7 ^= u2 << 9 | u2 >>> 32 - 9;
          u2 = x7 + x6 | 0;
          x4 ^= u2 << 13 | u2 >>> 32 - 13;
          u2 = x4 + x7 | 0;
          x5 ^= u2 << 18 | u2 >>> 32 - 18;
          u2 = x10 + x9 | 0;
          x11 ^= u2 << 7 | u2 >>> 32 - 7;
          u2 = x11 + x10 | 0;
          x8 ^= u2 << 9 | u2 >>> 32 - 9;
          u2 = x8 + x11 | 0;
          x9 ^= u2 << 13 | u2 >>> 32 - 13;
          u2 = x9 + x8 | 0;
          x10 ^= u2 << 18 | u2 >>> 32 - 18;
          u2 = x15 + x14 | 0;
          x12 ^= u2 << 7 | u2 >>> 32 - 7;
          u2 = x12 + x15 | 0;
          x13 ^= u2 << 9 | u2 >>> 32 - 9;
          u2 = x13 + x12 | 0;
          x14 ^= u2 << 13 | u2 >>> 32 - 13;
          u2 = x14 + x13 | 0;
          x15 ^= u2 << 18 | u2 >>> 32 - 18;
        }
        x0 = x0 + j0 | 0;
        x1 = x1 + j1 | 0;
        x2 = x2 + j2 | 0;
        x3 = x3 + j3 | 0;
        x4 = x4 + j4 | 0;
        x5 = x5 + j5 | 0;
        x6 = x6 + j6 | 0;
        x7 = x7 + j7 | 0;
        x8 = x8 + j8 | 0;
        x9 = x9 + j9 | 0;
        x10 = x10 + j10 | 0;
        x11 = x11 + j11 | 0;
        x12 = x12 + j12 | 0;
        x13 = x13 + j13 | 0;
        x14 = x14 + j14 | 0;
        x15 = x15 + j15 | 0;
        o[0] = x0 >>> 0 & 255;
        o[1] = x0 >>> 8 & 255;
        o[2] = x0 >>> 16 & 255;
        o[3] = x0 >>> 24 & 255;
        o[4] = x1 >>> 0 & 255;
        o[5] = x1 >>> 8 & 255;
        o[6] = x1 >>> 16 & 255;
        o[7] = x1 >>> 24 & 255;
        o[8] = x2 >>> 0 & 255;
        o[9] = x2 >>> 8 & 255;
        o[10] = x2 >>> 16 & 255;
        o[11] = x2 >>> 24 & 255;
        o[12] = x3 >>> 0 & 255;
        o[13] = x3 >>> 8 & 255;
        o[14] = x3 >>> 16 & 255;
        o[15] = x3 >>> 24 & 255;
        o[16] = x4 >>> 0 & 255;
        o[17] = x4 >>> 8 & 255;
        o[18] = x4 >>> 16 & 255;
        o[19] = x4 >>> 24 & 255;
        o[20] = x5 >>> 0 & 255;
        o[21] = x5 >>> 8 & 255;
        o[22] = x5 >>> 16 & 255;
        o[23] = x5 >>> 24 & 255;
        o[24] = x6 >>> 0 & 255;
        o[25] = x6 >>> 8 & 255;
        o[26] = x6 >>> 16 & 255;
        o[27] = x6 >>> 24 & 255;
        o[28] = x7 >>> 0 & 255;
        o[29] = x7 >>> 8 & 255;
        o[30] = x7 >>> 16 & 255;
        o[31] = x7 >>> 24 & 255;
        o[32] = x8 >>> 0 & 255;
        o[33] = x8 >>> 8 & 255;
        o[34] = x8 >>> 16 & 255;
        o[35] = x8 >>> 24 & 255;
        o[36] = x9 >>> 0 & 255;
        o[37] = x9 >>> 8 & 255;
        o[38] = x9 >>> 16 & 255;
        o[39] = x9 >>> 24 & 255;
        o[40] = x10 >>> 0 & 255;
        o[41] = x10 >>> 8 & 255;
        o[42] = x10 >>> 16 & 255;
        o[43] = x10 >>> 24 & 255;
        o[44] = x11 >>> 0 & 255;
        o[45] = x11 >>> 8 & 255;
        o[46] = x11 >>> 16 & 255;
        o[47] = x11 >>> 24 & 255;
        o[48] = x12 >>> 0 & 255;
        o[49] = x12 >>> 8 & 255;
        o[50] = x12 >>> 16 & 255;
        o[51] = x12 >>> 24 & 255;
        o[52] = x13 >>> 0 & 255;
        o[53] = x13 >>> 8 & 255;
        o[54] = x13 >>> 16 & 255;
        o[55] = x13 >>> 24 & 255;
        o[56] = x14 >>> 0 & 255;
        o[57] = x14 >>> 8 & 255;
        o[58] = x14 >>> 16 & 255;
        o[59] = x14 >>> 24 & 255;
        o[60] = x15 >>> 0 & 255;
        o[61] = x15 >>> 8 & 255;
        o[62] = x15 >>> 16 & 255;
        o[63] = x15 >>> 24 & 255;
      }
      function core_hsalsa20(o, p, k2, c2) {
        var j0 = c2[0] & 255 | (c2[1] & 255) << 8 | (c2[2] & 255) << 16 | (c2[3] & 255) << 24, j1 = k2[0] & 255 | (k2[1] & 255) << 8 | (k2[2] & 255) << 16 | (k2[3] & 255) << 24, j2 = k2[4] & 255 | (k2[5] & 255) << 8 | (k2[6] & 255) << 16 | (k2[7] & 255) << 24, j3 = k2[8] & 255 | (k2[9] & 255) << 8 | (k2[10] & 255) << 16 | (k2[11] & 255) << 24, j4 = k2[12] & 255 | (k2[13] & 255) << 8 | (k2[14] & 255) << 16 | (k2[15] & 255) << 24, j5 = c2[4] & 255 | (c2[5] & 255) << 8 | (c2[6] & 255) << 16 | (c2[7] & 255) << 24, j6 = p[0] & 255 | (p[1] & 255) << 8 | (p[2] & 255) << 16 | (p[3] & 255) << 24, j7 = p[4] & 255 | (p[5] & 255) << 8 | (p[6] & 255) << 16 | (p[7] & 255) << 24, j8 = p[8] & 255 | (p[9] & 255) << 8 | (p[10] & 255) << 16 | (p[11] & 255) << 24, j9 = p[12] & 255 | (p[13] & 255) << 8 | (p[14] & 255) << 16 | (p[15] & 255) << 24, j10 = c2[8] & 255 | (c2[9] & 255) << 8 | (c2[10] & 255) << 16 | (c2[11] & 255) << 24, j11 = k2[16] & 255 | (k2[17] & 255) << 8 | (k2[18] & 255) << 16 | (k2[19] & 255) << 24, j12 = k2[20] & 255 | (k2[21] & 255) << 8 | (k2[22] & 255) << 16 | (k2[23] & 255) << 24, j13 = k2[24] & 255 | (k2[25] & 255) << 8 | (k2[26] & 255) << 16 | (k2[27] & 255) << 24, j14 = k2[28] & 255 | (k2[29] & 255) << 8 | (k2[30] & 255) << 16 | (k2[31] & 255) << 24, j15 = c2[12] & 255 | (c2[13] & 255) << 8 | (c2[14] & 255) << 16 | (c2[15] & 255) << 24;
        var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7, x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14, x15 = j15, u2;
        for (var i2 = 0; i2 < 20; i2 += 2) {
          u2 = x0 + x12 | 0;
          x4 ^= u2 << 7 | u2 >>> 32 - 7;
          u2 = x4 + x0 | 0;
          x8 ^= u2 << 9 | u2 >>> 32 - 9;
          u2 = x8 + x4 | 0;
          x12 ^= u2 << 13 | u2 >>> 32 - 13;
          u2 = x12 + x8 | 0;
          x0 ^= u2 << 18 | u2 >>> 32 - 18;
          u2 = x5 + x1 | 0;
          x9 ^= u2 << 7 | u2 >>> 32 - 7;
          u2 = x9 + x5 | 0;
          x13 ^= u2 << 9 | u2 >>> 32 - 9;
          u2 = x13 + x9 | 0;
          x1 ^= u2 << 13 | u2 >>> 32 - 13;
          u2 = x1 + x13 | 0;
          x5 ^= u2 << 18 | u2 >>> 32 - 18;
          u2 = x10 + x6 | 0;
          x14 ^= u2 << 7 | u2 >>> 32 - 7;
          u2 = x14 + x10 | 0;
          x2 ^= u2 << 9 | u2 >>> 32 - 9;
          u2 = x2 + x14 | 0;
          x6 ^= u2 << 13 | u2 >>> 32 - 13;
          u2 = x6 + x2 | 0;
          x10 ^= u2 << 18 | u2 >>> 32 - 18;
          u2 = x15 + x11 | 0;
          x3 ^= u2 << 7 | u2 >>> 32 - 7;
          u2 = x3 + x15 | 0;
          x7 ^= u2 << 9 | u2 >>> 32 - 9;
          u2 = x7 + x3 | 0;
          x11 ^= u2 << 13 | u2 >>> 32 - 13;
          u2 = x11 + x7 | 0;
          x15 ^= u2 << 18 | u2 >>> 32 - 18;
          u2 = x0 + x3 | 0;
          x1 ^= u2 << 7 | u2 >>> 32 - 7;
          u2 = x1 + x0 | 0;
          x2 ^= u2 << 9 | u2 >>> 32 - 9;
          u2 = x2 + x1 | 0;
          x3 ^= u2 << 13 | u2 >>> 32 - 13;
          u2 = x3 + x2 | 0;
          x0 ^= u2 << 18 | u2 >>> 32 - 18;
          u2 = x5 + x4 | 0;
          x6 ^= u2 << 7 | u2 >>> 32 - 7;
          u2 = x6 + x5 | 0;
          x7 ^= u2 << 9 | u2 >>> 32 - 9;
          u2 = x7 + x6 | 0;
          x4 ^= u2 << 13 | u2 >>> 32 - 13;
          u2 = x4 + x7 | 0;
          x5 ^= u2 << 18 | u2 >>> 32 - 18;
          u2 = x10 + x9 | 0;
          x11 ^= u2 << 7 | u2 >>> 32 - 7;
          u2 = x11 + x10 | 0;
          x8 ^= u2 << 9 | u2 >>> 32 - 9;
          u2 = x8 + x11 | 0;
          x9 ^= u2 << 13 | u2 >>> 32 - 13;
          u2 = x9 + x8 | 0;
          x10 ^= u2 << 18 | u2 >>> 32 - 18;
          u2 = x15 + x14 | 0;
          x12 ^= u2 << 7 | u2 >>> 32 - 7;
          u2 = x12 + x15 | 0;
          x13 ^= u2 << 9 | u2 >>> 32 - 9;
          u2 = x13 + x12 | 0;
          x14 ^= u2 << 13 | u2 >>> 32 - 13;
          u2 = x14 + x13 | 0;
          x15 ^= u2 << 18 | u2 >>> 32 - 18;
        }
        o[0] = x0 >>> 0 & 255;
        o[1] = x0 >>> 8 & 255;
        o[2] = x0 >>> 16 & 255;
        o[3] = x0 >>> 24 & 255;
        o[4] = x5 >>> 0 & 255;
        o[5] = x5 >>> 8 & 255;
        o[6] = x5 >>> 16 & 255;
        o[7] = x5 >>> 24 & 255;
        o[8] = x10 >>> 0 & 255;
        o[9] = x10 >>> 8 & 255;
        o[10] = x10 >>> 16 & 255;
        o[11] = x10 >>> 24 & 255;
        o[12] = x15 >>> 0 & 255;
        o[13] = x15 >>> 8 & 255;
        o[14] = x15 >>> 16 & 255;
        o[15] = x15 >>> 24 & 255;
        o[16] = x6 >>> 0 & 255;
        o[17] = x6 >>> 8 & 255;
        o[18] = x6 >>> 16 & 255;
        o[19] = x6 >>> 24 & 255;
        o[20] = x7 >>> 0 & 255;
        o[21] = x7 >>> 8 & 255;
        o[22] = x7 >>> 16 & 255;
        o[23] = x7 >>> 24 & 255;
        o[24] = x8 >>> 0 & 255;
        o[25] = x8 >>> 8 & 255;
        o[26] = x8 >>> 16 & 255;
        o[27] = x8 >>> 24 & 255;
        o[28] = x9 >>> 0 & 255;
        o[29] = x9 >>> 8 & 255;
        o[30] = x9 >>> 16 & 255;
        o[31] = x9 >>> 24 & 255;
      }
      function crypto_core_salsa20(out, inp, k2, c2) {
        core_salsa20(out, inp, k2, c2);
      }
      function crypto_core_hsalsa20(out, inp, k2, c2) {
        core_hsalsa20(out, inp, k2, c2);
      }
      var sigma = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
      function crypto_stream_salsa20_xor(c2, cpos, m3, mpos, b2, n, k2) {
        var z2 = new Uint8Array(16), x2 = new Uint8Array(64);
        var u2, i2;
        for (i2 = 0; i2 < 16; i2++) z2[i2] = 0;
        for (i2 = 0; i2 < 8; i2++) z2[i2] = n[i2];
        while (b2 >= 64) {
          crypto_core_salsa20(x2, z2, k2, sigma);
          for (i2 = 0; i2 < 64; i2++) c2[cpos + i2] = m3[mpos + i2] ^ x2[i2];
          u2 = 1;
          for (i2 = 8; i2 < 16; i2++) {
            u2 = u2 + (z2[i2] & 255) | 0;
            z2[i2] = u2 & 255;
            u2 >>>= 8;
          }
          b2 -= 64;
          cpos += 64;
          mpos += 64;
        }
        if (b2 > 0) {
          crypto_core_salsa20(x2, z2, k2, sigma);
          for (i2 = 0; i2 < b2; i2++) c2[cpos + i2] = m3[mpos + i2] ^ x2[i2];
        }
        return 0;
      }
      function crypto_stream_salsa20(c2, cpos, b2, n, k2) {
        var z2 = new Uint8Array(16), x2 = new Uint8Array(64);
        var u2, i2;
        for (i2 = 0; i2 < 16; i2++) z2[i2] = 0;
        for (i2 = 0; i2 < 8; i2++) z2[i2] = n[i2];
        while (b2 >= 64) {
          crypto_core_salsa20(x2, z2, k2, sigma);
          for (i2 = 0; i2 < 64; i2++) c2[cpos + i2] = x2[i2];
          u2 = 1;
          for (i2 = 8; i2 < 16; i2++) {
            u2 = u2 + (z2[i2] & 255) | 0;
            z2[i2] = u2 & 255;
            u2 >>>= 8;
          }
          b2 -= 64;
          cpos += 64;
        }
        if (b2 > 0) {
          crypto_core_salsa20(x2, z2, k2, sigma);
          for (i2 = 0; i2 < b2; i2++) c2[cpos + i2] = x2[i2];
        }
        return 0;
      }
      function crypto_stream(c2, cpos, d3, n, k2) {
        var s3 = new Uint8Array(32);
        crypto_core_hsalsa20(s3, n, k2, sigma);
        var sn = new Uint8Array(8);
        for (var i2 = 0; i2 < 8; i2++) sn[i2] = n[i2 + 16];
        return crypto_stream_salsa20(c2, cpos, d3, sn, s3);
      }
      function crypto_stream_xor(c2, cpos, m3, mpos, d3, n, k2) {
        var s3 = new Uint8Array(32);
        crypto_core_hsalsa20(s3, n, k2, sigma);
        var sn = new Uint8Array(8);
        for (var i2 = 0; i2 < 8; i2++) sn[i2] = n[i2 + 16];
        return crypto_stream_salsa20_xor(c2, cpos, m3, mpos, d3, sn, s3);
      }
      var poly1305 = function(key) {
        this.buffer = new Uint8Array(16);
        this.r = new Uint16Array(10);
        this.h = new Uint16Array(10);
        this.pad = new Uint16Array(8);
        this.leftover = 0;
        this.fin = 0;
        var t0, t1, t2, t3, t4, t5, t6, t7;
        t0 = key[0] & 255 | (key[1] & 255) << 8;
        this.r[0] = t0 & 8191;
        t1 = key[2] & 255 | (key[3] & 255) << 8;
        this.r[1] = (t0 >>> 13 | t1 << 3) & 8191;
        t2 = key[4] & 255 | (key[5] & 255) << 8;
        this.r[2] = (t1 >>> 10 | t2 << 6) & 7939;
        t3 = key[6] & 255 | (key[7] & 255) << 8;
        this.r[3] = (t2 >>> 7 | t3 << 9) & 8191;
        t4 = key[8] & 255 | (key[9] & 255) << 8;
        this.r[4] = (t3 >>> 4 | t4 << 12) & 255;
        this.r[5] = t4 >>> 1 & 8190;
        t5 = key[10] & 255 | (key[11] & 255) << 8;
        this.r[6] = (t4 >>> 14 | t5 << 2) & 8191;
        t6 = key[12] & 255 | (key[13] & 255) << 8;
        this.r[7] = (t5 >>> 11 | t6 << 5) & 8065;
        t7 = key[14] & 255 | (key[15] & 255) << 8;
        this.r[8] = (t6 >>> 8 | t7 << 8) & 8191;
        this.r[9] = t7 >>> 5 & 127;
        this.pad[0] = key[16] & 255 | (key[17] & 255) << 8;
        this.pad[1] = key[18] & 255 | (key[19] & 255) << 8;
        this.pad[2] = key[20] & 255 | (key[21] & 255) << 8;
        this.pad[3] = key[22] & 255 | (key[23] & 255) << 8;
        this.pad[4] = key[24] & 255 | (key[25] & 255) << 8;
        this.pad[5] = key[26] & 255 | (key[27] & 255) << 8;
        this.pad[6] = key[28] & 255 | (key[29] & 255) << 8;
        this.pad[7] = key[30] & 255 | (key[31] & 255) << 8;
      };
      poly1305.prototype.blocks = function(m3, mpos, bytes) {
        var hibit = this.fin ? 0 : 1 << 11;
        var t0, t1, t2, t3, t4, t5, t6, t7, c2;
        var d0, d1, d22, d3, d4, d5, d6, d7, d8, d9;
        var h0 = this.h[0], h1 = this.h[1], h22 = this.h[2], h3 = this.h[3], h4 = this.h[4], h5 = this.h[5], h6 = this.h[6], h7 = this.h[7], h8 = this.h[8], h9 = this.h[9];
        var r0 = this.r[0], r1 = this.r[1], r2 = this.r[2], r3 = this.r[3], r4 = this.r[4], r5 = this.r[5], r6 = this.r[6], r7 = this.r[7], r8 = this.r[8], r9 = this.r[9];
        while (bytes >= 16) {
          t0 = m3[mpos + 0] & 255 | (m3[mpos + 1] & 255) << 8;
          h0 += t0 & 8191;
          t1 = m3[mpos + 2] & 255 | (m3[mpos + 3] & 255) << 8;
          h1 += (t0 >>> 13 | t1 << 3) & 8191;
          t2 = m3[mpos + 4] & 255 | (m3[mpos + 5] & 255) << 8;
          h22 += (t1 >>> 10 | t2 << 6) & 8191;
          t3 = m3[mpos + 6] & 255 | (m3[mpos + 7] & 255) << 8;
          h3 += (t2 >>> 7 | t3 << 9) & 8191;
          t4 = m3[mpos + 8] & 255 | (m3[mpos + 9] & 255) << 8;
          h4 += (t3 >>> 4 | t4 << 12) & 8191;
          h5 += t4 >>> 1 & 8191;
          t5 = m3[mpos + 10] & 255 | (m3[mpos + 11] & 255) << 8;
          h6 += (t4 >>> 14 | t5 << 2) & 8191;
          t6 = m3[mpos + 12] & 255 | (m3[mpos + 13] & 255) << 8;
          h7 += (t5 >>> 11 | t6 << 5) & 8191;
          t7 = m3[mpos + 14] & 255 | (m3[mpos + 15] & 255) << 8;
          h8 += (t6 >>> 8 | t7 << 8) & 8191;
          h9 += t7 >>> 5 | hibit;
          c2 = 0;
          d0 = c2;
          d0 += h0 * r0;
          d0 += h1 * (5 * r9);
          d0 += h22 * (5 * r8);
          d0 += h3 * (5 * r7);
          d0 += h4 * (5 * r6);
          c2 = d0 >>> 13;
          d0 &= 8191;
          d0 += h5 * (5 * r5);
          d0 += h6 * (5 * r4);
          d0 += h7 * (5 * r3);
          d0 += h8 * (5 * r2);
          d0 += h9 * (5 * r1);
          c2 += d0 >>> 13;
          d0 &= 8191;
          d1 = c2;
          d1 += h0 * r1;
          d1 += h1 * r0;
          d1 += h22 * (5 * r9);
          d1 += h3 * (5 * r8);
          d1 += h4 * (5 * r7);
          c2 = d1 >>> 13;
          d1 &= 8191;
          d1 += h5 * (5 * r6);
          d1 += h6 * (5 * r5);
          d1 += h7 * (5 * r4);
          d1 += h8 * (5 * r3);
          d1 += h9 * (5 * r2);
          c2 += d1 >>> 13;
          d1 &= 8191;
          d22 = c2;
          d22 += h0 * r2;
          d22 += h1 * r1;
          d22 += h22 * r0;
          d22 += h3 * (5 * r9);
          d22 += h4 * (5 * r8);
          c2 = d22 >>> 13;
          d22 &= 8191;
          d22 += h5 * (5 * r7);
          d22 += h6 * (5 * r6);
          d22 += h7 * (5 * r5);
          d22 += h8 * (5 * r4);
          d22 += h9 * (5 * r3);
          c2 += d22 >>> 13;
          d22 &= 8191;
          d3 = c2;
          d3 += h0 * r3;
          d3 += h1 * r2;
          d3 += h22 * r1;
          d3 += h3 * r0;
          d3 += h4 * (5 * r9);
          c2 = d3 >>> 13;
          d3 &= 8191;
          d3 += h5 * (5 * r8);
          d3 += h6 * (5 * r7);
          d3 += h7 * (5 * r6);
          d3 += h8 * (5 * r5);
          d3 += h9 * (5 * r4);
          c2 += d3 >>> 13;
          d3 &= 8191;
          d4 = c2;
          d4 += h0 * r4;
          d4 += h1 * r3;
          d4 += h22 * r2;
          d4 += h3 * r1;
          d4 += h4 * r0;
          c2 = d4 >>> 13;
          d4 &= 8191;
          d4 += h5 * (5 * r9);
          d4 += h6 * (5 * r8);
          d4 += h7 * (5 * r7);
          d4 += h8 * (5 * r6);
          d4 += h9 * (5 * r5);
          c2 += d4 >>> 13;
          d4 &= 8191;
          d5 = c2;
          d5 += h0 * r5;
          d5 += h1 * r4;
          d5 += h22 * r3;
          d5 += h3 * r2;
          d5 += h4 * r1;
          c2 = d5 >>> 13;
          d5 &= 8191;
          d5 += h5 * r0;
          d5 += h6 * (5 * r9);
          d5 += h7 * (5 * r8);
          d5 += h8 * (5 * r7);
          d5 += h9 * (5 * r6);
          c2 += d5 >>> 13;
          d5 &= 8191;
          d6 = c2;
          d6 += h0 * r6;
          d6 += h1 * r5;
          d6 += h22 * r4;
          d6 += h3 * r3;
          d6 += h4 * r2;
          c2 = d6 >>> 13;
          d6 &= 8191;
          d6 += h5 * r1;
          d6 += h6 * r0;
          d6 += h7 * (5 * r9);
          d6 += h8 * (5 * r8);
          d6 += h9 * (5 * r7);
          c2 += d6 >>> 13;
          d6 &= 8191;
          d7 = c2;
          d7 += h0 * r7;
          d7 += h1 * r6;
          d7 += h22 * r5;
          d7 += h3 * r4;
          d7 += h4 * r3;
          c2 = d7 >>> 13;
          d7 &= 8191;
          d7 += h5 * r2;
          d7 += h6 * r1;
          d7 += h7 * r0;
          d7 += h8 * (5 * r9);
          d7 += h9 * (5 * r8);
          c2 += d7 >>> 13;
          d7 &= 8191;
          d8 = c2;
          d8 += h0 * r8;
          d8 += h1 * r7;
          d8 += h22 * r6;
          d8 += h3 * r5;
          d8 += h4 * r4;
          c2 = d8 >>> 13;
          d8 &= 8191;
          d8 += h5 * r3;
          d8 += h6 * r2;
          d8 += h7 * r1;
          d8 += h8 * r0;
          d8 += h9 * (5 * r9);
          c2 += d8 >>> 13;
          d8 &= 8191;
          d9 = c2;
          d9 += h0 * r9;
          d9 += h1 * r8;
          d9 += h22 * r7;
          d9 += h3 * r6;
          d9 += h4 * r5;
          c2 = d9 >>> 13;
          d9 &= 8191;
          d9 += h5 * r4;
          d9 += h6 * r3;
          d9 += h7 * r2;
          d9 += h8 * r1;
          d9 += h9 * r0;
          c2 += d9 >>> 13;
          d9 &= 8191;
          c2 = (c2 << 2) + c2 | 0;
          c2 = c2 + d0 | 0;
          d0 = c2 & 8191;
          c2 = c2 >>> 13;
          d1 += c2;
          h0 = d0;
          h1 = d1;
          h22 = d22;
          h3 = d3;
          h4 = d4;
          h5 = d5;
          h6 = d6;
          h7 = d7;
          h8 = d8;
          h9 = d9;
          mpos += 16;
          bytes -= 16;
        }
        this.h[0] = h0;
        this.h[1] = h1;
        this.h[2] = h22;
        this.h[3] = h3;
        this.h[4] = h4;
        this.h[5] = h5;
        this.h[6] = h6;
        this.h[7] = h7;
        this.h[8] = h8;
        this.h[9] = h9;
      };
      poly1305.prototype.finish = function(mac, macpos) {
        var g = new Uint16Array(10);
        var c2, mask, f, i2;
        if (this.leftover) {
          i2 = this.leftover;
          this.buffer[i2++] = 1;
          for (; i2 < 16; i2++) this.buffer[i2] = 0;
          this.fin = 1;
          this.blocks(this.buffer, 0, 16);
        }
        c2 = this.h[1] >>> 13;
        this.h[1] &= 8191;
        for (i2 = 2; i2 < 10; i2++) {
          this.h[i2] += c2;
          c2 = this.h[i2] >>> 13;
          this.h[i2] &= 8191;
        }
        this.h[0] += c2 * 5;
        c2 = this.h[0] >>> 13;
        this.h[0] &= 8191;
        this.h[1] += c2;
        c2 = this.h[1] >>> 13;
        this.h[1] &= 8191;
        this.h[2] += c2;
        g[0] = this.h[0] + 5;
        c2 = g[0] >>> 13;
        g[0] &= 8191;
        for (i2 = 1; i2 < 10; i2++) {
          g[i2] = this.h[i2] + c2;
          c2 = g[i2] >>> 13;
          g[i2] &= 8191;
        }
        g[9] -= 1 << 13;
        mask = (c2 ^ 1) - 1;
        for (i2 = 0; i2 < 10; i2++) g[i2] &= mask;
        mask = ~mask;
        for (i2 = 0; i2 < 10; i2++) this.h[i2] = this.h[i2] & mask | g[i2];
        this.h[0] = (this.h[0] | this.h[1] << 13) & 65535;
        this.h[1] = (this.h[1] >>> 3 | this.h[2] << 10) & 65535;
        this.h[2] = (this.h[2] >>> 6 | this.h[3] << 7) & 65535;
        this.h[3] = (this.h[3] >>> 9 | this.h[4] << 4) & 65535;
        this.h[4] = (this.h[4] >>> 12 | this.h[5] << 1 | this.h[6] << 14) & 65535;
        this.h[5] = (this.h[6] >>> 2 | this.h[7] << 11) & 65535;
        this.h[6] = (this.h[7] >>> 5 | this.h[8] << 8) & 65535;
        this.h[7] = (this.h[8] >>> 8 | this.h[9] << 5) & 65535;
        f = this.h[0] + this.pad[0];
        this.h[0] = f & 65535;
        for (i2 = 1; i2 < 8; i2++) {
          f = (this.h[i2] + this.pad[i2] | 0) + (f >>> 16) | 0;
          this.h[i2] = f & 65535;
        }
        mac[macpos + 0] = this.h[0] >>> 0 & 255;
        mac[macpos + 1] = this.h[0] >>> 8 & 255;
        mac[macpos + 2] = this.h[1] >>> 0 & 255;
        mac[macpos + 3] = this.h[1] >>> 8 & 255;
        mac[macpos + 4] = this.h[2] >>> 0 & 255;
        mac[macpos + 5] = this.h[2] >>> 8 & 255;
        mac[macpos + 6] = this.h[3] >>> 0 & 255;
        mac[macpos + 7] = this.h[3] >>> 8 & 255;
        mac[macpos + 8] = this.h[4] >>> 0 & 255;
        mac[macpos + 9] = this.h[4] >>> 8 & 255;
        mac[macpos + 10] = this.h[5] >>> 0 & 255;
        mac[macpos + 11] = this.h[5] >>> 8 & 255;
        mac[macpos + 12] = this.h[6] >>> 0 & 255;
        mac[macpos + 13] = this.h[6] >>> 8 & 255;
        mac[macpos + 14] = this.h[7] >>> 0 & 255;
        mac[macpos + 15] = this.h[7] >>> 8 & 255;
      };
      poly1305.prototype.update = function(m3, mpos, bytes) {
        var i2, want;
        if (this.leftover) {
          want = 16 - this.leftover;
          if (want > bytes)
            want = bytes;
          for (i2 = 0; i2 < want; i2++)
            this.buffer[this.leftover + i2] = m3[mpos + i2];
          bytes -= want;
          mpos += want;
          this.leftover += want;
          if (this.leftover < 16)
            return;
          this.blocks(this.buffer, 0, 16);
          this.leftover = 0;
        }
        if (bytes >= 16) {
          want = bytes - bytes % 16;
          this.blocks(m3, mpos, want);
          mpos += want;
          bytes -= want;
        }
        if (bytes) {
          for (i2 = 0; i2 < bytes; i2++)
            this.buffer[this.leftover + i2] = m3[mpos + i2];
          this.leftover += bytes;
        }
      };
      function crypto_onetimeauth(out, outpos, m3, mpos, n, k2) {
        var s3 = new poly1305(k2);
        s3.update(m3, mpos, n);
        s3.finish(out, outpos);
        return 0;
      }
      function crypto_onetimeauth_verify(h3, hpos, m3, mpos, n, k2) {
        var x2 = new Uint8Array(16);
        crypto_onetimeauth(x2, 0, m3, mpos, n, k2);
        return crypto_verify_16(h3, hpos, x2, 0);
      }
      function crypto_secretbox(c2, m3, d3, n, k2) {
        var i2;
        if (d3 < 32) return -1;
        crypto_stream_xor(c2, 0, m3, 0, d3, n, k2);
        crypto_onetimeauth(c2, 16, c2, 32, d3 - 32, c2);
        for (i2 = 0; i2 < 16; i2++) c2[i2] = 0;
        return 0;
      }
      function crypto_secretbox_open(m3, c2, d3, n, k2) {
        var i2;
        var x2 = new Uint8Array(32);
        if (d3 < 32) return -1;
        crypto_stream(x2, 0, 32, n, k2);
        if (crypto_onetimeauth_verify(c2, 16, c2, 32, d3 - 32, x2) !== 0) return -1;
        crypto_stream_xor(m3, 0, c2, 0, d3, n, k2);
        for (i2 = 0; i2 < 32; i2++) m3[i2] = 0;
        return 0;
      }
      function set25519(r, a3) {
        var i2;
        for (i2 = 0; i2 < 16; i2++) r[i2] = a3[i2] | 0;
      }
      function car25519(o) {
        var i2, v, c2 = 1;
        for (i2 = 0; i2 < 16; i2++) {
          v = o[i2] + c2 + 65535;
          c2 = Math.floor(v / 65536);
          o[i2] = v - c2 * 65536;
        }
        o[0] += c2 - 1 + 37 * (c2 - 1);
      }
      function sel25519(p, q2, b2) {
        var t2, c2 = ~(b2 - 1);
        for (var i2 = 0; i2 < 16; i2++) {
          t2 = c2 & (p[i2] ^ q2[i2]);
          p[i2] ^= t2;
          q2[i2] ^= t2;
        }
      }
      function pack25519(o, n) {
        var i2, j, b2;
        var m3 = gf(), t2 = gf();
        for (i2 = 0; i2 < 16; i2++) t2[i2] = n[i2];
        car25519(t2);
        car25519(t2);
        car25519(t2);
        for (j = 0; j < 2; j++) {
          m3[0] = t2[0] - 65517;
          for (i2 = 1; i2 < 15; i2++) {
            m3[i2] = t2[i2] - 65535 - (m3[i2 - 1] >> 16 & 1);
            m3[i2 - 1] &= 65535;
          }
          m3[15] = t2[15] - 32767 - (m3[14] >> 16 & 1);
          b2 = m3[15] >> 16 & 1;
          m3[14] &= 65535;
          sel25519(t2, m3, 1 - b2);
        }
        for (i2 = 0; i2 < 16; i2++) {
          o[2 * i2] = t2[i2] & 255;
          o[2 * i2 + 1] = t2[i2] >> 8;
        }
      }
      function neq25519(a3, b2) {
        var c2 = new Uint8Array(32), d3 = new Uint8Array(32);
        pack25519(c2, a3);
        pack25519(d3, b2);
        return crypto_verify_32(c2, 0, d3, 0);
      }
      function par25519(a3) {
        var d3 = new Uint8Array(32);
        pack25519(d3, a3);
        return d3[0] & 1;
      }
      function unpack25519(o, n) {
        var i2;
        for (i2 = 0; i2 < 16; i2++) o[i2] = n[2 * i2] + (n[2 * i2 + 1] << 8);
        o[15] &= 32767;
      }
      function A(o, a3, b2) {
        for (var i2 = 0; i2 < 16; i2++) o[i2] = a3[i2] + b2[i2];
      }
      function Z(o, a3, b2) {
        for (var i2 = 0; i2 < 16; i2++) o[i2] = a3[i2] - b2[i2];
      }
      function M3(o, a3, b2) {
        var v, c2, t0 = 0, t1 = 0, t2 = 0, t3 = 0, t4 = 0, t5 = 0, t6 = 0, t7 = 0, t8 = 0, t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0, t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0, t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0, b0 = b2[0], b1 = b2[1], b22 = b2[2], b3 = b2[3], b4 = b2[4], b5 = b2[5], b6 = b2[6], b7 = b2[7], b8 = b2[8], b9 = b2[9], b10 = b2[10], b11 = b2[11], b12 = b2[12], b13 = b2[13], b14 = b2[14], b15 = b2[15];
        v = a3[0];
        t0 += v * b0;
        t1 += v * b1;
        t2 += v * b22;
        t3 += v * b3;
        t4 += v * b4;
        t5 += v * b5;
        t6 += v * b6;
        t7 += v * b7;
        t8 += v * b8;
        t9 += v * b9;
        t10 += v * b10;
        t11 += v * b11;
        t12 += v * b12;
        t13 += v * b13;
        t14 += v * b14;
        t15 += v * b15;
        v = a3[1];
        t1 += v * b0;
        t2 += v * b1;
        t3 += v * b22;
        t4 += v * b3;
        t5 += v * b4;
        t6 += v * b5;
        t7 += v * b6;
        t8 += v * b7;
        t9 += v * b8;
        t10 += v * b9;
        t11 += v * b10;
        t12 += v * b11;
        t13 += v * b12;
        t14 += v * b13;
        t15 += v * b14;
        t16 += v * b15;
        v = a3[2];
        t2 += v * b0;
        t3 += v * b1;
        t4 += v * b22;
        t5 += v * b3;
        t6 += v * b4;
        t7 += v * b5;
        t8 += v * b6;
        t9 += v * b7;
        t10 += v * b8;
        t11 += v * b9;
        t12 += v * b10;
        t13 += v * b11;
        t14 += v * b12;
        t15 += v * b13;
        t16 += v * b14;
        t17 += v * b15;
        v = a3[3];
        t3 += v * b0;
        t4 += v * b1;
        t5 += v * b22;
        t6 += v * b3;
        t7 += v * b4;
        t8 += v * b5;
        t9 += v * b6;
        t10 += v * b7;
        t11 += v * b8;
        t12 += v * b9;
        t13 += v * b10;
        t14 += v * b11;
        t15 += v * b12;
        t16 += v * b13;
        t17 += v * b14;
        t18 += v * b15;
        v = a3[4];
        t4 += v * b0;
        t5 += v * b1;
        t6 += v * b22;
        t7 += v * b3;
        t8 += v * b4;
        t9 += v * b5;
        t10 += v * b6;
        t11 += v * b7;
        t12 += v * b8;
        t13 += v * b9;
        t14 += v * b10;
        t15 += v * b11;
        t16 += v * b12;
        t17 += v * b13;
        t18 += v * b14;
        t19 += v * b15;
        v = a3[5];
        t5 += v * b0;
        t6 += v * b1;
        t7 += v * b22;
        t8 += v * b3;
        t9 += v * b4;
        t10 += v * b5;
        t11 += v * b6;
        t12 += v * b7;
        t13 += v * b8;
        t14 += v * b9;
        t15 += v * b10;
        t16 += v * b11;
        t17 += v * b12;
        t18 += v * b13;
        t19 += v * b14;
        t20 += v * b15;
        v = a3[6];
        t6 += v * b0;
        t7 += v * b1;
        t8 += v * b22;
        t9 += v * b3;
        t10 += v * b4;
        t11 += v * b5;
        t12 += v * b6;
        t13 += v * b7;
        t14 += v * b8;
        t15 += v * b9;
        t16 += v * b10;
        t17 += v * b11;
        t18 += v * b12;
        t19 += v * b13;
        t20 += v * b14;
        t21 += v * b15;
        v = a3[7];
        t7 += v * b0;
        t8 += v * b1;
        t9 += v * b22;
        t10 += v * b3;
        t11 += v * b4;
        t12 += v * b5;
        t13 += v * b6;
        t14 += v * b7;
        t15 += v * b8;
        t16 += v * b9;
        t17 += v * b10;
        t18 += v * b11;
        t19 += v * b12;
        t20 += v * b13;
        t21 += v * b14;
        t22 += v * b15;
        v = a3[8];
        t8 += v * b0;
        t9 += v * b1;
        t10 += v * b22;
        t11 += v * b3;
        t12 += v * b4;
        t13 += v * b5;
        t14 += v * b6;
        t15 += v * b7;
        t16 += v * b8;
        t17 += v * b9;
        t18 += v * b10;
        t19 += v * b11;
        t20 += v * b12;
        t21 += v * b13;
        t22 += v * b14;
        t23 += v * b15;
        v = a3[9];
        t9 += v * b0;
        t10 += v * b1;
        t11 += v * b22;
        t12 += v * b3;
        t13 += v * b4;
        t14 += v * b5;
        t15 += v * b6;
        t16 += v * b7;
        t17 += v * b8;
        t18 += v * b9;
        t19 += v * b10;
        t20 += v * b11;
        t21 += v * b12;
        t22 += v * b13;
        t23 += v * b14;
        t24 += v * b15;
        v = a3[10];
        t10 += v * b0;
        t11 += v * b1;
        t12 += v * b22;
        t13 += v * b3;
        t14 += v * b4;
        t15 += v * b5;
        t16 += v * b6;
        t17 += v * b7;
        t18 += v * b8;
        t19 += v * b9;
        t20 += v * b10;
        t21 += v * b11;
        t22 += v * b12;
        t23 += v * b13;
        t24 += v * b14;
        t25 += v * b15;
        v = a3[11];
        t11 += v * b0;
        t12 += v * b1;
        t13 += v * b22;
        t14 += v * b3;
        t15 += v * b4;
        t16 += v * b5;
        t17 += v * b6;
        t18 += v * b7;
        t19 += v * b8;
        t20 += v * b9;
        t21 += v * b10;
        t22 += v * b11;
        t23 += v * b12;
        t24 += v * b13;
        t25 += v * b14;
        t26 += v * b15;
        v = a3[12];
        t12 += v * b0;
        t13 += v * b1;
        t14 += v * b22;
        t15 += v * b3;
        t16 += v * b4;
        t17 += v * b5;
        t18 += v * b6;
        t19 += v * b7;
        t20 += v * b8;
        t21 += v * b9;
        t22 += v * b10;
        t23 += v * b11;
        t24 += v * b12;
        t25 += v * b13;
        t26 += v * b14;
        t27 += v * b15;
        v = a3[13];
        t13 += v * b0;
        t14 += v * b1;
        t15 += v * b22;
        t16 += v * b3;
        t17 += v * b4;
        t18 += v * b5;
        t19 += v * b6;
        t20 += v * b7;
        t21 += v * b8;
        t22 += v * b9;
        t23 += v * b10;
        t24 += v * b11;
        t25 += v * b12;
        t26 += v * b13;
        t27 += v * b14;
        t28 += v * b15;
        v = a3[14];
        t14 += v * b0;
        t15 += v * b1;
        t16 += v * b22;
        t17 += v * b3;
        t18 += v * b4;
        t19 += v * b5;
        t20 += v * b6;
        t21 += v * b7;
        t22 += v * b8;
        t23 += v * b9;
        t24 += v * b10;
        t25 += v * b11;
        t26 += v * b12;
        t27 += v * b13;
        t28 += v * b14;
        t29 += v * b15;
        v = a3[15];
        t15 += v * b0;
        t16 += v * b1;
        t17 += v * b22;
        t18 += v * b3;
        t19 += v * b4;
        t20 += v * b5;
        t21 += v * b6;
        t22 += v * b7;
        t23 += v * b8;
        t24 += v * b9;
        t25 += v * b10;
        t26 += v * b11;
        t27 += v * b12;
        t28 += v * b13;
        t29 += v * b14;
        t30 += v * b15;
        t0 += 38 * t16;
        t1 += 38 * t17;
        t2 += 38 * t18;
        t3 += 38 * t19;
        t4 += 38 * t20;
        t5 += 38 * t21;
        t6 += 38 * t22;
        t7 += 38 * t23;
        t8 += 38 * t24;
        t9 += 38 * t25;
        t10 += 38 * t26;
        t11 += 38 * t27;
        t12 += 38 * t28;
        t13 += 38 * t29;
        t14 += 38 * t30;
        c2 = 1;
        v = t0 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t0 = v - c2 * 65536;
        v = t1 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t1 = v - c2 * 65536;
        v = t2 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t2 = v - c2 * 65536;
        v = t3 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t3 = v - c2 * 65536;
        v = t4 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t4 = v - c2 * 65536;
        v = t5 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t5 = v - c2 * 65536;
        v = t6 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t6 = v - c2 * 65536;
        v = t7 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t7 = v - c2 * 65536;
        v = t8 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t8 = v - c2 * 65536;
        v = t9 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t9 = v - c2 * 65536;
        v = t10 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t10 = v - c2 * 65536;
        v = t11 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t11 = v - c2 * 65536;
        v = t12 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t12 = v - c2 * 65536;
        v = t13 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t13 = v - c2 * 65536;
        v = t14 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t14 = v - c2 * 65536;
        v = t15 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t15 = v - c2 * 65536;
        t0 += c2 - 1 + 37 * (c2 - 1);
        c2 = 1;
        v = t0 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t0 = v - c2 * 65536;
        v = t1 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t1 = v - c2 * 65536;
        v = t2 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t2 = v - c2 * 65536;
        v = t3 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t3 = v - c2 * 65536;
        v = t4 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t4 = v - c2 * 65536;
        v = t5 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t5 = v - c2 * 65536;
        v = t6 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t6 = v - c2 * 65536;
        v = t7 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t7 = v - c2 * 65536;
        v = t8 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t8 = v - c2 * 65536;
        v = t9 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t9 = v - c2 * 65536;
        v = t10 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t10 = v - c2 * 65536;
        v = t11 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t11 = v - c2 * 65536;
        v = t12 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t12 = v - c2 * 65536;
        v = t13 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t13 = v - c2 * 65536;
        v = t14 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t14 = v - c2 * 65536;
        v = t15 + c2 + 65535;
        c2 = Math.floor(v / 65536);
        t15 = v - c2 * 65536;
        t0 += c2 - 1 + 37 * (c2 - 1);
        o[0] = t0;
        o[1] = t1;
        o[2] = t2;
        o[3] = t3;
        o[4] = t4;
        o[5] = t5;
        o[6] = t6;
        o[7] = t7;
        o[8] = t8;
        o[9] = t9;
        o[10] = t10;
        o[11] = t11;
        o[12] = t12;
        o[13] = t13;
        o[14] = t14;
        o[15] = t15;
      }
      function S3(o, a3) {
        M3(o, a3, a3);
      }
      function inv25519(o, i2) {
        var c2 = gf();
        var a3;
        for (a3 = 0; a3 < 16; a3++) c2[a3] = i2[a3];
        for (a3 = 253; a3 >= 0; a3--) {
          S3(c2, c2);
          if (a3 !== 2 && a3 !== 4) M3(c2, c2, i2);
        }
        for (a3 = 0; a3 < 16; a3++) o[a3] = c2[a3];
      }
      function pow2523(o, i2) {
        var c2 = gf();
        var a3;
        for (a3 = 0; a3 < 16; a3++) c2[a3] = i2[a3];
        for (a3 = 250; a3 >= 0; a3--) {
          S3(c2, c2);
          if (a3 !== 1) M3(c2, c2, i2);
        }
        for (a3 = 0; a3 < 16; a3++) o[a3] = c2[a3];
      }
      function crypto_scalarmult(q2, n, p) {
        var z2 = new Uint8Array(32);
        var x2 = new Float64Array(80), r, i2;
        var a3 = gf(), b2 = gf(), c2 = gf(), d3 = gf(), e2 = gf(), f = gf();
        for (i2 = 0; i2 < 31; i2++) z2[i2] = n[i2];
        z2[31] = n[31] & 127 | 64;
        z2[0] &= 248;
        unpack25519(x2, p);
        for (i2 = 0; i2 < 16; i2++) {
          b2[i2] = x2[i2];
          d3[i2] = a3[i2] = c2[i2] = 0;
        }
        a3[0] = d3[0] = 1;
        for (i2 = 254; i2 >= 0; --i2) {
          r = z2[i2 >>> 3] >>> (i2 & 7) & 1;
          sel25519(a3, b2, r);
          sel25519(c2, d3, r);
          A(e2, a3, c2);
          Z(a3, a3, c2);
          A(c2, b2, d3);
          Z(b2, b2, d3);
          S3(d3, e2);
          S3(f, a3);
          M3(a3, c2, a3);
          M3(c2, b2, e2);
          A(e2, a3, c2);
          Z(a3, a3, c2);
          S3(b2, a3);
          Z(c2, d3, f);
          M3(a3, c2, _121665);
          A(a3, a3, d3);
          M3(c2, c2, a3);
          M3(a3, d3, f);
          M3(d3, b2, x2);
          S3(b2, e2);
          sel25519(a3, b2, r);
          sel25519(c2, d3, r);
        }
        for (i2 = 0; i2 < 16; i2++) {
          x2[i2 + 16] = a3[i2];
          x2[i2 + 32] = c2[i2];
          x2[i2 + 48] = b2[i2];
          x2[i2 + 64] = d3[i2];
        }
        var x32 = x2.subarray(32);
        var x16 = x2.subarray(16);
        inv25519(x32, x32);
        M3(x16, x16, x32);
        pack25519(q2, x16);
        return 0;
      }
      function crypto_scalarmult_base(q2, n) {
        return crypto_scalarmult(q2, n, _9);
      }
      function crypto_box_keypair(y3, x2) {
        randombytes(x2, 32);
        return crypto_scalarmult_base(y3, x2);
      }
      function crypto_box_beforenm(k2, y3, x2) {
        var s3 = new Uint8Array(32);
        crypto_scalarmult(s3, x2, y3);
        return crypto_core_hsalsa20(k2, _0, s3, sigma);
      }
      var crypto_box_afternm = crypto_secretbox;
      var crypto_box_open_afternm = crypto_secretbox_open;
      function crypto_box(c2, m3, d3, n, y3, x2) {
        var k2 = new Uint8Array(32);
        crypto_box_beforenm(k2, y3, x2);
        return crypto_box_afternm(c2, m3, d3, n, k2);
      }
      function crypto_box_open(m3, c2, d3, n, y3, x2) {
        var k2 = new Uint8Array(32);
        crypto_box_beforenm(k2, y3, x2);
        return crypto_box_open_afternm(m3, c2, d3, n, k2);
      }
      var K2 = [
        1116352408,
        3609767458,
        1899447441,
        602891725,
        3049323471,
        3964484399,
        3921009573,
        2173295548,
        961987163,
        4081628472,
        1508970993,
        3053834265,
        2453635748,
        2937671579,
        2870763221,
        3664609560,
        3624381080,
        2734883394,
        310598401,
        1164996542,
        607225278,
        1323610764,
        1426881987,
        3590304994,
        1925078388,
        4068182383,
        2162078206,
        991336113,
        2614888103,
        633803317,
        3248222580,
        3479774868,
        3835390401,
        2666613458,
        4022224774,
        944711139,
        264347078,
        2341262773,
        604807628,
        2007800933,
        770255983,
        1495990901,
        1249150122,
        1856431235,
        1555081692,
        3175218132,
        1996064986,
        2198950837,
        2554220882,
        3999719339,
        2821834349,
        766784016,
        2952996808,
        2566594879,
        3210313671,
        3203337956,
        3336571891,
        1034457026,
        3584528711,
        2466948901,
        113926993,
        3758326383,
        338241895,
        168717936,
        666307205,
        1188179964,
        773529912,
        1546045734,
        1294757372,
        1522805485,
        1396182291,
        2643833823,
        1695183700,
        2343527390,
        1986661051,
        1014477480,
        2177026350,
        1206759142,
        2456956037,
        344077627,
        2730485921,
        1290863460,
        2820302411,
        3158454273,
        3259730800,
        3505952657,
        3345764771,
        106217008,
        3516065817,
        3606008344,
        3600352804,
        1432725776,
        4094571909,
        1467031594,
        275423344,
        851169720,
        430227734,
        3100823752,
        506948616,
        1363258195,
        659060556,
        3750685593,
        883997877,
        3785050280,
        958139571,
        3318307427,
        1322822218,
        3812723403,
        1537002063,
        2003034995,
        1747873779,
        3602036899,
        1955562222,
        1575990012,
        2024104815,
        1125592928,
        2227730452,
        2716904306,
        2361852424,
        442776044,
        2428436474,
        593698344,
        2756734187,
        3733110249,
        3204031479,
        2999351573,
        3329325298,
        3815920427,
        3391569614,
        3928383900,
        3515267271,
        566280711,
        3940187606,
        3454069534,
        4118630271,
        4000239992,
        116418474,
        1914138554,
        174292421,
        2731055270,
        289380356,
        3203993006,
        460393269,
        320620315,
        685471733,
        587496836,
        852142971,
        1086792851,
        1017036298,
        365543100,
        1126000580,
        2618297676,
        1288033470,
        3409855158,
        1501505948,
        4234509866,
        1607167915,
        987167468,
        1816402316,
        1246189591
      ];
      function crypto_hashblocks_hl(hh, hl, m3, n) {
        var wh = new Int32Array(16), wl = new Int32Array(16), bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7, bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7, th, tl, i2, j, h3, l, a3, b2, c2, d3;
        var ah0 = hh[0], ah1 = hh[1], ah2 = hh[2], ah3 = hh[3], ah4 = hh[4], ah5 = hh[5], ah6 = hh[6], ah7 = hh[7], al0 = hl[0], al1 = hl[1], al2 = hl[2], al3 = hl[3], al4 = hl[4], al5 = hl[5], al6 = hl[6], al7 = hl[7];
        var pos = 0;
        while (n >= 128) {
          for (i2 = 0; i2 < 16; i2++) {
            j = 8 * i2 + pos;
            wh[i2] = m3[j + 0] << 24 | m3[j + 1] << 16 | m3[j + 2] << 8 | m3[j + 3];
            wl[i2] = m3[j + 4] << 24 | m3[j + 5] << 16 | m3[j + 6] << 8 | m3[j + 7];
          }
          for (i2 = 0; i2 < 80; i2++) {
            bh0 = ah0;
            bh1 = ah1;
            bh2 = ah2;
            bh3 = ah3;
            bh4 = ah4;
            bh5 = ah5;
            bh6 = ah6;
            bh7 = ah7;
            bl0 = al0;
            bl1 = al1;
            bl2 = al2;
            bl3 = al3;
            bl4 = al4;
            bl5 = al5;
            bl6 = al6;
            bl7 = al7;
            h3 = ah7;
            l = al7;
            a3 = l & 65535;
            b2 = l >>> 16;
            c2 = h3 & 65535;
            d3 = h3 >>> 16;
            h3 = (ah4 >>> 14 | al4 << 32 - 14) ^ (ah4 >>> 18 | al4 << 32 - 18) ^ (al4 >>> 41 - 32 | ah4 << 32 - (41 - 32));
            l = (al4 >>> 14 | ah4 << 32 - 14) ^ (al4 >>> 18 | ah4 << 32 - 18) ^ (ah4 >>> 41 - 32 | al4 << 32 - (41 - 32));
            a3 += l & 65535;
            b2 += l >>> 16;
            c2 += h3 & 65535;
            d3 += h3 >>> 16;
            h3 = ah4 & ah5 ^ ~ah4 & ah6;
            l = al4 & al5 ^ ~al4 & al6;
            a3 += l & 65535;
            b2 += l >>> 16;
            c2 += h3 & 65535;
            d3 += h3 >>> 16;
            h3 = K2[i2 * 2];
            l = K2[i2 * 2 + 1];
            a3 += l & 65535;
            b2 += l >>> 16;
            c2 += h3 & 65535;
            d3 += h3 >>> 16;
            h3 = wh[i2 % 16];
            l = wl[i2 % 16];
            a3 += l & 65535;
            b2 += l >>> 16;
            c2 += h3 & 65535;
            d3 += h3 >>> 16;
            b2 += a3 >>> 16;
            c2 += b2 >>> 16;
            d3 += c2 >>> 16;
            th = c2 & 65535 | d3 << 16;
            tl = a3 & 65535 | b2 << 16;
            h3 = th;
            l = tl;
            a3 = l & 65535;
            b2 = l >>> 16;
            c2 = h3 & 65535;
            d3 = h3 >>> 16;
            h3 = (ah0 >>> 28 | al0 << 32 - 28) ^ (al0 >>> 34 - 32 | ah0 << 32 - (34 - 32)) ^ (al0 >>> 39 - 32 | ah0 << 32 - (39 - 32));
            l = (al0 >>> 28 | ah0 << 32 - 28) ^ (ah0 >>> 34 - 32 | al0 << 32 - (34 - 32)) ^ (ah0 >>> 39 - 32 | al0 << 32 - (39 - 32));
            a3 += l & 65535;
            b2 += l >>> 16;
            c2 += h3 & 65535;
            d3 += h3 >>> 16;
            h3 = ah0 & ah1 ^ ah0 & ah2 ^ ah1 & ah2;
            l = al0 & al1 ^ al0 & al2 ^ al1 & al2;
            a3 += l & 65535;
            b2 += l >>> 16;
            c2 += h3 & 65535;
            d3 += h3 >>> 16;
            b2 += a3 >>> 16;
            c2 += b2 >>> 16;
            d3 += c2 >>> 16;
            bh7 = c2 & 65535 | d3 << 16;
            bl7 = a3 & 65535 | b2 << 16;
            h3 = bh3;
            l = bl3;
            a3 = l & 65535;
            b2 = l >>> 16;
            c2 = h3 & 65535;
            d3 = h3 >>> 16;
            h3 = th;
            l = tl;
            a3 += l & 65535;
            b2 += l >>> 16;
            c2 += h3 & 65535;
            d3 += h3 >>> 16;
            b2 += a3 >>> 16;
            c2 += b2 >>> 16;
            d3 += c2 >>> 16;
            bh3 = c2 & 65535 | d3 << 16;
            bl3 = a3 & 65535 | b2 << 16;
            ah1 = bh0;
            ah2 = bh1;
            ah3 = bh2;
            ah4 = bh3;
            ah5 = bh4;
            ah6 = bh5;
            ah7 = bh6;
            ah0 = bh7;
            al1 = bl0;
            al2 = bl1;
            al3 = bl2;
            al4 = bl3;
            al5 = bl4;
            al6 = bl5;
            al7 = bl6;
            al0 = bl7;
            if (i2 % 16 === 15) {
              for (j = 0; j < 16; j++) {
                h3 = wh[j];
                l = wl[j];
                a3 = l & 65535;
                b2 = l >>> 16;
                c2 = h3 & 65535;
                d3 = h3 >>> 16;
                h3 = wh[(j + 9) % 16];
                l = wl[(j + 9) % 16];
                a3 += l & 65535;
                b2 += l >>> 16;
                c2 += h3 & 65535;
                d3 += h3 >>> 16;
                th = wh[(j + 1) % 16];
                tl = wl[(j + 1) % 16];
                h3 = (th >>> 1 | tl << 32 - 1) ^ (th >>> 8 | tl << 32 - 8) ^ th >>> 7;
                l = (tl >>> 1 | th << 32 - 1) ^ (tl >>> 8 | th << 32 - 8) ^ (tl >>> 7 | th << 32 - 7);
                a3 += l & 65535;
                b2 += l >>> 16;
                c2 += h3 & 65535;
                d3 += h3 >>> 16;
                th = wh[(j + 14) % 16];
                tl = wl[(j + 14) % 16];
                h3 = (th >>> 19 | tl << 32 - 19) ^ (tl >>> 61 - 32 | th << 32 - (61 - 32)) ^ th >>> 6;
                l = (tl >>> 19 | th << 32 - 19) ^ (th >>> 61 - 32 | tl << 32 - (61 - 32)) ^ (tl >>> 6 | th << 32 - 6);
                a3 += l & 65535;
                b2 += l >>> 16;
                c2 += h3 & 65535;
                d3 += h3 >>> 16;
                b2 += a3 >>> 16;
                c2 += b2 >>> 16;
                d3 += c2 >>> 16;
                wh[j] = c2 & 65535 | d3 << 16;
                wl[j] = a3 & 65535 | b2 << 16;
              }
            }
          }
          h3 = ah0;
          l = al0;
          a3 = l & 65535;
          b2 = l >>> 16;
          c2 = h3 & 65535;
          d3 = h3 >>> 16;
          h3 = hh[0];
          l = hl[0];
          a3 += l & 65535;
          b2 += l >>> 16;
          c2 += h3 & 65535;
          d3 += h3 >>> 16;
          b2 += a3 >>> 16;
          c2 += b2 >>> 16;
          d3 += c2 >>> 16;
          hh[0] = ah0 = c2 & 65535 | d3 << 16;
          hl[0] = al0 = a3 & 65535 | b2 << 16;
          h3 = ah1;
          l = al1;
          a3 = l & 65535;
          b2 = l >>> 16;
          c2 = h3 & 65535;
          d3 = h3 >>> 16;
          h3 = hh[1];
          l = hl[1];
          a3 += l & 65535;
          b2 += l >>> 16;
          c2 += h3 & 65535;
          d3 += h3 >>> 16;
          b2 += a3 >>> 16;
          c2 += b2 >>> 16;
          d3 += c2 >>> 16;
          hh[1] = ah1 = c2 & 65535 | d3 << 16;
          hl[1] = al1 = a3 & 65535 | b2 << 16;
          h3 = ah2;
          l = al2;
          a3 = l & 65535;
          b2 = l >>> 16;
          c2 = h3 & 65535;
          d3 = h3 >>> 16;
          h3 = hh[2];
          l = hl[2];
          a3 += l & 65535;
          b2 += l >>> 16;
          c2 += h3 & 65535;
          d3 += h3 >>> 16;
          b2 += a3 >>> 16;
          c2 += b2 >>> 16;
          d3 += c2 >>> 16;
          hh[2] = ah2 = c2 & 65535 | d3 << 16;
          hl[2] = al2 = a3 & 65535 | b2 << 16;
          h3 = ah3;
          l = al3;
          a3 = l & 65535;
          b2 = l >>> 16;
          c2 = h3 & 65535;
          d3 = h3 >>> 16;
          h3 = hh[3];
          l = hl[3];
          a3 += l & 65535;
          b2 += l >>> 16;
          c2 += h3 & 65535;
          d3 += h3 >>> 16;
          b2 += a3 >>> 16;
          c2 += b2 >>> 16;
          d3 += c2 >>> 16;
          hh[3] = ah3 = c2 & 65535 | d3 << 16;
          hl[3] = al3 = a3 & 65535 | b2 << 16;
          h3 = ah4;
          l = al4;
          a3 = l & 65535;
          b2 = l >>> 16;
          c2 = h3 & 65535;
          d3 = h3 >>> 16;
          h3 = hh[4];
          l = hl[4];
          a3 += l & 65535;
          b2 += l >>> 16;
          c2 += h3 & 65535;
          d3 += h3 >>> 16;
          b2 += a3 >>> 16;
          c2 += b2 >>> 16;
          d3 += c2 >>> 16;
          hh[4] = ah4 = c2 & 65535 | d3 << 16;
          hl[4] = al4 = a3 & 65535 | b2 << 16;
          h3 = ah5;
          l = al5;
          a3 = l & 65535;
          b2 = l >>> 16;
          c2 = h3 & 65535;
          d3 = h3 >>> 16;
          h3 = hh[5];
          l = hl[5];
          a3 += l & 65535;
          b2 += l >>> 16;
          c2 += h3 & 65535;
          d3 += h3 >>> 16;
          b2 += a3 >>> 16;
          c2 += b2 >>> 16;
          d3 += c2 >>> 16;
          hh[5] = ah5 = c2 & 65535 | d3 << 16;
          hl[5] = al5 = a3 & 65535 | b2 << 16;
          h3 = ah6;
          l = al6;
          a3 = l & 65535;
          b2 = l >>> 16;
          c2 = h3 & 65535;
          d3 = h3 >>> 16;
          h3 = hh[6];
          l = hl[6];
          a3 += l & 65535;
          b2 += l >>> 16;
          c2 += h3 & 65535;
          d3 += h3 >>> 16;
          b2 += a3 >>> 16;
          c2 += b2 >>> 16;
          d3 += c2 >>> 16;
          hh[6] = ah6 = c2 & 65535 | d3 << 16;
          hl[6] = al6 = a3 & 65535 | b2 << 16;
          h3 = ah7;
          l = al7;
          a3 = l & 65535;
          b2 = l >>> 16;
          c2 = h3 & 65535;
          d3 = h3 >>> 16;
          h3 = hh[7];
          l = hl[7];
          a3 += l & 65535;
          b2 += l >>> 16;
          c2 += h3 & 65535;
          d3 += h3 >>> 16;
          b2 += a3 >>> 16;
          c2 += b2 >>> 16;
          d3 += c2 >>> 16;
          hh[7] = ah7 = c2 & 65535 | d3 << 16;
          hl[7] = al7 = a3 & 65535 | b2 << 16;
          pos += 128;
          n -= 128;
        }
        return n;
      }
      function crypto_hash(out, m3, n) {
        var hh = new Int32Array(8), hl = new Int32Array(8), x2 = new Uint8Array(256), i2, b2 = n;
        hh[0] = 1779033703;
        hh[1] = 3144134277;
        hh[2] = 1013904242;
        hh[3] = 2773480762;
        hh[4] = 1359893119;
        hh[5] = 2600822924;
        hh[6] = 528734635;
        hh[7] = 1541459225;
        hl[0] = 4089235720;
        hl[1] = 2227873595;
        hl[2] = 4271175723;
        hl[3] = 1595750129;
        hl[4] = 2917565137;
        hl[5] = 725511199;
        hl[6] = 4215389547;
        hl[7] = 327033209;
        crypto_hashblocks_hl(hh, hl, m3, n);
        n %= 128;
        for (i2 = 0; i2 < n; i2++) x2[i2] = m3[b2 - n + i2];
        x2[n] = 128;
        n = 256 - 128 * (n < 112 ? 1 : 0);
        x2[n - 9] = 0;
        ts64(x2, n - 8, b2 / 536870912 | 0, b2 << 3);
        crypto_hashblocks_hl(hh, hl, x2, n);
        for (i2 = 0; i2 < 8; i2++) ts64(out, 8 * i2, hh[i2], hl[i2]);
        return 0;
      }
      function add2(p, q2) {
        var a3 = gf(), b2 = gf(), c2 = gf(), d3 = gf(), e2 = gf(), f = gf(), g = gf(), h3 = gf(), t2 = gf();
        Z(a3, p[1], p[0]);
        Z(t2, q2[1], q2[0]);
        M3(a3, a3, t2);
        A(b2, p[0], p[1]);
        A(t2, q2[0], q2[1]);
        M3(b2, b2, t2);
        M3(c2, p[3], q2[3]);
        M3(c2, c2, D22);
        M3(d3, p[2], q2[2]);
        A(d3, d3, d3);
        Z(e2, b2, a3);
        Z(f, d3, c2);
        A(g, d3, c2);
        A(h3, b2, a3);
        M3(p[0], e2, f);
        M3(p[1], h3, g);
        M3(p[2], g, f);
        M3(p[3], e2, h3);
      }
      function cswap(p, q2, b2) {
        var i2;
        for (i2 = 0; i2 < 4; i2++) {
          sel25519(p[i2], q2[i2], b2);
        }
      }
      function pack(r, p) {
        var tx = gf(), ty = gf(), zi = gf();
        inv25519(zi, p[2]);
        M3(tx, p[0], zi);
        M3(ty, p[1], zi);
        pack25519(r, ty);
        r[31] ^= par25519(tx) << 7;
      }
      function scalarmult(p, q2, s3) {
        var b2, i2;
        set25519(p[0], gf0);
        set25519(p[1], gf1);
        set25519(p[2], gf1);
        set25519(p[3], gf0);
        for (i2 = 255; i2 >= 0; --i2) {
          b2 = s3[i2 / 8 | 0] >> (i2 & 7) & 1;
          cswap(p, q2, b2);
          add2(q2, p);
          add2(p, p);
          cswap(p, q2, b2);
        }
      }
      function scalarbase(p, s3) {
        var q2 = [gf(), gf(), gf(), gf()];
        set25519(q2[0], X2);
        set25519(q2[1], Y2);
        set25519(q2[2], gf1);
        M3(q2[3], X2, Y2);
        scalarmult(p, q2, s3);
      }
      function crypto_sign_keypair(pk, sk, seeded) {
        var d3 = new Uint8Array(64);
        var p = [gf(), gf(), gf(), gf()];
        var i2;
        if (!seeded) randombytes(sk, 32);
        crypto_hash(d3, sk, 32);
        d3[0] &= 248;
        d3[31] &= 127;
        d3[31] |= 64;
        scalarbase(p, d3);
        pack(pk, p);
        for (i2 = 0; i2 < 32; i2++) sk[i2 + 32] = pk[i2];
        return 0;
      }
      var L2 = new Float64Array([237, 211, 245, 92, 26, 99, 18, 88, 214, 156, 247, 162, 222, 249, 222, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16]);
      function modL(r, x2) {
        var carry, i2, j, k2;
        for (i2 = 63; i2 >= 32; --i2) {
          carry = 0;
          for (j = i2 - 32, k2 = i2 - 12; j < k2; ++j) {
            x2[j] += carry - 16 * x2[i2] * L2[j - (i2 - 32)];
            carry = Math.floor((x2[j] + 128) / 256);
            x2[j] -= carry * 256;
          }
          x2[j] += carry;
          x2[i2] = 0;
        }
        carry = 0;
        for (j = 0; j < 32; j++) {
          x2[j] += carry - (x2[31] >> 4) * L2[j];
          carry = x2[j] >> 8;
          x2[j] &= 255;
        }
        for (j = 0; j < 32; j++) x2[j] -= carry * L2[j];
        for (i2 = 0; i2 < 32; i2++) {
          x2[i2 + 1] += x2[i2] >> 8;
          r[i2] = x2[i2] & 255;
        }
      }
      function reduce(r) {
        var x2 = new Float64Array(64), i2;
        for (i2 = 0; i2 < 64; i2++) x2[i2] = r[i2];
        for (i2 = 0; i2 < 64; i2++) r[i2] = 0;
        modL(r, x2);
      }
      function crypto_sign(sm, m3, n, sk) {
        var d3 = new Uint8Array(64), h3 = new Uint8Array(64), r = new Uint8Array(64);
        var i2, j, x2 = new Float64Array(64);
        var p = [gf(), gf(), gf(), gf()];
        crypto_hash(d3, sk, 32);
        d3[0] &= 248;
        d3[31] &= 127;
        d3[31] |= 64;
        var smlen = n + 64;
        for (i2 = 0; i2 < n; i2++) sm[64 + i2] = m3[i2];
        for (i2 = 0; i2 < 32; i2++) sm[32 + i2] = d3[32 + i2];
        crypto_hash(r, sm.subarray(32), n + 32);
        reduce(r);
        scalarbase(p, r);
        pack(sm, p);
        for (i2 = 32; i2 < 64; i2++) sm[i2] = sk[i2];
        crypto_hash(h3, sm, n + 64);
        reduce(h3);
        for (i2 = 0; i2 < 64; i2++) x2[i2] = 0;
        for (i2 = 0; i2 < 32; i2++) x2[i2] = r[i2];
        for (i2 = 0; i2 < 32; i2++) {
          for (j = 0; j < 32; j++) {
            x2[i2 + j] += h3[i2] * d3[j];
          }
        }
        modL(sm.subarray(32), x2);
        return smlen;
      }
      function unpackneg(r, p) {
        var t2 = gf(), chk = gf(), num = gf(), den = gf(), den2 = gf(), den4 = gf(), den6 = gf();
        set25519(r[2], gf1);
        unpack25519(r[1], p);
        S3(num, r[1]);
        M3(den, num, D2);
        Z(num, num, r[2]);
        A(den, r[2], den);
        S3(den2, den);
        S3(den4, den2);
        M3(den6, den4, den2);
        M3(t2, den6, num);
        M3(t2, t2, den);
        pow2523(t2, t2);
        M3(t2, t2, num);
        M3(t2, t2, den);
        M3(t2, t2, den);
        M3(r[0], t2, den);
        S3(chk, r[0]);
        M3(chk, chk, den);
        if (neq25519(chk, num)) M3(r[0], r[0], I2);
        S3(chk, r[0]);
        M3(chk, chk, den);
        if (neq25519(chk, num)) return -1;
        if (par25519(r[0]) === p[31] >> 7) Z(r[0], gf0, r[0]);
        M3(r[3], r[0], r[1]);
        return 0;
      }
      function crypto_sign_open(m3, sm, n, pk) {
        var i2;
        var t2 = new Uint8Array(32), h3 = new Uint8Array(64);
        var p = [gf(), gf(), gf(), gf()], q2 = [gf(), gf(), gf(), gf()];
        if (n < 64) return -1;
        if (unpackneg(q2, pk)) return -1;
        for (i2 = 0; i2 < n; i2++) m3[i2] = sm[i2];
        for (i2 = 0; i2 < 32; i2++) m3[i2 + 32] = pk[i2];
        crypto_hash(h3, m3, n);
        reduce(h3);
        scalarmult(p, q2, h3);
        scalarbase(q2, sm.subarray(32));
        add2(p, q2);
        pack(t2, p);
        n -= 64;
        if (crypto_verify_32(sm, 0, t2, 0)) {
          for (i2 = 0; i2 < n; i2++) m3[i2] = 0;
          return -1;
        }
        for (i2 = 0; i2 < n; i2++) m3[i2] = sm[i2 + 64];
        return n;
      }
      var crypto_secretbox_KEYBYTES = 32, crypto_secretbox_NONCEBYTES = 24, crypto_secretbox_ZEROBYTES = 32, crypto_secretbox_BOXZEROBYTES = 16, crypto_scalarmult_BYTES = 32, crypto_scalarmult_SCALARBYTES = 32, crypto_box_PUBLICKEYBYTES = 32, crypto_box_SECRETKEYBYTES = 32, crypto_box_BEFORENMBYTES = 32, crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES, crypto_box_ZEROBYTES = crypto_secretbox_ZEROBYTES, crypto_box_BOXZEROBYTES = crypto_secretbox_BOXZEROBYTES, crypto_sign_BYTES = 64, crypto_sign_PUBLICKEYBYTES = 32, crypto_sign_SECRETKEYBYTES = 64, crypto_sign_SEEDBYTES = 32, crypto_hash_BYTES = 64;
      nacl4.lowlevel = {
        crypto_core_hsalsa20,
        crypto_stream_xor,
        crypto_stream,
        crypto_stream_salsa20_xor,
        crypto_stream_salsa20,
        crypto_onetimeauth,
        crypto_onetimeauth_verify,
        crypto_verify_16,
        crypto_verify_32,
        crypto_secretbox,
        crypto_secretbox_open,
        crypto_scalarmult,
        crypto_scalarmult_base,
        crypto_box_beforenm,
        crypto_box_afternm,
        crypto_box,
        crypto_box_open,
        crypto_box_keypair,
        crypto_hash,
        crypto_sign,
        crypto_sign_keypair,
        crypto_sign_open,
        crypto_secretbox_KEYBYTES,
        crypto_secretbox_NONCEBYTES,
        crypto_secretbox_ZEROBYTES,
        crypto_secretbox_BOXZEROBYTES,
        crypto_scalarmult_BYTES,
        crypto_scalarmult_SCALARBYTES,
        crypto_box_PUBLICKEYBYTES,
        crypto_box_SECRETKEYBYTES,
        crypto_box_BEFORENMBYTES,
        crypto_box_NONCEBYTES,
        crypto_box_ZEROBYTES,
        crypto_box_BOXZEROBYTES,
        crypto_sign_BYTES,
        crypto_sign_PUBLICKEYBYTES,
        crypto_sign_SECRETKEYBYTES,
        crypto_sign_SEEDBYTES,
        crypto_hash_BYTES,
        gf,
        D: D2,
        L: L2,
        pack25519,
        unpack25519,
        M: M3,
        A,
        S: S3,
        Z,
        pow2523,
        add: add2,
        set25519,
        modL,
        scalarmult,
        scalarbase
      };
      function checkLengths(k2, n) {
        if (k2.length !== crypto_secretbox_KEYBYTES) throw new Error("bad key size");
        if (n.length !== crypto_secretbox_NONCEBYTES) throw new Error("bad nonce size");
      }
      function checkBoxLengths(pk, sk) {
        if (pk.length !== crypto_box_PUBLICKEYBYTES) throw new Error("bad public key size");
        if (sk.length !== crypto_box_SECRETKEYBYTES) throw new Error("bad secret key size");
      }
      function checkArrayTypes() {
        for (var i2 = 0; i2 < arguments.length; i2++) {
          if (!(arguments[i2] instanceof Uint8Array))
            throw new TypeError("unexpected type, use Uint8Array");
        }
      }
      function cleanup(arr) {
        for (var i2 = 0; i2 < arr.length; i2++) arr[i2] = 0;
      }
      nacl4.randomBytes = function(n) {
        var b2 = new Uint8Array(n);
        randombytes(b2, n);
        return b2;
      };
      nacl4.secretbox = function(msg, nonce, key) {
        checkArrayTypes(msg, nonce, key);
        checkLengths(key, nonce);
        var m3 = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
        var c2 = new Uint8Array(m3.length);
        for (var i2 = 0; i2 < msg.length; i2++) m3[i2 + crypto_secretbox_ZEROBYTES] = msg[i2];
        crypto_secretbox(c2, m3, m3.length, nonce, key);
        return c2.subarray(crypto_secretbox_BOXZEROBYTES);
      };
      nacl4.secretbox.open = function(box, nonce, key) {
        checkArrayTypes(box, nonce, key);
        checkLengths(key, nonce);
        var c2 = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
        var m3 = new Uint8Array(c2.length);
        for (var i2 = 0; i2 < box.length; i2++) c2[i2 + crypto_secretbox_BOXZEROBYTES] = box[i2];
        if (c2.length < 32) return null;
        if (crypto_secretbox_open(m3, c2, c2.length, nonce, key) !== 0) return null;
        return m3.subarray(crypto_secretbox_ZEROBYTES);
      };
      nacl4.secretbox.keyLength = crypto_secretbox_KEYBYTES;
      nacl4.secretbox.nonceLength = crypto_secretbox_NONCEBYTES;
      nacl4.secretbox.overheadLength = crypto_secretbox_BOXZEROBYTES;
      nacl4.scalarMult = function(n, p) {
        checkArrayTypes(n, p);
        if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error("bad n size");
        if (p.length !== crypto_scalarmult_BYTES) throw new Error("bad p size");
        var q2 = new Uint8Array(crypto_scalarmult_BYTES);
        crypto_scalarmult(q2, n, p);
        return q2;
      };
      nacl4.scalarMult.base = function(n) {
        checkArrayTypes(n);
        if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error("bad n size");
        var q2 = new Uint8Array(crypto_scalarmult_BYTES);
        crypto_scalarmult_base(q2, n);
        return q2;
      };
      nacl4.scalarMult.scalarLength = crypto_scalarmult_SCALARBYTES;
      nacl4.scalarMult.groupElementLength = crypto_scalarmult_BYTES;
      nacl4.box = function(msg, nonce, publicKey, secretKey) {
        var k2 = nacl4.box.before(publicKey, secretKey);
        return nacl4.secretbox(msg, nonce, k2);
      };
      nacl4.box.before = function(publicKey, secretKey) {
        checkArrayTypes(publicKey, secretKey);
        checkBoxLengths(publicKey, secretKey);
        var k2 = new Uint8Array(crypto_box_BEFORENMBYTES);
        crypto_box_beforenm(k2, publicKey, secretKey);
        return k2;
      };
      nacl4.box.after = nacl4.secretbox;
      nacl4.box.open = function(msg, nonce, publicKey, secretKey) {
        var k2 = nacl4.box.before(publicKey, secretKey);
        return nacl4.secretbox.open(msg, nonce, k2);
      };
      nacl4.box.open.after = nacl4.secretbox.open;
      nacl4.box.keyPair = function() {
        var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
        var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
        crypto_box_keypair(pk, sk);
        return { publicKey: pk, secretKey: sk };
      };
      nacl4.box.keyPair.fromSecretKey = function(secretKey) {
        checkArrayTypes(secretKey);
        if (secretKey.length !== crypto_box_SECRETKEYBYTES)
          throw new Error("bad secret key size");
        var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
        crypto_scalarmult_base(pk, secretKey);
        return { publicKey: pk, secretKey: new Uint8Array(secretKey) };
      };
      nacl4.box.publicKeyLength = crypto_box_PUBLICKEYBYTES;
      nacl4.box.secretKeyLength = crypto_box_SECRETKEYBYTES;
      nacl4.box.sharedKeyLength = crypto_box_BEFORENMBYTES;
      nacl4.box.nonceLength = crypto_box_NONCEBYTES;
      nacl4.box.overheadLength = nacl4.secretbox.overheadLength;
      nacl4.sign = function(msg, secretKey) {
        checkArrayTypes(msg, secretKey);
        if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
          throw new Error("bad secret key size");
        var signedMsg = new Uint8Array(crypto_sign_BYTES + msg.length);
        crypto_sign(signedMsg, msg, msg.length, secretKey);
        return signedMsg;
      };
      nacl4.sign.open = function(signedMsg, publicKey) {
        checkArrayTypes(signedMsg, publicKey);
        if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
          throw new Error("bad public key size");
        var tmp = new Uint8Array(signedMsg.length);
        var mlen = crypto_sign_open(tmp, signedMsg, signedMsg.length, publicKey);
        if (mlen < 0) return null;
        var m3 = new Uint8Array(mlen);
        for (var i2 = 0; i2 < m3.length; i2++) m3[i2] = tmp[i2];
        return m3;
      };
      nacl4.sign.detached = function(msg, secretKey) {
        var signedMsg = nacl4.sign(msg, secretKey);
        var sig = new Uint8Array(crypto_sign_BYTES);
        for (var i2 = 0; i2 < sig.length; i2++) sig[i2] = signedMsg[i2];
        return sig;
      };
      nacl4.sign.detached.verify = function(msg, sig, publicKey) {
        checkArrayTypes(msg, sig, publicKey);
        if (sig.length !== crypto_sign_BYTES)
          throw new Error("bad signature size");
        if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
          throw new Error("bad public key size");
        var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
        var m3 = new Uint8Array(crypto_sign_BYTES + msg.length);
        var i2;
        for (i2 = 0; i2 < crypto_sign_BYTES; i2++) sm[i2] = sig[i2];
        for (i2 = 0; i2 < msg.length; i2++) sm[i2 + crypto_sign_BYTES] = msg[i2];
        return crypto_sign_open(m3, sm, sm.length, publicKey) >= 0;
      };
      nacl4.sign.keyPair = function() {
        var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
        var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
        crypto_sign_keypair(pk, sk);
        return { publicKey: pk, secretKey: sk };
      };
      nacl4.sign.keyPair.fromSecretKey = function(secretKey) {
        checkArrayTypes(secretKey);
        if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
          throw new Error("bad secret key size");
        var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
        for (var i2 = 0; i2 < pk.length; i2++) pk[i2] = secretKey[32 + i2];
        return { publicKey: pk, secretKey: new Uint8Array(secretKey) };
      };
      nacl4.sign.keyPair.fromSeed = function(seed) {
        checkArrayTypes(seed);
        if (seed.length !== crypto_sign_SEEDBYTES)
          throw new Error("bad seed size");
        var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
        var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
        for (var i2 = 0; i2 < 32; i2++) sk[i2] = seed[i2];
        crypto_sign_keypair(pk, sk, true);
        return { publicKey: pk, secretKey: sk };
      };
      nacl4.sign.publicKeyLength = crypto_sign_PUBLICKEYBYTES;
      nacl4.sign.secretKeyLength = crypto_sign_SECRETKEYBYTES;
      nacl4.sign.seedLength = crypto_sign_SEEDBYTES;
      nacl4.sign.signatureLength = crypto_sign_BYTES;
      nacl4.hash = function(msg) {
        checkArrayTypes(msg);
        var h3 = new Uint8Array(crypto_hash_BYTES);
        crypto_hash(h3, msg, msg.length);
        return h3;
      };
      nacl4.hash.hashLength = crypto_hash_BYTES;
      nacl4.verify = function(x2, y3) {
        checkArrayTypes(x2, y3);
        if (x2.length === 0 || y3.length === 0) return false;
        if (x2.length !== y3.length) return false;
        return vn(x2, 0, y3, 0, x2.length) === 0 ? true : false;
      };
      nacl4.setPRNG = function(fn) {
        randombytes = fn;
      };
      (function() {
        var crypto = typeof self !== "undefined" ? self.crypto || self.msCrypto : null;
        if (crypto && crypto.getRandomValues) {
          var QUOTA = 65536;
          nacl4.setPRNG(function(x2, n) {
            var i2, v = new Uint8Array(n);
            for (i2 = 0; i2 < n; i2 += QUOTA) {
              crypto.getRandomValues(v.subarray(i2, i2 + Math.min(n - i2, QUOTA)));
            }
            for (i2 = 0; i2 < n; i2++) x2[i2] = v[i2];
            cleanup(v);
          });
        } else if (typeof __require !== "undefined") {
          crypto = require_crypto2();
          if (crypto && crypto.randomBytes) {
            nacl4.setPRNG(function(x2, n) {
              var i2, v = crypto.randomBytes(n);
              for (i2 = 0; i2 < n; i2++) x2[i2] = v[i2];
              cleanup(v);
            });
          }
        }
      })();
    })(typeof module !== "undefined" && module.exports ? module.exports : self.nacl = self.nacl || {});
  }
});

// node_modules/crypto-js/core.js
var require_core = __commonJS({
  "node_modules/crypto-js/core.js"(exports, module) {
    (function(root, factory2) {
      if (typeof exports === "object") {
        module.exports = exports = factory2();
      } else if (typeof define === "function" && define.amd) {
        define([], factory2);
      } else {
        root.CryptoJS = factory2();
      }
    })(exports, function() {
      var CryptoJS = CryptoJS || function(Math2, undefined2) {
        var crypto;
        if (typeof window !== "undefined" && window.crypto) {
          crypto = window.crypto;
        }
        if (typeof self !== "undefined" && self.crypto) {
          crypto = self.crypto;
        }
        if (typeof globalThis !== "undefined" && globalThis.crypto) {
          crypto = globalThis.crypto;
        }
        if (!crypto && typeof window !== "undefined" && window.msCrypto) {
          crypto = window.msCrypto;
        }
        if (!crypto && typeof global !== "undefined" && global.crypto) {
          crypto = global.crypto;
        }
        if (!crypto && typeof __require === "function") {
          try {
            crypto = require_crypto2();
          } catch (err2) {
          }
        }
        var cryptoSecureRandomInt = function() {
          if (crypto) {
            if (typeof crypto.getRandomValues === "function") {
              try {
                return crypto.getRandomValues(new Uint32Array(1))[0];
              } catch (err2) {
              }
            }
            if (typeof crypto.randomBytes === "function") {
              try {
                return crypto.randomBytes(4).readInt32LE();
              } catch (err2) {
              }
            }
          }
          throw new Error("Native crypto module could not be used to get secure random number.");
        };
        var create = Object.create || /* @__PURE__ */ function() {
          function F() {
          }
          return function(obj) {
            var subtype;
            F.prototype = obj;
            subtype = new F();
            F.prototype = null;
            return subtype;
          };
        }();
        var C = {};
        var C_lib = C.lib = {};
        var Base = C_lib.Base = /* @__PURE__ */ function() {
          return {
            /**
             * Creates a new object that inherits from this object.
             *
             * @param {Object} overrides Properties to copy into the new object.
             *
             * @return {Object} The new object.
             *
             * @static
             *
             * @example
             *
             *     var MyType = CryptoJS.lib.Base.extend({
             *         field: 'value',
             *
             *         method: function () {
             *         }
             *     });
             */
            extend: function(overrides) {
              var subtype = create(this);
              if (overrides) {
                subtype.mixIn(overrides);
              }
              if (!subtype.hasOwnProperty("init") || this.init === subtype.init) {
                subtype.init = function() {
                  subtype.$super.init.apply(this, arguments);
                };
              }
              subtype.init.prototype = subtype;
              subtype.$super = this;
              return subtype;
            },
            /**
             * Extends this object and runs the init method.
             * Arguments to create() will be passed to init().
             *
             * @return {Object} The new object.
             *
             * @static
             *
             * @example
             *
             *     var instance = MyType.create();
             */
            create: function() {
              var instance = this.extend();
              instance.init.apply(instance, arguments);
              return instance;
            },
            /**
             * Initializes a newly created object.
             * Override this method to add some logic when your objects are created.
             *
             * @example
             *
             *     var MyType = CryptoJS.lib.Base.extend({
             *         init: function () {
             *             // ...
             *         }
             *     });
             */
            init: function() {
            },
            /**
             * Copies properties into this object.
             *
             * @param {Object} properties The properties to mix in.
             *
             * @example
             *
             *     MyType.mixIn({
             *         field: 'value'
             *     });
             */
            mixIn: function(properties) {
              for (var propertyName in properties) {
                if (properties.hasOwnProperty(propertyName)) {
                  this[propertyName] = properties[propertyName];
                }
              }
              if (properties.hasOwnProperty("toString")) {
                this.toString = properties.toString;
              }
            },
            /**
             * Creates a copy of this object.
             *
             * @return {Object} The clone.
             *
             * @example
             *
             *     var clone = instance.clone();
             */
            clone: function() {
              return this.init.prototype.extend(this);
            }
          };
        }();
        var WordArray = C_lib.WordArray = Base.extend({
          /**
           * Initializes a newly created word array.
           *
           * @param {Array} words (Optional) An array of 32-bit words.
           * @param {number} sigBytes (Optional) The number of significant bytes in the words.
           *
           * @example
           *
           *     var wordArray = CryptoJS.lib.WordArray.create();
           *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607]);
           *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607], 6);
           */
          init: function(words, sigBytes) {
            words = this.words = words || [];
            if (sigBytes != undefined2) {
              this.sigBytes = sigBytes;
            } else {
              this.sigBytes = words.length * 4;
            }
          },
          /**
           * Converts this word array to a string.
           *
           * @param {Encoder} encoder (Optional) The encoding strategy to use. Default: CryptoJS.enc.Hex
           *
           * @return {string} The stringified word array.
           *
           * @example
           *
           *     var string = wordArray + '';
           *     var string = wordArray.toString();
           *     var string = wordArray.toString(CryptoJS.enc.Utf8);
           */
          toString: function(encoder) {
            return (encoder || Hex).stringify(this);
          },
          /**
           * Concatenates a word array to this word array.
           *
           * @param {WordArray} wordArray The word array to append.
           *
           * @return {WordArray} This word array.
           *
           * @example
           *
           *     wordArray1.concat(wordArray2);
           */
          concat: function(wordArray) {
            var thisWords = this.words;
            var thatWords = wordArray.words;
            var thisSigBytes = this.sigBytes;
            var thatSigBytes = wordArray.sigBytes;
            this.clamp();
            if (thisSigBytes % 4) {
              for (var i2 = 0; i2 < thatSigBytes; i2++) {
                var thatByte = thatWords[i2 >>> 2] >>> 24 - i2 % 4 * 8 & 255;
                thisWords[thisSigBytes + i2 >>> 2] |= thatByte << 24 - (thisSigBytes + i2) % 4 * 8;
              }
            } else {
              for (var j = 0; j < thatSigBytes; j += 4) {
                thisWords[thisSigBytes + j >>> 2] = thatWords[j >>> 2];
              }
            }
            this.sigBytes += thatSigBytes;
            return this;
          },
          /**
           * Removes insignificant bits.
           *
           * @example
           *
           *     wordArray.clamp();
           */
          clamp: function() {
            var words = this.words;
            var sigBytes = this.sigBytes;
            words[sigBytes >>> 2] &= 4294967295 << 32 - sigBytes % 4 * 8;
            words.length = Math2.ceil(sigBytes / 4);
          },
          /**
           * Creates a copy of this word array.
           *
           * @return {WordArray} The clone.
           *
           * @example
           *
           *     var clone = wordArray.clone();
           */
          clone: function() {
            var clone = Base.clone.call(this);
            clone.words = this.words.slice(0);
            return clone;
          },
          /**
           * Creates a word array filled with random bytes.
           *
           * @param {number} nBytes The number of random bytes to generate.
           *
           * @return {WordArray} The random word array.
           *
           * @static
           *
           * @example
           *
           *     var wordArray = CryptoJS.lib.WordArray.random(16);
           */
          random: function(nBytes) {
            var words = [];
            for (var i2 = 0; i2 < nBytes; i2 += 4) {
              words.push(cryptoSecureRandomInt());
            }
            return new WordArray.init(words, nBytes);
          }
        });
        var C_enc = C.enc = {};
        var Hex = C_enc.Hex = {
          /**
           * Converts a word array to a hex string.
           *
           * @param {WordArray} wordArray The word array.
           *
           * @return {string} The hex string.
           *
           * @static
           *
           * @example
           *
           *     var hexString = CryptoJS.enc.Hex.stringify(wordArray);
           */
          stringify: function(wordArray) {
            var words = wordArray.words;
            var sigBytes = wordArray.sigBytes;
            var hexChars = [];
            for (var i2 = 0; i2 < sigBytes; i2++) {
              var bite = words[i2 >>> 2] >>> 24 - i2 % 4 * 8 & 255;
              hexChars.push((bite >>> 4).toString(16));
              hexChars.push((bite & 15).toString(16));
            }
            return hexChars.join("");
          },
          /**
           * Converts a hex string to a word array.
           *
           * @param {string} hexStr The hex string.
           *
           * @return {WordArray} The word array.
           *
           * @static
           *
           * @example
           *
           *     var wordArray = CryptoJS.enc.Hex.parse(hexString);
           */
          parse: function(hexStr) {
            var hexStrLength = hexStr.length;
            var words = [];
            for (var i2 = 0; i2 < hexStrLength; i2 += 2) {
              words[i2 >>> 3] |= parseInt(hexStr.substr(i2, 2), 16) << 24 - i2 % 8 * 4;
            }
            return new WordArray.init(words, hexStrLength / 2);
          }
        };
        var Latin1 = C_enc.Latin1 = {
          /**
           * Converts a word array to a Latin1 string.
           *
           * @param {WordArray} wordArray The word array.
           *
           * @return {string} The Latin1 string.
           *
           * @static
           *
           * @example
           *
           *     var latin1String = CryptoJS.enc.Latin1.stringify(wordArray);
           */
          stringify: function(wordArray) {
            var words = wordArray.words;
            var sigBytes = wordArray.sigBytes;
            var latin1Chars = [];
            for (var i2 = 0; i2 < sigBytes; i2++) {
              var bite = words[i2 >>> 2] >>> 24 - i2 % 4 * 8 & 255;
              latin1Chars.push(String.fromCharCode(bite));
            }
            return latin1Chars.join("");
          },
          /**
           * Converts a Latin1 string to a word array.
           *
           * @param {string} latin1Str The Latin1 string.
           *
           * @return {WordArray} The word array.
           *
           * @static
           *
           * @example
           *
           *     var wordArray = CryptoJS.enc.Latin1.parse(latin1String);
           */
          parse: function(latin1Str) {
            var latin1StrLength = latin1Str.length;
            var words = [];
            for (var i2 = 0; i2 < latin1StrLength; i2++) {
              words[i2 >>> 2] |= (latin1Str.charCodeAt(i2) & 255) << 24 - i2 % 4 * 8;
            }
            return new WordArray.init(words, latin1StrLength);
          }
        };
        var Utf8 = C_enc.Utf8 = {
          /**
           * Converts a word array to a UTF-8 string.
           *
           * @param {WordArray} wordArray The word array.
           *
           * @return {string} The UTF-8 string.
           *
           * @static
           *
           * @example
           *
           *     var utf8String = CryptoJS.enc.Utf8.stringify(wordArray);
           */
          stringify: function(wordArray) {
            try {
              return decodeURIComponent(escape(Latin1.stringify(wordArray)));
            } catch (e2) {
              throw new Error("Malformed UTF-8 data");
            }
          },
          /**
           * Converts a UTF-8 string to a word array.
           *
           * @param {string} utf8Str The UTF-8 string.
           *
           * @return {WordArray} The word array.
           *
           * @static
           *
           * @example
           *
           *     var wordArray = CryptoJS.enc.Utf8.parse(utf8String);
           */
          parse: function(utf8Str) {
            return Latin1.parse(unescape(encodeURIComponent(utf8Str)));
          }
        };
        var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm = Base.extend({
          /**
           * Resets this block algorithm's data buffer to its initial state.
           *
           * @example
           *
           *     bufferedBlockAlgorithm.reset();
           */
          reset: function() {
            this._data = new WordArray.init();
            this._nDataBytes = 0;
          },
          /**
           * Adds new data to this block algorithm's buffer.
           *
           * @param {WordArray|string} data The data to append. Strings are converted to a WordArray using UTF-8.
           *
           * @example
           *
           *     bufferedBlockAlgorithm._append('data');
           *     bufferedBlockAlgorithm._append(wordArray);
           */
          _append: function(data) {
            if (typeof data == "string") {
              data = Utf8.parse(data);
            }
            this._data.concat(data);
            this._nDataBytes += data.sigBytes;
          },
          /**
           * Processes available data blocks.
           *
           * This method invokes _doProcessBlock(offset), which must be implemented by a concrete subtype.
           *
           * @param {boolean} doFlush Whether all blocks and partial blocks should be processed.
           *
           * @return {WordArray} The processed data.
           *
           * @example
           *
           *     var processedData = bufferedBlockAlgorithm._process();
           *     var processedData = bufferedBlockAlgorithm._process(!!'flush');
           */
          _process: function(doFlush) {
            var processedWords;
            var data = this._data;
            var dataWords = data.words;
            var dataSigBytes = data.sigBytes;
            var blockSize = this.blockSize;
            var blockSizeBytes = blockSize * 4;
            var nBlocksReady = dataSigBytes / blockSizeBytes;
            if (doFlush) {
              nBlocksReady = Math2.ceil(nBlocksReady);
            } else {
              nBlocksReady = Math2.max((nBlocksReady | 0) - this._minBufferSize, 0);
            }
            var nWordsReady = nBlocksReady * blockSize;
            var nBytesReady = Math2.min(nWordsReady * 4, dataSigBytes);
            if (nWordsReady) {
              for (var offset = 0; offset < nWordsReady; offset += blockSize) {
                this._doProcessBlock(dataWords, offset);
              }
              processedWords = dataWords.splice(0, nWordsReady);
              data.sigBytes -= nBytesReady;
            }
            return new WordArray.init(processedWords, nBytesReady);
          },
          /**
           * Creates a copy of this object.
           *
           * @return {Object} The clone.
           *
           * @example
           *
           *     var clone = bufferedBlockAlgorithm.clone();
           */
          clone: function() {
            var clone = Base.clone.call(this);
            clone._data = this._data.clone();
            return clone;
          },
          _minBufferSize: 0
        });
        var Hasher = C_lib.Hasher = BufferedBlockAlgorithm.extend({
          /**
           * Configuration options.
           */
          cfg: Base.extend(),
          /**
           * Initializes a newly created hasher.
           *
           * @param {Object} cfg (Optional) The configuration options to use for this hash computation.
           *
           * @example
           *
           *     var hasher = CryptoJS.algo.SHA256.create();
           */
          init: function(cfg) {
            this.cfg = this.cfg.extend(cfg);
            this.reset();
          },
          /**
           * Resets this hasher to its initial state.
           *
           * @example
           *
           *     hasher.reset();
           */
          reset: function() {
            BufferedBlockAlgorithm.reset.call(this);
            this._doReset();
          },
          /**
           * Updates this hasher with a message.
           *
           * @param {WordArray|string} messageUpdate The message to append.
           *
           * @return {Hasher} This hasher.
           *
           * @example
           *
           *     hasher.update('message');
           *     hasher.update(wordArray);
           */
          update: function(messageUpdate) {
            this._append(messageUpdate);
            this._process();
            return this;
          },
          /**
           * Finalizes the hash computation.
           * Note that the finalize operation is effectively a destructive, read-once operation.
           *
           * @param {WordArray|string} messageUpdate (Optional) A final message update.
           *
           * @return {WordArray} The hash.
           *
           * @example
           *
           *     var hash = hasher.finalize();
           *     var hash = hasher.finalize('message');
           *     var hash = hasher.finalize(wordArray);
           */
          finalize: function(messageUpdate) {
            if (messageUpdate) {
              this._append(messageUpdate);
            }
            var hash = this._doFinalize();
            return hash;
          },
          blockSize: 512 / 32,
          /**
           * Creates a shortcut function to a hasher's object interface.
           *
           * @param {Hasher} hasher The hasher to create a helper for.
           *
           * @return {Function} The shortcut function.
           *
           * @static
           *
           * @example
           *
           *     var SHA256 = CryptoJS.lib.Hasher._createHelper(CryptoJS.algo.SHA256);
           */
          _createHelper: function(hasher) {
            return function(message, cfg) {
              return new hasher.init(cfg).finalize(message);
            };
          },
          /**
           * Creates a shortcut function to the HMAC's object interface.
           *
           * @param {Hasher} hasher The hasher to use in this HMAC helper.
           *
           * @return {Function} The shortcut function.
           *
           * @static
           *
           * @example
           *
           *     var HmacSHA256 = CryptoJS.lib.Hasher._createHmacHelper(CryptoJS.algo.SHA256);
           */
          _createHmacHelper: function(hasher) {
            return function(message, key) {
              return new C_algo.HMAC.init(hasher, key).finalize(message);
            };
          }
        });
        var C_algo = C.algo = {};
        return C;
      }(Math);
      return CryptoJS;
    });
  }
});

// node_modules/crypto-js/sha256.js
var require_sha256 = __commonJS({
  "node_modules/crypto-js/sha256.js"(exports, module) {
    (function(root, factory2) {
      if (typeof exports === "object") {
        module.exports = exports = factory2(require_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core"], factory2);
      } else {
        factory2(root.CryptoJS);
      }
    })(exports, function(CryptoJS) {
      (function(Math2) {
        var C = CryptoJS;
        var C_lib = C.lib;
        var WordArray = C_lib.WordArray;
        var Hasher = C_lib.Hasher;
        var C_algo = C.algo;
        var H3 = [];
        var K2 = [];
        (function() {
          function isPrime(n2) {
            var sqrtN = Math2.sqrt(n2);
            for (var factor = 2; factor <= sqrtN; factor++) {
              if (!(n2 % factor)) {
                return false;
              }
            }
            return true;
          }
          function getFractionalBits(n2) {
            return (n2 - (n2 | 0)) * 4294967296 | 0;
          }
          var n = 2;
          var nPrime = 0;
          while (nPrime < 64) {
            if (isPrime(n)) {
              if (nPrime < 8) {
                H3[nPrime] = getFractionalBits(Math2.pow(n, 1 / 2));
              }
              K2[nPrime] = getFractionalBits(Math2.pow(n, 1 / 3));
              nPrime++;
            }
            n++;
          }
        })();
        var W = [];
        var SHA256 = C_algo.SHA256 = Hasher.extend({
          _doReset: function() {
            this._hash = new WordArray.init(H3.slice(0));
          },
          _doProcessBlock: function(M3, offset) {
            var H4 = this._hash.words;
            var a3 = H4[0];
            var b2 = H4[1];
            var c2 = H4[2];
            var d3 = H4[3];
            var e2 = H4[4];
            var f = H4[5];
            var g = H4[6];
            var h3 = H4[7];
            for (var i2 = 0; i2 < 64; i2++) {
              if (i2 < 16) {
                W[i2] = M3[offset + i2] | 0;
              } else {
                var gamma0x = W[i2 - 15];
                var gamma0 = (gamma0x << 25 | gamma0x >>> 7) ^ (gamma0x << 14 | gamma0x >>> 18) ^ gamma0x >>> 3;
                var gamma1x = W[i2 - 2];
                var gamma1 = (gamma1x << 15 | gamma1x >>> 17) ^ (gamma1x << 13 | gamma1x >>> 19) ^ gamma1x >>> 10;
                W[i2] = gamma0 + W[i2 - 7] + gamma1 + W[i2 - 16];
              }
              var ch = e2 & f ^ ~e2 & g;
              var maj = a3 & b2 ^ a3 & c2 ^ b2 & c2;
              var sigma0 = (a3 << 30 | a3 >>> 2) ^ (a3 << 19 | a3 >>> 13) ^ (a3 << 10 | a3 >>> 22);
              var sigma1 = (e2 << 26 | e2 >>> 6) ^ (e2 << 21 | e2 >>> 11) ^ (e2 << 7 | e2 >>> 25);
              var t1 = h3 + sigma1 + ch + K2[i2] + W[i2];
              var t2 = sigma0 + maj;
              h3 = g;
              g = f;
              f = e2;
              e2 = d3 + t1 | 0;
              d3 = c2;
              c2 = b2;
              b2 = a3;
              a3 = t1 + t2 | 0;
            }
            H4[0] = H4[0] + a3 | 0;
            H4[1] = H4[1] + b2 | 0;
            H4[2] = H4[2] + c2 | 0;
            H4[3] = H4[3] + d3 | 0;
            H4[4] = H4[4] + e2 | 0;
            H4[5] = H4[5] + f | 0;
            H4[6] = H4[6] + g | 0;
            H4[7] = H4[7] + h3 | 0;
          },
          _doFinalize: function() {
            var data = this._data;
            var dataWords = data.words;
            var nBitsTotal = this._nDataBytes * 8;
            var nBitsLeft = data.sigBytes * 8;
            dataWords[nBitsLeft >>> 5] |= 128 << 24 - nBitsLeft % 32;
            dataWords[(nBitsLeft + 64 >>> 9 << 4) + 14] = Math2.floor(nBitsTotal / 4294967296);
            dataWords[(nBitsLeft + 64 >>> 9 << 4) + 15] = nBitsTotal;
            data.sigBytes = dataWords.length * 4;
            this._process();
            return this._hash;
          },
          clone: function() {
            var clone = Hasher.clone.call(this);
            clone._hash = this._hash.clone();
            return clone;
          }
        });
        C.SHA256 = Hasher._createHelper(SHA256);
        C.HmacSHA256 = Hasher._createHmacHelper(SHA256);
      })(Math);
      return CryptoJS.SHA256;
    });
  }
});

// node_modules/crypto-js/hmac.js
var require_hmac = __commonJS({
  "node_modules/crypto-js/hmac.js"(exports, module) {
    (function(root, factory2) {
      if (typeof exports === "object") {
        module.exports = exports = factory2(require_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core"], factory2);
      } else {
        factory2(root.CryptoJS);
      }
    })(exports, function(CryptoJS) {
      (function() {
        var C = CryptoJS;
        var C_lib = C.lib;
        var Base = C_lib.Base;
        var C_enc = C.enc;
        var Utf8 = C_enc.Utf8;
        var C_algo = C.algo;
        var HMAC = C_algo.HMAC = Base.extend({
          /**
           * Initializes a newly created HMAC.
           *
           * @param {Hasher} hasher The hash algorithm to use.
           * @param {WordArray|string} key The secret key.
           *
           * @example
           *
           *     var hmacHasher = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, key);
           */
          init: function(hasher, key) {
            hasher = this._hasher = new hasher.init();
            if (typeof key == "string") {
              key = Utf8.parse(key);
            }
            var hasherBlockSize = hasher.blockSize;
            var hasherBlockSizeBytes = hasherBlockSize * 4;
            if (key.sigBytes > hasherBlockSizeBytes) {
              key = hasher.finalize(key);
            }
            key.clamp();
            var oKey = this._oKey = key.clone();
            var iKey = this._iKey = key.clone();
            var oKeyWords = oKey.words;
            var iKeyWords = iKey.words;
            for (var i2 = 0; i2 < hasherBlockSize; i2++) {
              oKeyWords[i2] ^= 1549556828;
              iKeyWords[i2] ^= 909522486;
            }
            oKey.sigBytes = iKey.sigBytes = hasherBlockSizeBytes;
            this.reset();
          },
          /**
           * Resets this HMAC to its initial state.
           *
           * @example
           *
           *     hmacHasher.reset();
           */
          reset: function() {
            var hasher = this._hasher;
            hasher.reset();
            hasher.update(this._iKey);
          },
          /**
           * Updates this HMAC with a message.
           *
           * @param {WordArray|string} messageUpdate The message to append.
           *
           * @return {HMAC} This HMAC instance.
           *
           * @example
           *
           *     hmacHasher.update('message');
           *     hmacHasher.update(wordArray);
           */
          update: function(messageUpdate) {
            this._hasher.update(messageUpdate);
            return this;
          },
          /**
           * Finalizes the HMAC computation.
           * Note that the finalize operation is effectively a destructive, read-once operation.
           *
           * @param {WordArray|string} messageUpdate (Optional) A final message update.
           *
           * @return {WordArray} The HMAC.
           *
           * @example
           *
           *     var hmac = hmacHasher.finalize();
           *     var hmac = hmacHasher.finalize('message');
           *     var hmac = hmacHasher.finalize(wordArray);
           */
          finalize: function(messageUpdate) {
            var hasher = this._hasher;
            var innerHash = hasher.finalize(messageUpdate);
            hasher.reset();
            var hmac = hasher.finalize(this._oKey.clone().concat(innerHash));
            return hmac;
          }
        });
      })();
    });
  }
});

// node_modules/crypto-js/pbkdf2.js
var require_pbkdf2 = __commonJS({
  "node_modules/crypto-js/pbkdf2.js"(exports, module) {
    (function(root, factory2, undef) {
      if (typeof exports === "object") {
        module.exports = exports = factory2(require_core(), require_sha256(), require_hmac());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./sha256", "./hmac"], factory2);
      } else {
        factory2(root.CryptoJS);
      }
    })(exports, function(CryptoJS) {
      (function() {
        var C = CryptoJS;
        var C_lib = C.lib;
        var Base = C_lib.Base;
        var WordArray = C_lib.WordArray;
        var C_algo = C.algo;
        var SHA256 = C_algo.SHA256;
        var HMAC = C_algo.HMAC;
        var PBKDF22 = C_algo.PBKDF2 = Base.extend({
          /**
           * Configuration options.
           *
           * @property {number} keySize The key size in words to generate. Default: 4 (128 bits)
           * @property {Hasher} hasher The hasher to use. Default: SHA256
           * @property {number} iterations The number of iterations to perform. Default: 250000
           */
          cfg: Base.extend({
            keySize: 128 / 32,
            hasher: SHA256,
            iterations: 25e4
          }),
          /**
           * Initializes a newly created key derivation function.
           *
           * @param {Object} cfg (Optional) The configuration options to use for the derivation.
           *
           * @example
           *
           *     var kdf = CryptoJS.algo.PBKDF2.create();
           *     var kdf = CryptoJS.algo.PBKDF2.create({ keySize: 8 });
           *     var kdf = CryptoJS.algo.PBKDF2.create({ keySize: 8, iterations: 1000 });
           */
          init: function(cfg) {
            this.cfg = this.cfg.extend(cfg);
          },
          /**
           * Computes the Password-Based Key Derivation Function 2.
           *
           * @param {WordArray|string} password The password.
           * @param {WordArray|string} salt A salt.
           *
           * @return {WordArray} The derived key.
           *
           * @example
           *
           *     var key = kdf.compute(password, salt);
           */
          compute: function(password, salt) {
            var cfg = this.cfg;
            var hmac = HMAC.create(cfg.hasher, password);
            var derivedKey = WordArray.create();
            var blockIndex = WordArray.create([1]);
            var derivedKeyWords = derivedKey.words;
            var blockIndexWords = blockIndex.words;
            var keySize = cfg.keySize;
            var iterations = cfg.iterations;
            while (derivedKeyWords.length < keySize) {
              var block = hmac.update(salt).finalize(blockIndex);
              hmac.reset();
              var blockWords = block.words;
              var blockWordsLength = blockWords.length;
              var intermediate = block;
              for (var i2 = 1; i2 < iterations; i2++) {
                intermediate = hmac.finalize(intermediate);
                hmac.reset();
                var intermediateWords = intermediate.words;
                for (var j = 0; j < blockWordsLength; j++) {
                  blockWords[j] ^= intermediateWords[j];
                }
              }
              derivedKey.concat(block);
              blockIndexWords[0]++;
            }
            derivedKey.sigBytes = keySize * 4;
            return derivedKey;
          }
        });
        C.PBKDF2 = function(password, salt, cfg) {
          return PBKDF22.create(cfg).compute(password, salt);
        };
      })();
      return CryptoJS.PBKDF2;
    });
  }
});

// node_modules/crypto-js/enc-base64.js
var require_enc_base64 = __commonJS({
  "node_modules/crypto-js/enc-base64.js"(exports, module) {
    (function(root, factory2) {
      if (typeof exports === "object") {
        module.exports = exports = factory2(require_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core"], factory2);
      } else {
        factory2(root.CryptoJS);
      }
    })(exports, function(CryptoJS) {
      (function() {
        var C = CryptoJS;
        var C_lib = C.lib;
        var WordArray = C_lib.WordArray;
        var C_enc = C.enc;
        var Base642 = C_enc.Base64 = {
          /**
           * Converts a word array to a Base64 string.
           *
           * @param {WordArray} wordArray The word array.
           *
           * @return {string} The Base64 string.
           *
           * @static
           *
           * @example
           *
           *     var base64String = CryptoJS.enc.Base64.stringify(wordArray);
           */
          stringify: function(wordArray) {
            var words = wordArray.words;
            var sigBytes = wordArray.sigBytes;
            var map = this._map;
            wordArray.clamp();
            var base64Chars = [];
            for (var i2 = 0; i2 < sigBytes; i2 += 3) {
              var byte1 = words[i2 >>> 2] >>> 24 - i2 % 4 * 8 & 255;
              var byte2 = words[i2 + 1 >>> 2] >>> 24 - (i2 + 1) % 4 * 8 & 255;
              var byte3 = words[i2 + 2 >>> 2] >>> 24 - (i2 + 2) % 4 * 8 & 255;
              var triplet = byte1 << 16 | byte2 << 8 | byte3;
              for (var j = 0; j < 4 && i2 + j * 0.75 < sigBytes; j++) {
                base64Chars.push(map.charAt(triplet >>> 6 * (3 - j) & 63));
              }
            }
            var paddingChar = map.charAt(64);
            if (paddingChar) {
              while (base64Chars.length % 4) {
                base64Chars.push(paddingChar);
              }
            }
            return base64Chars.join("");
          },
          /**
           * Converts a Base64 string to a word array.
           *
           * @param {string} base64Str The Base64 string.
           *
           * @return {WordArray} The word array.
           *
           * @static
           *
           * @example
           *
           *     var wordArray = CryptoJS.enc.Base64.parse(base64String);
           */
          parse: function(base64Str) {
            var base64StrLength = base64Str.length;
            var map = this._map;
            var reverseMap = this._reverseMap;
            if (!reverseMap) {
              reverseMap = this._reverseMap = [];
              for (var j = 0; j < map.length; j++) {
                reverseMap[map.charCodeAt(j)] = j;
              }
            }
            var paddingChar = map.charAt(64);
            if (paddingChar) {
              var paddingIndex = base64Str.indexOf(paddingChar);
              if (paddingIndex !== -1) {
                base64StrLength = paddingIndex;
              }
            }
            return parseLoop(base64Str, base64StrLength, reverseMap);
          },
          _map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
        };
        function parseLoop(base64Str, base64StrLength, reverseMap) {
          var words = [];
          var nBytes = 0;
          for (var i2 = 0; i2 < base64StrLength; i2++) {
            if (i2 % 4) {
              var bits1 = reverseMap[base64Str.charCodeAt(i2 - 1)] << i2 % 4 * 2;
              var bits2 = reverseMap[base64Str.charCodeAt(i2)] >>> 6 - i2 % 4 * 2;
              var bitsCombined = bits1 | bits2;
              words[nBytes >>> 2] |= bitsCombined << 24 - nBytes % 4 * 8;
              nBytes++;
            }
          }
          return WordArray.create(words, nBytes);
        }
      })();
      return CryptoJS.enc.Base64;
    });
  }
});

// node_modules/crypto-js/x64-core.js
var require_x64_core = __commonJS({
  "node_modules/crypto-js/x64-core.js"(exports, module) {
    (function(root, factory2) {
      if (typeof exports === "object") {
        module.exports = exports = factory2(require_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core"], factory2);
      } else {
        factory2(root.CryptoJS);
      }
    })(exports, function(CryptoJS) {
      (function(undefined2) {
        var C = CryptoJS;
        var C_lib = C.lib;
        var Base = C_lib.Base;
        var X32WordArray = C_lib.WordArray;
        var C_x64 = C.x64 = {};
        var X64Word = C_x64.Word = Base.extend({
          /**
           * Initializes a newly created 64-bit word.
           *
           * @param {number} high The high 32 bits.
           * @param {number} low The low 32 bits.
           *
           * @example
           *
           *     var x64Word = CryptoJS.x64.Word.create(0x00010203, 0x04050607);
           */
          init: function(high, low) {
            this.high = high;
            this.low = low;
          }
          /**
           * Bitwise NOTs this word.
           *
           * @return {X64Word} A new x64-Word object after negating.
           *
           * @example
           *
           *     var negated = x64Word.not();
           */
          // not: function () {
          // var high = ~this.high;
          // var low = ~this.low;
          // return X64Word.create(high, low);
          // },
          /**
           * Bitwise ANDs this word with the passed word.
           *
           * @param {X64Word} word The x64-Word to AND with this word.
           *
           * @return {X64Word} A new x64-Word object after ANDing.
           *
           * @example
           *
           *     var anded = x64Word.and(anotherX64Word);
           */
          // and: function (word) {
          // var high = this.high & word.high;
          // var low = this.low & word.low;
          // return X64Word.create(high, low);
          // },
          /**
           * Bitwise ORs this word with the passed word.
           *
           * @param {X64Word} word The x64-Word to OR with this word.
           *
           * @return {X64Word} A new x64-Word object after ORing.
           *
           * @example
           *
           *     var ored = x64Word.or(anotherX64Word);
           */
          // or: function (word) {
          // var high = this.high | word.high;
          // var low = this.low | word.low;
          // return X64Word.create(high, low);
          // },
          /**
           * Bitwise XORs this word with the passed word.
           *
           * @param {X64Word} word The x64-Word to XOR with this word.
           *
           * @return {X64Word} A new x64-Word object after XORing.
           *
           * @example
           *
           *     var xored = x64Word.xor(anotherX64Word);
           */
          // xor: function (word) {
          // var high = this.high ^ word.high;
          // var low = this.low ^ word.low;
          // return X64Word.create(high, low);
          // },
          /**
           * Shifts this word n bits to the left.
           *
           * @param {number} n The number of bits to shift.
           *
           * @return {X64Word} A new x64-Word object after shifting.
           *
           * @example
           *
           *     var shifted = x64Word.shiftL(25);
           */
          // shiftL: function (n) {
          // if (n < 32) {
          // var high = (this.high << n) | (this.low >>> (32 - n));
          // var low = this.low << n;
          // } else {
          // var high = this.low << (n - 32);
          // var low = 0;
          // }
          // return X64Word.create(high, low);
          // },
          /**
           * Shifts this word n bits to the right.
           *
           * @param {number} n The number of bits to shift.
           *
           * @return {X64Word} A new x64-Word object after shifting.
           *
           * @example
           *
           *     var shifted = x64Word.shiftR(7);
           */
          // shiftR: function (n) {
          // if (n < 32) {
          // var low = (this.low >>> n) | (this.high << (32 - n));
          // var high = this.high >>> n;
          // } else {
          // var low = this.high >>> (n - 32);
          // var high = 0;
          // }
          // return X64Word.create(high, low);
          // },
          /**
           * Rotates this word n bits to the left.
           *
           * @param {number} n The number of bits to rotate.
           *
           * @return {X64Word} A new x64-Word object after rotating.
           *
           * @example
           *
           *     var rotated = x64Word.rotL(25);
           */
          // rotL: function (n) {
          // return this.shiftL(n).or(this.shiftR(64 - n));
          // },
          /**
           * Rotates this word n bits to the right.
           *
           * @param {number} n The number of bits to rotate.
           *
           * @return {X64Word} A new x64-Word object after rotating.
           *
           * @example
           *
           *     var rotated = x64Word.rotR(7);
           */
          // rotR: function (n) {
          // return this.shiftR(n).or(this.shiftL(64 - n));
          // },
          /**
           * Adds this word with the passed word.
           *
           * @param {X64Word} word The x64-Word to add with this word.
           *
           * @return {X64Word} A new x64-Word object after adding.
           *
           * @example
           *
           *     var added = x64Word.add(anotherX64Word);
           */
          // add: function (word) {
          // var low = (this.low + word.low) | 0;
          // var carry = (low >>> 0) < (this.low >>> 0) ? 1 : 0;
          // var high = (this.high + word.high + carry) | 0;
          // return X64Word.create(high, low);
          // }
        });
        var X64WordArray = C_x64.WordArray = Base.extend({
          /**
           * Initializes a newly created word array.
           *
           * @param {Array} words (Optional) An array of CryptoJS.x64.Word objects.
           * @param {number} sigBytes (Optional) The number of significant bytes in the words.
           *
           * @example
           *
           *     var wordArray = CryptoJS.x64.WordArray.create();
           *
           *     var wordArray = CryptoJS.x64.WordArray.create([
           *         CryptoJS.x64.Word.create(0x00010203, 0x04050607),
           *         CryptoJS.x64.Word.create(0x18191a1b, 0x1c1d1e1f)
           *     ]);
           *
           *     var wordArray = CryptoJS.x64.WordArray.create([
           *         CryptoJS.x64.Word.create(0x00010203, 0x04050607),
           *         CryptoJS.x64.Word.create(0x18191a1b, 0x1c1d1e1f)
           *     ], 10);
           */
          init: function(words, sigBytes) {
            words = this.words = words || [];
            if (sigBytes != undefined2) {
              this.sigBytes = sigBytes;
            } else {
              this.sigBytes = words.length * 8;
            }
          },
          /**
           * Converts this 64-bit word array to a 32-bit word array.
           *
           * @return {CryptoJS.lib.WordArray} This word array's data as a 32-bit word array.
           *
           * @example
           *
           *     var x32WordArray = x64WordArray.toX32();
           */
          toX32: function() {
            var x64Words = this.words;
            var x64WordsLength = x64Words.length;
            var x32Words = [];
            for (var i2 = 0; i2 < x64WordsLength; i2++) {
              var x64Word = x64Words[i2];
              x32Words.push(x64Word.high);
              x32Words.push(x64Word.low);
            }
            return X32WordArray.create(x32Words, this.sigBytes);
          },
          /**
           * Creates a copy of this word array.
           *
           * @return {X64WordArray} The clone.
           *
           * @example
           *
           *     var clone = x64WordArray.clone();
           */
          clone: function() {
            var clone = Base.clone.call(this);
            var words = clone.words = this.words.slice(0);
            var wordsLength = words.length;
            for (var i2 = 0; i2 < wordsLength; i2++) {
              words[i2] = words[i2].clone();
            }
            return clone;
          }
        });
      })();
      return CryptoJS;
    });
  }
});

// node_modules/crypto-js/sha512.js
var require_sha512 = __commonJS({
  "node_modules/crypto-js/sha512.js"(exports, module) {
    (function(root, factory2, undef) {
      if (typeof exports === "object") {
        module.exports = exports = factory2(require_core(), require_x64_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./x64-core"], factory2);
      } else {
        factory2(root.CryptoJS);
      }
    })(exports, function(CryptoJS) {
      (function() {
        var C = CryptoJS;
        var C_lib = C.lib;
        var Hasher = C_lib.Hasher;
        var C_x64 = C.x64;
        var X64Word = C_x64.Word;
        var X64WordArray = C_x64.WordArray;
        var C_algo = C.algo;
        function X64Word_create() {
          return X64Word.create.apply(X64Word, arguments);
        }
        var K2 = [
          X64Word_create(1116352408, 3609767458),
          X64Word_create(1899447441, 602891725),
          X64Word_create(3049323471, 3964484399),
          X64Word_create(3921009573, 2173295548),
          X64Word_create(961987163, 4081628472),
          X64Word_create(1508970993, 3053834265),
          X64Word_create(2453635748, 2937671579),
          X64Word_create(2870763221, 3664609560),
          X64Word_create(3624381080, 2734883394),
          X64Word_create(310598401, 1164996542),
          X64Word_create(607225278, 1323610764),
          X64Word_create(1426881987, 3590304994),
          X64Word_create(1925078388, 4068182383),
          X64Word_create(2162078206, 991336113),
          X64Word_create(2614888103, 633803317),
          X64Word_create(3248222580, 3479774868),
          X64Word_create(3835390401, 2666613458),
          X64Word_create(4022224774, 944711139),
          X64Word_create(264347078, 2341262773),
          X64Word_create(604807628, 2007800933),
          X64Word_create(770255983, 1495990901),
          X64Word_create(1249150122, 1856431235),
          X64Word_create(1555081692, 3175218132),
          X64Word_create(1996064986, 2198950837),
          X64Word_create(2554220882, 3999719339),
          X64Word_create(2821834349, 766784016),
          X64Word_create(2952996808, 2566594879),
          X64Word_create(3210313671, 3203337956),
          X64Word_create(3336571891, 1034457026),
          X64Word_create(3584528711, 2466948901),
          X64Word_create(113926993, 3758326383),
          X64Word_create(338241895, 168717936),
          X64Word_create(666307205, 1188179964),
          X64Word_create(773529912, 1546045734),
          X64Word_create(1294757372, 1522805485),
          X64Word_create(1396182291, 2643833823),
          X64Word_create(1695183700, 2343527390),
          X64Word_create(1986661051, 1014477480),
          X64Word_create(2177026350, 1206759142),
          X64Word_create(2456956037, 344077627),
          X64Word_create(2730485921, 1290863460),
          X64Word_create(2820302411, 3158454273),
          X64Word_create(3259730800, 3505952657),
          X64Word_create(3345764771, 106217008),
          X64Word_create(3516065817, 3606008344),
          X64Word_create(3600352804, 1432725776),
          X64Word_create(4094571909, 1467031594),
          X64Word_create(275423344, 851169720),
          X64Word_create(430227734, 3100823752),
          X64Word_create(506948616, 1363258195),
          X64Word_create(659060556, 3750685593),
          X64Word_create(883997877, 3785050280),
          X64Word_create(958139571, 3318307427),
          X64Word_create(1322822218, 3812723403),
          X64Word_create(1537002063, 2003034995),
          X64Word_create(1747873779, 3602036899),
          X64Word_create(1955562222, 1575990012),
          X64Word_create(2024104815, 1125592928),
          X64Word_create(2227730452, 2716904306),
          X64Word_create(2361852424, 442776044),
          X64Word_create(2428436474, 593698344),
          X64Word_create(2756734187, 3733110249),
          X64Word_create(3204031479, 2999351573),
          X64Word_create(3329325298, 3815920427),
          X64Word_create(3391569614, 3928383900),
          X64Word_create(3515267271, 566280711),
          X64Word_create(3940187606, 3454069534),
          X64Word_create(4118630271, 4000239992),
          X64Word_create(116418474, 1914138554),
          X64Word_create(174292421, 2731055270),
          X64Word_create(289380356, 3203993006),
          X64Word_create(460393269, 320620315),
          X64Word_create(685471733, 587496836),
          X64Word_create(852142971, 1086792851),
          X64Word_create(1017036298, 365543100),
          X64Word_create(1126000580, 2618297676),
          X64Word_create(1288033470, 3409855158),
          X64Word_create(1501505948, 4234509866),
          X64Word_create(1607167915, 987167468),
          X64Word_create(1816402316, 1246189591)
        ];
        var W = [];
        (function() {
          for (var i2 = 0; i2 < 80; i2++) {
            W[i2] = X64Word_create();
          }
        })();
        var SHA512 = C_algo.SHA512 = Hasher.extend({
          _doReset: function() {
            this._hash = new X64WordArray.init([
              new X64Word.init(1779033703, 4089235720),
              new X64Word.init(3144134277, 2227873595),
              new X64Word.init(1013904242, 4271175723),
              new X64Word.init(2773480762, 1595750129),
              new X64Word.init(1359893119, 2917565137),
              new X64Word.init(2600822924, 725511199),
              new X64Word.init(528734635, 4215389547),
              new X64Word.init(1541459225, 327033209)
            ]);
          },
          _doProcessBlock: function(M3, offset) {
            var H3 = this._hash.words;
            var H0 = H3[0];
            var H1 = H3[1];
            var H22 = H3[2];
            var H32 = H3[3];
            var H4 = H3[4];
            var H5 = H3[5];
            var H6 = H3[6];
            var H7 = H3[7];
            var H0h = H0.high;
            var H0l = H0.low;
            var H1h = H1.high;
            var H1l = H1.low;
            var H2h = H22.high;
            var H2l = H22.low;
            var H3h = H32.high;
            var H3l = H32.low;
            var H4h = H4.high;
            var H4l = H4.low;
            var H5h = H5.high;
            var H5l = H5.low;
            var H6h = H6.high;
            var H6l = H6.low;
            var H7h = H7.high;
            var H7l = H7.low;
            var ah = H0h;
            var al = H0l;
            var bh = H1h;
            var bl = H1l;
            var ch = H2h;
            var cl = H2l;
            var dh = H3h;
            var dl = H3l;
            var eh = H4h;
            var el = H4l;
            var fh = H5h;
            var fl = H5l;
            var gh = H6h;
            var gl = H6l;
            var hh = H7h;
            var hl = H7l;
            for (var i2 = 0; i2 < 80; i2++) {
              var Wil;
              var Wih;
              var Wi = W[i2];
              if (i2 < 16) {
                Wih = Wi.high = M3[offset + i2 * 2] | 0;
                Wil = Wi.low = M3[offset + i2 * 2 + 1] | 0;
              } else {
                var gamma0x = W[i2 - 15];
                var gamma0xh = gamma0x.high;
                var gamma0xl = gamma0x.low;
                var gamma0h = (gamma0xh >>> 1 | gamma0xl << 31) ^ (gamma0xh >>> 8 | gamma0xl << 24) ^ gamma0xh >>> 7;
                var gamma0l = (gamma0xl >>> 1 | gamma0xh << 31) ^ (gamma0xl >>> 8 | gamma0xh << 24) ^ (gamma0xl >>> 7 | gamma0xh << 25);
                var gamma1x = W[i2 - 2];
                var gamma1xh = gamma1x.high;
                var gamma1xl = gamma1x.low;
                var gamma1h = (gamma1xh >>> 19 | gamma1xl << 13) ^ (gamma1xh << 3 | gamma1xl >>> 29) ^ gamma1xh >>> 6;
                var gamma1l = (gamma1xl >>> 19 | gamma1xh << 13) ^ (gamma1xl << 3 | gamma1xh >>> 29) ^ (gamma1xl >>> 6 | gamma1xh << 26);
                var Wi7 = W[i2 - 7];
                var Wi7h = Wi7.high;
                var Wi7l = Wi7.low;
                var Wi16 = W[i2 - 16];
                var Wi16h = Wi16.high;
                var Wi16l = Wi16.low;
                Wil = gamma0l + Wi7l;
                Wih = gamma0h + Wi7h + (Wil >>> 0 < gamma0l >>> 0 ? 1 : 0);
                Wil = Wil + gamma1l;
                Wih = Wih + gamma1h + (Wil >>> 0 < gamma1l >>> 0 ? 1 : 0);
                Wil = Wil + Wi16l;
                Wih = Wih + Wi16h + (Wil >>> 0 < Wi16l >>> 0 ? 1 : 0);
                Wi.high = Wih;
                Wi.low = Wil;
              }
              var chh = eh & fh ^ ~eh & gh;
              var chl = el & fl ^ ~el & gl;
              var majh = ah & bh ^ ah & ch ^ bh & ch;
              var majl = al & bl ^ al & cl ^ bl & cl;
              var sigma0h = (ah >>> 28 | al << 4) ^ (ah << 30 | al >>> 2) ^ (ah << 25 | al >>> 7);
              var sigma0l = (al >>> 28 | ah << 4) ^ (al << 30 | ah >>> 2) ^ (al << 25 | ah >>> 7);
              var sigma1h = (eh >>> 14 | el << 18) ^ (eh >>> 18 | el << 14) ^ (eh << 23 | el >>> 9);
              var sigma1l = (el >>> 14 | eh << 18) ^ (el >>> 18 | eh << 14) ^ (el << 23 | eh >>> 9);
              var Ki = K2[i2];
              var Kih = Ki.high;
              var Kil = Ki.low;
              var t1l = hl + sigma1l;
              var t1h = hh + sigma1h + (t1l >>> 0 < hl >>> 0 ? 1 : 0);
              var t1l = t1l + chl;
              var t1h = t1h + chh + (t1l >>> 0 < chl >>> 0 ? 1 : 0);
              var t1l = t1l + Kil;
              var t1h = t1h + Kih + (t1l >>> 0 < Kil >>> 0 ? 1 : 0);
              var t1l = t1l + Wil;
              var t1h = t1h + Wih + (t1l >>> 0 < Wil >>> 0 ? 1 : 0);
              var t2l = sigma0l + majl;
              var t2h = sigma0h + majh + (t2l >>> 0 < sigma0l >>> 0 ? 1 : 0);
              hh = gh;
              hl = gl;
              gh = fh;
              gl = fl;
              fh = eh;
              fl = el;
              el = dl + t1l | 0;
              eh = dh + t1h + (el >>> 0 < dl >>> 0 ? 1 : 0) | 0;
              dh = ch;
              dl = cl;
              ch = bh;
              cl = bl;
              bh = ah;
              bl = al;
              al = t1l + t2l | 0;
              ah = t1h + t2h + (al >>> 0 < t1l >>> 0 ? 1 : 0) | 0;
            }
            H0l = H0.low = H0l + al;
            H0.high = H0h + ah + (H0l >>> 0 < al >>> 0 ? 1 : 0);
            H1l = H1.low = H1l + bl;
            H1.high = H1h + bh + (H1l >>> 0 < bl >>> 0 ? 1 : 0);
            H2l = H22.low = H2l + cl;
            H22.high = H2h + ch + (H2l >>> 0 < cl >>> 0 ? 1 : 0);
            H3l = H32.low = H3l + dl;
            H32.high = H3h + dh + (H3l >>> 0 < dl >>> 0 ? 1 : 0);
            H4l = H4.low = H4l + el;
            H4.high = H4h + eh + (H4l >>> 0 < el >>> 0 ? 1 : 0);
            H5l = H5.low = H5l + fl;
            H5.high = H5h + fh + (H5l >>> 0 < fl >>> 0 ? 1 : 0);
            H6l = H6.low = H6l + gl;
            H6.high = H6h + gh + (H6l >>> 0 < gl >>> 0 ? 1 : 0);
            H7l = H7.low = H7l + hl;
            H7.high = H7h + hh + (H7l >>> 0 < hl >>> 0 ? 1 : 0);
          },
          _doFinalize: function() {
            var data = this._data;
            var dataWords = data.words;
            var nBitsTotal = this._nDataBytes * 8;
            var nBitsLeft = data.sigBytes * 8;
            dataWords[nBitsLeft >>> 5] |= 128 << 24 - nBitsLeft % 32;
            dataWords[(nBitsLeft + 128 >>> 10 << 5) + 30] = Math.floor(nBitsTotal / 4294967296);
            dataWords[(nBitsLeft + 128 >>> 10 << 5) + 31] = nBitsTotal;
            data.sigBytes = dataWords.length * 4;
            this._process();
            var hash = this._hash.toX32();
            return hash;
          },
          clone: function() {
            var clone = Hasher.clone.call(this);
            clone._hash = this._hash.clone();
            return clone;
          },
          blockSize: 1024 / 32
        });
        C.SHA512 = Hasher._createHelper(SHA512);
        C.HmacSHA512 = Hasher._createHmacHelper(SHA512);
      })();
      return CryptoJS.SHA512;
    });
  }
});

// node_modules/redux/dist/redux.mjs
var $$observable = /* @__PURE__ */ (() => typeof Symbol === "function" && Symbol.observable || "@@observable")();
var symbol_observable_default = $$observable;
var randomString = () => Math.random().toString(36).substring(7).split("").join(".");
var ActionTypes = {
  INIT: `@@redux/INIT${/* @__PURE__ */ randomString()}`,
  REPLACE: `@@redux/REPLACE${/* @__PURE__ */ randomString()}`,
  PROBE_UNKNOWN_ACTION: () => `@@redux/PROBE_UNKNOWN_ACTION${randomString()}`
};
var actionTypes_default = ActionTypes;
function isPlainObject(obj) {
  if (typeof obj !== "object" || obj === null)
    return false;
  let proto2 = obj;
  while (Object.getPrototypeOf(proto2) !== null) {
    proto2 = Object.getPrototypeOf(proto2);
  }
  return Object.getPrototypeOf(obj) === proto2 || Object.getPrototypeOf(obj) === null;
}
function miniKindOf(val) {
  if (val === void 0)
    return "undefined";
  if (val === null)
    return "null";
  const type = typeof val;
  switch (type) {
    case "boolean":
    case "string":
    case "number":
    case "symbol":
    case "function": {
      return type;
    }
  }
  if (Array.isArray(val))
    return "array";
  if (isDate(val))
    return "date";
  if (isError(val))
    return "error";
  const constructorName = ctorName(val);
  switch (constructorName) {
    case "Symbol":
    case "Promise":
    case "WeakMap":
    case "WeakSet":
    case "Map":
    case "Set":
      return constructorName;
  }
  return Object.prototype.toString.call(val).slice(8, -1).toLowerCase().replace(/\s/g, "");
}
function ctorName(val) {
  return typeof val.constructor === "function" ? val.constructor.name : null;
}
function isError(val) {
  return val instanceof Error || typeof val.message === "string" && val.constructor && typeof val.constructor.stackTraceLimit === "number";
}
function isDate(val) {
  if (val instanceof Date)
    return true;
  return typeof val.toDateString === "function" && typeof val.getDate === "function" && typeof val.setDate === "function";
}
function kindOf(val) {
  let typeOfVal = typeof val;
  if (true) {
    typeOfVal = miniKindOf(val);
  }
  return typeOfVal;
}
function createStore(reducer, preloadedState, enhancer) {
  if (typeof reducer !== "function") {
    throw new Error(false ? formatProdErrorMessage(2) : `Expected the root reducer to be a function. Instead, received: '${kindOf(reducer)}'`);
  }
  if (typeof preloadedState === "function" && typeof enhancer === "function" || typeof enhancer === "function" && typeof arguments[3] === "function") {
    throw new Error(false ? formatProdErrorMessage(0) : "It looks like you are passing several store enhancers to createStore(). This is not supported. Instead, compose them together to a single function. See https://redux.js.org/tutorials/fundamentals/part-4-store#creating-a-store-with-enhancers for an example.");
  }
  if (typeof preloadedState === "function" && typeof enhancer === "undefined") {
    enhancer = preloadedState;
    preloadedState = void 0;
  }
  if (typeof enhancer !== "undefined") {
    if (typeof enhancer !== "function") {
      throw new Error(false ? formatProdErrorMessage(1) : `Expected the enhancer to be a function. Instead, received: '${kindOf(enhancer)}'`);
    }
    return enhancer(createStore)(reducer, preloadedState);
  }
  let currentReducer = reducer;
  let currentState = preloadedState;
  let currentListeners = /* @__PURE__ */ new Map();
  let nextListeners = currentListeners;
  let listenerIdCounter = 0;
  let isDispatching = false;
  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = /* @__PURE__ */ new Map();
      currentListeners.forEach((listener2, key) => {
        nextListeners.set(key, listener2);
      });
    }
  }
  function getState() {
    if (isDispatching) {
      throw new Error(false ? formatProdErrorMessage(3) : "You may not call store.getState() while the reducer is executing. The reducer has already received the state as an argument. Pass it down from the top reducer instead of reading it from the store.");
    }
    return currentState;
  }
  function subscribe3(listener2) {
    if (typeof listener2 !== "function") {
      throw new Error(false ? formatProdErrorMessage(4) : `Expected the listener to be a function. Instead, received: '${kindOf(listener2)}'`);
    }
    if (isDispatching) {
      throw new Error(false ? formatProdErrorMessage(5) : "You may not call store.subscribe() while the reducer is executing. If you would like to be notified after the store has been updated, subscribe from a component and invoke store.getState() in the callback to access the latest state. See https://redux.js.org/api/store#subscribelistener for more details.");
    }
    let isSubscribed = true;
    ensureCanMutateNextListeners();
    const listenerId = listenerIdCounter++;
    nextListeners.set(listenerId, listener2);
    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }
      if (isDispatching) {
        throw new Error(false ? formatProdErrorMessage(6) : "You may not unsubscribe from a store listener while the reducer is executing. See https://redux.js.org/api/store#subscribelistener for more details.");
      }
      isSubscribed = false;
      ensureCanMutateNextListeners();
      nextListeners.delete(listenerId);
      currentListeners = null;
    };
  }
  function dispatch(action2) {
    if (!isPlainObject(action2)) {
      throw new Error(false ? formatProdErrorMessage(7) : `Actions must be plain objects. Instead, the actual type was: '${kindOf(action2)}'. You may need to add middleware to your store setup to handle dispatching other values, such as 'redux-thunk' to handle dispatching functions. See https://redux.js.org/tutorials/fundamentals/part-4-store#middleware and https://redux.js.org/tutorials/fundamentals/part-6-async-logic#using-the-redux-thunk-middleware for examples.`);
    }
    if (typeof action2.type === "undefined") {
      throw new Error(false ? formatProdErrorMessage(8) : 'Actions may not have an undefined "type" property. You may have misspelled an action type string constant.');
    }
    if (typeof action2.type !== "string") {
      throw new Error(false ? formatProdErrorMessage(17) : `Action "type" property must be a string. Instead, the actual type was: '${kindOf(action2.type)}'. Value was: '${action2.type}' (stringified)`);
    }
    if (isDispatching) {
      throw new Error(false ? formatProdErrorMessage(9) : "Reducers may not dispatch actions.");
    }
    try {
      isDispatching = true;
      currentState = currentReducer(currentState, action2);
    } finally {
      isDispatching = false;
    }
    const listeners4 = currentListeners = nextListeners;
    listeners4.forEach((listener2) => {
      listener2();
    });
    return action2;
  }
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== "function") {
      throw new Error(false ? formatProdErrorMessage(10) : `Expected the nextReducer to be a function. Instead, received: '${kindOf(nextReducer)}`);
    }
    currentReducer = nextReducer;
    dispatch({
      type: actionTypes_default.REPLACE
    });
  }
  function observable() {
    const outerSubscribe = subscribe3;
    return {
      /**
       * The minimal observable subscription method.
       * @param observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe(observer) {
        if (typeof observer !== "object" || observer === null) {
          throw new Error(false ? formatProdErrorMessage(11) : `Expected the observer to be an object. Instead, received: '${kindOf(observer)}'`);
        }
        function observeState() {
          const observerAsObserver = observer;
          if (observerAsObserver.next) {
            observerAsObserver.next(getState());
          }
        }
        observeState();
        const unsubscribe = outerSubscribe(observeState);
        return {
          unsubscribe
        };
      },
      [symbol_observable_default]() {
        return this;
      }
    };
  }
  dispatch({
    type: actionTypes_default.INIT
  });
  const store = {
    dispatch,
    subscribe: subscribe3,
    getState,
    replaceReducer,
    [symbol_observable_default]: observable
  };
  return store;
}
function warning(message) {
  if (typeof console !== "undefined" && typeof console.error === "function") {
    console.error(message);
  }
  try {
    throw new Error(message);
  } catch (e2) {
  }
}
function getUnexpectedStateShapeWarningMessage(inputState, reducers, action2, unexpectedKeyCache) {
  const reducerKeys = Object.keys(reducers);
  const argumentName = action2 && action2.type === actionTypes_default.INIT ? "preloadedState argument passed to createStore" : "previous state received by the reducer";
  if (reducerKeys.length === 0) {
    return "Store does not have a valid reducer. Make sure the argument passed to combineReducers is an object whose values are reducers.";
  }
  if (!isPlainObject(inputState)) {
    return `The ${argumentName} has unexpected type of "${kindOf(inputState)}". Expected argument to be an object with the following keys: "${reducerKeys.join('", "')}"`;
  }
  const unexpectedKeys = Object.keys(inputState).filter((key) => !reducers.hasOwnProperty(key) && !unexpectedKeyCache[key]);
  unexpectedKeys.forEach((key) => {
    unexpectedKeyCache[key] = true;
  });
  if (action2 && action2.type === actionTypes_default.REPLACE)
    return;
  if (unexpectedKeys.length > 0) {
    return `Unexpected ${unexpectedKeys.length > 1 ? "keys" : "key"} "${unexpectedKeys.join('", "')}" found in ${argumentName}. Expected to find one of the known reducer keys instead: "${reducerKeys.join('", "')}". Unexpected keys will be ignored.`;
  }
}
function assertReducerShape(reducers) {
  Object.keys(reducers).forEach((key) => {
    const reducer = reducers[key];
    const initialState8 = reducer(void 0, {
      type: actionTypes_default.INIT
    });
    if (typeof initialState8 === "undefined") {
      throw new Error(false ? formatProdErrorMessage(12) : `The slice reducer for key "${key}" returned undefined during initialization. If the state passed to the reducer is undefined, you must explicitly return the initial state. The initial state may not be undefined. If you don't want to set a value for this reducer, you can use null instead of undefined.`);
    }
    if (typeof reducer(void 0, {
      type: actionTypes_default.PROBE_UNKNOWN_ACTION()
    }) === "undefined") {
      throw new Error(false ? formatProdErrorMessage(13) : `The slice reducer for key "${key}" returned undefined when probed with a random type. Don't try to handle '${actionTypes_default.INIT}' or other actions in "redux/*" namespace. They are considered private. Instead, you must return the current state for any unknown actions, unless it is undefined, in which case you must return the initial state, regardless of the action type. The initial state may not be undefined, but can be null.`);
    }
  });
}
function combineReducers(reducers) {
  const reducerKeys = Object.keys(reducers);
  const finalReducers = {};
  for (let i2 = 0; i2 < reducerKeys.length; i2++) {
    const key = reducerKeys[i2];
    if (true) {
      if (typeof reducers[key] === "undefined") {
        warning(`No reducer provided for key "${key}"`);
      }
    }
    if (typeof reducers[key] === "function") {
      finalReducers[key] = reducers[key];
    }
  }
  const finalReducerKeys = Object.keys(finalReducers);
  let unexpectedKeyCache;
  if (true) {
    unexpectedKeyCache = {};
  }
  let shapeAssertionError;
  try {
    assertReducerShape(finalReducers);
  } catch (e2) {
    shapeAssertionError = e2;
  }
  return function combination(state3 = {}, action2) {
    if (shapeAssertionError) {
      throw shapeAssertionError;
    }
    if (true) {
      const warningMessage = getUnexpectedStateShapeWarningMessage(state3, finalReducers, action2, unexpectedKeyCache);
      if (warningMessage) {
        warning(warningMessage);
      }
    }
    let hasChanged = false;
    const nextState = {};
    for (let i2 = 0; i2 < finalReducerKeys.length; i2++) {
      const key = finalReducerKeys[i2];
      const reducer = finalReducers[key];
      const previousStateForKey = state3[key];
      const nextStateForKey = reducer(previousStateForKey, action2);
      if (typeof nextStateForKey === "undefined") {
        const actionType = action2 && action2.type;
        throw new Error(false ? formatProdErrorMessage(14) : `When called with an action of type ${actionType ? `"${String(actionType)}"` : "(unknown type)"}, the slice reducer for key "${key}" returned undefined. To ignore an action, you must explicitly return the previous state. If you want this reducer to hold no value, you can return null instead of undefined.`);
      }
      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }
    hasChanged = hasChanged || finalReducerKeys.length !== Object.keys(state3).length;
    return hasChanged ? nextState : state3;
  };
}
function compose(...funcs) {
  if (funcs.length === 0) {
    return (arg) => arg;
  }
  if (funcs.length === 1) {
    return funcs[0];
  }
  return funcs.reduce((a3, b2) => (...args) => a3(b2(...args)));
}
function applyMiddleware(...middlewares) {
  return (createStore2) => (reducer, preloadedState) => {
    const store = createStore2(reducer, preloadedState);
    let dispatch = () => {
      throw new Error(false ? formatProdErrorMessage(15) : "Dispatching while constructing your middleware is not allowed. Other middleware would not be applied to this dispatch.");
    };
    const middlewareAPI = {
      getState: store.getState,
      dispatch: (action2, ...args) => dispatch(action2, ...args)
    };
    const chain = middlewares.map((middleware) => middleware(middlewareAPI));
    dispatch = compose(...chain)(store.dispatch);
    return {
      ...store,
      dispatch
    };
  };
}
function isAction(action2) {
  return isPlainObject(action2) && "type" in action2 && typeof action2.type === "string";
}

// node_modules/reselect/dist/reselect.mjs
var runIdentityFunctionCheck = (resultFunc, inputSelectorsResults, outputSelectorResult) => {
  if (inputSelectorsResults.length === 1 && inputSelectorsResults[0] === outputSelectorResult) {
    let isInputSameAsOutput = false;
    try {
      const emptyObject = {};
      if (resultFunc(emptyObject) === emptyObject)
        isInputSameAsOutput = true;
    } catch {
    }
    if (isInputSameAsOutput) {
      let stack = void 0;
      try {
        throw new Error();
      } catch (e2) {
        ;
        ({ stack } = e2);
      }
      console.warn(
        "The result function returned its own inputs without modification. e.g\n`createSelector([state => state.todos], todos => todos)`\nThis could lead to inefficient memoization and unnecessary re-renders.\nEnsure transformation logic is in the result function, and extraction logic is in the input selectors.",
        { stack }
      );
    }
  }
};
var runInputStabilityCheck = (inputSelectorResultsObject, options, inputSelectorArgs) => {
  const { memoize, memoizeOptions } = options;
  const { inputSelectorResults, inputSelectorResultsCopy } = inputSelectorResultsObject;
  const createAnEmptyObject = memoize(() => ({}), ...memoizeOptions);
  const areInputSelectorResultsEqual = createAnEmptyObject.apply(null, inputSelectorResults) === createAnEmptyObject.apply(null, inputSelectorResultsCopy);
  if (!areInputSelectorResultsEqual) {
    let stack = void 0;
    try {
      throw new Error();
    } catch (e2) {
      ;
      ({ stack } = e2);
    }
    console.warn(
      "An input selector returned a different result when passed same arguments.\nThis means your output selector will likely run more frequently than intended.\nAvoid returning a new reference inside your input selector, e.g.\n`createSelector([state => state.todos.map(todo => todo.id)], todoIds => todoIds.length)`",
      {
        arguments: inputSelectorArgs,
        firstInputs: inputSelectorResults,
        secondInputs: inputSelectorResultsCopy,
        stack
      }
    );
  }
};
var globalDevModeChecks = {
  inputStabilityCheck: "once",
  identityFunctionCheck: "once"
};
function assertIsFunction(func, errorMessage = `expected a function, instead received ${typeof func}`) {
  if (typeof func !== "function") {
    throw new TypeError(errorMessage);
  }
}
function assertIsObject(object, errorMessage = `expected an object, instead received ${typeof object}`) {
  if (typeof object !== "object") {
    throw new TypeError(errorMessage);
  }
}
function assertIsArrayOfFunctions(array, errorMessage = `expected all items to be functions, instead received the following types: `) {
  if (!array.every((item) => typeof item === "function")) {
    const itemTypes = array.map(
      (item) => typeof item === "function" ? `function ${item.name || "unnamed"}()` : typeof item
    ).join(", ");
    throw new TypeError(`${errorMessage}[${itemTypes}]`);
  }
}
var ensureIsArray = (item) => {
  return Array.isArray(item) ? item : [item];
};
function getDependencies(createSelectorArgs) {
  const dependencies = Array.isArray(createSelectorArgs[0]) ? createSelectorArgs[0] : createSelectorArgs;
  assertIsArrayOfFunctions(
    dependencies,
    `createSelector expects all input-selectors to be functions, but received the following types: `
  );
  return dependencies;
}
function collectInputSelectorResults(dependencies, inputSelectorArgs) {
  const inputSelectorResults = [];
  const { length } = dependencies;
  for (let i2 = 0; i2 < length; i2++) {
    inputSelectorResults.push(dependencies[i2].apply(null, inputSelectorArgs));
  }
  return inputSelectorResults;
}
var getDevModeChecksExecutionInfo = (firstRun, devModeChecks) => {
  const { identityFunctionCheck, inputStabilityCheck } = {
    ...globalDevModeChecks,
    ...devModeChecks
  };
  return {
    identityFunctionCheck: {
      shouldRun: identityFunctionCheck === "always" || identityFunctionCheck === "once" && firstRun,
      run: runIdentityFunctionCheck
    },
    inputStabilityCheck: {
      shouldRun: inputStabilityCheck === "always" || inputStabilityCheck === "once" && firstRun,
      run: runInputStabilityCheck
    }
  };
};
var REDUX_PROXY_LABEL = Symbol();
var proto = Object.getPrototypeOf({});
var StrongRef = class {
  constructor(value) {
    this.value = value;
  }
  deref() {
    return this.value;
  }
};
var Ref = typeof WeakRef !== "undefined" ? WeakRef : StrongRef;
var UNTERMINATED = 0;
var TERMINATED = 1;
function createCacheNode() {
  return {
    s: UNTERMINATED,
    v: void 0,
    o: null,
    p: null
  };
}
function weakMapMemoize(func, options = {}) {
  let fnNode = createCacheNode();
  const { resultEqualityCheck } = options;
  let lastResult;
  let resultsCount = 0;
  function memoized() {
    let cacheNode = fnNode;
    const { length } = arguments;
    for (let i2 = 0, l = length; i2 < l; i2++) {
      const arg = arguments[i2];
      if (typeof arg === "function" || typeof arg === "object" && arg !== null) {
        let objectCache = cacheNode.o;
        if (objectCache === null) {
          cacheNode.o = objectCache = /* @__PURE__ */ new WeakMap();
        }
        const objectNode = objectCache.get(arg);
        if (objectNode === void 0) {
          cacheNode = createCacheNode();
          objectCache.set(arg, cacheNode);
        } else {
          cacheNode = objectNode;
        }
      } else {
        let primitiveCache = cacheNode.p;
        if (primitiveCache === null) {
          cacheNode.p = primitiveCache = /* @__PURE__ */ new Map();
        }
        const primitiveNode = primitiveCache.get(arg);
        if (primitiveNode === void 0) {
          cacheNode = createCacheNode();
          primitiveCache.set(arg, cacheNode);
        } else {
          cacheNode = primitiveNode;
        }
      }
    }
    const terminatedNode = cacheNode;
    let result;
    if (cacheNode.s === TERMINATED) {
      result = cacheNode.v;
    } else {
      result = func.apply(null, arguments);
      resultsCount++;
      if (resultEqualityCheck) {
        const lastResultValue = lastResult?.deref?.() ?? lastResult;
        if (lastResultValue != null && resultEqualityCheck(lastResultValue, result)) {
          result = lastResultValue;
          resultsCount !== 0 && resultsCount--;
        }
        const needsWeakRef = typeof result === "object" && result !== null || typeof result === "function";
        lastResult = needsWeakRef ? new Ref(result) : result;
      }
    }
    terminatedNode.s = TERMINATED;
    terminatedNode.v = result;
    return result;
  }
  memoized.clearCache = () => {
    fnNode = createCacheNode();
    memoized.resetResultsCount();
  };
  memoized.resultsCount = () => resultsCount;
  memoized.resetResultsCount = () => {
    resultsCount = 0;
  };
  return memoized;
}
function createSelectorCreator(memoizeOrOptions, ...memoizeOptionsFromArgs) {
  const createSelectorCreatorOptions = typeof memoizeOrOptions === "function" ? {
    memoize: memoizeOrOptions,
    memoizeOptions: memoizeOptionsFromArgs
  } : memoizeOrOptions;
  const createSelector2 = (...createSelectorArgs) => {
    let recomputations = 0;
    let dependencyRecomputations = 0;
    let lastResult;
    let directlyPassedOptions = {};
    let resultFunc = createSelectorArgs.pop();
    if (typeof resultFunc === "object") {
      directlyPassedOptions = resultFunc;
      resultFunc = createSelectorArgs.pop();
    }
    assertIsFunction(
      resultFunc,
      `createSelector expects an output function after the inputs, but received: [${typeof resultFunc}]`
    );
    const combinedOptions = {
      ...createSelectorCreatorOptions,
      ...directlyPassedOptions
    };
    const {
      memoize,
      memoizeOptions = [],
      argsMemoize = weakMapMemoize,
      argsMemoizeOptions = [],
      devModeChecks = {}
    } = combinedOptions;
    const finalMemoizeOptions = ensureIsArray(memoizeOptions);
    const finalArgsMemoizeOptions = ensureIsArray(argsMemoizeOptions);
    const dependencies = getDependencies(createSelectorArgs);
    const memoizedResultFunc = memoize(function recomputationWrapper() {
      recomputations++;
      return resultFunc.apply(
        null,
        arguments
      );
    }, ...finalMemoizeOptions);
    let firstRun = true;
    const selector = argsMemoize(function dependenciesChecker() {
      dependencyRecomputations++;
      const inputSelectorResults = collectInputSelectorResults(
        dependencies,
        arguments
      );
      lastResult = memoizedResultFunc.apply(null, inputSelectorResults);
      if (true) {
        const { identityFunctionCheck, inputStabilityCheck } = getDevModeChecksExecutionInfo(firstRun, devModeChecks);
        if (identityFunctionCheck.shouldRun) {
          identityFunctionCheck.run(
            resultFunc,
            inputSelectorResults,
            lastResult
          );
        }
        if (inputStabilityCheck.shouldRun) {
          const inputSelectorResultsCopy = collectInputSelectorResults(
            dependencies,
            arguments
          );
          inputStabilityCheck.run(
            { inputSelectorResults, inputSelectorResultsCopy },
            { memoize, memoizeOptions: finalMemoizeOptions },
            arguments
          );
        }
        if (firstRun)
          firstRun = false;
      }
      return lastResult;
    }, ...finalArgsMemoizeOptions);
    return Object.assign(selector, {
      resultFunc,
      memoizedResultFunc,
      dependencies,
      dependencyRecomputations: () => dependencyRecomputations,
      resetDependencyRecomputations: () => {
        dependencyRecomputations = 0;
      },
      lastResult: () => lastResult,
      recomputations: () => recomputations,
      resetRecomputations: () => {
        recomputations = 0;
      },
      memoize,
      argsMemoize
    });
  };
  Object.assign(createSelector2, {
    withTypes: () => createSelector2
  });
  return createSelector2;
}
var createSelector = /* @__PURE__ */ createSelectorCreator(weakMapMemoize);
var createStructuredSelector = Object.assign(
  (inputSelectorsObject, selectorCreator = createSelector) => {
    assertIsObject(
      inputSelectorsObject,
      `createStructuredSelector expects first argument to be an object where each property is a selector, instead received a ${typeof inputSelectorsObject}`
    );
    const inputSelectorKeys = Object.keys(inputSelectorsObject);
    const dependencies = inputSelectorKeys.map(
      (key) => inputSelectorsObject[key]
    );
    const structuredSelector = selectorCreator(
      dependencies,
      (...inputSelectorResults) => {
        return inputSelectorResults.reduce((composition, value, index) => {
          composition[inputSelectorKeys[index]] = value;
          return composition;
        }, {});
      }
    );
    return structuredSelector;
  },
  { withTypes: () => createStructuredSelector }
);

// node_modules/redux-thunk/dist/redux-thunk.mjs
function createThunkMiddleware(extraArgument) {
  const middleware = ({ dispatch, getState }) => (next) => (action2) => {
    if (typeof action2 === "function") {
      return action2(dispatch, getState, extraArgument);
    }
    return next(action2);
  };
  return middleware;
}
var thunk = createThunkMiddleware();
var withExtraArgument = createThunkMiddleware;

// node_modules/@reduxjs/toolkit/dist/redux-toolkit.modern.mjs
var createDraftSafeSelectorCreator = (...args) => {
  const createSelector2 = createSelectorCreator(...args);
  const createDraftSafeSelector2 = Object.assign((...args2) => {
    const selector = createSelector2(...args2);
    const wrappedSelector = (value, ...rest) => selector(isDraft(value) ? current(value) : value, ...rest);
    Object.assign(wrappedSelector, selector);
    return wrappedSelector;
  }, {
    withTypes: () => createDraftSafeSelector2
  });
  return createDraftSafeSelector2;
};
var createDraftSafeSelector = /* @__PURE__ */ createDraftSafeSelectorCreator(weakMapMemoize);
var composeWithDevTools = typeof window !== "undefined" && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ : function() {
  if (arguments.length === 0) return void 0;
  if (typeof arguments[0] === "object") return compose;
  return compose.apply(null, arguments);
};
var devToolsEnhancer = typeof window !== "undefined" && window.__REDUX_DEVTOOLS_EXTENSION__ ? window.__REDUX_DEVTOOLS_EXTENSION__ : function() {
  return function(noop3) {
    return noop3;
  };
};
var hasMatchFunction = (v) => {
  return v && typeof v.match === "function";
};
function createAction(type, prepareAction) {
  function actionCreator(...args) {
    if (prepareAction) {
      let prepared = prepareAction(...args);
      if (!prepared) {
        throw new Error(false ? formatProdErrorMessage(0) : "prepareAction did not return an object");
      }
      return {
        type,
        payload: prepared.payload,
        ..."meta" in prepared && {
          meta: prepared.meta
        },
        ..."error" in prepared && {
          error: prepared.error
        }
      };
    }
    return {
      type,
      payload: args[0]
    };
  }
  actionCreator.toString = () => `${type}`;
  actionCreator.type = type;
  actionCreator.match = (action2) => isAction(action2) && action2.type === type;
  return actionCreator;
}
function isActionCreator(action2) {
  return typeof action2 === "function" && "type" in action2 && // hasMatchFunction only wants Matchers but I don't see the point in rewriting it
  hasMatchFunction(action2);
}
function isFSA(action2) {
  return isAction(action2) && Object.keys(action2).every(isValidKey);
}
function isValidKey(key) {
  return ["type", "payload", "error", "meta"].indexOf(key) > -1;
}
function getMessage(type) {
  const splitType = type ? `${type}`.split("/") : [];
  const actionName = splitType[splitType.length - 1] || "actionCreator";
  return `Detected an action creator with type "${type || "unknown"}" being dispatched. 
Make sure you're calling the action creator before dispatching, i.e. \`dispatch(${actionName}())\` instead of \`dispatch(${actionName})\`. This is necessary even if the action has no payload.`;
}
function createActionCreatorInvariantMiddleware(options = {}) {
  if (false) {
    return () => (next) => (action2) => next(action2);
  }
  const {
    isActionCreator: isActionCreator2 = isActionCreator
  } = options;
  return () => (next) => (action2) => {
    if (isActionCreator2(action2)) {
      console.warn(getMessage(action2.type));
    }
    return next(action2);
  };
}
function getTimeMeasureUtils(maxDelay, fnName) {
  let elapsed = 0;
  return {
    measureTime(fn) {
      const started = Date.now();
      try {
        return fn();
      } finally {
        const finished = Date.now();
        elapsed += finished - started;
      }
    },
    warnIfExceeded() {
      if (elapsed > maxDelay) {
        console.warn(`${fnName} took ${elapsed}ms, which is more than the warning threshold of ${maxDelay}ms. 
If your state or actions are very large, you may want to disable the middleware as it might cause too much of a slowdown in development mode. See https://redux-toolkit.js.org/api/getDefaultMiddleware for instructions.
It is disabled in production builds, so you don't need to worry about that.`);
      }
    }
  };
}
var Tuple = class _Tuple extends Array {
  constructor(...items) {
    super(...items);
    Object.setPrototypeOf(this, _Tuple.prototype);
  }
  static get [Symbol.species]() {
    return _Tuple;
  }
  concat(...arr) {
    return super.concat.apply(this, arr);
  }
  prepend(...arr) {
    if (arr.length === 1 && Array.isArray(arr[0])) {
      return new _Tuple(...arr[0].concat(this));
    }
    return new _Tuple(...arr.concat(this));
  }
};
function freezeDraftable(val) {
  return isDraftable(val) ? produce(val, () => {
  }) : val;
}
function getOrInsertComputed(map, key, compute) {
  if (map.has(key)) return map.get(key);
  return map.set(key, compute(key)).get(key);
}
function isImmutableDefault(value) {
  return typeof value !== "object" || value == null || Object.isFrozen(value);
}
function trackForMutations(isImmutable, ignorePaths, obj) {
  const trackedProperties = trackProperties(isImmutable, ignorePaths, obj);
  return {
    detectMutations() {
      return detectMutations(isImmutable, ignorePaths, trackedProperties, obj);
    }
  };
}
function trackProperties(isImmutable, ignorePaths = [], obj, path = "", checkedObjects = /* @__PURE__ */ new Set()) {
  const tracked = {
    value: obj
  };
  if (!isImmutable(obj) && !checkedObjects.has(obj)) {
    checkedObjects.add(obj);
    tracked.children = {};
    for (const key in obj) {
      const childPath = path ? path + "." + key : key;
      if (ignorePaths.length && ignorePaths.indexOf(childPath) !== -1) {
        continue;
      }
      tracked.children[key] = trackProperties(isImmutable, ignorePaths, obj[key], childPath);
    }
  }
  return tracked;
}
function detectMutations(isImmutable, ignoredPaths = [], trackedProperty, obj, sameParentRef = false, path = "") {
  const prevObj = trackedProperty ? trackedProperty.value : void 0;
  const sameRef = prevObj === obj;
  if (sameParentRef && !sameRef && !Number.isNaN(obj)) {
    return {
      wasMutated: true,
      path
    };
  }
  if (isImmutable(prevObj) || isImmutable(obj)) {
    return {
      wasMutated: false
    };
  }
  const keysToDetect = {};
  for (let key in trackedProperty.children) {
    keysToDetect[key] = true;
  }
  for (let key in obj) {
    keysToDetect[key] = true;
  }
  const hasIgnoredPaths = ignoredPaths.length > 0;
  for (let key in keysToDetect) {
    const nestedPath = path ? path + "." + key : key;
    if (hasIgnoredPaths) {
      const hasMatches = ignoredPaths.some((ignored) => {
        if (ignored instanceof RegExp) {
          return ignored.test(nestedPath);
        }
        return nestedPath === ignored;
      });
      if (hasMatches) {
        continue;
      }
    }
    const result = detectMutations(isImmutable, ignoredPaths, trackedProperty.children[key], obj[key], sameRef, nestedPath);
    if (result.wasMutated) {
      return result;
    }
  }
  return {
    wasMutated: false
  };
}
function createImmutableStateInvariantMiddleware(options = {}) {
  if (false) {
    return () => (next) => (action2) => next(action2);
  } else {
    let stringify2 = function(obj, serializer, indent, decycler) {
      return JSON.stringify(obj, getSerialize2(serializer, decycler), indent);
    }, getSerialize2 = function(serializer, decycler) {
      let stack = [], keys = [];
      if (!decycler) decycler = function(_, value) {
        if (stack[0] === value) return "[Circular ~]";
        return "[Circular ~." + keys.slice(0, stack.indexOf(value)).join(".") + "]";
      };
      return function(key, value) {
        if (stack.length > 0) {
          var thisPos = stack.indexOf(this);
          ~thisPos ? stack.splice(thisPos + 1) : stack.push(this);
          ~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key);
          if (~stack.indexOf(value)) value = decycler.call(this, key, value);
        } else stack.push(value);
        return serializer == null ? value : serializer.call(this, key, value);
      };
    };
    var stringify = stringify2, getSerialize = getSerialize2;
    let {
      isImmutable = isImmutableDefault,
      ignoredPaths,
      warnAfter = 32
    } = options;
    const track = trackForMutations.bind(null, isImmutable, ignoredPaths);
    return ({
      getState
    }) => {
      let state3 = getState();
      let tracker = track(state3);
      let result;
      return (next) => (action2) => {
        const measureUtils = getTimeMeasureUtils(warnAfter, "ImmutableStateInvariantMiddleware");
        measureUtils.measureTime(() => {
          state3 = getState();
          result = tracker.detectMutations();
          tracker = track(state3);
          if (result.wasMutated) {
            throw new Error(false ? formatProdErrorMessage(19) : `A state mutation was detected between dispatches, in the path '${result.path || ""}'.  This may cause incorrect behavior. (https://redux.js.org/style-guide/style-guide#do-not-mutate-state)`);
          }
        });
        const dispatchedAction = next(action2);
        measureUtils.measureTime(() => {
          state3 = getState();
          result = tracker.detectMutations();
          tracker = track(state3);
          if (result.wasMutated) {
            throw new Error(false ? formatProdErrorMessage(20) : `A state mutation was detected inside a dispatch, in the path: ${result.path || ""}. Take a look at the reducer(s) handling the action ${stringify2(action2)}. (https://redux.js.org/style-guide/style-guide#do-not-mutate-state)`);
          }
        });
        measureUtils.warnIfExceeded();
        return dispatchedAction;
      };
    };
  }
}
function isPlain(val) {
  const type = typeof val;
  return val == null || type === "string" || type === "boolean" || type === "number" || Array.isArray(val) || isPlainObject(val);
}
function findNonSerializableValue(value, path = "", isSerializable = isPlain, getEntries, ignoredPaths = [], cache) {
  let foundNestedSerializable;
  if (!isSerializable(value)) {
    return {
      keyPath: path || "<root>",
      value
    };
  }
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (cache?.has(value)) return false;
  const entries = getEntries != null ? getEntries(value) : Object.entries(value);
  const hasIgnoredPaths = ignoredPaths.length > 0;
  for (const [key, nestedValue] of entries) {
    const nestedPath = path ? path + "." + key : key;
    if (hasIgnoredPaths) {
      const hasMatches = ignoredPaths.some((ignored) => {
        if (ignored instanceof RegExp) {
          return ignored.test(nestedPath);
        }
        return nestedPath === ignored;
      });
      if (hasMatches) {
        continue;
      }
    }
    if (!isSerializable(nestedValue)) {
      return {
        keyPath: nestedPath,
        value: nestedValue
      };
    }
    if (typeof nestedValue === "object") {
      foundNestedSerializable = findNonSerializableValue(nestedValue, nestedPath, isSerializable, getEntries, ignoredPaths, cache);
      if (foundNestedSerializable) {
        return foundNestedSerializable;
      }
    }
  }
  if (cache && isNestedFrozen(value)) cache.add(value);
  return false;
}
function isNestedFrozen(value) {
  if (!Object.isFrozen(value)) return false;
  for (const nestedValue of Object.values(value)) {
    if (typeof nestedValue !== "object" || nestedValue === null) continue;
    if (!isNestedFrozen(nestedValue)) return false;
  }
  return true;
}
function createSerializableStateInvariantMiddleware(options = {}) {
  if (false) {
    return () => (next) => (action2) => next(action2);
  } else {
    const {
      isSerializable = isPlain,
      getEntries,
      ignoredActions = [],
      ignoredActionPaths = ["meta.arg", "meta.baseQueryMeta"],
      ignoredPaths = [],
      warnAfter = 32,
      ignoreState = false,
      ignoreActions = false,
      disableCache = false
    } = options;
    const cache = !disableCache && WeakSet ? /* @__PURE__ */ new WeakSet() : void 0;
    return (storeAPI) => (next) => (action2) => {
      if (!isAction(action2)) {
        return next(action2);
      }
      const result = next(action2);
      const measureUtils = getTimeMeasureUtils(warnAfter, "SerializableStateInvariantMiddleware");
      if (!ignoreActions && !(ignoredActions.length && ignoredActions.indexOf(action2.type) !== -1)) {
        measureUtils.measureTime(() => {
          const foundActionNonSerializableValue = findNonSerializableValue(action2, "", isSerializable, getEntries, ignoredActionPaths, cache);
          if (foundActionNonSerializableValue) {
            const {
              keyPath,
              value
            } = foundActionNonSerializableValue;
            console.error(`A non-serializable value was detected in an action, in the path: \`${keyPath}\`. Value:`, value, "\nTake a look at the logic that dispatched this action: ", action2, "\n(See https://redux.js.org/faq/actions#why-should-type-be-a-string-or-at-least-serializable-why-should-my-action-types-be-constants)", "\n(To allow non-serializable values see: https://redux-toolkit.js.org/usage/usage-guide#working-with-non-serializable-data)");
          }
        });
      }
      if (!ignoreState) {
        measureUtils.measureTime(() => {
          const state3 = storeAPI.getState();
          const foundStateNonSerializableValue = findNonSerializableValue(state3, "", isSerializable, getEntries, ignoredPaths, cache);
          if (foundStateNonSerializableValue) {
            const {
              keyPath,
              value
            } = foundStateNonSerializableValue;
            console.error(`A non-serializable value was detected in the state, in the path: \`${keyPath}\`. Value:`, value, `
Take a look at the reducer(s) handling this action type: ${action2.type}.
(See https://redux.js.org/faq/organizing-state#can-i-put-functions-promises-or-other-non-serializable-items-in-my-store-state)`);
          }
        });
        measureUtils.warnIfExceeded();
      }
      return result;
    };
  }
}
function isBoolean(x2) {
  return typeof x2 === "boolean";
}
var buildGetDefaultMiddleware = () => function getDefaultMiddleware(options) {
  const {
    thunk: thunk2 = true,
    immutableCheck = true,
    serializableCheck = true,
    actionCreatorCheck = true
  } = options ?? {};
  let middlewareArray = new Tuple();
  if (thunk2) {
    if (isBoolean(thunk2)) {
      middlewareArray.push(thunk);
    } else {
      middlewareArray.push(withExtraArgument(thunk2.extraArgument));
    }
  }
  if (true) {
    if (immutableCheck) {
      let immutableOptions = {};
      if (!isBoolean(immutableCheck)) {
        immutableOptions = immutableCheck;
      }
      middlewareArray.unshift(createImmutableStateInvariantMiddleware(immutableOptions));
    }
    if (serializableCheck) {
      let serializableOptions = {};
      if (!isBoolean(serializableCheck)) {
        serializableOptions = serializableCheck;
      }
      middlewareArray.push(createSerializableStateInvariantMiddleware(serializableOptions));
    }
    if (actionCreatorCheck) {
      let actionCreatorOptions = {};
      if (!isBoolean(actionCreatorCheck)) {
        actionCreatorOptions = actionCreatorCheck;
      }
      middlewareArray.unshift(createActionCreatorInvariantMiddleware(actionCreatorOptions));
    }
  }
  return middlewareArray;
};
var SHOULD_AUTOBATCH = "RTK_autoBatch";
var createQueueWithTimer = (timeout) => {
  return (notify4) => {
    setTimeout(notify4, timeout);
  };
};
var autoBatchEnhancer = (options = {
  type: "raf"
}) => (next) => (...args) => {
  const store = next(...args);
  let notifying = true;
  let shouldNotifyAtEndOfTick = false;
  let notificationQueued = false;
  const listeners4 = /* @__PURE__ */ new Set();
  const queueCallback = options.type === "tick" ? queueMicrotask : options.type === "raf" ? (
    // requestAnimationFrame won't exist in SSR environments. Fall back to a vague approximation just to keep from erroring.
    typeof window !== "undefined" && window.requestAnimationFrame ? window.requestAnimationFrame : createQueueWithTimer(10)
  ) : options.type === "callback" ? options.queueNotification : createQueueWithTimer(options.timeout);
  const notifyListeners = () => {
    notificationQueued = false;
    if (shouldNotifyAtEndOfTick) {
      shouldNotifyAtEndOfTick = false;
      listeners4.forEach((l) => l());
    }
  };
  return Object.assign({}, store, {
    // Override the base `store.subscribe` method to keep original listeners
    // from running if we're delaying notifications
    subscribe(listener2) {
      const wrappedListener = () => notifying && listener2();
      const unsubscribe = store.subscribe(wrappedListener);
      listeners4.add(listener2);
      return () => {
        unsubscribe();
        listeners4.delete(listener2);
      };
    },
    // Override the base `store.dispatch` method so that we can check actions
    // for the `shouldAutoBatch` flag and determine if batching is active
    dispatch(action2) {
      try {
        notifying = !action2?.meta?.[SHOULD_AUTOBATCH];
        shouldNotifyAtEndOfTick = !notifying;
        if (shouldNotifyAtEndOfTick) {
          if (!notificationQueued) {
            notificationQueued = true;
            queueCallback(notifyListeners);
          }
        }
        return store.dispatch(action2);
      } finally {
        notifying = true;
      }
    }
  });
};
var buildGetDefaultEnhancers = (middlewareEnhancer) => function getDefaultEnhancers(options) {
  const {
    autoBatch = true
  } = options ?? {};
  let enhancerArray = new Tuple(middlewareEnhancer);
  if (autoBatch) {
    enhancerArray.push(autoBatchEnhancer(typeof autoBatch === "object" ? autoBatch : void 0));
  }
  return enhancerArray;
};
function configureStore(options) {
  const getDefaultMiddleware = buildGetDefaultMiddleware();
  const {
    reducer = void 0,
    middleware,
    devTools = true,
    preloadedState = void 0,
    enhancers = void 0
  } = options || {};
  let rootReducer;
  if (typeof reducer === "function") {
    rootReducer = reducer;
  } else if (isPlainObject(reducer)) {
    rootReducer = combineReducers(reducer);
  } else {
    throw new Error(false ? formatProdErrorMessage(1) : "`reducer` is a required argument, and must be a function or an object of functions that can be passed to combineReducers");
  }
  if (middleware && typeof middleware !== "function") {
    throw new Error(false ? formatProdErrorMessage(2) : "`middleware` field must be a callback");
  }
  let finalMiddleware;
  if (typeof middleware === "function") {
    finalMiddleware = middleware(getDefaultMiddleware);
    if (!Array.isArray(finalMiddleware)) {
      throw new Error(false ? formatProdErrorMessage(3) : "when using a middleware builder function, an array of middleware must be returned");
    }
  } else {
    finalMiddleware = getDefaultMiddleware();
  }
  if (finalMiddleware.some((item) => typeof item !== "function")) {
    throw new Error(false ? formatProdErrorMessage(4) : "each middleware provided to configureStore must be a function");
  }
  let finalCompose = compose;
  if (devTools) {
    finalCompose = composeWithDevTools({
      // Enable capture of stack traces for dispatched Redux actions
      trace: true,
      ...typeof devTools === "object" && devTools
    });
  }
  const middlewareEnhancer = applyMiddleware(...finalMiddleware);
  const getDefaultEnhancers = buildGetDefaultEnhancers(middlewareEnhancer);
  if (enhancers && typeof enhancers !== "function") {
    throw new Error(false ? formatProdErrorMessage(5) : "`enhancers` field must be a callback");
  }
  let storeEnhancers = typeof enhancers === "function" ? enhancers(getDefaultEnhancers) : getDefaultEnhancers();
  if (!Array.isArray(storeEnhancers)) {
    throw new Error(false ? formatProdErrorMessage(6) : "`enhancers` callback must return an array");
  }
  if (storeEnhancers.some((item) => typeof item !== "function")) {
    throw new Error(false ? formatProdErrorMessage(7) : "each enhancer provided to configureStore must be a function");
  }
  if (finalMiddleware.length && !storeEnhancers.includes(middlewareEnhancer)) {
    console.error("middlewares were provided, but middleware enhancer was not included in final enhancers - make sure to call `getDefaultEnhancers`");
  }
  const composedEnhancer = finalCompose(...storeEnhancers);
  return createStore(rootReducer, preloadedState, composedEnhancer);
}
function executeReducerBuilderCallback(builderCallback) {
  const actionsMap = {};
  const actionMatchers = [];
  let defaultCaseReducer;
  const builder = {
    addCase(typeOrActionCreator, reducer) {
      if (true) {
        if (actionMatchers.length > 0) {
          throw new Error(false ? formatProdErrorMessage(26) : "`builder.addCase` should only be called before calling `builder.addMatcher`");
        }
        if (defaultCaseReducer) {
          throw new Error(false ? formatProdErrorMessage(27) : "`builder.addCase` should only be called before calling `builder.addDefaultCase`");
        }
      }
      const type = typeof typeOrActionCreator === "string" ? typeOrActionCreator : typeOrActionCreator.type;
      if (!type) {
        throw new Error(false ? formatProdErrorMessage(28) : "`builder.addCase` cannot be called with an empty action type");
      }
      if (type in actionsMap) {
        throw new Error(false ? formatProdErrorMessage(29) : `\`builder.addCase\` cannot be called with two reducers for the same action type '${type}'`);
      }
      actionsMap[type] = reducer;
      return builder;
    },
    addMatcher(matcher, reducer) {
      if (true) {
        if (defaultCaseReducer) {
          throw new Error(false ? formatProdErrorMessage(30) : "`builder.addMatcher` should only be called before calling `builder.addDefaultCase`");
        }
      }
      actionMatchers.push({
        matcher,
        reducer
      });
      return builder;
    },
    addDefaultCase(reducer) {
      if (true) {
        if (defaultCaseReducer) {
          throw new Error(false ? formatProdErrorMessage(31) : "`builder.addDefaultCase` can only be called once");
        }
      }
      defaultCaseReducer = reducer;
      return builder;
    }
  };
  builderCallback(builder);
  return [actionsMap, actionMatchers, defaultCaseReducer];
}
function isStateFunction(x2) {
  return typeof x2 === "function";
}
function createReducer(initialState8, mapOrBuilderCallback) {
  if (true) {
    if (typeof mapOrBuilderCallback === "object") {
      throw new Error(false ? formatProdErrorMessage(8) : "The object notation for `createReducer` has been removed. Please use the 'builder callback' notation instead: https://redux-toolkit.js.org/api/createReducer");
    }
  }
  let [actionsMap, finalActionMatchers, finalDefaultCaseReducer] = executeReducerBuilderCallback(mapOrBuilderCallback);
  let getInitialState;
  if (isStateFunction(initialState8)) {
    getInitialState = () => freezeDraftable(initialState8());
  } else {
    const frozenInitialState = freezeDraftable(initialState8);
    getInitialState = () => frozenInitialState;
  }
  function reducer(state3 = getInitialState(), action2) {
    let caseReducers = [actionsMap[action2.type], ...finalActionMatchers.filter(({
      matcher
    }) => matcher(action2)).map(({
      reducer: reducer2
    }) => reducer2)];
    if (caseReducers.filter((cr) => !!cr).length === 0) {
      caseReducers = [finalDefaultCaseReducer];
    }
    return caseReducers.reduce((previousState, caseReducer) => {
      if (caseReducer) {
        if (isDraft(previousState)) {
          const draft = previousState;
          const result = caseReducer(draft, action2);
          if (result === void 0) {
            return previousState;
          }
          return result;
        } else if (!isDraftable(previousState)) {
          const result = caseReducer(previousState, action2);
          if (result === void 0) {
            if (previousState === null) {
              return previousState;
            }
            throw Error("A case reducer on a non-draftable value must not return undefined");
          }
          return result;
        } else {
          return produce(previousState, (draft) => {
            return caseReducer(draft, action2);
          });
        }
      }
      return previousState;
    }, state3);
  }
  reducer.getInitialState = getInitialState;
  return reducer;
}
var matches = (matcher, action2) => {
  if (hasMatchFunction(matcher)) {
    return matcher.match(action2);
  } else {
    return matcher(action2);
  }
};
function isAnyOf(...matchers) {
  return (action2) => {
    return matchers.some((matcher) => matches(matcher, action2));
  };
}
var urlAlphabet = "ModuleSymbhasOwnPr-0123456789ABCDEFGHNRVfgctiUvz_KqYTJkLxpZXIjQW";
var nanoid = (size = 21) => {
  let id = "";
  let i2 = size;
  while (i2--) {
    id += urlAlphabet[Math.random() * 64 | 0];
  }
  return id;
};
var commonProperties = ["name", "message", "stack", "code"];
var RejectWithValue = class {
  constructor(payload, meta) {
    /*
    type-only property to distinguish between RejectWithValue and FulfillWithMeta
    does not exist at runtime
    */
    __publicField(this, "_type");
    this.payload = payload;
    this.meta = meta;
  }
};
var FulfillWithMeta = class {
  constructor(payload, meta) {
    /*
    type-only property to distinguish between RejectWithValue and FulfillWithMeta
    does not exist at runtime
    */
    __publicField(this, "_type");
    this.payload = payload;
    this.meta = meta;
  }
};
var miniSerializeError = (value) => {
  if (typeof value === "object" && value !== null) {
    const simpleError = {};
    for (const property of commonProperties) {
      if (typeof value[property] === "string") {
        simpleError[property] = value[property];
      }
    }
    return simpleError;
  }
  return {
    message: String(value)
  };
};
var createAsyncThunk = /* @__PURE__ */ (() => {
  function createAsyncThunk2(typePrefix, payloadCreator, options) {
    const fulfilled = createAction(typePrefix + "/fulfilled", (payload, requestId, arg, meta) => ({
      payload,
      meta: {
        ...meta || {},
        arg,
        requestId,
        requestStatus: "fulfilled"
      }
    }));
    const pending = createAction(typePrefix + "/pending", (requestId, arg, meta) => ({
      payload: void 0,
      meta: {
        ...meta || {},
        arg,
        requestId,
        requestStatus: "pending"
      }
    }));
    const rejected = createAction(typePrefix + "/rejected", (error, requestId, arg, payload, meta) => ({
      payload,
      error: (options && options.serializeError || miniSerializeError)(error || "Rejected"),
      meta: {
        ...meta || {},
        arg,
        requestId,
        rejectedWithValue: !!payload,
        requestStatus: "rejected",
        aborted: error?.name === "AbortError",
        condition: error?.name === "ConditionError"
      }
    }));
    function actionCreator(arg) {
      return (dispatch, getState, extra) => {
        const requestId = options?.idGenerator ? options.idGenerator(arg) : nanoid();
        const abortController = new AbortController();
        let abortHandler;
        let abortReason;
        function abort(reason) {
          abortReason = reason;
          abortController.abort();
        }
        const promise = async function() {
          let finalAction;
          try {
            let conditionResult = options?.condition?.(arg, {
              getState,
              extra
            });
            if (isThenable(conditionResult)) {
              conditionResult = await conditionResult;
            }
            if (conditionResult === false || abortController.signal.aborted) {
              throw {
                name: "ConditionError",
                message: "Aborted due to condition callback returning false."
              };
            }
            const abortedPromise = new Promise((_, reject) => {
              abortHandler = () => {
                reject({
                  name: "AbortError",
                  message: abortReason || "Aborted"
                });
              };
              abortController.signal.addEventListener("abort", abortHandler);
            });
            dispatch(pending(requestId, arg, options?.getPendingMeta?.({
              requestId,
              arg
            }, {
              getState,
              extra
            })));
            finalAction = await Promise.race([abortedPromise, Promise.resolve(payloadCreator(arg, {
              dispatch,
              getState,
              extra,
              requestId,
              signal: abortController.signal,
              abort,
              rejectWithValue: (value, meta) => {
                return new RejectWithValue(value, meta);
              },
              fulfillWithValue: (value, meta) => {
                return new FulfillWithMeta(value, meta);
              }
            })).then((result) => {
              if (result instanceof RejectWithValue) {
                throw result;
              }
              if (result instanceof FulfillWithMeta) {
                return fulfilled(result.payload, requestId, arg, result.meta);
              }
              return fulfilled(result, requestId, arg);
            })]);
          } catch (err2) {
            finalAction = err2 instanceof RejectWithValue ? rejected(null, requestId, arg, err2.payload, err2.meta) : rejected(err2, requestId, arg);
          } finally {
            if (abortHandler) {
              abortController.signal.removeEventListener("abort", abortHandler);
            }
          }
          const skipDispatch = options && !options.dispatchConditionRejection && rejected.match(finalAction) && finalAction.meta.condition;
          if (!skipDispatch) {
            dispatch(finalAction);
          }
          return finalAction;
        }();
        return Object.assign(promise, {
          abort,
          requestId,
          arg,
          unwrap() {
            return promise.then(unwrapResult);
          }
        });
      };
    }
    return Object.assign(actionCreator, {
      pending,
      rejected,
      fulfilled,
      settled: isAnyOf(rejected, fulfilled),
      typePrefix
    });
  }
  createAsyncThunk2.withTypes = () => createAsyncThunk2;
  return createAsyncThunk2;
})();
function unwrapResult(action2) {
  if (action2.meta && action2.meta.rejectedWithValue) {
    throw action2.payload;
  }
  if (action2.error) {
    throw action2.error;
  }
  return action2.payload;
}
function isThenable(value) {
  return value !== null && typeof value === "object" && typeof value.then === "function";
}
var asyncThunkSymbol = /* @__PURE__ */ Symbol.for("rtk-slice-createasyncthunk");
var asyncThunkCreator = {
  [asyncThunkSymbol]: createAsyncThunk
};
function getType(slice2, actionKey) {
  return `${slice2}/${actionKey}`;
}
function buildCreateSlice({
  creators
} = {}) {
  const cAT = creators?.asyncThunk?.[asyncThunkSymbol];
  return function createSlice2(options) {
    const {
      name,
      reducerPath = name
    } = options;
    if (!name) {
      throw new Error(false ? formatProdErrorMessage(11) : "`name` is a required option for createSlice");
    }
    if (typeof process !== "undefined" && true) {
      if (options.initialState === void 0) {
        console.error("You must provide an `initialState` value that is not `undefined`. You may have misspelled `initialState`");
      }
    }
    const reducers = (typeof options.reducers === "function" ? options.reducers(buildReducerCreators()) : options.reducers) || {};
    const reducerNames = Object.keys(reducers);
    const context = {
      sliceCaseReducersByName: {},
      sliceCaseReducersByType: {},
      actionCreators: {},
      sliceMatchers: []
    };
    const contextMethods = {
      addCase(typeOrActionCreator, reducer2) {
        const type = typeof typeOrActionCreator === "string" ? typeOrActionCreator : typeOrActionCreator.type;
        if (!type) {
          throw new Error(false ? formatProdErrorMessage(12) : "`context.addCase` cannot be called with an empty action type");
        }
        if (type in context.sliceCaseReducersByType) {
          throw new Error(false ? formatProdErrorMessage(13) : "`context.addCase` cannot be called with two reducers for the same action type: " + type);
        }
        context.sliceCaseReducersByType[type] = reducer2;
        return contextMethods;
      },
      addMatcher(matcher, reducer2) {
        context.sliceMatchers.push({
          matcher,
          reducer: reducer2
        });
        return contextMethods;
      },
      exposeAction(name2, actionCreator) {
        context.actionCreators[name2] = actionCreator;
        return contextMethods;
      },
      exposeCaseReducer(name2, reducer2) {
        context.sliceCaseReducersByName[name2] = reducer2;
        return contextMethods;
      }
    };
    reducerNames.forEach((reducerName) => {
      const reducerDefinition = reducers[reducerName];
      const reducerDetails = {
        reducerName,
        type: getType(name, reducerName),
        createNotation: typeof options.reducers === "function"
      };
      if (isAsyncThunkSliceReducerDefinition(reducerDefinition)) {
        handleThunkCaseReducerDefinition(reducerDetails, reducerDefinition, contextMethods, cAT);
      } else {
        handleNormalReducerDefinition(reducerDetails, reducerDefinition, contextMethods);
      }
    });
    function buildReducer() {
      if (true) {
        if (typeof options.extraReducers === "object") {
          throw new Error(false ? formatProdErrorMessage(14) : "The object notation for `createSlice.extraReducers` has been removed. Please use the 'builder callback' notation instead: https://redux-toolkit.js.org/api/createSlice");
        }
      }
      const [extraReducers = {}, actionMatchers = [], defaultCaseReducer = void 0] = typeof options.extraReducers === "function" ? executeReducerBuilderCallback(options.extraReducers) : [options.extraReducers];
      const finalCaseReducers = {
        ...extraReducers,
        ...context.sliceCaseReducersByType
      };
      return createReducer(options.initialState, (builder) => {
        for (let key in finalCaseReducers) {
          builder.addCase(key, finalCaseReducers[key]);
        }
        for (let sM of context.sliceMatchers) {
          builder.addMatcher(sM.matcher, sM.reducer);
        }
        for (let m3 of actionMatchers) {
          builder.addMatcher(m3.matcher, m3.reducer);
        }
        if (defaultCaseReducer) {
          builder.addDefaultCase(defaultCaseReducer);
        }
      });
    }
    const selectSelf = (state3) => state3;
    const injectedSelectorCache = /* @__PURE__ */ new Map();
    let _reducer;
    function reducer(state3, action2) {
      if (!_reducer) _reducer = buildReducer();
      return _reducer(state3, action2);
    }
    function getInitialState() {
      if (!_reducer) _reducer = buildReducer();
      return _reducer.getInitialState();
    }
    function makeSelectorProps(reducerPath2, injected = false) {
      function selectSlice(state3) {
        let sliceState = state3[reducerPath2];
        if (typeof sliceState === "undefined") {
          if (injected) {
            sliceState = getInitialState();
          } else if (true) {
            throw new Error(false ? formatProdErrorMessage(15) : "selectSlice returned undefined for an uninjected slice reducer");
          }
        }
        return sliceState;
      }
      function getSelectors(selectState = selectSelf) {
        const selectorCache = getOrInsertComputed(injectedSelectorCache, injected, () => /* @__PURE__ */ new WeakMap());
        return getOrInsertComputed(selectorCache, selectState, () => {
          const map = {};
          for (const [name2, selector] of Object.entries(options.selectors ?? {})) {
            map[name2] = wrapSelector(selector, selectState, getInitialState, injected);
          }
          return map;
        });
      }
      return {
        reducerPath: reducerPath2,
        getSelectors,
        get selectors() {
          return getSelectors(selectSlice);
        },
        selectSlice
      };
    }
    const slice2 = {
      name,
      reducer,
      actions: context.actionCreators,
      caseReducers: context.sliceCaseReducersByName,
      getInitialState,
      ...makeSelectorProps(reducerPath),
      injectInto(injectable, {
        reducerPath: pathOpt,
        ...config
      } = {}) {
        const newReducerPath = pathOpt ?? reducerPath;
        injectable.inject({
          reducerPath: newReducerPath,
          reducer
        }, config);
        return {
          ...slice2,
          ...makeSelectorProps(newReducerPath, true)
        };
      }
    };
    return slice2;
  };
}
function wrapSelector(selector, selectState, getInitialState, injected) {
  function wrapper(rootState, ...args) {
    let sliceState = selectState(rootState);
    if (typeof sliceState === "undefined") {
      if (injected) {
        sliceState = getInitialState();
      } else if (true) {
        throw new Error(false ? formatProdErrorMessage(16) : "selectState returned undefined for an uninjected slice reducer");
      }
    }
    return selector(sliceState, ...args);
  }
  wrapper.unwrapped = selector;
  return wrapper;
}
function buildReducerCreators() {
  function asyncThunk(payloadCreator, config) {
    return {
      _reducerDefinitionType: "asyncThunk",
      payloadCreator,
      ...config
    };
  }
  asyncThunk.withTypes = () => asyncThunk;
  return {
    reducer(caseReducer) {
      return Object.assign({
        // hack so the wrapping function has the same name as the original
        // we need to create a wrapper so the `reducerDefinitionType` is not assigned to the original
        [caseReducer.name](...args) {
          return caseReducer(...args);
        }
      }[caseReducer.name], {
        _reducerDefinitionType: "reducer"
        /* reducer */
      });
    },
    preparedReducer(prepare, reducer) {
      return {
        _reducerDefinitionType: "reducerWithPrepare",
        prepare,
        reducer
      };
    },
    asyncThunk
  };
}
function handleNormalReducerDefinition({
  type,
  reducerName,
  createNotation
}, maybeReducerWithPrepare, context) {
  let caseReducer;
  let prepareCallback;
  if ("reducer" in maybeReducerWithPrepare) {
    if (createNotation && !isCaseReducerWithPrepareDefinition(maybeReducerWithPrepare)) {
      throw new Error(false ? formatProdErrorMessage(17) : "Please use the `create.preparedReducer` notation for prepared action creators with the `create` notation.");
    }
    caseReducer = maybeReducerWithPrepare.reducer;
    prepareCallback = maybeReducerWithPrepare.prepare;
  } else {
    caseReducer = maybeReducerWithPrepare;
  }
  context.addCase(type, caseReducer).exposeCaseReducer(reducerName, caseReducer).exposeAction(reducerName, prepareCallback ? createAction(type, prepareCallback) : createAction(type));
}
function isAsyncThunkSliceReducerDefinition(reducerDefinition) {
  return reducerDefinition._reducerDefinitionType === "asyncThunk";
}
function isCaseReducerWithPrepareDefinition(reducerDefinition) {
  return reducerDefinition._reducerDefinitionType === "reducerWithPrepare";
}
function handleThunkCaseReducerDefinition({
  type,
  reducerName
}, reducerDefinition, context, cAT) {
  if (!cAT) {
    throw new Error(false ? formatProdErrorMessage(18) : "Cannot use `create.asyncThunk` in the built-in `createSlice`. Use `buildCreateSlice({ creators: { asyncThunk: asyncThunkCreator } })` to create a customised version of `createSlice`.");
  }
  const {
    payloadCreator,
    fulfilled,
    pending,
    rejected,
    settled,
    options
  } = reducerDefinition;
  const thunk2 = cAT(type, payloadCreator, options);
  context.exposeAction(reducerName, thunk2);
  if (fulfilled) {
    context.addCase(thunk2.fulfilled, fulfilled);
  }
  if (pending) {
    context.addCase(thunk2.pending, pending);
  }
  if (rejected) {
    context.addCase(thunk2.rejected, rejected);
  }
  if (settled) {
    context.addMatcher(thunk2.settled, settled);
  }
  context.exposeCaseReducer(reducerName, {
    fulfilled: fulfilled || noop,
    pending: pending || noop,
    rejected: rejected || noop,
    settled: settled || noop
  });
}
function noop() {
}
function getInitialEntityState() {
  return {
    ids: [],
    entities: {}
  };
}
function createInitialStateFactory(stateAdapter) {
  function getInitialState(additionalState = {}, entities) {
    const state3 = Object.assign(getInitialEntityState(), additionalState);
    return entities ? stateAdapter.setAll(state3, entities) : state3;
  }
  return {
    getInitialState
  };
}
function createSelectorsFactory() {
  function getSelectors(selectState, options = {}) {
    const {
      createSelector: createSelector2 = createDraftSafeSelector
    } = options;
    const selectIds2 = (state3) => state3.ids;
    const selectEntities2 = (state3) => state3.entities;
    const selectAll2 = createSelector2(selectIds2, selectEntities2, (ids, entities) => ids.map((id) => entities[id]));
    const selectId = (_, id) => id;
    const selectById2 = (entities, id) => entities[id];
    const selectTotal2 = createSelector2(selectIds2, (ids) => ids.length);
    if (!selectState) {
      return {
        selectIds: selectIds2,
        selectEntities: selectEntities2,
        selectAll: selectAll2,
        selectTotal: selectTotal2,
        selectById: createSelector2(selectEntities2, selectId, selectById2)
      };
    }
    const selectGlobalizedEntities = createSelector2(selectState, selectEntities2);
    return {
      selectIds: createSelector2(selectState, selectIds2),
      selectEntities: selectGlobalizedEntities,
      selectAll: createSelector2(selectState, selectAll2),
      selectTotal: createSelector2(selectState, selectTotal2),
      selectById: createSelector2(selectGlobalizedEntities, selectId, selectById2)
    };
  }
  return {
    getSelectors
  };
}
var isDraftTyped = isDraft;
function createSingleArgumentStateOperator(mutator) {
  const operator = createStateOperator((_, state3) => mutator(state3));
  return function operation(state3) {
    return operator(state3, void 0);
  };
}
function createStateOperator(mutator) {
  return function operation(state3, arg) {
    function isPayloadActionArgument(arg2) {
      return isFSA(arg2);
    }
    const runMutator = (draft) => {
      if (isPayloadActionArgument(arg)) {
        mutator(arg.payload, draft);
      } else {
        mutator(arg, draft);
      }
    };
    if (isDraftTyped(state3)) {
      runMutator(state3);
      return state3;
    }
    return produce(state3, runMutator);
  };
}
function selectIdValue(entity, selectId) {
  const key = selectId(entity);
  if (key === void 0) {
    console.warn("The entity passed to the `selectId` implementation returned undefined.", "You should probably provide your own `selectId` implementation.", "The entity that was passed:", entity, "The `selectId` implementation:", selectId.toString());
  }
  return key;
}
function ensureEntitiesArray(entities) {
  if (!Array.isArray(entities)) {
    entities = Object.values(entities);
  }
  return entities;
}
function getCurrent(value) {
  return isDraft(value) ? current(value) : value;
}
function splitAddedUpdatedEntities(newEntities, selectId, state3) {
  newEntities = ensureEntitiesArray(newEntities);
  const existingIdsArray = getCurrent(state3.ids);
  const existingIds = new Set(existingIdsArray);
  const added = [];
  const updated = [];
  for (const entity of newEntities) {
    const id = selectIdValue(entity, selectId);
    if (existingIds.has(id)) {
      updated.push({
        id,
        changes: entity
      });
    } else {
      added.push(entity);
    }
  }
  return [added, updated, existingIdsArray];
}
function createUnsortedStateAdapter(selectId) {
  function addOneMutably(entity, state3) {
    const key = selectIdValue(entity, selectId);
    if (key in state3.entities) {
      return;
    }
    state3.ids.push(key);
    state3.entities[key] = entity;
  }
  function addManyMutably(newEntities, state3) {
    newEntities = ensureEntitiesArray(newEntities);
    for (const entity of newEntities) {
      addOneMutably(entity, state3);
    }
  }
  function setOneMutably(entity, state3) {
    const key = selectIdValue(entity, selectId);
    if (!(key in state3.entities)) {
      state3.ids.push(key);
    }
    ;
    state3.entities[key] = entity;
  }
  function setManyMutably(newEntities, state3) {
    newEntities = ensureEntitiesArray(newEntities);
    for (const entity of newEntities) {
      setOneMutably(entity, state3);
    }
  }
  function setAllMutably(newEntities, state3) {
    newEntities = ensureEntitiesArray(newEntities);
    state3.ids = [];
    state3.entities = {};
    addManyMutably(newEntities, state3);
  }
  function removeOneMutably(key, state3) {
    return removeManyMutably([key], state3);
  }
  function removeManyMutably(keys, state3) {
    let didMutate = false;
    keys.forEach((key) => {
      if (key in state3.entities) {
        delete state3.entities[key];
        didMutate = true;
      }
    });
    if (didMutate) {
      state3.ids = state3.ids.filter((id) => id in state3.entities);
    }
  }
  function removeAllMutably(state3) {
    Object.assign(state3, {
      ids: [],
      entities: {}
    });
  }
  function takeNewKey(keys, update, state3) {
    const original3 = state3.entities[update.id];
    if (original3 === void 0) {
      return false;
    }
    const updated = Object.assign({}, original3, update.changes);
    const newKey = selectIdValue(updated, selectId);
    const hasNewKey = newKey !== update.id;
    if (hasNewKey) {
      keys[update.id] = newKey;
      delete state3.entities[update.id];
    }
    ;
    state3.entities[newKey] = updated;
    return hasNewKey;
  }
  function updateOneMutably(update, state3) {
    return updateManyMutably([update], state3);
  }
  function updateManyMutably(updates, state3) {
    const newKeys = {};
    const updatesPerEntity = {};
    updates.forEach((update) => {
      if (update.id in state3.entities) {
        updatesPerEntity[update.id] = {
          id: update.id,
          // Spreads ignore falsy values, so this works even if there isn't
          // an existing update already at this key
          changes: {
            ...updatesPerEntity[update.id]?.changes,
            ...update.changes
          }
        };
      }
    });
    updates = Object.values(updatesPerEntity);
    const didMutateEntities = updates.length > 0;
    if (didMutateEntities) {
      const didMutateIds = updates.filter((update) => takeNewKey(newKeys, update, state3)).length > 0;
      if (didMutateIds) {
        state3.ids = Object.values(state3.entities).map((e2) => selectIdValue(e2, selectId));
      }
    }
  }
  function upsertOneMutably(entity, state3) {
    return upsertManyMutably([entity], state3);
  }
  function upsertManyMutably(newEntities, state3) {
    const [added, updated] = splitAddedUpdatedEntities(newEntities, selectId, state3);
    updateManyMutably(updated, state3);
    addManyMutably(added, state3);
  }
  return {
    removeAll: createSingleArgumentStateOperator(removeAllMutably),
    addOne: createStateOperator(addOneMutably),
    addMany: createStateOperator(addManyMutably),
    setOne: createStateOperator(setOneMutably),
    setMany: createStateOperator(setManyMutably),
    setAll: createStateOperator(setAllMutably),
    updateOne: createStateOperator(updateOneMutably),
    updateMany: createStateOperator(updateManyMutably),
    upsertOne: createStateOperator(upsertOneMutably),
    upsertMany: createStateOperator(upsertManyMutably),
    removeOne: createStateOperator(removeOneMutably),
    removeMany: createStateOperator(removeManyMutably)
  };
}
function findInsertIndex(sortedItems, item, comparisonFunction) {
  let lowIndex = 0;
  let highIndex = sortedItems.length;
  while (lowIndex < highIndex) {
    let middleIndex = lowIndex + highIndex >>> 1;
    const currentItem = sortedItems[middleIndex];
    const res = comparisonFunction(item, currentItem);
    if (res >= 0) {
      lowIndex = middleIndex + 1;
    } else {
      highIndex = middleIndex;
    }
  }
  return lowIndex;
}
function insert(sortedItems, item, comparisonFunction) {
  const insertAtIndex = findInsertIndex(sortedItems, item, comparisonFunction);
  sortedItems.splice(insertAtIndex, 0, item);
  return sortedItems;
}
function createSortedStateAdapter(selectId, comparer) {
  const {
    removeOne,
    removeMany,
    removeAll
  } = createUnsortedStateAdapter(selectId);
  function addOneMutably(entity, state3) {
    return addManyMutably([entity], state3);
  }
  function addManyMutably(newEntities, state3, existingIds) {
    newEntities = ensureEntitiesArray(newEntities);
    const existingKeys = new Set(existingIds ?? getCurrent(state3.ids));
    const models = newEntities.filter((model) => !existingKeys.has(selectIdValue(model, selectId)));
    if (models.length !== 0) {
      mergeFunction(state3, models);
    }
  }
  function setOneMutably(entity, state3) {
    return setManyMutably([entity], state3);
  }
  function setManyMutably(newEntities, state3) {
    newEntities = ensureEntitiesArray(newEntities);
    if (newEntities.length !== 0) {
      for (const item of newEntities) {
        delete state3.entities[selectId(item)];
      }
      mergeFunction(state3, newEntities);
    }
  }
  function setAllMutably(newEntities, state3) {
    newEntities = ensureEntitiesArray(newEntities);
    state3.entities = {};
    state3.ids = [];
    addManyMutably(newEntities, state3, []);
  }
  function updateOneMutably(update, state3) {
    return updateManyMutably([update], state3);
  }
  function updateManyMutably(updates, state3) {
    let appliedUpdates = false;
    let replacedIds = false;
    for (let update of updates) {
      const entity = state3.entities[update.id];
      if (!entity) {
        continue;
      }
      appliedUpdates = true;
      Object.assign(entity, update.changes);
      const newId = selectId(entity);
      if (update.id !== newId) {
        replacedIds = true;
        delete state3.entities[update.id];
        const oldIndex = state3.ids.indexOf(update.id);
        state3.ids[oldIndex] = newId;
        state3.entities[newId] = entity;
      }
    }
    if (appliedUpdates) {
      mergeFunction(state3, [], appliedUpdates, replacedIds);
    }
  }
  function upsertOneMutably(entity, state3) {
    return upsertManyMutably([entity], state3);
  }
  function upsertManyMutably(newEntities, state3) {
    const [added, updated, existingIdsArray] = splitAddedUpdatedEntities(newEntities, selectId, state3);
    if (updated.length) {
      updateManyMutably(updated, state3);
    }
    if (added.length) {
      addManyMutably(added, state3, existingIdsArray);
    }
  }
  function areArraysEqual(a3, b2) {
    if (a3.length !== b2.length) {
      return false;
    }
    for (let i2 = 0; i2 < a3.length; i2++) {
      if (a3[i2] === b2[i2]) {
        continue;
      }
      return false;
    }
    return true;
  }
  const mergeFunction = (state3, addedItems, appliedUpdates, replacedIds) => {
    const currentEntities = getCurrent(state3.entities);
    const currentIds = getCurrent(state3.ids);
    const stateEntities = state3.entities;
    let ids = currentIds;
    if (replacedIds) {
      ids = new Set(currentIds);
    }
    let sortedEntities = [];
    for (const id of ids) {
      const entity = currentEntities[id];
      if (entity) {
        sortedEntities.push(entity);
      }
    }
    const wasPreviouslyEmpty = sortedEntities.length === 0;
    for (const item of addedItems) {
      stateEntities[selectId(item)] = item;
      if (!wasPreviouslyEmpty) {
        insert(sortedEntities, item, comparer);
      }
    }
    if (wasPreviouslyEmpty) {
      sortedEntities = addedItems.slice().sort(comparer);
    } else if (appliedUpdates) {
      sortedEntities.sort(comparer);
    }
    const newSortedIds = sortedEntities.map(selectId);
    if (!areArraysEqual(currentIds, newSortedIds)) {
      state3.ids = newSortedIds;
    }
  };
  return {
    removeOne,
    removeMany,
    removeAll,
    addOne: createStateOperator(addOneMutably),
    updateOne: createStateOperator(updateOneMutably),
    upsertOne: createStateOperator(upsertOneMutably),
    setOne: createStateOperator(setOneMutably),
    setMany: createStateOperator(setManyMutably),
    setAll: createStateOperator(setAllMutably),
    addMany: createStateOperator(addManyMutably),
    updateMany: createStateOperator(updateManyMutably),
    upsertMany: createStateOperator(upsertManyMutably)
  };
}
function createEntityAdapter(options = {}) {
  const {
    selectId,
    sortComparer
  } = {
    sortComparer: false,
    selectId: (instance) => instance.id,
    ...options
  };
  const stateAdapter = sortComparer ? createSortedStateAdapter(selectId, sortComparer) : createUnsortedStateAdapter(selectId);
  const stateFactory = createInitialStateFactory(stateAdapter);
  const selectorsFactory = createSelectorsFactory();
  return {
    selectId,
    sortComparer,
    ...stateFactory,
    ...selectorsFactory,
    ...stateAdapter
  };
}
var listener = "listener";
var completed = "completed";
var cancelled = "cancelled";
var taskCancelled = `task-${cancelled}`;
var taskCompleted = `task-${completed}`;
var listenerCancelled = `${listener}-${cancelled}`;
var listenerCompleted = `${listener}-${completed}`;
var {
  assign
} = Object;
var alm = "listenerMiddleware";
var addListener = /* @__PURE__ */ assign(/* @__PURE__ */ createAction(`${alm}/add`), {
  withTypes: () => addListener
});
var clearAllListeners = /* @__PURE__ */ createAction(`${alm}/removeAll`);
var removeListener = /* @__PURE__ */ assign(/* @__PURE__ */ createAction(`${alm}/remove`), {
  withTypes: () => removeListener
});
var ORIGINAL_STATE = Symbol.for("rtk-state-proxy-original");

// packages/ai/policy/types.ts
var DEFAULT_AGENT_BASE_POLICY = {
  version: 1,
  tone: {
    preset: "default",
    resolutionMode: "blend"
  },
  knowledgeCaptureMaxLevel: 4,
  spaceContextMaxLevel: 4,
  selfEvolutionMode: "knowledge_only"
};
var DEFAULT_USER_PREFERENCE_PROFILE = {
  version: 1,
  tone: {
    preset: "default"
  },
  knowledgeCaptureLevel: 2,
  spaceContextLevel: 3
};

// packages/ai/tools/agentCapabilities.ts
var SYSTEM_AGENT_CAPABILITIES = [
  {
    id: "web-search",
    label: "\u8054\u7F51\u641C\u7D22",
    description: "\u8BA9 agent \u80FD\u641C\u7D22\u4E92\u8054\u7F51\u3001\u6293\u53D6\u7F51\u9875\u5185\u5BB9\uFF0C\u83B7\u53D6\u6700\u65B0\u4FE1\u606F\u3002",
    tools: ["exa_search", "fetchWebpage"],
    defaultEnabled: true,
    icon: "\u{1F310}"
  },
  {
    id: "agent-orchestration",
    label: "\u591A agent \u7F16\u6392",
    description: "\u5148\u6309\u6536\u85CF\u3001\u7B80\u4ECB\u3001\u80FD\u529B\u548C\u6210\u672C\u5217\u51FA\u5B89\u5168 agent \u6458\u8981\uFF0C\u6309\u9700\u8BFB\u53D6\u5019\u9009\u914D\u7F6E\u89E3\u6790\u53EF\u8FD0\u884C key\uFF0C\u518D\u540E\u53F0\u542F\u52A8\u5176\u4ED6 agent \u6267\u884C\u5B50\u4EFB\u52A1\uFF0C\u5E76\u89C2\u5BDF\u3001\u67E5\u8BE2\u3001\u505C\u6B62\u8FD0\u884C\u4E2D\u7684 agent run\u2014\u2014\u9002\u5408\u5E76\u884C\u6D3E\u53D1\u3001\u957F\u4EFB\u52A1\u8DDF\u8E2A\u3001\u4E2D\u9014\u53EB\u505C\u7B49\u7F16\u6392\u573A\u666F\u3002",
    tools: ["startAgentRun", "controlAgentRun", "listAgents"],
    defaultEnabled: true,
    icon: "\u{1F9E9}"
  }
];
var SYSTEM_AGENT_CAPABILITY_IDS = SYSTEM_AGENT_CAPABILITIES.map(
  ({ id }) => id
);
var DEFAULT_SYSTEM_AGENT_CAPABILITIES = Object.fromEntries(
  SYSTEM_AGENT_CAPABILITIES.map(({ id, defaultEnabled }) => [
    id,
    defaultEnabled
  ])
);

// packages/ai/policy/selfUpdateFields.ts
var AGENT_UPDATE_FIELD_NAMES = [
  "name",
  "handle",
  "model",
  "provider",
  "prompt",
  "introduction",
  "greeting",
  "isPublic",
  "tags",
  "tools",
  "references",
  "temperature",
  "top_p",
  "frequency_penalty",
  "presence_penalty",
  "max_tokens",
  "reasoning_effort"
];
var PRIMARY_AUTO_APPROVE_SELF_UPDATE_FIELDS = [
  "greeting",
  "introduction",
  "tags"
];
var DEFAULT_AUTO_APPROVED_SELF_UPDATE_FIELDS = [
  ...PRIMARY_AUTO_APPROVE_SELF_UPDATE_FIELDS
];
var HIGH_IMPACT_SELF_UPDATE_FIELDS = [
  "prompt",
  "tools",
  "references",
  "model",
  "provider",
  "isPublic",
  "handle"
];
var VALID_AGENT_UPDATE_FIELDS = new Set(AGENT_UPDATE_FIELD_NAMES);
var normalizeAgentUpdateFieldList = (value, fallback = DEFAULT_AUTO_APPROVED_SELF_UPDATE_FIELDS) => {
  if (!Array.isArray(value)) {
    return [...fallback];
  }
  const normalized = Array.from(
    new Set(
      value.filter(
        (item) => typeof item === "string" && VALID_AGENT_UPDATE_FIELDS.has(item)
      )
    )
  );
  return normalized;
};

// packages/database/config.ts
var API_VERSION = "/api/v1";
var SERVERS = {
  MAIN: "https://nolo.chat",
  US: "https://us.nolo.chat"
};
var NOLO_CLUSTER_SERVERS = Object.values(SERVERS);
var LEGACY_SERVER_ORIGIN_MAP = {
  "https://nolotus.com": SERVERS.MAIN,
  "https://www.nolotus.com": SERVERS.MAIN,
  "https://us.nolotus.com": SERVERS.US,
  "https://www.us.nolotus.com": SERVERS.US
};
var normalizeKnownServerOrigin = (server) => {
  if (typeof server !== "string" || server.trim().length === 0) return null;
  const trimmed = server.trim();
  let origin;
  try {
    origin = new URL(trimmed).origin;
  } catch {
    origin = normalizeServerOrigin(trimmed);
  }
  return LEGACY_SERVER_ORIGIN_MAP[origin.toLowerCase()] ?? origin;
};
var LOCAL_DEV_SERVER_ORIGIN_PATTERN = /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|nolotus\.local)(?::\d+)?$/i;
var isLocalDevServerOrigin = (server) => {
  if (typeof server !== "string" || server.trim().length === 0) return false;
  const normalized = normalizeKnownServerOrigin(server) ?? normalizeServerOrigin(server);
  return LOCAL_DEV_SERVER_ORIGIN_PATTERN.test(normalized);
};
var isNoloClusterServerOrigin = (server) => {
  if (typeof server !== "string" || server.trim().length === 0) return false;
  const normalized = normalizeKnownServerOrigin(server) ?? normalizeServerOrigin(server);
  return /^https?:\/\/(?:us\.)?nolo\.chat$/i.test(normalized);
};
var API_ENDPOINTS = {
  DATABASE: `${API_VERSION}/db`,
  SHARE: `${API_VERSION}/share`,
  USERS: `${API_VERSION}/users`,
  WEATHER: `${API_VERSION}/weather`,
  HI: `${API_VERSION}/hi`,
  CHAT: `${API_VERSION}/chat`,
  EXECUTE_SQL: `${API_VERSION}/sqlite/execute_sql`,
  // --- 新增端点 ---
  TRANSACTIONS: `${API_VERSION}/transactions`
};

// packages/app/theme/fontPreference.ts
var FONT_PRESET_VALUES = [
  "system",
  "hei",
  "song",
  "kai",
  "fang-song"
];
var DEFAULT_FONT_PRESET = "hei";
var FONT_PRESET_STORAGE_KEY = "nolo-font-preset";
var FONT_PRESET_ALIASES = {
  system: "system",
  default: "system",
  hei: "hei",
  heiti: "hei",
  sans: "hei",
  song: "song",
  songti: "song",
  serif: "song",
  kai: "kai",
  kaiti: "kai",
  "kai-ti": "kai",
  "fang-song": "fang-song",
  fangsong: "fang-song",
  "fang song": "fang-song"
};
var normalizeFontPreset = (value) => {
  const normalized = asTrimmedLowercaseString(value);
  return FONT_PRESET_ALIASES[normalized];
};
var FONT_PRESET_CSS_VARIABLES = {
  system: {
    ui: "var(--font-ui-system)",
    "sans-zh": "var(--font-sans-zh-system)",
    "sans-en": "var(--font-sans-en-system)",
    "sans-ja": "var(--font-sans-ja-system)",
    "sans-ko": "var(--font-sans-ko-system)"
  },
  hei: {
    ui: "var(--font-ui-hei)",
    "sans-zh": "var(--font-sans-zh-hei)",
    "sans-en": "var(--font-sans-en-hei)",
    "sans-ja": "var(--font-sans-ja-system)",
    "sans-ko": "var(--font-sans-ko-system)"
  },
  song: {
    ui: "var(--font-ui-song)",
    "sans-zh": "var(--font-sans-zh-song)",
    "sans-en": "var(--font-sans-en-song)",
    "sans-ja": "var(--font-sans-ja-system)",
    "sans-ko": "var(--font-sans-ko-system)"
  },
  kai: {
    ui: "var(--font-ui-kai)",
    "sans-zh": "var(--font-sans-zh-kai)",
    "sans-en": "var(--font-sans-en-kai)",
    "sans-ja": "var(--font-sans-ja-system)",
    "sans-ko": "var(--font-sans-ko-system)"
  },
  "fang-song": {
    ui: "var(--font-ui-fang-song)",
    "sans-zh": "var(--font-sans-zh-fang-song)",
    "sans-en": "var(--font-sans-en-fang-song)",
    "sans-ja": "var(--font-sans-ja-system)",
    "sans-ko": "var(--font-sans-ko-system)"
  }
};

// packages/app/theme/colors.ts
var semantic = {
  light: { success: "#16A34A", warning: "#D97706", info: "#2563EB", error: "#DC2626" },
  dark: { success: "#4ADE80", warning: "#FCD34D", info: "#60A5FA", error: "#F87171" }
};
var mkLight = (bg, bg2, bg3, textPrimary, textSec, textTer, border, borderL) => ({
  background: bg,
  backgroundSecondary: bg2,
  backgroundTertiary: bg3,
  backgroundGhost: bg + "F0",
  backgroundHover: bg3,
  backgroundSelected: border,
  backgroundElevated: bg2,
  text: textPrimary,
  textSecondary: textSec,
  textTertiary: textTer,
  textQuaternary: textTer + "99",
  textLight: border,
  placeholder: textTer,
  border,
  borderLight: borderL,
  borderHover: textTer,
  messageBackground: bg2,
  codeBackground: bg3,
  shadowLight: `rgba(0,0,0,0.04)`,
  shadowMedium: `rgba(0,0,0,0.08)`,
  shadowHeavy: `rgba(0,0,0,0.14)`,
  textOnPrimary: "#FFFFFF"
});
var mkDark = (bg, bg2, bg3, textPrimary, textSec, textTer, border, borderL, shadowBase = "0,0,0") => ({
  background: bg,
  backgroundSecondary: bg2,
  backgroundTertiary: bg3,
  backgroundGhost: bg2 + "F0",
  backgroundHover: bg3,
  backgroundSelected: border,
  backgroundElevated: bg3,
  text: textPrimary,
  textSecondary: textSec,
  textTertiary: textTer,
  textQuaternary: textTer + "88",
  textLight: border,
  placeholder: textTer,
  border,
  borderLight: borderL,
  borderHover: textTer,
  messageBackground: bg2,
  codeBackground: bg2,
  shadowLight: `rgba(${shadowBase},0.18)`,
  shadowMedium: `rgba(${shadowBase},0.30)`,
  shadowHeavy: `rgba(${shadowBase},0.44)`,
  textOnPrimary: "#FFFFFF"
});
var neutral = {
  light: {
    primary: "#71717A",
    primaryLight: "#A1A1AA",
    primaryDark: "#52525B",
    primaryGradient: "linear-gradient(135deg, #71717A, #A1A1AA)",
    primaryGhost: "rgba(113,113,122,0.08)",
    primaryHover: "rgba(113,113,122,0.10)",
    borderAccent: "#D4D4D8",
    ...semantic.light,
    ...mkLight("#FFFFFF", "#F4F4F5", "#E4E4E7", "#18181B", "#52525B", "#71717A", "#E4E4E7", "#F4F4F5")
  },
  dark: {
    primary: "#A1A1AA",
    primaryLight: "#D4D4D8",
    primaryDark: "#71717A",
    primaryGradient: "linear-gradient(135deg, #A1A1AA, #D4D4D8)",
    primaryGhost: "rgba(161,161,170,0.10)",
    primaryHover: "rgba(161,161,170,0.12)",
    borderAccent: "#52525B",
    ...semantic.dark,
    ...mkDark("#18181B", "#27272A", "#3F3F46", "#FAFAFA", "#D4D4D8", "#A1A1AA", "#3F3F46", "#27272A", "24,24,27"),
    textOnPrimary: "#18181B"
  }
};
var ocean = {
  light: {
    primary: "#0969DA",
    primaryLight: "#218BFF",
    primaryDark: "#0550AE",
    primaryGradient: "linear-gradient(135deg, #0969DA, #218BFF)",
    primaryGhost: "rgba(9,105,218,0.08)",
    primaryHover: "rgba(9,105,218,0.10)",
    borderAccent: "#54AEFF",
    ...semantic.light,
    ...mkLight("#FFFFFF", "#F6F8FA", "#EBF0F4", "#1C2128", "#57606A", "#6E7781", "#D0D7DE", "#F6F8FA")
  },
  dark: {
    primary: "#58A6FF",
    primaryLight: "#79C0FF",
    primaryDark: "#388BFD",
    primaryGradient: "linear-gradient(135deg, #58A6FF, #79C0FF)",
    primaryGhost: "rgba(88,166,255,0.10)",
    primaryHover: "rgba(88,166,255,0.12)",
    borderAccent: "#1F6FEB",
    ...semantic.dark,
    ...mkDark("#0D1117", "#161B22", "#21262D", "#E6EDF3", "#8B949E", "#6E7681", "#30363D", "#161B22", "13,17,23"),
    textHeading: "#E6EDF3",
    textOnPrimary: "#0D1117"
  }
};
var iris = {
  meta: { radiusBoost: -2, motionEase: "cubic-bezier(0.16, 1, 0.3, 1)" },
  light: {
    primary: "#5E6AD2",
    primaryLight: "#8B9CF4",
    primaryDark: "#4A55C0",
    primaryGradient: "linear-gradient(135deg, #5E6AD2, #8B9CF4)",
    primaryGhost: "rgba(94, 106, 210, 0.07)",
    primaryHover: "rgba(94, 106, 210, 0.10)",
    borderAccent: "#ADB5F7",
    success: "#16A34A",
    warning: "#D97706",
    info: "#5E6AD2",
    error: "#E5484D",
    background: "#FBFBFD",
    backgroundSecondary: "#F4F4F9",
    backgroundTertiary: "#ECECF3",
    backgroundGhost: "rgba(251, 251, 253, 0.94)",
    backgroundHover: "#E4E4ED",
    backgroundSelected: "#D8D8E3",
    backgroundElevated: "#F7F7FB",
    text: "#1A1730",
    textSecondary: "#4E4B6B",
    textTertiary: "#6E6A8A",
    textQuaternary: "#9E9AB5",
    textLight: "#C4C2D4",
    placeholder: "#9E9AB5",
    border: "#E4E4ED",
    borderHover: "#CFCFD9",
    borderLight: "#F2F2F7",
    messageBackground: "#FFFFFF",
    codeBackground: "#F2F2F7",
    shadowLight: "rgba(26, 23, 48, 0.04)",
    shadowMedium: "rgba(26, 23, 48, 0.08)",
    shadowHeavy: "rgba(26, 23, 48, 0.13)",
    textHeading: "#1A1730",
    textOnPrimary: "#FFFFFF"
  },
  dark: {
    primary: "#8B9CF4",
    primaryLight: "#ADB5F7",
    primaryDark: "#5E6AD2",
    primaryGradient: "linear-gradient(135deg, #8B9CF4, #ADB5F7)",
    primaryGhost: "rgba(139, 156, 244, 0.10)",
    primaryHover: "rgba(139, 156, 244, 0.14)",
    borderAccent: "#4A55C0",
    success: "#26BD6C",
    warning: "#F5A623",
    info: "#8B9CF4",
    error: "#EC5B6E",
    background: "#0F0E17",
    backgroundSecondary: "#16141F",
    backgroundTertiary: "#1E1B2E",
    backgroundGhost: "rgba(15, 14, 23, 0.94)",
    backgroundHover: "#28253A",
    backgroundSelected: "#36334D",
    backgroundElevated: "#1E1B2E",
    text: "#E8E5F7",
    textSecondary: "#C0BDD8",
    textTertiary: "#938AA9",
    textQuaternary: "#5A5772",
    textLight: "#36334D",
    placeholder: "#5A5772",
    border: "#272435",
    borderHover: "#3A3650",
    borderLight: "#16141F",
    messageBackground: "#16141F",
    codeBackground: "#0A0911",
    shadowLight: "rgba(10, 9, 17, 0.20)",
    shadowMedium: "rgba(10, 9, 17, 0.32)",
    shadowHeavy: "rgba(10, 9, 17, 0.44)",
    textHeading: "#E8E5F7",
    textOnPrimary: "#0F0E17"
  }
};
var forest = {
  light: {
    primary: "#059669",
    primaryLight: "#10B981",
    primaryDark: "#047857",
    primaryGradient: "linear-gradient(135deg, #059669, #10B981)",
    primaryGhost: "rgba(5,150,105,0.08)",
    primaryHover: "rgba(5,150,105,0.10)",
    borderAccent: "#6EE7B7",
    ...semantic.light,
    ...mkLight("#F6FAF6", "#EDF5EC", "#DDF0DB", "#1A2E18", "#3D6B3A", "#5C8A58", "#C3E0C0", "#EDF5EC")
  },
  dark: {
    primary: "#34D399",
    primaryLight: "#6EE7B7",
    primaryDark: "#10B981",
    primaryGradient: "linear-gradient(135deg, #34D399, #6EE7B7)",
    primaryGhost: "rgba(52,211,153,0.10)",
    primaryHover: "rgba(52,211,153,0.12)",
    borderAccent: "#059669",
    ...semantic.dark,
    ...mkDark("#0C1209", "#121A0E", "#1A2416", "#E4F0E2", "#87A882", "#5E7A5A", "#1A2416", "#121A0E", "12,18,9"),
    success: "#4ADE80",
    textHeading: "#C8EEC4",
    textOnPrimary: "#0C1209"
  }
};
var trail = {
  meta: { radiusBoost: 1, motionEase: "cubic-bezier(0.22, 1, 0.36, 1)" },
  light: {
    primary: "#2E7DB5",
    primaryLight: "#6BB5E0",
    primaryDark: "#1F5F94",
    primaryGradient: "linear-gradient(135deg, #2E7DB5, #6BB5E0)",
    primaryGhost: "rgba(46, 125, 181, 0.08)",
    primaryHover: "rgba(46, 125, 181, 0.11)",
    borderAccent: "#9EC9E8",
    success: "#3F8F5C",
    warning: "#D4A054",
    info: "#4A9FD4",
    error: "#C45C4A",
    accentTrail: "#C9924E",
    accentMoss: "#7A9B6E",
    accentTrailGhost: "rgba(201, 146, 78, 0.10)",
    accentMossGhost: "rgba(122, 155, 110, 0.10)",
    background: "#FAFBFC",
    backgroundSecondary: "#F4F7FA",
    backgroundTertiary: "#E8EDF2",
    backgroundGhost: "rgba(250, 251, 252, 0.94)",
    backgroundHover: "#DCE4EC",
    backgroundSelected: "#C8D4E0",
    text: "#1C2430",
    textSecondary: "#5C6775",
    textTertiary: "#7A8796",
    textQuaternary: "#A3B0BD",
    textLight: "#C5CED8",
    placeholder: "#A3B0BD",
    border: "#D8E0E8",
    borderHover: "#B8C5D4",
    borderLight: "#EEF2F6",
    messageBackground: "#FFFFFF",
    codeBackground: "#EEF2F6",
    shadowLight: "rgba(28, 36, 48, 0.05)",
    shadowMedium: "rgba(28, 36, 48, 0.09)",
    shadowHeavy: "rgba(28, 36, 48, 0.14)",
    textHeading: "#1C2430",
    textOnPrimary: "#FFFFFF"
  },
  dark: {
    primary: "#5BA3D9",
    primaryLight: "#7FBEE8",
    primaryDark: "#3D85BF",
    primaryGradient: "linear-gradient(135deg, #5BA3D9, #7FBEE8)",
    primaryGhost: "rgba(91, 163, 217, 0.12)",
    primaryHover: "rgba(91, 163, 217, 0.16)",
    borderAccent: "#2F5F78",
    success: "#5CB87A",
    warning: "#E6B35C",
    info: "#6BB8E8",
    error: "#E07060",
    accentTrail: "#D4A96A",
    accentMoss: "#8FB896",
    accentTrailGhost: "rgba(212, 169, 106, 0.12)",
    accentMossGhost: "rgba(143, 184, 150, 0.12)",
    background: "#0B1218",
    backgroundSecondary: "#111A22",
    backgroundTertiary: "#1A2630",
    backgroundGhost: "rgba(11, 18, 24, 0.94)",
    backgroundHover: "#243240",
    backgroundSelected: "#2E4050",
    text: "#EEF3F8",
    textSecondary: "#A8B8C8",
    textTertiary: "#7A8FA3",
    textQuaternary: "#5A6F82",
    textLight: "#3A4F62",
    placeholder: "#5A6F82",
    border: "#243240",
    borderHover: "#3A5060",
    borderLight: "#111A22",
    messageBackground: "#111A22",
    codeBackground: "#070D12",
    shadowLight: "rgba(4, 8, 12, 0.22)",
    shadowMedium: "rgba(4, 8, 12, 0.34)",
    shadowHeavy: "rgba(4, 8, 12, 0.46)",
    textHeading: "#E8F4FC",
    textOnPrimary: "#0B1218"
  }
};
var wave = {
  light: {
    // Kanagawa Lotus — lotusBlue3 accent（日式水墨蓝，与 Wave dark 气质呼应）
    primary: "#4D699B",
    primaryLight: "#6680B3",
    primaryDark: "#3C5585",
    primaryGradient: "linear-gradient(135deg, #4D699B, #6680B3)",
    primaryGhost: "rgba(77, 105, 155, 0.08)",
    primaryHover: "rgba(77, 105, 155, 0.10)",
    borderAccent: "#8CA6CF",
    success: "#6F894E",
    warning: "#836F4A",
    info: "#4D699B",
    error: "#C84053",
    // Surface overrides — Kanagawa Lotus palette
    background: "#F5F4EF",
    backgroundSecondary: "#FFFFFF",
    backgroundTertiary: "#ECEAE3",
    backgroundGhost: "rgba(245, 244, 239, 0.94)",
    backgroundHover: "#E8E6DE",
    backgroundSelected: "#DEDAD0",
    text: "#1A1A22",
    textSecondary: "#3D3B4F",
    textTertiary: "#716E61",
    textQuaternary: "#9E9B8E",
    textLight: "#C3BBAA",
    placeholder: "#9E9B8E",
    border: "#D8D5C8",
    borderHover: "#C4C0B2",
    borderLight: "#ECEAE3",
    messageBackground: "#FFFFFF",
    codeBackground: "#ECEAE3",
    shadowLight: "rgba(26, 26, 34, 0.05)",
    shadowMedium: "rgba(26, 26, 34, 0.09)",
    shadowHeavy: "rgba(26, 26, 34, 0.14)",
    textOnPrimary: "#FFFFFF"
  },
  dark: {
    // Kanagawa Wave — crystalBlue accent（#7E9CD8 是函数名颜色，最标志性的 Kanagawa 蓝）
    primary: "#7E9CD8",
    primaryLight: "#9DB4E8",
    primaryDark: "#6688BC",
    primaryGradient: "linear-gradient(135deg, #7E9CD8, #9DB4E8)",
    primaryGhost: "rgba(126, 156, 216, 0.10)",
    primaryHover: "rgba(126, 156, 216, 0.16)",
    borderAccent: "#2D4F67",
    success: "#98BB6C",
    // bamboo green
    warning: "#E6C384",
    // autumn gold
    info: "#7FB4CA",
    // waveBlue
    error: "#E82424",
    // Surface overrides — Kanagawa Wave palette
    background: "#1F1F28",
    // surumiBlack — 墨色
    backgroundSecondary: "#16161D",
    // deeper ink
    backgroundTertiary: "#2A2A37",
    // waveBlue-dark
    backgroundGhost: "rgba(22, 22, 29, 0.94)",
    backgroundHover: "#363646",
    backgroundSelected: "#54546D",
    text: "#DCD7BA",
    // fujiWhite — 宣纸暖白，365天的护眼体验
    textSecondary: "#C8C093",
    // oldWhite — 次级暖白
    textTertiary: "#938AA9",
    // springViolet2 — 注释紫，Kanagawa 气质核心
    textQuaternary: "#727169",
    // fujiGray
    textLight: "#54546D",
    placeholder: "#727169",
    border: "#2A2A37",
    borderHover: "#54546D",
    borderLight: "#1F1F28",
    messageBackground: "#16161D",
    codeBackground: "#0D0C0C",
    // 比背景更深的墨黑
    shadowLight: "rgba(13, 12, 12, 0.18)",
    shadowMedium: "rgba(13, 12, 12, 0.28)",
    shadowHeavy: "rgba(13, 12, 12, 0.38)",
    textHeading: "#DCD7BA",
    // fujiWhite — 暖色标题
    textOnPrimary: "#1F1F28"
  }
};
var rose = {
  light: {
    // Rosé Pine Dawn
    primary: "#D14D72",
    primaryLight: "#E87C9D",
    primaryDark: "#B03060",
    primaryGradient: "linear-gradient(135deg, #D14D72, #E87C9D)",
    primaryGhost: "rgba(209, 77, 114, 0.08)",
    primaryHover: "rgba(209, 77, 114, 0.10)",
    borderAccent: "#F2BFCC",
    success: "#56949F",
    warning: "#EA9D34",
    info: "#286983",
    error: "#B4637A",
    background: "#FAF4ED",
    backgroundSecondary: "#FFFAF3",
    backgroundTertiary: "#F2E9E1",
    backgroundGhost: "rgba(250, 244, 237, 0.94)",
    backgroundHover: "#EDE3DA",
    backgroundSelected: "#DFD3C7",
    text: "#575279",
    textSecondary: "#6E6A86",
    textTertiary: "#797593",
    textQuaternary: "#9893A5",
    textLight: "#CECACD",
    placeholder: "#9893A5",
    border: "#DFDAD9",
    borderHover: "#C5BFB3",
    borderLight: "#F2E9E1",
    messageBackground: "#FFFAF3",
    codeBackground: "#F2E9E1",
    shadowLight: "rgba(87, 82, 121, 0.05)",
    shadowMedium: "rgba(87, 82, 121, 0.09)",
    shadowHeavy: "rgba(87, 82, 121, 0.14)",
    textOnPrimary: "#FFFFFF"
  },
  dark: {
    // Rosé Pine main
    primary: "#EB6F92",
    primaryLight: "#F0A8BF",
    primaryDark: "#C4637A",
    primaryGradient: "linear-gradient(135deg, #EB6F92, #F0A8BF)",
    primaryGhost: "rgba(235, 111, 146, 0.10)",
    primaryHover: "rgba(235, 111, 146, 0.14)",
    borderAccent: "#6E3050",
    success: "#9CCFD8",
    warning: "#F6C177",
    info: "#C4A7E7",
    error: "#EB6F92",
    background: "#191724",
    backgroundSecondary: "#1F1D2E",
    backgroundTertiary: "#26233A",
    backgroundGhost: "rgba(25, 23, 36, 0.94)",
    backgroundHover: "#312E45",
    backgroundSelected: "#403D52",
    text: "#E0DEF4",
    textSecondary: "#C4C1D9",
    textTertiary: "#908CAA",
    textQuaternary: "#6E6A86",
    textLight: "#403D52",
    placeholder: "#6E6A86",
    border: "#26233A",
    borderHover: "#6E6A86",
    borderLight: "#1F1D2E",
    messageBackground: "#1F1D2E",
    codeBackground: "#12101E",
    shadowLight: "rgba(12, 10, 20, 0.20)",
    shadowMedium: "rgba(12, 10, 20, 0.30)",
    shadowHeavy: "rgba(12, 10, 20, 0.44)",
    textHeading: "#E0DEF4",
    textOnPrimary: "#191724"
  }
};
var mono = {
  meta: { radiusBoost: 0, motionEase: "cubic-bezier(0.4, 0, 0.2, 1)" },
  light: {
    // open-props: --orange-6 = #FF9500, --orange-3 = #FFD599, --orange-7 = #E68600
    primary: "#FF9500",
    primaryLight: "#FFD599",
    primaryDark: "#E68600",
    primaryGradient: "linear-gradient(135deg, #FF9500, #FFD599)",
    primaryGhost: "rgba(255,149,0,0.08)",
    primaryHover: "rgba(255,149,0,0.12)",
    borderAccent: "#FFBF66",
    success: "#16A34A",
    warning: "#D97706",
    info: "#2563EB",
    error: "#DC2626",
    // 采用 open-props 默认的冷系 slate-gray 调色（H=210, S=10%），完美消除泥土发灰感
    background: "#FCFCFD",
    // gray-0
    backgroundSecondary: "#F9FAFA",
    // gray-1
    backgroundTertiary: "#F1F2F4",
    // gray-2
    backgroundGhost: "rgba(252,252,253,0.94)",
    backgroundHover: "#EBEDEF",
    // gray-3
    backgroundSelected: "#C1C7CD",
    // gray-6
    backgroundElevated: "#FFFFFF",
    text: "#292E32",
    // gray-12
    textSecondary: "#57616B",
    // gray-10
    textTertiary: "#7B8793",
    // gray-8
    textQuaternary: "#9DA6AF",
    // gray-7
    textLight: "#C1C7CD",
    placeholder: "#9DA6AF",
    border: "#E6E8EA",
    // gray-4
    borderHover: "#C1C7CD",
    borderLight: "#F1F2F4",
    messageBackground: "#FFFFFF",
    codeBackground: "#F1F2F4",
    // 基于 slate-gray 调色 #292E32 (RGB 41, 46, 50) 的有机冷调阴影
    shadowLight: "rgba(41, 46, 50, 0.05)",
    shadowMedium: "rgba(41, 46, 50, 0.09)",
    shadowHeavy: "rgba(41, 46, 50, 0.15)",
    textHeading: "#292E32",
    textOnPrimary: "#FFFFFF"
  },
  // dim 是 mono 的"主"暗态：用 open-props 经典 slate-gray 暗色（gray-12..9）做画布，
  // 完美对应参考图中的深石墨色/冷灰色调，对比极强、层次细腻。
  dark: {
    // open-props: --orange-3 = #FFD599, --orange-4 = #FFBF66, --orange-5 = #FFAA33
    primary: "#FFBF66",
    primaryLight: "#FFD599",
    primaryDark: "#FFAA33",
    primaryGradient: "linear-gradient(135deg, #FFBF66, #FFAA33)",
    primaryGhost: "rgba(255,191,102,0.12)",
    primaryHover: "rgba(255,191,102,0.18)",
    borderAccent: "#FFAA33",
    success: "#4ADE80",
    warning: "#FCD34D",
    info: "#60A5FA",
    error: "#F87171",
    // open-props 冷系 slate-gray 暗色画布（H=210, S=10%）
    background: "#292E32",
    // gray-12
    backgroundSecondary: "#3E454C",
    // gray-11
    backgroundTertiary: "#57616B",
    // gray-10
    backgroundGhost: "rgba(41,46,50,0.94)",
    backgroundHover: "#4F5862",
    // ~gray-10.5
    backgroundSelected: "#6E7A87",
    // gray-9
    backgroundElevated: "#3E454C",
    text: "#EBEDEF",
    // gray-3
    textSecondary: "#DDE0E3",
    // gray-5
    textTertiary: "#C1C7CD",
    // gray-6
    textQuaternary: "#7B8793",
    // gray-8
    textLight: "#3E454C",
    placeholder: "#7B8793",
    // 边框必须比所在表面亮一档,否则夜间卡片/分割线全部融进背景
    border: "#4A525A",
    borderHover: "#6E7A87",
    borderLight: "#343A40",
    messageBackground: "#3E454C",
    codeBackground: "#1A1D20",
    // 略深于 canvas 的冷墨色
    // 基于深 slate-gray #0F1113 (RGB 15, 17, 19) 的有机阴影，在冷深色背景上极其细腻浮空
    shadowLight: "rgba(15, 17, 19, 0.28)",
    shadowMedium: "rgba(15, 17, 19, 0.45)",
    shadowHeavy: "rgba(15, 17, 19, 0.65)",
    textHeading: "#F1F2F4",
    // 近白标题;橙色 heading 在夜间大标题上过于突兀
    textOnPrimary: "#2E2E2E"
  }
};
var catppuccin = {
  // 保留 catppuccin 的柔和圆角 + 弹性缓动；色值换成 Ghostty "GitHub Light/Dark Default"
  // 官方 palette，获得通透高对比的观感。合成后名字/位次不变，DEFAULT_THEME_NAME 不动。
  // Reviewer 改进：dark textTertiary/quaternary 提亮达 WCAG AA；light warning 改琥珀色；
  // light backgroundElevated 拉开与画布的层级，大圆角浮层不再粘连。
  meta: { radiusBoost: 2, motionEase: "cubic-bezier(0.22, 1, 0.36, 1)" },
  light: {
    // Ghostty GitHub Light Default — 纯白 canvas + blue-500 accent
    primary: "#0969DA",
    primaryLight: "#218BFF",
    primaryDark: "#0550AE",
    primaryGradient: "linear-gradient(135deg, #0969DA, #218BFF)",
    primaryGhost: "rgba(9,105,218,0.08)",
    primaryHover: "rgba(9,105,218,0.10)",
    borderAccent: "#54AEFF",
    success: "#116329",
    warning: "#9A6700",
    info: "#0969DA",
    error: "#CF222E",
    background: "#FFFFFF",
    backgroundSecondary: "#F6F8FA",
    backgroundTertiary: "#E8ECF0",
    backgroundGhost: "rgba(255,255,255,0.94)",
    backgroundHover: "#E8ECF0",
    backgroundSelected: "#D0D7DE",
    backgroundElevated: "#F6F8FA",
    text: "#1F2328",
    textSecondary: "#57606A",
    textTertiary: "#6E7781",
    textQuaternary: "#8C959F",
    textLight: "#D0D7DE",
    placeholder: "#6E7781",
    border: "#D0D7DE",
    borderHover: "#B1BAC4",
    borderLight: "#D8DEE4",
    messageBackground: "#F6F8FA",
    codeBackground: "#F6F8FA",
    shadowLight: "rgba(0,0,0,0.04)",
    shadowMedium: "rgba(0,0,0,0.08)",
    shadowHeavy: "rgba(0,0,0,0.14)",
    textOnPrimary: "#FFFFFF"
  },
  dark: {
    // Catppuccin Mocha — 柔和夜间色调（告别高对比刺眼黑白，偏向 Ghostty Catppuccin Mocha）
    primary: "#89B4FA",
    primaryLight: "#B4BEFE",
    primaryDark: "#74C7EC",
    primaryGradient: "linear-gradient(135deg, #89B4FA, #B4BEFE)",
    primaryGhost: "rgba(137,180,250,0.12)",
    primaryHover: "rgba(137,180,250,0.16)",
    borderAccent: "#89B4FA",
    success: "#A6E3A1",
    warning: "#F9E2AF",
    info: "#89B4FA",
    error: "#F38BA8",
    background: "#1E1E2E",
    backgroundSecondary: "#181825",
    backgroundTertiary: "#313244",
    backgroundGhost: "rgba(30,30,46,0.94)",
    backgroundHover: "#313244",
    backgroundSelected: "#45475A",
    backgroundElevated: "#181825",
    text: "#CDD6F4",
    textSecondary: "#BAC2DE",
    textTertiary: "#A6ADC8",
    textQuaternary: "#6C7086",
    textLight: "#45475A",
    placeholder: "#6C7086",
    border: "#313244",
    borderHover: "#45475A",
    borderLight: "#181825",
    messageBackground: "#181825",
    codeBackground: "#11111B",
    shadowLight: "rgba(17,17,27,0.22)",
    shadowMedium: "rgba(17,17,27,0.36)",
    shadowHeavy: "rgba(17,17,27,0.52)",
    textHeading: "#CDD6F4",
    textOnPrimary: "#1E1E2E"
  }
};

// packages/app/theme/theme.config.ts
var SPACE = {
  0: "0",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  7: "28px",
  8: "32px",
  10: "40px",
  12: "48px",
  14: "56px",
  16: "64px",
  20: "80px",
  24: "96px"
};
var THEME_COLORS = {
  catppuccin,
  trail,
  wave,
  iris,
  rose,
  mono
};
var THEME_NAME_ALIASES = {
  // 原核心主题被精简
  ocean: "catppuccin",
  forest: "wave",
  neutral: "catppuccin",
  // 原向后兼容 alias
  blue: "catppuccin",
  purple: "iris",
  green: "wave",
  orange: "mono",
  yellow: "mono",
  graphite: "catppuccin",
  pink: "rose",
  red: "mono",
  mocha: "catppuccin"
};
var DEFAULT_THEME_NAME = "catppuccin";

// packages/app/theme/themeModeBootstrap.ts
var THEME_MODE_VALUES = ["system", "light", "dark"];
var THEME_DENSITY_VALUES = ["compact", "spacious"];
var SYSTEM_DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";
var createLiteralGuard = (values) => (value) => typeof value === "string" && values.includes(value);
var isThemeMode = (value) => createLiteralGuard(THEME_MODE_VALUES)(value);
var isThemeDensity = (value) => createLiteralGuard(THEME_DENSITY_VALUES)(value);
var normalizeThemeName = (value) => {
  if (typeof value !== "string") return void 0;
  const canonicalName = value in THEME_NAME_ALIASES ? THEME_NAME_ALIASES[value] : value;
  return canonicalName in THEME_COLORS ? canonicalName : void 0;
};
var resolveThemeModeIsDark = (themeMode, systemPrefersDark) => themeMode === "dark" ? true : themeMode === "light" ? false : systemPrefersDark;
function readStoredThemeMode(storage) {
  try {
    const value = storage?.getItem("nolo-theme-mode");
    return isThemeMode(value) ? value : "system";
  } catch {
    return "system";
  }
}
function readStoredThemeDensity(storage) {
  try {
    const value = storage?.getItem("nolo-density");
    return isThemeDensity(value) ? value : void 0;
  } catch {
    return void 0;
  }
}
function readStoredThemeName(storage) {
  try {
    const value = normalizeThemeName(storage?.getItem("nolo-theme-name"));
    if (!value) return void 0;
    const isExplicitSelection = storage?.getItem("nolo-theme-name-explicit") === "1";
    if (isExplicitSelection) return value;
    return value;
  } catch {
    return void 0;
  }
}
function readStoredFontPreset(storage) {
  try {
    return normalizeFontPreset(storage?.getItem(FONT_PRESET_STORAGE_KEY));
  } catch {
    return void 0;
  }
}
function resolveThemeModePreload({
  storage,
  systemPrefersDark
}) {
  const themeMode = readStoredThemeMode(storage);
  return {
    themeMode,
    isDark: resolveThemeModeIsDark(themeMode, systemPrefersDark)
  };
}

// packages/app/settings/settingTypes.ts
var SYSTEM_DEFAULT_AGENT_ID = "system-default";

// packages/app/settings/settingInitialState.ts
var _preloadedTheme = typeof window !== "undefined" ? resolveThemeModePreload({
  storage: typeof localStorage !== "undefined" ? localStorage : void 0,
  systemPrefersDark: typeof window.matchMedia === "function" ? window.matchMedia(SYSTEM_DARK_MEDIA_QUERY).matches : false
}) : { themeMode: "system", isDark: false };
var initialState = {
  isAutoSync: false,
  currentServer: isProduction ? SERVERS.MAIN : SERVERS.US,
  syncServers: Object.values(SERVERS),
  showThinking: true,
  preferredAnimationSet: 0,
  maxExecutionTime: 6e5,
  maxCost: 1,
  themeName: DEFAULT_THEME_NAME,
  themeMode: _preloadedTheme.themeMode,
  isDark: _preloadedTheme.isDark,
  sidebarWidth: 280,
  headerHeight: 56,
  density: "compact",
  fontPreset: DEFAULT_FONT_PRESET,
  editorDefaultMode: "markdown",
  editorLightCodeTheme: "default",
  editorDarkCodeTheme: "okaidia",
  editorWordCountEnabled: true,
  editorShortcuts: {
    heading: true,
    ulist: true,
    olist: true,
    quote: true,
    code: true,
    tasklist: true
  },
  editorFontSize: 14,
  editorAutoSave: true,
  editorAutoSaveInterval: 30,
  editorLineNumbers: false,
  editorWordWrap: true,
  editorSpellCheck: true,
  editorTabSize: 2,
  editorFontFamily: "SF Mono, Monaco, Cascadia Code, Roboto Mono, monospace",
  enableReadCurrentSpace: true,
  globalPrompt: "",
  userTonePreset: "",
  knowledgeCaptureLevel: DEFAULT_USER_PREFERENCE_PROFILE.knowledgeCaptureLevel,
  spaceContextLevel: DEFAULT_USER_PREFERENCE_PROFILE.spaceContextLevel,
  autoApproveSelfUpdateFields: [...DEFAULT_AUTO_APPROVED_SELF_UPDATE_FIELDS],
  aiRecentContentLimit: 50,
  defaultAgentId: SYSTEM_DEFAULT_AGENT_ID,
  quickChatAutoAgentId: "",
  ocrModel: "google_document_ocr",
  showScrollToTopButton: false,
  showScrollToBottomButton: false,
  createMenuOpenCount: 0,
  desktopChromeConnectorEnabled: false,
  developerModeEnabled: false,
  diagnosticModeEnabled: false,
  deleteShortcut: typeof window !== "undefined" && typeof window.navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(window.navigator.platform) ? "meta+backspace" : "ctrl+backspace",
  // 系统内置 Skill 默认全开；用户可在设置页单关。目前只有 web-search。
  systemBuiltinSkills: { ...DEFAULT_SYSTEM_AGENT_CAPABILITIES }
};
var DEFAULT_SYSTEM_BUILTIN_SKILLS = DEFAULT_SYSTEM_AGENT_CAPABILITIES;

// packages/core/recordOrEmpty.ts
function asRecordOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

// node_modules/ulid/dist/index.esm.js
function createError(message) {
  var err2 = new Error(message);
  err2.source = "ulid";
  return err2;
}
var ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
var ENCODING_LEN = ENCODING.length;
var TIME_MAX = Math.pow(2, 48) - 1;
var TIME_LEN = 10;
var RANDOM_LEN = 16;
function replaceCharAt(str, index, char) {
  if (index > str.length - 1) {
    return str;
  }
  return str.substr(0, index) + char + str.substr(index + 1);
}
function incrementBase32(str) {
  var done = void 0;
  var index = str.length;
  var char = void 0;
  var charIndex = void 0;
  var maxCharIndex = ENCODING_LEN - 1;
  while (!done && index-- >= 0) {
    char = str[index];
    charIndex = ENCODING.indexOf(char);
    if (charIndex === -1) {
      throw createError("incorrectly encoded string");
    }
    if (charIndex === maxCharIndex) {
      str = replaceCharAt(str, index, ENCODING[0]);
      continue;
    }
    done = replaceCharAt(str, index, ENCODING[charIndex + 1]);
  }
  if (typeof done === "string") {
    return done;
  }
  throw createError("cannot increment this string");
}
function randomChar(prng2) {
  var rand = Math.floor(prng2() * ENCODING_LEN);
  if (rand === ENCODING_LEN) {
    rand = ENCODING_LEN - 1;
  }
  return ENCODING.charAt(rand);
}
function encodeTime(now, len) {
  if (isNaN(now)) {
    throw new Error(now + " must be a number");
  }
  if (now > TIME_MAX) {
    throw createError("cannot encode time greater than " + TIME_MAX);
  }
  if (now < 0) {
    throw createError("time must be positive");
  }
  if (Number.isInteger(now) === false) {
    throw createError("time must be an integer");
  }
  var mod = void 0;
  var str = "";
  for (; len > 0; len--) {
    mod = now % ENCODING_LEN;
    str = ENCODING.charAt(mod) + str;
    now = (now - mod) / ENCODING_LEN;
  }
  return str;
}
function encodeRandom(len, prng2) {
  var str = "";
  for (; len > 0; len--) {
    str = randomChar(prng2) + str;
  }
  return str;
}
function detectPrng() {
  var allowInsecure = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : false;
  var root = arguments[1];
  if (!root) {
    root = typeof window !== "undefined" ? window : null;
  }
  var browserCrypto = root && (root.crypto || root.msCrypto);
  if (browserCrypto) {
    return function() {
      var buffer = new Uint8Array(1);
      browserCrypto.getRandomValues(buffer);
      return buffer[0] / 255;
    };
  } else {
    try {
      var nodeCrypto = require_crypto();
      return function() {
        return nodeCrypto.randomBytes(1).readUInt8() / 255;
      };
    } catch (e2) {
    }
  }
  if (allowInsecure) {
    try {
      console.error("secure crypto unusable, falling back to insecure Math.random()!");
    } catch (e2) {
    }
    return function() {
      return Math.random();
    };
  }
  throw createError("secure crypto unusable, insecure Math.random not allowed");
}
function factory(currPrng) {
  if (!currPrng) {
    currPrng = detectPrng();
  }
  return function ulid3(seedTime) {
    if (isNaN(seedTime)) {
      seedTime = Date.now();
    }
    return encodeTime(seedTime, TIME_LEN) + encodeRandom(RANDOM_LEN, currPrng);
  };
}
function monotonicFactory(currPrng) {
  if (!currPrng) {
    currPrng = detectPrng();
  }
  var lastTime = 0;
  var lastRandom = void 0;
  return function ulid3(seedTime) {
    if (isNaN(seedTime)) {
      seedTime = Date.now();
    }
    if (seedTime <= lastTime) {
      var incrementedRandom = lastRandom = incrementBase32(lastRandom);
      return encodeTime(lastTime, TIME_LEN) + incrementedRandom;
    }
    lastTime = seedTime;
    var newRandom = lastRandom = encodeRandom(RANDOM_LEN, currPrng);
    return encodeTime(seedTime, TIME_LEN) + newRandom;
  };
}
var ulid = factory();

// packages/database/utils/ulid.ts
var prng = () => Math.random();
var ulid2 = monotonicFactory(prng);

// node_modules/rambda/src/curry.js
function curry(fn, args = []) {
  return (..._args) => ((rest) => rest.length >= fn.length ? fn(...rest) : curry(fn, rest))([
    ...args,
    ..._args
  ]);
}

// packages/core/toTrimmedString.ts
function toTrimmedString(value) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

// packages/core/userId.ts
function normalizeUserId(value) {
  const text = asTrimmedString(value);
  return text.startsWith("user:") ? text.slice("user:".length) : text;
}

// packages/share/helpers.ts
var toSafeString = (value) => asTrimmedString(value);
var toNonEmptyString = (value) => {
  const text = toSafeString(value);
  return text || void 0;
};
var normalizeAuthorName = (value) => {
  const text = toSafeString(value);
  if (!text) return "";
  const lower = text.toLowerCase();
  if (lower === "unknown" || lower === "unknown user") return "";
  return text;
};
var toSafeAgentKey = (value) => {
  const text = toSafeString(value);
  return text && isAgentKey(text) ? text : "";
};
var toSafeTimestamp = (value) => {
  const fromNumber = asOptionalPositiveFiniteNumber(Number(value));
  if (fromNumber !== void 0) return fromNumber;
  if (typeof value !== "string") return 0;
  return asOptionalPositiveFiniteNumber(Date.parse(value)) ?? 0;
};
var SHARE_TIME_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});
var formatShareTime = (timestamp) => {
  if (!timestamp) return "\u65F6\u95F4\u672A\u77E5";
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) ? SHARE_TIME_FORMATTER.format(date) : "\u65F6\u95F4\u672A\u77E5";
};
var findAgentKeyInMessages = (messages) => {
  for (const raw of messages) {
    if (!raw || typeof raw !== "object") continue;
    const key = toSafeAgentKey(raw.cybotKey);
    if (key) return key;
  }
  return "";
};
var findAgentKeyInArray = (items) => {
  for (const raw of items) {
    const direct = toSafeAgentKey(raw);
    if (direct) return direct;
    if (!raw || typeof raw !== "object") continue;
    const item = raw;
    const key = toSafeAgentKey(item.dbKey) || toSafeAgentKey(item.id);
    if (key) return key;
  }
  return "";
};
var findAgentNameInMessages = (messages) => {
  for (const raw of messages) {
    if (!raw || typeof raw !== "object") continue;
    const msg = raw;
    const name = toSafeString(msg.agentName) || toSafeString(msg.cybotName) || toSafeString(msg.sourceAgentName);
    if (name) return name;
  }
  return "";
};
var findAgentNameInArray = (items) => {
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw;
    const name = toSafeString(item.name) || toSafeString(item.agentName) || toSafeString(item.cybotName) || toSafeString(item.sourceAgentName);
    if (name) return name;
  }
  return "";
};
var extractAgentInfo = (type, data) => {
  const meta = data.meta;
  const keyCandidates = [
    meta?.sourceAgentKey,
    meta?.agentKey,
    data.sourceAgentKey,
    data.agentKey,
    data.cybotKey,
    type === "cybot" ? data.dbKey ?? data.id : void 0
  ];
  let agentKey = "";
  for (const candidate of keyCandidates) {
    agentKey = toSafeAgentKey(candidate);
    if (agentKey) break;
  }
  if (!agentKey && Array.isArray(data.cybots)) {
    agentKey = findAgentKeyInArray(data.cybots);
  }
  if (!agentKey && Array.isArray(data.messages)) {
    agentKey = findAgentKeyInMessages(data.messages);
  }
  if (!agentKey && Array.isArray(data.history)) {
    agentKey = findAgentKeyInMessages(data.history);
  }
  const nameCandidates = [
    meta?.sourceAgentName,
    meta?.agentName,
    meta?.cybotName,
    data.sourceAgentName,
    data.agentName,
    data.cybotName,
    type === "cybot" ? data.name : void 0
  ];
  let agentName = "";
  for (const candidate of nameCandidates) {
    agentName = toSafeString(candidate);
    if (agentName) break;
  }
  if (!agentName && Array.isArray(data.cybots)) {
    agentName = findAgentNameInArray(data.cybots);
  }
  if (!agentName && Array.isArray(data.messages)) {
    agentName = findAgentNameInMessages(data.messages);
  }
  if (!agentName && Array.isArray(data.history)) {
    agentName = findAgentNameInMessages(data.history);
  }
  return {
    ...agentKey ? { sourceAgentKey: agentKey } : {},
    ...agentName ? { sourceAgentName: agentName } : {}
  };
};
var extractImageFromContent = (content) => {
  if (Array.isArray(content)) {
    const part = content.find(
      (p) => p?.type === "image_url" && typeof p?.image_url?.url === "string"
    );
    if (part?.image_url?.url) return part.image_url.url;
  }
  if (typeof content === "string") {
    const match2 = content.match(/!\[.*?\]\((.*?)\)/);
    if (match2?.[1]) return match2[1];
  }
  return void 0;
};
var extractCoverImage = (type, data) => {
  if (type === "image" /* IMAGE */) {
    return toNonEmptyString(data.url);
  }
  if (type === "app" /* APP */) {
    return toNonEmptyString(data.coverImage);
  }
  if (type !== "dialog" /* DIALOG */) return void 0;
  const messages = Array.isArray(data.messages) ? data.messages : Array.isArray(data.history) ? data.history : [];
  for (const msg of messages) {
    const fromContent = extractImageFromContent(msg.content);
    if (fromContent) return fromContent;
    const image = toNonEmptyString(msg.image);
    if (image) return image;
    if (Array.isArray(msg.images)) {
      const first = asNonEmptyStringArray(msg.images)[0];
      if (first) return first;
    }
  }
  return void 0;
};
var toPublicAgentKey = (value) => {
  const key = toSafeAgentKey(value);
  if (!key) return "";
  const parts = splitKey(key);
  if (parts.length < 3) return "";
  const [type, owner] = parts;
  const agentId = parts.slice(2).join("-");
  if (!agentId) return "";
  if (owner === "pub") return key;
  if (type === "agent" /* AGENT */) {
    return createAgentKey.public(agentId);
  }
  return "";
};
var resolveShareAuthorIdentity = (args) => {
  const authorName = toNonEmptyString(args.profile?.nickname) ?? toNonEmptyString(args.user?.name) ?? toNonEmptyString(args.user?.nickname) ?? toNonEmptyString(args.user?.username) ?? toNonEmptyString(args.fallbackName);
  const authorAvatar = toNonEmptyString(args.profile?.avatar) ?? toNonEmptyString(args.user?.avatar) ?? toNonEmptyString(args.fallbackAvatar);
  return {
    ...authorName ? { authorName } : {},
    ...authorAvatar ? { authorAvatar } : {}
  };
};
var SENSITIVE_FIELDS = ["apiKey", "secret", "password"];
var sanitizeShareData = (data) => {
  const snapshot = { ...data };
  for (const field of SENSITIVE_FIELDS) {
    delete snapshot[field];
  }
  return snapshot;
};

// packages/share/keys.ts
var SHARE_PREFIX = "share";
var SHARE_INDEX_PREFIX = "shareidx";
var TIMESTAMP_MAX = 9999999999999;
var normalizeToken = (value) => toTrimmedString(value);
var normalizeCreatedAt = (value) => {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, TIMESTAMP_MAX);
};
var toInvertedTimestamp = (value) => String(TIMESTAMP_MAX - normalizeCreatedAt(value)).padStart(13, "0");
var normalizeDimensionValue = (dim, raw) => dim === "creator" ? normalizeUserId(raw) : toSafeAgentKey(raw);
var createCommunityIndex = (dim, rawValue, createdAt, token) => {
  const value = normalizeDimensionValue(dim, rawValue);
  const normalizedToken = normalizeToken(token);
  if (!value || !normalizedToken) return "";
  return createKey(SHARE_INDEX_PREFIX, "community", dim, value, toInvertedTimestamp(createdAt), normalizedToken);
};
var createCommunityRange = (dim, rawValue) => {
  const value = normalizeDimensionValue(dim, rawValue);
  if (!value) return { start: "", end: "" };
  const start = createKey(SHARE_INDEX_PREFIX, "community", dim, value, "");
  return { start, end: start + "\uFFFF" };
};
var createCommunityAllIndex = (createdAt, token) => {
  const normalizedToken = normalizeToken(token);
  if (!normalizedToken) return "";
  return createKey(SHARE_INDEX_PREFIX, "community", "all", toInvertedTimestamp(createdAt), normalizedToken);
};
var createCommunityAllRange = () => {
  const start = createKey(SHARE_INDEX_PREFIX, "community", "all", "");
  return { start, end: start + "\uFFFF" };
};
var createOwnerIndex = (rawUserId, createdAt, token) => {
  const userId = normalizeUserId(rawUserId);
  const normalizedToken = normalizeToken(token);
  if (!userId || !normalizedToken) return "";
  return createKey(SHARE_INDEX_PREFIX, "owner", userId, toInvertedTimestamp(createdAt), normalizedToken);
};
var createOwnerRange = (rawUserId) => {
  const userId = normalizeUserId(rawUserId);
  if (!userId) return { start: "", end: "" };
  const start = createKey(SHARE_INDEX_PREFIX, "owner", userId, "");
  return { start, end: start + "\uFFFF" };
};
var findAgentKeyInArray2 = (arr) => {
  for (const item of arr) {
    const key = toSafeAgentKey(item);
    if (key) return key;
  }
  return "";
};
var findAgentKeyInMessages2 = (messages) => {
  for (const raw of messages) {
    if (!raw || typeof raw !== "object") continue;
    const key = toSafeAgentKey(raw.cybotKey);
    if (key) return key;
  }
  return "";
};
var resolveAgentKeyFromPayload = (data) => {
  if (!data || typeof data !== "object") return "";
  const meta = data?.meta;
  const payload = data?.data;
  const directCandidates = [
    meta?.sourceAgentKey,
    meta?.agentKey,
    data?.sourceAgentKey,
    data?.agentKey,
    data?.cybotKey,
    data?.type === "cybot" ? data?.dbKey ?? data?.id : ""
  ];
  for (const c2 of directCandidates) {
    const key = toSafeAgentKey(c2);
    if (key) return key;
  }
  if (payload && typeof payload === "object") {
    const payloadCandidates = [
      payload?.sourceAgentKey,
      payload?.agentKey,
      payload?.cybotKey,
      payload?.meta?.sourceAgentKey,
      payload?.meta?.agentKey,
      data?.type === "cybot" ? payload?.dbKey ?? payload?.id : ""
    ];
    for (const c2 of payloadCandidates) {
      const key = toSafeAgentKey(c2);
      if (key) return key;
    }
    if (Array.isArray(payload?.cybots)) {
      const key = findAgentKeyInArray2(payload.cybots);
      if (key) return key;
    }
    if (Array.isArray(payload?.messages)) {
      const key = findAgentKeyInMessages2(payload.messages);
      if (key) return key;
    }
    if (Array.isArray(payload?.history)) {
      const key = findAgentKeyInMessages2(payload.history);
      if (key) return key;
    }
  }
  return "";
};
var shareKey = {
  create: (token) => createKey(SHARE_PREFIX, token),
  range: () => {
    const start = createKey(SHARE_PREFIX, "");
    return { start, end: start + "\uFFFF" };
  },
  isShareKey: (key) => {
    const parts = splitKey(key);
    return parts.length >= 2 && parts[0] === SHARE_PREFIX;
  },
  tokenFromKey: (key) => {
    if (!shareKey.isShareKey(key)) return "";
    return key.slice(`${SHARE_PREFIX}-`.length).trim();
  },
  // Creator dimension
  communityCreatorIndex: (authorId, createdAt, token) => createCommunityIndex("creator", authorId, createdAt, token),
  communityCreatorRange: (authorId) => createCommunityRange("creator", authorId),
  // Agent dimension
  communityAgentIndex: (agentKey, createdAt, token) => createCommunityIndex("agent", agentKey, createdAt, token),
  communityAgentRange: (agentKey) => createCommunityRange("agent", agentKey),
  // Owner dimension (all shares, for "My Shares")
  ownerIndex: (userId, createdAt, token) => createOwnerIndex(userId, createdAt, token),
  ownerRange: (userId) => createOwnerRange(userId),
  // Global community feed (all community shares, time-ordered)
  communityAllIndex: (createdAt, token) => createCommunityAllIndex(createdAt, token),
  communityAllRange: () => createCommunityAllRange(),
  // From existing share data → index keys
  communityCreatorIndexFromShare: (dbKey, data) => {
    if (!shareKey.isShareKey(dbKey)) return "";
    if (data?.meta?.visibility !== "community") return "";
    const token = shareKey.tokenFromKey(dbKey);
    return shareKey.communityCreatorIndex(data?.meta?.authorId, data?.meta?.createdAt, token);
  },
  communityAgentIndexFromShare: (dbKey, data) => {
    if (!shareKey.isShareKey(dbKey)) return "";
    if (data?.meta?.visibility !== "community") return "";
    const token = shareKey.tokenFromKey(dbKey);
    const agentKey = resolveAgentKeyFromPayload(data);
    return shareKey.communityAgentIndex(agentKey, data?.meta?.createdAt, token);
  },
  ownerIndexFromShare: (dbKey, data) => {
    if (!shareKey.isShareKey(dbKey)) return "";
    const token = shareKey.tokenFromKey(dbKey);
    return shareKey.ownerIndex(data?.meta?.authorId, data?.meta?.createdAt, token);
  },
  communityAllIndexFromShare: (dbKey, data) => {
    if (!shareKey.isShareKey(dbKey)) return "";
    if (data?.meta?.visibility !== "community") return "";
    const token = shareKey.tokenFromKey(dbKey);
    return shareKey.communityAllIndex(data?.meta?.createdAt, token);
  },
  communityIndexKeysFromShare: (dbKey, data) => {
    const all = shareKey.communityAllIndexFromShare(dbKey, data);
    const creator = shareKey.communityCreatorIndexFromShare(dbKey, data);
    const agent = shareKey.communityAgentIndexFromShare(dbKey, data);
    return Array.from(new Set([all, creator, agent].filter(Boolean)));
  },
  allIndexKeysFromShare: (dbKey, data) => {
    const owner = shareKey.ownerIndexFromShare(dbKey, data);
    const community = shareKey.communityIndexKeysFromShare(dbKey, data);
    return Array.from(new Set([owner, ...community].filter(Boolean)));
  }
};

// packages/database/dialogKey.ts
var SEPARATOR = "-";
var createKey2 = (...parts) => parts.join(SEPARATOR);
var splitKey2 = (key) => key.split(SEPARATOR);
var isDialogKey = (key) => {
  const parts = splitKey2(key);
  return parts.length >= 3 && parts[0] === "dialog" /* DIALOG */;
};
var isDialogRecordKey = (key) => {
  if (typeof key !== "string" || !key.startsWith(`${"dialog" /* DIALOG */}-`)) return false;
  if (key.includes("-msg-")) return false;
  const parts = splitKey2(key);
  return parts.length >= 3 && parts[0] === "dialog" /* DIALOG */;
};
var createDialogKey = Object.assign(
  (userId) => createKey2("dialog" /* DIALOG */, userId, ulid2()),
  {
    single: (userId, dialogId) => createKey2("dialog" /* DIALOG */, userId, dialogId),
    rangeOfUser: (userId) => ({
      start: createKey2("dialog" /* DIALOG */, userId, ""),
      end: createKey2("dialog" /* DIALOG */, userId, "\uFFFF")
    })
  }
);
var dialogMessageKey = (dialogId, messageId) => createKey2("dialog" /* DIALOG */, dialogId, "msg", messageId);
var createDialogMessageKeyAndId = (dialogId, ulidFn = ulid2) => {
  const messageId = ulidFn();
  return { key: dialogMessageKey(dialogId, messageId), messageId };
};
var dialogMessageRange = (dialogId) => ({
  start: createKey2("dialog" /* DIALOG */, dialogId, "msg", ""),
  end: createKey2("dialog" /* DIALOG */, dialogId, "msg", "\uFFFF")
});

// packages/database/keys.ts
var SEPARATOR2 = "-";
var createKey = (...parts) => parts.join(SEPARATOR2);
var splitKey = (key) => key.split(SEPARATOR2);
var TYPE_STORAGE_PREFIXES = {
  ["app" /* APP */]: ["app"],
  ["page" /* DOC */]: ["page"],
  ["dialog" /* DIALOG */]: ["dialog"],
  ["image" /* IMAGE */]: ["image"],
  ["file" /* FILE */]: ["file"],
  ["table" /* TABLE */]: ["meta", "table"],
  ["agent" /* AGENT */]: ["agent"]
};
var _PREFIX_TO_TYPE = (() => {
  const map = /* @__PURE__ */ new Map();
  for (const [type, prefixes] of Object.entries(TYPE_STORAGE_PREFIXES)) {
    for (const prefix of prefixes) {
      if (!map.has(prefix)) map.set(prefix, type);
    }
  }
  return map;
})();
var isTableMetaKey = (key) => {
  const parts = splitKey(key);
  return parts.length >= 3 && parts[0] === "meta";
};
var isPageKey = (key) => {
  const parts = splitKey(key);
  return parts.length >= 3 && parts[0] === "page" /* DOC */;
};
var isTaskKey = (key) => {
  const parts = splitKey(key);
  return parts.length >= 3 && parts[0] === "task" /* TASK */;
};
var isFileKey = (key) => {
  const parts = splitKey(key);
  return parts.length >= 3 && (parts[0] === "file" /* FILE */ || parts[0] === "image" /* IMAGE */);
};
var isAgentKey = (key) => {
  const parts = splitKey(key);
  return parts.length >= 3 && parts[0] === "agent" /* AGENT */;
};
var isAppKey = (key) => {
  const parts = splitKey(key);
  return parts.length >= 2 && parts[0] === "app" /* APP */;
};
var rowKey = {
  /** 生成新行主键 + rowId */
  create: (tenantId, tableId) => {
    const rowId = ulid2();
    return { dbKey: createKey("row", tenantId, tableId, rowId), rowId };
  },
  /** 单行键 */
  single: (tenantId, tableId, rowId) => createKey("row", tenantId, tableId, rowId),
  /** 整张表的范围（gte / lte）—— 供批量操作使用 */
  range: (tenantId, tableId) => {
    const start = createKey("row", tenantId, tableId, "");
    return {
      gte: start,
      lte: start + "\uFFFF"
    };
  },
  /** 旧接口（start / end）—— 与早期代码兼容 */
  rangeOfTable: (tenantId, tableId) => {
    const start = createKey("row", tenantId, tableId, "");
    return {
      start,
      end: start + "\uFFFF"
    };
  },
  /** 某个租户的所有行范围 */
  rangeOfTenant: (tenantId) => {
    const start = createKey("row", tenantId, "");
    return {
      start,
      end: start + "\uFFFF"
    };
  }
};
var metaKey = Object.assign(
  (tenantId, tableId) => createKey("meta", tenantId, tableId),
  {
    /** 某个租户的所有表定义范围 */
    rangeOfTenant: (tenantId) => {
      const start = createKey("meta", tenantId, "");
      return {
        start,
        end: start + "\uFFFF"
      };
    }
  }
);
var DB_PREFIX = {
  USER: "user:"
};
var createUserKey = {
  settings: (userId) => createKey(userId, "settings"),
  profile: (userId) => createKey(userId, "profile")
};
var createUserPreferenceKey = {
  single: (userId, preferenceName) => createKey("user", "pref", userId, preferenceName),
  authorityHome: (userId) => createKey("user", "pref", userId, "authority_home"),
  defaultAgent: (userId) => createKey("user", "pref", userId, "agent_default"),
  rangeOfUser: (userId) => ({
    start: createKey("user", "pref", userId, ""),
    end: createKey("user", "pref", userId, "\uFFFF")
  })
};
var createMemoryKey = (ownerType, ownerId, memoryId) => createKey("mem", ownerType, ownerId, memoryId);
var memoryOwnerRange = (ownerType, ownerId) => ({
  start: createKey("memidx", "owner", ownerType, ownerId, ""),
  end: createKey("memidx", "owner", ownerType, ownerId, "\uFFFF")
});
var memorySubjectKindRange = (subjectType, subjectId, kind) => ({
  start: createKey("memidx", "subject", subjectType, subjectId, kind, ""),
  end: createKey("memidx", "subject", subjectType, subjectId, kind, "\uFFFF")
});
var createTransactionKey = {
  record: curry(
    (userId, txId) => createKey("tx", userId, txId)
  ),
  index: (txId) => createKey("tx", "index", txId),
  range: (userId) => ({
    start: createKey("tx", userId, ""),
    end: createKey("tx", userId, "\uFFFF")
  })
};
var createTokenKey = {
  record: curry(
    (userId, timestamp) => createKey("token", userId, timestamp.toString())
  ),
  range: (userId, timestamp) => ({
    start: createKey("token", userId, timestamp.toString()),
    end: createKey("token", userId, (timestamp + 864e5).toString())
  }),
  /** 某个用户的所有 Token 记录范围 */
  rangeOfUser: (userId) => ({
    start: createKey("token", userId, ""),
    end: createKey("token", userId, "\uFFFF")
  })
};
var createTokenStatsKey = Object.assign(
  (userId, dateKey) => createKey("token", "stats", "day", "user", userId, dateKey),
  {
    /** 某个用户的所有统计记录范围 */
    rangeOfUser: (userId) => ({
      start: createKey("token", "stats", "day", "user", userId, ""),
      end: createKey("token", "stats", "day", "user", userId, "\uFFFF")
    })
  }
);
var DIALOG_AGENT_LIST_INDEX_PREFIX = "dialogidx";
var DIALOG_LIST_TIMESTAMP_MAX = 9999999999999;
function parseDialogUpdatedAtMs(value) {
  const finite = asOptionalFiniteNumber(value);
  if (finite !== void 0) {
    return Math.max(0, Math.floor(finite));
  }
  if (typeof value === "string" && value) {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber) && /^\d+(\.\d+)?$/.test(value.trim())) {
      return Math.max(0, Math.floor(asNumber));
    }
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  }
  return 0;
}
function toDialogListInvertedTimestamp(updatedAt) {
  const ms = Math.min(
    DIALOG_LIST_TIMESTAMP_MAX,
    parseDialogUpdatedAtMs(updatedAt)
  );
  return String(DIALOG_LIST_TIMESTAMP_MAX - ms).padStart(13, "0");
}
function createDialogAgentListIndexKey(args) {
  const userId = args.userId.trim();
  const agentKey = args.agentKey.trim();
  const dialogId = args.dialogId.trim();
  if (!userId || !agentKey || !dialogId) return "";
  return createKey(
    DIALOG_AGENT_LIST_INDEX_PREFIX,
    "agent",
    userId,
    agentKey,
    toDialogListInvertedTimestamp(args.updatedAt),
    dialogId
  );
}
function expandDialogAgentListIndexAliases(agentKey) {
  const key = agentKey.trim();
  if (!key) return [];
  return [key];
}
function collectDialogAgentListIndexAgentKeys(record) {
  const keys = /* @__PURE__ */ new Set();
  const add2 = (raw) => {
    if (typeof raw !== "string") return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    for (const alias of expandDialogAgentListIndexAliases(trimmed)) {
      keys.add(alias);
    }
  };
  add2(record.primaryAgentKey);
  if (Array.isArray(record.cybots)) {
    for (const item of record.cybots) add2(item);
  }
  return Array.from(keys);
}
function isDialogAgentListIndexable(record) {
  if (!record || typeof record !== "object") return false;
  if (record.triggerType === "automation_run" || record.triggerType === "scheduled_run") {
    return false;
  }
  if (record.parentAutomationKey) return false;
  if (record.parentTaskKey) return false;
  return true;
}
function resolveDialogIdForIndex(dialogKey, dialogId, record) {
  const fromDialogId = asOptionalTrimmedString(dialogId);
  if (fromDialogId) return fromDialogId;
  const fromRecordId = asOptionalTrimmedString(record?.id);
  if (fromRecordId) return fromRecordId;
  const parts = splitKey(dialogKey);
  if (parts.length >= 3 && parts[0] === "dialog" /* DIALOG */ && !dialogKey.includes("-msg-")) {
    return parts[parts.length - 1] ?? "";
  }
  return "";
}
function buildDialogAgentListIndexKeySet(args) {
  const map = /* @__PURE__ */ new Map();
  if (!args.userId.trim() || !args.dialogKey.trim() || !args.dialogId.trim()) {
    return map;
  }
  if (!isDialogAgentListIndexable(args.record)) return map;
  const updatedAtMs = parseDialogUpdatedAtMs(args.record.updatedAt);
  const value = {
    dialogKey: args.dialogKey,
    dialogId: args.dialogId,
    updatedAtMs
  };
  for (const agentKey of collectDialogAgentListIndexAgentKeys(args.record)) {
    const key = createDialogAgentListIndexKey({
      userId: args.userId,
      agentKey,
      updatedAt: updatedAtMs,
      dialogId: args.dialogId
    });
    if (key) map.set(key, value);
  }
  return map;
}
function buildDialogAgentListIndexDeleteOps(args) {
  return buildDialogAgentListIndexOps({
    userId: args.userId,
    dialogKey: args.dialogKey,
    dialogId: args.dialogId,
    nextRecord: null,
    previousRecord: args.previousRecord
  }).filter((op) => op.type === "del");
}
function buildDialogAgentListIndexOps(args) {
  const userId = asTrimmedString(args.userId);
  const dialogKey = args.dialogKey.trim();
  if (!userId || !dialogKey) return [];
  const dialogId = resolveDialogIdForIndex(
    dialogKey,
    args.dialogId,
    args.nextRecord ?? args.previousRecord ?? null
  );
  if (!dialogId) return [];
  const previousMap = args.previousRecord && typeof args.previousRecord === "object" ? buildDialogAgentListIndexKeySet({
    userId,
    dialogKey,
    dialogId: resolveDialogIdForIndex(
      dialogKey,
      args.dialogId,
      args.previousRecord
    ) || dialogId,
    record: args.previousRecord
  }) : /* @__PURE__ */ new Map();
  const nextMap = args.nextRecord && typeof args.nextRecord === "object" ? buildDialogAgentListIndexKeySet({
    userId,
    dialogKey,
    dialogId,
    record: args.nextRecord
  }) : /* @__PURE__ */ new Map();
  const ops = [];
  for (const key of previousMap.keys()) {
    if (!nextMap.has(key)) {
      ops.push({ type: "del", key });
    }
  }
  for (const [key, value] of nextMap) {
    ops.push({ type: "put", key, value });
  }
  return ops;
}
var createTaskKey = Object.assign(
  (userId) => createKey("task" /* TASK */, userId, ulid2()),
  {
    rangeOfUser: (userId) => ({
      start: createKey("task" /* TASK */, userId, ""),
      end: createKey("task" /* TASK */, userId, "\uFFFF")
    })
  }
);
var createAgentAutomationKey = Object.assign(
  (userId) => createKey("agent-automation" /* AGENT_AUTOMATION */, userId, ulid2()),
  {
    rangeOfUser: (userId) => ({
      start: createKey("agent-automation" /* AGENT_AUTOMATION */, userId, ""),
      end: createKey("agent-automation" /* AGENT_AUTOMATION */, userId, "\uFFFF")
    })
  }
);
var AGENT_AUTOMATION_OWNER_INDEX_PREFIX = "agent-automation-owner-idx";
var createAgentAutomationOwnerIndexKey = Object.assign(
  (userId, ownerAgentKey, automationId) => createKey(
    AGENT_AUTOMATION_OWNER_INDEX_PREFIX,
    userId,
    ownerAgentKey,
    automationId
  ),
  {
    rangeOfAgent: (userId, ownerAgentKey) => {
      const start = createKey(
        AGENT_AUTOMATION_OWNER_INDEX_PREFIX,
        userId,
        ownerAgentKey,
        ""
      );
      return { start, end: `${start}\uFFFF` };
    }
  }
);
function buildAgentAutomationOwnerIndexValue(args) {
  return {
    automationKey: args.automationKey,
    automationId: args.automationId,
    userId: args.userId,
    ownerAgentKey: args.ownerAgentKey
  };
}
var createNotificationKey = {
  single: (userId, notificationId) => createKey("notification" /* NOTIFICATION */, userId, notificationId),
  rangeOfUser: (userId) => ({
    start: createKey("notification" /* NOTIFICATION */, userId, ""),
    end: createKey("notification" /* NOTIFICATION */, userId, "\uFFFF")
  })
};
var createPageKey = {
  create: (userId) => {
    const id = ulid2();
    return { dbKey: createKey("page" /* DOC */, userId, id), id };
  },
  rangeOfUser: (userId) => ({
    start: createKey("page" /* DOC */, userId, ""),
    end: createKey("page" /* DOC */, userId, "\uFFFF")
  })
};
var createAgentKey = {
  private: curry(
    (userId, agentId) => createKey("agent" /* AGENT */, userId, agentId)
  ),
  public: (agentId) => createKey("agent" /* AGENT */, "pub", agentId),
  rangeOfUser: (userId) => ({
    start: createKey("agent" /* AGENT */, userId, ""),
    end: createKey("agent" /* AGENT */, userId, "\uFFFF")
  })
};
var pubAgentKeys = {
  single: (agentId) => createAgentKey.public(agentId),
  list: () => ({
    start: createKey("agent" /* AGENT */, "pub", ""),
    end: createKey("agent" /* AGENT */, "pub", "\uFFFF")
  }),
  allPublicRanges: () => [
    {
      start: createKey("agent" /* AGENT */, "pub", ""),
      end: createKey("agent" /* AGENT */, "pub", "\uFFFF")
    }
  ]
};
var fileKey = {
  single: (tenantId, fileId) => createKey("file", tenantId, fileId),
  rangeOfTenant: (tenantId) => {
    const start = createKey("file", tenantId, "");
    return {
      start,
      end: start + "\uFFFF"
    };
  }
};
var getFileIdFromKey = (key) => {
  const parts = key.split(SEPARATOR2);
  return parts[2];
};

// packages/core/timestamp.ts
function toTimestampMs(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

// packages/database/userPreferenceRegister.ts
var USER_PREFERENCE_NAMES = {
  AUTHORITY_HOME: "authority_home",
  DEFAULT_AGENT: "agent_default"
};
var nextRegisterUpdatedAt = (previousRecord) => {
  const previousTimestamp = Math.max(
    toTimestampMs(previousRecord?.updatedAt),
    toTimestampMs(previousRecord?.createdAt)
  );
  return Math.max(Date.now(), previousTimestamp + 1);
};
var buildUserPreferenceRegisterRecord = ({
  userId,
  preferenceName,
  value,
  previousRecord
}) => {
  const updatedAt = nextRegisterUpdatedAt(previousRecord ?? void 0);
  return {
    type: "setting" /* SETTING */,
    registerType: "user_preference",
    preferenceName,
    schemaVersion: 1,
    userId,
    value,
    opId: ulid2(),
    createdAt: toTimestampMs(previousRecord?.createdAt) || updatedAt,
    updatedAt
  };
};
var readUserPreferenceRegisterValue = (record, preferenceName) => {
  if (!record || typeof record !== "object") return void 0;
  if (record.registerType !== "user_preference") return void 0;
  if (record.preferenceName !== preferenceName) return void 0;
  if (!("value" in record)) return void 0;
  return record.value;
};
var buildDefaultAgentPreferenceRegisterRecord = ({
  userId,
  defaultAgentId,
  previousRecord
}) => buildUserPreferenceRegisterRecord({
  userId,
  preferenceName: USER_PREFERENCE_NAMES.DEFAULT_AGENT,
  value: defaultAgentId,
  previousRecord
});

// packages/core/clientLogger.ts
var LOG_LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};
var serializeValue = (value, seen = /* @__PURE__ */ new WeakSet()) => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      ...value.stack ? { stack: value.stack } : {}
    };
  }
  if (typeof value !== "object" || value === null) {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  }
  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item, seen));
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, serializeValue(item, seen)])
  );
};
var getLogLevel = () => {
  const configured = typeof process !== "undefined" && typeof process.env?.NOLO_LOG_LEVEL === "string" ? process.env.NOLO_LOG_LEVEL : "info";
  return LOG_LEVELS[configured] ?? LOG_LEVELS.info;
};
var writeLog = (level, name, fields, message) => {
  if (LOG_LEVELS[level] < getLogLevel()) {
    return;
  }
  const serializedFields = serializeValue(fields);
  const payload = {
    level,
    ...name ? { name } : {},
    ...serializedFields,
    ...message ? { msg: message } : {}
  };
  const output = JSON.stringify(payload);
  const isNodeRuntime = typeof process !== "undefined" && typeof process.stderr?.write === "function";
  if (isNodeRuntime) {
    process.stderr.write(`${output}
`);
    return;
  }
  const consoleMethod = console[level] ?? console.log;
  if (Object.keys(fields).length === 0 && message) {
    consoleMethod(`[${name}] ${message}`);
  } else {
    consoleMethod(output);
  }
};
var parseArgs = (first, second) => {
  if (typeof first === "string") {
    return { fields: {}, message: first };
  }
  return { fields: first ?? {}, message: second };
};
var createClientLogger = (name, parentFields = {}) => {
  const log = (level, first, second) => {
    const { fields, message } = parseArgs(first, second);
    writeLog(level, name, { ...parentFields, ...fields }, message);
  };
  return {
    debug: (first, second) => log("debug", first, second),
    info: (first, second) => log("info", first, second),
    warn: (first, second) => log("warn", first, second),
    error: (first, second) => log("error", first, second),
    child: (fields) => createClientLogger(name, { ...parentFields, ...fields })
  };
};

// packages/core/abortError.ts
function isAbortError(error) {
  if (!error || typeof error !== "object") return false;
  return error.name === "AbortError";
}

// packages/app/utils/retryFetch.ts
var TRANSIENT_READ_RETRY_STATUSES = /* @__PURE__ */ new Set([502, 503, 504]);
var DEFAULT_RETRY_DELAYS_MS = [300, 1e3];
var sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});
var getRequestMethod = (input, init) => {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.method.toUpperCase();
  }
  return "GET";
};
var isRetryableReadMethod = (method) => method === "GET" || method === "HEAD";
var fetchWithTransientReadRetry = async (input, init, options = {}) => {
  const method = getRequestMethod(input, init);
  const canRetry = isRetryableReadMethod(method);
  const delaysMs = options.delaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  const retryStatuses = options.retryStatuses ?? TRANSIENT_READ_RETRY_STATUSES;
  const fetchImpl = options.fetchImpl ?? fetch;
  const wait = options.sleep ?? sleep;
  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetchImpl(input, init);
      const shouldRetry = canRetry && retryStatuses.has(response.status) && attempt < delaysMs.length;
      if (!shouldRetry) return response;
    } catch (error) {
      const shouldRetry = canRetry && !isAbortError(error) && attempt < delaysMs.length;
      if (!shouldRetry) throw error;
    }
    await wait(delaysMs[attempt]);
  }
};

// packages/database/actions/common.ts
var logger = createClientLogger("database");
var normalizeServer = (server) => normalizeKnownServerOrigin(server) ?? normalizeServerOrigin(server);
var mergeConfiguredServers = (currentServer, syncServers) => {
  const runtimeOrigin = !getIsDesktopApp() && typeof window !== "undefined" && typeof window.location?.origin === "string" && /^https?:\/\//.test(window.location.origin) ? window.location.origin : void 0;
  const raw = [
    currentServer,
    ...Array.isArray(syncServers) ? syncServers : [],
    runtimeOrigin
  ].filter(
    (s3) => typeof s3 === "string" && s3.trim().length > 0
  );
  const normalized = raw.map(normalizeServer);
  const shouldIncludeClusterPeers = normalized.some(isNoloClusterServerOrigin) || typeof currentServer === "string" && isLocalDevServerOrigin(currentServer);
  if (shouldIncludeClusterPeers) {
    normalized.push(...NOLO_CLUSTER_SERVERS);
  }
  return Array.from(new Set(normalized));
};
var getAllServers = (currentServer, syncServers, preferredServer) => {
  const preferredNormalized = typeof preferredServer === "string" && preferredServer.trim().length > 0 ? normalizeServer(preferredServer) : null;
  const servers = mergeConfiguredServers(
    currentServer,
    preferredNormalized && isNoloClusterServerOrigin(preferredNormalized) ? [...Array.isArray(syncServers) ? syncServers : [], preferredNormalized] : syncServers
  );
  if (!preferredServer || typeof preferredServer !== "string") {
    return servers;
  }
  const remaining = servers.filter(
    (server) => normalizeServer(server) !== preferredNormalized
  );
  return preferredNormalized ? [preferredNormalized, ...remaining] : remaining;
};
var fetchFromClientDb = async (clientDb, dbKey) => {
  if (!clientDb) {
    logger.error(
      { dbKey },
      "Client database is undefined in fetchFromClientDb"
    );
    return null;
  }
  try {
    return await clientDb.get(dbKey);
  } catch (err2) {
    if (isLevelNotFoundError(err2)) {
      return null;
    }
    logger.error({ err: err2, dbKey }, "Failed to get local data");
    return null;
  }
};
var SERVER_TIMEOUT = 5e3;
var READ_TIMEOUT_ERROR_NAME = "ReadTimeoutError";
var isPublicFileDbKey = (dbKey) => dbKey.startsWith("file-");
var buildReadUrl = (dbKey) => isPublicFileDbKey(dbKey) ? `${API_ENDPOINTS.DATABASE}/file/metadata/${encodeURIComponent(dbKey)}` : `${API_ENDPOINTS.DATABASE}/read/${encodeURIComponent(dbKey)}`;
var createReadTimeoutError = (server, dbKey) => {
  const error = new Error(
    `Timed out reading key "${dbKey}" from ${normalizeServer(server)}.`
  );
  error.name = READ_TIMEOUT_ERROR_NAME;
  return error;
};
var isReadTimeoutError = (error) => error instanceof Error && error.name === READ_TIMEOUT_ERROR_NAME;
var fetchFromServer = async (server, dbKey, token, signal) => {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  const controller = new AbortController();
  let didTimeout = false;
  const timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, SERVER_TIMEOUT);
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener("abort", onExternalAbort);
  try {
    const res = await fetchWithTransientReadRetry(
      `${server}${buildReadUrl(dbKey)}`,
      {
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...token && { Authorization: `Bearer ${token}` }
        }
      }
    );
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onExternalAbort);
    if (res.status === 200) {
      return await res.json();
    }
    return null;
  } catch (err2) {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onExternalAbort);
    if (didTimeout) {
      throw createReadTimeoutError(server, dbKey);
    }
    if (signal?.aborted || isAbortError(err2)) {
      throw err2;
    }
    return null;
  }
};
var normalizeTimeFields = (data) => ({
  ...data,
  createdAt: data.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
  updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
  updated_at: void 0,
  created_at: void 0
});

// packages/database/fileStorage.ts
var DB_NAME = "nolo-file-storage";
var STORE_NAME = "files";
var DB_VERSION = 1;
var dbPromise = null;
var openFileDb = () => {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === "undefined") {
    console.warn(
      "[fileStorage] indexedDB is not available in this environment. File caching is disabled."
    );
    dbPromise = Promise.reject(
      new Error("indexedDB is not available in this environment")
    );
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => {
      console.error("[fileStorage] Failed to open IndexedDB:", request.error);
      reject(request.error);
    };
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id"
        });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        console.warn(
          "[fileStorage] IndexedDB version change detected, closing old connection."
        );
      };
      resolve(db);
    };
  });
  return dbPromise;
};
var saveFileToIndexedDb = async (fileId, file) => {
  try {
    const db = await openFileDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const blob = file instanceof Blob ? file : new Blob([file]);
    const record = {
      id: fileId,
      blob,
      size: blob.size,
      type: blob.type || "application/octet-stream",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const request = store.put(record);
    await new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.debug(
          "[fileStorage] Saved file to IndexedDB:",
          fileId,
          "size=",
          record.size,
          "type=",
          record.type
        );
        resolve();
      };
      request.onerror = () => {
        console.error(
          "[fileStorage] Failed to save file to IndexedDB:",
          fileId,
          request.error
        );
        reject(request.error);
      };
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err2) {
    console.warn(
      "[fileStorage] saveFileToIndexedDb error (non-fatal, caching disabled for this file):",
      err2
    );
  }
};
var loadFileFromIndexedDb = async (fileId) => {
  try {
    const db = await openFileDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(fileId);
    const record = await new Promise(
      (resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            console.debug(
              "[fileStorage] Loaded file from IndexedDB:",
              fileId,
              "size=",
              result.size,
              "type=",
              result.type
            );
          } else {
            console.debug(
              "[fileStorage] No local file found in IndexedDB for id:",
              fileId
            );
          }
          resolve(result ?? null);
        };
        request.onerror = () => {
          console.error(
            "[fileStorage] Failed to load file from IndexedDB:",
            fileId,
            request.error
          );
          reject(request.error);
        };
      }
    );
    return record ?? null;
  } catch (err2) {
    console.warn(
      "[fileStorage] loadFileFromIndexedDb error, treat as cache miss:",
      err2
    );
    return null;
  }
};
var deleteFileFromIndexedDb = async (fileId) => {
  try {
    const db = await openFileDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(fileId);
    await new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.debug("[fileStorage] Deleted file from IndexedDB:", fileId);
        resolve();
      };
      request.onerror = () => {
        console.error(
          "[fileStorage] Failed to delete file from IndexedDB:",
          fileId,
          request.error
        );
        reject(request.error);
      };
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err2) {
    console.warn("[fileStorage] deleteFileFromIndexedDb error:", err2);
  }
};

// packages/database/requests.ts
var TIMEOUT = 5e3;
var logRequestFailure = (level, message) => {
  if (level === "silent") return;
  if (level === "warn") {
    console.warn(message);
    return;
  }
  if (level === "info") {
    console.info(message);
    return;
  }
  console.error(message);
};
var noloRequest = async (server, config, state3, signal) => {
  const headers = config.headers || {
    "Content-Type": "application/json"
  };
  const token = state3?.auth?.currentToken;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(server + config.url, {
    method: config.method || "GET",
    headers,
    body: config.body,
    signal,
    // 传递 AbortSignal
    ...config.keepalive ? { keepalive: true } : {}
  });
};
var noloPatchRequest = async (server, dbKey, updates, state3, signal, options) => {
  const failureLogLevel = options?.failureLogLevel ?? "error";
  try {
    const response = await noloRequest(
      server,
      {
        url: `${API_ENDPOINTS.DATABASE}/patch/${dbKey}`,
        method: "PATCH",
        body: JSON.stringify(updates)
      },
      state3,
      signal
    );
    if (!response.ok) {
      logRequestFailure(
        failureLogLevel,
        `PATCH request failed for ${dbKey} on ${server}: HTTP ${response.status}`
      );
    }
    return response.ok;
  } catch (error) {
    if (!isAbortError(error)) {
      logRequestFailure(
        failureLogLevel,
        `PATCH request failed for ${dbKey} on ${server}: ${error.message || "Unknown error"}`
      );
    }
    return false;
  }
};
var noloWriteRequest = async (server, writeConfig, state3, signal, options) => {
  const { data, customKey, userId, indexKeys } = writeConfig;
  const failureLogLevel = options?.failureLogLevel ?? "error";
  try {
    const response = await noloRequest(
      server,
      {
        url: `${API_ENDPOINTS.DATABASE}/write/`,
        method: "POST",
        body: JSON.stringify({ data, customKey, userId, indexKeys })
      },
      state3,
      signal
    );
    if (!response.ok) {
      logRequestFailure(
        failureLogLevel,
        `Write request failed for ${customKey} on ${server}: HTTP ${response.status}`
      );
    }
    return response.ok;
  } catch (error) {
    if (!isAbortError(error)) {
      logRequestFailure(
        failureLogLevel,
        `Write request failed for ${customKey} on ${server}: ${error.message || "Unknown error"}`
      );
    }
    return false;
  }
};
var rnUploadAdapter = null;
var noloUploadRequest = async (server, uploadConfig, state3, signal) => {
  const { file, metadata, customKey, userId } = uploadConfig;
  try {
    const isReactNative = typeof navigator !== "undefined" && navigator.product === "ReactNative";
    const isRNFile = (f) => f && typeof f.uri === "string" && typeof f.name === "string" && typeof f.type === "string";
    if (isReactNative && isRNFile(file)) {
      if (!rnUploadAdapter) {
        throw new Error(
          "React Native upload adapter is not registered. Call initRNUploadAdapter() in the RN app entry before uploading files."
        );
      }
      return await rnUploadAdapter(server, uploadConfig, state3, signal);
    }
    const formData = new FormData();
    if (isRNFile(file)) {
      formData.append("file", {
        uri: file.uri,
        type: file.type,
        name: file.name
      });
    } else {
      formData.append("file", file);
    }
    formData.append("metadata", JSON.stringify(metadata));
    formData.append("customKey", customKey);
    if (userId) {
      formData.append("userId", userId);
    }
    const response = await noloRequest(
      server,
      {
        url: `${API_ENDPOINTS.DATABASE}/upload`,
        method: "POST",
        body: formData,
        // Cast to any to avoid TS mismatch with Bun/DOM FormData
        headers: {}
        // 不设置 Content-Type，让浏览器自动处理 multipart/form-data
      },
      state3,
      signal
    );
    if (!response.ok) {
      console.error(
        `Upload request failed for ${customKey} on ${server}: HTTP ${response.status}`
      );
    }
    return response.ok;
  } catch (error) {
    if (!isAbortError(error)) {
      console.error(
        `Upload request failed for ${customKey} on ${server}: ${error.message || "Unknown error"}`
      );
    }
    return false;
  }
};
var syncWithServers = (servers, requestFn, errorMessage, ...requestArgs) => {
  servers.forEach((server) => {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, TIMEOUT);
    requestFn(server, ...requestArgs, abortController.signal).then((success) => {
      clearTimeout(timeoutId);
      if (!success) {
        console.warn(`${errorMessage} ${server}`);
      }
    }).catch((error) => {
      clearTimeout(timeoutId);
      if (!isAbortError(error)) {
        console.error(
          `Unexpected error during sync with ${server}: ${error.message || "Unknown error"}`
        );
      }
    });
  });
};
var noloDeleteRequest = async (server, dbKey, options, state3, signal) => {
  const { type = "single", force = false } = options;
  try {
    const queryParts = [];
    if (type === "messages") queryParts.push("type=messages");
    else if (type === "table") queryParts.push("type=table");
    if (force) queryParts.push("force=true");
    const query = queryParts.length ? `?${queryParts.join("&")}` : "";
    const url = `${API_ENDPOINTS.DATABASE}/delete/${dbKey}${query}`;
    const response = await noloRequest(
      server,
      {
        url,
        method: "DELETE",
        keepalive: true
      },
      state3,
      signal
    );
    if (!response.ok) {
      console.error(
        `DELETE request failed for ${dbKey} on ${server}: HTTP ${response.status}`
      );
      return false;
    }
    return true;
  } catch (error) {
    if (!isAbortError(error)) {
      console.error(
        `DELETE request failed for ${dbKey} on ${server}: ${error.message || "Unknown error"}`
      );
    }
    return false;
  }
};

// packages/database/fileRing.ts
var fnv1a32 = (str) => {
  let hash = 2166136261;
  for (let i2 = 0; i2 < str.length; i2++) {
    hash ^= str.charCodeAt(i2);
    hash = hash * 16777619 >>> 0;
  }
  return hash >>> 0;
};
var chooseServersByKey = (allServers, key, replicaCount) => {
  if (!allServers.length || replicaCount <= 0) return [];
  const uniqueServers = Array.from(new Set(allServers)).filter((s3) => !!s3);
  if (uniqueServers.length === 0) return [];
  const scored = uniqueServers.map((server) => ({
    server,
    score: fnv1a32(`${server}::${key}`)
  }));
  scored.sort((a3, b2) => a3.score - b2.score);
  const limit = Math.min(replicaCount, scored.length);
  return scored.slice(0, limit).map((item) => item.server);
};

// packages/database/tenantPlacement.ts
var TENANT_REPLICA_COUNT = 2;
var planServersForTenant = (allServers, currentServer, tenantId) => {
  const uniqueServers = Array.from(new Set(allServers)).filter(Boolean);
  if (!uniqueServers.length) return [];
  const key = asOptionalTrimmedString(tenantId) ?? "default-tenant";
  const fromRing = chooseServersByKey(
    uniqueServers,
    key,
    TENANT_REPLICA_COUNT
  );
  const set = new Set(fromRing);
  if (currentServer && uniqueServers.includes(currentServer)) {
    set.add(currentServer);
  }
  return Array.from(set);
};

// packages/database/authority/ownerKey.ts
var USER_OWNED_SECOND_SEGMENT_PREFIXES = /* @__PURE__ */ new Set([
  "agent",
  "dialog",
  "page",
  "doc",
  "notification",
  "email",
  "meta",
  "row",
  "view",
  "file",
  "job"
]);
var PUBLIC_OWNER_SENTINELS = /* @__PURE__ */ new Set(["pub", "id", "stats", "index"]);
var cleanSegment = (value) => {
  const trimmed = asTrimmedString(value);
  return trimmed.length > 0 ? trimmed : null;
};
var normalizeCandidateOwners = (candidateOwnerUserIds) => {
  const out = [];
  for (const candidate of candidateOwnerUserIds ?? []) {
    const normalized = cleanSegment(candidate ?? void 0);
    if (!normalized || PUBLIC_OWNER_SENTINELS.has(normalized)) continue;
    if (!out.includes(normalized)) out.push(normalized);
  }
  return out.sort((left, right) => right.length - left.length);
};
var resolveCandidateOwnerFromKeyRemainder = (remainder, candidateOwnerUserIds) => {
  const normalizedRemainder = cleanSegment(remainder);
  if (!normalizedRemainder) return null;
  for (const candidate of normalizeCandidateOwners(candidateOwnerUserIds)) {
    if (normalizedRemainder === candidate || normalizedRemainder.startsWith(`${candidate}-`)) {
      return candidate;
    }
  }
  return null;
};
var parseOwnerUserIdFromDbKey = (dbKey, options = {}) => {
  const normalized = cleanSegment(dbKey);
  if (!normalized) return null;
  const parts = normalized.split("-");
  const [prefix] = parts;
  if (!prefix) return null;
  if (!USER_OWNED_SECOND_SEGMENT_PREFIXES.has(prefix)) {
    if (prefix === "grant" && parts[1] === "agent" && parts.length >= 5) {
      const ownerAndRest2 = normalized.slice(prefix.length + 1 + parts[1].length + 1);
      const [owner2] = ownerAndRest2.split("-");
      return cleanSegment(owner2);
    }
    return null;
  }
  if (parts[0] === "dialog" && parts[2] === "msg") {
    return null;
  }
  const ownerAndRest = normalized.slice(prefix.length + 1);
  const candidateOwner = resolveCandidateOwnerFromKeyRemainder(
    ownerAndRest,
    options.candidateOwnerUserIds
  );
  if (candidateOwner) return candidateOwner;
  const [owner] = ownerAndRest.split("-");
  const ownerUserId = cleanSegment(owner);
  if (!ownerUserId) return null;
  if (PUBLIC_OWNER_SENTINELS.has(ownerUserId)) return null;
  return ownerUserId;
};

// packages/database/authority/deviceLocal.ts
var DEVICE_LOCAL_OWNER_ID = "local";
var DEVICE_LOCAL_DB_KEY_PREFIXES = [
  "dialog-local-",
  "agent-local-"
];
var clean = (value) => asOptionalTrimmedString(value) ?? null;
var isDeviceLocalOwnerId = (userId) => clean(userId) === DEVICE_LOCAL_OWNER_ID;
var resolveEffectiveSpaceActorId = (accountUserId) => {
  const cleaned = clean(accountUserId);
  if (!cleaned || isDeviceLocalOwnerId(cleaned)) {
    return DEVICE_LOCAL_OWNER_ID;
  }
  return cleaned;
};
var isDeviceLocalSpaceMembership = (membership) => isDeviceLocalOwnerId(membership?.userId);
var isDeviceLocalSpaceBody = (space) => isDeviceLocalOwnerId(space?.userId) || isDeviceLocalOwnerId(space?.ownerId);
var isDeviceLocalDbKey = (dbKey) => {
  const key = clean(dbKey);
  if (!key) return false;
  for (const prefix of DEVICE_LOCAL_DB_KEY_PREFIXES) {
    if (key.startsWith(prefix)) return true;
  }
  return parseOwnerUserIdFromDbKey(key, {
    candidateOwnerUserIds: [DEVICE_LOCAL_OWNER_ID]
  }) === DEVICE_LOCAL_OWNER_ID;
};
var resolveRecordOwnerUserId = (record) => {
  if (!record) return null;
  const explicit = clean(record.userId);
  if (explicit) return explicit;
  if (isDeviceLocalDbKey(record.dbKey) || isDeviceLocalDbKey(record.id)) {
    return DEVICE_LOCAL_OWNER_ID;
  }
  const fromKey = parseOwnerUserIdFromDbKey(clean(record.dbKey) ?? "", {
    candidateOwnerUserIds: [DEVICE_LOCAL_OWNER_ID]
  }) ?? parseOwnerUserIdFromDbKey(clean(record.id) ?? "", {
    candidateOwnerUserIds: [DEVICE_LOCAL_OWNER_ID]
  });
  return fromKey;
};
var isDeviceLocalDialogOrAgent = (input) => {
  if (isDeviceLocalOwnerId(input.userId)) return true;
  if (input.dbKey && isDeviceLocalDbKey(input.dbKey)) return true;
  if (input.agentKey && isDeviceLocalDbKey(input.agentKey)) return true;
  if (input.primaryAgentKey && isDeviceLocalDbKey(input.primaryAgentKey)) {
    return true;
  }
  if (Array.isArray(input.cybots)) {
    for (const key of input.cybots) {
      if (typeof key === "string" && isDeviceLocalDbKey(key)) return true;
    }
  }
  return false;
};
var canChatDeviceLocalWithoutLogin = (input) => isDeviceLocalDialogOrAgent(input);

// packages/database/authority/userAuthorityRegistry.ts
var normalizeAuthorityServerOrigin = (value) => {
  const normalized = normalizeServerOrigin(value);
  return /^https?:\/\//i.test(normalized) ? normalized : null;
};
var normalizeUserId2 = (value) => asOptionalTrimmedString(value) ?? null;
var readEntryAuthorityServer = (entry) => {
  if (typeof entry === "string") {
    return normalizeAuthorityServerOrigin(entry);
  }
  if (!isRecord(entry)) {
    return null;
  }
  return normalizeAuthorityServerOrigin(entry.authorityServer) ?? normalizeAuthorityServerOrigin(entry.homeServer) ?? normalizeAuthorityServerOrigin(entry.primaryServer);
};
var resolveUserAuthorityServer = ({
  ownerUserId,
  registry
}) => {
  const normalizedOwner = normalizeUserId2(ownerUserId);
  if (!normalizedOwner || !registry || typeof registry !== "object") {
    return null;
  }
  return readEntryAuthorityServer(registry[normalizedOwner]);
};

// packages/database/authority/recordAuthority.ts
var normalizeUserId3 = (value) => asOptionalTrimmedString(value) ?? null;
var getRegistryOwnerCandidates = (registry) => isRecord(registry) ? Object.keys(registry) : [];
var resolveRecordAuthority = ({
  dbKey,
  record,
  currentUserId,
  currentServer,
  userAuthorityRegistry
}) => {
  const ownerUserId = parseOwnerUserIdFromDbKey(dbKey, {
    candidateOwnerUserIds: [
      normalizeUserId3(record?.userId),
      normalizeUserId3(currentUserId),
      ...getRegistryOwnerCandidates(userAuthorityRegistry)
    ]
  }) ?? normalizeUserId3(record?.userId);
  const serverOrigin = normalizeAuthorityServerOrigin(record?.serverOrigin);
  const explicitAuthority = normalizeAuthorityServerOrigin(record?.authorityServer);
  const registryAuthority = resolveUserAuthorityServer({
    ownerUserId,
    registry: userAuthorityRegistry
  });
  const currentUserAuthority = ownerUserId && ownerUserId === normalizeUserId3(currentUserId) ? normalizeAuthorityServerOrigin(currentServer) : null;
  return {
    ownerUserId,
    authorityServer: explicitAuthority ?? registryAuthority ?? currentUserAuthority ?? serverOrigin,
    serverOrigin
  };
};

// packages/database/actions/readResolution.ts
var toComparableTimestamp = (data) => {
  if (!data || typeof data !== "object") return 0;
  const updatedAtMs = asOptionalPositiveFiniteNumber(
    new Date(data.updatedAt).getTime()
  );
  if (updatedAtMs !== void 0) return updatedAtMs;
  const createdAtMs = asOptionalPositiveFiniteNumber(
    new Date(data.createdAt).getTime()
  );
  if (createdAtMs !== void 0) return createdAtMs;
  return asOptionalPositiveFiniteNumber(Number(data?.meta?.createdAt)) ?? 0;
};
var partitionReadServers = ({
  allServers,
  preferredServerOrigin
}) => {
  const preferredServer = typeof preferredServerOrigin === "string" && preferredServerOrigin.trim().length > 0 ? normalizeServerOrigin(preferredServerOrigin) : null;
  const fallbackServers = preferredServer ? allServers.filter(
    (server) => normalizeServerOrigin(server) !== preferredServer
  ) : allServers;
  return {
    preferredServer,
    fallbackServers,
    orderedServersForLocalHit: preferredServer ? [preferredServer, ...fallbackServers] : fallbackServers
  };
};
var compareRemoteRecordsByComparableTime = (left, right) => toComparableTimestamp(left) - toComparableTimestamp(right);
var pickBestSettledRemoteRecord = ({
  settledResults,
  isBetterCandidate
}) => {
  const validResults = settledResults.map((result, index) => ({
    data: result.status === "fulfilled" ? result.value : null,
    index
  })).filter((item) => item.data !== null && typeof item.data === "object");
  if (validResults.length === 0) return null;
  const latest = validResults.reduce(
    (best, current2) => isBetterCandidate(current2.data, best.data) ? current2 : best
  );
  return { index: latest.index, data: latest.data };
};
var shouldReplaceLocalWithRemoteRecord = ({
  localData,
  remoteData,
  isRemoteNewer
}) => {
  if (!remoteData || typeof remoteData !== "object") return false;
  if (!localData || typeof localData !== "object") return true;
  return isRemoteNewer(remoteData, localData);
};
var shouldReplicateLocalRecord = ({
  localData,
  remoteData,
  remoteTargetCount
}) => !!localData && !remoteData && remoteTargetCount > 0;
var compactUniqueServers = (servers) => {
  const out = [];
  for (const server of servers) {
    if (typeof server !== "string" || server.trim().length === 0) continue;
    const normalized = normalizeServerOrigin(server);
    if (!out.includes(normalized)) out.push(normalized);
  }
  return out;
};
var planAuthorityReadServers = ({
  allServers,
  authorityServer,
  serverOrigin
}) => compactUniqueServers([authorityServer, serverOrigin, ...allServers]);

// packages/database/actions/replication.ts
var isReadonlyPublicRecordKey = (dbKey) => dbKey.startsWith("agent-pub-");
var normalizeCurrentUserId = (state3) => {
  const userId = state3?.auth?.currentUser?.userId;
  return asOptionalTrimmedString(userId) ?? null;
};
var resolveReplicationServers = (currentServer, syncServers, preferredServerOrigin) => getAllServers(currentServer, syncServers, preferredServerOrigin);
var resolveAuthorityReplicationServers = ({
  currentServer,
  syncServers,
  preferredServerOrigin,
  dbKey,
  record,
  state: state3
}) => {
  const allServers = resolveReplicationServers(
    currentServer,
    syncServers,
    preferredServerOrigin
  );
  const authority = resolveRecordAuthority({
    dbKey,
    record,
    currentUserId: state3?.auth?.currentUser?.userId,
    currentServer,
    userAuthorityRegistry: state3?.settings?.userAuthorityRegistry ?? state3?.auth?.currentUser?.authorityRegistry
  });
  if (isDeviceLocalOwnerId(authority.ownerUserId) || isDeviceLocalOwnerId(record?.userId) || isDeviceLocalDbKey(dbKey)) {
    return [];
  }
  return planAuthorityReadServers({
    allServers,
    authorityServer: preferredServerOrigin ?? authority.authorityServer,
    serverOrigin: authority.serverOrigin
  });
};
var scheduleWriteReplication = (servers, request, state3) => {
  if (servers.length === 0) return;
  Promise.resolve().then(async () => {
    const [primaryServer, ...backupServers] = servers;
    const primarySucceeded = await noloWriteRequest(primaryServer, request, state3);
    if (!primarySucceeded) {
      console.warn(`Primary write sync failed for ${request.customKey} on ${primaryServer}`);
    }
    if (backupServers.length === 0) {
      return;
    }
    syncWithServers(
      backupServers,
      (server, requestConfig, requestState, signal) => noloWriteRequest(server, requestConfig, requestState, signal, {
        failureLogLevel: "info"
      }),
      `Backup write sync failed for ${request.customKey} on`,
      request,
      state3
    );
  });
};
var resolveTenantReplicationServers = ({
  currentServer,
  syncServers,
  tenantId
}) => {
  const allServers = resolveReplicationServers(currentServer, syncServers);
  if (allServers.length === 0) {
    return [];
  }
  return planServersForTenant(allServers, currentServer, tenantId);
};
var resolveUploadReplicationServers = ({
  currentServer,
  syncServers,
  tenantId,
  uploadConfig,
  state: state3
}) => {
  const allServers = resolveReplicationServers(currentServer, syncServers);
  const authority = resolveRecordAuthority({
    dbKey: uploadConfig.customKey,
    record: uploadConfig.metadata,
    currentUserId: state3?.auth?.currentUser?.userId,
    currentServer,
    userAuthorityRegistry: state3?.settings?.userAuthorityRegistry ?? state3?.auth?.currentUser?.authorityRegistry
  });
  if (authority.ownerUserId || authority.authorityServer) {
    return planAuthorityReadServers({
      allServers,
      authorityServer: authority.authorityServer,
      serverOrigin: authority.serverOrigin
    });
  }
  return resolveTenantReplicationServers({
    currentServer,
    syncServers,
    tenantId
  });
};
var scheduleExistingRecordReplication = ({
  currentServer,
  syncServers,
  preferredServerOrigin,
  dbKey,
  localData,
  state: state3
}) => {
  if (isReadonlyPublicRecordKey(dbKey)) {
    return [];
  }
  const currentUserId = normalizeCurrentUserId(state3);
  const authority = resolveRecordAuthority({
    dbKey,
    record: localData,
    currentUserId,
    currentServer,
    userAuthorityRegistry: state3?.settings?.userAuthorityRegistry ?? state3?.auth?.currentUser?.authorityRegistry
  });
  if (authority.ownerUserId && currentUserId && authority.ownerUserId !== currentUserId) {
    return [];
  }
  const servers = resolveAuthorityReplicationServers({
    currentServer,
    syncServers,
    preferredServerOrigin,
    dbKey,
    record: localData,
    state: state3
  });
  if (servers.length === 0) {
    return [];
  }
  scheduleWriteReplication(
    servers,
    {
      data: localData,
      customKey: dbKey,
      userId: typeof localData?.userId === "string" ? localData.userId : state3?.auth?.currentUser?.userId
    },
    state3
  );
  return servers;
};
var schedulePatchReplication = ({
  servers,
  dbKey,
  changes,
  state: state3,
  preferredServerOrigin
}) => {
  if (servers.length === 0) return;
  Promise.resolve().then(async () => {
    const primaryServer = typeof preferredServerOrigin === "string" && preferredServerOrigin.trim().length > 0 ? normalizeServerOrigin(preferredServerOrigin) : servers[0];
    const backupServers = servers.filter(
      (server) => normalizeServerOrigin(server) !== primaryServer
    );
    const primarySucceeded = await noloPatchRequest(primaryServer, dbKey, changes, state3, void 0, {
      failureLogLevel: "warn"
    });
    if (!primarySucceeded) {
      console.warn(`Primary patch sync failed for ${dbKey} on ${primaryServer}`);
    }
    if (backupServers.length > 0) {
      syncWithServers(
        backupServers,
        (server, targetDbKey, nextChanges, requestState, signal) => noloPatchRequest(server, targetDbKey, nextChanges, requestState, signal, {
          failureLogLevel: "info"
        }),
        `Backup patch sync failed for ${dbKey} on`,
        dbKey,
        changes,
        state3
      );
    }
  });
};
var scheduleConfiguredPatchReplication = ({
  currentServer,
  syncServers,
  preferredServerOrigin,
  dbKey,
  changes,
  state: state3
}) => {
  const servers = resolveAuthorityReplicationServers({
    currentServer,
    syncServers,
    preferredServerOrigin,
    dbKey,
    record: changes,
    state: state3
  });
  if (servers.length === 0) {
    return [];
  }
  schedulePatchReplication({
    servers,
    dbKey,
    changes,
    state: state3,
    preferredServerOrigin
  });
  return servers;
};
var scheduleUploadReplication = ({
  currentServer,
  syncServers,
  tenantId,
  uploadConfig,
  state: state3,
  excludeServers = []
}) => {
  const servers = resolveUploadReplicationServers({
    currentServer,
    syncServers,
    tenantId,
    uploadConfig,
    state: state3
  });
  const excluded = new Set(
    excludeServers.filter((server) => typeof server === "string").map((server) => normalizeServerOrigin(server))
  );
  const remainingServers = servers.filter(
    (server) => !excluded.has(normalizeServerOrigin(server))
  );
  if (remainingServers.length === 0) {
    return [];
  }
  Promise.resolve().then(() => {
    syncWithServers(
      remainingServers,
      noloUploadRequest,
      `Upload sync failed for ${uploadConfig.customKey} on`,
      uploadConfig,
      state3
    );
  });
  return remainingServers;
};
var uploadToCurrentServer = async ({
  currentServer,
  uploadConfig,
  state: state3
}) => {
  if (!currentServer) {
    return false;
  }
  return noloUploadRequest(currentServer, uploadConfig, state3);
};
var deleteFromReplicationServers = async ({
  servers,
  dbKey,
  deleteOptions = { type: "single" },
  state: state3,
  preferredServerOrigin
}) => {
  if (!servers.length) {
    return { succeeded: [], failed: [] };
  }
  const preferredServer = typeof preferredServerOrigin === "string" && preferredServerOrigin.trim().length > 0 ? normalizeServerOrigin(preferredServerOrigin) : null;
  const remainingServers = preferredServer ? servers.filter((server) => normalizeServerOrigin(server) !== preferredServer) : servers;
  const succeeded = [];
  const failed = [];
  if (preferredServer) {
    const ok2 = await noloDeleteRequest(preferredServer, dbKey, deleteOptions, state3);
    if (ok2) {
      succeeded.push(preferredServer);
    } else {
      failed.push(preferredServer);
    }
  }
  if (remainingServers.length > 0) {
    const results = await Promise.all(
      remainingServers.map(async (server) => ({
        server,
        ok: await noloDeleteRequest(server, dbKey, deleteOptions, state3)
      }))
    );
    results.forEach(({ server, ok: ok2 }) => {
      if (ok2) succeeded.push(server);
      else failed.push(server);
    });
  }
  return { succeeded, failed };
};
var scheduleDeleteReplication = ({
  currentServer,
  syncServers,
  preferredServerOrigin,
  dbKey,
  deleteOptions,
  state: state3,
  onResult,
  onError
}) => {
  const servers = resolveAuthorityReplicationServers({
    currentServer,
    syncServers,
    preferredServerOrigin,
    dbKey,
    state: state3
  });
  if (servers.length === 0) {
    return [];
  }
  void Promise.resolve().then(
    () => deleteFromReplicationServers({
      servers,
      dbKey,
      deleteOptions,
      state: state3,
      preferredServerOrigin
    })
  ).then((result) => {
    onResult?.(result);
  }).catch((error) => {
    onError?.(error);
  });
  return servers;
};

// packages/database/tombstones.ts
var TOMBSTONE_DETAIL_RETENTION_MS = 90 * 24 * 60 * 60 * 1e3;
var isRecord2 = (value) => value !== null && typeof value === "object";
var readRecord = (value) => isRecord2(value) ? value : null;
var parseTimestamp = (value) => {
  const asNumber = asOptionalPositiveFiniteNumber(value);
  if (asNumber !== void 0) return asNumber;
  if (typeof value === "string" && value.trim()) {
    return asOptionalPositiveFiniteNumber(Date.parse(value)) ?? 0;
  }
  return 0;
};
var getRecordTimestamp = (record) => {
  const value = readRecord(record);
  if (!value) return 0;
  const candidates = [
    value.updatedAt,
    value.updated_at,
    value.createdAt,
    value.created,
    isRecord2(value.meta) ? value.meta.createdAt : void 0
  ];
  for (const candidate of candidates) {
    const timestamp = parseTimestamp(candidate);
    if (timestamp > 0) return timestamp;
  }
  return 0;
};
var getTombstoneTimestamp = (record) => {
  const value = readRecord(record);
  if (!value) return 0;
  return parseTimestamp(value.deletedAt) || getRecordTimestamp(value);
};
var getRestoreTimestamp = (record) => {
  const value = readRecord(record);
  if (!value) return 0;
  return parseTimestamp(value.restoredAt);
};
var isTombstoneRecord = (record) => {
  const value = readRecord(record);
  if (!value) return false;
  const deletedAt = value.deletedAt;
  if (typeof deletedAt === "string") return deletedAt.trim().length > 0;
  return Boolean(deletedAt);
};
var isRestoredAfterTombstone = (activeRecord, tombstoneRecord) => {
  if (isTombstoneRecord(activeRecord) || !isTombstoneRecord(tombstoneRecord)) {
    return false;
  }
  const restoreTs = getRestoreTimestamp(activeRecord);
  const tombstoneTs = getTombstoneTimestamp(tombstoneRecord);
  return restoreTs > 0 && tombstoneTs > 0 && restoreTs > tombstoneTs;
};
var shouldReplaceWithNextRecord = (nextRecord, currentRecord) => {
  const nextIsTombstone = isTombstoneRecord(nextRecord);
  const currentIsTombstone = isTombstoneRecord(currentRecord);
  if (currentIsTombstone && !nextIsTombstone) {
    return isRestoredAfterTombstone(nextRecord, currentRecord);
  }
  if (nextIsTombstone && !currentIsTombstone) {
    return !isRestoredAfterTombstone(currentRecord, nextRecord);
  }
  const nextTs = nextIsTombstone ? getTombstoneTimestamp(nextRecord) : getRecordTimestamp(nextRecord);
  const currentTs = currentIsTombstone ? getTombstoneTimestamp(currentRecord) : getRecordTimestamp(currentRecord);
  if (nextTs !== currentTs) return nextTs > currentTs;
  return nextIsTombstone && !currentIsTombstone;
};
var buildTombstoneRecord = (record, nowIso) => {
  const { restoredAt: _restoredAt, ...baseRecord } = record;
  return {
    ...baseRecord,
    deletedAt: nowIso,
    updatedAt: nowIso
  };
};
var buildRestorePatch = (nowIso) => ({
  deletedAt: null,
  restoredAt: nowIso,
  updatedAt: nowIso
});
var COMPACT_TOMBSTONE_FIELDS = [
  "dbKey",
  "id",
  "contentKey",
  "appKey",
  "appId",
  "type",
  "userId",
  "deletedAt",
  "updatedAt",
  "createdAt",
  "created",
  "title",
  "name",
  "displayName",
  "spaceId",
  "serverOrigin"
];
var compactTombstoneRecord = (record) => {
  if (!isTombstoneRecord(record)) return record;
  const compacted = {};
  for (const field of COMPACT_TOMBSTONE_FIELDS) {
    if (field in record) compacted[field] = record[field];
  }
  return compacted;
};
var shouldCompactTombstoneRecord = (record, nowMs = Date.now(), retentionMs = TOMBSTONE_DETAIL_RETENTION_MS) => {
  if (!isTombstoneRecord(record)) return false;
  const tombstoneTs = getTombstoneTimestamp(record);
  return tombstoneTs > 0 && nowMs - tombstoneTs >= retentionMs;
};
var prepareTombstoneRecordForCache = (record, nowMs = Date.now()) => shouldCompactTombstoneRecord(record, nowMs) ? compactTombstoneRecord(record) : record;

// packages/database/actions/remove.ts
var removeAction = async (payload, thunkApi) => {
  const { db: clientDb } = thunkApi.extra;
  const dbKey = typeof payload === "string" ? payload : payload.dbKey;
  const preferredServerOrigin = typeof payload === "string" ? void 0 : payload.preferredServerOrigin;
  if (!clientDb) {
    throw new Error("Client database is undefined in removeAction");
  }
  const state3 = thunkApi.getState();
  const { currentServer, syncServers } = getRuntimeServerContext(state3);
  console.log("[removeAction] START", {
    dbKey,
    preferredServerOrigin,
    currentServer,
    syncServers,
    hasToken: Boolean(state3?.auth?.currentToken)
  });
  const localData = await fetchFromClientDb(clientDb, dbKey);
  const hadLocalData = Boolean(localData);
  console.log("[removeAction] replication inputs", {
    currentServer,
    syncServers,
    preferredServerOrigin,
    hadLocalData
  });
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  if (localData) {
    if (localData.id && typeof localData.id === "string") {
      void deleteFileFromIndexedDb(localData.id).catch((err2) => {
        console.warn("[removeAction] Failed to delete associated file:", localData.id, err2);
      });
    }
    await clientDb.put(dbKey, buildTombstoneRecord(localData, nowIso));
  } else {
    await clientDb.put(dbKey, buildTombstoneRecord({ dbKey }, nowIso));
  }
  scheduleDeleteReplication({
    currentServer,
    syncServers,
    preferredServerOrigin,
    dbKey,
    state: state3,
    onResult: (result) => {
      if (result.failed.length > 0) {
        console.warn("[removeAction] Server delete failures after local tombstone:", result.failed);
      }
    },
    onError: (err2) => {
      console.warn("[removeAction] Background server delete error:", err2);
    }
  });
  return { dbKey };
};

// packages/database/actions/readRequestManager.ts
var DEFAULT_MISS_COOLDOWN_MS = 2e3;
var DEFAULT_LOCAL_HIT_REVALIDATE_COOLDOWN_MS = 1500;
var DEFAULT_MISS_CACHE_MAX_SIZE = 1e3;
var ReadRequestManager = class {
  constructor(options = {}) {
    this.options = options;
    __publicField(this, "inFlightReads", /* @__PURE__ */ new Map());
    __publicField(this, "recentMisses", /* @__PURE__ */ new Map());
    __publicField(this, "recentLocalHitRevalidations", /* @__PURE__ */ new Map());
  }
  get missCooldownMs() {
    return this.options.missCooldownMs ?? DEFAULT_MISS_COOLDOWN_MS;
  }
  get missCacheMaxSize() {
    return this.options.missCacheMaxSize ?? DEFAULT_MISS_CACHE_MAX_SIZE;
  }
  get localHitRevalidateCooldownMs() {
    return this.options.localHitRevalidateCooldownMs ?? DEFAULT_LOCAL_HIT_REVALIDATE_COOLDOWN_MS;
  }
  getInFlight(dbKey) {
    return this.inFlightReads.get(dbKey);
  }
  setInFlight(dbKey, promise) {
    this.inFlightReads.set(dbKey, promise);
  }
  clearInFlight(dbKey, promise) {
    if (this.inFlightReads.get(dbKey) === promise) {
      this.inFlightReads.delete(dbKey);
    }
  }
  clearMiss(dbKey) {
    this.recentMisses.delete(dbKey);
  }
  getRetryInMs(dbKey, now) {
    const missUntil = this.recentMisses.get(dbKey);
    if (typeof missUntil !== "number") return null;
    if (missUntil <= now) {
      this.recentMisses.delete(dbKey);
      return null;
    }
    return missUntil - now;
  }
  markMiss(dbKey, now, cooldownMs = this.missCooldownMs) {
    this.recentMisses.set(dbKey, now + cooldownMs);
    this.cleanupMisses(now);
  }
  getLocalHitRevalidateInMs(dbKey, now) {
    const nextAllowedAt = this.recentLocalHitRevalidations.get(dbKey);
    if (typeof nextAllowedAt !== "number") return null;
    if (nextAllowedAt <= now) {
      this.recentLocalHitRevalidations.delete(dbKey);
      return null;
    }
    return nextAllowedAt - now;
  }
  markLocalHitRevalidated(dbKey, now, cooldownMs = this.localHitRevalidateCooldownMs) {
    this.recentLocalHitRevalidations.set(dbKey, now + cooldownMs);
    this.cleanupLocalHitRevalidations(now);
  }
  cleanupExpiringMap(map, now) {
    for (const [key, expiresAt] of Array.from(map.entries())) {
      if (expiresAt <= now) {
        map.delete(key);
      }
    }
    if (map.size <= this.missCacheMaxSize) return;
    const overflow = map.size - this.missCacheMaxSize;
    const keys = Array.from(map.keys());
    for (let i2 = 0; i2 < overflow; i2 += 1) {
      const key = keys[i2];
      if (key) map.delete(key);
    }
  }
  cleanupMisses(now) {
    this.cleanupExpiringMap(this.recentMisses, now);
  }
  cleanupLocalHitRevalidations(now) {
    this.cleanupExpiringMap(this.recentLocalHitRevalidations, now);
  }
  // test helper
  getMissCacheSize() {
    return this.recentMisses.size;
  }
  // test helper
  getLocalHitRevalidationCacheSize() {
    return this.recentLocalHitRevalidations.size;
  }
};
var readRequestManager = new ReadRequestManager();

// packages/database/actions/agentReadResolution.ts
var BUILTIN_PLATFORM_AGENT_KEYS2 = [
  ...BUILTIN_PLATFORM_AGENT_KEYS
];
var BUILTIN_PLATFORM_AGENT_KEY_SET = new Set(
  BUILTIN_PLATFORM_AGENT_KEYS2
);
var normalizeServer2 = (server) => normalizeKnownServerOrigin(server) ?? normalizeServerOrigin(server);
var isBuiltinPlatformAgentKey = (dbKey) => typeof dbKey === "string" && BUILTIN_PLATFORM_AGENT_KEY_SET.has(dbKey);
var resolveAgentReadServers = ({
  dbKey,
  configuredServers
}) => {
  const normalized = configuredServers.map(normalizeServer2);
  if (!isBuiltinPlatformAgentKey(dbKey)) {
    return Array.from(new Set(normalized));
  }
  return Array.from(/* @__PURE__ */ new Set([...normalized, ...NOLO_CLUSTER_SERVERS]));
};

// packages/database/actions/readAndWait.ts
var hashTokenScope = (currentToken) => {
  const token = currentToken || "";
  if (!token) return "anonymous";
  let hash = 0;
  for (let index = 0; index < token.length; index += 1) {
    hash = (hash << 5) - hash + token.charCodeAt(index) | 0;
  }
  return `token:${Math.abs(hash).toString(36)}`;
};
var buildReadAndWaitRequestKey = (dbKey, currentToken) => `${dbKey}\0auth:${hashTokenScope(currentToken)}`;
var isRemoteDataNewer = (remoteData, localData) => {
  return compareRemoteRecordsByComparableTime(remoteData, localData) > 0;
};
var syncLocalDataToServer = async (replicationContext, dbKey, localData) => {
  try {
    scheduleExistingRecordReplication({
      currentServer: replicationContext.currentServer,
      syncServers: replicationContext.syncServers,
      dbKey,
      localData,
      state: replicationContext.state
    });
  } catch {
  }
};
var processRemoteData = async (db, dbKey, remotePromises, localData, replicationContext) => {
  try {
    const settledResults = await Promise.allSettled(remotePromises);
    const remoteResult = pickBestSettledRemoteRecord({
      settledResults,
      isBetterCandidate: (current2, latest) => compareRemoteRecordsByComparableTime(current2, latest) > 0
    });
    const validRemoteData = remoteResult ? remoteResult.data : null;
    if (shouldReplaceLocalWithRemoteRecord({
      localData,
      remoteData: validRemoteData,
      isRemoteNewer: isRemoteDataNewer
    })) {
      await db.put(dbKey, validRemoteData);
      return validRemoteData;
    }
    if (localData) {
      if (shouldReplicateLocalRecord({
        localData,
        remoteData: validRemoteData,
        remoteTargetCount: remotePromises.length
      })) {
        void syncLocalDataToServer(replicationContext, dbKey, localData);
      }
      return localData;
    }
    throw new Error("Failed to fetch data from all sources");
  } catch (err2) {
    if (localData) {
      return localData;
    }
    throw err2;
  }
};
var readAndWaitAction = async (payload, thunkApi) => {
  const dbKey = typeof payload === "string" ? payload : payload.dbKey;
  const preferredServerOrigin = typeof payload === "string" ? void 0 : payload.preferredServerOrigin;
  const { db } = thunkApi.extra;
  if (!db) {
    throw new Error(
      "Database instance is not available in thunk extra argument."
    );
  }
  const state3 = thunkApi.getState();
  const {
    currentToken,
    remoteServers: configuredServers,
    currentServer,
    currentUserId,
    syncServers,
    userAuthorityRegistry
  } = getRuntimeServerContext(state3, preferredServerOrigin);
  const allServers = resolveAgentReadServers({ dbKey, configuredServers });
  const isLoggedIn = !!currentToken;
  const executeReadAndWait = async () => {
    const localData = await fetchFromClientDb(db, dbKey);
    const authority = resolveRecordAuthority({
      dbKey,
      record: localData,
      currentUserId,
      currentServer,
      userAuthorityRegistry
    });
    const readServers = planAuthorityReadServers({
      allServers,
      authorityServer: preferredServerOrigin ?? authority.authorityServer,
      serverOrigin: authority.serverOrigin
    });
    const hasPreferredAuthorityServer = !!preferredServerOrigin || !!authority.authorityServer;
    const preferredAuthorityServer = hasPreferredAuthorityServer ? readServers[0] : null;
    if (readServers.length === 0) {
      if (localData) {
        return { ...localData, dbKey };
      }
      throw new Error(
        `Failed to fetch data for key "${dbKey}" because network is offline and no local data is available.`
      );
    }
    if (preferredAuthorityServer) {
      try {
        const preferredRemoteData = await fetchFromServer(
          preferredAuthorityServer,
          dbKey,
          isLoggedIn ? currentToken : void 0
        );
        if (preferredRemoteData) {
          await db.put(dbKey, preferredRemoteData);
          return { ...preferredRemoteData, dbKey };
        }
      } catch {
      }
    }
    const remainingReadServers = preferredAuthorityServer ? readServers.filter((server) => server !== preferredAuthorityServer) : readServers;
    const remotePromises = remainingReadServers.map(
      (server) => fetchFromServer(server, dbKey, isLoggedIn ? currentToken : void 0)
    );
    const chosenData = await processRemoteData(
      db,
      dbKey,
      remotePromises,
      localData,
      { currentServer, syncServers, state: state3 }
    );
    return { ...chosenData, dbKey };
  };
  const inFlightKey = buildReadAndWaitRequestKey(dbKey, currentToken);
  const existing = readRequestManager.getInFlight(inFlightKey);
  if (existing) return existing;
  let inFlightPromise;
  inFlightPromise = executeReadAndWait().finally(() => {
    readRequestManager.clearInFlight(inFlightKey, inFlightPromise);
  });
  readRequestManager.setInFlight(inFlightKey, inFlightPromise);
  return inFlightPromise;
};

// packages/database/actions/actionToast.ts
var registeredToast = null;
function registerDatabaseActionToast(toast2) {
  registeredToast = toast2;
}
var actionToast = {
  success: (message) => registeredToast?.success(message),
  error: (message) => {
    if (registeredToast) registeredToast.error(message);
    else console.warn(message);
  }
};

// packages/database/actions/write.ts
var SPACE_MEMBER_PREFIX = "space-member-";
var getMemberUserIdFromSpaceMemberKey = (dbKey) => {
  if (!dbKey.startsWith(SPACE_MEMBER_PREFIX)) return null;
  const rest = dbKey.slice(SPACE_MEMBER_PREFIX.length);
  const lastDash = rest.lastIndexOf("-");
  if (lastDash <= 0) return null;
  return rest.slice(0, lastDash);
};
var saveToClientDb = async (clientDb, dbKey, data) => {
  if (!clientDb) {
    logger.error({ dbKey }, "Client database is undefined in saveToClientDb");
    throw new Error("Client database instance is required");
  }
  try {
    await clientDb.put(dbKey, data);
    logger.debug({ dbKey }, "Data saved successfully to local database.");
  } catch (err2) {
    logger.error({ err: err2, dbKey }, "Failed to save data to local database");
    throw new Error(`Local database put failed for ${dbKey}: ${err2.message}`);
  }
};
var writeAction = async (writeConfig, thunkApi) => {
  const { db: clientDb } = thunkApi.extra;
  if (!clientDb) {
    throw new Error("Client database instance is required in writeAction");
  }
  const state3 = thunkApi.getState();
  const { currentServer, syncServers, currentUserId } = getRuntimeServerContext(state3);
  const { data, customKey } = writeConfig;
  const userId = writeConfig.userId || currentUserId;
  const isSpaceMemberRecord = customKey.startsWith(SPACE_MEMBER_PREFIX);
  const recordUserId = isSpaceMemberRecord ? data.userId || getMemberUserIdFromSpaceMemberKey(customKey) || userId : userId;
  if (!data || !customKey) {
    const errorMsg = "Invalid arguments for writeAction: data and customKey are required.";
    logger.error({ writeConfig }, errorMsg);
    actionToast.error(errorMsg);
    throw new Error(errorMsg);
  }
  const VALID_TYPES = [
    "msg" /* MSG */,
    "page" /* DOC */,
    "dialog" /* DIALOG */,
    "notification" /* NOTIFICATION */,
    "token" /* TOKEN */,
    "transaction" /* TRANSACTION */,
    "space" /* SPACE */,
    "setting" /* SETTING */,
    "table" /* TABLE */,
    "table_row" /* TABLE_ROW */,
    "email" /* EMAIL */
  ];
  if (!data.type || !VALID_TYPES.includes(data.type)) {
    logger.warn(
      `Invalid data type "${data.type}" for writeAction with key ${customKey}. Proceeding anyway.`
    );
  }
  try {
    const willSaveData = normalizeTimeFields({
      ...data,
      dbKey: customKey,
      userId: recordUserId
    });
    await saveToClientDb(clientDb, customKey, willSaveData);
    const servers = resolveAuthorityReplicationServers({
      currentServer,
      syncServers,
      dbKey: customKey,
      record: willSaveData,
      state: state3
    });
    const serverWriteConfig = {
      data: willSaveData,
      customKey,
      userId: recordUserId
    };
    if (servers.length > 0) {
      logger.debug(
        `[writeAction] Initiating background sync for key: ${customKey} to ${servers.length} servers.`
      );
      scheduleWriteReplication(servers, serverWriteConfig, state3);
    } else {
      logger.warn(
        { customKey },
        "[writeAction] No available servers, data only saved locally."
      );
    }
    return willSaveData;
  } catch (error) {
    const errorMessage = `Write action failed for ${customKey}: ${error?.message || "Unknown error"}`;
    logger.error("[writeAction] Error:", error);
    actionToast.error(`Failed to save data for ${customKey}.`);
    throw new Error(errorMessage);
  }
};

// packages/database/actions/patch.ts
var deepMerge = (target, source) => {
  const output = { ...target };
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (source[key] === null && key in output) {
        delete output[key];
      } else if (isRecord(source[key])) {
        output[key] = deepMerge(output[key] || {}, source[key]);
      } else {
        output[key] = source[key];
      }
    }
  }
  return output;
};
var inferNextUpdatedAt = (currentData) => {
  const previousUpdatedAt = currentData?.updatedAt;
  const previousCreatedAt = currentData?.createdAt;
  const previousMetaCreatedAt = currentData?.meta?.createdAt;
  const previousTimestamp = Math.max(
    toTimestampMs(previousUpdatedAt),
    toTimestampMs(previousCreatedAt),
    toTimestampMs(previousMetaCreatedAt)
  );
  const nextTimestamp = Math.max(Date.now(), previousTimestamp + 1);
  if (typeof previousUpdatedAt === "number" || typeof previousCreatedAt === "number" || typeof previousMetaCreatedAt === "number") {
    return nextTimestamp;
  }
  if (typeof previousUpdatedAt === "string" || typeof previousCreatedAt === "string") {
    return new Date(nextTimestamp).toISOString();
  }
  return void 0;
};
var patchAction = async ({
  dbKey,
  changes,
  preferredServerOrigin
}, thunkApi) => {
  const { db } = thunkApi.extra;
  if (!db) {
    const errorMsg = "Database instance is not available.";
    actionToast.error(errorMsg);
    throw new Error(errorMsg);
  }
  if (!dbKey || !changes || typeof changes !== "object") {
    const errorMsg = "Patch action requires a valid dbKey and changes object.";
    actionToast.error(errorMsg);
    throw new Error(errorMsg);
  }
  const state3 = thunkApi.getState();
  const { currentServer, syncServers: configuredSyncServers } = getRuntimeServerContext(state3);
  try {
    const currentData = await db.get(dbKey);
    if (!currentData) {
      throw new Error(
        `Cannot apply patch: Data not found locally for key: ${dbKey}.`
      );
    }
    const patchChanges = Object.prototype.hasOwnProperty.call(changes, "updatedAt") ? changes : {
      ...changes,
      ...inferNextUpdatedAt(currentData) !== void 0 ? { updatedAt: inferNextUpdatedAt(currentData) } : {}
    };
    const newData = deepMerge(currentData, patchChanges);
    const persistedData = newData && typeof newData === "object" ? { ...newData, dbKey } : { dbKey };
    await db.put(dbKey, persistedData);
    scheduleConfiguredPatchReplication({
      currentServer,
      syncServers: configuredSyncServers,
      preferredServerOrigin,
      dbKey,
      changes: patchChanges,
      state: state3
    });
    return persistedData;
  } catch (error) {
    const errorMessage = `Failed to update data for ${dbKey}.`;
    actionToast.error(errorMessage);
    throw new Error(error.message || errorMessage);
  }
};

// packages/database/actions/purge.ts
var purgeAction = async (payload, thunkApi) => {
  const { db: clientDb } = thunkApi.extra;
  const dbKey = typeof payload === "string" ? payload : payload.dbKey;
  const preferredServerOrigin = typeof payload === "string" ? void 0 : payload.preferredServerOrigin;
  if (!clientDb) {
    throw new Error("Client database is undefined in purgeAction");
  }
  const state3 = thunkApi.getState();
  const { currentServer, syncServers } = getRuntimeServerContext(state3);
  const localData = await fetchFromClientDb(clientDb, dbKey);
  if (localData && !isTombstoneRecord(localData)) {
    throw new Error(
      `purgeAction refused: record ${dbKey} is not tombstoned. Use removeAction instead.`
    );
  }
  await clientDb.del(dbKey);
  const servers = resolveAuthorityReplicationServers({
    currentServer,
    syncServers,
    preferredServerOrigin,
    dbKey,
    state: state3
  });
  await Promise.all(
    servers.map(async (server) => {
      const ok2 = await noloDeleteRequest(
        server,
        dbKey,
        { type: "single", force: true },
        state3
      );
      if (!ok2) {
        console.warn("[purgeAction] server force-delete failed", { dbKey, server });
      }
    })
  );
  return { dbKey, servers };
};

// packages/database/actions/upsert.ts
var upsertAction = async (upsertConfig, thunkApi) => {
  const { dbKey, data } = upsertConfig;
  if (!dbKey || !data || typeof data !== "object") {
    const errorMsg = "upsertAction \u53C2\u6570\u65E0\u6548\uFF1AdbKey \u548C data \u5BF9\u8C61\u662F\u5FC5\u9700\u7684\u3002";
    actionToast.error(errorMsg);
    throw new Error(errorMsg);
  }
  try {
    const existingData = await readAction({ dbKey }, thunkApi);
    let finalResult;
    if (existingData && Object.keys(existingData).length > 0) {
      finalResult = await patchAction({ dbKey, changes: data }, thunkApi);
    } else {
      finalResult = await writeAction({ data, customKey: dbKey }, thunkApi);
    }
    return finalResult;
  } catch (error) {
    const errorMessage = `Upsert \u534F\u8C03\u64CD\u4F5C\u5931\u8D25 (dbKey: ${dbKey}): ${error.message || "\u672A\u77E5\u9519\u8BEF"}`;
    actionToast.error("\u6570\u636E\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002");
    throw new Error(errorMessage, { cause: error });
  }
};

// packages/app/utils/fileUtils.ts
var fileConstructor = typeof globalThis !== "undefined" && typeof globalThis.File === "function" ? globalThis.File : void 0;
var isImageMimeType = (value) => typeof value === "string" && value.toLowerCase().startsWith("image/");
var IMAGE_FILE_NAME_RE = /\.(avif|bmp|gif|heic|heif|ico|jpe?g|png|svg|tiff?|webp)$/i;
var VIDEO_FILE_NAME_RE = /\.(avi|m4v|mkv|mov|mp4|mpeg|mpg|webm)$/i;
var AUDIO_FILE_NAME_RE = /\.(aac|flac|m4a|mp3|ogg|wav|weba)$/i;
var DOCUMENT_FILE_NAME_RE = /\.(csv|doc|docx|md|odt|pdf|ppt|pptx|rtf|txt|xls|xlsx)$/i;
var isImageFileName = (value) => typeof value === "string" && IMAGE_FILE_NAME_RE.test(value.trim());
var formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / Math.pow(1024, unitIndex);
  const digits = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
};
var MIME_FORMAT_LABELS = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "text/plain": "TXT",
  "text/markdown": "MD",
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WEBP",
  "image/gif": "GIF",
  "video/mp4": "MP4",
  "video/quicktime": "MOV",
  "audio/mpeg": "MP3",
  "audio/wav": "WAV",
  "audio/x-wav": "WAV",
  "audio/mp4": "M4A"
};
var resolveFileFormatLabel = ({
  fileName,
  mimeType
}) => {
  if (typeof fileName === "string") {
    const normalizedName = fileName.trim();
    const ext = normalizedName.includes(".") ? normalizedName.split(".").pop()?.trim().toUpperCase() : "";
    if (ext) return ext;
  }
  if (typeof mimeType === "string") {
    const normalizedMimeType = asTrimmedLowercaseString(mimeType);
    if (MIME_FORMAT_LABELS[normalizedMimeType]) {
      return MIME_FORMAT_LABELS[normalizedMimeType];
    }
    const [, subtype] = normalizedMimeType.split("/");
    if (subtype) {
      return subtype.split("+")[0]?.split(".").pop()?.toUpperCase() ?? null;
    }
  }
  return null;
};
var getCompactFileMetaLabel = ({
  fileName,
  mimeType,
  fileSize
}) => {
  const formatLabel = resolveFileFormatLabel({ fileName, mimeType });
  const finiteSize = asOptionalFiniteNumber(fileSize);
  const sizeLabel = finiteSize !== void 0 ? formatFileSize(finiteSize) : null;
  if (formatLabel && sizeLabel) return `${formatLabel} \xB7 ${sizeLabel}`;
  return formatLabel ?? sizeLabel;
};
var isVideoMimeType = (value) => typeof value === "string" && value.toLowerCase().startsWith("video/");
var isAudioMimeType = (value) => typeof value === "string" && value.toLowerCase().startsWith("audio/");
var isPdfMimeType = (value) => typeof value === "string" && value.toLowerCase() === "application/pdf";
var isDocumentMimeType = (value) => {
  if (typeof value !== "string") return false;
  const normalized = value.toLowerCase();
  return isPdfMimeType(normalized) || normalized === "text/plain" || normalized === "text/markdown" || normalized === "text/csv" || normalized === "application/msword" || normalized === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || normalized === "application/vnd.ms-powerpoint" || normalized === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || normalized === "application/vnd.ms-excel" || normalized === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || normalized === "application/rtf" || normalized === "application/vnd.oasis.opendocument.text";
};
var resolveFileCategory = ({
  mimeType,
  fileName
}) => {
  if (isImageMimeType(mimeType) || isImageFileName(fileName)) return "image";
  if (isVideoMimeType(mimeType) || typeof fileName === "string" && VIDEO_FILE_NAME_RE.test(fileName.trim())) {
    return "video";
  }
  if (isAudioMimeType(mimeType) || typeof fileName === "string" && AUDIO_FILE_NAME_RE.test(fileName.trim())) {
    return "audio";
  }
  if (isDocumentMimeType(mimeType) || typeof fileName === "string" && DOCUMENT_FILE_NAME_RE.test(fileName.trim())) {
    return "document";
  }
  return "other";
};
var isImageResourceLike = ({
  kind,
  mimeType,
  fileName,
  fileCategory
}) => {
  if (fileCategory === "image") return true;
  if (typeof kind === "string") {
    const normalizedKind = kind.toLowerCase();
    if (normalizedKind === "image" || isImageMimeType(normalizedKind)) {
      return true;
    }
  }
  return isImageMimeType(mimeType) || isImageFileName(fileName);
};
var isBrowserFile = (value) => !!fileConstructor && value instanceof fileConstructor;
var isImageFile = (value) => isBrowserFile(value) && isImageMimeType(value.type);
var filterImageFiles = (values) => Array.from(values).filter(isImageFile);
function splitFiles(files) {
  return files.reduce(
    (acc, file) => {
      const index = isImageFile(file) ? 0 : 1;
      acc[index].push(file);
      return acc;
    },
    [[], []]
  );
}
function extractFilesFromDataTransfer(dt) {
  if (!dt) return [];
  const files = [];
  if (dt.items && dt.items.length > 0) {
    for (const item of Array.from(dt.items)) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) return files;
  }
  if (dt.files && dt.files.length > 0) {
    return Array.from(dt.files);
  }
  return [];
}

// packages/database/actions/upload.ts
var saveToClientDb2 = async (clientDb, dbKey, metadata) => {
  if (!clientDb) {
    logger.error({ dbKey }, "Client database is undefined in saveToClientDb");
    throw new Error("Client database instance is required");
  }
  try {
    await clientDb.put(dbKey, metadata);
    logger.debug(
      { dbKey },
      "File metadata saved successfully to local database."
    );
  } catch (err2) {
    logger.error(
      { err: err2, dbKey },
      "Failed to save file metadata to local database"
    );
    throw new Error(`Local database put failed for ${dbKey}: ${err2.message}`);
  }
};
var uploadFileAction = async (uploadConfig, thunkApi) => {
  const { db: clientDb } = thunkApi.extra;
  const state3 = thunkApi.getState();
  const { currentServer, syncServers, currentUserId } = getRuntimeServerContext(state3);
  const { file, customKey } = uploadConfig;
  const userId = uploadConfig.userId || currentUserId;
  if (!file) {
    const errorMsg = "Invalid arguments for uploadFileAction: file is required.";
    logger.error({ uploadConfig }, errorMsg);
    throw new Error(errorMsg);
  }
  try {
    const fileId = ulid2();
    const fileExtension = file.name.split(".").pop() || "";
    const fileName = `${fileId}${fileExtension ? "." + fileExtension : ""}`;
    let finalDbKey = customKey;
    if (!finalDbKey || !finalDbKey.startsWith("file-")) {
      const actualUserId = userId || "unknown";
      if (actualUserId === "unknown") {
        console.warn("[uploadFileAction] User ID is unknown during upload. Key will be file-unknown.");
      }
      finalDbKey = fileKey.single(actualUserId, fileId);
    }
    const fileMetadata = normalizeTimeFields({
      id: fileId,
      title: file.name,
      originalName: file.name,
      fileName,
      filePath: "",
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      type: "file" /* FILE */,
      fileCategory: resolveFileCategory({
        mimeType: file.type,
        fileName: file.name
      }),
      dbKey: finalDbKey,
      userId
    });
    await saveToClientDb2(clientDb, finalDbKey, fileMetadata);
    try {
      await saveFileToIndexedDb(fileId, file);
    } catch (err2) {
      logger.warn(
        { err: err2, fileId },
        "[uploadFileAction] Failed to cache file locally."
      );
    }
    const tenantId = userId || "default";
    const uploadReplicationConfig = {
      file,
      metadata: fileMetadata,
      customKey: finalDbKey,
      userId
    };
    const uploadServers = resolveUploadReplicationServers({
      currentServer,
      syncServers,
      tenantId,
      uploadConfig: uploadReplicationConfig,
      state: state3
    });
    const primaryUploadServer = uploadServers[0] ?? currentServer;
    const primaryUploadSucceeded = await uploadToCurrentServer({
      currentServer: primaryUploadServer,
      uploadConfig: uploadReplicationConfig,
      state: state3
    });
    if (primaryUploadServer && !primaryUploadSucceeded) {
      throw new Error(`Primary upload failed on authority server ${primaryUploadServer}`);
    }
    const serversToUse = scheduleUploadReplication({
      currentServer,
      syncServers,
      tenantId,
      uploadConfig: uploadReplicationConfig,
      state: state3,
      excludeServers: primaryUploadServer ? [primaryUploadServer] : []
    });
    if (!primaryUploadServer && !serversToUse.length) {
      logger.warn(
        { finalDbKey, fileName, tenantId },
        "[uploadFileAction] No replication servers available, file metadata only saved locally."
      );
      return fileMetadata;
    }
    logger.debug(
      { primaryUploadServer, currentServer, serversToUse, tenantId },
      `[uploadFileAction] Uploaded primary copy for ${fileName} and scheduled background sync to ${serversToUse.length} additional servers.`
    );
    return fileMetadata;
  } catch (error) {
    const errorMessage = `Upload action failed for ${customKey}: ${error?.message || "Unknown error"}`;
    logger.error({ error }, "[uploadFileAction] Error");
    throw new Error(errorMessage);
  }
};

// packages/database/actions/fileContent.ts
var resolveLocalFileId = (fileId) => {
  if (fileId.startsWith("file-")) {
    return getFileIdFromKey(fileId) || fileId;
  }
  return fileId;
};
var readFileContentAction = async ({
  fileId,
  useServerFallback = true
}, thunkApi) => {
  if (!fileId || typeof fileId !== "string") {
    throw new Error("readFileContentAction requires a valid fileId string.");
  }
  const localId = resolveLocalFileId(fileId);
  const localRecord = await loadFileFromIndexedDb(localId);
  if (localRecord) {
    return {
      fileId: localId,
      blob: localRecord.blob,
      source: "local"
    };
  }
  if (!useServerFallback) {
    throw new Error(
      `Local file not found for id "${fileId}", and server fallback is disabled.`
    );
  }
  const state3 = thunkApi.getState();
  const { currentServer, remoteServers: serversToTry } = getRuntimeServerContext(state3);
  if (!currentServer) {
    throw new Error(
      `No current server configured. Cannot fetch remote file for id "${fileId}".`
    );
  }
  let lastError = "";
  for (const server of serversToTry) {
    const url = `${server}${API_ENDPOINTS.DATABASE}/file/content/${fileId}`;
    console.debug("[readFileContentAction] trying server:", url);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        lastError = `HTTP ${res.status} from ${server}`;
        console.debug("[readFileContentAction] server returned:", lastError);
        continue;
      }
      const blob = await res.blob();
      if (typeof indexedDB !== "undefined") {
        void saveFileToIndexedDb(localId, blob).catch((err2) => {
          console.warn(
            "[readFileContentAction] Failed to cache remote file into IndexedDB:",
            err2
          );
        });
      }
      return {
        fileId: localId,
        blob,
        source: "remote"
      };
    } catch (err2) {
      lastError = err2?.message || "Network error";
      console.debug(
        "[readFileContentAction] fetch error from",
        server,
        lastError
      );
    }
  }
  throw new Error(
    `Failed to fetch remote file content from all servers for id "${fileId}". Last error: ${lastError}`
  );
};

// packages/database/dbSlice.ts
var dbAdapter = createEntityAdapter({
  selectId: (entity) => entity.dbKey
});
var {
  selectById,
  selectEntities,
  selectAll,
  selectIds,
  selectTotal
} = dbAdapter.getSelectors((state3) => state3.db);
var initialState2 = dbAdapter.getInitialState({});
var createSliceWithThunks = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator }
});
var dbSlice = createSliceWithThunks({
  name: "db",
  initialState: initialState2,
  reducers: (create) => ({
    // Async Thunks
    // 惰性加载 readAction：esbuild 把大型 read.ts 排到同 chunk 后部时，
    // `var readAction` 在 create.asyncThunk(readAction) 执行时仍是 undefined，
    // 之后所有 dispatch(read) 抛 "payloadCreator is not a function"。
    // 动态 import 在调用期解析，避开 TDZ/求值顺序问题（同下方 share）。
    read: create.asyncThunk(
      async (payload, thunkApi) => {
        const { readAction: readAction2 } = await import("/public/assets/chunks/read-BTIYWAYT.js");
        return readAction2(payload, thunkApi);
      },
      {
        fulfilled: (state3, action2) => {
          if (action2.payload && Object.keys(action2.payload).length > 0) {
            dbAdapter.upsertOne(state3, action2.payload);
          }
        }
      }
    ),
    readAndWait: create.asyncThunk(readAndWaitAction, {
      fulfilled: (state3, action2) => {
        if (action2.payload && Object.keys(action2.payload).length > 0) {
          dbAdapter.upsertOne(state3, action2.payload);
        }
      }
    }),
    remove: create.asyncThunk(removeAction, {
      fulfilled: (state3, action2) => {
        const { dbKey } = action2.payload;
        if (dbKey) dbAdapter.removeOne(state3, dbKey);
      }
    }),
    purge: create.asyncThunk(purgeAction, {
      fulfilled: (state3, action2) => {
        const { dbKey } = action2.payload;
        if (dbKey) dbAdapter.removeOne(state3, dbKey);
      }
    }),
    write: create.asyncThunk(writeAction, {
      fulfilled: (state3, action2) => {
        if (action2.payload && action2.payload.dbKey && Object.keys(action2.payload).length > 0) {
          dbAdapter.upsertOne(state3, action2.payload);
        }
      }
    }),
    patch: create.asyncThunk(patchAction, {
      fulfilled: (state3, action2) => {
        const { payload } = action2;
        if (payload && payload.dbKey && Object.keys(payload).length > 0) {
          dbAdapter.upsertOne(state3, payload);
        }
      }
    }),
    upsert: create.asyncThunk(upsertAction, {
      fulfilled: (state3, action2) => {
        if (action2.payload && action2.payload.dbKey && Object.keys(action2.payload).length > 0) {
          dbAdapter.upsertOne(state3, action2.payload);
        }
      }
    }),
    // 文件上传（avatar / Slate / Space 等统一走这里）
    upload: create.asyncThunk(uploadFileAction, {
      fulfilled: (state3, action2) => {
        const payload = action2.payload;
        if (payload && payload.dbKey && Object.keys(payload).length > 0) {
          dbAdapter.upsertOne(state3, payload);
        }
      }
    }),
    // 读取文件内容（优先本地 IndexedDB，无状态副作用）
    readFileContent: create.asyncThunk(readFileContentAction, {
      // fulfilled 时不修改 db state；由调用方通过 unwrap() 拿返回值使用
    }),
    // 惰性加载 shareResourceAction：静态 import 会形成
    // dbSlice -> share/action -> settings/settingSlice -> settingPersistence
    // -> settings/dbActionThunks -> database/dbActionThunks -> dbSlice 的循环依赖。
    // 分包后 chunk 求值顺序一旦从环内进入 dbSlice，上面的 `readAction` 等
    // `export const` 还处于未初始化状态，thunk 会以 undefined 作为 payloadCreator
    // 建成，之后 dispatch(read(...)) 抛 "payloadCreator is not a function"。
    // 这里改成动态 import，运行期才解析，彻底断开这条边。
    share: create.asyncThunk(
      async (config, thunkApi) => {
        const { shareResourceAction } = await import("/public/assets/chunks/action-BDKIRG4N.js");
        return shareResourceAction(config, thunkApi);
      }
    ),
    // SSR 预取：服务端直接注入实体到 db slice，供首屏 hydrate 使用
    upsertSSREntity: create.reducer((state3, action2) => {
      if (action2.payload && action2.payload.dbKey) {
        dbAdapter.upsertOne(state3, action2.payload);
      }
    }),
    // Undo an in-memory optimistic entity without writing a tombstone or
    // scheduling remote deletion. Durable deletes must continue to use remove.
    removeCachedEntity: create.reducer((state3, action2) => {
      if (action2.payload) dbAdapter.removeOne(state3, action2.payload);
    })
  })
});
var {
  remove,
  purge,
  read,
  readAndWait,
  write,
  patch,
  upsert,
  upload,
  readFileContent,
  share,
  upsertSSREntity,
  removeCachedEntity
} = dbSlice.actions;
var dbSlice_default = dbSlice.reducer;

// packages/app/settings/dbActionThunks.ts
var getDefaultSettingDbActionThunks = () => ({
  readAndWait,
  patch,
  upsert,
  write
});
var settingDbActionThunksOverrideKey = Symbol.for(
  "bun-nolo.app.settings.dbActionThunksOverride"
);
var getSettingDbActionThunks = () => {
  const globalOverride = globalThis[settingDbActionThunksOverrideKey];
  return globalOverride ?? getDefaultSettingDbActionThunks();
};

// packages/app/settings/settingsRecord.ts
var SETTINGS_RECORD_SCHEMA_VERSION = 1;
var withSettingsRecordSchema = (changes) => ({
  ...changes,
  schemaVersion: SETTINGS_RECORD_SCHEMA_VERSION
});

// packages/core/init.ts
var nolotusId = "0e95801d90";
var ADMIN_IDS = /* @__PURE__ */ new Set([nolotusId]);
var isSystemAdmin = (userId) => userId != null && ADMIN_IDS.has(userId);
var noloAgentId = BUILTIN_NOLO_AGENT_KEY;

// packages/app/settings/quickChatTierDefaults.ts
var QUICK_CHAT_AUTO_FALLBACK_AGENT_KEY = PUBLIC_DEEPSEEK_V4_FLASH_AGENT_KEY;
var QUICK_CHAT_IMAGE_AGENT_KEY = PUBLIC_KIMI_K26_IMAGE_AGENT_KEY;
var QUICK_CHAT_DEFAULT_TIER_AGENTS = {
  flash: QUICK_CHAT_AUTO_FALLBACK_AGENT_KEY,
  balanced: QUICK_CHAT_AUTO_FALLBACK_AGENT_KEY,
  quality: QUICK_CHAT_AUTO_FALLBACK_AGENT_KEY,
  image: QUICK_CHAT_IMAGE_AGENT_KEY
};

// packages/app/settings/settingNormalizers.ts
var hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target, key);
var normalizeDefaultAgentIdSetting = (value) => {
  if (typeof value !== "string" || value.trim() === "") {
    return void 0;
  }
  return value === noloAgentId || value === SYSTEM_DEFAULT_AGENT_ID ? SYSTEM_DEFAULT_AGENT_ID : value;
};
var normalizeAuthorityHomeServerSetting = (value) => {
  const normalized = normalizeServerOrigin(value);
  return /^https?:\/\//i.test(normalized) ? normalized : null;
};
var normalizeTonePresetSetting = (value) => {
  switch (value) {
    case "professional":
    case "friendly":
    case "direct":
    case "pragmatic":
    case "default":
      return value;
    default:
      return DEFAULT_USER_PREFERENCE_PROFILE.tone?.preset ?? "default";
  }
};
var normalizePolicyLevelSetting = (value, fallback) => {
  const n = Number(value);
  if (n === 1 || n === 2 || n === 3 || n === 4) {
    return n;
  }
  return fallback;
};
var resolveDefaultAgentIdSetting = (value) => normalizeDefaultAgentIdSetting(value) ?? SYSTEM_DEFAULT_AGENT_ID;
var selectResolvedDefaultAgentId = (value) => {
  const normalizedValue = resolveDefaultAgentIdSetting(value);
  return normalizedValue === SYSTEM_DEFAULT_AGENT_ID ? noloAgentId : normalizedValue;
};
var hexToRgbString = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/^#/, "");
  const safe = normalized.length === 3 ? normalized.split("").map((char) => char + char).join("") : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(safe)) return null;
  const intValue = Number.parseInt(safe, 16);
  const r = intValue >> 16 & 255;
  const g = intValue >> 8 & 255;
  const b2 = intValue & 255;
  return `${r}, ${g}, ${b2}`;
};
var alphaColor = (hex, alpha, fallback) => {
  const rgb = hexToRgbString(hex);
  return rgb ? `rgba(${rgb}, ${alpha})` : fallback;
};
var omitKeys = (record, keys) => {
  const next = { ...record };
  keys.forEach((key) => {
    delete next[key];
  });
  return next;
};
var isRecordLike = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
var normalizeSystemBuiltinSkills = (value, defaults) => {
  const base = isRecordLike(value) ? value : {};
  const result = { ...defaults };
  for (const key of Object.keys(base)) {
    result[key] = Boolean(base[key]);
  }
  return result;
};

// packages/app/settings/settingPersistence.ts
var normalizeSettingChanges = (changes) => {
  let normalizedChanges = changes;
  if (hasOwn(normalizedChanges, "defaultAgentId")) {
    normalizedChanges = {
      ...normalizedChanges,
      defaultAgentId: normalizeDefaultAgentIdSetting(
        normalizedChanges.defaultAgentId
      )
    };
  }
  if (hasOwn(normalizedChanges, "defaultSpaceId")) {
    normalizedChanges = omitKeys(normalizedChanges, [
      "defaultSpaceId"
    ]);
  }
  if (hasOwn(normalizedChanges, "themeName")) {
    const themeName = normalizeThemeName(normalizedChanges.themeName);
    normalizedChanges = themeName ? { ...normalizedChanges, themeName } : omitKeys(normalizedChanges, ["themeName"]);
  }
  if (hasOwn(normalizedChanges, "fontPreset")) {
    const fontPreset = normalizeFontPreset(normalizedChanges.fontPreset);
    normalizedChanges = fontPreset ? { ...normalizedChanges, fontPreset } : omitKeys(normalizedChanges, ["fontPreset"]);
  }
  if (hasOwn(normalizedChanges, "userTonePreset")) {
    normalizedChanges = {
      ...normalizedChanges,
      userTonePreset: normalizeTonePresetSetting(
        normalizedChanges.userTonePreset
      )
    };
  }
  if (hasOwn(normalizedChanges, "knowledgeCaptureLevel")) {
    normalizedChanges = {
      ...normalizedChanges,
      knowledgeCaptureLevel: normalizePolicyLevelSetting(
        normalizedChanges.knowledgeCaptureLevel,
        DEFAULT_USER_PREFERENCE_PROFILE.knowledgeCaptureLevel
      )
    };
  }
  if (hasOwn(normalizedChanges, "spaceContextLevel")) {
    normalizedChanges = {
      ...normalizedChanges,
      spaceContextLevel: normalizePolicyLevelSetting(
        normalizedChanges.spaceContextLevel,
        DEFAULT_USER_PREFERENCE_PROFILE.spaceContextLevel
      )
    };
  }
  if (hasOwn(normalizedChanges, "autoApproveSelfUpdateFields")) {
    normalizedChanges = {
      ...normalizedChanges,
      autoApproveSelfUpdateFields: normalizeAgentUpdateFieldList(
        normalizedChanges.autoApproveSelfUpdateFields
      )
    };
  }
  if (hasOwn(normalizedChanges, "systemBuiltinSkills")) {
    normalizedChanges = {
      ...normalizedChanges,
      systemBuiltinSkills: normalizeSystemBuiltinSkills(
        normalizedChanges.systemBuiltinSkills,
        DEFAULT_SYSTEM_BUILTIN_SKILLS
      )
    };
  }
  return normalizedChanges;
};
var LOCAL_APPEARANCE_KEY_NAMES = [
  "themeName",
  "themeMode",
  "isDark",
  "density",
  "fontPreset"
];
var GUEST_UPDATABLE_KEY_NAMES = [
  ...LOCAL_APPEARANCE_KEY_NAMES,
  "sidebarWidth"
];
var LOCAL_FIRST_APPEARANCE_KEYS = Object.freeze(
  Object.fromEntries(
    LOCAL_APPEARANCE_KEY_NAMES.map((key) => [key, true])
  )
);
var LOCAL_ONLY_SETTINGS_KEYS = LOCAL_FIRST_APPEARANCE_KEYS;
var GUEST_UPDATABLE_KEYS = Object.freeze(
  Object.fromEntries(
    GUEST_UPDATABLE_KEY_NAMES.map((key) => [key, true])
  )
);
var isGuestUpdatableKey = (key) => key in GUEST_UPDATABLE_KEYS;
var isLocalFirstAppearanceChange = (changes) => {
  const keys = Object.keys(changes);
  if (keys.length === 0) return false;
  return keys.every(
    (key) => isGuestUpdatableKey(key)
  );
};
var stripRegisterBackedFieldsFromSettingsWrite = (changes) => {
  return omitKeys(changes, [
    "defaultSpaceId",
    "userAuthorityRegistry",
    ...LOCAL_APPEARANCE_KEY_NAMES
  ]);
};
var sanitizeStoredSettingsRecord = (settingsRecord) => {
  if (!settingsRecord || typeof settingsRecord !== "object") {
    return null;
  }
  const record = settingsRecord;
  const sanitizedSettings = omitKeys(record, [
    "defaultSpaceId",
    "schemaVersion",
    ...LOCAL_APPEARANCE_KEY_NAMES
  ]);
  return Object.keys(sanitizedSettings).length > 0 ? sanitizedSettings : null;
};
var hydrateStoredSettings = ({
  userId,
  settingsRecord,
  authorityHomeServer
}) => {
  const record = settingsRecord ?? {};
  const resolvedDefaultAgentId = normalizeDefaultAgentIdSetting(record.defaultAgentId) ?? SYSTEM_DEFAULT_AGENT_ID;
  const baseSettings = sanitizeStoredSettingsRecord(settingsRecord) ?? {};
  const normalizedAuthorityHome = normalizeAuthorityHomeServerSetting(authorityHomeServer);
  const existingRegistry = asRecordOrEmpty(
    baseSettings.userAuthorityRegistry
  );
  const userAuthorityRegistry = userId && normalizedAuthorityHome ? { ...existingRegistry, [userId]: normalizedAuthorityHome } : existingRegistry;
  const userAuthorityRegistryIsEmpty = Object.keys(userAuthorityRegistry).length === 0;
  const hydratedSettings = {
    ...baseSettings,
    ...userAuthorityRegistryIsEmpty ? {} : { userAuthorityRegistry },
    defaultAgentId: resolvedDefaultAgentId
  };
  return Object.keys(hydratedSettings).length > 0 ? hydratedSettings : null;
};
var buildSettingsPersistencePlan = ({
  userId,
  currentSettings,
  changes,
  previousDefaultAgentRecord
}) => {
  const normalizedChanges = normalizeSettingChanges(changes);
  const persistedChanges = stripRegisterBackedFieldsFromSettingsWrite(normalizedChanges);
  const previousDefaultAgentId = normalizeDefaultAgentIdSetting(currentSettings.defaultAgentId) ?? SYSTEM_DEFAULT_AGENT_ID;
  const nextDefaultAgentId = normalizeDefaultAgentIdSetting(normalizedChanges.defaultAgentId) ?? null;
  const previousDefaultAgentValue = readUserPreferenceRegisterValue(
    previousDefaultAgentRecord,
    USER_PREFERENCE_NAMES.DEFAULT_AGENT
  ) ?? null;
  const defaultAgentRegisterWrite = hasOwn(normalizedChanges, "defaultAgentId") && previousDefaultAgentId !== (nextDefaultAgentId ?? SYSTEM_DEFAULT_AGENT_ID) && (!previousDefaultAgentRecord || previousDefaultAgentValue !== nextDefaultAgentId) ? {
    customKey: createUserPreferenceKey.defaultAgent(userId),
    data: buildDefaultAgentPreferenceRegisterRecord({
      userId,
      defaultAgentId: nextDefaultAgentId,
      previousRecord: previousDefaultAgentRecord
    })
  } : null;
  const settingsPatch = Object.keys(persistedChanges).length > 0 ? {
    dbKey: createUserKey.settings(userId),
    changes: withSettingsRecordSchema(
      persistedChanges
    )
  } : null;
  return {
    normalizedChanges,
    defaultAgentRegisterWrite,
    settingsPatch
  };
};
var getCachedDefaultAgentRegisterRecord = (getState, registerKey) => {
  const record = getState().db.entities[registerKey];
  if (!record || typeof record !== "object") return null;
  return record;
};
var persistDefaultAgentRegister = async (dispatch, getState, userId, value) => {
  const registerKey = createUserPreferenceKey.defaultAgent(userId);
  let previousRecord = getCachedDefaultAgentRegisterRecord(getState, registerKey);
  if (!previousRecord) {
    previousRecord = await dispatch(
      getSettingDbActionThunks().readAndWait(registerKey)
    ).unwrap().catch(() => null);
  }
  const previousValue = readUserPreferenceRegisterValue(
    previousRecord,
    USER_PREFERENCE_NAMES.DEFAULT_AGENT
  ) ?? null;
  if (previousRecord && previousValue === value) {
    return;
  }
  await dispatch(
    getSettingDbActionThunks().write({
      customKey: registerKey,
      data: buildDefaultAgentPreferenceRegisterRecord({
        userId,
        defaultAgentId: value,
        previousRecord
      })
    })
  ).unwrap();
};

// packages/app/settings/serverSelectors.ts
var resolveDesktopSafeServer = (value) => {
  if (!getIsDesktopApp()) return value || SERVERS.MAIN;
  return isLocalServerUrl(value) ? SERVERS.MAIN : value || SERVERS.MAIN;
};
var selectSettings = (state3) => state3.settings;
var selectCurrentServer = createSelector(
  [selectSettings],
  (settings) => resolveDesktopSafeServer(settings.currentServer)
);
var selectSyncServers = createSelector(
  [selectSettings],
  (settings) => (settings.syncServers || []).filter(
    (server) => !getIsDesktopApp() || !isLocalServerUrl(server)
  )
);
var selectRemoteServer = selectCurrentServer;
var selectRemoteSyncServers = selectSyncServers;
var selectRemoteServers = createSelector(
  [selectRemoteServer, selectRemoteSyncServers],
  (currentServer, syncServers) => getAllServers(currentServer, syncServers)
);

// packages/core/positiveFiniteNumberOrFallback.ts
function parsePositiveFiniteNumberOrFallback(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// packages/app/settings/fieldSelectors.ts
var selectPreferredAnimationSet = (state3) => state3.settings.preferredAnimationSet ?? 0;
var selectShowThinking = (state3) => state3.settings.showThinking;
var selectMaxCost = (state3) => state3.settings.maxCost;
var selectMaxExecutionTime = (state3) => state3.settings.maxExecutionTime;
var selectIsDark = (state3) => state3.settings.isDark;
var selectThemeMode = (state3) => state3.settings.themeMode ?? "system";
var selectHeaderHeight = (state3) => state3.settings.headerHeight;
var selectThemeName = (state3) => state3.settings.themeName;
var selectThemeFollowsSystem = (state3) => (state3.settings.themeMode ?? "system") === "system";
var selectSidebarWidth = (state3) => state3.settings.sidebarWidth;
var selectDensity = (state3) => state3.settings.density ?? "compact";
var selectFontPreset = (state3) => normalizeFontPreset(state3.settings.fontPreset) ?? DEFAULT_FONT_PRESET;
var selectEnableReadCurrentSpace = (state3) => state3.settings.enableReadCurrentSpace;
var selectGlobalPrompt = (state3) => state3.settings.globalPrompt;
var selectUserTonePreset = (state3) => normalizeTonePresetSetting(state3.settings.userTonePreset);
var selectKnowledgeCaptureLevel = (state3) => normalizePolicyLevelSetting(
  state3.settings.knowledgeCaptureLevel,
  DEFAULT_USER_PREFERENCE_PROFILE.knowledgeCaptureLevel
);
var selectSpaceContextLevel = (state3) => state3.settings.enableReadCurrentSpace === false ? 1 : normalizePolicyLevelSetting(
  state3.settings.spaceContextLevel,
  DEFAULT_USER_PREFERENCE_PROFILE.spaceContextLevel
);
var selectAutoApproveSelfUpdateFields = createSelector(
  [(state3) => state3.settings.autoApproveSelfUpdateFields],
  (fields) => normalizeAgentUpdateFieldList(
    fields,
    DEFAULT_AUTO_APPROVED_SELF_UPDATE_FIELDS
  )
);
var selectAiRecentContentLimit = (state3) => state3.settings.aiRecentContentLimit ?? 50;
var selectDefaultAgentPreference = (state3) => resolveDefaultAgentIdSetting(state3.settings.defaultAgentId);
var selectDefaultAgentId = (state3) => selectResolvedDefaultAgentId(state3.settings.defaultAgentId);
var selectOcrModel = (state3) => {
  if (state3.settings.ocrModel === "none") return "none";
  if (state3.settings.ocrModel === "olm_ocr") return "olm_ocr";
  return "google_document_ocr";
};
var selectShowScrollToTopButton = (state3) => state3.settings.showScrollToTopButton ?? false;
var selectShowScrollToBottomButton = (state3) => state3.settings.showScrollToBottomButton ?? false;
var selectCreateMenuOpenCount = (state3) => Math.floor(
  parsePositiveFiniteNumberOrFallback(state3.settings.createMenuOpenCount, 0)
);
var selectDesktopChromeConnectorEnabled = (state3) => state3.settings.desktopChromeConnectorEnabled === true;
var selectDeveloperModeEnabled = (state3) => state3.settings.developerModeEnabled === true;
var selectDiagnosticModeEnabled = (state3) => state3.settings.diagnosticModeEnabled === true;
var selectCopyDiagnosticsEnabled = (state3) => selectDeveloperModeEnabled(state3) && selectDiagnosticModeEnabled(state3);
var selectEditorDefaultMode = (state3) => state3.settings.editorDefaultMode;
var selectEditorLightCodeTheme = (state3) => state3.settings.editorLightCodeTheme;
var selectEditorDarkCodeTheme = (state3) => state3.settings.editorDarkCodeTheme;
var selectEditorWordCountEnabled = (state3) => state3.settings.editorWordCountEnabled;
var selectEditorShortcuts = (state3) => state3.settings.editorShortcuts;
var PLATFORM_MAC_REGEX = /Mac|iPod|iPhone|iPad/;
var isMacPlatform = () => typeof window !== "undefined" && typeof window.navigator !== "undefined" && PLATFORM_MAC_REGEX.test(window.navigator.platform);
var selectDeleteShortcut = (state3) => {
  const shortcut = state3.settings.deleteShortcut;
  if (shortcut === void 0 || shortcut === null) {
    return isMacPlatform() ? "meta+backspace" : "ctrl+backspace";
  }
  return shortcut;
};
var selectEditorFontSize = (state3) => state3.settings.editorFontSize;
var selectEditorAutoSave = (state3) => state3.settings.editorAutoSave;
var selectEditorAutoSaveInterval = (state3) => state3.settings.editorAutoSaveInterval;
var selectSystemBuiltinSkills = createSelector(
  [(state3) => state3.settings.systemBuiltinSkills],
  (systemBuiltinSkills) => normalizeSystemBuiltinSkills(
    systemBuiltinSkills,
    DEFAULT_SYSTEM_BUILTIN_SKILLS
  )
);

// packages/app/settings/editorConfigSelectors.ts
var selectEditorCodeTheme = createSelector(
  [selectEditorLightCodeTheme, selectEditorDarkCodeTheme, selectIsDark],
  (lightTheme, darkTheme, isDark) => isDark ? darkTheme : lightTheme
);
var selectEditorConfig = createSelector(
  [
    selectEditorDefaultMode,
    selectEditorLightCodeTheme,
    selectEditorDarkCodeTheme,
    selectEditorWordCountEnabled,
    selectEditorShortcuts,
    selectEditorFontSize,
    selectEditorAutoSave,
    selectEditorAutoSaveInterval,
    selectIsDark
  ],
  (defaultMode, lightCodeTheme, darkCodeTheme, wordCountEnabled, shortcuts, fontSize, autoSave, autoSaveInterval, isDark) => {
    const codeTheme = isDark ? darkCodeTheme : lightCodeTheme;
    return {
      defaultMode,
      codeTheme,
      lightCodeTheme,
      darkCodeTheme,
      wordCountEnabled,
      shortcuts,
      fontSize,
      autoSave,
      autoSaveInterval
    };
  }
);

// packages/app/settings/themeSelectors.ts
var isThemeData = (value) => {
  if (!value || typeof value !== "object") return false;
  const candidate = value;
  return typeof candidate.light === "object" && candidate.light !== null && typeof candidate.dark === "object" && candidate.dark !== null;
};
var readMeta = (themeData) => themeData.meta;
var SPACIOUS_SPACE = {
  0: "0",
  1: "5px",
  2: "10px",
  3: "14px",
  4: "20px",
  5: "24px",
  6: "30px",
  7: "34px",
  8: "40px",
  10: "50px",
  12: "60px",
  14: "70px",
  16: "80px",
  20: "100px",
  24: "120px"
};
var SPACIOUS_FONT_SIZE = {
  xs: "12px",
  sm: "13px",
  base: "15px",
  md: "15.5px",
  lg: "17.5px",
  xl: "22px",
  "2xl": "26px",
  "3xl": "30px"
};
var SPACIOUS_LEADING = {
  tight: "1.4",
  normal: "1.6",
  relaxed: "1.75"
};
var SPACIOUS_CONTROL = {
  xs: "28px",
  sm: "32px",
  md: "40px",
  lg: "46px",
  xl: "56px"
};
var COMPACT_LEADING = {
  tight: "1.3",
  normal: "1.45",
  relaxed: "1.6"
};
var COMPACT_CONTROL = {
  xs: "24px",
  sm: "28px",
  md: "36px",
  lg: "40px",
  xl: "48px"
};
var COMPACT_FONT_SIZE = {
  xs: "11px",
  sm: "12px",
  base: "14px",
  md: "14px",
  lg: "16px",
  xl: "20px",
  "2xl": "24px",
  "3xl": "28px"
};
var FONT_WEIGHT = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700"
};
var TRACKING = {
  tight: "-0.02em",
  normal: "0",
  wide: "0.02em"
};
var Z_INDEX = {
  sticky: 100,
  dropdown: 1e3,
  modalBackdrop: 1010,
  modal: 1020,
  toast: 1030,
  tooltip: 1040
};
var FALLBACK_PRIMARY_RGB = "59, 130, 246";
var FALLBACK_SUCCESS_GHOST = "rgba(16, 185, 129, 0.12)";
var FALLBACK_WARNING_GHOST = "rgba(245, 158, 11, 0.12)";
var FALLBACK_INFO_GHOST = "rgba(59, 130, 246, 0.12)";
var FALLBACK_ERROR_GHOST = "rgba(239, 68, 68, 0.12)";
var FALLBACK_INVALID_BG = "rgba(239, 68, 68, 0.5)";
var DEFAULT_MOTION_EASE = "cubic-bezier(0.33, 0, 0.2, 1)";
var TIDE_MOTION_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
var BREATH_MOTION_EASE = "cubic-bezier(0.4, 0, 0.6, 1)";
var selectTheme = createSelector(
  [
    selectThemeName,
    selectIsDark,
    selectSidebarWidth,
    selectHeaderHeight,
    selectDensity,
    selectFontPreset
  ],
  (themeName, isDark, sidebarWidth, headerHeight, density, fontPreset) => {
    const mode = isDark ? "dark" : "light";
    const validThemeName = THEME_COLORS[themeName] ? themeName : DEFAULT_THEME_NAME;
    const validFontPreset = normalizeFontPreset(fontPreset) ?? DEFAULT_FONT_PRESET;
    const themeCandidate = THEME_COLORS[validThemeName];
    if (!isThemeData(themeCandidate)) {
      throw new Error(
        `selectTheme: theme "${String(validThemeName)}" is missing required light/dark tables`
      );
    }
    const themeData = themeCandidate;
    const c2 = themeData[mode];
    const meta = readMeta(themeData);
    const compact = density === "compact";
    return {
      sidebarWidth: `${sidebarWidth}px`,
      headerHeight: `${headerHeight}px`,
      // Sidebar list density is intentionally tighter than form `control-md`
      // (36/40): long agent/dialog lists need more rows on screen. Header chrome
      // and nav rows should bind to these tokens, not control-md.
      sidebarItemHeight: compact ? "32px" : "36px",
      sidebarIconSize: compact ? "16px" : "18px",
      sidebarItemGap: compact ? "4px" : "6px",
      // Density-aware spacing scale (4px grid → 5px grid)
      space: compact ? SPACE : SPACIOUS_SPACE,
      // Semantic typography scale
      fontSize: compact ? COMPACT_FONT_SIZE : SPACIOUS_FONT_SIZE,
      // Font weight scale
      fontWeight: FONT_WEIGHT,
      // Letter spacing scale
      tracking: TRACKING,
      // Semantic line-height scale
      leading: compact ? COMPACT_LEADING : SPACIOUS_LEADING,
      // Component height scale (buttons, inputs, list items)
      control: compact ? COMPACT_CONTROL : SPACIOUS_CONTROL,
      // Border radius scale — xs/sm/md map to control/surface/overlay tiers.
      // lg/xl remain as aliases for gradual migration of legacy CSS.
      radius: (() => {
        const boost = meta?.radiusBoost ?? 0;
        const xs = compact ? "10px" : "12px";
        const sm = compact ? `${14 + boost}px` : `${16 + boost}px`;
        const md = compact ? "20px" : "24px";
        return { xs, sm, md, lg: sm, xl: md };
      })(),
      motionEase: meta?.motionEase ?? DEFAULT_MOTION_EASE,
      motionEaseTide: TIDE_MOTION_EASE,
      motionEaseBreath: BREATH_MOTION_EASE,
      motionDuration: "0.32s",
      motionDurationSlow: "0.52s",
      // Popover/menu/dropdown shell — the single source of truth for every
      // floating panel. Consumers read --popover-* only; the radius tier is
      // encapsulated here so a retune stays a one-line change.
      popover: (() => {
        const boost = meta?.radiusBoost ?? 0;
        const radius = compact ? `${14 + boost}px` : `${16 + boost}px`;
        const pad = "6px";
        return {
          // 弹层是最上浮的层：light 下 background（雪白）亮于下沉面板 elevated；
          // dark 下相反，elevated 才是更亮的上浮面，必须取 brighter 的那个。
          bg: alphaColor(
            isDark ? c2.backgroundElevated ?? c2.background : c2.background,
            isDark ? 0.86 : 0.92,
            isDark ? c2.backgroundElevated ?? c2.background : c2.background
          ),
          border: alphaColor(c2.border, isDark ? 0.5 : 0.7, c2.borderLight),
          // Layered: a wide ambient pool plus a tight contact edge. The pair is
          // what reads as "lifted" rather than "outlined".
          shadow: [
            `0 18px 44px -24px ${c2.shadowHeavy}`,
            `0 4px 12px -6px ${c2.shadowMedium}`,
            `0 1px 1px -0.5px ${c2.shadowLight}`
          ].join(", "),
          radius,
          pad,
          itemRadius: `calc(${radius} - ${pad})`,
          blur: "24px",
          // Enter/exit travel. Small on purpose: the panel should settle, not fly.
          travel: "6px",
          duration: "0.18s",
          durationExit: "0.12s",
          ease: meta?.motionEase ?? DEFAULT_MOTION_EASE
        };
      })(),
      font: FONT_PRESET_CSS_VARIABLES[validFontPreset],
      // Z-index scale aligned with existing hardcoded layers
      z: Z_INDEX,
      // Semantic spacing aliases
      contentPadding: compact ? "16px" : "20px",
      sectionGap: compact ? "32px" : "40px",
      cardPadding: compact ? "16px" : "20px",
      inputPadding: compact ? "8px 12px" : "10px 14px",
      ...c2,
      borderSubtle: c2.borderLight,
      borderFaint: alphaColor(c2.border, isDark ? 0.22 : 0.35, c2.borderLight),
      borderStrong: c2.borderHover,
      surface: c2.backgroundSecondary,
      surfaceElevated: c2.backgroundTertiary,
      surfaceCanvas: c2.background,
      surfaceSidebar: c2.background,
      surfacePanel: c2.backgroundSecondary,
      surfaceCard: c2.messageBackground,
      surfaceRaised: isDark ? c2.backgroundTertiary : c2.backgroundSecondary,
      surfaceInset: isDark ? c2.backgroundSecondary : alphaColor(c2.borderHover, 0.05, c2.codeBackground),
      surfaceCode: c2.codeBackground,
      surfaceInteractive: c2.backgroundTertiary,
      surfaceInteractiveHover: c2.backgroundHover,
      textMuted: c2.textSecondary,
      textSubtle: c2.textTertiary,
      textHeading: c2.textHeading ?? c2.text,
      borderMuted: alphaColor(
        c2.borderHover,
        isDark ? 0.3 : 0.24,
        c2.borderLight
      ),
      accentSoft: alphaColor(c2.primary, isDark ? 0.18 : 0.1, c2.primaryGhost),
      shadow: c2.shadowMedium,
      shadow1: `0 1px 2px ${c2.shadowLight}`,
      shadow2: `0 8px 24px -12px ${c2.shadowMedium}`,
      shadow3: `0 18px 44px -24px ${c2.shadowHeavy}`,
      primaryBorder: c2.borderAccent ?? c2.primary,
      primaryBgStrong: alphaColor(
        c2.primary,
        isDark ? 0.18 : 0.1,
        c2.primaryGhost
      ),
      success: c2.success,
      warning: c2.warning,
      info: c2.info,
      successGhost: alphaColor(
        c2.success,
        isDark ? 0.2 : 0.12,
        FALLBACK_SUCCESS_GHOST
      ),
      warningGhost: alphaColor(
        c2.warning,
        isDark ? 0.2 : 0.12,
        FALLBACK_WARNING_GHOST
      ),
      infoGhost: alphaColor(c2.info, isDark ? 0.2 : 0.12, FALLBACK_INFO_GHOST),
      errorGhost: alphaColor(
        c2.error,
        isDark ? 0.2 : 0.12,
        FALLBACK_ERROR_GHOST
      ),
      primaryRgb: hexToRgbString(c2.primary) ?? FALLBACK_PRIMARY_RGB,
      focusRing: alphaColor(c2.primary, isDark ? 0.3 : 0.22, c2.primaryGhost),
      // Generic interactive state tokens (dark-mode aware)
      hoverBg: alphaColor(c2.text, isDark ? 0.06 : 0.04, c2.backgroundTertiary),
      activeBg: alphaColor(c2.text, isDark ? 0.1 : 0.08, c2.backgroundTertiary),
      disabledText: c2.textTertiary,
      disabledBg: c2.backgroundSecondary,
      // Code block tokens
      codeBg: c2.codeBackground,
      codeText: c2.text,
      // Text selection token
      selectionBg: alphaColor(c2.primary, isDark ? 0.2 : 0.15, c2.primaryGhost),
      // ── --focus 全局 token(消除 ~30 处内联 fallback)──────────
      focus: alphaColor(c2.primary, isDark ? 0.3 : 0.22, c2.primaryGhost),
      // ── RAC 别名层(让 RAC 组件自动获得项目主题色)──────────
      focusRingColor: c2.primary,
      invalidColor: c2.error,
      buttonBackground: alphaColor(
        c2.primary,
        isDark ? 0.12 : 0.08,
        c2.primaryGhost
      ),
      buttonBackgroundPressed: alphaColor(
        c2.primary,
        isDark ? 0.18 : 0.12,
        c2.primaryGhost
      ),
      highlightBackground: c2.primary,
      highlightForeground: c2.textOnPrimary,
      highlightBackgroundPressed: c2.primary,
      highlightOverlay: alphaColor(
        c2.primary,
        isDark ? 0.15 : 0.1,
        c2.primaryGhost
      ),
      highlightBackgroundInvalid: alphaColor(
        c2.error,
        isDark ? 0.55 : 0.5,
        FALLBACK_INVALID_BG
      ),
      fieldBackground: c2.backgroundSecondary,
      fieldTextColor: c2.text,
      linkColor: c2.primary,
      linkColorSecondary: c2.text,
      linkColorPressed: c2.primaryDark,
      borderColorDisabled: c2.borderLight
    };
  }
);

// packages/app/settings/settingActions.ts
var updateSettingsState = createAction(
  "settings/_updateSettingsState"
);

// packages/app/settings/settingThunks.ts
var getSettings = createAsyncThunk("settings/getSettings", async (_, { dispatch, getState }) => {
  const userId = selectIdentityUserId(getState());
  if (!userId) return null;
  const settingsKey = createUserKey.settings(userId);
  const authorityHomeKey = createUserPreferenceKey.authorityHome(userId);
  const [settingsRecord, authorityHomeRecord] = await Promise.all([
    dispatch(getSettingDbActionThunks().readAndWait(settingsKey)).unwrap().catch(() => null),
    dispatch(getSettingDbActionThunks().readAndWait(authorityHomeKey)).unwrap().catch(() => null)
  ]);
  const authorityHomeServer = readUserPreferenceRegisterValue(
    authorityHomeRecord,
    USER_PREFERENCE_NAMES.AUTHORITY_HOME
  ) ?? null;
  const hydrated = hydrateStoredSettings({
    userId,
    settingsRecord,
    authorityHomeServer
  });
  if (hydrated) {
    const normalizedPayload = normalizeSettingChanges(
      hydrated
    );
    const { currentServer: _ignored, ...settingsToApply } = normalizedPayload;
    dispatch(updateSettingsState(settingsToApply));
  }
  return hydrated;
});
var setSettings = createAsyncThunk("settings/setSettings", async (changes, { dispatch, getState }) => {
  const currentSettings = getState().settings;
  const normalizedChanges = normalizeSettingChanges(changes);
  const previousDefaultAgentId = normalizeDefaultAgentIdSetting(currentSettings.defaultAgentId) ?? SYSTEM_DEFAULT_AGENT_ID;
  const userId = selectIdentityUserId(getState());
  if (!userId) {
    const hasAppearanceChanges = Object.keys(normalizedChanges).length > 0;
    if (hasAppearanceChanges) {
      if (!isLocalFirstAppearanceChange(normalizedChanges)) {
        throw new Error("User not found for persisting settings.");
      }
    } else {
      throw new Error("User not found for persisting settings.");
    }
    dispatch(updateSettingsState(normalizedChanges));
    return normalizedChanges;
  }
  const persistencePlan = buildSettingsPersistencePlan({
    userId,
    currentSettings,
    changes: normalizedChanges,
    previousDefaultAgentRecord: null
  });
  dispatch(updateSettingsState(persistencePlan.normalizedChanges));
  const nextDefaultAgentId = normalizeDefaultAgentIdSetting(
    persistencePlan.normalizedChanges.defaultAgentId
  ) ?? null;
  if (hasOwn(changes, "defaultAgentId") && previousDefaultAgentId !== (nextDefaultAgentId ?? SYSTEM_DEFAULT_AGENT_ID)) {
    await persistDefaultAgentRegister(
      dispatch,
      getState,
      userId,
      nextDefaultAgentId
    );
  }
  if (persistencePlan.settingsPatch) {
    await dispatch(
      getSettingDbActionThunks().upsert({
        dbKey: persistencePlan.settingsPatch.dbKey,
        data: persistencePlan.settingsPatch.changes
      })
    ).unwrap();
  }
  return persistencePlan.normalizedChanges;
});
var changeTheme = createAsyncThunk(
  "settings/changeTheme",
  async (themeName, { dispatch }) => dispatch(setSettings({ themeName })).unwrap()
);
var changeDensity = createAsyncThunk(
  "settings/changeDensity",
  async (density, { dispatch }) => dispatch(setSettings({ density })).unwrap()
);
var changeFontPreset = createAsyncThunk(
  "settings/changeFontPreset",
  async (fontPreset, { dispatch }) => {
    const normalized = normalizeFontPreset(fontPreset) ?? fontPreset;
    return dispatch(setSettings({ fontPreset: normalized })).unwrap();
  }
);
var changeDarkMode = createAsyncThunk(
  "settings/changeDarkMode",
  async (isDark, { dispatch }) => dispatch(
    setSettings({ isDark, themeMode: isDark ? "dark" : "light" })
  ).unwrap()
);
var toggleShowThinking = createAsyncThunk(
  "settings/toggleShowThinking",
  async (_, { dispatch, getState }) => {
    const currentShowThinking = getState().settings.showThinking;
    return dispatch(
      setSettings({ showThinking: !currentShowThinking })
    ).unwrap();
  }
);
var setThemeFollowsSystem = createAsyncThunk(
  "settings/setThemeFollowsSystem",
  async (follows, { dispatch }) => dispatch(setSettings({ themeMode: follows ? "system" : "light" })).unwrap()
);
var setSidebarWidth = createAsyncThunk(
  "settings/setSidebarWidth",
  async (sidebarWidth, { dispatch }) => dispatch(setSettings({ sidebarWidth })).unwrap()
);
var toggleEnableReadCurrentSpace = createAsyncThunk(
  "settings/toggleEnableReadCurrentSpace",
  async (_, { dispatch, getState }) => {
    const current2 = getState().settings.enableReadCurrentSpace;
    return dispatch(
      setSettings({
        enableReadCurrentSpace: !current2,
        spaceContextLevel: current2 ? 1 : DEFAULT_USER_PREFERENCE_PROFILE.spaceContextLevel
      })
    ).unwrap();
  }
);
var setEditorDefaultMode = createAsyncThunk(
  "settings/setEditorDefaultMode",
  async (mode, { dispatch }) => dispatch(setSettings({ editorDefaultMode: mode })).unwrap()
);
var setEditorLightCodeTheme = createAsyncThunk(
  "settings/setEditorLightCodeTheme",
  async (theme, { dispatch }) => dispatch(setSettings({ editorLightCodeTheme: theme })).unwrap()
);
var setEditorDarkCodeTheme = createAsyncThunk(
  "settings/setEditorDarkCodeTheme",
  async (theme, { dispatch }) => dispatch(setSettings({ editorDarkCodeTheme: theme })).unwrap()
);
var setEditorCodeTheme = createAsyncThunk(
  "settings/setEditorCodeTheme",
  async (theme, { dispatch }) => dispatch(
    setSettings({
      editorLightCodeTheme: theme,
      editorDarkCodeTheme: theme
    })
  ).unwrap()
);
var toggleEditorWordCount = createAsyncThunk(
  "settings/toggleEditorWordCount",
  async (_, { dispatch, getState }) => {
    const current2 = getState().settings.editorWordCountEnabled;
    return dispatch(setSettings({ editorWordCountEnabled: !current2 })).unwrap();
  }
);
var toggleEditorShortcut = createAsyncThunk(
  "settings/toggleEditorShortcut",
  async (key, { dispatch, getState }) => {
    const currentShortcuts = getState().settings.editorShortcuts;
    const newShortcuts = {
      ...currentShortcuts,
      [key]: !currentShortcuts[key]
    };
    return dispatch(setSettings({ editorShortcuts: newShortcuts })).unwrap();
  }
);
var setEditorFontSize = createAsyncThunk(
  "settings/setEditorFontSize",
  async (fontSize, { dispatch }) => dispatch(setSettings({ editorFontSize: fontSize })).unwrap()
);
var toggleEditorAutoSave = createAsyncThunk(
  "settings/toggleEditorAutoSave",
  async (_, { dispatch, getState }) => {
    const current2 = getState().settings.editorAutoSave;
    return dispatch(setSettings({ editorAutoSave: !current2 })).unwrap();
  }
);
var setEditorAutoSaveInterval = createAsyncThunk(
  "settings/setEditorAutoSaveInterval",
  async (interval, { dispatch }) => dispatch(setSettings({ editorAutoSaveInterval: interval })).unwrap()
);
var setGlobalPrompt = createAsyncThunk(
  "settings/setGlobalPrompt",
  async (prompt, { dispatch }) => dispatch(setSettings({ globalPrompt: prompt })).unwrap()
);
var setUserTonePreset = createAsyncThunk(
  "settings/setUserTonePreset",
  async (tone, { dispatch }) => dispatch(setSettings({ userTonePreset: tone })).unwrap()
);
var setKnowledgeCaptureLevel = createAsyncThunk(
  "settings/setKnowledgeCaptureLevel",
  async (level, { dispatch }) => dispatch(setSettings({ knowledgeCaptureLevel: level })).unwrap()
);
var setSpaceContextLevel = createAsyncThunk(
  "settings/setSpaceContextLevel",
  async (level, { dispatch }) => dispatch(
    setSettings({
      spaceContextLevel: level,
      enableReadCurrentSpace: level > 1
    })
  ).unwrap()
);
var setAiRecentContentLimit = createAsyncThunk(
  "settings/setAiRecentContentLimit",
  async (limit, { dispatch }) => dispatch(setSettings({ aiRecentContentLimit: limit })).unwrap()
);
var setMaxExecutionTime = createAsyncThunk(
  "settings/setMaxExecutionTime",
  async (time, { dispatch }) => dispatch(setSettings({ maxExecutionTime: time })).unwrap()
);
var setDefaultAgentId = createAsyncThunk(
  "settings/setDefaultAgentId",
  async (agentId, { dispatch }) => dispatch(
    setSettings({
      defaultAgentId: resolveDefaultAgentIdSetting(agentId)
    })
  ).unwrap()
);
var setThemeMode = createAsyncThunk(
  "settings/setThemeMode",
  async (mode, { dispatch }) => {
    const changes = { themeMode: mode };
    const systemPrefersDark = typeof window !== "undefined" && window.matchMedia(SYSTEM_DARK_MEDIA_QUERY).matches;
    changes.isDark = resolveThemeModeIsDark(mode, systemPrefersDark);
    return dispatch(setSettings(changes)).unwrap();
  }
);

// packages/app/settings/settingSlice.tsx
var createSliceWithThunks2 = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator }
});
var settingSlice = createSliceWithThunks2({
  name: "settings",
  initialState,
  reducers: {
    _updateSettingsState: (state3, action2) => {
      Object.assign(state3, normalizeSettingChanges(action2.payload));
    },
    addHostToCurrentServer: (state3, action2) => {
      const rawValue = action2.payload;
      if (typeof rawValue !== "string" || rawValue.trim() === "") return;
      const trimmed = rawValue.trim();
      if (/^https?:\/\//i.test(trimmed)) {
        try {
          state3.currentServer = new URL(trimmed).origin;
          return;
        } catch {
          return;
        }
      }
      const host = trimmed.replace(/^\/+|\/+$/g, "");
      const [hostname] = host.split(":");
      if (!hostname) return;
      const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
      const isLocal = ["nolotus.local", "localhost"].includes(hostname) || isIpAddress;
      const protocol = isLocal ? "http" : "https";
      state3.currentServer = `${protocol}://${host}`;
    }
  }
});
var { addHostToCurrentServer } = settingSlice.actions;
var settingSlice_default = settingSlice.reducer;

// packages/create/space/constants.ts
var UNCATEGORIZED_ID = "__uncategorized_container__";

// packages/create/space/utils/permissions.ts
var checkSpaceMembership = (spaceData, userId) => {
  if (!spaceData) {
    console.error("[Permission Check] Space data is missing.");
    throw new Error("\u65E0\u6CD5\u6267\u884C\u6743\u9650\u68C0\u67E5\uFF1A\u7A7A\u95F4\u6570\u636E\u7F3A\u5931\u3002");
  }
  if (isDeviceLocalSpaceBody(spaceData)) {
    return;
  }
  if (!userId) {
    console.error("[Permission Check] User ID is missing.");
    throw new Error("\u65E0\u6CD5\u6267\u884C\u6743\u9650\u68C0\u67E5\uFF1A\u7528\u6237 ID \u7F3A\u5931\u3002");
  }
  if (!spaceData.members || !Array.isArray(spaceData.members) || !spaceData.members.includes(userId)) {
    console.warn(
      `[Permission Check] User ${userId} attempt to operate on space ${spaceData.id} without membership.`
    );
    throw new Error("\u5F53\u524D\u7528\u6237\u4E0D\u662F\u7A7A\u95F4\u6210\u5458");
  }
};
var localSpaceAuthorityPatchStamp = (spaceData) => isDeviceLocalSpaceBody(spaceData) ? { userId: DEVICE_LOCAL_OWNER_ID } : {};

// packages/create/space/spaceCollapsedState.ts
var SPACE_COLLAPSE_STORAGE_PREFIX = "space-collapsed-categories:";
var normalizeCollapsedCategories = (value) => {
  const entries = Object.entries(asRecordOrEmpty(value)).filter(
    ([key, collapsed]) => typeof key === "string" && typeof collapsed === "boolean"
  );
  return Object.fromEntries(entries);
};
var storageKeyForSpace = (spaceId) => `${SPACE_COLLAPSE_STORAGE_PREFIX}${spaceId}`;
var readStoredCollapsedCategories = (spaceId, storage) => {
  if (!spaceId || !storage) return {};
  try {
    const raw = storage.getItem(storageKeyForSpace(spaceId));
    if (!raw) return { [UNCATEGORIZED_ID]: false };
    return normalizeCollapsedCategories(JSON.parse(raw));
  } catch (error) {
    console.warn("[Space] \u8BFB\u53D6\u5206\u7C7B\u6298\u53E0\u72B6\u6001\u5931\u8D25:", error);
    return {};
  }
};
var writeStoredCollapsedCategories = (spaceId, collapsedCategories, storage) => {
  if (!spaceId || !storage) return;
  try {
    storage.setItem(
      storageKeyForSpace(spaceId),
      JSON.stringify(normalizeCollapsedCategories(collapsedCategories))
    );
  } catch (error) {
    console.warn("[Space] \u4FDD\u5B58\u5206\u7C7B\u6298\u53E0\u72B6\u6001\u5931\u8D25:", error);
  }
};

// packages/create/space/category/categoryActions.ts
var createCategoryActions = (create) => ({
  // --- Regular Reducers ---
  /**
   * (新增) 从持久化存储中水合分类的折叠状态
   */
  hydrateCollapsedCategories: create.reducer(
    (state3, action2) => {
      state3.collapsedCategories = normalizeCollapsedCategories(action2.payload);
    }
  ),
  // --- Async Thunks ---
  /**
   * 批量切换所有分类的折叠状态，并持久化到本地
   */
  setAllCategoriesCollapsed: create.asyncThunk(
    async (input, thunkAPI) => {
      const { getState } = thunkAPI;
      const rootState = getState();
      const spaceId = input.spaceId || selectCurrentSpaceId(rootState);
      if (!spaceId) throw new Error("\u65E0\u6CD5\u5207\u6362\u6298\u53E0\u72B6\u6001\uFF1A\u6CA1\u6709\u6D3B\u52A8\u7684\u7A7A\u95F4\u3002");
      const { currentSpace } = rootState.space;
      const categoryIds = currentSpace?.categories ? Object.keys(currentSpace.categories) : [];
      categoryIds.push(UNCATEGORIZED_ID);
      const collapsedCategories = {};
      categoryIds.forEach((id) => {
        collapsedCategories[id] = input.collapsed;
      });
      if (typeof window !== "undefined") {
        writeStoredCollapsedCategories(
          spaceId,
          collapsedCategories,
          window.localStorage
        );
      }
      return collapsedCategories;
    },
    {
      fulfilled: (state3, action2) => {
        state3.collapsedCategories = {
          ...state3.collapsedCategories,
          ...action2.payload
        };
      },
      rejected: (state3, action2) => {
        console.error("\u6279\u91CF\u5207\u6362\u5206\u7C7B\u6298\u53E0\u72B6\u6001\u5931\u8D25:", action2.error.message);
      }
    }
  ),
  /**
   * 切换单个分类的折叠状态，并持久化存储。
   * 直接使用当前激活的 spaceId，无需外部传入。
   */
  toggleCategoryCollapse: create.asyncThunk(
    async (input, thunkAPI) => {
      const { getState } = thunkAPI;
      const { categoryId } = input;
      const rootState = getState();
      const spaceId = selectCurrentSpaceId(rootState);
      if (!spaceId) throw new Error("\u65E0\u6CD5\u5207\u6362\u6298\u53E0\u72B6\u6001\uFF1A\u6CA1\u6709\u6D3B\u52A8\u7684\u7A7A\u95F4\u3002");
      if (!categoryId) throw new Error("\u65E0\u6548\u7684\u5206\u7C7BID\u3002");
      const defaultCollapsed = DEFAULT_COLLAPSED_CATEGORIES[categoryId] ?? true;
      const isCurrentlyCollapsed = rootState.space.collapsedCategories[categoryId] ?? defaultCollapsed;
      const newCollapsedState = !isCurrentlyCollapsed;
      const collapsedCategories = {
        ...rootState.space.collapsedCategories,
        [categoryId]: newCollapsedState
      };
      if (typeof window !== "undefined") {
        writeStoredCollapsedCategories(
          spaceId,
          collapsedCategories,
          window.localStorage
        );
      }
      return collapsedCategories;
    },
    {
      fulfilled: (state3, action2) => {
        state3.collapsedCategories = {
          ...state3.collapsedCategories,
          ...action2.payload
        };
      },
      rejected: (state3, action2) => {
        console.error("\u5207\u6362\u5206\u7C7B\u6298\u53E0\u72B6\u6001\u5931\u8D25:", action2.error.message);
      }
    }
  ),
  /**
   * 添加新分类
   */
  addCategory: create.asyncThunk(
    async (input, thunkAPI) => {
      const { spaceId: inputSpaceId, name, categoryId, order } = input;
      const { dispatch, getState } = thunkAPI;
      const rootState = getState();
      const spaceId = inputSpaceId || selectCurrentSpaceId(rootState);
      if (!spaceId) {
        throw new Error("\u65E0\u6CD5\u6DFB\u52A0\u5206\u7C7B\uFF1A\u672A\u9009\u62E9\u5F53\u524D\u7A7A\u95F4\u4E14\u672A\u63D0\u4F9B\u7A7A\u95F4 ID\u3002");
      }
      const currentUserId = selectIdentityUserId(rootState);
      if (!currentUserId) throw new Error("User is not logged in.");
      if (!name.trim()) {
        throw new Error("\u65E0\u6548\u7684\u5206\u7C7B\u540D\u79F0\u3002");
      }
      const spaceKey = createSpaceKey.space(spaceId);
      const spaceData = await dispatch(read({
        dbKey: spaceKey
      })).unwrap();
      checkSpaceMembership(spaceData, currentUserId);
      const newCategoryId = categoryId || ulid();
      if (spaceData.categories?.[newCategoryId]) {
        throw new Error(`\u5206\u7C7B ID "${newCategoryId}" \u5DF2\u5B58\u5728\u3002`);
      }
      const existingValidCategories = spaceData.categories ? Object.values(spaceData.categories).filter(Boolean) : [];
      const finalOrder = typeof order === "number" ? order : existingValidCategories.length;
      const nowISO = (/* @__PURE__ */ new Date()).toISOString();
      const newCategory = {
        name: name.trim(),
        order: finalOrder,
        updatedAt: nowISO
      };
      const updatedSpaceData = await dispatch(
        patch({
          dbKey: spaceKey,
          changes: {
            categories: { [newCategoryId]: newCategory },
            updatedAt: nowISO
          }
        })
      ).unwrap();
      const collapsedCategories = {
        ...rootState.space.collapsedCategories,
        [newCategoryId]: false
      };
      if (typeof window !== "undefined") {
        writeStoredCollapsedCategories(
          spaceId,
          collapsedCategories,
          window.localStorage
        );
      }
      return { spaceId, updatedSpaceData, newCategoryId, collapsedCategories };
    },
    {
      fulfilled: (state3, action2) => {
        if (state3.currentSpaceId === action2.payload.spaceId) {
          state3.currentSpace = action2.payload.updatedSpaceData;
          if (action2.payload.collapsedCategories) {
            state3.collapsedCategories = {
              ...state3.collapsedCategories,
              ...action2.payload.collapsedCategories
            };
          } else if (action2.payload.newCategoryId) {
            state3.collapsedCategories[action2.payload.newCategoryId] = false;
          }
        }
      }
    }
  ),
  /**
    * 删除单个分类
    */
  deleteCategory: create.asyncThunk(
    async (input, thunkAPI) => {
      const { categoryId, spaceId } = input;
      const { dispatch, getState } = thunkAPI;
      const rootState = getState();
      const currentUserId = selectIdentityUserId(rootState);
      if (!currentUserId) throw new Error("User is not logged in.");
      if (!categoryId.trim()) throw new Error("\u65E0\u6548\u7684 categoryId\u3002");
      const spaceKey = createSpaceKey.space(spaceId);
      const spaceData = await dispatch(read({
        dbKey: spaceKey
      })).unwrap();
      checkSpaceMembership(spaceData, currentUserId);
      if (!spaceData?.categories?.[categoryId]) {
        throw new Error("\u6307\u5B9A\u7684\u5206\u7C7B\u4E0D\u5B58\u5728\u6216\u5DF2\u88AB\u5220\u9664\u3002");
      }
      const nowISO = (/* @__PURE__ */ new Date()).toISOString();
      const changes = {
        categories: { [categoryId]: null },
        updatedAt: nowISO
      };
      if (spaceData.contents) {
        const contentsPatch = {};
        let contentsChanged = false;
        for (const key in spaceData.contents) {
          if (spaceData.contents[key]?.categoryId === categoryId) {
            contentsPatch[key] = {
              categoryId: null,
              updatedAt: nowISO
            };
            contentsChanged = true;
          }
        }
        if (contentsChanged) changes.contents = contentsPatch;
      }
      const updatedSpaceData = await dispatch(
        patch({ dbKey: spaceKey, changes })
      ).unwrap();
      const collapsedCategories = { ...rootState.space.collapsedCategories };
      delete collapsedCategories[categoryId];
      if (typeof window !== "undefined") {
        writeStoredCollapsedCategories(
          spaceId,
          collapsedCategories,
          window.localStorage
        );
      }
      return { spaceId, updatedSpaceData, collapsedCategories };
    },
    {
      fulfilled: (state3, action2) => {
        if (state3.currentSpaceId === action2.payload.spaceId) {
          state3.currentSpace = action2.payload.updatedSpaceData;
          state3.collapsedCategories = action2.payload.collapsedCategories;
        }
      }
    }
  ),
  /**
   * 修改分类名称
   */
  updateCategoryName: create.asyncThunk(
    async (input, thunkAPI) => {
      const { spaceId, categoryId, name } = input;
      const { dispatch, getState } = thunkAPI;
      const currentUserId = selectIdentityUserId(getState());
      if (!currentUserId) throw new Error("User is not logged in.");
      if (!categoryId.trim()) throw new Error("\u65E0\u6548\u7684 categoryId\u3002");
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("\u5206\u7C7B\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A\u6216\u4EC5\u5305\u542B\u7A7A\u683C\u3002");
      const spaceKey = createSpaceKey.space(spaceId);
      const spaceData = await dispatch(read({
        dbKey: spaceKey
      })).unwrap();
      checkSpaceMembership(spaceData, currentUserId);
      const existingCategory = spaceData.categories?.[categoryId];
      if (!existingCategory) {
        throw new Error("\u6307\u5B9A\u7684\u5206\u7C7B\u4E0D\u5B58\u5728\u3002");
      }
      const nowISO = (/* @__PURE__ */ new Date()).toISOString();
      const changes = {
        categories: {
          [categoryId]: {
            ...existingCategory,
            name: trimmedName,
            updatedAt: nowISO
          }
        },
        updatedAt: nowISO
      };
      const updatedSpaceData = await dispatch(
        patch({ dbKey: spaceKey, changes })
      ).unwrap();
      return { spaceId, updatedSpaceData };
    },
    {
      fulfilled: (state3, action2) => {
        if (state3.currentSpaceId === action2.payload.spaceId) {
          state3.currentSpace = action2.payload.updatedSpaceData;
        }
      }
    }
  ),
  /**
   * 重新排序分类
   */
  reorderCategories: create.asyncThunk(
    async (input, thunkAPI) => {
      const { spaceId, sortedCategoryIds } = input;
      const { dispatch, getState } = thunkAPI;
      const stateRoot = getState();
      const currentUserId = selectIdentityUserId(stateRoot);
      if (!currentUserId) {
        throw new Error("User is not logged in.");
      }
      if (!Array.isArray(sortedCategoryIds)) {
        throw new Error(
          "Invalid sortedCategoryIds provided: must be an array."
        );
      }
      const spaceKey = createSpaceKey.space(spaceId);
      const spaceData = await dispatch(read({
        dbKey: spaceKey
      })).unwrap();
      checkSpaceMembership(spaceData, currentUserId);
      if (!spaceData.categories || Object.keys(spaceData.categories).length === 0) {
        return { spaceId, updatedSpaceData: spaceData };
      }
      const nowISO = (/* @__PURE__ */ new Date()).toISOString();
      const currentCategories = spaceData.categories;
      const updatedCategoriesChanges = {};
      let hasValidChanges = false;
      sortedCategoryIds.forEach((catId, index) => {
        const existingCategory = currentCategories[catId];
        if (existingCategory) {
          updatedCategoriesChanges[catId] = {
            ...existingCategory,
            order: index,
            updatedAt: nowISO
          };
          if (existingCategory.order !== index) {
            hasValidChanges = true;
          }
        }
      });
      if (!hasValidChanges) {
        return { spaceId, updatedSpaceData: spaceData };
      }
      const changes = {
        categories: updatedCategoriesChanges,
        updatedAt: nowISO
      };
      const updatedSpaceData = await dispatch(
        patch({ dbKey: spaceKey, changes })
      ).unwrap();
      return { spaceId, updatedSpaceData };
    },
    {
      fulfilled: (state3, action2) => {
        if (state3.currentSpaceId === action2.payload.spaceId) {
          state3.currentSpace = action2.payload.updatedSpaceData;
        }
      }
    }
  )
});

// packages/render/web/ui/Toast.tsx
var import_react = __toESM(require_react(), 1);
var import_react_dom = __toESM(require_react_dom(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var TYPE_ICONS = {
  success: LuCircleCheck,
  error: LuCircleAlert,
  loading: LuLoaderCircle
};
var EXIT_MS = 320;
var ToastStore = class {
  constructor() {
    __publicField(this, "toasts", []);
    __publicField(this, "listeners", /* @__PURE__ */ new Set());
    __publicField(this, "nextId", 0);
    __publicField(this, "subscribe", (listener2) => {
      this.listeners.add(listener2);
      return () => this.listeners.delete(listener2);
    });
    __publicField(this, "getSnapshot", () => this.toasts);
    __publicField(this, "notify", () => {
      this.listeners.forEach((fn) => fn());
    });
  }
  add(item) {
    const id = item.id ?? `toast-${++this.nextId}`;
    const filtered = this.toasts.filter((t2) => t2.id !== id);
    const entry = { ...item, id, phase: "entering" };
    this.toasts = [...filtered, entry];
    this.notify();
    requestAnimationFrame(
      () => requestAnimationFrame(() => {
        this.toasts = this.toasts.map(
          (t2) => t2.id === id ? { ...t2, phase: "visible" } : t2
        );
        this.notify();
      })
    );
    if (item.timeout && item.timeout > 0) {
      setTimeout(() => this.close(id), item.timeout);
    }
    return id;
  }
  close(id) {
    if (id) {
      if (!this.toasts.some((t2) => t2.id === id)) return;
      this.toasts = this.toasts.map(
        (t2) => t2.id === id ? { ...t2, phase: "exiting" } : t2
      );
    } else {
      this.toasts = this.toasts.map((t2) => ({ ...t2, phase: "exiting" }));
    }
    this.notify();
    setTimeout(() => {
      this.toasts = id ? this.toasts.filter((t2) => t2.id !== id) : [];
      this.notify();
    }, EXIT_MS);
  }
};
var toastManager = new ToastStore();
function ToastItem({ toast: toast2 }) {
  const type = toast2.type;
  const TypeIcon = type ? TYPE_ICONS[type] : void 0;
  const icon = toast2.icon;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      className: "toast-root",
      "data-starting-style": toast2.phase === "entering" ? "" : void 0,
      "data-ending-style": toast2.phase === "exiting" ? "" : void 0,
      "data-type": type,
      "data-positioned": toast2.position ? "" : void 0,
      style: toast2.position ? { position: "fixed", left: `${toast2.position.x}px`, top: `${toast2.position.y}px` } : void 0,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "toast-content", children: [
          icon ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "toast-icon", "aria-hidden": "true", children: icon }) : TypeIcon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            TypeIcon,
            {
              className: `toast-icon${type ? ` ${type}` : ""}`,
              "aria-hidden": "true"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "toast-text-wrapper", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "toast-title", children: toast2.title }),
            toast2.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "toast-description", children: toast2.description }),
            toast2.action && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: "toast-action",
                disabled: toast2.phase === "exiting",
                onClick: () => {
                  if (toast2.phase === "exiting") return;
                  toastManager.close(toast2.id);
                  toast2.action.onClick();
                },
                children: toast2.action.label
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "toast-close",
            "aria-label": "Close",
            onClick: () => toastManager.close(toast2.id),
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuX, { size: 16, "aria-hidden": "true" })
          }
        )
      ]
    }
  );
}
function ToastList() {
  const toasts = (0, import_react.useSyncExternalStore)(
    (cb) => toastManager.subscribe(cb),
    () => toastManager.getSnapshot(),
    // getServerSnapshot：缺了会在 hydration 期抛 "Missing getServerSnapshot"。
    () => toastManager.getSnapshot()
  );
  return toasts.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToastItem, { toast: item }, item.id));
}
function MyToastRegion() {
  const [mounted, setMounted] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return (0, import_react_dom.createPortal)(
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "toast-viewport", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToastList, {}) }),
    document.body
  );
}

// packages/app/utils/toast.ts
var DEFAULT_TIMEOUT = 4e3;
function add(message, type, options) {
  const timeout = options?.timeout ?? options?.duration;
  return toastManager.add({
    id: options?.id,
    title: message,
    type,
    icon: options?.icon,
    description: options?.description,
    action: options?.action,
    position: options?.position,
    // loading toasts stay until explicitly replaced/closed (timeout=0)
    timeout: type === "loading" ? timeout ?? 0 : timeout ?? DEFAULT_TIMEOUT
  });
}
var toast = Object.assign(
  (message, options) => add(message, "default", options),
  {
    success: (message, options) => add(message, "success", options),
    error: (message, options) => add(message, "error", options),
    loading: (message, options) => add(message, "loading", options),
    dismiss: (id) => toastManager.close(id)
  }
);

// packages/create/space/content/addContentAction.ts
var addContentAction = async (input, thunkAPI) => {
  const {
    spaceId,
    title,
    type,
    contentKey,
    fileCategory,
    mimeType,
    fileSize,
    originalName,
    categoryId: rawCategoryId,
    pinned = false,
    order,
    triggerType,
    skillSummary
  } = input;
  const { dispatch, getState } = thunkAPI;
  const userId = selectIdentityUserId(getState());
  if (!contentKey || typeof contentKey !== "string" || contentKey.trim() === "")
    throw new Error("Invalid contentKey provided.");
  if (!title || typeof title !== "string" || title.trim() === "")
    throw new Error("Invalid or empty title provided.");
  if (!type || typeof type !== "string")
    throw new Error("Invalid content type provided.");
  const spaceKey = createSpaceKey.space(spaceId);
  const spaceData = await dispatch(read({
    dbKey: spaceKey
  })).unwrap();
  checkSpaceMembership(spaceData, userId);
  if (spaceData.contents && spaceData.contents[contentKey]) {
    throw new Error(`\u5185\u5BB9\u952E "${contentKey}" \u5DF2\u5B58\u5728\u3002`);
  }
  let categoryIdForStorage;
  if (rawCategoryId && rawCategoryId !== "" && rawCategoryId !== UNCATEGORIZED_ID) {
    if (spaceData.categories?.[rawCategoryId]) {
      categoryIdForStorage = rawCategoryId;
    }
  }
  const now = Date.now();
  const newSpaceContent = {
    title: title.trim(),
    type,
    contentKey,
    ...fileCategory !== void 0 ? { fileCategory } : {},
    ...mimeType !== void 0 ? { mimeType } : {},
    ...fileSize !== void 0 ? { fileSize } : {},
    ...originalName !== void 0 ? { originalName } : {},
    ...categoryIdForStorage !== void 0 && {
      categoryId: categoryIdForStorage
    },
    pinned,
    createdAt: now,
    updatedAt: now,
    ...order !== void 0 && typeof order === "number" && { order },
    ...triggerType !== void 0 && { triggerType },
    ...skillSummary !== void 0 ? { skillSummary } : {}
  };
  const changes = {
    contents: { [contentKey]: newSpaceContent },
    updatedAt: now,
    ...localSpaceAuthorityPatchStamp(spaceData)
  };
  const updatedSpaceData = await dispatch(
    patch({ dbKey: spaceKey, changes })
  ).unwrap();
  return { spaceId, updatedSpaceData };
};

// packages/chat/dialog/actions/addReferenceKeysAction.ts
var extractReferenceKeys = (content) => {
  const keys = /* @__PURE__ */ new Set();
  if (Array.isArray(content)) {
    for (const part of content) {
      if (part && typeof part === "object") {
        if (part.pageKey) keys.add(part.pageKey);
        if (part.dialogKey) keys.add(part.dialogKey);
      }
    }
  } else if (content && typeof content === "object") {
    if (content.pageKey) keys.add(content.pageKey);
    if (content.dialogKey) keys.add(content.dialogKey);
  }
  return Array.from(keys);
};
var addReferenceKeysAction = createAsyncThunk(
  "dialog/addReferenceKeys",
  async (args, { getState, dispatch }) => {
    const { content, dialogKey } = args;
    const newKeys = extractReferenceKeys(content);
    if (newKeys.length === 0) return;
    const state3 = getState();
    const dialogConfig = selectById(state3, dialogKey);
    if (!dialogConfig) return;
    const existingKeys = new Set(dialogConfig.referenceKeys || []);
    const keysToAdd = newKeys.filter((k2) => !existingKeys.has(k2));
    if (keysToAdd.length === 0) return;
    const updatedKeys = [...Array.from(existingKeys), ...keysToAdd];
    await dispatch(
      patch({
        dbKey: dialogKey,
        changes: {
          referenceKeys: updatedKeys
        }
      })
    );
  }
);

// packages/core/clipCompactText.ts
function clipCompactText(value, max, ellipsis = "...") {
  const compact = compactWhitespace(value);
  if (compact.length <= max) return compact;
  if (max <= ellipsis.length) return compact.slice(0, max);
  return `${compact.slice(0, max - ellipsis.length)}${ellipsis}`;
}

// packages/chat/messages/toolPresentation.ts
var HIDDEN_ORCHESTRATOR_TOOL_NAMES = {};
var HIDDEN_SERVER_ONLY_BROWSER_TOOL_NAMES = {
  queryModelUsage: true,
  createAgentAutomation: true,
  notifyUser: true
};
var DEFAULT_EXPANDED_TOOL_NAMES = {
  applyDiff: true,
  prepareAgentDraft: true,
  createAgent: true,
  geminiFlashImage: true,
  openAIGptImage: true,
  openAIGptImageGenerate: true,
  chatgptWebImageGenerate: true,
  openAIGptImageEdit: true,
  appDeploy: true,
  ziweiChart: true,
  runStreamingAgent: true,
  read_x_post: true,
  ask_user: true,
  createTable: true
};
var SUMMARY_EMOJI_PREFIX = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\[[vx!]\])\s*/u;
var SUMMARY_META_PREFIX = /^\[.*?\]\s*/;
var SUMMARY_COMMAND_PREFIX = /^command:\s*/i;
function cleanSummaryText(value) {
  return value.replace(SUMMARY_META_PREFIX, "").replace(SUMMARY_COMMAND_PREFIX, "").replace(SUMMARY_EMOJI_PREFIX, "").trim();
}
function formatStructuredSummary(summary, toolName) {
  const total = asOptionalFiniteNumber(summary.total);
  const succeeded = asOptionalFiniteNumber(summary.succeeded);
  const failed = asOptionalFiniteNumber(summary.failed);
  const compactPairs = Object.entries(summary).flatMap(
    ([key, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? [`${key}: ${String(value)}`] : []
  ).slice(0, 3);
  return compactPairs.join(" \xB7 ");
}
function normalizeToolDisplaySummary(summary, toolName) {
  if (typeof summary === "string") {
    const cleaned = cleanSummaryText(summary);
    if (cleaned) return cleaned;
  }
  if (isRecord(summary)) {
    const structured = cleanSummaryText(
      formatStructuredSummary(summary, toolName)
    );
    if (structured) return structured;
  }
  return cleanSummaryText(toolName || "");
}
function isHiddenOrchestratorToolMessage(message) {
  return message?.role === "tool" && typeof message.toolName === "string" && Boolean(HIDDEN_ORCHESTRATOR_TOOL_NAMES[message.toolName] || HIDDEN_SERVER_ONLY_BROWSER_TOOL_NAMES[message.toolName]);
}
function shouldToolMessageStartCollapsed(toolName) {
  const normalized = asTrimmedString(toolName);
  if (!normalized) return true;
  return !DEFAULT_EXPANDED_TOOL_NAMES[normalized];
}
var TOOL_OUTPUT_PREVIEW_CHARS = 4e3;
var TOOL_OUTPUT_PREVIEW_LINES = 120;
var TOOL_FORCE_COLLAPSE_CONTENT_CHARS = 8e3;
function measureToolText(text) {
  if (!text) return { chars: 0, lines: 0 };
  let lines = 1;
  for (let i2 = 0; i2 < text.length; i2++) {
    if (text.charCodeAt(i2) === 10) lines += 1;
  }
  return { chars: text.length, lines };
}
function shouldPreviewToolText(text, charLimit = TOOL_OUTPUT_PREVIEW_CHARS, lineLimit = TOOL_OUTPUT_PREVIEW_LINES) {
  if (!text) return false;
  if (text.length > charLimit) return true;
  return measureToolText(text).lines > lineLimit;
}
function previewToolText(text, charLimit = TOOL_OUTPUT_PREVIEW_CHARS, lineLimit = TOOL_OUTPUT_PREVIEW_LINES) {
  const { chars: totalChars, lines: totalLines } = measureToolText(text || "");
  if (!text) {
    return { preview: "", truncated: false, totalChars: 0, totalLines: 0 };
  }
  if (totalChars <= charLimit && totalLines <= lineLimit) {
    return { preview: text, truncated: false, totalChars, totalLines };
  }
  let preview = text.slice(0, Math.min(charLimit, text.length));
  const lastNl = preview.lastIndexOf("\n");
  if (lastNl > charLimit * 0.5) {
    preview = preview.slice(0, lastNl);
  }
  let lineCount = 1;
  let cutAt = preview.length;
  for (let i2 = 0; i2 < preview.length; i2++) {
    if (preview.charCodeAt(i2) === 10) {
      lineCount += 1;
      if (lineCount > lineLimit) {
        cutAt = i2;
        break;
      }
    }
  }
  if (cutAt < preview.length) {
    preview = preview.slice(0, cutAt);
  }
  if (!preview && text.length > 0) {
    preview = text.slice(0, Math.min(charLimit, text.length));
  }
  return {
    preview,
    truncated: preview.length < text.length,
    totalChars,
    totalLines
  };
}
function estimateToolContentChars(content) {
  if (content == null) return 0;
  if (typeof content === "string") return content.length;
  if (typeof content === "number" || typeof content === "boolean") {
    return String(content).length;
  }
  if (Array.isArray(content)) {
    try {
      return JSON.stringify(content).length;
    } catch {
      return content.length * 16;
    }
  }
  if (typeof content === "object") {
    try {
      return JSON.stringify(content).length;
    } catch {
      return 0;
    }
  }
  return 0;
}
function shouldToolMessageRowStartCollapsed(args) {
  if (args.forceOpen || args.isError) return false;
  const size = estimateToolContentChars(args.content);
  if (size >= TOOL_FORCE_COLLAPSE_CONTENT_CHARS) return true;
  return shouldToolMessageStartCollapsed(args.toolName);
}
var INPUT_SUMMARY_LIMIT = 180;
var KNOWN_AGENT_LABELS = {
  "agent-pub-01ECOMMERCEAG00000001PYQ2J": "\u7535\u5546\u5546\u54C1\u53C2\u6570\u52A9\u624B",
  "agent-pub-01APPBUILDER00000001YAII3I": "\u5E94\u7528\u6784\u5EFA\u52A9\u624B"
};
function readString(...values) {
  for (const value of values) {
    const trimmed = asOptionalTrimmedString(value);
    if (trimmed) return trimmed;
  }
  return "";
}
function compactText(value, fallback = "") {
  const raw = typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : fallback;
  return clipCompactText(raw, INPUT_SUMMARY_LIMIT, "\u2026");
}
function resolveStatusLabel(toolPayload, status) {
  const payloadStatus = readString(toolPayload?.status);
  if (status === "running" || payloadStatus === "running") return "\u5904\u7406\u4E2D";
  if (status === "failed" || payloadStatus === "failed") return "\u4EA4\u63A5\u5931\u8D25";
  if (payloadStatus === "pending") return "\u7B49\u5F85\u4E2D";
  return "\u5DF2\u4EA4\u63A5";
}
function buildRunStreamingAgentHandoffPresentation(args) {
  const raw = asRecordOrEmpty(args.rawData);
  const payload = asRecordOrEmpty(args.toolPayload);
  const input = asRecordOrEmpty(payload.input);
  const agentKey = readString(raw.agentKey, input.agentKey);
  const agentName = readString(raw.agentName, input.agentName, KNOWN_AGENT_LABELS[agentKey]);
  const inline = raw.inline === true || raw.handoff === true;
  const targetLabel = agentName || agentKey || "Agent";
  const userInput = readString(raw.userInput, input.userInput, input.task);
  const status = args.isStreaming ? "running" : args.isError ? "failed" : "success";
  return {
    summary: `\u5DF2\u4EA4\u7ED9 ${targetLabel} \u5904\u7406`,
    inline,
    targetLabel,
    agentKey,
    inputSummary: compactText(userInput, "\u672A\u8BB0\u5F55\u8F93\u5165\u6458\u8981"),
    statusLabel: resolveStatusLabel(payload, status),
    targetDialogKey: readString(
      raw.dialogKey,
      raw.subDialogKey,
      payload.subDialogKey,
      payload.subDialogId
    ),
    targetSpaceId: readString(raw.spaceId, payload.spaceId) || void 0
  };
}

// packages/chat/messages/web/assistantReplyPendingState.ts
var isAssistantToolStub = (msg) => msg?.role === "assistant" && (msg.content == null || typeof msg.content === "string" && msg.content.trim().length === 0 || Array.isArray(msg.content) && msg.content.length === 0) && Array.isArray(msg?.tool_calls) && msg.tool_calls.length > 0;
function isIntermediateAssistantProgress(entries, index) {
  const entry = entries[index];
  if (!entry || entry.type !== "single" || !entry.message) return false;
  const msg = entry.message;
  if (msg.role !== "assistant") return false;
  if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
    return true;
  }
  for (let j = index + 1; j < entries.length; j += 1) {
    const next = entries[j];
    if (next.type === "tool-group") return true;
    if (next.type !== "single" || !next.message) continue;
    const role = next.message.role;
    if (role === "tool") return true;
    if (role === "user" || role === "assistant") return false;
  }
  return false;
}
function isAwaitingVisibleAssistantReply(messages, isRunning) {
  if (!isRunning || messages.length === 0) return false;
  for (let i2 = messages.length - 1; i2 >= 0; i2 -= 1) {
    const msg = messages[i2];
    if (!msg) continue;
    if (isHiddenOrchestratorToolMessage(msg)) continue;
    if (msg.role === "user") return true;
    if (isAssistantToolStub(msg)) continue;
    return false;
  }
  return false;
}
function hasVisibleAssistantContent(msg) {
  if (!msg || msg.role !== "assistant") return false;
  if (isAssistantToolStub(msg)) return false;
  if (isHiddenOrchestratorToolMessage(msg)) return false;
  if (typeof msg.content === "string") return msg.content.trim().length > 0;
  if (Array.isArray(msg.content)) return msg.content.length > 0;
  return false;
}
function shouldAutoCollapseToolGroup(args) {
  for (let j = args.groupIndex + 1; j < args.entries.length; j += 1) {
    const entry = args.entries[j];
    if (entry.type === "tool-group") {
      continue;
    }
    if (entry.type !== "single" || !entry.message) continue;
    const msg = entry.message;
    if (msg.role === "user") {
      return true;
    }
    if (!hasVisibleAssistantContent(msg)) continue;
    if (msg.isStreaming) return false;
    return true;
  }
  if (args.isRunning || args.hasStreamingMessage) return false;
  return true;
}

// packages/chat/messages/messageDeleteCascade.ts
function planDeleteMessageCascade(msg, entities) {
  const msgId = msg?.id;
  let extraRemoveId;
  let extraRemoveDbKey;
  if (msg?.role === "tool" && msg.parentMessageId) {
    const parent = entities[msg.parentMessageId];
    if (parent && parent.role === "assistant" && isAssistantToolStub(parent)) {
      const hasOtherToolMsgs = Object.values(entities).some(
        (m3) => m3 && m3.role === "tool" && m3.parentMessageId === msg.parentMessageId && m3.dbKey !== msg.dbKey
      );
      if (!hasOtherToolMsgs) {
        extraRemoveId = parent.id;
        extraRemoveDbKey = parent.dbKey;
      }
    }
  }
  return { id: msgId, extraRemoveId, extraRemoveDbKey };
}

// packages/chat/messages/messageEditContent.ts
var buildEditedMessageContent = (originalContent, nextText) => {
  const trimmedText = nextText.trim();
  if (typeof originalContent === "string") {
    return trimmedText;
  }
  if (Array.isArray(originalContent)) {
    const nextParts = originalContent.filter(
      (part) => part && typeof part === "object" && part.type !== "text"
    );
    if (trimmedText) {
      nextParts.unshift({ type: "text", text: trimmedText });
    }
    return nextParts;
  }
  return trimmedText;
};

// packages/chat/messages/messageEditReplayPlan.ts
function planEditUserMessageAndReplay(input) {
  const { messages, messageId, originalContent, nextText } = input;
  const targetIndex = messages.findIndex((message) => message.id === messageId);
  if (targetIndex < 0) {
    return {
      ok: false,
      error: "target_not_found",
      message: "editUserMessageAndReplay: target message not found."
    };
  }
  const targetMessage = messages[targetIndex];
  if (!targetMessage || targetMessage.role !== "user") {
    return {
      ok: false,
      error: "not_user_message",
      message: "\u53EA\u80FD\u7F16\u8F91\u7528\u6237\u6D88\u606F\u3002"
    };
  }
  if (messages.some((message) => message.isStreaming)) {
    return {
      ok: false,
      error: "streaming_in_progress",
      message: "\u8BF7\u7B49\u5F85\u5F53\u524D\u56DE\u590D\u5B8C\u6210\u540E\u518D\u7F16\u8F91\u5386\u53F2\u6D88\u606F\u3002"
    };
  }
  const nextContent = buildEditedMessageContent(
    originalContent ?? targetMessage.content,
    nextText
  );
  const trailingMessages = messages.slice(targetIndex + 1);
  return {
    ok: true,
    targetMessage,
    nextContent,
    trailingMessages
  };
}

// packages/chat/messages/messageFinalizeOnError.ts
function messageHasDisplayContent(content) {
  if (typeof content === "string") {
    return content.trim().length > 0;
  }
  return Array.isArray(content) && content.length > 0;
}
function resolveFinalizeTransientOnError(existing, error) {
  if (!existing) return { kind: "noop" };
  if (!messageHasDisplayContent(existing.content)) {
    return { kind: "remove" };
  }
  return {
    kind: "markError",
    changes: {
      isStreaming: false,
      metadata: {
        ...existing.metadata ?? {},
        error: true,
        ...error ? { message: error } : {}
      }
    }
  };
}

// packages/chat/messages/messageInitMsgsPolicy.ts
function resolveInitMsgsFulfilledWriteMode(input) {
  if (input.isNew || input.hasLocalStreaming) return "upsert";
  return "replace";
}
function resolveInitMsgsHasMoreOlder(input) {
  const { limit, fetchedCount } = input;
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    return fetchedCount >= limit;
  }
  return false;
}

// packages/chat/messages/messageInitMsgsSummaryResume.ts
function findDialogConfigByDialogId(entities, dialogId) {
  return Object.values(entities ?? {}).find(
    (entity) => {
      if (!entity || typeof entity !== "object") return false;
      const value = entity;
      return value.type === "dialog" /* DIALOG */ && value.id === dialogId;
    }
  );
}
function resolveInitMsgsSummaryResume(input) {
  const dialogConfig = findDialogConfigByDialogId(input.entities, input.dialogId);
  if (dialogConfig && dialogConfig.summaryPending && dialogConfig.dbKey) {
    return { resume: true, dialogKey: dialogConfig.dbKey };
  }
  return { resume: false };
}

// packages/chat/messages/messageValidation.ts
var isValidMessage = (msg) => !!msg && typeof msg === "object" && typeof msg.id === "string";

// packages/chat/messages/fetchMessages.ts
function isUnboundedMessageLimit(limit) {
  return limit == null || !Number.isFinite(limit) || limit <= 0;
}
var fetchMessages = async (db, dialogId, options = {}) => {
  const {
    limit,
    beforeKey = null,
    throwOnError = false,
    includeDeleted = false
  } = options;
  if (!dialogId || typeof dialogId !== "string") {
    const errorMsg = "fetchMessages: dialogId \u5FC5\u987B\u662F\u4E00\u4E2A\u975E\u7A7A\u5B57\u7B26\u4E32";
    if (throwOnError) throw new Error(errorMsg);
    console.error(errorMsg);
    return [];
  }
  const messages = [];
  const { start, end } = dialogMessageRange(dialogId);
  const iteratorOptions = {
    // TODO: 替换为具体的迭代器选项类型
    gte: start,
    reverse: true,
    // 总是从新到旧获取
    // 默认不限条数；仅在显式正数 limit 时分页（load older）。
    ...isUnboundedMessageLimit(limit) ? {} : { limit: Math.floor(limit) }
  };
  if (beforeKey) {
    iteratorOptions.lt = beforeKey;
  } else {
    iteratorOptions.lte = end;
  }
  try {
    let iterator = db.iterator(iteratorOptions);
    if (iterator && typeof iterator.then === "function") {
      iterator = await iterator;
    }
    let count = 0;
    for await (const [key, value] of iterator) {
      count++;
      if (!includeDeleted && isTombstoneRecord(value)) {
        continue;
      }
      if (isRecord(value) && value.id && value.createdAt) {
        messages.push({ ...value, _key: key });
      }
    }
    return messages;
  } catch (error) {
    console.error(`fetchMessages: \u83B7\u53D6\u5BF9\u8BDD ${dialogId} \u6D88\u606F\u5931\u8D25:`, error);
    if (throwOnError) throw error;
    return [];
  }
};

// packages/chat/messages/fetchConvMsgs.ts
var FETCH_TIMEOUT = 5e3;
var fetchConvMsgs = async (server, token, {
  dialogId,
  dialogKey,
  limit,
  beforeKey
}, options = {}) => {
  const { signal: externalSignal } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", onExternalAbort);
  try {
    const response = await fetch(`${server}/rpc/getConvMsgs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        dialogId,
        ...dialogKey && { dialogKey },
        limit,
        ...beforeKey && { beforeKey }
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", onExternalAbort);
    if (!response.ok) {
      console.error(`fetchConvMsgs: Failed ${response.status} from ${server}`);
      return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", onExternalAbort);
    if (externalSignal?.aborted) {
      throw error;
    }
    console.error(`fetchConvMsgs: Error fetching from ${server}:`, error);
    return [];
  }
};

// packages/app/utils/async.ts
function swallowNonAbortError(promise, fallback, signal) {
  return promise.catch((err2) => {
    if (isAbortError(err2) || signal?.aborted) {
      throw err2;
    }
    console.error("Non-abort error in async op:", err2);
    return fallback;
  });
}

// packages/chat/messages/fetchAndCacheMessages.ts
var fetchAndCacheMessagesLocalFirst = async ({
  db,
  dialogId,
  dialogKey,
  // Default: full dialog history (no 50-message window that blinds multi-turn agents).
  limit,
  beforeKey,
  token,
  remoteServers = [],
  signal
}) => {
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const localPromise = fetchMessages(db, dialogId, {
    limit,
    beforeKey,
    throwOnError: false,
    includeDeleted: true
  }).catch(() => []);
  const remotePromise = (async () => {
    if (!token || remoteServers.length === 0) return [];
    const results = await Promise.all(
      remoteServers.map(
        (server) => swallowNonAbortError(
          fetchConvMsgs(
            server,
            token,
            { dialogId, dialogKey, limit, beforeKey },
            { signal }
          ),
          [],
          void 0
        )
      )
    );
    return results.flat();
  })();
  let localSettledAt = null;
  const localTimingPromise = localPromise.then((value) => {
    localSettledAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    return value;
  });
  const localMsgs = await localTimingPromise;
  const localMs = localSettledAt !== null ? Math.round(localSettledAt - startedAt) : null;
  const earlyReturned = localMsgs.length > 0;
  const remotePromiseWithMerge = (async () => {
    let remoteSettledAt = null;
    const remoteMsgs = await remotePromise.then((value) => {
      remoteSettledAt = typeof performance !== "undefined" ? performance.now() : Date.now();
      return value;
    });
    const freshLocalMsgs = await fetchMessages(db, dialogId, {
      limit,
      beforeKey,
      throwOnError: false,
      includeDeleted: true
    }).catch(() => []);
    const uniqueMap = /* @__PURE__ */ new Map();
    const changedMessagesToCache = /* @__PURE__ */ new Map();
    const put = (m3, trackChange = false) => {
      if (!m3 || !m3.id) return;
      const existing = uniqueMap.get(m3.id);
      if (existing && !shouldReplaceWithNextRecord(m3, existing)) return;
      uniqueMap.set(m3.id, m3);
      if (trackChange) changedMessagesToCache.set(m3.id, m3);
    };
    localMsgs.forEach((m3) => put(m3));
    freshLocalMsgs.forEach((m3) => put(m3));
    remoteMsgs.forEach((m3) => put(m3, true));
    if (changedMessagesToCache.size > 0) {
      try {
        const ops = Array.from(changedMessagesToCache.values()).map((msg) => {
          let key = msg.dbKey || msg.dbKey;
          if (!key) {
            key = dialogMessageKey(dialogId, msg.id);
          }
          return {
            type: "put",
            key,
            value: {
              ...msg,
              dbKey: key,
              type: "msg" /* MSG */
            }
          };
        });
        await db.batch(ops);
      } catch {
      }
    }
    console.info("[fetchAndCacheMessages-perf]", {
      dialogId,
      localMs,
      remoteMs: remoteSettledAt !== null ? Math.round(remoteSettledAt - startedAt) : null,
      totalMs: Math.round(
        (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt
      ),
      localCount: localMsgs.length,
      remoteCount: remoteMsgs.length,
      remoteServerCount: remoteServers.length,
      hasToken: !!token,
      earlyReturned
    });
    return Array.from(uniqueMap.values()).filter((message) => !isTombstoneRecord(message)).sort((a3, b2) => {
      const aCreated = a3 && typeof a3 === "object" && "createdAt" in a3 ? a3.createdAt : void 0;
      const bCreated = b2 && typeof b2 === "object" && "createdAt" in b2 ? b2.createdAt : void 0;
      const tA = new Date(aCreated || 0).getTime();
      const tB = new Date(bCreated || 0).getTime();
      return tB - tA;
    });
  })();
  if (!earlyReturned) {
    const mergedMessages = await remotePromiseWithMerge;
    return {
      localMessages: mergedMessages,
      remotePromise: Promise.resolve(mergedMessages),
      earlyReturned: false
    };
  }
  return {
    localMessages: localMsgs,
    remotePromise: remotePromiseWithMerge,
    earlyReturned: true
  };
};
var fetchAndCacheMessages = async (options) => {
  const { remotePromise } = await fetchAndCacheMessagesLocalFirst(options);
  return remotePromise;
};

// packages/ai/chat/agentCredentialSyncClient.ts
function buildUrl(currentServer, credentialRef) {
  return `${currentServer}/api/agent-credentials/${encodeURIComponent(credentialRef)}`;
}
async function fetchServerSyncedCredential(ctx, credentialRef) {
  try {
    const res = await fetch(buildUrl(ctx.currentServer, credentialRef), {
      method: "GET",
      headers: { Authorization: `Bearer ${ctx.authToken}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.apiKey ?? null;
  } catch {
    return null;
  }
}
async function deleteServerSyncedCredential(ctx, credentialRef) {
  try {
    const res = await fetch(buildUrl(ctx.currentServer, credentialRef), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${ctx.authToken}` }
    });
    return res.ok;
  } catch {
    return false;
  }
}
async function pushServerSyncedCredential(ctx, credentialRef, apiKey) {
  try {
    const res = await fetch(buildUrl(ctx.currentServer, credentialRef), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ctx.authToken}`
      },
      body: JSON.stringify({ apiKey })
    });
    return res.ok;
  } catch {
    return false;
  }
}

// packages/core/sanitizeModelString.ts
var sanitizeOptionalModelString = (value) => {
  const s3 = typeof value === "string" ? value.trim() : "";
  if (!s3) return "";
  const lower = s3.toLowerCase();
  if (lower === "undefined" || lower === "null" || lower === "nan") return "";
  return s3;
};

// packages/agent-runtime/credentialBroker.ts
function assertCredentialRef(ref) {
  const trimmed = asTrimmedString(ref);
  if (!trimmed) {
    throw new Error("invalid_ref");
  }
  if (trimmed.includes("..") || trimmed.includes("/") || trimmed.includes("\\")) {
    throw new Error("invalid_ref");
  }
  return trimmed;
}

// packages/agent-runtime/fileCredentialBroker.browser.stub.ts
var memoryStore = /* @__PURE__ */ new Map();
var STORAGE_PREFIX = "nolo.cred.";
function getStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
function storageKey(ref) {
  return STORAGE_PREFIX + ref;
}
var DEFAULT_HOST_ENDPOINT = "/api/desktop/credentials";
function isDesktopEnvironment(override) {
  if (typeof override === "boolean") return override;
  const g = globalThis;
  if (g.__NOLO_DESKTOP__ === true) return true;
  try {
    const doc = globalThis.document;
    if (doc?.documentElement?.dataset?.noloDesktop === "1") return true;
  } catch {
  }
  return false;
}
async function hostCredentialRequest(args) {
  const body = { op: args.op, ref: args.ref };
  if (args.secret !== void 0) {
    body.secret = args.secret;
  }
  let response;
  try {
    response = await args.fetchImpl(args.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin"
    });
  } catch (error) {
    throw new Error(
      `Desktop credential host unreachable: ${toErrorMessage(error)}`
    );
  }
  let payload = {};
  try {
    const parsed = await response.json();
    if (isRecord(parsed)) {
      payload = parsed;
    }
  } catch {
  }
  if (!response.ok || payload.ok === false) {
    const errText = typeof payload.error === "string" && payload.error ? payload.error : `host credential ${args.op} failed (${response.status})`;
    throw new Error(errText);
  }
  return payload;
}
function createHostCredentialBroker(options) {
  const { fetchImpl, endpoint } = options;
  return {
    async get(ref) {
      const safeRef = assertCredentialRef(ref);
      const payload = await hostCredentialRequest({
        op: "get",
        ref: safeRef,
        fetchImpl,
        endpoint
      });
      return typeof payload.secret === "string" ? payload.secret : null;
    },
    async put(ref, secret) {
      const safeRef = assertCredentialRef(ref);
      const value = asTrimmedString(secret);
      if (!value) {
        throw new Error(`Refusing to store empty secret for ref: ${safeRef}`);
      }
      await hostCredentialRequest({
        op: "put",
        ref: safeRef,
        secret: value,
        fetchImpl,
        endpoint
      });
    },
    async delete(ref) {
      const safeRef = assertCredentialRef(ref);
      await hostCredentialRequest({
        op: "delete",
        ref: safeRef,
        fetchImpl,
        endpoint
      });
    },
    async has(ref) {
      const safeRef = assertCredentialRef(ref);
      const payload = await hostCredentialRequest({
        op: "has",
        ref: safeRef,
        fetchImpl,
        endpoint
      });
      return Boolean(payload.has);
    }
  };
}
function createPersistentBrowserBroker() {
  return {
    async get(ref) {
      assertCredentialRef(ref);
      const storage = getStorage();
      if (storage) {
        return storage.getItem(storageKey(ref)) ?? null;
      }
      return memoryStore.get(ref) ?? null;
    },
    async put(ref, secret) {
      assertCredentialRef(ref);
      const value = asTrimmedString(secret);
      if (!value) {
        throw new Error(`Refusing to store empty secret for ref: ${ref}`);
      }
      const storage = getStorage();
      if (storage) {
        storage.setItem(storageKey(ref), value);
        return;
      }
      memoryStore.set(ref, value);
    },
    async delete(ref) {
      assertCredentialRef(ref);
      const storage = getStorage();
      if (storage) {
        storage.removeItem(storageKey(ref));
        return;
      }
      memoryStore.delete(ref);
    },
    async has(ref) {
      assertCredentialRef(ref);
      const storage = getStorage();
      if (storage) {
        return storage.getItem(storageKey(ref)) !== null;
      }
      return memoryStore.has(ref);
    }
  };
}
function createFileCredentialBroker(options = {}) {
  if (isDesktopEnvironment(options.desktop)) {
    const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    const endpoint = options.hostEndpoint ?? DEFAULT_HOST_ENDPOINT;
    return createHostCredentialBroker({ fetchImpl, endpoint });
  }
  return createPersistentBrowserBroker();
}

// packages/agent-runtime/migrateAgentSecrets.ts
function buildAgentApiKeyCredentialRef(agentKey) {
  const key = asTrimmedString(agentKey);
  if (!key) throw new Error("agentKey is required to build a credential ref.");
  return `api-key:${key}`;
}
function readRawApiKey(agent) {
  return asTrimmedString(agent.apiKey);
}
function resolveTargetRef(agent) {
  const fromCredential = asTrimmedString(agent.credentialRef);
  if (fromCredential) return fromCredential;
  const fromApiKeyRef = asTrimmedString(agent.apiKeyRef);
  if (fromApiKeyRef.startsWith("api-key:")) return fromApiKeyRef;
  return buildAgentApiKeyCredentialRef(agent.key);
}
async function brokerHas(broker, ref) {
  return Boolean(await broker.has(ref));
}
async function brokerPut(broker, ref, secret) {
  await broker.put(ref, secret);
}
async function migrateAgentSecrets(args) {
  const { agent, broker } = args;
  const raw = readRawApiKey(agent);
  const migration = asTrimmedString(agent.credentialMigration);
  if (migration === "done" && !raw) {
    const ref = typeof agent.credentialRef === "string" && agent.credentialRef.trim() || (typeof agent.apiKeyRef === "string" && agent.apiKeyRef.startsWith("api-key:") ? agent.apiKeyRef.trim() : "") || void 0;
    return {
      updates: {},
      status: "already-done",
      ...ref ? { credentialRef: ref } : {},
      phase: "complete"
    };
  }
  if (!raw && migration !== "pending") {
    return { updates: {}, status: "noop", phase: "none" };
  }
  const targetRef = resolveTargetRef(agent);
  if (raw) {
    await brokerPut(broker, targetRef, raw);
    const stored2 = await brokerHas(broker, targetRef);
    if (!stored2) {
      return {
        updates: {
          credentialRef: targetRef,
          credentialMigration: "pending"
        },
        status: "resumed-pending",
        credentialRef: targetRef,
        phase: "put"
      };
    }
    return {
      updates: {
        apiKey: null,
        credentialRef: targetRef,
        // Keep apiKeyRef for resolution if not already an OAuth provider name.
        // Prefer explicit credentialRef; set apiKeyRef only when empty so OAuth agents stay intact.
        ...!(typeof agent.apiKeyRef === "string" && agent.apiKeyRef.trim()) ? { apiKeyRef: targetRef } : {},
        credentialMigration: "done"
      },
      status: migration === "pending" ? "resumed-pending" : "migrated",
      credentialRef: targetRef,
      phase: "strip"
    };
  }
  const stored = await brokerHas(broker, targetRef);
  if (stored) {
    return {
      updates: {
        credentialRef: targetRef,
        credentialMigration: "done",
        ...!(typeof agent.apiKeyRef === "string" && agent.apiKeyRef.trim()) ? { apiKeyRef: targetRef } : {}
      },
      status: "resumed-pending",
      credentialRef: targetRef,
      phase: "complete"
    };
  }
  return {
    updates: {
      credentialRef: targetRef,
      credentialMigration: "pending"
    },
    status: "awaiting-secret",
    credentialRef: targetRef,
    phase: "put"
  };
}
function applyAgentSecretMigrationUpdates(record, updates) {
  const next = { ...record };
  if ("apiKey" in updates) {
    if (updates.apiKey === null || updates.apiKey === "") {
      delete next.apiKey;
    } else if (typeof updates.apiKey === "string") {
      next.apiKey = updates.apiKey;
    }
  }
  if (updates.apiKeyRef !== void 0) next.apiKeyRef = updates.apiKeyRef;
  if (updates.credentialRef !== void 0) next.credentialRef = updates.credentialRef;
  if (updates.credentialMigration !== void 0) {
    next.credentialMigration = updates.credentialMigration;
  }
  return next;
}

// packages/agent-runtime/runtimeToolPolicy.ts
function unique(values) {
  return [...new Set(values)];
}
function normalizeAgentRuntimeToolPolicy(value) {
  if (!isRecord(value)) return void 0;
  return {
    version: 1,
    ...asNonEmptyStringArray(value.agentTools).length ? { agentTools: unique(asNonEmptyStringArray(value.agentTools)) } : {},
    ...asNonEmptyStringArray(value.runtimeTools).length ? { runtimeTools: unique(asNonEmptyStringArray(value.runtimeTools)) } : {},
    ...isRecord(value.workspace) ? { workspace: { ...value.workspace } } : {},
    ...isRecord(value.shell) ? { shell: { ...value.shell } } : {},
    ...isRecord(value.isolation) ? { isolation: { ...value.isolation } } : {},
    ...isRecord(value.git) ? { git: { ...value.git } } : {},
    ...isRecord(value.budget) ? { budget: { ...value.budget } } : {},
    ...isRecord(value.audit) ? { audit: { ...value.audit } } : {}
  };
}

// packages/ai/agent/agentSlice.ts
var createAgentCredentialBroker = createFileCredentialBroker;
function setAgentCredentialBrokerFactoryForTests(factory2) {
  createAgentCredentialBroker = factory2 ?? createFileCredentialBroker;
}
var readNonEmptyApiKey = (value) => asTrimmedString(value);
var migrateRawApiKeyForAgent = async (args) => {
  const broker = createAgentCredentialBroker();
  const result = await migrateAgentSecrets({
    agent: {
      key: args.agentKey,
      apiKey: args.apiKey,
      apiKeyRef: args.apiKeyRef,
      credentialRef: args.credentialRef
    },
    broker
  });
  const next = applyAgentSecretMigrationUpdates(args.record, result.updates);
  if (readNonEmptyApiKey(next.apiKey)) {
    throw new Error(
      "Failed to migrate agent API key into the local credential broker. The raw key was not stripped."
    );
  }
  return next;
};
var createSliceWithThunks3 = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator }
});
var initialState3 = {};
var normalizeAgentReferences = (references) => {
  if (!Array.isArray(references)) return [];
  return references.map((ref) => ({
    dbKey: ref.dbKey || "",
    title: ref.title || "",
    type: ref.type === "page" ? "knowledge" : ref.type || "knowledge"
  }));
};
var normalizeRuntimeToolPolicy = (value) => {
  const policy = normalizeAgentRuntimeToolPolicy(value);
  if (!policy) return void 0;
  const hasPolicyContent = Boolean(
    policy.agentTools?.length || policy.runtimeTools?.length || policy.workspace || policy.shell || policy.isolation || policy.git || policy.budget || policy.audit
  );
  return hasPolicyContent ? policy : void 0;
};
var processAgentCreateForm = (formData, userId) => {
  const isPublic = !!formData.isPublic;
  const machineId = asTrimmedString(formData.machineId);
  const result = {
    ...formData,
    // tags: "a, b" -> ["a", "b"]
    tags: formData.tags ? formData.tags.split(",").map((s3) => s3.trim()).filter(Boolean) : [],
    // 归一化 references
    references: normalizeAgentReferences(formData.references || []),
    // 非公开时，强制清空白名单，避免脏数据
    whitelist: isPublic ? formData.whitelist || [] : [],
    // allowFork 独立于公开：Space 内的私有 agent 也可被空间成员复制
    allowFork: !!formData.allowFork
  };
  delete result.machineId;
  result.runtimeToolPolicy = normalizeRuntimeToolPolicy(
    formData.runtimeToolPolicy
  );
  if (!result.runtimeToolPolicy) {
    delete result.runtimeToolPolicy;
  }
  if (formData.apiSource === "cli" && machineId) {
    const binding = {
      ...asRecordOrEmpty(result.runtimeBinding),
      machineId,
      ownerUserId: userId
    };
    result.runtimeBinding = binding;
  }
  if ("model" in result) {
    result.model = sanitizeOptionalModelString(result.model);
  }
  if ("provider" in result) {
    result.provider = sanitizeOptionalModelString(result.provider);
  }
  return result;
};
var processAgentUpdateChanges = (data, userId, previousAgent) => {
  const changes = {};
  if ("name" in data) {
    changes.name = String(data.name ?? "").trim();
  }
  if ("model" in data) {
    changes.model = sanitizeOptionalModelString(data.model);
  }
  if ("provider" in data) {
    changes.provider = sanitizeOptionalModelString(data.provider);
  }
  if ("prompt" in data) {
    changes.prompt = (data.prompt ?? "").trim();
  }
  if ("introduction" in data) {
    changes.introduction = (data.introduction ?? "").trim();
  }
  if ("customProviderUrl" in data) {
    changes.customProviderUrl = (data.customProviderUrl ?? "").trim();
  }
  if ("apiKey" in data) {
    changes.apiKey = (data.apiKey ?? "").trim();
  }
  if ("hasVision" in data && data.hasVision !== void 0) {
    changes.hasVision = !!data.hasVision;
  }
  if ("apiSource" in data && data.apiSource) {
    changes.apiSource = data.apiSource;
  }
  if ("cliProvider" in data) {
    changes.cliProvider = data.cliProvider || "";
  }
  if ("machineId" in data) {
    const machineId = String(data.machineId ?? "").trim();
    const effectiveApiSource = data.apiSource ?? previousAgent?.apiSource;
    if (machineId) {
      if (effectiveApiSource === "cli" || effectiveApiSource === void 0) {
        const binding = {
          ...asRecordOrEmpty(changes.runtimeBinding),
          machineId,
          ownerUserId: userId
        };
        changes.runtimeBinding = binding;
      }
    } else {
      if (effectiveApiSource === "cli" || effectiveApiSource === void 0) {
        changes.runtimeBinding = null;
      }
    }
  }
  if ("useServerProxy" in data && data.useServerProxy !== void 0) {
    changes.useServerProxy = !!data.useServerProxy;
  }
  if ("sharingLevel" in data) {
    const sharingLevel = data.sharingLevel;
    if (sharingLevel === "default" || sharingLevel === "split" || sharingLevel === "full") {
      changes.sharingLevel = sharingLevel;
    }
  }
  if ("greeting" in data) {
    changes.greeting = data.greeting;
  }
  if ("tools" in data) {
    changes.tools = Array.isArray(data.tools) ? data.tools.slice() : [];
  }
  if ("runtimeToolPolicy" in data) {
    const rawRuntimeToolPolicy = data.runtimeToolPolicy;
    changes.runtimeToolPolicy = rawRuntimeToolPolicy === null ? null : normalizeRuntimeToolPolicy(rawRuntimeToolPolicy) ?? null;
  }
  const numericKeys = [
    "inputPrice",
    "outputPrice",
    "temperature",
    "top_p",
    "frequency_penalty",
    "presence_penalty",
    "max_tokens"
  ];
  numericKeys.forEach((key) => {
    if (key in data) {
      const raw = data[key];
      if (raw === void 0 || raw === null) {
        changes[key] = raw;
      } else {
        const num = Number(raw);
        changes[key] = Number.isNaN(num) ? raw : num;
      }
    }
  });
  if ("reasoning_effort" in data) {
    changes.reasoning_effort = data.reasoning_effort;
  }
  if ("tags" in data) {
    const raw = data.tags;
    let arr = [];
    if (Array.isArray(raw)) {
      arr = raw.map((s3) => toTrimmedString(s3)).filter(Boolean);
    } else if (typeof raw === "string") {
      arr = raw.split(",").map((s3) => s3.trim()).filter(Boolean);
    }
    changes.tags = arr;
  }
  if ("references" in data) {
    changes.references = normalizeAgentReferences(
      data.references || []
    );
  }
  if ("whitelist" in data) {
    changes.whitelist = data.whitelist || [];
  }
  if ("allowFork" in data) {
    changes.allowFork = !!data.allowFork;
  }
  if ("avatarFileId" in data) {
    const raw = data.avatarFileId;
    changes.avatarFileId = raw ? String(raw).trim() : null;
  }
  if ("isPublic" in data) {
    changes.isPublic = !!data.isPublic;
    if (!changes.isPublic) {
      changes.whitelist = [];
    }
  }
  return changes;
};
var slice = createSliceWithThunks3({
  name: "agent",
  initialState: initialState3,
  reducers: (create) => ({
    /**
     * 通用 LLM 调用（不带 Agent 上下文 / 历史）
     */
    runLlm: create.asyncThunk(async (args, thunkApi) => {
      const overrides = {};
      if (args.systemPromptOverride !== void 0) overrides.prompt = args.systemPromptOverride;
      if (args.toolsOverride !== void 0) overrides.tools = args.toolsOverride;
      const { _executeModel } = await import("/public/assets/chunks/_executeModel-WJTLRL3P.js");
      return _executeModel(
        {
          isStreaming: args.isStreaming ?? false,
          withAgentContext: false,
          withChatHistory: false,
          agentConfigOverrides: Object.keys(overrides).length ? overrides : void 0
        },
        args,
        thunkApi
      );
    }),
    /**
     * 通用 Agent 调用（带 Agent 上下文，多轮工具循环）
     *
     * 使用客户端 runAgentClientLoop：
     * - 每轮调用 LLM（非流式）
     * - 遇到 tool_calls 时通过 findToolExecutor 本地执行工具
     * - 循环直到无工具调用或触发其他运行时停止条件
     */
    runAgent: create.asyncThunk(async (args, thunkApi) => {
      const { runAgentClientLoop } = await import("/public/assets/chunks/runAgentClientLoop-SYYLHZA4.js");
      const { content: loopContent, toolCallCount } = await runAgentClientLoop(
        {
          agentKey: args.agentKey,
          content: args.content,
          parentMessageId: args.parentMessageId,
          billingDialogKey: args.billingDialogKey
        },
        thunkApi
      );
      return loopContent;
    }),
    /**
     * 聊天轮次流式 Agent 调用
     */
    streamAgentChatTurn: create.asyncThunk(async (args, thunkApi) => {
      const { streamAgentChatTurnHandler } = await import("/public/assets/chunks/streamAgentChatTurn-SQ6QMWEX.js");
      return streamAgentChatTurnHandler(args, thunkApi);
    }),
    /**
     * 创建 Agent：
     * - 写入用户私有路径
     * - 如 isPublic=true，则同时写入公共路径
     * - 返回完整 Agent 对象（包含 id / meta 字段）
     */
    createAgent: create.asyncThunk(
      async ({ userId, formData, spaceId }, thunkApi) => {
        const effectiveUserId = asOptionalTrimmedString(userId) ?? "local";
        const processed = processAgentCreateForm(formData, effectiveUserId);
        const now = Date.now();
        const id = ulid();
        const privateKey = createAgentKey.private(effectiveUserId, id);
        const publicKey = createAgentKey.public(id);
        let agent = {
          ...processed,
          id,
          type: "agent" /* AGENT */,
          userId: effectiveUserId,
          createdAt: now,
          updatedAt: now,
          dialogCount: 0,
          messageCount: 0,
          tokenCount: 0,
          spaceId
          // 记录 spaceId
        };
        if (effectiveUserId === "local") {
          agent.isPublic = false;
        }
        try {
          const { localFirstLog } = await import("/public/assets/chunks/localFirstLog-HBUWUDON.js");
          localFirstLog("agent.create.start", {
            owner: effectiveUserId,
            hasRawApiKey: Boolean(readNonEmptyApiKey(agent.apiKey)),
            hasSpace: Boolean(spaceId)
          });
        } catch {
        }
        const createRawApiKey = readNonEmptyApiKey(agent.apiKey);
        if (createRawApiKey) {
          agent = await migrateRawApiKeyForAgent({
            record: agent,
            agentKey: privateKey,
            apiKey: createRawApiKey,
            apiKeyRef: agent.apiKeyRef,
            credentialRef: agent.credentialRef
          });
        }
        await thunkApi.dispatch(
          write({
            data: agent,
            customKey: privateKey,
            userId: effectiveUserId
          })
        ).unwrap();
        if (agent.isPublic) {
          await thunkApi.dispatch(
            write({
              data: agent,
              customKey: publicKey,
              userId: effectiveUserId
            })
          ).unwrap();
        }
        if (agent.credentialSynced && createRawApiKey) {
          const ctx = getRuntimeServerContext(thunkApi.getState());
          const credentialRef = agent.credentialRef;
          if (ctx.currentToken && credentialRef) {
            try {
              await pushServerSyncedCredential(
                { currentServer: ctx.currentServer ?? "", authToken: ctx.currentToken },
                credentialRef,
                createRawApiKey
              );
            } catch {
            }
          }
        }
        try {
          const { localFirstLog } = await import("/public/assets/chunks/localFirstLog-HBUWUDON.js");
          localFirstLog("agent.create.done", {
            owner: effectiveUserId,
            key: privateKey,
            hasCredentialRef: Boolean(
              typeof agent.credentialRef === "string" && agent.credentialRef.trim()
            ),
            hasRawApiKey: Boolean(readNonEmptyApiKey(agent.apiKey)),
            isPublic: Boolean(agent.isPublic)
          });
        } catch {
        }
        return agent;
      }
    ),
    /**
     * 更新 Agent（支持局部字段 patch）：
     * - patch 私有副本
     * - 如提供 previousAgent，则同步更新 / 删除公共副本
     *
     * 注意：
     * - Tool 场景下一般不提供 previousAgent，此时只保证私有副本被更新；
     *   公共副本（应用市场）不做强一致保证。
     */
    updateAgent: create.asyncThunk(
      async ({ userId, agentId, formData, previousAgent }, thunkApi) => {
        const effectiveUserId = asOptionalTrimmedString(userId) ?? "local";
        const normalizedAgentId = (() => {
          const raw = agentId.trim();
          if (raw.startsWith("agent-")) {
            const parts = raw.split("-");
            if (parts.length >= 3) return parts.slice(2).join("-");
          }
          return raw;
        })();
        const privateKey = createAgentKey.private(effectiveUserId, normalizedAgentId);
        const publicKey = createAgentKey.public(normalizedAgentId);
        let changes = processAgentUpdateChanges(formData || {}, effectiveUserId, previousAgent);
        const updateRawApiKey = readNonEmptyApiKey(changes.apiKey);
        if (updateRawApiKey) {
          const formAny = formData || {};
          const migrated = await migrateRawApiKeyForAgent({
            record: { ...changes },
            agentKey: privateKey,
            apiKey: updateRawApiKey,
            apiKeyRef: formAny.apiKeyRef ?? previousAgent?.apiKeyRef ?? changes.apiKeyRef,
            credentialRef: formAny.credentialRef ?? previousAgent?.credentialRef ?? changes.credentialRef
          });
          changes = migrated;
          if (!readNonEmptyApiKey(changes.apiKey)) {
            changes.apiKey = null;
          }
        }
        let localExists = false;
        try {
          const { db } = thunkApi.extra;
          const localData = await db.get(privateKey);
          localExists = !!localData;
        } catch (e2) {
        }
        if (localExists) {
          await thunkApi.dispatch(
            patch({
              dbKey: privateKey,
              changes
            })
          ).unwrap();
        } else if (previousAgent) {
          const merged = {
            ...previousAgent,
            ...changes,
            id: normalizedAgentId,
            type: previousAgent.type || "agent" /* AGENT */,
            userId: effectiveUserId
          };
          await thunkApi.dispatch(
            write({
              data: merged,
              customKey: privateKey,
              userId: effectiveUserId
            })
          ).unwrap();
        } else {
          await thunkApi.dispatch(
            patch({
              dbKey: privateKey,
              changes
            })
          ).unwrap();
        }
        if (previousAgent && effectiveUserId !== "local") {
          const wasPublic = !!previousAgent.isPublic;
          const hasIsPublicChange = Object.prototype.hasOwnProperty.call(
            changes,
            "isPublic"
          );
          const nowPublic = hasIsPublicChange ? !!changes.isPublic : wasPublic;
          if (nowPublic) {
            const mergedPublic = {
              ...previousAgent,
              ...changes,
              id: normalizedAgentId,
              type: previousAgent.type || "agent" /* AGENT */,
              userId: effectiveUserId
            };
            await thunkApi.dispatch(
              write({
                data: mergedPublic,
                customKey: publicKey,
                userId: effectiveUserId
              })
            ).unwrap();
          } else if (wasPublic && !nowPublic) {
            await thunkApi.dispatch(remove(publicKey)).unwrap();
          }
        }
        const base = previousAgent ?? {};
        const mergedPrivate = {
          ...base,
          ...changes,
          id: normalizedAgentId,
          type: base.type || "agent" /* AGENT */,
          userId: effectiveUserId
        };
        return mergedPrivate;
      }
    )
  })
});
var {
  runLlm,
  runAgent,
  streamAgentChatTurn,
  createAgent,
  updateAgent
} = slice.actions;
var agentReducer = slice.reducer;
var agentSlice_default = agentReducer;

// packages/chat/dialog/actions/builtinDialogLlm.ts
var BASE_BUILTIN_DIALOG_LLM_CONFIG = {
  apiSource: "platform",
  useServerProxy: true
};
var BUILTIN_TITLE_LLM_CONFIG = {
  ...BASE_BUILTIN_DIALOG_LLM_CONFIG,
  provider: "nolo",
  id: "builtin-dialog-title-llm",
  name: "Builtin Dialog Title LLM",
  model: "deepseek-v4-flash",
  prompt: "You are a title generator for chat history. \u4F60\u53EA\u505A\u4E00\u4EF6\u4E8B\uFF1A\u6839\u636E\u5BF9\u8BDD\u5185\u5BB9\u8F93\u51FA\u6700\u7EC8\u6807\u9898\u3002\u786C\u6027\u89C4\u5219\uFF1A1) \u53EA\u8F93\u51FA\u6807\u9898\u8FD9\u4E00\u884C\uFF1B\u4E25\u7981\u8F93\u51FA\u63A8\u7406\u3001\u5206\u6790\u3001\u6B65\u9AA4\u3001\u89E3\u91CA\u3001\u524D\u8A00\u3001\u540E\u8BB0\u3001\u7FFB\u8BD1\u3001\u81F4\u6B49\u6216\u4EFB\u4F55\u989D\u5916\u8BF4\u660E\u30022) \u4E0D\u8981\u56DE\u7B54\u7528\u6237\u8BF7\u6C42\uFF0C\u4E0D\u8981\u5199\u6458\u8981\uFF0C\u53EA\u7ED9\u6807\u9898\u7ED3\u679C\u30023) \u6807\u9898\u5C3D\u91CF\u77ED\uFF1A\u901A\u5E38 2-5 \u4E2A\u8BCD\uFF0C\u82F1\u6587\u4E0D\u8D85\u8FC7 6 \u4E2A\u8BCD\u30024) \u4F7F\u7528\u5BF9\u8BDD\u4E3B\u8BED\u8A00\uFF1B\u6DF7\u5408\u8BED\u8A00\u65F6\u4F18\u5148\u7528\u6237\u4E3B\u8981\u8BED\u8A00\u30025) \u4F18\u5148\u590D\u7528\u5BF9\u8BDD\u4E2D\u7684\u5177\u4F53\u4E3B\u9898\u8BCD\uFF0C\u907F\u514D issue\u3001help\u3001discussion\u3001analysis\u3001update \u8FD9\u7C7B\u7A7A\u6CDB\u8BCD\u30026) \u5FFD\u7565 tool JSON\u3001\u51FD\u6570\u540D\u3001branch label\u3001agent \u540D\u3001\u7CFB\u7EDF\u6307\u4EE4\u548C\u7F16\u6392\u75D5\u8FF9\uFF08\u5982 GPT\u3001Claude\u3001Gemini\uFF09\uFF1B\u6807\u9898\u8981\u843D\u5728\u7528\u6237\u771F\u6B63\u8BA8\u8BBA\u7684\u5BF9\u8C61\u6216\u51B3\u7B56\u4E0A\u30027) \u66F4\u504F\u597D\u201C\u5BF9\u8C61 + \u52A8\u4F5C/\u5224\u65AD\u201D\u7684\u77ED\u6807\u9898\uFF0C\u4F8B\u5982\u201CAI \u90AE\u4EF6\u52A9\u624B\u53D6\u820D\u201D\u201C\u4E1C\u4EAC\u56DB\u65E5\u6162\u65C5\u884C\u201D\u201C\u91CD\u590D\u6263\u8D39\u9000\u6B3E\u201D\u30028) \u7EAF\u6587\u672C\uFF0C\u4E0D\u8981\u9879\u76EE\u7B26\u53F7\u3001\u7F16\u53F7\u3001markdown\u3001emoji\u3002\u6700\u7EC8\u53EA\u8FD4\u56DE\u6807\u9898\u6587\u672C\u3002 Output only the title text."
};
var BUILTIN_SUMMARY_LLM_CONFIG = {
  ...BASE_BUILTIN_DIALOG_LLM_CONFIG,
  provider: "nolo",
  id: "builtin-dialog-summary-llm",
  name: "Builtin Dialog Summary LLM",
  model: "deepseek-v4-flash",
  prompt: "\u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684\u5BF9\u8BDD\u8BB0\u5FC6\u52A9\u7406\u3002\u8BF7\u57FA\u4E8E\u3010\u73B0\u6709\u8BB0\u5FC6\u3011\u548C\u3010\u65B0\u589E\u5BF9\u8BDD\u3011\uFF0C\u8F93\u51FA\u4E00\u4EFD\u66F4\u65B0\u540E\u7684\u5BF9\u8BDD\u8BB0\u5FC6\u6863\u6848\u3002\u4E25\u683C\u53EA\u8F93\u51FA\u4E0B\u9762\u4E24\u90E8\u5206\uFF0C\u6807\u9898\u5FC5\u987B\u5B8C\u5168\u4E00\u81F4\uFF1A\n\u5173\u952E\u4E8B\u5B9E\u6863\u6848\n- ...\n\u5BF9\u8BDD\u5267\u60C5\u6458\u8981\n- ...\n\u8981\u6C42\uFF1A1) \u4F7F\u7528\u5BF9\u8BDD\u4E3B\u8BED\u8A00\uFF1B\u6DF7\u5408\u8BED\u8A00\u65F6\u4F18\u5148\u8DDF\u968F\u7528\u6237\u4E3B\u8981\u8BED\u8A00\uFF0C\u4E13\u6709\u540D\u8BCD\u4FDD\u7559\u539F\u6587\u30022) \u5173\u952E\u4E8B\u5B9E\u6863\u6848\u53EA\u4FDD\u7559\u4E4B\u540E\u7EE7\u7EED\u5BF9\u8BDD\u4ECD\u6709\u4EF7\u503C\u7684\u4FE1\u606F\uFF0C\u4F8B\u5982\u7528\u6237\u504F\u597D\u3001\u76EE\u6807\u3001\u7EA6\u675F\u3001\u6280\u672F\u6808\u3001\u786E\u5B9A\u7684\u6587\u4EF6\u540D/\u53D8\u91CF\u540D\u3001\u6838\u5FC3\u51B3\u7B56\u3001\u5F85\u529E\u4E8B\u9879\u30023) \u5BF9\u8BDD\u5267\u60C5\u6458\u8981\u5148\u6781\u7B80\u6982\u62EC\u65E7\u4E0A\u4E0B\u6587\uFF0C\u518D\u66F4\u8BE6\u7EC6\u8BB0\u5F55\u6700\u8FD1\u65B0\u589E\u7684\u8FDB\u5C55\u3001\u5206\u6B67\u3001\u7ED3\u8BBA\u548C\u4E0B\u4E00\u6B65\u30024) \u5FFD\u7565\u5BD2\u6684\u3001\u91CD\u590D\u5C1D\u8BD5\u3001\u5DF2\u653E\u5F03\u65B9\u6848\u548C\u65E0\u4EF7\u503C\u5E9F\u8BDD\u30025) \u4E0D\u8981\u7F16\u9020\u672A\u51FA\u73B0\u7684\u4FE1\u606F\uFF0C\u4E0D\u8981\u8F93\u51FA\u5F00\u573A\u767D\u3001\u7ED3\u675F\u8BED\u3001markdown \u4EE3\u7801\u5757\u6216\u989D\u5916\u7AE0\u8282\u3002"
};
var buildBuiltinSummaryContent = (previousSummary, messagesText) => `
\u3010\u73B0\u6709\u8BB0\u5FC6\u3011\uFF1A
${previousSummary || "(\u65E0)"}

\u3010\u65B0\u589E\u5BF9\u8BDD\u3011\uFF1A
${messagesText}
`.trim();

// packages/app/utils/imageUtils.ts
var DEFAULT_COMPRESSION_OPTIONS = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 1400,
  useWebWorker: true,
  initialQuality: 0.9
};
var BYTES_PER_MB = 1024 * 1024;
var toMegabytes = (bytes) => bytes / BYTES_PER_MB;
var sleep2 = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var parseDataUrl = (dataUrl) => {
  const trimmed = dataUrl.trim();
  const parts = trimmed.split(",");
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    console.warn("[imageUtils] parseDataUrl: invalid data URL", {
      hasHeader: !!parts[0],
      hasBody: !!parts[1]
    });
    return null;
  }
  const header = parts[0];
  const base64 = parts[1];
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch?.[1];
  if (!mime) {
    console.warn("[imageUtils] parseDataUrl: cannot extract mime from", header);
    return null;
  }
  return { mime, base64 };
};
function dataURLtoFile(dataUrl, filename) {
  try {
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) return null;
    const { mime, base64 } = parsed;
    const binaryString = atob(base64);
    const length = binaryString.length;
    const u8arr = new Uint8Array(length);
    for (let i2 = 0; i2 < length; i2++) {
      u8arr[i2] = binaryString.charCodeAt(i2);
    }
    return new File([u8arr], filename, { type: mime });
  } catch (error) {
    console.error("[imageUtils] Error converting data URL to File:", error);
    return null;
  }
}
var normalizeCompressedFile = (sourceFile, compressed) => {
  if (compressed instanceof File) {
    return compressed;
  }
  return new File([compressed], sourceFile.name, {
    type: compressed.type || sourceFile.type || "application/octet-stream",
    lastModified: sourceFile.lastModified || Date.now()
  });
};
async function compressImageFile(imageFile, options) {
  const mergedOptions = {
    ...DEFAULT_COMPRESSION_OPTIONS,
    ...options
  };
  const originalSizeMB = toMegabytes(imageFile.size);
  const targetSizeMB = mergedOptions.maxSizeMB ?? DEFAULT_COMPRESSION_OPTIONS.maxSizeMB;
  console.log(
    `[imageUtils] compressImageFile: original size = ${originalSizeMB.toFixed(
      2
    )} MB`
  );
  if (originalSizeMB <= targetSizeMB) {
    console.log(
      "[imageUtils] compressImageFile: image already smaller than target, skip compression"
    );
    return imageFile;
  }
  let imageCompression;
  try {
    ({ default: imageCompression } = await import("/public/assets/chunks/browser-image-compression-QFZGPXTF.js"));
  } catch (error) {
    console.error(
      "[imageUtils] compressImageFile import failed:",
      error
    );
    return imageFile;
  }
  try {
    const compressedBlob = await imageCompression(imageFile, mergedOptions);
    const compressedFile = normalizeCompressedFile(imageFile, compressedBlob);
    const compressedSizeMB = toMegabytes(compressedFile.size);
    console.log(
      `[imageUtils] compressImageFile: compressed size = ${compressedSizeMB.toFixed(
        2
      )} MB (target <= ${targetSizeMB.toFixed(2)} MB)`
    );
    if (compressedFile.size >= imageFile.size) {
      console.log(
        "[imageUtils] compressImageFile: compressed file is not smaller, return original"
      );
      return imageFile;
    }
    return compressedFile;
  } catch (error) {
    console.error(
      "[imageUtils] compressImageFile compress failed:",
      error
    );
    return imageFile;
  }
}
var appendNoCacheQuery = (url) => {
  const stamp = `_t=${Date.now()}`;
  return url.includes("?") ? `${url}&${stamp}` : `${url}?${stamp}`;
};
var tryLoadImage = (url) => new Promise((resolve) => {
  const img = new Image();
  const cleanup = () => {
    img.onload = null;
    img.onerror = null;
  };
  img.onload = () => {
    cleanup();
    resolve(true);
  };
  img.onerror = () => {
    cleanup();
    resolve(false);
  };
  img.src = url;
});
var waitForFileReady = async (url, {
  maxWaitMs = 4e3,
  intervalMs = 250
} = {}) => {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const tryUrl = appendNoCacheQuery(url);
    const ok2 = await tryLoadImage(tryUrl);
    if (ok2) {
      console.debug("[imageUtils] waitForFileReady: image loaded for", url);
      return true;
    }
    await sleep2(intervalMs);
  }
  console.warn("[imageUtils] waitForFileReady: timeout for", url);
  return false;
};

// packages/database/fileUrl.ts
var normalizeFileId = (fileId) => {
  if (typeof fileId !== "string") return "";
  return fileId.trim();
};
var buildDatabaseFileContentUrl = (serverOrigin, fileId) => {
  const normalizedServer = normalizeServerOrigin(serverOrigin);
  const normalizedFileId = normalizeFileId(fileId);
  if (!normalizedServer || !normalizedFileId) {
    return null;
  }
  return `${normalizedServer}${API_ENDPOINTS.DATABASE}/file/content/${normalizedFileId}`;
};
var isLocalDatabaseFileContentUrl = (url) => {
  if (typeof url !== "string" || !url) return false;
  return url.includes("localhost") || url.includes("127.0.0.1");
};

// packages/chat/messages/fileUrl.ts
var buildMessageFileContentUrl = (serverOrigin, fileId) => buildDatabaseFileContentUrl(serverOrigin, fileId);
var isLocalFileContentUrl = (url) => isLocalDatabaseFileContentUrl(url);

// packages/chat/messages/imagePayloadPersistence.ts
var stripDurableImageInlinePayload = (part) => {
  if (!part || typeof part !== "object") return part;
  const { original_data_url: _originalDataUrl, ...withoutOriginalDataUrl } = part;
  if (withoutOriginalDataUrl.type !== "image_url" || !withoutOriginalDataUrl.google_native || typeof withoutOriginalDataUrl.google_native !== "object") {
    return withoutOriginalDataUrl;
  }
  const { google_native: _googleNative, ...durablePart } = withoutOriginalDataUrl;
  return durablePart;
};

// packages/core/chat/messageContentSerialize.ts
var serializeMessageContent = (content, imagePlaceholder = "[\u56FE\u7247]") => {
  if (typeof content === "string") {
    return content.trim() || null;
  }
  if (Array.isArray(content)) {
    const fragments = [];
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      if (part.type === "text" && typeof part.text === "string") {
        const text = part.text.trim();
        if (text) fragments.push(text);
      } else if (part.type === "image_url") {
        fragments.push(imagePlaceholder);
      }
    }
    const joined = fragments.join("\n").trim();
    return joined || null;
  }
  return null;
};

// packages/chat/messages/messageContent.ts
var isDataUrlImage = (url) => typeof url === "string" && url.startsWith("data:image");
var uploadGeneratedImageDataUrl = async (url, dialogId, messageId, index, dispatch, getState, options) => {
  const fileName = `generated-image-${dialogId}-${messageId}-${index}.png`;
  const file = dataURLtoFile(url, fileName);
  if (!file) {
    console.warn(
      "[messageContent] dataURLtoFile failed, drop generated image inline payload"
    );
    return null;
  }
  const customKey = `generated-image-${dialogId}-${messageId}-${index}`;
  let metadata;
  try {
    metadata = await dispatch(upload({ file, customKey })).unwrap();
  } catch (err2) {
    console.warn(
      "[messageContent] upload generated image failed, drop inline payload:",
      err2
    );
    return null;
  }
  const state3 = getState();
  const { currentServer } = getRuntimeServerContext(state3);
  const fileId = metadata?.dbKey || metadata?.id;
  if (!currentServer || !fileId) {
    console.warn(
      "[messageContent] missing currentServer or fileId, drop inline payload",
      { currentServer, fileId }
    );
    return null;
  }
  if (options?.spaceId) {
    try {
      const agentPrefix = options.agentName ? `[${options.agentName}] ` : "";
      const title = `${agentPrefix}Generated Image ${index + 1}`;
      await addContentAction({
        spaceId: options.spaceId,
        contentKey: fileId,
        title,
        type: "image" /* IMAGE */
      }, { dispatch, getState });
      console.log(`[messageContent] Saved generated image to space: ${options.spaceId}`);
    } catch (err2) {
      console.error("[messageContent] Failed to save generated image to space:", err2);
    }
  }
  const imageUrl = buildMessageFileContentUrl(currentServer, fileId);
  if (!imageUrl) {
    return null;
  }
  const ready = await waitForFileReady(imageUrl);
  if (!ready) {
    console.warn(
      "[messageContent] uploaded generated image not ready, drop inline payload:",
      imageUrl
    );
    return null;
  }
  return imageUrl;
};
var normalizeAssistantContentBuffer = async (contentBuffer, dialogId, messageId, dispatch, getState, options) => {
  if (!Array.isArray(contentBuffer) || contentBuffer.length === 0) {
    return contentBuffer;
  }
  const updated = await Promise.all(
    contentBuffer.map(async (part, index) => {
      if (!part || part.type !== "image_url" || !part.image_url || !isDataUrlImage(part.image_url.url)) {
        return part;
      }
      const newUrl = await uploadGeneratedImageDataUrl(
        part.image_url.url,
        dialogId,
        messageId,
        index,
        dispatch,
        getState,
        options
      );
      if (!newUrl) {
        return {
          type: "text",
          text: "[\u56FE\u7247\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u751F\u6210\u56FE\u7247]"
        };
      }
      return stripDurableImageInlinePayload({
        ...part,
        image_url: {
          ...part.image_url,
          url: newUrl
        }
      });
    })
  );
  return updated;
};

// packages/ai/llm/getModelContextWindow.ts
var DEFAULT_CONTEXT_WINDOW = 256e3;
var QWEN_3_6_CONTEXT_WINDOW = 262144;
var GLM_5_2_CONTEXT_WINDOW = 1e6;
var ANTIGRAVITY_EFFORT_SUFFIXES = [
  "-extra-low",
  "-low",
  "-medium",
  "-high"
];
function stripEffortSuffix(model) {
  for (const suffix of ANTIGRAVITY_EFFORT_SUFFIXES) {
    if (model.endsWith(suffix) && model.length > suffix.length) {
      return model.slice(0, -suffix.length);
    }
  }
  return model;
}
function stripPreviewSuffix(model) {
  const suffix = "-preview";
  if (model.endsWith(suffix) && model.length > suffix.length) {
    return model.slice(0, -suffix.length);
  }
  return model;
}
var fullModelMap = null;
var getFullModelMap = () => {
  if (!fullModelMap) {
    fullModelMap = /* @__PURE__ */ new Map();
    for (const [provider, models] of Object.entries(MODEL_LOOKUP_MAP)) {
      for (const model of models) {
        const entry = { ...model, provider };
        fullModelMap.set(model.name, entry);
        if (model.displayName) {
          fullModelMap.set(model.displayName.toLowerCase(), entry);
        }
      }
    }
  }
  return fullModelMap;
};
var legacyModelMap = null;
var getLegacyModelMap = () => {
  if (!legacyModelMap) {
    legacyModelMap = /* @__PURE__ */ new Map();
    for (const model of ALL_MODELS) {
      legacyModelMap.set(model.name, model);
      if (model.displayName) {
        legacyModelMap.set(model.displayName.toLowerCase(), model);
      }
    }
  }
  return legacyModelMap;
};
function fuzzyContextWindow(normalizedName) {
  if (normalizedName.includes("qwen-long") || normalizedName.includes("qwen3-long")) return 10485760;
  if (normalizedName.includes("qwen-coder") || normalizedName.includes("qwen3-coder")) return 1048576;
  if (normalizedName.includes("qwen3.8") || normalizedName.includes("qwen3p8")) return 1e6;
  if (normalizedName.includes("minimax-m3") || normalizedName.includes("minimax_m3")) return 1e6;
  if (normalizedName.includes("glm-5.2") || normalizedName.includes("glm5.2")) return GLM_5_2_CONTEXT_WINDOW;
  if (normalizedName.includes("deepseek")) return 1e6;
  if (normalizedName.includes("gpt-5") || normalizedName.includes("gpt-4.1")) return 1047576;
  if (normalizedName.startsWith("cursor-grok-4.5")) return 1e6;
  if (normalizedName.includes("claude-4.6")) return 1e6;
  if (normalizedName.includes("gemini-3.1")) return 1e6;
  if (normalizedName.includes("gemini")) return 1048576;
  if (normalizedName.includes("qwen3.6") || normalizedName.includes("qwen3p6")) return QWEN_3_6_CONTEXT_WINDOW;
  if (normalizedName.includes("qwen3.7") || normalizedName.includes("qwen3p7")) return 262144;
  if (normalizedName.includes("minimax-m2") || normalizedName.includes("minimax_m2")) return 262144;
  if (normalizedName.includes("claude")) return 2e5;
  return void 0;
}
var getModelContextWindow = (modelName) => {
  if (!modelName) return DEFAULT_CONTEXT_WINDOW;
  const normalizedName = modelName.toLowerCase();
  const map = getFullModelMap();
  const candidates = [modelName, normalizedName];
  const strippedEffort = stripEffortSuffix(modelName);
  if (strippedEffort !== modelName) {
    candidates.push(strippedEffort, strippedEffort.toLowerCase());
  }
  const strippedPreview = stripPreviewSuffix(modelName);
  if (strippedPreview !== modelName) {
    candidates.push(strippedPreview, strippedPreview.toLowerCase());
  }
  if (strippedEffort !== modelName) {
    const strippedBoth = stripPreviewSuffix(strippedEffort);
    if (strippedBoth !== strippedEffort) {
      candidates.push(strippedBoth, strippedBoth.toLowerCase());
    }
  }
  for (const candidate of candidates) {
    const model = map.get(candidate);
    if (model?.contextWindow) {
      return typeof model.contextWindow === "number" ? model.contextWindow : DEFAULT_CONTEXT_WINDOW;
    }
  }
  return fuzzyContextWindow(normalizedName) ?? DEFAULT_CONTEXT_WINDOW;
};
var getModelInfo = (modelName) => {
  if (!modelName) return null;
  const map = getLegacyModelMap();
  return map.get(modelName) || map.get(modelName.toLowerCase()) || null;
};

// packages/ai/context/tokenUtils.ts
var estimateTokenCount = (text) => {
  if (!text) return 0;
  const chineseChars = (text.match(/[\u4e00-\u9fa5\u3400-\u4dbf]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars * 1.5 + otherChars * 0.25);
};
var formatTokenCount = (count) => {
  if (count < 1e3) return String(count);
  if (count < 1e4) return `${(count / 1e3).toFixed(1)}k`;
  return `${Math.round(count / 1e3)}k`;
};
var CONTEXT_BUDGET = {
  REFERENCES_MAX_PERCENT: 40,
  // References + Space Context 最大占比
  HISTORY_RESERVE_PERCENT: 40,
  // 为对话历史预留
  SYSTEM_RESERVE_PERCENT: 10,
  // 系统提示预留
  OUTPUT_RESERVE_PERCENT: 10
  // 输出预留
};

// packages/ai/context/retention.ts
var SAFE_BUFFER_RATIO = 0.95;
var CACHE_FIRST_RETENTION_STRENGTH = 0.95;
var clamp = (v, min, max) => Math.min(max, Math.max(min, v));
var planContextUsage = (params) => {
  const { contextWindow, summaryTokens, recentLoad } = params;
  const safeWindowLimit = Math.floor(contextWindow * SAFE_BUFFER_RATIO);
  const iq = CACHE_FIRST_RETENTION_STRENGTH;
  const isLargeWindow = contextWindow >= 512e3;
  const isSmallWindow = contextWindow <= 64e3;
  let baseHistoryRatio;
  if (isLargeWindow) {
    baseHistoryRatio = 0.8 + 0.2 * iq;
  } else if (isSmallWindow) {
    baseHistoryRatio = 0.35 + 0.3 * iq;
  } else {
    baseHistoryRatio = 0.55 + 0.3 * iq;
  }
  let historyRatio = baseHistoryRatio;
  switch (recentLoad) {
    case "light": {
      const maxRatio = isLargeWindow ? 1 : isSmallWindow ? 0.75 : 0.85;
      historyRatio = clamp(historyRatio * 1.05, 0.3, maxRatio);
      break;
    }
    case "heavy": {
      const maxRatio = isLargeWindow ? 0.98 : isSmallWindow ? 0.7 : 0.8;
      const multiplier = isLargeWindow ? 0.98 : isSmallWindow ? 0.9 : 0.9;
      historyRatio = clamp(historyRatio * multiplier, 0.3, maxRatio);
      break;
    }
    case "medium":
    default: {
      const maxRatio = isLargeWindow ? 1 : isSmallWindow ? 0.75 : 0.85;
      historyRatio = clamp(historyRatio, 0.3, maxRatio);
      break;
    }
  }
  const historyBudget = Math.max(
    0,
    Math.floor(safeWindowLimit * historyRatio)
  );
  const minRawRatio = isSmallWindow ? 0.5 : isLargeWindow ? 0.2 : 0.3;
  const rawMessageBudget = Math.max(
    Math.floor(historyBudget * minRawRatio),
    historyBudget - summaryTokens,
    0
  );
  let minTailTokens;
  if (recentLoad === "light") {
    minTailTokens = Math.min(
      Math.floor(safeWindowLimit * 0.3),
      8e3
    );
  } else if (recentLoad === "heavy") {
    minTailTokens = Math.max(
      Math.floor(safeWindowLimit * 0.25),
      16e3
    );
  } else {
    minTailTokens = Math.floor(safeWindowLimit * 0.2);
  }
  return { historyBudget, rawMessageBudget, minTailTokens };
};

// packages/ai/context/planCompression.ts
var MIN_COMPRESS_COUNT = 5;
var ACTIVE_SUMMARY_TAIL_KEEP_COUNT = 2;
var getMessageTokenCount = (msg) => {
  if (msg.usage?.completion_tokens) {
    return msg.usage.completion_tokens;
  }
  const content = serializeMessageContent(msg.content) || "";
  return estimateTokenCount(content);
};
var hasOpenEndedToolCall = (msg) => !!msg && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0;
var isActiveSummaryWorthDoing = (pendingTokens, contextWindow) => {
  const minTokens = Math.min(
    4e4,
    Math.max(1e4, Math.floor(contextWindow * 0.05))
  );
  return pendingTokens >= minTokens;
};
var classifyConversationLoad = (msgs) => {
  const N = 20;
  if (!Array.isArray(msgs) || msgs.length === 0) return "light";
  const tail = msgs.slice(-N);
  const tokenSamples = tail.map(getMessageTokenCount);
  if (tokenSamples.length === 0) return "light";
  const sum = tokenSamples.reduce((acc, v) => acc + v, 0);
  const avg = sum / tokenSamples.length;
  const sorted = [...tokenSamples].sort((a3, b2) => a3 - b2);
  const p95 = sorted[Math.floor((sorted.length - 1) * 0.95)];
  if (p95 < 200 && avg < 120) {
    return "light";
  }
  if (p95 > 2e3 || avg > 1200) {
    return "heavy";
  }
  return "medium";
};
var emptyPlan = (startIndex) => ({
  shouldCompress: false,
  compressCount: 0,
  msgsToCompress: [],
  msgsToKeep: [],
  newSummarizedBeforeId: void 0,
  startIndex
});
function planCompression(input) {
  const {
    allMsgs,
    summarizedBeforeId,
    summary,
    contextWindow,
    force = false,
    reason
  } = input;
  let startIndex = 0;
  if (summarizedBeforeId) {
    const found = allMsgs.findIndex((m3) => m3.id === summarizedBeforeId);
    if (found !== -1) {
      startIndex = found + 1;
    }
  }
  const pendingMsgs = allMsgs.slice(startIndex);
  if (pendingMsgs.length === 0) {
    return emptyPlan(startIndex);
  }
  const summaryTokens = estimateTokenCount(summary || "");
  const pendingTokens = pendingMsgs.reduce(
    (sum, msg) => sum + getMessageTokenCount(msg),
    0
  );
  const totalUsed = summaryTokens + pendingTokens;
  const adjustedSummaryTokens = Math.max(summaryTokens, 1e3);
  const recentLoad = classifyConversationLoad(pendingMsgs);
  const { historyBudget, rawMessageBudget } = planContextUsage({
    contextWindow,
    summaryTokens: adjustedSummaryTokens,
    recentLoad
  });
  const shouldRunActiveSummary = force && reason === "manual" && !hasOpenEndedToolCall(pendingMsgs[pendingMsgs.length - 1]) && isActiveSummaryWorthDoing(pendingTokens, contextWindow);
  if (totalUsed < historyBudget && !shouldRunActiveSummary) {
    return emptyPlan(startIndex);
  }
  let tokensToKeep = 0;
  let keepCount = 0;
  for (let i2 = pendingMsgs.length - 1; i2 >= 0; i2--) {
    const t2 = getMessageTokenCount(pendingMsgs[i2]);
    if (tokensToKeep + t2 > rawMessageBudget) break;
    tokensToKeep += t2;
    keepCount++;
  }
  let compressCount = shouldRunActiveSummary && totalUsed < historyBudget ? Math.max(0, pendingMsgs.length - ACTIVE_SUMMARY_TAIL_KEEP_COUNT) : pendingMsgs.length - keepCount;
  while (compressCount > 0 && compressCount < pendingMsgs.length && pendingMsgs[compressCount].role === "tool") {
    compressCount--;
  }
  if (compressCount > 0) {
    const lastCompressed = pendingMsgs[compressCount - 1];
    const hasToolCalls = Array.isArray(lastCompressed.tool_calls) && lastCompressed.tool_calls.length > 0;
    if (hasToolCalls) {
      compressCount--;
    }
  }
  if (compressCount < MIN_COMPRESS_COUNT) {
    return emptyPlan(startIndex);
  }
  const msgsToCompress = pendingMsgs.slice(0, compressCount);
  const msgsToKeep = pendingMsgs.slice(compressCount);
  const newSummarizedBeforeId = msgsToCompress[msgsToCompress.length - 1].id;
  return {
    shouldCompress: true,
    compressCount,
    msgsToCompress,
    msgsToKeep,
    newSummarizedBeforeId,
    startIndex
  };
}

// packages/chat/messages/parseJsonRecord.ts
function asOptionalJsonRecord(value) {
  if (typeof value === "string") {
    if (!value.trim()) return void 0;
    try {
      const parsed = JSON.parse(value);
      return isRecord(parsed) ? parsed : void 0;
    } catch {
      return void 0;
    }
  }
  return isRecord(value) ? value : void 0;
}

// packages/chat/dialog/actions/extractReferenceKeys.ts
var REFERENCE_ARG_FIELDS = [
  "pageKey",
  "dialogKey",
  "dbKey",
  "docKey",
  "key",
  "id",
  "rowDbKey",
  "tableKey",
  "table"
];
var isLoadableReferenceKey = (key) => isPageKey(key) || isDialogRecordKey(key) || isTableMetaKey(key);
var extractKeysFromArgs = (args, out) => {
  if (!args) return;
  for (const field of REFERENCE_ARG_FIELDS) {
    const value = args[field];
    const key = asTrimmedString(value);
    if (key && isLoadableReferenceKey(key)) {
      out.add(key);
    }
  }
};
var extractKeysFromToolCalls = (msg, out) => {
  const toolCalls = msg.tool_calls;
  if (!Array.isArray(toolCalls)) return;
  for (const call of toolCalls) {
    const fn = call.function;
    const argumentsText = asTrimmedString(fn.arguments);
    if (!argumentsText) continue;
    const parsed = asOptionalJsonRecord(argumentsText);
    if (parsed) extractKeysFromArgs(parsed, out);
  }
};
var extractKeysFromToolPayload = (toolPayload, out) => {
  if (!toolPayload) return;
  if (isRecord(toolPayload.input)) {
    extractKeysFromArgs(
      toolPayload.input,
      out
    );
    return;
  }
  const rawToolCall = toolPayload.rawToolCall;
  if (isRecord(rawToolCall)) {
    const fn = rawToolCall.function;
    if (isRecord(fn)) {
      const argumentsText = asTrimmedString(fn.arguments);
      if (argumentsText) {
        const parsed = asOptionalJsonRecord(argumentsText);
        if (parsed) extractKeysFromArgs(parsed, out);
      }
    }
  }
};
var extractKeysFromContent = (msg, out) => {
  const content = msg.content;
  if (!content) return;
  const parts = Array.isArray(content) ? content : [content];
  for (const part of parts) {
    if (!isRecord(part)) continue;
    const pageKey = asTrimmedString(part.pageKey);
    if (pageKey) out.add(pageKey);
    const dialogKey = asTrimmedString(part.dialogKey);
    if (dialogKey) out.add(dialogKey);
  }
};
var extractReferenceKeysFromMessage = (msg) => {
  const keys = /* @__PURE__ */ new Set();
  extractKeysFromContent(msg, keys);
  extractKeysFromToolCalls(msg, keys);
  extractKeysFromToolPayload(msg.toolPayload, keys);
  return Array.from(keys);
};

// packages/chat/dialog/actions/updateDialogSummaryAction.ts
var getMessagesForDialogFromState = (state3, dialogId) => {
  const msgsState = state3.message.dialogStateById[dialogId]?.msgs;
  if (!msgsState || !msgsState.ids) return [];
  return msgsState.ids.flatMap((id) => {
    const msg = msgsState.entities[id];
    return msg ? [msg] : [];
  });
};
var formatMessagesForSummary = (msgs) => msgs.map((m3) => {
  const content = serializeMessageContent(m3.content) || "[\u975E\u6587\u672C\u5185\u5BB9]";
  return `${m3.role}: ${content}`;
}).join("\n");
var summarizingDialogs = /* @__PURE__ */ new Set();
var updateDialogSummaryAction = async (args, thunkApi) => {
  const { dialogKey, preFetchedMessages, force = false } = args;
  if (summarizingDialogs.has(dialogKey)) return;
  summarizingDialogs.add(dialogKey);
  const { dispatch, getState } = thunkApi;
  try {
    const state3 = getState();
    const dialogId = extractCustomId(dialogKey);
    const dialogConfig = selectById(state3, dialogKey);
    if (!dialogConfig) return;
    let contextWindow = DEFAULT_CONTEXT_WINDOW;
    if (dialogConfig.cybots && dialogConfig.cybots.length > 0) {
      const agentId = dialogConfig.cybots[0];
      const agent = selectById(state3, agentId);
      if (agent?.model) {
        contextWindow = getModelContextWindow(agent.model);
      }
    }
    const allMsgs = preFetchedMessages || getMessagesForDialogFromState(state3, dialogId);
    const plan = planCompression({
      allMsgs,
      summarizedBeforeId: dialogConfig.summarizedBeforeId,
      summary: dialogConfig.summary || "",
      contextWindow,
      force,
      reason: args.reason
    });
    if (!plan.shouldCompress) return;
    const { msgsToCompress, newSummarizedBeforeId } = plan;
    const extractedKeys = new Set(dialogConfig.referenceKeys || []);
    for (const msg of msgsToCompress) {
      for (const key of extractReferenceKeysFromMessage(msg)) {
        extractedKeys.add(key);
      }
    }
    const previousSummary = dialogConfig.summary || "";
    const messagesText = formatMessagesForSummary(msgsToCompress);
    const promptContent = buildBuiltinSummaryContent(
      previousSummary,
      messagesText
    );
    try {
      const newSummary = await dispatch(
        runLlm({
          llmConfig: BUILTIN_SUMMARY_LLM_CONFIG,
          content: promptContent,
          billingDialogKey: dialogKey
        })
      ).unwrap();
      if (newSummary && typeof newSummary === "string" && newSummary.trim()) {
        const currentCount = dialogConfig.compressionCount || 0;
        await dispatch(
          patch({
            dbKey: dialogKey,
            changes: {
              summary: newSummary.trim(),
              summarizedBeforeId: newSummarizedBeforeId,
              referenceKeys: Array.from(extractedKeys),
              compressionCount: currentCount + 1,
              summaryPending: false
              // Explicitly clear pending flag
            }
          })
        ).unwrap();
        console.log(`[ContextCompression] Compressed ${plan.compressCount} messages. New summary len: ${newSummary.length}`);
      }
    } catch (err2) {
      console.error("[ContextCompression] Failed:", err2);
    }
  } finally {
    summarizingDialogs.delete(dialogKey);
  }
};

// packages/chat/messages/messageContract.ts
function separateThinkContent(contentBuffer) {
  let thinkContent = "";
  let normalContent = "";
  const combinedText = contentBuffer.flatMap(
    (c2) => c2.type === "text" && "text" in c2 && c2.text ? [c2.text] : []
  ).join("");
  const thinkMatches = combinedText.match(/<think\b[^>]*>(.*?)<\/think>/gis);
  if (thinkMatches) {
    thinkContent = thinkMatches.map((m3) => m3.replace(/<think\b[^>]*>|<\/think>/gi, "")).join("\n\n");
    normalContent = combinedText.replace(/<think\b[^>]*>.*?<\/think>/gis, "").trim();
  } else {
    normalContent = combinedText;
  }
  return { thinkContent, normalContent };
}
function countImageParts(content) {
  if (!Array.isArray(content)) return 0;
  return content.filter((part) => part?.type === "image_url").length;
}
function finalizeAssistantMessageContent(normalizedContentBuffer, reasoningBuffer = "") {
  const { thinkContent: tagThink, normalContent } = separateThinkContent(normalizedContentBuffer);
  const thinkContent = `${tagThink}${reasoningBuffer}`.trim();
  const hasNonTextParts = normalizedContentBuffer.some(
    (part) => part && part.type && part.type !== "text"
  );
  return {
    thinkContent,
    textContent: normalContent || "",
    visibleContent: hasNonTextParts ? normalizedContentBuffer : normalContent || "",
    hasNonTextParts,
    imagePartCount: countImageParts(normalizedContentBuffer)
  };
}
function appendSaveFailureToContent(content) {
  const failureText = "[Failed to save message]";
  if (Array.isArray(content)) {
    return [...content, { type: "text", text: failureText }];
  }
  if (typeof content === "string" && content.length > 0) {
    return `${content}
${failureText}`;
  }
  return failureText;
}

// packages/ai/tools/uiAskChoiceTool.ts
var uiAskChoiceFunctionSchema = {
  name: "ask_user",
  description: [
    "\u8BA9\u7528\u6237\u5728 2\uFF5E5 \u4E2A\u4E92\u65A5\u9009\u9879\u4E4B\u95F4\u505A\u9009\u62E9\u7684\u901A\u7528\u201C\u51FA\u9009\u9879\u201D\u5DE5\u5177\u3002\u9002\u7528\u573A\u666F\uFF1A\u9700\u6C42\u6A21\u7CCA\u65F6\u7ED9\u65B9\u5411\u5019\u9009\u3001\u8BA1\u5212\u5206\u652F\u8282\u70B9\u51B3\u7B56\u3001\u51FA\u9898/\u95EE\u5377\u3001\u65B0\u4F1A\u8BDD\u529F\u80FD\u5BFC\u822A\u3002",
    "\u8C03\u7528\u524D\u987B\u5148\u5728\u666E\u901A\u56DE\u590D\u6587\u672C\u91CC\u89E3\u91CA\u80CC\u666F\u4E0E\u6743\u8861\uFF08\u5148\u89E3\u91CA\uFF0C\u518D\u8C03\u7528\uFF09\u3002",
    "",
    "\u591A\u95EE\u9898 & \u591A\u9009\u652F\u6301\uFF1A",
    "- \u5F53\u4F60\u9700\u8981\u4E00\u6B21\u95EE\u591A\u4E2A\u95EE\u9898\u65F6\uFF0C\u4F7F\u7528 questions \u6570\u7EC4\u4EE3\u66FF question+choices\u3002",
    "- \u6BCF\u4E2A question \u53EF\u4EE5\u8BBE\u7F6E multiSelect: true \u5141\u8BB8\u591A\u9009\u3002",
    "- \u6BCF\u4E2A question \u53EF\u4EE5\u8BBE\u7F6E allowOther: false \u9690\u85CF\u201C\u5176\u4ED6\u201D\u8F93\u5165\u6846\u3002",
    "- \u6BCF\u4E2A choice \u53EF\u4EE5\u52A0 detail \u5B57\u6BB5\u63D0\u4F9B\u66F4\u957F\u7684\u63CF\u8FF0\u3002",
    "- \u6BCF\u4E2A choice \u53EF\u4EE5\u52A0 recommended: true \u6807\u8BB0\u4F60\u7684\u63A8\u8350\u9879\uFF08\u6709\u660E\u786E\u63A8\u8350\u65F6\u7528\uFF09\u3002",
    "",
    "\u4F55\u65F6\u8C03\u7528 / \u63A8\u8350\u4E0E\u6743\u8861 / \u8C03\u7528\u89C4\u8303\u7684\u5B8C\u6574\u884C\u4E3A\u89C4\u5219\u7531\u7CFB\u7EDF\u63D0\u793A\u7684\u300C\u4EA4\u4E92\u8BF4\u660E\u300D\u5757\u6CE8\u5165\uFF0C\u4E0D\u5728\u6B64\u91CD\u590D\u3002"
  ].join("\n"),
  parameters: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "\u5C55\u793A\u7ED9\u7528\u6237\u7684\u95EE\u9898\u6587\u6848\uFF08\u5355\u95EE\u9898\u6A21\u5F0F\uFF09\u3002\u4E0E questions \u4E8C\u9009\u4E00\u3002"
      },
      choices: {
        type: "array",
        description: "\u5907\u9009\u9879\u5217\u8868\u3002\u6BCF\u4E2A\u9009\u9879\u4F1A\u6E32\u67D3\u6210\u4E00\u4E2A\u6309\u94AE\uFF0C\u4F9B\u7528\u6237\u70B9\u51FB\u9009\u62E9\u3002",
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "\u9009\u9879\u5185\u90E8\u6807\u8BC6\uFF08\u7528\u4E8E\u540E\u7EED\u903B\u8F91\u6216\u8C03\u8BD5\uFF0C\u4E0D\u4F1A\u76F4\u63A5\u5C55\u793A\u7ED9\u7528\u6237\uFF09\u3002"
            },
            label: {
              type: "string",
              description: "\u663E\u793A\u7ED9\u7528\u6237\u770B\u7684\u6309\u94AE\u6587\u5B57\u3002\u4F8B\u5982\uFF1A\u201C\u751F\u6210\u672C\u5468\u5468\u62A5\u201D\u3002"
            },
            detail: {
              type: "string",
              description: "\u7B80\u77ED\u8865\u5145\uFF08\u5EFA\u8BAE\u4E00\u53E5\u8BDD\uFF09\uFF0C\u957F\u89E3\u91CA\u5199\u8FDB\u8C03\u7528\u524D\u7684\u56DE\u590D\u6587\u672C\u3002"
            },
            recommended: {
              type: "boolean",
              description: [
                "\u6807\u8BB0\u8FD9\u662F\u4F60\u7684\u63A8\u8350\u9879\u3002\u6709\u660E\u786E\u63A8\u8350\u65F6\u628A\u8BE5\u9009\u9879\u653E\u5728 choices \u7B2C\u4E00\u4F4D\u5E76\u7F6E true\u3002",
                "\u6CA1\u6709\u660E\u786E\u63A8\u8350\u65F6\u4E0D\u8981\u8BBE\u7F6E\uFF08\u9ED8\u8BA4 false\uFF09\uFF0C\u5E76\u5728\u8C03\u7528\u524D\u6587\u672C\u91CC\u8BF4\u660E\u5404\u9009\u9879\u4F18\u7F3A\u70B9\u3002"
              ].join(" ")
            },
            userMessage: {
              type: "string",
              description: [
                "\u7528\u6237\u70B9\u51FB\u6B64\u9009\u9879\u540E\uFF0C\u4F60\u5E0C\u671B\u4F5C\u4E3A\u4E0B\u4E00\u6761 user \u6D88\u606F\u53D1\u9001\u7ED9\u6A21\u578B\u7684\u81EA\u7136\u8BED\u8A00\u5185\u5BB9\u3002",
                "\u5EFA\u8BAE\u5199\u6210\u5B8C\u6574\u7684\u4E00\u53E5\u8BDD\uFF0C\u4F8B\u5982\uFF1A\u201C\u5E2E\u6211\u751F\u6210\u4E00\u4EFD\u672C\u5468\u7684\u5DE5\u4F5C\u5468\u62A5\u201D\u3002",
                "\u5982\u679C\u7559\u7A7A\uFF0C\u5C06\u4F7F\u7528 label \u4F5C\u4E3A userMessage\u3002"
              ].join(" ")
            }
          },
          required: ["id", "label"]
        }
      },
      questions: {
        type: "array",
        description: "\u591A\u95EE\u9898\u6A21\u5F0F\uFF1A\u4E00\u6B21\u95EE\u591A\u4E2A\u95EE\u9898\uFF0C\u6BCF\u4E2A\u95EE\u9898\u72EC\u7ACB\u6E32\u67D3\u4E3A\u4E00\u4E2A tab\u3002\u4E0E question+choices \u4E8C\u9009\u4E00\u3002",
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "\u95EE\u9898\u6807\u8BC6\uFF0C\u7528\u4E8E\u7ED3\u679C\u5BF9\u5E94\u3002"
            },
            question: {
              type: "string",
              description: "\u95EE\u9898\u6587\u6848\u3002"
            },
            choices: {
              type: "array",
              description: "\u8BE5\u95EE\u9898\u7684\u5907\u9009\u9879\u3002",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  label: { type: "string" },
                  detail: {
                    type: "string",
                    description: "\u7B80\u77ED\u8865\u5145\uFF08\u5EFA\u8BAE\u4E00\u53E5\u8BDD\uFF09\uFF0C\u957F\u89E3\u91CA\u5199\u8FDB\u8C03\u7528\u524D\u7684\u56DE\u590D\u6587\u672C\u3002"
                  },
                  recommended: {
                    type: "boolean",
                    description: "\u6807\u8BB0\u8FD9\u662F\u4F60\u7684\u63A8\u8350\u9879\uFF08\u6709\u660E\u786E\u63A8\u8350\u65F6\u7F6E true\uFF0C\u65E0\u5219\u7701\u7565\uFF09\u3002"
                  },
                  userMessage: { type: "string" }
                },
                required: ["id", "label"]
              }
            },
            multiSelect: {
              type: "boolean",
              description: "\u5141\u8BB8\u591A\u9009\u3002\u9ED8\u8BA4 false\u3002",
              default: false
            },
            allowOther: {
              type: "boolean",
              description: "\u663E\u793A\u201C\u5176\u4ED6\u201D\u81EA\u7531\u8F93\u5165\u884C\u3002\u9ED8\u8BA4 true\u3002",
              default: true
            },
            required: {
              type: "boolean",
              description: "\u662F\u5426\u5FC5\u987B\u56DE\u7B54\u624D\u80FD\u63D0\u4EA4\u3002\u9ED8\u8BA4 true\u3002",
              default: true
            }
          },
          required: ["id", "question", "choices"]
        }
      },
      blocking: {
        type: "boolean",
        description: [
          "\u662F\u5426\u9700\u8981\u7B49\u5F85\u7528\u6237\u9009\u62E9\u4E4B\u540E\uFF0C\u518D\u7EE7\u7EED\u5F53\u524D\u6D41\u7A0B\uFF08\u4F8B\u5982 Plan\uFF09\u3002",
          "\u9ED8\u8BA4 true\uFF1A\u5373\u53D1\u51FA\u95EE\u9898\u540E\uFF0C\u7B49\u5F85\u7528\u6237\u70B9\u51FB\u67D0\u4E2A\u9009\u9879\u518D\u7EE7\u7EED\u3002"
        ].join(" "),
        default: true
      }
    },
    required: []
  }
};
async function uiAskChoiceFunc(args, _thunkApi) {
  const blocking = args?.blocking !== false;
  if (Array.isArray(args?.questions) && args.questions.length > 0) {
    const firstQ = args.questions[0];
    return {
      rawData: {
        type: "ask_user",
        question: firstQ?.question ?? "",
        choices: firstQ?.choices ?? [],
        blocking,
        questions: args.questions
      },
      displayData: args.questions.map((q2) => q2.question).join(" / ")
    };
  }
  const question = String(args?.question ?? "").trim();
  const choices = Array.isArray(args?.choices) ? args.choices : [];
  if (!question || choices.length === 0) {
    throw new Error("ask_user \u9700\u8981 question+choices \u6216 questions\u3002");
  }
  return {
    rawData: {
      type: "ask_user",
      question,
      choices,
      blocking
    },
    displayData: question
  };
}

// packages/ai/policy/personalizationDialog.ts
var PERSONALIZATION_DIALOG_CATEGORY = "user-overlay-profile";
var PERSONALIZATION_DIALOG_EXTRA_TOOLS = [
  "ask_user",
  "updateUserPreferenceProfile"
];
var resolveCopyLocale = (language) => {
  const normalized = (language || "").toLowerCase();
  if (normalized.startsWith("zh-tw") || normalized.startsWith("zh-hk")) {
    return "zh-TW";
  }
  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }
  if (normalized.startsWith("ja")) {
    return "ja";
  }
  return "en";
};
var buildPersonalizationDialogTitle = (language, source = "home") => {
  const locale2 = resolveCopyLocale(language);
  const titles = {
    en: source === "signup" ? "Set Up Your AI Preferences" : "Adjust AI Preferences",
    "zh-CN": source === "signup" ? "\u5F00\u59CB\u8BBE\u7F6E\u4F60\u7684 AI \u504F\u597D" : "\u8C03\u6574 AI \u504F\u597D",
    "zh-TW": source === "signup" ? "\u958B\u59CB\u8A2D\u5B9A\u4F60\u7684 AI \u504F\u597D" : "\u8ABF\u6574 AI \u504F\u597D",
    ja: source === "signup" ? "AI \u306E\u597D\u307F\u3092\u8A2D\u5B9A\u3059\u308B" : "AI \u306E\u597D\u307F\u3092\u8ABF\u6574\u3059\u308B"
  };
  return titles[locale2];
};
var buildPersonalizationStarterPrompt = (language, source = "home") => {
  const locale2 = resolveCopyLocale(language);
  if (locale2 === "zh-CN") {
    return source === "signup" ? "\u6211\u521A\u5B8C\u6210\u6CE8\u518C\u3002\u8BF7\u4F60\u4F5C\u4E3A\u6211\u7684\u4E2A\u6027\u5316 AI \u504F\u597D\u52A9\u624B\uFF0C\u7528\u6700\u591A 3 \u4E2A\u7B80\u77ED\u95EE\u9898\u5E2E\u6211\u786E\u8BA4\u8FD9\u4E09\u4EF6\u4E8B\uFF1A1. \u6211\u504F\u597D\u7684\u4EA4\u6D41\u8BED\u6C14\uFF1B2. \u503C\u5F97\u6C89\u6DC0\u7684\u7ED3\u679C\u5E94\u8BE5\u5982\u4F55\u5904\u7406\uFF1B3. \u56DE\u7B54\u95EE\u9898\u65F6\u662F\u5426\u5E94\u8BE5\u8BFB\u53D6\u5F53\u524D\u7A7A\u95F4\uFF0C\u4EE5\u53CA\u8BFB\u53D6\u5230\u4EC0\u4E48\u7A0B\u5EA6\u3002\u8BF7\u4FDD\u6301\u7B80\u6D01\u3001\u50CF\u771F\u6B63\u7684\u5BF9\u8BDD\uFF0C\u4E0D\u8981\u4E00\u6B21\u628A\u6240\u6709\u9009\u9879\u90FD\u5806\u7ED9\u6211\u3002\u5728\u6211\u786E\u8BA4\u4E4B\u524D\uFF0C\u4E0D\u8981\u521B\u5EFA\u6587\u6863\uFF0C\u4E0D\u8981\u4FEE\u6539\u6216\u521B\u5EFA\u4EFB\u4F55 AI\u3002\u6700\u540E\u8BF7\u628A\u5EFA\u8BAE\u6574\u7406\u6210\u660E\u786E\u8BBE\u7F6E\u9879\uFF0C\u65B9\u4FBF\u6211\u786E\u8BA4\u6216\u8C03\u6574\u3002" : "\u6211\u60F3\u901A\u8FC7\u5BF9\u8BDD\u8C03\u6574\u6211\u7684 AI \u504F\u597D\u3002\u8BF7\u4F60\u4F5C\u4E3A\u4E2A\u6027\u5316 AI \u504F\u597D\u52A9\u624B\uFF0C\u7528\u6700\u591A 3 \u4E2A\u7B80\u77ED\u95EE\u9898\u5E2E\u6211\u91CD\u65B0\u786E\u8BA4\uFF1A1. \u6211\u504F\u597D\u7684\u4EA4\u6D41\u8BED\u6C14\uFF1B2. \u503C\u5F97\u6C89\u6DC0\u7684\u7ED3\u679C\u5E94\u8BE5\u5982\u4F55\u5904\u7406\uFF1B3. \u56DE\u7B54\u95EE\u9898\u65F6\u662F\u5426\u5E94\u8BE5\u8BFB\u53D6\u5F53\u524D\u7A7A\u95F4\uFF0C\u4EE5\u53CA\u8BFB\u53D6\u5230\u4EC0\u4E48\u7A0B\u5EA6\u3002\u8BF7\u4FDD\u6301\u7B80\u6D01\u3001\u50CF\u771F\u6B63\u7684\u5BF9\u8BDD\u3002\u5728\u6211\u786E\u8BA4\u4E4B\u524D\uFF0C\u4E0D\u8981\u521B\u5EFA\u6587\u6863\uFF0C\u4E0D\u8981\u4FEE\u6539\u6216\u521B\u5EFA\u4EFB\u4F55 AI\u3002\u6700\u540E\u8BF7\u628A\u5EFA\u8BAE\u6574\u7406\u6210\u660E\u786E\u8BBE\u7F6E\u9879\uFF0C\u65B9\u4FBF\u6211\u786E\u8BA4\u6216\u8C03\u6574\u3002";
  }
  if (locale2 === "zh-TW") {
    return source === "signup" ? "\u6211\u525B\u5B8C\u6210\u8A3B\u518A\u3002\u8ACB\u4F60\u4F5C\u70BA\u6211\u7684\u500B\u4EBA\u5316 AI \u504F\u597D\u52A9\u624B\uFF0C\u7528\u6700\u591A 3 \u500B\u7C21\u77ED\u554F\u984C\u5E6B\u6211\u78BA\u8A8D\u9019\u4E09\u4EF6\u4E8B\uFF1A1. \u6211\u504F\u597D\u7684\u4EA4\u6D41\u8A9E\u6C23\uFF1B2. \u503C\u5F97\u6C89\u6FB1\u7684\u7D50\u679C\u61C9\u8A72\u5982\u4F55\u8655\u7406\uFF1B3. \u56DE\u7B54\u554F\u984C\u6642\u662F\u5426\u61C9\u8A72\u8B80\u53D6\u76EE\u524D\u7A7A\u9593\uFF0C\u4EE5\u53CA\u8B80\u53D6\u5230\u4EC0\u9EBC\u7A0B\u5EA6\u3002\u8ACB\u4FDD\u6301\u7C21\u6F54\u3001\u50CF\u771F\u6B63\u7684\u5C0D\u8A71\uFF0C\u4E0D\u8981\u4E00\u6B21\u628A\u6240\u6709\u9078\u9805\u90FD\u4E1F\u7D66\u6211\u3002\u5728\u6211\u78BA\u8A8D\u4E4B\u524D\uFF0C\u4E0D\u8981\u5EFA\u7ACB\u6587\u4EF6\uFF0C\u4E0D\u8981\u4FEE\u6539\u6216\u5EFA\u7ACB\u4EFB\u4F55 AI\u3002\u6700\u5F8C\u8ACB\u628A\u5EFA\u8B70\u6574\u7406\u6210\u660E\u78BA\u8A2D\u5B9A\u9805\uFF0C\u65B9\u4FBF\u6211\u78BA\u8A8D\u6216\u8ABF\u6574\u3002" : "\u6211\u60F3\u900F\u904E\u5C0D\u8A71\u8ABF\u6574\u6211\u7684 AI \u504F\u597D\u3002\u8ACB\u4F60\u4F5C\u70BA\u500B\u4EBA\u5316 AI \u504F\u597D\u52A9\u624B\uFF0C\u7528\u6700\u591A 3 \u500B\u7C21\u77ED\u554F\u984C\u5E6B\u6211\u91CD\u65B0\u78BA\u8A8D\uFF1A1. \u6211\u504F\u597D\u7684\u4EA4\u6D41\u8A9E\u6C23\uFF1B2. \u503C\u5F97\u6C89\u6FB1\u7684\u7D50\u679C\u61C9\u8A72\u5982\u4F55\u8655\u7406\uFF1B3. \u56DE\u7B54\u554F\u984C\u6642\u662F\u5426\u61C9\u8A72\u8B80\u53D6\u76EE\u524D\u7A7A\u9593\uFF0C\u4EE5\u53CA\u8B80\u53D6\u5230\u4EC0\u9EBC\u7A0B\u5EA6\u3002\u8ACB\u4FDD\u6301\u7C21\u6F54\u3001\u50CF\u771F\u6B63\u7684\u5C0D\u8A71\u3002\u5728\u6211\u78BA\u8A8D\u4E4B\u524D\uFF0C\u4E0D\u8981\u5EFA\u7ACB\u6587\u4EF6\uFF0C\u4E0D\u8981\u4FEE\u6539\u6216\u5EFA\u7ACB\u4EFB\u4F55 AI\u3002\u6700\u5F8C\u8ACB\u628A\u5EFA\u8B70\u6574\u7406\u6210\u660E\u78BA\u8A2D\u5B9A\u9805\uFF0C\u65B9\u4FBF\u6211\u78BA\u8A8D\u6216\u8ABF\u6574\u3002";
  }
  if (locale2 === "ja") {
    return source === "signup" ? "\u767B\u9332\u3057\u305F\u3070\u304B\u308A\u3067\u3059\u3002\u3042\u306A\u305F\u306F\u79C1\u306E AI \u8A2D\u5B9A\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3068\u3057\u3066\u3001\u6700\u5927 3 \u3064\u306E\u77ED\u3044\u8CEA\u554F\u3067\u6B21\u306E 3 \u70B9\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u30021. \u597D\u307F\u306E\u8A71\u3057\u65B9 2. \u4FA1\u5024\u306E\u3042\u308B\u7D50\u679C\u3092\u3069\u306E\u3088\u3046\u306B\u77E5\u8B58\u5316\u3059\u308B\u304B 3. \u56DE\u7B54\u6642\u306B\u73FE\u5728\u306E\u30B9\u30DA\u30FC\u30B9\u3092\u8AAD\u3080\u3079\u304D\u304B\u3001\u3069\u306E\u7A0B\u5EA6\u8AAD\u3080\u304B\u3002\u9577\u3044\u8AAC\u660E\u3067\u306F\u306A\u304F\u81EA\u7136\u306A\u5BFE\u8A71\u3067\u9032\u3081\u3066\u304F\u3060\u3055\u3044\u3002\u79C1\u304C\u78BA\u8A8D\u3059\u308B\u524D\u306B\u3001\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u3092\u4F5C\u6210\u3057\u305F\u308A\u3001AI \u3092\u4F5C\u6210\u30FB\u66F4\u65B0\u3057\u305F\u308A\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002\u6700\u5F8C\u306B\u3001\u78BA\u8A8D\u3057\u3084\u3059\u3044\u8A2D\u5B9A\u9805\u76EE\u3068\u3057\u3066\u6574\u7406\u3057\u3066\u304F\u3060\u3055\u3044\u3002" : "\u4F1A\u8A71\u3057\u306A\u304C\u3089 AI \u306E\u597D\u307F\u3092\u8ABF\u6574\u3057\u305F\u3044\u3067\u3059\u3002\u3042\u306A\u305F\u306F\u8A2D\u5B9A\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3068\u3057\u3066\u3001\u6700\u5927 3 \u3064\u306E\u77ED\u3044\u8CEA\u554F\u3067\u6B21\u306E 3 \u70B9\u3092\u518D\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u30021. \u597D\u307F\u306E\u8A71\u3057\u65B9 2. \u4FA1\u5024\u306E\u3042\u308B\u7D50\u679C\u3092\u3069\u306E\u3088\u3046\u306B\u77E5\u8B58\u5316\u3059\u308B\u304B 3. \u56DE\u7B54\u6642\u306B\u73FE\u5728\u306E\u30B9\u30DA\u30FC\u30B9\u3092\u8AAD\u3080\u3079\u304D\u304B\u3001\u3069\u306E\u7A0B\u5EA6\u8AAD\u3080\u304B\u3002\u81EA\u7136\u306A\u5BFE\u8A71\u3067\u7C21\u6F54\u306B\u9032\u3081\u3066\u304F\u3060\u3055\u3044\u3002\u79C1\u304C\u78BA\u8A8D\u3059\u308B\u524D\u306B\u3001\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u3092\u4F5C\u6210\u3057\u305F\u308A\u3001AI \u3092\u4F5C\u6210\u30FB\u66F4\u65B0\u3057\u305F\u308A\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002\u6700\u5F8C\u306B\u3001\u78BA\u8A8D\u3057\u3084\u3059\u3044\u8A2D\u5B9A\u9805\u76EE\u3068\u3057\u3066\u6574\u7406\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  }
  return source === "signup" ? "I just signed up. Act as my AI personalization assistant and use at most three short questions to confirm three things: 1. the tone I prefer, 2. how reusable results should be captured, and 3. whether you should read the current space when answering, and how aggressively. Keep it concise and conversational. Do not create documents, and do not create or modify any AI before I confirm. End by summarizing the recommended settings so I can confirm or adjust them." : "I want to adjust my AI preferences through conversation. Act as my AI personalization assistant and use at most three short questions to reconfirm three things: 1. the tone I prefer, 2. how reusable results should be captured, and 3. whether you should read the current space when answering, and how aggressively. Keep it concise and conversational. Do not create documents, and do not create or modify any AI before I confirm. End by summarizing the recommended settings so I can confirm or adjust them.";
};
var buildPersonalizationRuntimeOptions = (runtimeOptions) => ({
  ...runtimeOptions,
  extraTools: Array.from(
    /* @__PURE__ */ new Set([
      ...runtimeOptions?.extraTools ?? [],
      ...PERSONALIZATION_DIALOG_EXTRA_TOOLS
    ])
  )
});
var buildPersonalizationDialogPolicyContext = () => [
  "\u5F53\u524D\u5BF9\u8BDD\u662F\u201C\u7528\u6237\u4E2A\u6027\u5316\u8BBE\u7F6E\u201D\u6A21\u5F0F\uFF0C\u4E0D\u662F\u666E\u901A\u95F2\u804A\u3002",
  "\u4F60\u7684\u76EE\u6807\u662F\u7528\u7B80\u77ED\u5BF9\u8BDD\u5E2E\u52A9\u7528\u6237\u786E\u8BA4 tone\u3001knowledge_capture\u3001space_context \u8FD9\u4E09\u9879\u504F\u597D\u3002",
  "\u5982\u679C\u7528\u6237\u5148\u4ECB\u7ECD\u81EA\u5DF1\u3001\u5DE5\u4F5C\u65B9\u5F0F\u6216\u957F\u671F\u6C9F\u901A\u504F\u597D\uFF0C\u8BF7\u628A\u8FD9\u4E9B\u53EF\u590D\u7528\u4FE1\u606F\u6574\u7406\u6210\u7B80\u6D01\u7684 globalPrompt \u8349\u6848\uFF0C\u5E76\u5728\u7528\u6237\u786E\u8BA4\u540E\u901A\u8FC7 updateUserPreferenceProfile \u4FDD\u5B58\u3002",
  "\u4F18\u5148\u4E00\u6B21\u53EA\u95EE\u4E00\u4E2A\u95EE\u9898\uFF1B\u5F53\u5B58\u5728\u6E05\u6670\u4E92\u65A5\u9009\u9879\u65F6\uFF0C\u4F18\u5148\u8C03\u7528 ask_user\u3002",
  "\u6536\u96C6\u5230\u8DB3\u591F\u4FE1\u606F\u540E\uFF0C\u8C03\u7528 updateUserPreferenceProfile \u4FDD\u5B58\u7ED3\u679C\uFF0C\u7136\u540E\u7528\u81EA\u7136\u8BED\u8A00\u603B\u7ED3\u5DF2\u4FDD\u5B58\u7684\u8BBE\u7F6E\u3002",
  "\u4FDD\u5B58\u5B8C\u6210\u540E\uFF0C\u8981\u63D0\u9192\u7528\u6237\uFF1A\u4EE5\u540E\u4E5F\u53EF\u4EE5\u5728\u8BBE\u7F6E\u91CC\u4FEE\u6539 globalPrompt \u548C\u8FD9\u4E9B\u504F\u597D\uFF0C\u6216\u8005\u518D\u6B21\u6253\u5F00\u8FD9\u4E2A\u5165\u53E3\u7EE7\u7EED\u8C03\u6574\u3002",
  "\u4E2A\u6027\u5316\u8BBE\u7F6E\u5B8C\u6210\u540E\uFF0C\u53EF\u987A\u624B\u5F15\u5BFC\u7528\u6237\u5C1D\u8BD5 1 \u5230 2 \u4E2A\u76F8\u5173\u529F\u80FD\uFF0C\u4F8B\u5982\u9996\u9875\u5FEB\u6377\u5BF9\u8BDD\u3001\u521B\u5EFA\u7B14\u8BB0\u3001\u521B\u5EFA AI\uFF0C\u4F46\u4E0D\u8981\u4E00\u6B21\u63A8\u8350\u592A\u591A\u3002",
  "\u9664\u975E\u7528\u6237\u660E\u786E\u8981\u6C42\uFF0C\u5426\u5219\u4E0D\u8981\u521B\u5EFA\u6587\u6863\uFF0C\u4E0D\u8981\u521B\u5EFA\u6216\u4FEE\u6539\u4EFB\u4F55 agent\u3002"
].join("\n");
var buildPersonalizationOpeningChoice = (language, source = "home") => {
  const locale2 = resolveCopyLocale(language);
  if (locale2 === "zh-CN") {
    return {
      question: source === "signup" ? [
        "\u4F60\u597D\uFF0C\u6211\u4F1A\u5E2E\u4F60\u5B8C\u6210 **AI \u504F\u597D\u8BBE\u7F6E\u786E\u8BA4**\u3002",
        "",
        "\u4F60\u53EF\u4EE5\u76F4\u63A5\u5FEB\u901F\u8BBE\u7F6E\uFF0C\u4E5F\u53EF\u4EE5\u5148\u505A\u4E2A\u81EA\u6211\u4ECB\u7ECD\uFF0C\u6211\u4F1A\u987A\u624B\u5E2E\u4F60\u6574\u7406\u6210\u5168\u5C40\u63D0\u793A\u8BCD\u3002",
        "",
        "\u4F60\u60F3\u600E\u4E48\u5F00\u59CB\uFF1F"
      ].join("\n") : [
        "\u6211\u4EEC\u6765\u8C03\u6574\u4E00\u4E0B\u4F60\u7684 **AI \u504F\u597D\u8BBE\u7F6E**\u3002",
        "",
        "\u4F60\u53EF\u4EE5\u76F4\u63A5\u5FEB\u901F\u8BBE\u7F6E\uFF0C\u4E5F\u53EF\u4EE5\u5148\u505A\u4E2A\u81EA\u6211\u4ECB\u7ECD\uFF0C\u6211\u4F1A\u987A\u624B\u5E2E\u4F60\u6574\u7406\u6210\u5168\u5C40\u63D0\u793A\u8BCD\u3002",
        "",
        "\u4F60\u60F3\u600E\u4E48\u5F00\u59CB\uFF1F"
      ].join("\n"),
      choices: [
        {
          id: "quick_setup",
          label: "\u76F4\u63A5\u5FEB\u901F\u8BBE\u7F6E",
          userMessage: "\u76F4\u63A5\u5F00\u59CB\u5FEB\u901F\u8BBE\u7F6E\u5427\u3002\u8BF7\u7528\u6700\u591A\u4E09\u4E2A\u7B80\u77ED\u95EE\u9898\u5E2E\u6211\u786E\u5B9A\u8BED\u6C14\u3001\u77E5\u8BC6\u6C89\u6DC0\u548C\u7A7A\u95F4\u8BFB\u53D6\u504F\u597D\u3002"
        },
        {
          id: "intro_first",
          label: "\u5148\u505A\u81EA\u6211\u4ECB\u7ECD",
          userMessage: "\u6211\u60F3\u5148\u505A\u4E2A\u81EA\u6211\u4ECB\u7ECD\u3002\u8BF7\u6839\u636E\u6211\u7684\u4ECB\u7ECD\u5E2E\u6211\u6574\u7406\u4E00\u6BB5\u9002\u5408\u5199\u8FDB\u5168\u5C40\u63D0\u793A\u8BCD\u7684\u5185\u5BB9\uFF0C\u5728\u6211\u786E\u8BA4\u540E\u4FDD\u5B58\uFF0C\u7136\u540E\u7EE7\u7EED\u5B8C\u6210\u8BED\u6C14\u3001\u77E5\u8BC6\u6C89\u6DC0\u548C\u7A7A\u95F4\u8BFB\u53D6\u8BBE\u7F6E\u3002"
        },
        {
          id: "show_capabilities",
          label: "\u5148\u770B\u770B\u4F60\u80FD\u505A\u4EC0\u4E48",
          userMessage: "\u5148\u7528\u5F88\u77ED\u7684\u8BDD\u544A\u8BC9\u6211 nolo \u5728\u8FD9\u91CC\u8FD8\u80FD\u5E2E\u6211\u505A\u4EC0\u4E48\uFF0C\u7136\u540E\u7EE7\u7EED\u5E26\u6211\u5B8C\u6210\u4E2A\u6027\u5316\u8BBE\u7F6E\u3002"
        }
      ]
    };
  }
  if (locale2 === "zh-TW") {
    return {
      question: source === "signup" ? [
        "\u4F60\u597D\uFF0C\u6211\u6703\u5E6B\u4F60\u5B8C\u6210 **AI \u504F\u597D\u8A2D\u5B9A\u78BA\u8A8D**\u3002",
        "",
        "\u4F60\u53EF\u4EE5\u76F4\u63A5\u5FEB\u901F\u8A2D\u5B9A\uFF0C\u4E5F\u53EF\u4EE5\u5148\u505A\u500B\u81EA\u6211\u4ECB\u7D39\uFF0C\u6211\u6703\u9806\u624B\u5E6B\u4F60\u6574\u7406\u6210\u5168\u57DF\u63D0\u793A\u8A5E\u3002",
        "",
        "\u4F60\u60F3\u600E\u9EBC\u958B\u59CB\uFF1F"
      ].join("\n") : [
        "\u6211\u5011\u4F86\u8ABF\u6574\u4E00\u4E0B\u4F60\u7684 **AI \u504F\u597D\u8A2D\u5B9A**\u3002",
        "",
        "\u4F60\u53EF\u4EE5\u76F4\u63A5\u5FEB\u901F\u8A2D\u5B9A\uFF0C\u4E5F\u53EF\u4EE5\u5148\u505A\u500B\u81EA\u6211\u4ECB\u7D39\uFF0C\u6211\u6703\u9806\u624B\u5E6B\u4F60\u6574\u7406\u6210\u5168\u57DF\u63D0\u793A\u8A5E\u3002",
        "",
        "\u4F60\u60F3\u600E\u9EBC\u958B\u59CB\uFF1F"
      ].join("\n"),
      choices: [
        {
          id: "quick_setup",
          label: "\u76F4\u63A5\u5FEB\u901F\u8A2D\u5B9A",
          userMessage: "\u76F4\u63A5\u958B\u59CB\u5FEB\u901F\u8A2D\u5B9A\u5427\u3002\u8ACB\u7528\u6700\u591A\u4E09\u500B\u7C21\u77ED\u554F\u984C\u5E6B\u6211\u78BA\u5B9A\u8A9E\u6C23\u3001\u77E5\u8B58\u6C89\u6FB1\u8207\u7A7A\u9593\u8B80\u53D6\u504F\u597D\u3002"
        },
        {
          id: "intro_first",
          label: "\u5148\u505A\u81EA\u6211\u4ECB\u7D39",
          userMessage: "\u6211\u60F3\u5148\u505A\u500B\u81EA\u6211\u4ECB\u7D39\u3002\u8ACB\u6839\u64DA\u6211\u7684\u4ECB\u7D39\u5E6B\u6211\u6574\u7406\u4E00\u6BB5\u9069\u5408\u5BEB\u9032\u5168\u57DF\u63D0\u793A\u8A5E\u7684\u5167\u5BB9\uFF0C\u5728\u6211\u78BA\u8A8D\u5F8C\u4FDD\u5B58\uFF0C\u7136\u5F8C\u7E7C\u7E8C\u5B8C\u6210\u8A9E\u6C23\u3001\u77E5\u8B58\u6C89\u6FB1\u8207\u7A7A\u9593\u8B80\u53D6\u8A2D\u5B9A\u3002"
        },
        {
          id: "show_capabilities",
          label: "\u5148\u770B\u770B\u4F60\u80FD\u505A\u4EC0\u9EBC",
          userMessage: "\u5148\u7528\u5F88\u77ED\u7684\u8A71\u544A\u8A34\u6211 nolo \u5728\u9019\u88E1\u9084\u80FD\u5E6B\u6211\u505A\u4EC0\u9EBC\uFF0C\u7136\u5F8C\u7E7C\u7E8C\u5E36\u6211\u5B8C\u6210\u500B\u4EBA\u5316\u8A2D\u5B9A\u3002"
        }
      ]
    };
  }
  if (locale2 === "ja") {
    return {
      question: source === "signup" ? "**AI \u306E\u597D\u307F\u8A2D\u5B9A** \u3092\u9032\u3081\u307E\u3059\u3002\n\n\u3059\u3050\u306B\u8A2D\u5B9A\u3092\u59CB\u3081\u308B\u3053\u3068\u3082\u3067\u304D\u307E\u3059\u3057\u3001\u5148\u306B\u81EA\u5DF1\u7D39\u4ECB\u3057\u3066\u3082\u3089\u3048\u308C\u3070\u3001\u305D\u306E\u5185\u5BB9\u3092 global prompt \u306B\u307E\u3068\u3081\u3089\u308C\u307E\u3059\u3002\n\n\u3069\u3046\u59CB\u3081\u307E\u3059\u304B\uFF1F" : "**AI \u306E\u597D\u307F\u8A2D\u5B9A** \u3092\u8ABF\u6574\u3057\u307E\u3057\u3087\u3046\u3002\n\n\u3059\u3050\u306B\u8A2D\u5B9A\u3092\u59CB\u3081\u308B\u3053\u3068\u3082\u3067\u304D\u307E\u3059\u3057\u3001\u5148\u306B\u81EA\u5DF1\u7D39\u4ECB\u3057\u3066\u3082\u3089\u3048\u308C\u3070\u3001\u305D\u306E\u5185\u5BB9\u3092 global prompt \u306B\u307E\u3068\u3081\u3089\u308C\u307E\u3059\u3002\n\n\u3069\u3046\u59CB\u3081\u307E\u3059\u304B\uFF1F",
      choices: [
        {
          id: "quick_setup",
          label: "\u3059\u3050\u306B\u8A2D\u5B9A\u3059\u308B",
          userMessage: "\u3059\u3050\u306B\u8A2D\u5B9A\u3092\u59CB\u3081\u305F\u3044\u3067\u3059\u3002\u6700\u59273\u3064\u306E\u77ED\u3044\u8CEA\u554F\u3067\u3001\u8A71\u3057\u65B9\u3001\u77E5\u8B58\u5316\u3001\u30B9\u30DA\u30FC\u30B9\u8AAD\u53D6\u306E\u597D\u307F\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        },
        {
          id: "intro_first",
          label: "\u5148\u306B\u81EA\u5DF1\u7D39\u4ECB\u3059\u308B",
          userMessage: "\u5148\u306B\u81EA\u5DF1\u7D39\u4ECB\u3057\u305F\u3044\u3067\u3059\u3002\u79C1\u306E\u7D39\u4ECB\u3092\u3082\u3068\u306B global prompt \u306B\u5165\u308C\u308B\u77ED\u3044\u6587\u3092\u4F5C\u3063\u3066\u3001\u78BA\u8A8D\u5F8C\u306B\u4FDD\u5B58\u3057\u3001\u305D\u306E\u3042\u3068\u6B8B\u308A\u306E\u8A2D\u5B9A\u3082\u9032\u3081\u3066\u304F\u3060\u3055\u3044\u3002"
        },
        {
          id: "show_capabilities",
          label: "\u4F55\u304C\u3067\u304D\u308B\u304B\u5148\u306B\u898B\u308B",
          userMessage: "\u5148\u306B nolo \u304C\u3053\u3053\u3067\u4F55\u3092\u3057\u3066\u304F\u308C\u308B\u306E\u304B\u3092\u77ED\u304F\u6559\u3048\u3066\u304F\u3060\u3055\u3044\u3002\u305D\u306E\u3042\u3068\u500B\u4EBA\u8A2D\u5B9A\u3092\u7D9A\u3051\u3066\u304F\u3060\u3055\u3044\u3002"
        }
      ]
    };
  }
  return {
    question: source === "signup" ? "Let's set up your **AI preferences**.\n\nWe can either start with a quick setup, or you can introduce yourself first and I'll turn that into a reusable global prompt.\n\nHow do you want to begin?" : "Let's adjust your **AI preferences**.\n\nWe can either start with a quick setup, or you can introduce yourself first and I'll turn that into a reusable global prompt.\n\nHow do you want to begin?",
    choices: [
      {
        id: "quick_setup",
        label: "Start quick setup",
        userMessage: "Start the quick setup. Ask me at most three short questions to confirm my tone, knowledge capture, and space-reading preferences."
      },
      {
        id: "intro_first",
        label: "Let me introduce myself first",
        userMessage: "I want to introduce myself first. Please turn my introduction into a concise global prompt draft, save it after I confirm, and then continue the rest of the personalization setup."
      },
      {
        id: "show_capabilities",
        label: "Show what nolo can do first",
        userMessage: "First, briefly show me what nolo can help me do here, then continue the personalization setup."
      }
    ]
  };
};
var startPersonalizationDialog = async ({
  dispatch,
  navigate,
  language,
  source = "home"
}) => {
  const result = await dispatch(
    createDialog({
      cybots: [noloAgentId],
      skipGreeting: true,
      title: buildPersonalizationDialogTitle(language, source),
      category: PERSONALIZATION_DIALOG_CATEGORY
    })
  ).unwrap();
  const dialogKey = result?.dbKey ?? "";
  const dialogSpaceId = result?.spaceId ?? null;
  if (!dialogKey) {
    throw new Error("Personalization dialog key is missing.");
  }
  await dispatch(initDialog(dialogKey)).unwrap();
  const openingChoice = buildPersonalizationOpeningChoice(language, source);
  const toolResult = await uiAskChoiceFunc(
    {
      question: openingChoice.question,
      choices: openingChoice.choices,
      blocking: true
    },
    { dispatch }
  );
  await dispatch(
    prepareAndPersistMessage({
      message: {
        role: "tool",
        toolName: uiAskChoiceFunctionSchema.name,
        cybotKey: noloAgentId,
        content: toolResult.rawData,
        displayData: toolResult.displayData
      },
      dialogConfig: {
        id: dialogKey.split("-").at(-1) ?? "",
        dbKey: dialogKey
      }
    })
  );
  navigate(buildDialogUrl(dialogKey, dialogSpaceId), {
    state: {
      isNew: true,
      personalizationSource: source
    }
  });
  return dialogKey;
};

// packages/agent-runtime/autoExecutionProfiles.ts
var createProfile = (input) => ({
  id: input.id,
  tier: input.tier,
  legacyAgentKey: input.legacyAgentKey,
  key: input.legacyAgentKey,
  name: input.name,
  provider: "nolo",
  model: input.model,
  apiSource: "platform",
  useServerProxy: true,
  rawRecord: {
    dbKey: input.legacyAgentKey,
    isPublic: true,
    provider: "nolo",
    model: input.model,
    apiSource: "platform",
    useServerProxy: true
  }
});
var FLASH_PROFILE = createProfile({
  id: "builtin:auto:deepseek-v4-flash",
  tier: "flash",
  legacyAgentKey: PUBLIC_DEEPSEEK_V4_FLASH_AGENT_KEY,
  name: "DeepSeek V4 Flash",
  model: "deepseek-v4-flash"
});
var IMAGE_PROFILE = createProfile({
  id: "builtin:auto:kimi-k2.6",
  tier: "image",
  legacyAgentKey: PUBLIC_KIMI_K26_IMAGE_AGENT_KEY,
  name: "Kimi K2.6",
  model: "kimi-k2.6"
});
var AUTO_EXECUTION_PROFILES = {
  flash: FLASH_PROFILE,
  balanced: { ...FLASH_PROFILE, tier: "balanced" },
  quality: { ...FLASH_PROFILE, tier: "quality" },
  image: IMAGE_PROFILE
};
var DEFAULT_AUTO_EXECUTION_TIER = "flash";
var DEFAULT_AUTO_EXECUTION_PROFILE = AUTO_EXECUTION_PROFILES[DEFAULT_AUTO_EXECUTION_TIER];
var resolveAutoExecutionProfile = (tier) => AUTO_EXECUTION_PROFILES[tier ?? DEFAULT_AUTO_EXECUTION_TIER] ?? DEFAULT_AUTO_EXECUTION_PROFILE;

// packages/chat/dialog/dialogAgents.ts
var normalizeAgentId = (value) => asOptionalTrimmedString(value) ?? null;
var dedupeAgentIds = (agentIds) => {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const agentId of agentIds) {
    const normalized = normalizeAgentId(agentId);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
};
var getDialogAgentIds = (dialogConfig) => {
  if (!dialogConfig) return [];
  const primaryAgentKey = normalizeAgentId(dialogConfig.primaryAgentKey);
  if (Array.isArray(dialogConfig.cybots)) {
    return dedupeAgentIds([primaryAgentKey, ...dialogConfig.cybots]);
  }
  if (primaryAgentKey) {
    return [primaryAgentKey];
  }
  const legacyAgentId = normalizeAgentId(dialogConfig.llmId);
  if (legacyAgentId) {
    return [legacyAgentId];
  }
  return [];
};
var getPrimaryDialogAgentId = (dialogConfig) => getDialogAgentIds(dialogConfig)[0] ?? null;
var addDialogAgentIds = (existingAgentIds, nextAgentIds) => {
  const merged = [...existingAgentIds, ...nextAgentIds];
  return merged.filter((id, index) => merged.indexOf(id) === index);
};
var replacePrimaryDialogAgentId = (existingAgentIds, nextPrimaryAgentId) => [
  nextPrimaryAgentId,
  ...existingAgentIds.filter((id) => id !== nextPrimaryAgentId)
];
var removeDialogAgentId = (existingAgentIds, agentIdToRemove) => existingAgentIds.filter((id) => id !== agentIdToRemove);

// packages/chat/dialog/dialogAgentPolicy.ts
var resolveDialogAgentMode = (dialog) => {
  if (dialog?.agentMode === "auto") return "auto";
  if (dialog?.agentMode === "fixed") return "fixed";
  return getPrimaryDialogAgentId(dialog) ? "fixed" : "auto";
};
var isAutoDialog = (dialog) => resolveDialogAgentMode(dialog) === "auto";
var resolveDialogAutoTier = (dialog) => {
  const tier = asOptionalTrimmedString(dialog?.autoRoute?.stickyTier);
  return tier === "flash" || tier === "balanced" || tier === "quality" || tier === "image" ? tier : void 0;
};
var resolveDialogAutoAgentConfig = (dialog) => {
  if (!isAutoDialog(dialog)) return null;
  const profile = resolveAutoExecutionProfile(resolveDialogAutoTier(dialog));
  return {
    ...profile.rawRecord,
    id: profile.id,
    name: profile.name
  };
};
var resolveDialogRuntimeAgentKey = (dialog, explicitAgentKey) => {
  const explicit = asOptionalTrimmedString(explicitAgentKey);
  if (explicit) return explicit;
  if (resolveDialogAgentMode(dialog) === "fixed") {
    const fixed = getPrimaryDialogAgentId(dialog);
    if (fixed) return fixed;
  }
  return resolveAutoExecutionProfile(
    resolveDialogAutoTier(dialog) ?? DEFAULT_AUTO_EXECUTION_PROFILE.tier
  ).legacyAgentKey;
};

// packages/chat/dialog/actions/handleSendMessageResolver.ts
function resolveHandleSendMessageContext(input) {
  const { dialogConfig, targetAgentKey, runtimeOptions } = input;
  return {
    agentKeyToUse: resolveDialogRuntimeAgentKey(dialogConfig, targetAgentKey),
    effectiveRuntimeOptions: dialogConfig.category === PERSONALIZATION_DIALOG_CATEGORY ? buildPersonalizationRuntimeOptions(runtimeOptions ?? {}) : runtimeOptions
  };
}

// packages/chat/messages/resolveMessageOwner.ts
var resolveMessageOwner = (input) => {
  const dialogConfigUserId = asOptionalTrimmedString(input.dialogConfigUserId) ?? null;
  const currentAccountUserId = asOptionalTrimmedString(input.currentAccountUserId) ?? null;
  const resolvedKeyOwner = parseOwnerUserIdFromDbKey(input.dialogKey, {
    candidateOwnerUserIds: [dialogConfigUserId, currentAccountUserId, "local"]
  });
  return dialogConfigUserId ?? resolvedKeyOwner ?? currentAccountUserId ?? "local";
};

// packages/chat/messages/messageUserPersistAssemble.ts
function assemblePersistedUserMessage(input) {
  const {
    message,
    dialogId,
    dialogKey,
    currentAccountUserId,
    dialogConfigUserId
  } = input;
  const userId = resolveMessageOwner({
    dialogConfigUserId,
    dialogKey,
    currentAccountUserId
  });
  const { key: messageDbKey2, messageId } = createDialogMessageKeyAndId(
    dialogId
  );
  const fullMessage = {
    ...message,
    id: messageId,
    dbKey: messageDbKey2,
    userId
  };
  return { fullMessage, dialogId, dialogKey };
}

// packages/chat/messages/messageStreamEndAssemble.ts
function assembleFinalAssistantMessage(input) {
  const {
    messageId,
    msgKey,
    finalVisibleContent,
    thinkContent,
    agentConfig,
    finalUsageData,
    toolCalls,
    finishReason,
    otherPersistedMessageMetadata,
    finalMetadata,
    agentName,
    userId
  } = input;
  const message = {
    id: messageId,
    dbKey: msgKey,
    content: finalVisibleContent,
    thinkContent,
    role: "assistant",
    agentKey: agentConfig.dbKey,
    cybotKey: agentConfig.dbKey,
    usage: finalUsageData,
    isStreaming: false,
    ...otherPersistedMessageMetadata,
    ...finalMetadata ? { metadata: finalMetadata } : {},
    ...agentName ? { agentName } : {},
    ...toolCalls && toolCalls.length > 0 ? { tool_calls: toolCalls } : {},
    // finishReason: 只存需要用户知道的值。
    // "stop" 是正常结束，丢弃；null/undefined 也丢弃，避免写 undefined 进记录。
    // 保留 "length" / "content_filter" / "tool_calls"，让界面能据此提示截断。
    ...finishReason && finishReason !== "stop" ? { finishReason } : {},
    // Authoritative owner last so metadata cannot overwrite it.
    userId
  };
  message.isStreaming = false;
  message.userId = userId;
  return message;
}

// packages/chat/messages/messageStreamApply.ts
function applyMessageStreamingUpsert(existing, chunk) {
  const merged = {
    isStreaming: true,
    content: "",
    thinkContent: "",
    ...chunk
  };
  merged.isStreaming = true;
  return merged;
}

// packages/ai/token/missingUsageEstimate.ts
var APPROX_CHARS_PER_TOKEN = 4;
var stringifyContent = (content) => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part) {
        return String(part.text ?? "");
      }
      return "";
    }).join("\n");
  }
  if (content == null) return "";
  return String(content);
};
var estimateMissingUsage = ({
  content,
  minimumOutputTokens = 1
}) => {
  const text = stringifyContent(content);
  const estimatedOutputTokens = Math.max(
    minimumOutputTokens,
    Math.ceil(text.length / APPROX_CHARS_PER_TOKEN)
  );
  return {
    input_tokens: 0,
    output_tokens: estimatedOutputTokens,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    billing_estimated: true
  };
};

// packages/ai/token/openaiImageGenerationUsage.ts
var isOpenAIBuiltInImageGenerationAgent = (agentConfig) => String(agentConfig?.provider || "").toLowerCase() === "openai" && !getModelInfo(String(agentConfig?.model || ""))?.hasImageOutput && !!agentConfig?.imageConfig?.enabled;
var withImageGenerationCount = (usage, imageGenerationCount) => {
  if (!usage || !Number.isFinite(imageGenerationCount) || imageGenerationCount <= 0) {
    return usage;
  }
  const existingCount = asOptionalFiniteNumber(usage.image_generation_count) ?? 0;
  return {
    ...usage,
    image_generation_count: Math.max(existingCount, imageGenerationCount)
  };
};
var countImageGenerationOutputsInContent = (content) => countImageParts(content);

// packages/chat/messages/messageStreamEndBilling.ts
function resolveStreamEndBillingUsages(input) {
  const { agentConfig, totalUsage, finalVisibleContent } = input;
  const imageGenerationCount = countImageGenerationOutputsInContent(finalVisibleContent);
  const billedUsage = isOpenAIBuiltInImageGenerationAgent(agentConfig) ? withImageGenerationCount(totalUsage, imageGenerationCount) : totalUsage;
  const estimatedUsage = estimateMissingUsage({
    content: finalVisibleContent
  });
  const billedEstimatedUsage = isOpenAIBuiltInImageGenerationAgent(agentConfig) ? withImageGenerationCount(estimatedUsage, imageGenerationCount) : estimatedUsage;
  const titleEligibleContent = serializeMessageContent(finalVisibleContent, "[\u56FE\u7247]") ?? "";
  return {
    imageGenerationCount,
    billedUsage,
    billedEstimatedUsage,
    hasReportedUsage: Boolean(totalUsage),
    titleEligible: titleEligibleContent.trim() !== ""
  };
}

// packages/chat/messages/web/toolDisplayName.ts
var TOOL_DISPLAY_NAME_DEFAULTS = {
  tool: "\u5DE5\u5177",
  listFiles: "\u6D4F\u89C8\u76EE\u5F55",
  list_files: "\u6D4F\u89C8\u76EE\u5F55",
  globFiles: "\u67E5\u627E\u6587\u4EF6",
  glob_files: "\u67E5\u627E\u6587\u4EF6",
  searchFiles: "\u641C\u7D22\u4EE3\u7801",
  search_files: "\u641C\u7D22\u4EE3\u7801",
  readFile: "\u8BFB\u53D6\u6587\u4EF6",
  read_file: "\u8BFB\u53D6\u6587\u4EF6",
  writeFile: "\u5199\u5165\u6587\u4EF6",
  write_file: "\u5199\u5165\u6587\u4EF6",
  editFile: "\u4FEE\u6539\u6587\u4EF6",
  edit_file: "\u4FEE\u6539\u6587\u4EF6",
  execShell: "\u8FD0\u884C\u547D\u4EE4",
  exec_shell: "\u8FD0\u884C\u547D\u4EE4",
  shell: "\u8FD0\u884C\u547D\u4EE4",
  searchWorkspace: "\u641C\u7D22\u5DE5\u4F5C\u533A",
  readWorkspaceFile: "\u8BFB\u53D6\u6587\u4EF6",
  writeWorkspaceFile: "\u5199\u5165\u6587\u4EF6",
  replaceWorkspaceText: "\u66FF\u6362\u6587\u672C",
  listAgents: "\u5217\u51FA\u52A9\u624B",
  readAgent: "\u8BFB\u53D6\u52A9\u624B",
  callAgent: "\u8C03\u7528\u52A9\u624B",
  exa_search: "\u641C\u7D22",
  firecrawl_scrape: "\u7F51\u9875\u6293\u53D6",
  firecrawl_search: "\u7F51\u9875\u641C\u7D22",
  startPreview: "\u542F\u52A8\u9884\u89C8",
  getPreviewStatus: "\u9884\u89C8\u72B6\u6001",
  stopPreview: "\u505C\u6B62\u9884\u89C8",
  releasePreview: "\u91CA\u653E\u9884\u89C8",
  captureVisualState: "\u622A\u56FE\u68C0\u67E5",
  fetchWebpage: "\u6293\u53D6\u7F51\u9875",
  fetch_webpage: "\u6293\u53D6\u7F51\u9875",
  loadSkill: "\u52A0\u8F7D\u6280\u80FD"
};
function normalizeToolNameKey(toolName) {
  let normalized = asTrimmedString(toolName);
  if (!normalized) return "";
  normalized = normalized.replace(/^functions\./, "").replace(/^tools\./, "");
  if (TOOL_DISPLAY_NAME_DEFAULTS[normalized]) return normalized;
  if (normalized.includes("_")) {
    const camel = normalized.replace(/_([a-z])/g, (_, c2) => c2.toUpperCase());
    if (TOOL_DISPLAY_NAME_DEFAULTS[camel]) return camel;
  }
  return normalized;
}
function resolveToolDisplayName(toolName, translate) {
  const normalized = normalizeToolNameKey(toolName);
  if (!normalized) {
    const fallback2 = TOOL_DISPLAY_NAME_DEFAULTS.tool;
    return translate ? translate("toolNames.tool", fallback2) : fallback2;
  }
  const fallback = TOOL_DISPLAY_NAME_DEFAULTS[normalized] ?? normalized;
  if (!translate) return fallback;
  const translated = asTrimmedString(translate(`toolNames.${normalized}`, fallback));
  if (!translated || translated === `toolNames.${normalized}` || translated === normalized || translated === toolName) {
    return fallback;
  }
  if (normalized === "execShell" && (translated === "\u547D\u4EE4\u884C" || translated === "\u547D\u4EE4\u5217")) {
    return fallback;
  }
  return translated;
}
function createToolNameTranslator(t2) {
  return (key, fallback) => {
    try {
      const value = t2(key, { defaultValue: fallback });
      return typeof value === "string" && value.trim() ? value : fallback;
    } catch {
      return fallback;
    }
  };
}
var LEGACY_VERSION_ACTIVITY_TITLES = {
  \u7528\u7248\u672C\u7BA1\u7406\u68C0\u67E5\u6539\u52A8: "\u68C0\u67E5\u6539\u52A8",
  \u7528\u7248\u672C\u7BA1\u7406\u67E5\u770B\u6539\u52A8: "\u67E5\u770B\u6539\u52A8",
  \u7528\u7248\u672C\u7BA1\u7406\u67E5\u770B\u5386\u53F2: "\u67E5\u770B\u5386\u53F2",
  \u7528\u7248\u672C\u7BA1\u7406\u6682\u5B58\u6539\u52A8: "\u6682\u5B58",
  \u7528\u7248\u672C\u7BA1\u7406\u4FDD\u5B58\u6539\u52A8: "\u63D0\u4EA4",
  \u7528\u7248\u672C\u7BA1\u7406\u540C\u6B65\u6539\u52A8: "\u63A8\u9001"
};
function shortenActivityTitle(title) {
  const trimmed = title.trim();
  if (!trimmed) return trimmed;
  const mapped = LEGACY_VERSION_ACTIVITY_TITLES[trimmed];
  if (mapped) return mapped;
  if (trimmed.startsWith("\u7528\u7248\u672C\u7BA1\u7406")) {
    const rest = trimmed.slice("\u7528\u7248\u672C\u7BA1\u7406".length).trim();
    return rest || trimmed;
  }
  return trimmed;
}
function formatToolInvocationSummary(messages, translate) {
  const counts = /* @__PURE__ */ new Map();
  for (const msg of messages) {
    const name = msg.toolName || "tool";
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return Array.from(counts.entries()).map(([name, count]) => `${resolveToolDisplayName(name, translate)} \xD7 ${count}`).join("\u3001");
}
function formatToolGroupHeaderSummary(messages, translate) {
  const counts = /* @__PURE__ */ new Map();
  for (const msg of messages) {
    const activity = readMessageActivity(msg);
    const activityTitle = asOptionalTrimmedString(
      activity?.action?.title ?? activity?.title
    );
    if (activityTitle) {
      const shortTitle = shortenActivityTitle(activityTitle);
      counts.set(shortTitle, (counts.get(shortTitle) || 0) + 1);
      continue;
    }
    const toolLabel = resolveToolDisplayName(msg.toolName || "tool", translate);
    counts.set(toolLabel, (counts.get(toolLabel) || 0) + 1);
  }
  if (counts.size === 0) {
    return formatToolInvocationSummary(messages, translate);
  }
  return Array.from(counts.entries()).map(([label, count]) => `${label} \xD7 ${count}`).join("\u3001");
}
function truncateWithEllipsis(value, maxLength) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}\u2026`;
}
function extractToolCallArgs(toolPayload) {
  if (isRecord(toolPayload?.input)) {
    return toolPayload.input;
  }
  const rawArguments = toolPayload?.rawToolCall;
  if (isRecord(rawArguments)) {
    const fn = rawArguments.function;
    if (isRecord(fn)) {
      const argumentsText = asTrimmedString(fn.arguments);
      if (argumentsText) {
        const parsed = asOptionalJsonRecord(argumentsText);
        if (parsed) return parsed;
      }
    }
  }
  return void 0;
}
function formatToolRowHeaderSummary(args) {
  const translate = args.translate ?? ((_key, fallback) => fallback);
  const normalizedToolName = asTrimmedString(args.toolName) || "tool";
  const displayToolName = resolveToolDisplayName(normalizedToolName, translate);
  const normalizedExistingSummary = asOptionalTrimmedString(args.existingSummary);
  if (normalizedExistingSummary) {
    const shortExisting = shortenActivityTitle(normalizedExistingSummary);
    const sameAsToolName = shortExisting.localeCompare(normalizedToolName, void 0, {
      sensitivity: "accent"
    }) === 0;
    if (!sameAsToolName && shortExisting.length > normalizedToolName.length) {
      return shortExisting;
    }
  }
  const toolArgs = args.toolArgs ?? void 0;
  let detail;
  switch (normalizedToolName) {
    case "readFile":
    case "writeFile":
    case "editFile":
    case "listFiles":
      detail = asOptionalTrimmedString(toolArgs?.path);
      break;
    case "searchFiles":
      detail = asOptionalTrimmedString(toolArgs?.query);
      break;
    case "fetchWebpage":
    case "fetch_webpage":
      detail = asOptionalTrimmedString(toolArgs?.url);
      break;
    case "globFiles":
      detail = asOptionalTrimmedString(toolArgs?.pattern) ?? asOptionalTrimmedString(toolArgs?.glob);
      break;
    case "execShell":
      detail = asOptionalTrimmedString(toolArgs?.cmd) ?? asOptionalTrimmedString(toolArgs?.command);
      if (detail) detail = truncateWithEllipsis(detail, 80);
      break;
    case "loadSkill":
      detail = asOptionalTrimmedString(toolArgs?.name);
      break;
    case "listAgents":
    case "readAgent":
    case "callAgent":
      detail = asOptionalTrimmedString(toolArgs?.name) ?? asOptionalTrimmedString(toolArgs?.agentKey);
      break;
    default:
      detail = void 0;
      break;
  }
  if (!detail) return displayToolName;
  return `${displayToolName} \xB7 ${truncateWithEllipsis(detail, 60)}`;
}
var SHELL_COMMAND_CLASSIFIERS = [
  {
    pattern: /\bgit\s+(status)\b/,
    label: () => "\u68C0\u67E5\u6539\u52A8"
  },
  {
    pattern: /\bgit\s+diff\b/,
    label: () => "\u67E5\u770B\u6539\u52A8"
  },
  {
    pattern: /\bgit\s+log\b/,
    label: () => "\u67E5\u770B\u5386\u53F2"
  },
  {
    pattern: /\bgit\s+add\b/,
    label: () => "\u6682\u5B58"
  },
  {
    pattern: /\bgit\s+commit\b/,
    label: () => "\u63D0\u4EA4"
  },
  {
    pattern: /\bgit\s+push\b/,
    label: () => "\u63A8\u9001"
  },
  {
    pattern: /\bgit\s+pull\b/,
    label: () => "\u62C9\u53D6"
  },
  {
    pattern: /\bgit\s+fetch\b/,
    label: () => "\u83B7\u53D6\u66F4\u65B0"
  },
  {
    pattern: /\bgit\s+checkout\b|\bgit\s+switch\b/,
    label: () => "\u5207\u6362\u5206\u652F"
  },
  {
    pattern: /\bgit\s+branch\b/,
    label: () => "\u67E5\u770B\u5206\u652F"
  },
  {
    pattern: /\bgit\s+stash\b/,
    label: () => "\u8D2E\u85CF"
  },
  {
    pattern: /\bgit\s+merge\b/,
    label: () => "\u5408\u5E76"
  },
  {
    pattern: /\bgit\s+rebase\b/,
    label: () => "\u53D8\u57FA"
  },
  {
    pattern: /\bgit\s+clone\b/,
    label: () => "\u514B\u9686"
  },
  {
    pattern: /\bgit\s+remote\b/,
    label: () => "\u8FDC\u7A0B"
  },
  {
    pattern: /\bgit\s+reset\b/,
    label: () => "\u91CD\u7F6E"
  },
  {
    pattern: /\bgit\s+restore\b/,
    label: () => "\u8FD8\u539F"
  },
  {
    pattern: /\bgit\b/,
    label: () => "\u7248\u672C\u64CD\u4F5C"
  },
  {
    pattern: /\b(rg|grep)\b/,
    label: (cmd) => {
      const match2 = cmd.match(/(?:rg|grep)\s+(?:-[^\s]*\s+)*['"]?([^\s'"]+)['"]?/);
      return match2 ? `\u641C\u7D22 "${match2[1]}"` : "\u641C\u7D22\u4EE3\u7801";
    }
  },
  {
    pattern: /\b(bun\s+test|jest|vitest|mocha|pytest|go\s+test)\b/,
    label: () => "\u8FD0\u884C\u6D4B\u8BD5"
  },
  {
    pattern: /\b(bun\s+run\s+build|npm\s+run\s+build|yarn\s+build|make\s+build)\b/,
    label: () => "\u6784\u5EFA\u9879\u76EE"
  },
  {
    pattern: /\b(bun\s+install|npm\s+install|yarn\s+install|pnpm\s+install)\b/,
    label: () => "\u5B89\u88C5\u4F9D\u8D56"
  },
  {
    pattern: /\b(bun\s+run\s+dev|npm\s+run\s+dev|yarn\s+dev)\b/,
    label: () => "\u542F\u52A8\u5F00\u53D1\u670D\u52A1\u5668"
  },
  {
    pattern: /\bcurl\b/,
    label: (cmd) => {
      const match2 = cmd.match(/curl\s+(?:-[^\s]*\s+)*(https?:\/\/[^\s'"]+)/);
      return match2 ? `\u8BF7\u6C42 ${match2[1]}` : "\u53D1\u9001 HTTP \u8BF7\u6C42";
    }
  },
  {
    pattern: /\blsof\b/,
    label: () => "\u67E5\u770B\u7AEF\u53E3\u5360\u7528"
  }
];
function classifyShellCommand(command) {
  const trimmed = command.trim();
  for (const { pattern, label } of SHELL_COMMAND_CLASSIFIERS) {
    if (pattern.test(trimmed)) return label(trimmed);
  }
  return "\u8FD0\u884C\u547D\u4EE4";
}
function buildFallbackActivity(toolName, args) {
  const normalized = asTrimmedString(toolName);
  if (!normalized || !args) return void 0;
  switch (normalized) {
    case "readFile": {
      const path = asTrimmedString(args.path);
      return path ? { title: "\u67E5\u770B\u76F8\u5173\u6587\u4EF6", refs: [{ type: "file", path }] } : void 0;
    }
    case "writeFile": {
      const path = asTrimmedString(args.path);
      return path ? { title: "\u5199\u5165\u6587\u4EF6", refs: [{ type: "file", path }] } : void 0;
    }
    case "editFile": {
      const path = asTrimmedString(args.path);
      return path ? { title: "\u4FEE\u6539\u6587\u4EF6", refs: [{ type: "file", path }] } : void 0;
    }
    case "searchFiles": {
      const query = asTrimmedString(args.query);
      return query ? { title: "\u5728\u4EE3\u7801\u91CC\u627E\u7EBF\u7D22", detail: query } : void 0;
    }
    case "globFiles": {
      const pattern = asTrimmedString(
        typeof args.pattern === "string" ? args.pattern : args.glob
      );
      return pattern ? { title: "\u67E5\u627E\u76F8\u5173\u6587\u4EF6", detail: pattern } : void 0;
    }
    case "listFiles": {
      const path = asTrimmedString(args.path) || ".";
      return {
        title: "\u6D4F\u89C8\u76EE\u5F55",
        detail: path,
        refs: [{ type: "file", path }]
      };
    }
    case "loadSkill": {
      const name = asTrimmedString(args.name);
      return name ? { title: "\u52A0\u8F7D\u6280\u80FD", detail: name } : void 0;
    }
    case "execShell": {
      const command = asTrimmedString(
        typeof args.cmd === "string" ? args.cmd : args.command
      );
      if (!command) return void 0;
      const label = classifyShellCommand(command);
      return { title: label, detail: command.length <= 120 ? command : `${command.slice(0, 117)}...` };
    }
    default:
      return void 0;
  }
}
function normalizeString(value) {
  return asOptionalTrimmedString(value);
}
function normalizeStatus(value) {
  return value === "pending" || value === "running" || value === "success" || value === "failed" ? value : void 0;
}
function normalizeKind(value) {
  return value === "read" || value === "write" || value === "edit" || value === "search" || value === "terminal" || value === "version" || value === "test" || value === "build" || value === "preview" || value === "other" ? value : void 0;
}
function normalizeRefs(value) {
  if (!Array.isArray(value)) return void 0;
  const refs = value.flatMap((item) => {
    if (!isRecord(item)) return [];
    if (item.type === "file") {
      const path = normalizeString(item.path);
      return path ? [{ type: "file", path }] : [];
    }
    if (item.type === "terminal") {
      const id = normalizeString(item.id);
      const label = normalizeString(item.label);
      return id || label ? [{ type: "terminal", ...id ? { id } : {}, ...label ? { label } : {} }] : [];
    }
    if (item.type === "url") {
      const url = normalizeString(item.url);
      const label = normalizeString(item.label);
      return url ? [{ type: "url", url, ...label ? { label } : {} }] : [];
    }
    return [];
  });
  return refs.length ? refs : void 0;
}
function normalizeActivityAction(value) {
  if (!isRecord(value)) return void 0;
  const title = normalizeString(value.title);
  if (!title) return void 0;
  const detail = normalizeString(value.detail);
  const kind = normalizeKind(value.kind);
  const refs = normalizeRefs(value.refs);
  return {
    title: shortenActivityTitle(title),
    ...kind ? { kind } : {},
    ...detail ? { detail } : {},
    ...refs ? { refs } : {}
  };
}
function normalizeActivityPhase(value) {
  if (!isRecord(value)) return void 0;
  const title = normalizeString(value.title);
  if (!title) return void 0;
  const id = normalizeString(value.id) || title.toLowerCase().replace(/\s+/g, "-");
  const index = asOptionalFiniteNumber(value.index);
  const total = asOptionalFiniteNumber(value.total);
  const status = normalizeStatus(value.status);
  return {
    id,
    title,
    ...index !== void 0 ? { index } : {},
    ...total !== void 0 ? { total } : {},
    ...status ? { status } : {}
  };
}
function normalizeActivityPlan(value) {
  if (!isRecord(value)) return void 0;
  if (!Array.isArray(value.phases)) return void 0;
  const phases = value.phases.flatMap((item, index) => {
    const phase = normalizeActivityPhase(item);
    if (!phase) return [];
    return [{
      id: phase.id,
      title: phase.title,
      index: phase.index ?? index + 1,
      ...phase.status ? { status: phase.status } : {}
    }];
  });
  if (phases.length === 0) return void 0;
  const title = normalizeString(value.title);
  return {
    ...title ? { title } : {},
    phases
  };
}
function normalizeActivitySignal(value) {
  if (!isRecord(value)) return void 0;
  const nestedAction = normalizeActivityAction(value.action);
  const legacyAction = normalizeActivityAction(value);
  const action2 = nestedAction || legacyAction;
  const phase = normalizeActivityPhase(value.phase);
  const plan = normalizeActivityPlan(value.plan);
  if (!action2 && !phase && !plan) return void 0;
  return {
    ...action2 ? { action: action2 } : {},
    ...phase ? { phase } : {},
    ...plan ? { plan } : {}
  };
}
function normalizeToolActivity(value) {
  const signal = normalizeActivitySignal(value);
  if (!signal?.action) return void 0;
  return {
    ...signal.action,
    ...signal.phase ? { phase: signal.phase } : {},
    ...signal.action ? { action: signal.action } : {},
    ...signal.plan ? { plan: signal.plan } : {}
  };
}
function formatActivityAction(activity) {
  const firstRef = activity.refs?.[0];
  const refLabel = firstRef?.type === "file" ? firstRef.path : firstRef?.type === "terminal" ? firstRef.label || firstRef.id : firstRef?.type === "url" ? firstRef.label || firstRef.url : void 0;
  const suffix = refLabel || activity.detail;
  return suffix ? `${activity.title} \xB7 ${suffix}` : activity.title;
}
function getMessageStatus(msg) {
  const rawData = typeof msg?.content === "string" ? asOptionalJsonRecord(msg.content) : msg?.content;
  const isError2 = msg?.toolPayload?.status === "failed" || !!msg?.toolPayload?.error || !!rawData?.error;
  if (msg?.isStreaming || msg?.toolPayload?.status === "running") return "running";
  if (isError2) return "failed";
  if (msg?.toolPayload?.status === "pending") return "pending";
  return "success";
}
function mergeStatuses(current2, next) {
  if (current2 === "running" || next === "running") return "running";
  if (current2 === "failed" || next === "failed") return "failed";
  if (current2 === "pending" || next === "pending") return "pending";
  return "success";
}
function readMessageActivity(msg) {
  const meta = msg.metadata;
  const explicit = normalizeToolActivity(meta?.activity) || normalizeToolActivity(msg.toolPayload?.activity);
  if (explicit) return explicit;
  const parsedArgs = tryParseToolArgs(msg);
  const fallback = buildFallbackActivity(msg.toolName, parsedArgs);
  return fallback ? normalizeToolActivity(fallback) : void 0;
}
function readMessageActivitySignal(msg) {
  const meta = msg.metadata;
  const explicit = normalizeActivitySignal(meta?.activity) || normalizeActivitySignal(msg.toolPayload?.activity);
  if (explicit) return explicit;
  const parsedArgs = tryParseToolArgs(msg);
  const fallback = buildFallbackActivity(msg.toolName, parsedArgs);
  const fallbackActivity = fallback ? normalizeToolActivity(fallback) : void 0;
  return fallbackActivity ? {
    action: fallbackActivity.action || fallbackActivity,
    ...fallbackActivity.phase ? { phase: fallbackActivity.phase } : {},
    ...fallbackActivity.plan ? { plan: fallbackActivity.plan } : {}
  } : void 0;
}
function readMessageActivityPlan(msg) {
  const meta = msg.metadata;
  const metadataActivity = isRecord(meta?.activity) ? meta.activity : void 0;
  const payloadActivity = isRecord(msg.toolPayload?.activity) ? msg.toolPayload.activity : void 0;
  return normalizeActivitySignal(metadataActivity)?.plan || normalizeActivitySignal(payloadActivity)?.plan;
}
function buildActivityTimeline(messages, activityPlan, options = {}) {
  const phases = [];
  const phaseById = /* @__PURE__ */ new Map();
  let implicitPhase;
  let declaredTotal = 0;
  const includePlan = options.includePlan !== false;
  const declaredPlan = includePlan ? normalizeActivityPlan(activityPlan) || messages.map(readMessageActivityPlan).find(Boolean) : void 0;
  const ensurePlanPhase = (phaseDef) => {
    let phase = phaseById.get(phaseDef.id);
    if (!phase) {
      phase = {
        id: phaseDef.id,
        title: phaseDef.title,
        ...phaseDef.index !== void 0 ? { index: phaseDef.index } : {},
        ...declaredPlan ? { total: declaredPlan.phases.length } : {},
        status: phaseDef.status || "pending",
        actions: []
      };
      phaseById.set(phaseDef.id, phase);
      phases.push(phase);
    }
    return phase;
  };
  if (declaredPlan) {
    declaredTotal = declaredPlan.phases.length;
    for (const phaseDef of declaredPlan.phases) {
      ensurePlanPhase(phaseDef);
    }
  }
  for (const msg of messages) {
    const signal = readMessageActivitySignal(msg);
    if (!signal) continue;
    if (includePlan && !declaredPlan && signal.plan) {
      declaredTotal = Math.max(declaredTotal, signal.plan.phases.length);
      for (const phaseDef2 of signal.plan.phases) {
        ensurePlanPhase(phaseDef2);
      }
    }
    const status = getMessageStatus(msg);
    const activityAction = signal.action;
    const phaseDef = signal.phase;
    if (!activityAction && !phaseDef) continue;
    const phaseId = phaseDef?.id || "__implicit_tools__";
    const phaseTitle = phaseDef?.title || "\u6267\u884C\u5DE5\u5177\u6B65\u9AA4";
    const phaseStatus = phaseDef?.status || (activityAction ? status : "pending");
    let phase = phaseById.get(phaseId);
    if (!phase) {
      phase = {
        id: phaseId,
        title: phaseTitle,
        ...phaseDef?.index !== void 0 ? { index: phaseDef.index } : {},
        ...phaseDef?.total !== void 0 ? { total: phaseDef.total } : {},
        status: phaseStatus,
        actions: []
      };
      phaseById.set(phaseId, phase);
      phases.push(phase);
      if (!phaseDef) implicitPhase = phase;
    } else {
      phase.status = mergeStatuses(phase.status, phaseStatus);
      if (phase.status === "pending") {
        phase.status = phaseStatus;
      }
    }
    if (phaseDef?.total && phaseDef.total > declaredTotal) {
      declaredTotal = phaseDef.total;
    }
    if (activityAction) {
      const action2 = {
        ...activityAction,
        id: normalizeString(msg.id) || normalizeString(msg.dbKey) || normalizeString(msg.toolCallId) || normalizeString(msg.tool_call_id) || `tool-action-${phase.actions.length + 1}`,
        label: formatActivityAction(activityAction),
        status,
        message: msg
      };
      phase.actions.push(action2);
    }
  }
  if (implicitPhase && phases.length > 1 && implicitPhase.actions.length === 0) {
    phaseById.delete(implicitPhase.id);
  }
  const completedPhases = phases.filter((phase) => phase.status === "success").length;
  return {
    phases,
    completedPhases,
    totalPhases: declaredTotal || phases.length
  };
}
function tryParseToolArgs(msg) {
  const payloadArgs = extractToolCallArgs(msg.toolPayload);
  if (payloadArgs) return payloadArgs;
  const meta = msg.metadata;
  if (meta) {
    const derived = {};
    let hasField = false;
    const path = normalizeString(meta.path);
    if (path) {
      derived.path = path;
      hasField = true;
    }
    const command = normalizeString(meta.command);
    if (command) {
      derived.command = command;
      hasField = true;
    }
    const cmd = normalizeString(meta.cmd);
    if (cmd) {
      derived.cmd = cmd;
      hasField = true;
    }
    const query = normalizeString(meta.query);
    if (query) {
      derived.query = query;
      hasField = true;
    }
    const pattern = normalizeString(meta.pattern);
    if (pattern) {
      derived.pattern = pattern;
      hasField = true;
    }
    if (hasField) return derived;
  }
  const content = normalizeString(msg.content);
  if (content) {
    try {
      const parsed = JSON.parse(content);
      if (isRecord(parsed)) {
        return parsed;
      }
    } catch {
    }
  }
  return void 0;
}

// packages/chat/messages/activityCompletion.ts
var FINAL_DELIVERY_PHASE_PATTERNS = [
  /汇报/,
  /回复/,
  /总结/,
  /结果/,
  /交付/,
  /可视化/,
  /图表/,
  /report/i,
  /deliver/i,
  /result/i,
  /summary/i,
  /visual/i,
  /chart/i
];
var FAILED_FINAL_CONTENT_PATTERNS = [
  /抱歉/,
  /无法/,
  /不能/,
  /失败/,
  /出错/,
  /未完成/,
  /cannot/i,
  /can't/i,
  /failed/i,
  /error/i,
  /unable/i
];
function isLikelyFinalDeliveryPhase(title) {
  return FINAL_DELIVERY_PHASE_PATTERNS.some((pattern) => pattern.test(title));
}
function isLikelyFailedFinalContent(text) {
  return FAILED_FINAL_CONTENT_PATTERNS.some((pattern) => pattern.test(text));
}
function inferAssistantActivityCompletionMetadata({
  messages,
  finalContent
}) {
  const finalText = serializeMessageContent(finalContent, "[\u56FE\u7247]")?.trim();
  if (!finalText || isLikelyFailedFinalContent(finalText)) return void 0;
  const timeline = buildActivityTimeline(messages);
  if (timeline.totalPhases <= 1 || timeline.completedPhases >= timeline.totalPhases) {
    return void 0;
  }
  const finalPhase = timeline.phases[timeline.phases.length - 1];
  if (!finalPhase || finalPhase.status !== "pending") return void 0;
  const priorPhases = timeline.phases.slice(0, -1);
  if (priorPhases.length === 0 || priorPhases.some((phase) => phase.status !== "success")) {
    return void 0;
  }
  if (!isLikelyFinalDeliveryPhase(finalPhase.title)) return void 0;
  return {
    activity: {
      phase: {
        id: finalPhase.id,
        title: finalPhase.title,
        ...finalPhase.index !== void 0 ? { index: finalPhase.index } : {},
        ...finalPhase.total !== void 0 ? { total: finalPhase.total } : {},
        status: "success"
      }
    }
  };
}

// packages/chat/messages/messageStreamEndFinalMetadata.ts
function resolveStreamEndFinalMetadata(input) {
  const { persistedMetadata, toolCalls, messages, finalContent } = input;
  const shouldInfer = !persistedMetadata?.activity && (!toolCalls || toolCalls.length === 0);
  const inferred = shouldInfer ? inferAssistantActivityCompletionMetadata({
    messages,
    finalContent
  }) : void 0;
  const finalMetadata = inferred ? { ...persistedMetadata ?? {}, ...inferred } : persistedMetadata ?? void 0;
  return { finalMetadata };
}

// packages/chat/messages/messageStreamEndPostWritePolicy.ts
function resolveStreamEndPostWritePolicy(input) {
  const { hasReportedUsage, agentProvider, titleEligible, textContent, toolCalls } = input;
  const billingMode = hasReportedUsage ? "reported" : agentProvider && agentProvider !== "custom" ? "estimated" : "skip";
  const hasText = textContent.trim() !== "";
  const noTools = !toolCalls || toolCalls.length === 0;
  return {
    billingMode,
    updateTitle: titleEligible,
    updateSummary: hasText,
    addRefs: hasText,
    summaryForce: noTools,
    summaryReason: noTools ? "task_completed" : "context_budget"
  };
}

// packages/chat/messages/messageStreamEndPersistPrep.ts
function prepareStreamEndPersistInputs(input) {
  const { totalUsage, agentConfig, messageMetadata } = input;
  const completionTokens = totalUsage?.completion_tokens ?? totalUsage?.output_tokens;
  const finalUsageData = totalUsage && completionTokens != null ? { completion_tokens: completionTokens } : void 0;
  const agentName = asTrimmedString(agentConfig?.name) || void 0;
  const {
    imageGenerationState: _transientImageGenerationState,
    ...persistedMessageMetadata
  } = messageMetadata ?? {};
  const {
    metadata: persistedMetadata,
    ...otherPersistedMessageMetadata
  } = persistedMessageMetadata;
  return {
    finalUsageData,
    agentName,
    persistedMetadata,
    otherPersistedMessageMetadata
  };
}

// packages/chat/messages/messageUnderstandingCapture.ts
function getLatestUserInputFromMessages(messages) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role !== "user") continue;
    const serialized = serializeMessageContent(message.content, "[\u56FE\u7247]")?.trim();
    if (serialized) return serialized;
  }
  return null;
}
function getDialogSpaceIdFromState(state3, dialogKey) {
  if (!dialogKey) return void 0;
  const dialog = selectById(state3, dialogKey);
  return typeof dialog?.spaceId === "string" ? dialog.spaceId : void 0;
}
function resolveMemoryCaptureBaseUrl(state3) {
  const currentServer = typeof state3?.settings?.currentServer === "string" ? state3.settings.currentServer : null;
  const _window = globalThis.window;
  if (!_window) return (currentServer || "").replace(/\/+$/, "");
  if (!currentServer) return _window.location.origin;
  return currentServer.replace(/\/+$/, "");
}
async function captureUnderstandingFromCompletedUiTurn(input) {
  if (input.assistantText.trim() === "") return;
  if (input.toolCalls && input.toolCalls.length > 0) return;
  if (!input.agentKey) return;
  const latestUserInput = getLatestUserInputFromMessages(input.messages);
  if (!latestUserInput) return;
  const state3 = input.state;
  const token = typeof state3?.auth?.currentToken === "string" ? state3.auth.currentToken : null;
  const baseUrl = resolveMemoryCaptureBaseUrl(state3);
  if (!token || !baseUrl) return;
  const dialog = input.dialogKey ? selectById(state3, input.dialogKey) : void 0;
  try {
    await fetch(`${baseUrl}/api/memory/capture-turn`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        agentKey: input.agentKey,
        dialogId: input.dialogId,
        userInput: latestUserInput,
        assistantText: input.assistantText,
        spaceId: input.spaceId ?? getDialogSpaceIdFromState(state3, input.dialogKey)
      })
    });
  } catch {
  }
}

// packages/chat/messages/messageSessionStore.ts
var import_react2 = __toESM(require_react());
var GLOBAL_MESSAGE_DIALOG_ID = "__global__";
var createEmptyMessageSessionState = () => ({
  firstStreamProcessed: false,
  isLoadingInitial: false,
  isLoadingOlder: false,
  hasMoreOlder: true,
  error: null,
  lastStreamTimestamp: 0,
  currentInitMsgsRequestId: void 0,
  currentLoadOlderRequestId: void 0,
  streamingMessageId: null
});
var activeDialogId = null;
var sessionByDialogId = {
  [GLOBAL_MESSAGE_DIALOG_ID]: createEmptyMessageSessionState()
};
var listeners = /* @__PURE__ */ new Set();
var version = 0;
var notify = () => {
  version += 1;
  for (const listener2 of listeners) {
    try {
      listener2();
    } catch {
    }
  }
};
var action = (type, payload) => ({ type, payload });
function setActiveMessageDialogId(dialogId) {
  activeDialogId = dialogId;
  notify();
}
function getActiveMessageDialogId() {
  return activeDialogId;
}
var resolveDialogId = (dialogId) => dialogId ?? activeDialogId ?? GLOBAL_MESSAGE_DIALOG_ID;
function ensureMessageSession(dialogId) {
  const key = resolveDialogId(dialogId);
  if (!sessionByDialogId[key]) {
    sessionByDialogId[key] = createEmptyMessageSessionState();
  }
  return sessionByDialogId[key];
}
function getMessageSession(dialogId) {
  return sessionByDialogId[resolveDialogId(dialogId)] ?? createEmptyMessageSessionState();
}
function patchMessageSession(dialogId, patch2) {
  const session = ensureMessageSession(dialogId);
  Object.assign(session, patch2);
  notify();
  return action("messageSession/patch", { dialogId, patch: patch2 });
}
function deleteMessageSession(dialogId) {
  delete sessionByDialogId[dialogId];
  if (activeDialogId === dialogId) {
    activeDialogId = null;
  }
  if (!sessionByDialogId[GLOBAL_MESSAGE_DIALOG_ID]) {
    sessionByDialogId[GLOBAL_MESSAGE_DIALOG_ID] = createEmptyMessageSessionState();
  }
  notify();
  return action("messageSession/delete", { dialogId });
}
function resetAllMessageSessions() {
  for (const key of Object.keys(sessionByDialogId)) {
    delete sessionByDialogId[key];
  }
  sessionByDialogId[GLOBAL_MESSAGE_DIALOG_ID] = createEmptyMessageSessionState();
  activeDialogId = null;
  notify();
  return action("messageSession/resetAll");
}
function markMessageStreamActivity(dialogId) {
  const session = ensureMessageSession(dialogId);
  session.firstStreamProcessed = true;
  session.lastStreamTimestamp = Date.now();
  notify();
  return action("messageSession/streamActivity", { dialogId });
}
function setStreamingMessageId(dialogId, messageId) {
  const session = ensureMessageSession(dialogId);
  if (session.streamingMessageId === messageId) return;
  session.streamingMessageId = messageId;
  notify();
}
function getHasStreamingMessage(dialogId) {
  if (dialogId === null) return false;
  return !!getMessageSession(dialogId).streamingMessageId;
}
function getIsLoadingInitial(dialogId) {
  return getMessageSession(dialogId).isLoadingInitial;
}
function getMessageSessionError(dialogId) {
  return getMessageSession(dialogId).error;
}
function getLastStreamTimestamp(dialogId) {
  return getMessageSession(dialogId).lastStreamTimestamp;
}
function getMessagesLoadingState(dialogId) {
  const session = getMessageSession(dialogId);
  return {
    isLoadingInitial: session.isLoadingInitial,
    isLoadingOlder: session.isLoadingOlder,
    hasMoreOlder: session.hasMoreOlder,
    error: session.error
  };
}
var selectCurrentDialogId = (_state) => getActiveMessageDialogId();
function subscribe(listener2) {
  listeners.add(listener2);
  return () => {
    listeners.delete(listener2);
  };
}
function getSnapshot() {
  return version;
}
function useIsLoadingInitial(dialogId) {
  (0, import_react2.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  if (dialogId == null) return false;
  return getIsLoadingInitial(dialogId);
}
function useMessageSessionError(dialogId) {
  (0, import_react2.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  if (dialogId == null) return null;
  return getMessageSessionError(dialogId);
}
function useLastStreamTimestamp(dialogId) {
  (0, import_react2.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  if (dialogId == null) return 0;
  return getLastStreamTimestamp(dialogId);
}
function useMessagesLoadingState(dialogId) {
  (0, import_react2.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  if (dialogId == null) {
    return {
      isLoadingInitial: false,
      isLoadingOlder: false,
      hasMoreOlder: true,
      error: null
    };
  }
  return getMessagesLoadingState(dialogId);
}
function useHasStreamingMessage(dialogId) {
  (0, import_react2.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  if (dialogId === null) return false;
  return getHasStreamingMessage(dialogId);
}

// packages/chat/messages/messageSlice.ts
var OLDER_LOAD_LIMIT = 30;
var createSliceWithThunks4 = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator }
});
var messagesAdapter = createEntityAdapter({
  selectId: (message) => message.id,
  sortComparer: (a3, b2) => a3.id.localeCompare(b2.id)
});
var createEmptyMessageDialogState = () => ({
  msgs: messagesAdapter.getInitialState()
});
var initialState4 = {
  dialogStateById: {
    [GLOBAL_MESSAGE_DIALOG_ID]: createEmptyMessageDialogState()
  }
};
var captureUnderstandingFromCompletedUiTurn2 = async (input) => captureUnderstandingFromCompletedUiTurn({
  ...input,
  messages: input.messages ?? selectAllMsgs(input.state, input.dialogId)
});
var resolveMessageDialogId = (_state, dialogId, dialogKey) => dialogId ?? (dialogKey ? extractCustomId(dialogKey) : null) ?? getActiveMessageDialogId() ?? GLOBAL_MESSAGE_DIALOG_ID;
var ensureMessageDialogState = (state3, dialogId, dialogKey) => {
  const resolvedDialogId = resolveMessageDialogId(state3, dialogId, dialogKey);
  if (!state3.dialogStateById) {
    state3.dialogStateById = {
      [GLOBAL_MESSAGE_DIALOG_ID]: createEmptyMessageDialogState()
    };
  }
  if (!state3.dialogStateById[resolvedDialogId]) {
    state3.dialogStateById[resolvedDialogId] = createEmptyMessageDialogState();
  }
  return state3.dialogStateById[resolvedDialogId];
};
var getMessageDialogState = (state3, dialogId, dialogKey) => {
  const dialogStateById = state3.dialogStateById ?? {};
  const resolvedDialogId = resolveMessageDialogId(state3, dialogId, dialogKey);
  const bucket = dialogStateById[resolvedDialogId];
  if (bucket) return bucket;
  const legacyMsgs = state3.msgs;
  if (legacyMsgs && typeof legacyMsgs === "object") {
    return { msgs: legacyMsgs };
  }
  return createEmptyMessageDialogState();
};
var inferDialogIdFromDbKey = (dbKey) => {
  if (!dbKey) return null;
  const parts = dbKey.split("-");
  if (parts.length >= 4 && parts[0] === "dialog" /* DIALOG */ && parts[2] === "msg") {
    return parts[1];
  }
  return null;
};
var inferDialogIdFromMessage = (message) => message.dialogId ?? inferDialogIdFromDbKey(message.dbKey);
var findDialogIdByMessageId = (state3, messageId) => {
  for (const [dialogId, dialogState] of Object.entries(state3.dialogStateById)) {
    if (dialogState.msgs.entities[messageId]) {
      return dialogId;
    }
  }
  return null;
};
var findDialogIdByMessageDbKey = (state3, dbKey) => {
  for (const [dialogId, dialogState] of Object.entries(state3.dialogStateById)) {
    const hasDbKey = Object.values(dialogState.msgs.entities).some(
      (message) => message?.dbKey === dbKey
    );
    if (hasDbKey) {
      return dialogId;
    }
  }
  return inferDialogIdFromDbKey(dbKey);
};
var upsertOneMessage = (dialogState, message) => {
  dialogState.msgs = messagesAdapter.upsertOne(dialogState.msgs, message);
};
var upsertManyMessages = (dialogState, messages) => {
  dialogState.msgs = messagesAdapter.upsertMany(dialogState.msgs, messages);
};
var addOneMessage = (dialogState, message) => {
  dialogState.msgs = messagesAdapter.addOne(dialogState.msgs, message);
};
var updateOneMessage = (dialogState, payload) => {
  dialogState.msgs = messagesAdapter.updateOne(dialogState.msgs, payload);
};
var updateManyMessages = (dialogState, payload) => {
  dialogState.msgs = messagesAdapter.updateMany(dialogState.msgs, payload);
};
var removeOneMessage = (dialogState, messageId) => {
  dialogState.msgs = messagesAdapter.removeOne(dialogState.msgs, messageId);
};
var removeAllMessages = (dialogState) => {
  dialogState.msgs = messagesAdapter.removeAll(dialogState.msgs);
};
var setAllMessages = (dialogState, messages) => {
  dialogState.msgs = messagesAdapter.setAll(dialogState.msgs, messages);
};
var messageActions;
var messageSlice = createSliceWithThunks4({
  name: "message",
  initialState: initialState4,
  reducers: (create) => ({
    addUserMessage: create.reducer((state3, action2) => {
      const { dialogId, ...message } = action2.payload;
      const dialogState = ensureMessageDialogState(
        state3,
        dialogId ?? inferDialogIdFromMessage(action2.payload)
      );
      upsertOneMessage(dialogState, {
        ...message,
        isStreaming: false
      });
    }),
    messageStreaming: create.reducer(
      (state3, action2) => {
        const { dialogId, ...message } = action2.payload;
        const resolvedDialogId = dialogId ?? inferDialogIdFromMessage(action2.payload);
        const dialogState = ensureMessageDialogState(state3, resolvedDialogId);
        const existing = dialogState.msgs.entities[message.id];
        upsertOneMessage(
          dialogState,
          applyMessageStreamingUpsert(existing, message)
        );
        setStreamingMessageId(resolvedDialogId, message.id);
        markMessageStreamActivity(resolvedDialogId);
      }
    ),
    resetMsgs: create.reducer((state3, action2) => {
      if (action2.payload?.all) {
        state3.dialogStateById = {
          [GLOBAL_MESSAGE_DIALOG_ID]: createEmptyMessageDialogState()
        };
        resetAllMessageSessions();
        return;
      }
      const dialogId = resolveMessageDialogId(
        state3,
        action2.payload?.dialogId,
        action2.payload?.dialogKey
      );
      delete state3.dialogStateById[dialogId];
      deleteMessageSession(dialogId);
      if (dialogId === getActiveMessageDialogId()) {
        setActiveMessageDialogId(null);
      }
      if (!state3.dialogStateById[GLOBAL_MESSAGE_DIALOG_ID]) {
        state3.dialogStateById[GLOBAL_MESSAGE_DIALOG_ID] = createEmptyMessageDialogState();
      }
    }),
    clearAllStreaming: create.reducer((state3, action2) => {
      const targetStates = action2.payload?.all ? Object.entries(state3.dialogStateById) : [[
        resolveMessageDialogId(
          state3,
          action2.payload?.dialogId,
          action2.payload?.dialogKey
        ),
        getMessageDialogState(state3, action2.payload?.dialogId, action2.payload?.dialogKey)
      ]];
      targetStates.forEach(([dialogId, dialogState]) => {
        const updates = Object.values(dialogState.msgs.entities).filter((m3) => m3?.isStreaming).map((m3) => ({ id: m3.id, changes: { isStreaming: false } }));
        if (updates.length > 0) {
          updateManyMessages(dialogState, updates);
        }
        setStreamingMessageId(dialogId, null);
      });
    }),
    removeTransientMessage: create.reducer(
      (state3, action2) => {
        const payload = typeof action2.payload === "string" ? { id: action2.payload } : action2.payload;
        const dialogId = payload.dialogId ?? findDialogIdByMessageId(state3, payload.id);
        const dialogState = ensureMessageDialogState(state3, dialogId);
        removeOneMessage(dialogState, payload.id);
      }
    ),
    // Error-path finalizer: keep whatever the transient message already shows
    // instead of wiping the trace. Decision rules live in messageFinalizeOnError
    // (Wave15); this reducer applies them + clears the streaming index.
    finalizeTransientMessageOnError: create.reducer(
      (state3, action2) => {
        const payload = typeof action2.payload === "string" ? { id: action2.payload } : action2.payload;
        const dialogId = payload.dialogId ?? findDialogIdByMessageId(state3, payload.id);
        const dialogState = ensureMessageDialogState(state3, dialogId);
        const existing = dialogState.msgs.entities[payload.id];
        const decision = resolveFinalizeTransientOnError(
          existing,
          payload.error
        );
        if (decision.kind === "noop") return;
        if (decision.kind === "remove") {
          removeOneMessage(dialogState, payload.id);
          setStreamingMessageId(dialogId, null);
          return;
        }
        updateOneMessage(dialogState, {
          id: payload.id,
          changes: decision.changes
        });
        setStreamingMessageId(dialogId, null);
      }
    ),
    addToolMessage: create.reducer((state3, action2) => {
      const dialogState = ensureMessageDialogState(
        state3,
        inferDialogIdFromMessage(action2.payload)
      );
      addOneMessage(dialogState, action2.payload);
    }),
    updateToolMessage: create.reducer((state3, action2) => {
      const dialogState = ensureMessageDialogState(
        state3,
        action2.payload.dialogId ?? findDialogIdByMessageId(state3, action2.payload.id)
      );
      updateOneMessage(dialogState, action2.payload);
    }),
    removeMessagesByIds: create.reducer((state3, action2) => {
      const dialogState = ensureMessageDialogState(state3, action2.payload.dialogId);
      dialogState.msgs = messagesAdapter.removeMany(dialogState.msgs, action2.payload.ids);
    }),
    setMessages: create.reducer((state3, action2) => {
      const dialogState = ensureMessageDialogState(state3, action2.payload.dialogId);
      if (action2.payload.replace) {
        setAllMessages(dialogState, action2.payload.messages);
      } else {
        upsertManyMessages(dialogState, action2.payload.messages);
      }
      if (action2.payload.isLoadingInitial !== void 0) {
        patchMessageSession(action2.payload.dialogId, {
          isLoadingInitial: action2.payload.isLoadingInitial
        });
      }
    }),
    prepareAndPersistMessage: create.asyncThunk(
      async (args, thunkApi) => {
        const { message, dialogConfig } = args;
        const { getState, dispatch, rejectWithValue } = thunkApi;
        const state3 = getState();
        if (!dialogConfig) {
          return rejectWithValue("Missing dialogConfig");
        }
        const dialogKey = dialogConfig.dbKey || dialogConfig.id;
        const dialogId = extractCustomId(dialogKey);
        const currentAccountUserId = selectIdentityUserId(state3) ?? null;
        const dialogConfigUserId = dialogConfig.userId;
        const { fullMessage } = assemblePersistedUserMessage({
          message,
          dialogId,
          dialogKey,
          currentAccountUserId,
          dialogConfigUserId: typeof dialogConfigUserId === "string" ? dialogConfigUserId : null
        });
        const userId = fullMessage.userId;
        dispatch(
          addReferenceKeysAction({
            content: message.content,
            dialogKey
          })
        ).catch((err2) => console.error("Failed to add refs:", err2));
        dispatch(messageActions.addUserMessage({ ...fullMessage, dialogId }));
        const { controller, ...messageToWrite } = fullMessage;
        await dispatch(
          write({
            data: { ...messageToWrite, type: "msg" /* MSG */ },
            customKey: fullMessage.dbKey,
            userId
          })
        ).unwrap();
        return fullMessage;
      }
    ),
    prepareAndPersistUserMessage: create.asyncThunk(
      async (args, thunkApi) => {
        const { userInput, dialogConfig } = args;
        const { dispatch } = thunkApi;
        return dispatch(
          messageActions.prepareAndPersistMessage({
            message: {
              role: "user",
              content: userInput
            },
            dialogConfig
          })
        ).unwrap();
      }
    ),
    /**
     * 初始化当前对话消息
     */
    initMsgs: create.asyncThunk(
      async ({
        dialogId,
        dialogKey,
        limit,
        isNew
      }, thunkApi) => {
        const { db } = thunkApi.extra;
        const { getState, signal, dispatch } = thunkApi;
        const state3 = getState();
        const { currentToken: token, remoteServers } = getRuntimeServerContext(state3);
        const { localMessages, remotePromise, earlyReturned } = await fetchAndCacheMessagesLocalFirst({
          db,
          dialogId,
          dialogKey,
          limit,
          token,
          remoteServers,
          signal
        });
        const validLocalMessages = localMessages.filter(isValidMessage);
        if (earlyReturned) {
          dispatch(
            messageActions.setMessages({
              dialogId,
              messages: validLocalMessages,
              isLoadingInitial: false
            })
          );
          remotePromise.then((finalMessages2) => {
            dispatch(
              messageActions.setMessages({
                dialogId,
                messages: finalMessages2.filter(isValidMessage)
              })
            );
          }).catch((err2) => {
            console.error("[initMsgs] background remote revalidate failed:", err2);
          });
          return validLocalMessages;
        }
        const finalMessages = (await remotePromise).filter(isValidMessage);
        try {
          const rootState = getState();
          const decision = resolveInitMsgsSummaryResume({
            entities: rootState.db?.entities,
            dialogId
          });
          if (decision.resume) {
            console.log("[initMsgs] Found suspended summary task, resuming...", decision.dialogKey);
            thunkApi.dispatch(patch({ dbKey: decision.dialogKey, changes: { summaryPending: false } }));
            updateDialogSummaryAction(
              { dialogKey: decision.dialogKey, preFetchedMessages: finalMessages },
              thunkApi
            ).catch((err2) => console.error("Resume summary failed:", err2));
          }
        } catch {
          console.error("[initMsgs] Failed to resume summary");
        }
        return finalMessages;
      },
      {
        pending: (state3, action2) => {
          const { dialogId, isNew, limit } = action2.meta.arg;
          const dialogState = ensureMessageDialogState(state3, dialogId);
          if (isNew) {
            if (Object.keys(dialogState.msgs.entities).length === 0) {
              removeAllMessages(dialogState);
            }
          }
          ensureMessageSession(dialogId);
          setActiveMessageDialogId(dialogId);
          patchMessageSession(dialogId, {
            firstStreamProcessed: false,
            isLoadingInitial: true,
            isLoadingOlder: false,
            // Full-history init: no older page. Partial limit still allows load-older.
            hasMoreOlder: typeof limit === "number" && Number.isFinite(limit) && limit > 0,
            error: null,
            lastStreamTimestamp: 0,
            currentInitMsgsRequestId: action2.meta.requestId
          });
        },
        fulfilled: (state3, action2) => {
          const dialogId = action2.meta.arg.dialogId;
          const dialogState = ensureMessageDialogState(state3, dialogId);
          const session = getMessageSession(dialogId);
          if (session.currentInitMsgsRequestId !== action2.meta.requestId) {
            return;
          }
          const limit = action2.meta.arg.limit;
          patchMessageSession(dialogId, {
            currentInitMsgsRequestId: void 0,
            isLoadingInitial: false,
            hasMoreOlder: resolveInitMsgsHasMoreOlder({
              limit,
              fetchedCount: action2.payload.length
            })
          });
          const hasLocalStreaming = getHasStreamingMessage(dialogId) || Object.values(dialogState.msgs.entities).some(
            (message) => message?.isStreaming
          );
          const writeMode = resolveInitMsgsFulfilledWriteMode({
            isNew: action2.meta.arg.isNew,
            hasLocalStreaming
          });
          if (writeMode === "upsert") {
            upsertManyMessages(dialogState, action2.payload);
          } else {
            setAllMessages(dialogState, action2.payload);
          }
        },
        rejected: (state3, action2) => {
          const dialogId = action2.meta.arg.dialogId;
          ensureMessageDialogState(state3, dialogId);
          const session = getMessageSession(dialogId);
          if (session.currentInitMsgsRequestId !== action2.meta.requestId) {
            return;
          }
          if (action2.meta?.aborted) {
            patchMessageSession(dialogId, {
              currentInitMsgsRequestId: void 0,
              isLoadingInitial: false
            });
            return;
          }
          patchMessageSession(dialogId, {
            currentInitMsgsRequestId: void 0,
            isLoadingInitial: false,
            error: action2.error instanceof Error ? action2.error : new Error(String(action2.error))
          });
          console.error(`${action2.type} failed:`, action2.error);
        }
      }
    ),
    /**
     * 加载更早的历史消息
     */
    loadOlderMessages: create.asyncThunk(
      async ({
        dialogId,
        dialogKey,
        beforeKey,
        limit = OLDER_LOAD_LIMIT
      }, thunkApi) => {
        const { getState, extra, signal } = thunkApi;
        const { db } = extra;
        const state3 = getState();
        const { currentToken: token, remoteServers } = getRuntimeServerContext(state3);
        const messages = (await fetchAndCacheMessages({
          db,
          dialogId,
          dialogKey,
          limit,
          beforeKey,
          token,
          remoteServers,
          signal
        })).filter(isValidMessage);
        return { messages, limit };
      },
      {
        pending: (state3, action2) => {
          const dialogId = action2.meta.arg.dialogId;
          ensureMessageDialogState(state3, dialogId);
          patchMessageSession(dialogId, {
            isLoadingOlder: true,
            error: null,
            currentLoadOlderRequestId: action2.meta.requestId
          });
        },
        fulfilled: (state3, action2) => {
          const dialogId = action2.meta.arg.dialogId;
          const dialogState = ensureMessageDialogState(state3, dialogId);
          const session = getMessageSession(dialogId);
          if (session.currentLoadOlderRequestId !== action2.meta.requestId) {
            return;
          }
          const { messages, limit } = action2.payload;
          patchMessageSession(dialogId, {
            isLoadingOlder: false,
            currentLoadOlderRequestId: void 0,
            ...messages.length < limit ? { hasMoreOlder: false } : {}
          });
          if (messages.length > 0) {
            upsertManyMessages(dialogState, messages);
          }
        },
        rejected: (state3, action2) => {
          const dialogId = action2.meta.arg.dialogId;
          ensureMessageDialogState(state3, dialogId);
          const session = getMessageSession(dialogId);
          if (session.currentLoadOlderRequestId !== action2.meta.requestId) {
            return;
          }
          if (action2.meta?.aborted) {
            patchMessageSession(dialogId, {
              isLoadingOlder: false,
              currentLoadOlderRequestId: void 0
            });
            return;
          }
          patchMessageSession(dialogId, {
            isLoadingOlder: false,
            currentLoadOlderRequestId: void 0,
            error: action2.error instanceof Error ? action2.error : new Error(String(action2.error))
          });
          console.error(`${action2.type} failed:`, action2.error);
        }
      }
    ),
    /**
     * 一条流式回复结束
     */
    messageStreamEnd: create.asyncThunk(
      async (payload, { dispatch, getState }) => {
        const {
          finalContentBuffer,
          totalUsage,
          msgKey,
          agentConfig,
          dialogId,
          dialogKey,
          messageId,
          reasoningBuffer,
          toolCalls,
          finishReason
        } = payload;
        const spaceId = payload.spaceId;
        const rawAgentName = asTrimmedString(agentConfig?.name);
        const normalizedContentBuffer = await normalizeAssistantContentBuffer(
          finalContentBuffer,
          dialogId,
          messageId,
          dispatch,
          getState,
          spaceId ? { spaceId, agentName: rawAgentName || void 0 } : void 0
        );
        const {
          thinkContent,
          textContent,
          visibleContent: finalVisibleContent
        } = finalizeAssistantMessageContent(
          normalizedContentBuffer,
          reasoningBuffer
        );
        const {
          billedUsage,
          billedEstimatedUsage,
          hasReportedUsage,
          titleEligible
        } = resolveStreamEndBillingUsages({
          agentConfig,
          totalUsage,
          finalVisibleContent
        });
        const {
          finalUsageData,
          agentName,
          persistedMetadata,
          otherPersistedMessageMetadata
        } = prepareStreamEndPersistInputs({
          totalUsage,
          agentConfig,
          messageMetadata: payload.messageMetadata
        });
        const { finalMetadata } = resolveStreamEndFinalMetadata({
          persistedMetadata,
          toolCalls,
          messages: selectAllMsgs(getState(), dialogId),
          finalContent: finalVisibleContent
        });
        const state3 = getState();
        const dialogConfig = selectById(state3, dialogKey);
        const dialogConfigUserId = dialogConfig?.userId;
        const currentAccountUserId = selectIdentityUserId(state3) ?? null;
        const userId = resolveMessageOwner({
          dialogConfigUserId: typeof dialogConfigUserId === "string" ? dialogConfigUserId : null,
          dialogKey,
          currentAccountUserId
        });
        const finalMessage = assembleFinalAssistantMessage({
          messageId,
          msgKey,
          finalVisibleContent,
          thinkContent,
          agentConfig,
          finalUsageData,
          toolCalls,
          finishReason,
          otherPersistedMessageMetadata,
          finalMetadata,
          agentName,
          // Authoritative owner last so metadata cannot overwrite it.
          userId
        });
        const { controller, ...messageToWrite } = finalMessage;
        await dispatch(
          write({
            data: { ...messageToWrite, type: "msg" /* MSG */ },
            customKey: msgKey,
            userId
          })
        ).unwrap();
        const {
          billingMode,
          updateTitle,
          updateSummary,
          summaryForce,
          summaryReason,
          addRefs
        } = resolveStreamEndPostWritePolicy({
          hasReportedUsage,
          agentProvider: agentConfig?.provider,
          titleEligible,
          textContent,
          toolCalls
        });
        if (billingMode === "reported") {
          dispatch(
            updateTokens({
              dialogId,
              dialogKey,
              usage: billedUsage,
              agentConfig
            })
          );
        } else if (billingMode === "estimated") {
          dispatch(
            updateTokens({
              dialogId,
              dialogKey,
              usage: billedEstimatedUsage,
              agentConfig
            })
          );
          console.warn("[billing] Missing usage at messageStreamEnd; using estimated token update", {
            dialogId,
            dialogKey,
            provider: agentConfig.provider,
            model: agentConfig.model,
            endpointKey: agentConfig.endpointKey
          });
        }
        if (updateTitle) {
          dispatch(updateDialogTitle({ dialogKey, agentConfig }));
        }
        if (updateSummary) {
          const messagesForSummary = [
            ...selectAllMsgs(getState(), dialogId),
            finalMessage
          ];
          updateDialogSummaryAction(
            {
              dialogKey,
              preFetchedMessages: messagesForSummary,
              force: summaryForce,
              reason: summaryReason
            },
            { dispatch, getState }
          ).catch((err2) => console.error("Summary update failed:", err2));
          if (addRefs) {
            dispatch(addReferenceKeysAction({
              content: finalVisibleContent,
              dialogKey
            })).catch((err2) => console.error("Failed to add assistant refs:", err2));
          }
        }
        captureUnderstandingFromCompletedUiTurn2({
          state: getState(),
          agentKey: agentConfig?.dbKey,
          dialogId,
          dialogKey,
          spaceId: payload.spaceId,
          assistantText: textContent,
          toolCalls
        }).catch(
          (err2) => console.error("Understanding memory capture failed:", err2)
        );
        return {
          id: messageId,
          dbKey: msgKey,
          role: "assistant",
          content: finalMessage.content,
          thinkContent: finalMessage.thinkContent,
          usage: finalMessage.usage,
          agentKey: finalMessage.agentKey,
          cybotKey: finalMessage.cybotKey,
          tool_calls: finalMessage.tool_calls,
          dialogId,
          agentName: finalMessage.agentName
        };
      },
      {
        fulfilled: (state3, action2) => {
          const payload = action2.payload;
          const dialogState = ensureMessageDialogState(state3, payload.dialogId);
          const existing = dialogState.msgs.entities[payload.id];
          upsertOneMessage(dialogState, {
            ...existing ?? {},
            ...payload,
            role: payload.role ?? existing?.role ?? "assistant",
            dbKey: payload.dbKey ?? existing?.dbKey ?? action2.meta.arg.msgKey,
            isStreaming: false,
            imageGenerationState: void 0
          });
          setStreamingMessageId(payload.dialogId, null);
        },
        rejected: (state3, action2) => {
          const arg = action2.meta?.arg;
          const messageId = arg?.messageId;
          const dialogId = arg?.dialogId;
          console.error("messageStreamEnd failed:", action2.error);
          if (messageId && dialogId) {
            const dialogState = ensureMessageDialogState(state3, dialogId);
            updateOneMessage(dialogState, {
              id: messageId,
              changes: {
                isStreaming: false,
                imageGenerationState: void 0,
                content: appendSaveFailureToContent(
                  dialogState.msgs.entities[messageId]?.content
                )
              }
            });
          }
          if (dialogId) {
            setStreamingMessageId(dialogId, null);
          }
        }
      }
    ),
    deleteMessage: create.asyncThunk(
      async (dbKey, { dispatch, getState }) => {
        const state3 = getState();
        const dialogId = findDialogIdByMessageDbKey(state3.message, dbKey);
        const dialogState = dialogId ? state3.message.dialogStateById[dialogId] : void 0;
        const entities = dialogState?.msgs.entities ?? {};
        const msg = Object.values(entities).find((m3) => m3?.dbKey === dbKey);
        const { id: msgId, extraRemoveId, extraRemoveDbKey } = planDeleteMessageCascade(msg, entities);
        await dispatch(remove(dbKey));
        if (extraRemoveDbKey) {
          await dispatch(remove(extraRemoveDbKey));
        }
        return { id: msgId, extraRemoveId, dialogId };
      },
      {
        fulfilled: (state3, action2) => {
          const { id, extraRemoveId, dialogId } = action2.payload;
          const dialogState = ensureMessageDialogState(state3, dialogId);
          if (id) {
            removeOneMessage(dialogState, id);
          }
          if (extraRemoveId) {
            removeOneMessage(dialogState, extraRemoveId);
          }
        }
      }
    ),
    editUserMessageAndReplay: create.asyncThunk(
      async (args, thunkApi) => {
        const { dispatch, getState, rejectWithValue } = thunkApi;
        try {
          const state3 = getState();
          const dialogKey = args.dialogKey ?? selectCurrentDialogKey(state3);
          if (!dialogKey) {
            throw new Error("editUserMessageAndReplay: dialogKey is required.");
          }
          const dialogConfig = selectById(state3, dialogKey);
          if (!dialogConfig) {
            throw new Error("editUserMessageAndReplay: dialog config is missing.");
          }
          const dialogId = dialogConfig.id ?? extractCustomId(dialogKey);
          const messages = selectAllMsgs(state3, dialogId);
          const plan = planEditUserMessageAndReplay({
            messages,
            messageId: args.messageId,
            originalContent: args.originalContent,
            nextText: args.nextText
          });
          if (!plan.ok) {
            throw new Error(plan.message);
          }
          const { targetMessage, nextContent, trailingMessages } = plan;
          dispatch(
            messageActions.updateToolMessage({
              id: targetMessage.id,
              dialogId,
              changes: {
                content: nextContent
              }
            })
          );
          if (trailingMessages.length > 0) {
            dispatch(
              messageActions.removeMessagesByIds({
                dialogId,
                ids: trailingMessages.map((message) => message.id)
              })
            );
          }
          await dispatch(
            patch({
              dbKey: targetMessage.dbKey,
              changes: {
                content: nextContent
              }
            })
          ).unwrap();
          await dispatch(
            patch({
              dbKey: dialogKey,
              changes: {
                summary: null,
                summarizedBeforeId: null
              }
            })
          ).unwrap();
          await Promise.all(
            trailingMessages.map(
              (m3) => m3?.dbKey ? dispatch(remove(m3.dbKey)).unwrap() : Promise.resolve()
            )
          );
          const { agentKeyToUse, effectiveRuntimeOptions } = resolveHandleSendMessageContext({
            dialogConfig,
            targetAgentKey: args.targetAgentKey,
            runtimeOptions: args.runtimeOptions
          });
          if (agentKeyToUse) {
            const { streamAgentChatTurn: streamAgentChatTurn2 } = await import("/public/assets/chunks/agentSlice-DXKTK5FO.js");
            await dispatch(
              streamAgentChatTurn2({
                agentKey: agentKeyToUse,
                userInput: nextContent,
                dialogKey,
                parentMessageId: void 0,
                runtimeOptions: effectiveRuntimeOptions,
                quickChatPerfStartedAt: args.quickChatPerfStartedAt
              })
            ).unwrap();
          }
          return {
            editedMessageId: targetMessage.id,
            removedMessageIds: trailingMessages.map((message) => message.id)
          };
        } catch (error) {
          return rejectWithValue(toErrorMessage(error));
        }
      }
    )
  }),
  selectors: {}
});
messageActions = messageSlice.actions;
var dialogMessageSelectors = messagesAdapter.getSelectors(
  (dialogState) => dialogState.msgs
);
var selectMessageDialogState = (state3, dialogId) => getMessageDialogState(state3.message, dialogId);
var selectAllMsgs = createSelector(
  [
    (state3, dialogId) => selectMessageDialogState(state3, dialogId)
  ],
  (dialogState) => dialogMessageSelectors.selectAll(dialogState)
);
var selectMsgById = (state3, messageId, dialogId) => dialogMessageSelectors.selectById(
  getMessageDialogState(state3.message, dialogId),
  messageId
);
var selectLastAssistantMessage = (state3, dialogId) => {
  const msgs = selectAllMsgs(state3, dialogId);
  for (let i2 = msgs.length - 1; i2 >= 0; i2 -= 1) {
    const msg = msgs[i2];
    if (msg && msg.role === "assistant") {
      return msg;
    }
  }
  return void 0;
};
var {
  addUserMessage,
  messageStreaming,
  setMessages,
  resetMsgs,
  clearAllStreaming,
  removeTransientMessage,
  finalizeTransientMessageOnError,
  prepareAndPersistMessage,
  prepareAndPersistUserMessage,
  initMsgs,
  loadOlderMessages,
  messageStreamEnd,
  deleteMessage,
  editUserMessageAndReplay,
  addToolMessage,
  updateToolMessage,
  removeMessagesByIds
} = messageSlice.actions;
var messageSlice_default = messageSlice.reducer;

// packages/ai/workflow/workflowStore.ts
var createInitialState = () => ({
  title: null,
  steps: [],
  stats: {
    startTime: null,
    totalStepsExecuted: 0,
    failedSteps: 0
  }
});
var listeners2 = /* @__PURE__ */ new Set();
var version2 = 0;
var state = createInitialState();
var notify2 = () => {
  for (const listener2 of listeners2) {
    try {
      listener2();
    } catch {
    }
  }
};
var bump = () => {
  version2 += 1;
  notify2();
};
function setWorkflow(args) {
  state = {
    title: args.title,
    steps: args.steps,
    stats: {
      startTime: Date.now(),
      totalStepsExecuted: 0,
      failedSteps: 0
    }
  };
  bump();
}
function updateStep(args) {
  const step = state.steps.find((s3) => s3.id === args.id);
  if (step) {
    Object.assign(step, args.updates);
    bump();
  }
}
function incrementStepsExecuted() {
  state.stats.totalStepsExecuted += 1;
  bump();
}
function incrementFailedSteps() {
  state.stats.failedSteps += 1;
  bump();
}
function clearWorkflow() {
  state = createInitialState();
  bump();
}

// node_modules/@babel/runtime/helpers/esm/typeof.js
function _typeof(o) {
  "@babel/helpers - typeof";
  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof(o);
}

// node_modules/date-fns/esm/_lib/toInteger/index.js
function toInteger(dirtyNumber) {
  if (dirtyNumber === null || dirtyNumber === true || dirtyNumber === false) {
    return NaN;
  }
  var number = Number(dirtyNumber);
  if (isNaN(number)) {
    return number;
  }
  return number < 0 ? Math.ceil(number) : Math.floor(number);
}

// node_modules/date-fns/esm/_lib/requiredArgs/index.js
function requiredArgs(required, args) {
  if (args.length < required) {
    throw new TypeError(required + " argument" + (required > 1 ? "s" : "") + " required, but only " + args.length + " present");
  }
}

// node_modules/date-fns/esm/toDate/index.js
function toDate(argument) {
  requiredArgs(1, arguments);
  var argStr = Object.prototype.toString.call(argument);
  if (argument instanceof Date || _typeof(argument) === "object" && argStr === "[object Date]") {
    return new Date(argument.getTime());
  } else if (typeof argument === "number" || argStr === "[object Number]") {
    return new Date(argument);
  } else {
    if ((typeof argument === "string" || argStr === "[object String]") && typeof console !== "undefined") {
      console.warn("Starting with v2.0.0-beta.1 date-fns doesn't accept strings as date arguments. Please use `parseISO` to parse strings. See: https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#string-arguments");
      console.warn(new Error().stack);
    }
    return /* @__PURE__ */ new Date(NaN);
  }
}

// node_modules/date-fns/esm/addDays/index.js
function addDays(dirtyDate, dirtyAmount) {
  requiredArgs(2, arguments);
  var date = toDate(dirtyDate);
  var amount = toInteger(dirtyAmount);
  if (isNaN(amount)) {
    return /* @__PURE__ */ new Date(NaN);
  }
  if (!amount) {
    return date;
  }
  date.setDate(date.getDate() + amount);
  return date;
}

// node_modules/date-fns/esm/addMilliseconds/index.js
function addMilliseconds(dirtyDate, dirtyAmount) {
  requiredArgs(2, arguments);
  var timestamp = toDate(dirtyDate).getTime();
  var amount = toInteger(dirtyAmount);
  return new Date(timestamp + amount);
}

// node_modules/date-fns/esm/_lib/defaultOptions/index.js
var defaultOptions = {};
function getDefaultOptions() {
  return defaultOptions;
}

// node_modules/date-fns/esm/_lib/getTimezoneOffsetInMilliseconds/index.js
function getTimezoneOffsetInMilliseconds(date) {
  var utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()));
  utcDate.setUTCFullYear(date.getFullYear());
  return date.getTime() - utcDate.getTime();
}

// node_modules/date-fns/esm/startOfDay/index.js
function startOfDay(dirtyDate) {
  requiredArgs(1, arguments);
  var date = toDate(dirtyDate);
  date.setHours(0, 0, 0, 0);
  return date;
}

// node_modules/date-fns/esm/compareAsc/index.js
function compareAsc(dirtyDateLeft, dirtyDateRight) {
  requiredArgs(2, arguments);
  var dateLeft = toDate(dirtyDateLeft);
  var dateRight = toDate(dirtyDateRight);
  var diff = dateLeft.getTime() - dateRight.getTime();
  if (diff < 0) {
    return -1;
  } else if (diff > 0) {
    return 1;
  } else {
    return diff;
  }
}

// node_modules/date-fns/esm/constants/index.js
var daysInYear = 365.2425;
var maxTime = Math.pow(10, 8) * 24 * 60 * 60 * 1e3;
var millisecondsInMinute = 6e4;
var millisecondsInHour = 36e5;
var minTime = -maxTime;
var secondsInHour = 3600;
var secondsInDay = secondsInHour * 24;
var secondsInWeek = secondsInDay * 7;
var secondsInYear = secondsInDay * daysInYear;
var secondsInMonth = secondsInYear / 12;
var secondsInQuarter = secondsInMonth * 3;

// node_modules/date-fns/esm/isDate/index.js
function isDate2(value) {
  requiredArgs(1, arguments);
  return value instanceof Date || _typeof(value) === "object" && Object.prototype.toString.call(value) === "[object Date]";
}

// node_modules/date-fns/esm/isValid/index.js
function isValid(dirtyDate) {
  requiredArgs(1, arguments);
  if (!isDate2(dirtyDate) && typeof dirtyDate !== "number") {
    return false;
  }
  var date = toDate(dirtyDate);
  return !isNaN(Number(date));
}

// node_modules/date-fns/esm/differenceInCalendarMonths/index.js
function differenceInCalendarMonths(dirtyDateLeft, dirtyDateRight) {
  requiredArgs(2, arguments);
  var dateLeft = toDate(dirtyDateLeft);
  var dateRight = toDate(dirtyDateRight);
  var yearDiff = dateLeft.getFullYear() - dateRight.getFullYear();
  var monthDiff = dateLeft.getMonth() - dateRight.getMonth();
  return yearDiff * 12 + monthDiff;
}

// node_modules/date-fns/esm/differenceInMilliseconds/index.js
function differenceInMilliseconds(dateLeft, dateRight) {
  requiredArgs(2, arguments);
  return toDate(dateLeft).getTime() - toDate(dateRight).getTime();
}

// node_modules/date-fns/esm/_lib/roundingMethods/index.js
var roundingMap = {
  ceil: Math.ceil,
  round: Math.round,
  floor: Math.floor,
  trunc: function trunc(value) {
    return value < 0 ? Math.ceil(value) : Math.floor(value);
  }
  // Math.trunc is not supported by IE
};
var defaultRoundingMethod = "trunc";
function getRoundingMethod(method) {
  return method ? roundingMap[method] : roundingMap[defaultRoundingMethod];
}

// node_modules/date-fns/esm/differenceInMinutes/index.js
function differenceInMinutes(dateLeft, dateRight, options) {
  requiredArgs(2, arguments);
  var diff = differenceInMilliseconds(dateLeft, dateRight) / millisecondsInMinute;
  return getRoundingMethod(options === null || options === void 0 ? void 0 : options.roundingMethod)(diff);
}

// node_modules/date-fns/esm/endOfDay/index.js
function endOfDay(dirtyDate) {
  requiredArgs(1, arguments);
  var date = toDate(dirtyDate);
  date.setHours(23, 59, 59, 999);
  return date;
}

// node_modules/date-fns/esm/endOfMonth/index.js
function endOfMonth(dirtyDate) {
  requiredArgs(1, arguments);
  var date = toDate(dirtyDate);
  var month = date.getMonth();
  date.setFullYear(date.getFullYear(), month + 1, 0);
  date.setHours(23, 59, 59, 999);
  return date;
}

// node_modules/date-fns/esm/isLastDayOfMonth/index.js
function isLastDayOfMonth(dirtyDate) {
  requiredArgs(1, arguments);
  var date = toDate(dirtyDate);
  return endOfDay(date).getTime() === endOfMonth(date).getTime();
}

// node_modules/date-fns/esm/differenceInMonths/index.js
function differenceInMonths(dirtyDateLeft, dirtyDateRight) {
  requiredArgs(2, arguments);
  var dateLeft = toDate(dirtyDateLeft);
  var dateRight = toDate(dirtyDateRight);
  var sign = compareAsc(dateLeft, dateRight);
  var difference = Math.abs(differenceInCalendarMonths(dateLeft, dateRight));
  var result;
  if (difference < 1) {
    result = 0;
  } else {
    if (dateLeft.getMonth() === 1 && dateLeft.getDate() > 27) {
      dateLeft.setDate(30);
    }
    dateLeft.setMonth(dateLeft.getMonth() - sign * difference);
    var isLastMonthNotFull = compareAsc(dateLeft, dateRight) === -sign;
    if (isLastDayOfMonth(toDate(dirtyDateLeft)) && difference === 1 && compareAsc(dirtyDateLeft, dateRight) === 1) {
      isLastMonthNotFull = false;
    }
    result = sign * (difference - Number(isLastMonthNotFull));
  }
  return result === 0 ? 0 : result;
}

// node_modules/date-fns/esm/differenceInSeconds/index.js
function differenceInSeconds(dateLeft, dateRight, options) {
  requiredArgs(2, arguments);
  var diff = differenceInMilliseconds(dateLeft, dateRight) / 1e3;
  return getRoundingMethod(options === null || options === void 0 ? void 0 : options.roundingMethod)(diff);
}

// node_modules/date-fns/esm/eachDayOfInterval/index.js
function eachDayOfInterval(dirtyInterval, options) {
  var _options$step;
  requiredArgs(1, arguments);
  var interval = dirtyInterval || {};
  var startDate = toDate(interval.start);
  var endDate = toDate(interval.end);
  var endTime = endDate.getTime();
  if (!(startDate.getTime() <= endTime)) {
    throw new RangeError("Invalid interval");
  }
  var dates = [];
  var currentDate = startDate;
  currentDate.setHours(0, 0, 0, 0);
  var step = Number((_options$step = options === null || options === void 0 ? void 0 : options.step) !== null && _options$step !== void 0 ? _options$step : 1);
  if (step < 1 || isNaN(step)) throw new RangeError("`options.step` must be a number greater than 1");
  while (currentDate.getTime() <= endTime) {
    dates.push(toDate(currentDate));
    currentDate.setDate(currentDate.getDate() + step);
    currentDate.setHours(0, 0, 0, 0);
  }
  return dates;
}

// node_modules/date-fns/esm/subMilliseconds/index.js
function subMilliseconds(dirtyDate, dirtyAmount) {
  requiredArgs(2, arguments);
  var amount = toInteger(dirtyAmount);
  return addMilliseconds(dirtyDate, -amount);
}

// node_modules/date-fns/esm/_lib/getUTCDayOfYear/index.js
var MILLISECONDS_IN_DAY = 864e5;
function getUTCDayOfYear(dirtyDate) {
  requiredArgs(1, arguments);
  var date = toDate(dirtyDate);
  var timestamp = date.getTime();
  date.setUTCMonth(0, 1);
  date.setUTCHours(0, 0, 0, 0);
  var startOfYearTimestamp = date.getTime();
  var difference = timestamp - startOfYearTimestamp;
  return Math.floor(difference / MILLISECONDS_IN_DAY) + 1;
}

// node_modules/date-fns/esm/_lib/startOfUTCISOWeek/index.js
function startOfUTCISOWeek(dirtyDate) {
  requiredArgs(1, arguments);
  var weekStartsOn = 1;
  var date = toDate(dirtyDate);
  var day = date.getUTCDay();
  var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  date.setUTCDate(date.getUTCDate() - diff);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

// node_modules/date-fns/esm/_lib/getUTCISOWeekYear/index.js
function getUTCISOWeekYear(dirtyDate) {
  requiredArgs(1, arguments);
  var date = toDate(dirtyDate);
  var year = date.getUTCFullYear();
  var fourthOfJanuaryOfNextYear = /* @__PURE__ */ new Date(0);
  fourthOfJanuaryOfNextYear.setUTCFullYear(year + 1, 0, 4);
  fourthOfJanuaryOfNextYear.setUTCHours(0, 0, 0, 0);
  var startOfNextYear = startOfUTCISOWeek(fourthOfJanuaryOfNextYear);
  var fourthOfJanuaryOfThisYear = /* @__PURE__ */ new Date(0);
  fourthOfJanuaryOfThisYear.setUTCFullYear(year, 0, 4);
  fourthOfJanuaryOfThisYear.setUTCHours(0, 0, 0, 0);
  var startOfThisYear = startOfUTCISOWeek(fourthOfJanuaryOfThisYear);
  if (date.getTime() >= startOfNextYear.getTime()) {
    return year + 1;
  } else if (date.getTime() >= startOfThisYear.getTime()) {
    return year;
  } else {
    return year - 1;
  }
}

// node_modules/date-fns/esm/_lib/startOfUTCISOWeekYear/index.js
function startOfUTCISOWeekYear(dirtyDate) {
  requiredArgs(1, arguments);
  var year = getUTCISOWeekYear(dirtyDate);
  var fourthOfJanuary = /* @__PURE__ */ new Date(0);
  fourthOfJanuary.setUTCFullYear(year, 0, 4);
  fourthOfJanuary.setUTCHours(0, 0, 0, 0);
  var date = startOfUTCISOWeek(fourthOfJanuary);
  return date;
}

// node_modules/date-fns/esm/_lib/getUTCISOWeek/index.js
var MILLISECONDS_IN_WEEK = 6048e5;
function getUTCISOWeek(dirtyDate) {
  requiredArgs(1, arguments);
  var date = toDate(dirtyDate);
  var diff = startOfUTCISOWeek(date).getTime() - startOfUTCISOWeekYear(date).getTime();
  return Math.round(diff / MILLISECONDS_IN_WEEK) + 1;
}

// node_modules/date-fns/esm/_lib/startOfUTCWeek/index.js
function startOfUTCWeek(dirtyDate, options) {
  var _ref, _ref2, _ref3, _options$weekStartsOn, _options$locale, _options$locale$optio, _defaultOptions$local, _defaultOptions$local2;
  requiredArgs(1, arguments);
  var defaultOptions2 = getDefaultOptions();
  var weekStartsOn = toInteger((_ref = (_ref2 = (_ref3 = (_options$weekStartsOn = options === null || options === void 0 ? void 0 : options.weekStartsOn) !== null && _options$weekStartsOn !== void 0 ? _options$weekStartsOn : options === null || options === void 0 ? void 0 : (_options$locale = options.locale) === null || _options$locale === void 0 ? void 0 : (_options$locale$optio = _options$locale.options) === null || _options$locale$optio === void 0 ? void 0 : _options$locale$optio.weekStartsOn) !== null && _ref3 !== void 0 ? _ref3 : defaultOptions2.weekStartsOn) !== null && _ref2 !== void 0 ? _ref2 : (_defaultOptions$local = defaultOptions2.locale) === null || _defaultOptions$local === void 0 ? void 0 : (_defaultOptions$local2 = _defaultOptions$local.options) === null || _defaultOptions$local2 === void 0 ? void 0 : _defaultOptions$local2.weekStartsOn) !== null && _ref !== void 0 ? _ref : 0);
  if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
    throw new RangeError("weekStartsOn must be between 0 and 6 inclusively");
  }
  var date = toDate(dirtyDate);
  var day = date.getUTCDay();
  var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  date.setUTCDate(date.getUTCDate() - diff);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

// node_modules/date-fns/esm/_lib/getUTCWeekYear/index.js
function getUTCWeekYear(dirtyDate, options) {
  var _ref, _ref2, _ref3, _options$firstWeekCon, _options$locale, _options$locale$optio, _defaultOptions$local, _defaultOptions$local2;
  requiredArgs(1, arguments);
  var date = toDate(dirtyDate);
  var year = date.getUTCFullYear();
  var defaultOptions2 = getDefaultOptions();
  var firstWeekContainsDate = toInteger((_ref = (_ref2 = (_ref3 = (_options$firstWeekCon = options === null || options === void 0 ? void 0 : options.firstWeekContainsDate) !== null && _options$firstWeekCon !== void 0 ? _options$firstWeekCon : options === null || options === void 0 ? void 0 : (_options$locale = options.locale) === null || _options$locale === void 0 ? void 0 : (_options$locale$optio = _options$locale.options) === null || _options$locale$optio === void 0 ? void 0 : _options$locale$optio.firstWeekContainsDate) !== null && _ref3 !== void 0 ? _ref3 : defaultOptions2.firstWeekContainsDate) !== null && _ref2 !== void 0 ? _ref2 : (_defaultOptions$local = defaultOptions2.locale) === null || _defaultOptions$local === void 0 ? void 0 : (_defaultOptions$local2 = _defaultOptions$local.options) === null || _defaultOptions$local2 === void 0 ? void 0 : _defaultOptions$local2.firstWeekContainsDate) !== null && _ref !== void 0 ? _ref : 1);
  if (!(firstWeekContainsDate >= 1 && firstWeekContainsDate <= 7)) {
    throw new RangeError("firstWeekContainsDate must be between 1 and 7 inclusively");
  }
  var firstWeekOfNextYear = /* @__PURE__ */ new Date(0);
  firstWeekOfNextYear.setUTCFullYear(year + 1, 0, firstWeekContainsDate);
  firstWeekOfNextYear.setUTCHours(0, 0, 0, 0);
  var startOfNextYear = startOfUTCWeek(firstWeekOfNextYear, options);
  var firstWeekOfThisYear = /* @__PURE__ */ new Date(0);
  firstWeekOfThisYear.setUTCFullYear(year, 0, firstWeekContainsDate);
  firstWeekOfThisYear.setUTCHours(0, 0, 0, 0);
  var startOfThisYear = startOfUTCWeek(firstWeekOfThisYear, options);
  if (date.getTime() >= startOfNextYear.getTime()) {
    return year + 1;
  } else if (date.getTime() >= startOfThisYear.getTime()) {
    return year;
  } else {
    return year - 1;
  }
}

// node_modules/date-fns/esm/_lib/startOfUTCWeekYear/index.js
function startOfUTCWeekYear(dirtyDate, options) {
  var _ref, _ref2, _ref3, _options$firstWeekCon, _options$locale, _options$locale$optio, _defaultOptions$local, _defaultOptions$local2;
  requiredArgs(1, arguments);
  var defaultOptions2 = getDefaultOptions();
  var firstWeekContainsDate = toInteger((_ref = (_ref2 = (_ref3 = (_options$firstWeekCon = options === null || options === void 0 ? void 0 : options.firstWeekContainsDate) !== null && _options$firstWeekCon !== void 0 ? _options$firstWeekCon : options === null || options === void 0 ? void 0 : (_options$locale = options.locale) === null || _options$locale === void 0 ? void 0 : (_options$locale$optio = _options$locale.options) === null || _options$locale$optio === void 0 ? void 0 : _options$locale$optio.firstWeekContainsDate) !== null && _ref3 !== void 0 ? _ref3 : defaultOptions2.firstWeekContainsDate) !== null && _ref2 !== void 0 ? _ref2 : (_defaultOptions$local = defaultOptions2.locale) === null || _defaultOptions$local === void 0 ? void 0 : (_defaultOptions$local2 = _defaultOptions$local.options) === null || _defaultOptions$local2 === void 0 ? void 0 : _defaultOptions$local2.firstWeekContainsDate) !== null && _ref !== void 0 ? _ref : 1);
  var year = getUTCWeekYear(dirtyDate, options);
  var firstWeek = /* @__PURE__ */ new Date(0);
  firstWeek.setUTCFullYear(year, 0, firstWeekContainsDate);
  firstWeek.setUTCHours(0, 0, 0, 0);
  var date = startOfUTCWeek(firstWeek, options);
  return date;
}

// node_modules/date-fns/esm/_lib/getUTCWeek/index.js
var MILLISECONDS_IN_WEEK2 = 6048e5;
function getUTCWeek(dirtyDate, options) {
  requiredArgs(1, arguments);
  var date = toDate(dirtyDate);
  var diff = startOfUTCWeek(date, options).getTime() - startOfUTCWeekYear(date, options).getTime();
  return Math.round(diff / MILLISECONDS_IN_WEEK2) + 1;
}

// node_modules/date-fns/esm/_lib/addLeadingZeros/index.js
function addLeadingZeros(number, targetLength) {
  var sign = number < 0 ? "-" : "";
  var output = Math.abs(number).toString();
  while (output.length < targetLength) {
    output = "0" + output;
  }
  return sign + output;
}

// node_modules/date-fns/esm/_lib/format/lightFormatters/index.js
var formatters = {
  // Year
  y: function y(date, token) {
    var signedYear = date.getUTCFullYear();
    var year = signedYear > 0 ? signedYear : 1 - signedYear;
    return addLeadingZeros(token === "yy" ? year % 100 : year, token.length);
  },
  // Month
  M: function M(date, token) {
    var month = date.getUTCMonth();
    return token === "M" ? String(month + 1) : addLeadingZeros(month + 1, 2);
  },
  // Day of the month
  d: function d(date, token) {
    return addLeadingZeros(date.getUTCDate(), token.length);
  },
  // AM or PM
  a: function a(date, token) {
    var dayPeriodEnumValue = date.getUTCHours() / 12 >= 1 ? "pm" : "am";
    switch (token) {
      case "a":
      case "aa":
        return dayPeriodEnumValue.toUpperCase();
      case "aaa":
        return dayPeriodEnumValue;
      case "aaaaa":
        return dayPeriodEnumValue[0];
      case "aaaa":
      default:
        return dayPeriodEnumValue === "am" ? "a.m." : "p.m.";
    }
  },
  // Hour [1-12]
  h: function h(date, token) {
    return addLeadingZeros(date.getUTCHours() % 12 || 12, token.length);
  },
  // Hour [0-23]
  H: function H(date, token) {
    return addLeadingZeros(date.getUTCHours(), token.length);
  },
  // Minute
  m: function m(date, token) {
    return addLeadingZeros(date.getUTCMinutes(), token.length);
  },
  // Second
  s: function s(date, token) {
    return addLeadingZeros(date.getUTCSeconds(), token.length);
  },
  // Fraction of second
  S: function S(date, token) {
    var numberOfDigits = token.length;
    var milliseconds = date.getUTCMilliseconds();
    var fractionalSeconds = Math.floor(milliseconds * Math.pow(10, numberOfDigits - 3));
    return addLeadingZeros(fractionalSeconds, token.length);
  }
};
var lightFormatters_default = formatters;

// node_modules/date-fns/esm/_lib/format/formatters/index.js
var dayPeriodEnum = {
  am: "am",
  pm: "pm",
  midnight: "midnight",
  noon: "noon",
  morning: "morning",
  afternoon: "afternoon",
  evening: "evening",
  night: "night"
};
var formatters2 = {
  // Era
  G: function G(date, token, localize2) {
    var era = date.getUTCFullYear() > 0 ? 1 : 0;
    switch (token) {
      // AD, BC
      case "G":
      case "GG":
      case "GGG":
        return localize2.era(era, {
          width: "abbreviated"
        });
      // A, B
      case "GGGGG":
        return localize2.era(era, {
          width: "narrow"
        });
      // Anno Domini, Before Christ
      case "GGGG":
      default:
        return localize2.era(era, {
          width: "wide"
        });
    }
  },
  // Year
  y: function y2(date, token, localize2) {
    if (token === "yo") {
      var signedYear = date.getUTCFullYear();
      var year = signedYear > 0 ? signedYear : 1 - signedYear;
      return localize2.ordinalNumber(year, {
        unit: "year"
      });
    }
    return lightFormatters_default.y(date, token);
  },
  // Local week-numbering year
  Y: function Y(date, token, localize2, options) {
    var signedWeekYear = getUTCWeekYear(date, options);
    var weekYear = signedWeekYear > 0 ? signedWeekYear : 1 - signedWeekYear;
    if (token === "YY") {
      var twoDigitYear = weekYear % 100;
      return addLeadingZeros(twoDigitYear, 2);
    }
    if (token === "Yo") {
      return localize2.ordinalNumber(weekYear, {
        unit: "year"
      });
    }
    return addLeadingZeros(weekYear, token.length);
  },
  // ISO week-numbering year
  R: function R(date, token) {
    var isoWeekYear = getUTCISOWeekYear(date);
    return addLeadingZeros(isoWeekYear, token.length);
  },
  // Extended year. This is a single number designating the year of this calendar system.
  // The main difference between `y` and `u` localizers are B.C. years:
  // | Year | `y` | `u` |
  // |------|-----|-----|
  // | AC 1 |   1 |   1 |
  // | BC 1 |   1 |   0 |
  // | BC 2 |   2 |  -1 |
  // Also `yy` always returns the last two digits of a year,
  // while `uu` pads single digit years to 2 characters and returns other years unchanged.
  u: function u(date, token) {
    var year = date.getUTCFullYear();
    return addLeadingZeros(year, token.length);
  },
  // Quarter
  Q: function Q(date, token, localize2) {
    var quarter = Math.ceil((date.getUTCMonth() + 1) / 3);
    switch (token) {
      // 1, 2, 3, 4
      case "Q":
        return String(quarter);
      // 01, 02, 03, 04
      case "QQ":
        return addLeadingZeros(quarter, 2);
      // 1st, 2nd, 3rd, 4th
      case "Qo":
        return localize2.ordinalNumber(quarter, {
          unit: "quarter"
        });
      // Q1, Q2, Q3, Q4
      case "QQQ":
        return localize2.quarter(quarter, {
          width: "abbreviated",
          context: "formatting"
        });
      // 1, 2, 3, 4 (narrow quarter; could be not numerical)
      case "QQQQQ":
        return localize2.quarter(quarter, {
          width: "narrow",
          context: "formatting"
        });
      // 1st quarter, 2nd quarter, ...
      case "QQQQ":
      default:
        return localize2.quarter(quarter, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // Stand-alone quarter
  q: function q(date, token, localize2) {
    var quarter = Math.ceil((date.getUTCMonth() + 1) / 3);
    switch (token) {
      // 1, 2, 3, 4
      case "q":
        return String(quarter);
      // 01, 02, 03, 04
      case "qq":
        return addLeadingZeros(quarter, 2);
      // 1st, 2nd, 3rd, 4th
      case "qo":
        return localize2.ordinalNumber(quarter, {
          unit: "quarter"
        });
      // Q1, Q2, Q3, Q4
      case "qqq":
        return localize2.quarter(quarter, {
          width: "abbreviated",
          context: "standalone"
        });
      // 1, 2, 3, 4 (narrow quarter; could be not numerical)
      case "qqqqq":
        return localize2.quarter(quarter, {
          width: "narrow",
          context: "standalone"
        });
      // 1st quarter, 2nd quarter, ...
      case "qqqq":
      default:
        return localize2.quarter(quarter, {
          width: "wide",
          context: "standalone"
        });
    }
  },
  // Month
  M: function M2(date, token, localize2) {
    var month = date.getUTCMonth();
    switch (token) {
      case "M":
      case "MM":
        return lightFormatters_default.M(date, token);
      // 1st, 2nd, ..., 12th
      case "Mo":
        return localize2.ordinalNumber(month + 1, {
          unit: "month"
        });
      // Jan, Feb, ..., Dec
      case "MMM":
        return localize2.month(month, {
          width: "abbreviated",
          context: "formatting"
        });
      // J, F, ..., D
      case "MMMMM":
        return localize2.month(month, {
          width: "narrow",
          context: "formatting"
        });
      // January, February, ..., December
      case "MMMM":
      default:
        return localize2.month(month, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // Stand-alone month
  L: function L(date, token, localize2) {
    var month = date.getUTCMonth();
    switch (token) {
      // 1, 2, ..., 12
      case "L":
        return String(month + 1);
      // 01, 02, ..., 12
      case "LL":
        return addLeadingZeros(month + 1, 2);
      // 1st, 2nd, ..., 12th
      case "Lo":
        return localize2.ordinalNumber(month + 1, {
          unit: "month"
        });
      // Jan, Feb, ..., Dec
      case "LLL":
        return localize2.month(month, {
          width: "abbreviated",
          context: "standalone"
        });
      // J, F, ..., D
      case "LLLLL":
        return localize2.month(month, {
          width: "narrow",
          context: "standalone"
        });
      // January, February, ..., December
      case "LLLL":
      default:
        return localize2.month(month, {
          width: "wide",
          context: "standalone"
        });
    }
  },
  // Local week of year
  w: function w(date, token, localize2, options) {
    var week = getUTCWeek(date, options);
    if (token === "wo") {
      return localize2.ordinalNumber(week, {
        unit: "week"
      });
    }
    return addLeadingZeros(week, token.length);
  },
  // ISO week of year
  I: function I(date, token, localize2) {
    var isoWeek = getUTCISOWeek(date);
    if (token === "Io") {
      return localize2.ordinalNumber(isoWeek, {
        unit: "week"
      });
    }
    return addLeadingZeros(isoWeek, token.length);
  },
  // Day of the month
  d: function d2(date, token, localize2) {
    if (token === "do") {
      return localize2.ordinalNumber(date.getUTCDate(), {
        unit: "date"
      });
    }
    return lightFormatters_default.d(date, token);
  },
  // Day of year
  D: function D(date, token, localize2) {
    var dayOfYear = getUTCDayOfYear(date);
    if (token === "Do") {
      return localize2.ordinalNumber(dayOfYear, {
        unit: "dayOfYear"
      });
    }
    return addLeadingZeros(dayOfYear, token.length);
  },
  // Day of week
  E: function E(date, token, localize2) {
    var dayOfWeek = date.getUTCDay();
    switch (token) {
      // Tue
      case "E":
      case "EE":
      case "EEE":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "formatting"
        });
      // T
      case "EEEEE":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "formatting"
        });
      // Tu
      case "EEEEEE":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "formatting"
        });
      // Tuesday
      case "EEEE":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // Local day of week
  e: function e(date, token, localize2, options) {
    var dayOfWeek = date.getUTCDay();
    var localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;
    switch (token) {
      // Numerical value (Nth day of week with current locale or weekStartsOn)
      case "e":
        return String(localDayOfWeek);
      // Padded numerical value
      case "ee":
        return addLeadingZeros(localDayOfWeek, 2);
      // 1st, 2nd, ..., 7th
      case "eo":
        return localize2.ordinalNumber(localDayOfWeek, {
          unit: "day"
        });
      case "eee":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "formatting"
        });
      // T
      case "eeeee":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "formatting"
        });
      // Tu
      case "eeeeee":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "formatting"
        });
      // Tuesday
      case "eeee":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // Stand-alone local day of week
  c: function c(date, token, localize2, options) {
    var dayOfWeek = date.getUTCDay();
    var localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;
    switch (token) {
      // Numerical value (same as in `e`)
      case "c":
        return String(localDayOfWeek);
      // Padded numerical value
      case "cc":
        return addLeadingZeros(localDayOfWeek, token.length);
      // 1st, 2nd, ..., 7th
      case "co":
        return localize2.ordinalNumber(localDayOfWeek, {
          unit: "day"
        });
      case "ccc":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "standalone"
        });
      // T
      case "ccccc":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "standalone"
        });
      // Tu
      case "cccccc":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "standalone"
        });
      // Tuesday
      case "cccc":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "standalone"
        });
    }
  },
  // ISO day of week
  i: function i(date, token, localize2) {
    var dayOfWeek = date.getUTCDay();
    var isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    switch (token) {
      // 2
      case "i":
        return String(isoDayOfWeek);
      // 02
      case "ii":
        return addLeadingZeros(isoDayOfWeek, token.length);
      // 2nd
      case "io":
        return localize2.ordinalNumber(isoDayOfWeek, {
          unit: "day"
        });
      // Tue
      case "iii":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "formatting"
        });
      // T
      case "iiiii":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "formatting"
        });
      // Tu
      case "iiiiii":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "formatting"
        });
      // Tuesday
      case "iiii":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // AM or PM
  a: function a2(date, token, localize2) {
    var hours = date.getUTCHours();
    var dayPeriodEnumValue = hours / 12 >= 1 ? "pm" : "am";
    switch (token) {
      case "a":
      case "aa":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        });
      case "aaa":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        }).toLowerCase();
      case "aaaaa":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "narrow",
          context: "formatting"
        });
      case "aaaa":
      default:
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // AM, PM, midnight, noon
  b: function b(date, token, localize2) {
    var hours = date.getUTCHours();
    var dayPeriodEnumValue;
    if (hours === 12) {
      dayPeriodEnumValue = dayPeriodEnum.noon;
    } else if (hours === 0) {
      dayPeriodEnumValue = dayPeriodEnum.midnight;
    } else {
      dayPeriodEnumValue = hours / 12 >= 1 ? "pm" : "am";
    }
    switch (token) {
      case "b":
      case "bb":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        });
      case "bbb":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        }).toLowerCase();
      case "bbbbb":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "narrow",
          context: "formatting"
        });
      case "bbbb":
      default:
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // in the morning, in the afternoon, in the evening, at night
  B: function B(date, token, localize2) {
    var hours = date.getUTCHours();
    var dayPeriodEnumValue;
    if (hours >= 17) {
      dayPeriodEnumValue = dayPeriodEnum.evening;
    } else if (hours >= 12) {
      dayPeriodEnumValue = dayPeriodEnum.afternoon;
    } else if (hours >= 4) {
      dayPeriodEnumValue = dayPeriodEnum.morning;
    } else {
      dayPeriodEnumValue = dayPeriodEnum.night;
    }
    switch (token) {
      case "B":
      case "BB":
      case "BBB":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        });
      case "BBBBB":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "narrow",
          context: "formatting"
        });
      case "BBBB":
      default:
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // Hour [1-12]
  h: function h2(date, token, localize2) {
    if (token === "ho") {
      var hours = date.getUTCHours() % 12;
      if (hours === 0) hours = 12;
      return localize2.ordinalNumber(hours, {
        unit: "hour"
      });
    }
    return lightFormatters_default.h(date, token);
  },
  // Hour [0-23]
  H: function H2(date, token, localize2) {
    if (token === "Ho") {
      return localize2.ordinalNumber(date.getUTCHours(), {
        unit: "hour"
      });
    }
    return lightFormatters_default.H(date, token);
  },
  // Hour [0-11]
  K: function K(date, token, localize2) {
    var hours = date.getUTCHours() % 12;
    if (token === "Ko") {
      return localize2.ordinalNumber(hours, {
        unit: "hour"
      });
    }
    return addLeadingZeros(hours, token.length);
  },
  // Hour [1-24]
  k: function k(date, token, localize2) {
    var hours = date.getUTCHours();
    if (hours === 0) hours = 24;
    if (token === "ko") {
      return localize2.ordinalNumber(hours, {
        unit: "hour"
      });
    }
    return addLeadingZeros(hours, token.length);
  },
  // Minute
  m: function m2(date, token, localize2) {
    if (token === "mo") {
      return localize2.ordinalNumber(date.getUTCMinutes(), {
        unit: "minute"
      });
    }
    return lightFormatters_default.m(date, token);
  },
  // Second
  s: function s2(date, token, localize2) {
    if (token === "so") {
      return localize2.ordinalNumber(date.getUTCSeconds(), {
        unit: "second"
      });
    }
    return lightFormatters_default.s(date, token);
  },
  // Fraction of second
  S: function S2(date, token) {
    return lightFormatters_default.S(date, token);
  },
  // Timezone (ISO-8601. If offset is 0, output is always `'Z'`)
  X: function X(date, token, _localize, options) {
    var originalDate = options._originalDate || date;
    var timezoneOffset = originalDate.getTimezoneOffset();
    if (timezoneOffset === 0) {
      return "Z";
    }
    switch (token) {
      // Hours and optional minutes
      case "X":
        return formatTimezoneWithOptionalMinutes(timezoneOffset);
      // Hours, minutes and optional seconds without `:` delimiter
      // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
      // so this token always has the same output as `XX`
      case "XXXX":
      case "XX":
        return formatTimezone(timezoneOffset);
      // Hours, minutes and optional seconds with `:` delimiter
      // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
      // so this token always has the same output as `XXX`
      case "XXXXX":
      case "XXX":
      // Hours and minutes with `:` delimiter
      default:
        return formatTimezone(timezoneOffset, ":");
    }
  },
  // Timezone (ISO-8601. If offset is 0, output is `'+00:00'` or equivalent)
  x: function x(date, token, _localize, options) {
    var originalDate = options._originalDate || date;
    var timezoneOffset = originalDate.getTimezoneOffset();
    switch (token) {
      // Hours and optional minutes
      case "x":
        return formatTimezoneWithOptionalMinutes(timezoneOffset);
      // Hours, minutes and optional seconds without `:` delimiter
      // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
      // so this token always has the same output as `xx`
      case "xxxx":
      case "xx":
        return formatTimezone(timezoneOffset);
      // Hours, minutes and optional seconds with `:` delimiter
      // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
      // so this token always has the same output as `xxx`
      case "xxxxx":
      case "xxx":
      // Hours and minutes with `:` delimiter
      default:
        return formatTimezone(timezoneOffset, ":");
    }
  },
  // Timezone (GMT)
  O: function O(date, token, _localize, options) {
    var originalDate = options._originalDate || date;
    var timezoneOffset = originalDate.getTimezoneOffset();
    switch (token) {
      // Short
      case "O":
      case "OO":
      case "OOO":
        return "GMT" + formatTimezoneShort(timezoneOffset, ":");
      // Long
      case "OOOO":
      default:
        return "GMT" + formatTimezone(timezoneOffset, ":");
    }
  },
  // Timezone (specific non-location)
  z: function z(date, token, _localize, options) {
    var originalDate = options._originalDate || date;
    var timezoneOffset = originalDate.getTimezoneOffset();
    switch (token) {
      // Short
      case "z":
      case "zz":
      case "zzz":
        return "GMT" + formatTimezoneShort(timezoneOffset, ":");
      // Long
      case "zzzz":
      default:
        return "GMT" + formatTimezone(timezoneOffset, ":");
    }
  },
  // Seconds timestamp
  t: function t(date, token, _localize, options) {
    var originalDate = options._originalDate || date;
    var timestamp = Math.floor(originalDate.getTime() / 1e3);
    return addLeadingZeros(timestamp, token.length);
  },
  // Milliseconds timestamp
  T: function T(date, token, _localize, options) {
    var originalDate = options._originalDate || date;
    var timestamp = originalDate.getTime();
    return addLeadingZeros(timestamp, token.length);
  }
};
function formatTimezoneShort(offset, dirtyDelimiter) {
  var sign = offset > 0 ? "-" : "+";
  var absOffset = Math.abs(offset);
  var hours = Math.floor(absOffset / 60);
  var minutes = absOffset % 60;
  if (minutes === 0) {
    return sign + String(hours);
  }
  var delimiter = dirtyDelimiter || "";
  return sign + String(hours) + delimiter + addLeadingZeros(minutes, 2);
}
function formatTimezoneWithOptionalMinutes(offset, dirtyDelimiter) {
  if (offset % 60 === 0) {
    var sign = offset > 0 ? "-" : "+";
    return sign + addLeadingZeros(Math.abs(offset) / 60, 2);
  }
  return formatTimezone(offset, dirtyDelimiter);
}
function formatTimezone(offset, dirtyDelimiter) {
  var delimiter = dirtyDelimiter || "";
  var sign = offset > 0 ? "-" : "+";
  var absOffset = Math.abs(offset);
  var hours = addLeadingZeros(Math.floor(absOffset / 60), 2);
  var minutes = addLeadingZeros(absOffset % 60, 2);
  return sign + hours + delimiter + minutes;
}
var formatters_default = formatters2;

// node_modules/date-fns/esm/_lib/format/longFormatters/index.js
var dateLongFormatter = function dateLongFormatter2(pattern, formatLong2) {
  switch (pattern) {
    case "P":
      return formatLong2.date({
        width: "short"
      });
    case "PP":
      return formatLong2.date({
        width: "medium"
      });
    case "PPP":
      return formatLong2.date({
        width: "long"
      });
    case "PPPP":
    default:
      return formatLong2.date({
        width: "full"
      });
  }
};
var timeLongFormatter = function timeLongFormatter2(pattern, formatLong2) {
  switch (pattern) {
    case "p":
      return formatLong2.time({
        width: "short"
      });
    case "pp":
      return formatLong2.time({
        width: "medium"
      });
    case "ppp":
      return formatLong2.time({
        width: "long"
      });
    case "pppp":
    default:
      return formatLong2.time({
        width: "full"
      });
  }
};
var dateTimeLongFormatter = function dateTimeLongFormatter2(pattern, formatLong2) {
  var matchResult = pattern.match(/(P+)(p+)?/) || [];
  var datePattern = matchResult[1];
  var timePattern = matchResult[2];
  if (!timePattern) {
    return dateLongFormatter(pattern, formatLong2);
  }
  var dateTimeFormat;
  switch (datePattern) {
    case "P":
      dateTimeFormat = formatLong2.dateTime({
        width: "short"
      });
      break;
    case "PP":
      dateTimeFormat = formatLong2.dateTime({
        width: "medium"
      });
      break;
    case "PPP":
      dateTimeFormat = formatLong2.dateTime({
        width: "long"
      });
      break;
    case "PPPP":
    default:
      dateTimeFormat = formatLong2.dateTime({
        width: "full"
      });
      break;
  }
  return dateTimeFormat.replace("{{date}}", dateLongFormatter(datePattern, formatLong2)).replace("{{time}}", timeLongFormatter(timePattern, formatLong2));
};
var longFormatters = {
  p: timeLongFormatter,
  P: dateTimeLongFormatter
};
var longFormatters_default = longFormatters;

// node_modules/date-fns/esm/_lib/protectedTokens/index.js
var protectedDayOfYearTokens = ["D", "DD"];
var protectedWeekYearTokens = ["YY", "YYYY"];
function isProtectedDayOfYearToken(token) {
  return protectedDayOfYearTokens.indexOf(token) !== -1;
}
function isProtectedWeekYearToken(token) {
  return protectedWeekYearTokens.indexOf(token) !== -1;
}
function throwProtectedError(token, format2, input) {
  if (token === "YYYY") {
    throw new RangeError("Use `yyyy` instead of `YYYY` (in `".concat(format2, "`) for formatting years to the input `").concat(input, "`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md"));
  } else if (token === "YY") {
    throw new RangeError("Use `yy` instead of `YY` (in `".concat(format2, "`) for formatting years to the input `").concat(input, "`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md"));
  } else if (token === "D") {
    throw new RangeError("Use `d` instead of `D` (in `".concat(format2, "`) for formatting days of the month to the input `").concat(input, "`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md"));
  } else if (token === "DD") {
    throw new RangeError("Use `dd` instead of `DD` (in `".concat(format2, "`) for formatting days of the month to the input `").concat(input, "`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md"));
  }
}

// node_modules/date-fns/esm/locale/en-US/_lib/formatDistance/index.js
var formatDistanceLocale = {
  lessThanXSeconds: {
    one: "less than a second",
    other: "less than {{count}} seconds"
  },
  xSeconds: {
    one: "1 second",
    other: "{{count}} seconds"
  },
  halfAMinute: "half a minute",
  lessThanXMinutes: {
    one: "less than a minute",
    other: "less than {{count}} minutes"
  },
  xMinutes: {
    one: "1 minute",
    other: "{{count}} minutes"
  },
  aboutXHours: {
    one: "about 1 hour",
    other: "about {{count}} hours"
  },
  xHours: {
    one: "1 hour",
    other: "{{count}} hours"
  },
  xDays: {
    one: "1 day",
    other: "{{count}} days"
  },
  aboutXWeeks: {
    one: "about 1 week",
    other: "about {{count}} weeks"
  },
  xWeeks: {
    one: "1 week",
    other: "{{count}} weeks"
  },
  aboutXMonths: {
    one: "about 1 month",
    other: "about {{count}} months"
  },
  xMonths: {
    one: "1 month",
    other: "{{count}} months"
  },
  aboutXYears: {
    one: "about 1 year",
    other: "about {{count}} years"
  },
  xYears: {
    one: "1 year",
    other: "{{count}} years"
  },
  overXYears: {
    one: "over 1 year",
    other: "over {{count}} years"
  },
  almostXYears: {
    one: "almost 1 year",
    other: "almost {{count}} years"
  }
};
var formatDistance = function formatDistance2(token, count, options) {
  var result;
  var tokenValue = formatDistanceLocale[token];
  if (typeof tokenValue === "string") {
    result = tokenValue;
  } else if (count === 1) {
    result = tokenValue.one;
  } else {
    result = tokenValue.other.replace("{{count}}", count.toString());
  }
  if (options !== null && options !== void 0 && options.addSuffix) {
    if (options.comparison && options.comparison > 0) {
      return "in " + result;
    } else {
      return result + " ago";
    }
  }
  return result;
};
var formatDistance_default = formatDistance;

// node_modules/date-fns/esm/locale/_lib/buildFormatLongFn/index.js
function buildFormatLongFn(args) {
  return function() {
    var options = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    var width = options.width ? String(options.width) : args.defaultWidth;
    var format2 = args.formats[width] || args.formats[args.defaultWidth];
    return format2;
  };
}

// node_modules/date-fns/esm/locale/en-US/_lib/formatLong/index.js
var dateFormats = {
  full: "EEEE, MMMM do, y",
  long: "MMMM do, y",
  medium: "MMM d, y",
  short: "MM/dd/yyyy"
};
var timeFormats = {
  full: "h:mm:ss a zzzz",
  long: "h:mm:ss a z",
  medium: "h:mm:ss a",
  short: "h:mm a"
};
var dateTimeFormats = {
  full: "{{date}} 'at' {{time}}",
  long: "{{date}} 'at' {{time}}",
  medium: "{{date}}, {{time}}",
  short: "{{date}}, {{time}}"
};
var formatLong = {
  date: buildFormatLongFn({
    formats: dateFormats,
    defaultWidth: "full"
  }),
  time: buildFormatLongFn({
    formats: timeFormats,
    defaultWidth: "full"
  }),
  dateTime: buildFormatLongFn({
    formats: dateTimeFormats,
    defaultWidth: "full"
  })
};
var formatLong_default = formatLong;

// node_modules/date-fns/esm/locale/en-US/_lib/formatRelative/index.js
var formatRelativeLocale = {
  lastWeek: "'last' eeee 'at' p",
  yesterday: "'yesterday at' p",
  today: "'today at' p",
  tomorrow: "'tomorrow at' p",
  nextWeek: "eeee 'at' p",
  other: "P"
};
var formatRelative = function formatRelative2(token, _date, _baseDate, _options) {
  return formatRelativeLocale[token];
};
var formatRelative_default = formatRelative;

// node_modules/date-fns/esm/locale/_lib/buildLocalizeFn/index.js
function buildLocalizeFn(args) {
  return function(dirtyIndex, options) {
    var context = options !== null && options !== void 0 && options.context ? String(options.context) : "standalone";
    var valuesArray;
    if (context === "formatting" && args.formattingValues) {
      var defaultWidth = args.defaultFormattingWidth || args.defaultWidth;
      var width = options !== null && options !== void 0 && options.width ? String(options.width) : defaultWidth;
      valuesArray = args.formattingValues[width] || args.formattingValues[defaultWidth];
    } else {
      var _defaultWidth = args.defaultWidth;
      var _width = options !== null && options !== void 0 && options.width ? String(options.width) : args.defaultWidth;
      valuesArray = args.values[_width] || args.values[_defaultWidth];
    }
    var index = args.argumentCallback ? args.argumentCallback(dirtyIndex) : dirtyIndex;
    return valuesArray[index];
  };
}

// node_modules/date-fns/esm/locale/en-US/_lib/localize/index.js
var eraValues = {
  narrow: ["B", "A"],
  abbreviated: ["BC", "AD"],
  wide: ["Before Christ", "Anno Domini"]
};
var quarterValues = {
  narrow: ["1", "2", "3", "4"],
  abbreviated: ["Q1", "Q2", "Q3", "Q4"],
  wide: ["1st quarter", "2nd quarter", "3rd quarter", "4th quarter"]
};
var monthValues = {
  narrow: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
  abbreviated: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  wide: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
};
var dayValues = {
  narrow: ["S", "M", "T", "W", "T", "F", "S"],
  short: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  abbreviated: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  wide: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
};
var dayPeriodValues = {
  narrow: {
    am: "a",
    pm: "p",
    midnight: "mi",
    noon: "n",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  },
  abbreviated: {
    am: "AM",
    pm: "PM",
    midnight: "midnight",
    noon: "noon",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  },
  wide: {
    am: "a.m.",
    pm: "p.m.",
    midnight: "midnight",
    noon: "noon",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  }
};
var formattingDayPeriodValues = {
  narrow: {
    am: "a",
    pm: "p",
    midnight: "mi",
    noon: "n",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  },
  abbreviated: {
    am: "AM",
    pm: "PM",
    midnight: "midnight",
    noon: "noon",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  },
  wide: {
    am: "a.m.",
    pm: "p.m.",
    midnight: "midnight",
    noon: "noon",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  }
};
var ordinalNumber = function ordinalNumber2(dirtyNumber, _options) {
  var number = Number(dirtyNumber);
  var rem100 = number % 100;
  if (rem100 > 20 || rem100 < 10) {
    switch (rem100 % 10) {
      case 1:
        return number + "st";
      case 2:
        return number + "nd";
      case 3:
        return number + "rd";
    }
  }
  return number + "th";
};
var localize = {
  ordinalNumber,
  era: buildLocalizeFn({
    values: eraValues,
    defaultWidth: "wide"
  }),
  quarter: buildLocalizeFn({
    values: quarterValues,
    defaultWidth: "wide",
    argumentCallback: function argumentCallback(quarter) {
      return quarter - 1;
    }
  }),
  month: buildLocalizeFn({
    values: monthValues,
    defaultWidth: "wide"
  }),
  day: buildLocalizeFn({
    values: dayValues,
    defaultWidth: "wide"
  }),
  dayPeriod: buildLocalizeFn({
    values: dayPeriodValues,
    defaultWidth: "wide",
    formattingValues: formattingDayPeriodValues,
    defaultFormattingWidth: "wide"
  })
};
var localize_default = localize;

// node_modules/date-fns/esm/locale/_lib/buildMatchFn/index.js
function buildMatchFn(args) {
  return function(string) {
    var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    var width = options.width;
    var matchPattern = width && args.matchPatterns[width] || args.matchPatterns[args.defaultMatchWidth];
    var matchResult = string.match(matchPattern);
    if (!matchResult) {
      return null;
    }
    var matchedString = matchResult[0];
    var parsePatterns = width && args.parsePatterns[width] || args.parsePatterns[args.defaultParseWidth];
    var key = Array.isArray(parsePatterns) ? findIndex(parsePatterns, function(pattern) {
      return pattern.test(matchedString);
    }) : findKey(parsePatterns, function(pattern) {
      return pattern.test(matchedString);
    });
    var value;
    value = args.valueCallback ? args.valueCallback(key) : key;
    value = options.valueCallback ? options.valueCallback(value) : value;
    var rest = string.slice(matchedString.length);
    return {
      value,
      rest
    };
  };
}
function findKey(object, predicate) {
  for (var key in object) {
    if (object.hasOwnProperty(key) && predicate(object[key])) {
      return key;
    }
  }
  return void 0;
}
function findIndex(array, predicate) {
  for (var key = 0; key < array.length; key++) {
    if (predicate(array[key])) {
      return key;
    }
  }
  return void 0;
}

// node_modules/date-fns/esm/locale/_lib/buildMatchPatternFn/index.js
function buildMatchPatternFn(args) {
  return function(string) {
    var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    var matchResult = string.match(args.matchPattern);
    if (!matchResult) return null;
    var matchedString = matchResult[0];
    var parseResult = string.match(args.parsePattern);
    if (!parseResult) return null;
    var value = args.valueCallback ? args.valueCallback(parseResult[0]) : parseResult[0];
    value = options.valueCallback ? options.valueCallback(value) : value;
    var rest = string.slice(matchedString.length);
    return {
      value,
      rest
    };
  };
}

// node_modules/date-fns/esm/locale/en-US/_lib/match/index.js
var matchOrdinalNumberPattern = /^(\d+)(th|st|nd|rd)?/i;
var parseOrdinalNumberPattern = /\d+/i;
var matchEraPatterns = {
  narrow: /^(b|a)/i,
  abbreviated: /^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,
  wide: /^(before christ|before common era|anno domini|common era)/i
};
var parseEraPatterns = {
  any: [/^b/i, /^(a|c)/i]
};
var matchQuarterPatterns = {
  narrow: /^[1234]/i,
  abbreviated: /^q[1234]/i,
  wide: /^[1234](th|st|nd|rd)? quarter/i
};
var parseQuarterPatterns = {
  any: [/1/i, /2/i, /3/i, /4/i]
};
var matchMonthPatterns = {
  narrow: /^[jfmasond]/i,
  abbreviated: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
  wide: /^(january|february|march|april|may|june|july|august|september|october|november|december)/i
};
var parseMonthPatterns = {
  narrow: [/^j/i, /^f/i, /^m/i, /^a/i, /^m/i, /^j/i, /^j/i, /^a/i, /^s/i, /^o/i, /^n/i, /^d/i],
  any: [/^ja/i, /^f/i, /^mar/i, /^ap/i, /^may/i, /^jun/i, /^jul/i, /^au/i, /^s/i, /^o/i, /^n/i, /^d/i]
};
var matchDayPatterns = {
  narrow: /^[smtwf]/i,
  short: /^(su|mo|tu|we|th|fr|sa)/i,
  abbreviated: /^(sun|mon|tue|wed|thu|fri|sat)/i,
  wide: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
};
var parseDayPatterns = {
  narrow: [/^s/i, /^m/i, /^t/i, /^w/i, /^t/i, /^f/i, /^s/i],
  any: [/^su/i, /^m/i, /^tu/i, /^w/i, /^th/i, /^f/i, /^sa/i]
};
var matchDayPeriodPatterns = {
  narrow: /^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,
  any: /^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i
};
var parseDayPeriodPatterns = {
  any: {
    am: /^a/i,
    pm: /^p/i,
    midnight: /^mi/i,
    noon: /^no/i,
    morning: /morning/i,
    afternoon: /afternoon/i,
    evening: /evening/i,
    night: /night/i
  }
};
var match = {
  ordinalNumber: buildMatchPatternFn({
    matchPattern: matchOrdinalNumberPattern,
    parsePattern: parseOrdinalNumberPattern,
    valueCallback: function valueCallback(value) {
      return parseInt(value, 10);
    }
  }),
  era: buildMatchFn({
    matchPatterns: matchEraPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseEraPatterns,
    defaultParseWidth: "any"
  }),
  quarter: buildMatchFn({
    matchPatterns: matchQuarterPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseQuarterPatterns,
    defaultParseWidth: "any",
    valueCallback: function valueCallback2(index) {
      return index + 1;
    }
  }),
  month: buildMatchFn({
    matchPatterns: matchMonthPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseMonthPatterns,
    defaultParseWidth: "any"
  }),
  day: buildMatchFn({
    matchPatterns: matchDayPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseDayPatterns,
    defaultParseWidth: "any"
  }),
  dayPeriod: buildMatchFn({
    matchPatterns: matchDayPeriodPatterns,
    defaultMatchWidth: "any",
    parsePatterns: parseDayPeriodPatterns,
    defaultParseWidth: "any"
  })
};
var match_default = match;

// node_modules/date-fns/esm/locale/en-US/index.js
var locale = {
  code: "en-US",
  formatDistance: formatDistance_default,
  formatLong: formatLong_default,
  formatRelative: formatRelative_default,
  localize: localize_default,
  match: match_default,
  options: {
    weekStartsOn: 0,
    firstWeekContainsDate: 1
  }
};
var en_US_default = locale;

// node_modules/date-fns/esm/_lib/defaultLocale/index.js
var defaultLocale_default = en_US_default;

// node_modules/date-fns/esm/format/index.js
var formattingTokensRegExp = /[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g;
var longFormattingTokensRegExp = /P+p+|P+|p+|''|'(''|[^'])+('|$)|./g;
var escapedStringRegExp = /^'([^]*?)'?$/;
var doubleQuoteRegExp = /''/g;
var unescapedLatinCharacterRegExp = /[a-zA-Z]/;
function format(dirtyDate, dirtyFormatStr, options) {
  var _ref, _options$locale, _ref2, _ref3, _ref4, _options$firstWeekCon, _options$locale2, _options$locale2$opti, _defaultOptions$local, _defaultOptions$local2, _ref5, _ref6, _ref7, _options$weekStartsOn, _options$locale3, _options$locale3$opti, _defaultOptions$local3, _defaultOptions$local4;
  requiredArgs(2, arguments);
  var formatStr = String(dirtyFormatStr);
  var defaultOptions2 = getDefaultOptions();
  var locale2 = (_ref = (_options$locale = options === null || options === void 0 ? void 0 : options.locale) !== null && _options$locale !== void 0 ? _options$locale : defaultOptions2.locale) !== null && _ref !== void 0 ? _ref : defaultLocale_default;
  var firstWeekContainsDate = toInteger((_ref2 = (_ref3 = (_ref4 = (_options$firstWeekCon = options === null || options === void 0 ? void 0 : options.firstWeekContainsDate) !== null && _options$firstWeekCon !== void 0 ? _options$firstWeekCon : options === null || options === void 0 ? void 0 : (_options$locale2 = options.locale) === null || _options$locale2 === void 0 ? void 0 : (_options$locale2$opti = _options$locale2.options) === null || _options$locale2$opti === void 0 ? void 0 : _options$locale2$opti.firstWeekContainsDate) !== null && _ref4 !== void 0 ? _ref4 : defaultOptions2.firstWeekContainsDate) !== null && _ref3 !== void 0 ? _ref3 : (_defaultOptions$local = defaultOptions2.locale) === null || _defaultOptions$local === void 0 ? void 0 : (_defaultOptions$local2 = _defaultOptions$local.options) === null || _defaultOptions$local2 === void 0 ? void 0 : _defaultOptions$local2.firstWeekContainsDate) !== null && _ref2 !== void 0 ? _ref2 : 1);
  if (!(firstWeekContainsDate >= 1 && firstWeekContainsDate <= 7)) {
    throw new RangeError("firstWeekContainsDate must be between 1 and 7 inclusively");
  }
  var weekStartsOn = toInteger((_ref5 = (_ref6 = (_ref7 = (_options$weekStartsOn = options === null || options === void 0 ? void 0 : options.weekStartsOn) !== null && _options$weekStartsOn !== void 0 ? _options$weekStartsOn : options === null || options === void 0 ? void 0 : (_options$locale3 = options.locale) === null || _options$locale3 === void 0 ? void 0 : (_options$locale3$opti = _options$locale3.options) === null || _options$locale3$opti === void 0 ? void 0 : _options$locale3$opti.weekStartsOn) !== null && _ref7 !== void 0 ? _ref7 : defaultOptions2.weekStartsOn) !== null && _ref6 !== void 0 ? _ref6 : (_defaultOptions$local3 = defaultOptions2.locale) === null || _defaultOptions$local3 === void 0 ? void 0 : (_defaultOptions$local4 = _defaultOptions$local3.options) === null || _defaultOptions$local4 === void 0 ? void 0 : _defaultOptions$local4.weekStartsOn) !== null && _ref5 !== void 0 ? _ref5 : 0);
  if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
    throw new RangeError("weekStartsOn must be between 0 and 6 inclusively");
  }
  if (!locale2.localize) {
    throw new RangeError("locale must contain localize property");
  }
  if (!locale2.formatLong) {
    throw new RangeError("locale must contain formatLong property");
  }
  var originalDate = toDate(dirtyDate);
  if (!isValid(originalDate)) {
    throw new RangeError("Invalid time value");
  }
  var timezoneOffset = getTimezoneOffsetInMilliseconds(originalDate);
  var utcDate = subMilliseconds(originalDate, timezoneOffset);
  var formatterOptions = {
    firstWeekContainsDate,
    weekStartsOn,
    locale: locale2,
    _originalDate: originalDate
  };
  var result = formatStr.match(longFormattingTokensRegExp).map(function(substring) {
    var firstCharacter = substring[0];
    if (firstCharacter === "p" || firstCharacter === "P") {
      var longFormatter = longFormatters_default[firstCharacter];
      return longFormatter(substring, locale2.formatLong);
    }
    return substring;
  }).join("").match(formattingTokensRegExp).map(function(substring) {
    if (substring === "''") {
      return "'";
    }
    var firstCharacter = substring[0];
    if (firstCharacter === "'") {
      return cleanEscapedString(substring);
    }
    var formatter = formatters_default[firstCharacter];
    if (formatter) {
      if (!(options !== null && options !== void 0 && options.useAdditionalWeekYearTokens) && isProtectedWeekYearToken(substring)) {
        throwProtectedError(substring, dirtyFormatStr, String(dirtyDate));
      }
      if (!(options !== null && options !== void 0 && options.useAdditionalDayOfYearTokens) && isProtectedDayOfYearToken(substring)) {
        throwProtectedError(substring, dirtyFormatStr, String(dirtyDate));
      }
      return formatter(utcDate, substring, locale2.localize, formatterOptions);
    }
    if (firstCharacter.match(unescapedLatinCharacterRegExp)) {
      throw new RangeError("Format string contains an unescaped latin alphabet character `" + firstCharacter + "`");
    }
    return substring;
  }).join("");
  return result;
}
function cleanEscapedString(input) {
  var matched = input.match(escapedStringRegExp);
  if (!matched) {
    return input;
  }
  return matched[1].replace(doubleQuoteRegExp, "'");
}

// node_modules/date-fns/esm/_lib/assign/index.js
function assign2(target, object) {
  if (target == null) {
    throw new TypeError("assign requires that input parameter not be null or undefined");
  }
  for (var property in object) {
    if (Object.prototype.hasOwnProperty.call(object, property)) {
      ;
      target[property] = object[property];
    }
  }
  return target;
}

// node_modules/date-fns/esm/_lib/cloneObject/index.js
function cloneObject(object) {
  return assign2({}, object);
}

// node_modules/date-fns/esm/formatDistance/index.js
var MINUTES_IN_DAY = 1440;
var MINUTES_IN_ALMOST_TWO_DAYS = 2520;
var MINUTES_IN_MONTH = 43200;
var MINUTES_IN_TWO_MONTHS = 86400;
function formatDistance3(dirtyDate, dirtyBaseDate, options) {
  var _ref, _options$locale;
  requiredArgs(2, arguments);
  var defaultOptions2 = getDefaultOptions();
  var locale2 = (_ref = (_options$locale = options === null || options === void 0 ? void 0 : options.locale) !== null && _options$locale !== void 0 ? _options$locale : defaultOptions2.locale) !== null && _ref !== void 0 ? _ref : defaultLocale_default;
  if (!locale2.formatDistance) {
    throw new RangeError("locale must contain formatDistance property");
  }
  var comparison = compareAsc(dirtyDate, dirtyBaseDate);
  if (isNaN(comparison)) {
    throw new RangeError("Invalid time value");
  }
  var localizeOptions = assign2(cloneObject(options), {
    addSuffix: Boolean(options === null || options === void 0 ? void 0 : options.addSuffix),
    comparison
  });
  var dateLeft;
  var dateRight;
  if (comparison > 0) {
    dateLeft = toDate(dirtyBaseDate);
    dateRight = toDate(dirtyDate);
  } else {
    dateLeft = toDate(dirtyDate);
    dateRight = toDate(dirtyBaseDate);
  }
  var seconds = differenceInSeconds(dateRight, dateLeft);
  var offsetInSeconds = (getTimezoneOffsetInMilliseconds(dateRight) - getTimezoneOffsetInMilliseconds(dateLeft)) / 1e3;
  var minutes = Math.round((seconds - offsetInSeconds) / 60);
  var months;
  if (minutes < 2) {
    if (options !== null && options !== void 0 && options.includeSeconds) {
      if (seconds < 5) {
        return locale2.formatDistance("lessThanXSeconds", 5, localizeOptions);
      } else if (seconds < 10) {
        return locale2.formatDistance("lessThanXSeconds", 10, localizeOptions);
      } else if (seconds < 20) {
        return locale2.formatDistance("lessThanXSeconds", 20, localizeOptions);
      } else if (seconds < 40) {
        return locale2.formatDistance("halfAMinute", 0, localizeOptions);
      } else if (seconds < 60) {
        return locale2.formatDistance("lessThanXMinutes", 1, localizeOptions);
      } else {
        return locale2.formatDistance("xMinutes", 1, localizeOptions);
      }
    } else {
      if (minutes === 0) {
        return locale2.formatDistance("lessThanXMinutes", 1, localizeOptions);
      } else {
        return locale2.formatDistance("xMinutes", minutes, localizeOptions);
      }
    }
  } else if (minutes < 45) {
    return locale2.formatDistance("xMinutes", minutes, localizeOptions);
  } else if (minutes < 90) {
    return locale2.formatDistance("aboutXHours", 1, localizeOptions);
  } else if (minutes < MINUTES_IN_DAY) {
    var hours = Math.round(minutes / 60);
    return locale2.formatDistance("aboutXHours", hours, localizeOptions);
  } else if (minutes < MINUTES_IN_ALMOST_TWO_DAYS) {
    return locale2.formatDistance("xDays", 1, localizeOptions);
  } else if (minutes < MINUTES_IN_MONTH) {
    var days = Math.round(minutes / MINUTES_IN_DAY);
    return locale2.formatDistance("xDays", days, localizeOptions);
  } else if (minutes < MINUTES_IN_TWO_MONTHS) {
    months = Math.round(minutes / MINUTES_IN_MONTH);
    return locale2.formatDistance("aboutXMonths", months, localizeOptions);
  }
  months = differenceInMonths(dateRight, dateLeft);
  if (months < 12) {
    var nearestMonth = Math.round(minutes / MINUTES_IN_MONTH);
    return locale2.formatDistance("xMonths", nearestMonth, localizeOptions);
  } else {
    var monthsSinceStartOfYear = months % 12;
    var years = Math.floor(months / 12);
    if (monthsSinceStartOfYear < 3) {
      return locale2.formatDistance("aboutXYears", years, localizeOptions);
    } else if (monthsSinceStartOfYear < 9) {
      return locale2.formatDistance("overXYears", years, localizeOptions);
    } else {
      return locale2.formatDistance("almostXYears", years + 1, localizeOptions);
    }
  }
}

// node_modules/date-fns/esm/formatDistanceToNow/index.js
function formatDistanceToNow(dirtyDate, options) {
  requiredArgs(1, arguments);
  return formatDistance3(dirtyDate, Date.now(), options);
}

// node_modules/date-fns/esm/formatISO/index.js
function formatISO(date, options) {
  var _options$format, _options$representati;
  requiredArgs(1, arguments);
  var originalDate = toDate(date);
  if (isNaN(originalDate.getTime())) {
    throw new RangeError("Invalid time value");
  }
  var format2 = String((_options$format = options === null || options === void 0 ? void 0 : options.format) !== null && _options$format !== void 0 ? _options$format : "extended");
  var representation = String((_options$representati = options === null || options === void 0 ? void 0 : options.representation) !== null && _options$representati !== void 0 ? _options$representati : "complete");
  if (format2 !== "extended" && format2 !== "basic") {
    throw new RangeError("format must be 'extended' or 'basic'");
  }
  if (representation !== "date" && representation !== "time" && representation !== "complete") {
    throw new RangeError("representation must be 'date', 'time', or 'complete'");
  }
  var result = "";
  var tzOffset = "";
  var dateDelimiter = format2 === "extended" ? "-" : "";
  var timeDelimiter = format2 === "extended" ? ":" : "";
  if (representation !== "time") {
    var day = addLeadingZeros(originalDate.getDate(), 2);
    var month = addLeadingZeros(originalDate.getMonth() + 1, 2);
    var year = addLeadingZeros(originalDate.getFullYear(), 4);
    result = "".concat(year).concat(dateDelimiter).concat(month).concat(dateDelimiter).concat(day);
  }
  if (representation !== "date") {
    var offset = originalDate.getTimezoneOffset();
    if (offset !== 0) {
      var absoluteOffset = Math.abs(offset);
      var hourOffset = addLeadingZeros(Math.floor(absoluteOffset / 60), 2);
      var minuteOffset = addLeadingZeros(absoluteOffset % 60, 2);
      var sign = offset < 0 ? "+" : "-";
      tzOffset = "".concat(sign).concat(hourOffset, ":").concat(minuteOffset);
    } else {
      tzOffset = "Z";
    }
    var hour = addLeadingZeros(originalDate.getHours(), 2);
    var minute = addLeadingZeros(originalDate.getMinutes(), 2);
    var second = addLeadingZeros(originalDate.getSeconds(), 2);
    var separator = result === "" ? "" : "T";
    var time = [hour, minute, second].join(timeDelimiter);
    result = "".concat(result).concat(separator).concat(time).concat(tzOffset);
  }
  return result;
}

// node_modules/date-fns/esm/subDays/index.js
function subDays(dirtyDate, dirtyAmount) {
  requiredArgs(2, arguments);
  var amount = toInteger(dirtyAmount);
  return addDays(dirtyDate, -amount);
}

// node_modules/date-fns/esm/parseISO/index.js
function parseISO(argument, options) {
  var _options$additionalDi;
  requiredArgs(1, arguments);
  var additionalDigits = toInteger((_options$additionalDi = options === null || options === void 0 ? void 0 : options.additionalDigits) !== null && _options$additionalDi !== void 0 ? _options$additionalDi : 2);
  if (additionalDigits !== 2 && additionalDigits !== 1 && additionalDigits !== 0) {
    throw new RangeError("additionalDigits must be 0, 1 or 2");
  }
  if (!(typeof argument === "string" || Object.prototype.toString.call(argument) === "[object String]")) {
    return /* @__PURE__ */ new Date(NaN);
  }
  var dateStrings = splitDateString(argument);
  var date;
  if (dateStrings.date) {
    var parseYearResult = parseYear(dateStrings.date, additionalDigits);
    date = parseDate(parseYearResult.restDateString, parseYearResult.year);
  }
  if (!date || isNaN(date.getTime())) {
    return /* @__PURE__ */ new Date(NaN);
  }
  var timestamp = date.getTime();
  var time = 0;
  var offset;
  if (dateStrings.time) {
    time = parseTime(dateStrings.time);
    if (isNaN(time)) {
      return /* @__PURE__ */ new Date(NaN);
    }
  }
  if (dateStrings.timezone) {
    offset = parseTimezone(dateStrings.timezone);
    if (isNaN(offset)) {
      return /* @__PURE__ */ new Date(NaN);
    }
  } else {
    var dirtyDate = new Date(timestamp + time);
    var result = /* @__PURE__ */ new Date(0);
    result.setFullYear(dirtyDate.getUTCFullYear(), dirtyDate.getUTCMonth(), dirtyDate.getUTCDate());
    result.setHours(dirtyDate.getUTCHours(), dirtyDate.getUTCMinutes(), dirtyDate.getUTCSeconds(), dirtyDate.getUTCMilliseconds());
    return result;
  }
  return new Date(timestamp + time + offset);
}
var patterns = {
  dateTimeDelimiter: /[T ]/,
  timeZoneDelimiter: /[Z ]/i,
  timezone: /([Z+-].*)$/
};
var dateRegex = /^-?(?:(\d{3})|(\d{2})(?:-?(\d{2}))?|W(\d{2})(?:-?(\d{1}))?|)$/;
var timeRegex = /^(\d{2}(?:[.,]\d*)?)(?::?(\d{2}(?:[.,]\d*)?))?(?::?(\d{2}(?:[.,]\d*)?))?$/;
var timezoneRegex = /^([+-])(\d{2})(?::?(\d{2}))?$/;
function splitDateString(dateString) {
  var dateStrings = {};
  var array = dateString.split(patterns.dateTimeDelimiter);
  var timeString;
  if (array.length > 2) {
    return dateStrings;
  }
  if (/:/.test(array[0])) {
    timeString = array[0];
  } else {
    dateStrings.date = array[0];
    timeString = array[1];
    if (patterns.timeZoneDelimiter.test(dateStrings.date)) {
      dateStrings.date = dateString.split(patterns.timeZoneDelimiter)[0];
      timeString = dateString.substr(dateStrings.date.length, dateString.length);
    }
  }
  if (timeString) {
    var token = patterns.timezone.exec(timeString);
    if (token) {
      dateStrings.time = timeString.replace(token[1], "");
      dateStrings.timezone = token[1];
    } else {
      dateStrings.time = timeString;
    }
  }
  return dateStrings;
}
function parseYear(dateString, additionalDigits) {
  var regex = new RegExp("^(?:(\\d{4}|[+-]\\d{" + (4 + additionalDigits) + "})|(\\d{2}|[+-]\\d{" + (2 + additionalDigits) + "})$)");
  var captures = dateString.match(regex);
  if (!captures) return {
    year: NaN,
    restDateString: ""
  };
  var year = captures[1] ? parseInt(captures[1]) : null;
  var century = captures[2] ? parseInt(captures[2]) : null;
  return {
    year: century === null ? year : century * 100,
    restDateString: dateString.slice((captures[1] || captures[2]).length)
  };
}
function parseDate(dateString, year) {
  if (year === null) return /* @__PURE__ */ new Date(NaN);
  var captures = dateString.match(dateRegex);
  if (!captures) return /* @__PURE__ */ new Date(NaN);
  var isWeekDate = !!captures[4];
  var dayOfYear = parseDateUnit(captures[1]);
  var month = parseDateUnit(captures[2]) - 1;
  var day = parseDateUnit(captures[3]);
  var week = parseDateUnit(captures[4]);
  var dayOfWeek = parseDateUnit(captures[5]) - 1;
  if (isWeekDate) {
    if (!validateWeekDate(year, week, dayOfWeek)) {
      return /* @__PURE__ */ new Date(NaN);
    }
    return dayOfISOWeekYear(year, week, dayOfWeek);
  } else {
    var date = /* @__PURE__ */ new Date(0);
    if (!validateDate(year, month, day) || !validateDayOfYearDate(year, dayOfYear)) {
      return /* @__PURE__ */ new Date(NaN);
    }
    date.setUTCFullYear(year, month, Math.max(dayOfYear, day));
    return date;
  }
}
function parseDateUnit(value) {
  return value ? parseInt(value) : 1;
}
function parseTime(timeString) {
  var captures = timeString.match(timeRegex);
  if (!captures) return NaN;
  var hours = parseTimeUnit(captures[1]);
  var minutes = parseTimeUnit(captures[2]);
  var seconds = parseTimeUnit(captures[3]);
  if (!validateTime(hours, minutes, seconds)) {
    return NaN;
  }
  return hours * millisecondsInHour + minutes * millisecondsInMinute + seconds * 1e3;
}
function parseTimeUnit(value) {
  return value && parseFloat(value.replace(",", ".")) || 0;
}
function parseTimezone(timezoneString) {
  if (timezoneString === "Z") return 0;
  var captures = timezoneString.match(timezoneRegex);
  if (!captures) return 0;
  var sign = captures[1] === "+" ? -1 : 1;
  var hours = parseInt(captures[2]);
  var minutes = captures[3] && parseInt(captures[3]) || 0;
  if (!validateTimezone(hours, minutes)) {
    return NaN;
  }
  return sign * (hours * millisecondsInHour + minutes * millisecondsInMinute);
}
function dayOfISOWeekYear(isoWeekYear, week, day) {
  var date = /* @__PURE__ */ new Date(0);
  date.setUTCFullYear(isoWeekYear, 0, 4);
  var fourthOfJanuaryDay = date.getUTCDay() || 7;
  var diff = (week - 1) * 7 + day + 1 - fourthOfJanuaryDay;
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}
var daysInMonths = [31, null, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function isLeapYearIndex(year) {
  return year % 400 === 0 || year % 4 === 0 && year % 100 !== 0;
}
function validateDate(year, month, date) {
  return month >= 0 && month <= 11 && date >= 1 && date <= (daysInMonths[month] || (isLeapYearIndex(year) ? 29 : 28));
}
function validateDayOfYearDate(year, dayOfYear) {
  return dayOfYear >= 1 && dayOfYear <= (isLeapYearIndex(year) ? 366 : 365);
}
function validateWeekDate(_year, week, day) {
  return week >= 1 && week <= 53 && day >= 0 && day <= 6;
}
function validateTime(hours, minutes, seconds) {
  if (hours === 24) {
    return minutes === 0 && seconds === 0;
  }
  return seconds >= 0 && seconds < 60 && minutes >= 0 && minutes < 60 && hours >= 0 && hours < 25;
}
function validateTimezone(_hours, minutes) {
  return minutes >= 0 && minutes <= 59;
}

// packages/ai/token/saveTokenRecord.ts
var logger2 = createClientLogger("token-record");
var createTokenRecord = (data, { cost, inputPrice, outputPrice } = {}) => ({
  ...data,
  cost: cost || data.cost,
  inputPrice,
  outputPrice
});
var saveTokenRecord = async (tokenData, record, thunkApi) => {
  const ownerUserId = tokenData.userId || record.userId;
  const eventTime = tokenData.timestamp ?? record.createdAt ?? Date.now();
  const key = createTokenKey.record(ownerUserId, eventTime);
  try {
    await thunkApi.dispatch(
      write({
        data: { ...record, id: key, type: "token" /* TOKEN */, userId: ownerUserId },
        customKey: key,
        userId: ownerUserId
      })
    ).unwrap();
  } catch (error) {
    logger2.error(
      {
        key,
        userId: tokenData.userId,
        error: toErrorMessage(error)
      },
      "Failed to save token record"
    );
    toast.error("Failed to save token record");
    throw error;
  }
};

// packages/ai/token/calculatePrice.ts
var sanitizeCost = (raw) => {
  const rounded = Number(raw.toFixed(6));
  return Number.isFinite(rounded) && rounded > 0 ? rounded : 0;
};
var resolveModelPrice = (model, usage) => {
  let activePrice = { ...model.price };
  if (model.pricingStrategy?.type === "tiered_context") {
    const contextSize = usage.input_tokens || 0;
    const tiers = model.pricingStrategy.tiers || [];
    const sortedTiers = [...tiers].sort((a3, b2) => a3.minContext - b2.minContext);
    for (const tier of sortedTiers) {
      if (contextSize >= tier.minContext) {
        activePrice = { ...tier.price };
      }
    }
  }
  return activePrice;
};
var scaleModelInputOutputPrice = (price, multiplier) => ({
  ...price,
  input: price.input * multiplier,
  output: price.output * multiplier
});
var scaleModelServiceTierPrice = (price, inputOutputMultiplier, cacheMultiplier) => ({
  ...price,
  input: price.input * inputOutputMultiplier,
  output: price.output * inputOutputMultiplier,
  ...typeof cacheMultiplier === "number" && typeof price.cachingWrite === "number" ? { cachingWrite: price.cachingWrite * cacheMultiplier } : {},
  ...typeof cacheMultiplier === "number" && typeof price.cachingRead === "number" ? { cachingRead: price.cachingRead * cacheMultiplier } : {}
});
var resolveGoogleServiceTierPrice = (model, price, billingServiceTier) => {
  const normalizedTier = asTrimmedLowercaseString(billingServiceTier);
  const imageOutputPrice = typeof model.imageTokenPricePerMillion === "number" ? model.imageTokenPricePerMillion : void 0;
  const priceWithImageOutput = typeof imageOutputPrice === "number" ? { ...price, output: imageOutputPrice } : price;
  const serviceTierMultiplier = normalizedTier === "batch" || normalizedTier === "flex" || normalizedTier === "priority" ? model.serviceTierPriceMultipliers?.[normalizedTier] : void 0;
  if (serviceTierMultiplier) {
    return scaleModelServiceTierPrice(
      priceWithImageOutput,
      serviceTierMultiplier.inputOutput,
      serviceTierMultiplier.cache
    );
  }
  if (normalizedTier === "flex" || normalizedTier === "batch") {
    return scaleModelInputOutputPrice(priceWithImageOutput, 0.5);
  }
  if (normalizedTier === "priority") {
    return scaleModelInputOutputPrice(priceWithImageOutput, 1.8);
  }
  return priceWithImageOutput;
};
var resolveEffectiveModelPrice = ({
  model,
  usage,
  provider,
  billingServiceTier
}) => {
  const resolvedPrice = resolveModelPrice(model, usage);
  if (provider === "google") {
    return resolveGoogleServiceTierPrice(model, resolvedPrice, billingServiceTier);
  }
  return resolvedPrice;
};
var getEffectivePrices = (resolvedPrice, externalPrice) => {
  const effectiveInputPrice = Math.max(
    externalPrice?.input || 0,
    resolvedPrice.input
  );
  const effectiveOutputPrice = Math.max(
    externalPrice?.output || 0,
    resolvedPrice.output
  );
  return {
    input: effectiveInputPrice,
    output: effectiveOutputPrice,
    cachingWrite: resolvedPrice.cachingWrite || 0,
    cachingRead: resolvedPrice.cachingRead || 0
  };
};
var calculateAnthropicCost = (resolvedPrice, usage, externalPrice) => {
  const {
    input_tokens,
    output_tokens,
    cache_creation_input_tokens,
    cache_read_input_tokens
  } = usage;
  const {
    input: effectiveInputPrice,
    output: effectiveOutputPrice,
    cachingWrite: effectiveCachingWritePrice,
    cachingRead: effectiveCachingReadPrice
  } = getEffectivePrices(resolvedPrice, externalPrice);
  const regularInputTokens = input_tokens - cache_read_input_tokens;
  const regularTotal = (regularInputTokens * resolvedPrice.input + output_tokens * resolvedPrice.output + cache_creation_input_tokens * (resolvedPrice.cachingWrite || 0) + cache_read_input_tokens * (resolvedPrice.cachingRead || 0)) / 1e6;
  const chargeTotal = (regularInputTokens * effectiveInputPrice + output_tokens * effectiveOutputPrice + cache_creation_input_tokens * effectiveCachingWritePrice + cache_read_input_tokens * effectiveCachingReadPrice) / 1e6;
  return {
    regular: regularTotal,
    charge: chargeTotal,
    details: {
      inputCost: regularInputTokens * resolvedPrice.input / 1e6,
      outputCost: output_tokens * resolvedPrice.output / 1e6,
      cachingWriteCost: cache_creation_input_tokens * (resolvedPrice.cachingWrite || 0) / 1e6,
      cachingReadCost: cache_read_input_tokens * (resolvedPrice.cachingRead || 0) / 1e6
    }
  };
};
var calculateCacheBasedCost = (resolvedPrice, usage, externalPrice) => {
  const { input_tokens, output_tokens, cache_read_input_tokens } = usage;
  const { input: effectiveInputPrice, output: effectiveOutputPrice } = getEffectivePrices(resolvedPrice, externalPrice);
  const cacheMissTokens = input_tokens - cache_read_input_tokens;
  const cacheHitPrice = resolvedPrice.inputCacheHit || 0;
  const regularTotal = (cacheMissTokens * resolvedPrice.input + cache_read_input_tokens * cacheHitPrice + output_tokens * resolvedPrice.output) / 1e6;
  const chargeTotal = (cacheMissTokens * effectiveInputPrice + cache_read_input_tokens * cacheHitPrice + output_tokens * effectiveOutputPrice) / 1e6;
  return {
    regular: regularTotal,
    charge: chargeTotal,
    details: {
      inputCost: cacheMissTokens * resolvedPrice.input / 1e6,
      outputCost: output_tokens * resolvedPrice.output / 1e6,
      cachingReadCost: cache_read_input_tokens * cacheHitPrice / 1e6,
      cachingWriteCost: 0
    }
  };
};
var calculateSimpleCost = (resolvedPrice, usage, externalPrice) => {
  const { input_tokens, output_tokens } = usage;
  const { input: effectiveInputPrice, output: effectiveOutputPrice } = getEffectivePrices(resolvedPrice, externalPrice);
  const regularTotal = (input_tokens * resolvedPrice.input + output_tokens * resolvedPrice.output) / 1e6;
  const chargeTotal = (input_tokens * effectiveInputPrice + output_tokens * effectiveOutputPrice) / 1e6;
  return {
    regular: regularTotal,
    charge: chargeTotal,
    details: {
      inputCost: input_tokens * resolvedPrice.input / 1e6,
      outputCost: output_tokens * resolvedPrice.output / 1e6,
      cachingWriteCost: 0,
      cachingReadCost: 0
    }
  };
};
var calculateOpenRouterFallbackCost = (resolvedPrice, usage, externalPrice) => {
  if (typeof resolvedPrice.cachingWrite === "number" || typeof resolvedPrice.cachingRead === "number") {
    return calculateAnthropicCost(resolvedPrice, usage, externalPrice);
  }
  if (typeof resolvedPrice.inputCacheHit === "number") {
    return calculateCacheBasedCost(resolvedPrice, usage, externalPrice);
  }
  return calculateSimpleCost(resolvedPrice, usage, externalPrice);
};
var API_REPORTED_COST_MULTIPLIER = 7;
var zeroCostBreakdown = () => ({
  regular: 0,
  charge: 0,
  details: {
    inputCost: 0,
    outputCost: 0,
    cachingWriteCost: 0,
    cachingReadCost: 0
  }
});
var calculateApiReportedCost = (usage) => {
  if (!usage || typeof usage.cost !== "number" || usage.cost <= 0) {
    return zeroCostBreakdown();
  }
  const regular = usage.cost * API_REPORTED_COST_MULTIPLIER;
  return {
    regular,
    charge: regular,
    details: {
      inputCost: regular,
      outputCost: 0,
      cachingWriteCost: 0,
      cachingReadCost: 0
    }
  };
};
var resolveOpenAIBuiltInImageSurcharge = (model, usage) => {
  const imageGenerationCount = asOptionalFiniteNumber(usage.image_generation_count) ?? 0;
  const pricePerImage = getApproxPricePerImage(model) ?? getApproxPricePerImage(findModelConfig("openai", "gpt-image-2")) ?? 0;
  if (imageGenerationCount <= 0 || pricePerImage <= 0) return 0;
  return imageGenerationCount * pricePerImage;
};
var calculateBasicCost = (model, usage, provider, externalPrice, billingServiceTier) => {
  if (!usage || typeof usage.input_tokens !== "number") {
    throw new Error("Invalid usage data");
  }
  const resolvedPrice = resolveEffectiveModelPrice({
    model,
    usage,
    provider,
    billingServiceTier
  });
  switch (provider) {
    case "deepseek":
    case "openai":
    case "deepinfra":
      return calculateCacheBasedCost(resolvedPrice, usage, externalPrice);
    // nolo/crof: honor inputCacheHit only when the model defines it (K3 has
    // inputCacheHit=2). Models without it (e.g. K2.6) keep simple full-price
    // billing so cached tokens are not priced at 0.
    case "nolo":
    case "crof":
      return typeof resolvedPrice.inputCacheHit === "number" ? calculateCacheBasedCost(resolvedPrice, usage, externalPrice) : calculateSimpleCost(resolvedPrice, usage, externalPrice);
    case "anthropic":
      return calculateAnthropicCost(resolvedPrice, usage, externalPrice);
    case "google":
      if (model.name.includes("gemini-3")) {
        return calculateAnthropicCost(resolvedPrice, usage, externalPrice);
      }
      return calculateSimpleCost(resolvedPrice, usage, externalPrice);
    case "openrouter": {
      const reported = calculateApiReportedCost(usage);
      if (reported.regular > 0) return reported;
      return calculateOpenRouterFallbackCost(
        resolvedPrice,
        usage,
        externalPrice
      );
    }
    case "xai": {
      const reported = calculateApiReportedCost(usage);
      if (reported.regular > 0) return reported;
      return calculateSimpleCost(resolvedPrice, usage, externalPrice);
    }
    case "mistral":
    case "fireworks":
    default:
      return calculateSimpleCost(resolvedPrice, usage, externalPrice);
  }
};
var calculatePayDistribution = (costs, externalPrice, sharingLevel = "default") => {
  const pay = {};
  pay[nolotusId] = costs.regular;
  const sharingRatios = {
    default: 0,
    split: 0.5,
    full: 1
  };
  if (externalPrice?.creatorId) {
    const profit = Math.max(0, costs.charge - costs.regular);
    if (profit > 0) {
      switch (sharingLevel) {
        case "split":
          pay[externalPrice.creatorId] = profit * sharingRatios.split;
          break;
        case "full":
          pay[externalPrice.creatorId] = profit;
          break;
        default:
          break;
      }
    }
  }
  return Object.fromEntries(
    Object.entries(pay).map(([key, value]) => [
      key,
      Number(value.toFixed(6))
    ])
  );
};
var calculatePrice = ({
  modelName,
  usage,
  externalPrice,
  // 不设默认值，undefined 表示 custom/未知 provider，走 zeroCostModel 路径
  provider,
  billingServiceTier,
  sharingLevel = "default"
}) => {
  let model;
  try {
    model = getModelConfig(provider, modelName);
  } catch {
    const zeroCostModel = {
      name: modelName,
      hasVision: false,
      price: { input: 0, output: 0 }
    };
    const costs2 = calculateBasicCost(
      zeroCostModel,
      usage,
      "custom",
      externalPrice,
      billingServiceTier
    );
    const pay2 = calculatePayDistribution(costs2, externalPrice, sharingLevel);
    return { cost: sanitizeCost(costs2.charge), pay: pay2 };
  }
  const costs = calculateBasicCost(
    model,
    usage,
    provider || "custom",
    externalPrice,
    billingServiceTier
  );
  const openAIImageSurcharge = provider === "openai" ? resolveOpenAIBuiltInImageSurcharge(model, usage) : 0;
  const adjustedCosts = openAIImageSurcharge > 0 ? {
    ...costs,
    regular: costs.regular + openAIImageSurcharge,
    charge: costs.charge + openAIImageSurcharge,
    details: costs.details ? {
      ...costs.details,
      outputCost: costs.details.outputCost + openAIImageSurcharge
    } : costs.details
  } : costs;
  const pay = calculatePayDistribution(adjustedCosts, externalPrice, sharingLevel);
  return {
    cost: sanitizeCost(adjustedCosts.charge),
    pay
  };
};

// packages/ai/token/normalizeUsage.ts
var normalizeStringArray = (value) => {
  if (!Array.isArray(value)) return void 0;
  const normalized = [...new Set(asTrimmedNonEmptyStringArray(value))];
  return normalized.length > 0 ? normalized : void 0;
};
var finiteTokenCount = (value) => {
  const finite = asOptionalFiniteNumber(value);
  if (finite === void 0) return void 0;
  return Math.max(0, Math.floor(finite));
};
var readNestedTokenCount = (value, path) => {
  let cursor = value;
  for (const key of path) {
    if (!cursor || typeof cursor !== "object") return void 0;
    cursor = cursor[key];
  }
  return finiteTokenCount(cursor);
};
var readFiniteNumberField = (usage, field) => {
  if (!usage || typeof usage !== "object") return void 0;
  if (!(field in usage)) return void 0;
  const candidate = usage[field];
  return asOptionalFiniteNumber(candidate);
};
var readCostInUsdTicks = (usage) => readFiniteNumberField(usage, "cost_in_usd_ticks");
var normalizeUsage = (usage) => {
  const inputTokens = "input_tokens" in usage ? usage.input_tokens ?? 0 : "prompt_tokens" in usage ? usage.prompt_tokens : 0;
  const outputTokens = "output_tokens" in usage ? usage.output_tokens ?? 0 : "completion_tokens" in usage ? usage.completion_tokens : 0;
  const cacheCreationInputTokens = "cache_creation_input_tokens" in usage ? usage.cache_creation_input_tokens ?? 0 : "prompt_cache_miss_tokens" in usage ? usage.prompt_cache_miss_tokens : 0;
  const cacheReadInputTokens = finiteTokenCount(usage.cache_read_input_tokens) ?? finiteTokenCount(usage.prompt_cache_hit_tokens) ?? readNestedTokenCount(usage, ["input_tokens_details", "cached_tokens"]) ?? readNestedTokenCount(usage, ["prompt_tokens_details", "cached_tokens"]) ?? 0;
  let cost = 0;
  const providedCost = readFiniteNumberField(usage, "cost");
  if (providedCost !== void 0) {
    cost = providedCost;
  }
  const xaiTicks = readCostInUsdTicks(usage);
  if (xaiTicks !== void 0 && providedCost === void 0) {
    cost = xaiTicks / 1e10;
  }
  const billingProvider = asOptionalTrimmedString(usage.billing_provider);
  const billingModel = asOptionalTrimmedString(usage.billing_model);
  const billingServiceTier = asOptionalTrimmedString(usage.billing_service_tier);
  const billingEstimated = "billing_estimated" in usage && usage.billing_estimated === true;
  const serverBilled = "server_billed" in usage && usage.server_billed === true;
  const providerCallId = asOptionalTrimmedString(usage.provider_call_id);
  const imageGenerationCount = "image_generation_count" in usage ? asOptionalFiniteNumber(usage.image_generation_count) : void 0;
  const providerResponseIds = normalizeStringArray(
    usage.provider_response_ids
  );
  const providerRequestIds = normalizeStringArray(
    usage.provider_request_ids
  );
  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_creation_input_tokens: cacheCreationInputTokens,
    cache_read_input_tokens: cacheReadInputTokens,
    cost,
    ...typeof imageGenerationCount === "number" ? { image_generation_count: imageGenerationCount } : {},
    ...providerResponseIds ? { provider_response_ids: providerResponseIds } : {},
    ...providerRequestIds ? { provider_request_ids: providerRequestIds } : {},
    ...billingProvider ? { billing_provider: billingProvider } : {},
    ...billingModel ? { billing_model: billingModel } : {},
    ...billingServiceTier ? { billing_service_tier: billingServiceTier } : {},
    ...billingEstimated ? { billing_estimated: true } : {},
    ...serverBilled ? { server_billed: true } : {},
    ...providerCallId ? { provider_call_id: providerCallId } : {},
    ...xaiTicks !== void 0 ? { cost_in_usd_ticks: xaiTicks } : {}
  };
};

// packages/ai/token/resolveBillingTarget.ts
var normalizeString2 = (value) => {
  const trimmed = asTrimmedString(value);
  return trimmed || void 0;
};
var resolveBillingModel = (usageModel, fallbackModel) => {
  const model = normalizeString2(usageModel) ?? normalizeString2(fallbackModel);
  if (!model) {
    throw new Error("Billing model is required");
  }
  return model;
};
var resolveBillingTarget = ({
  usage,
  fallbackProvider,
  fallbackModel
}) => {
  const provider = normalizeString2(usage?.billing_provider) ?? normalizeString2(fallbackProvider);
  const model = resolveBillingModel(usage?.billing_model, fallbackModel);
  const serviceTier = normalizeString2(usage?.billing_service_tier);
  return {
    provider,
    model,
    serviceTier
  };
};

// packages/agent-runtime/serverProxyPolicy.ts
var OAUTH_APIKEY_REFS = /* @__PURE__ */ new Set([
  "antigravity",
  "xai",
  "chatgpt",
  "claude",
  "cursor"
]);
function isGoogleFamilyProvider(provider) {
  const normalized = asTrimmedLowercaseString(provider);
  return normalized === "google" || normalized.startsWith("google-");
}
function isOAuthApiKeyRef(value) {
  const ref = asTrimmedLowercaseString(value);
  return ref.length > 0 && OAUTH_APIKEY_REFS.has(ref);
}
function shouldUseServerProxy(agentConfig, requestProvider) {
  const effectiveProvider = (requestProvider || agentConfig.provider || "").toLowerCase();
  if (isGoogleFamilyProvider(effectiveProvider)) {
    return true;
  }
  if (isOAuthApiKeyRef(agentConfig.apiKeyRef)) {
    return true;
  }
  if (agentConfig.apiSource === "custom" && isRemoteCustomEndpoint(agentConfig.customProviderUrl)) {
    return true;
  }
  return !!agentConfig.useServerProxy;
}
var LOCAL_HOSTS = /* @__PURE__ */ new Set(["127.0.0.1", "localhost", "::1", "0.0.0.0"]);
function isRemoteCustomEndpoint(url) {
  if (typeof url !== "string") return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return !LOCAL_HOSTS.has(host);
  } catch {
    return false;
  }
}

// packages/ai/token/prepareTokenUsageData.ts
function resolveBillable(input) {
  const uid = input.userId?.trim();
  if (!uid || uid === "local") return false;
  const apiSource = input.apiSource;
  if (apiSource === "cli") return false;
  if (isOAuthApiKeyRef(input.apiKeyRef)) return false;
  if (input.cost <= 0) return false;
  if (apiSource === "platform") return true;
  if (apiSource === "custom") return input.hasExternalPrice;
  if (apiSource == null || apiSource === "") return true;
  return false;
}
var prepareTokenUsageData = ({
  rawUsage,
  agentConfig,
  userId,
  username,
  agentId,
  cybotId,
  dialogId,
  timestamp = Date.now(),
  stable_prefix_hash,
  stable_prefix_estimated_tokens,
  entry_path
}) => {
  const resolvedAgentId = typeof agentId === "string" && agentId.trim() || typeof cybotId === "string" && cybotId.trim() || "";
  if (!resolvedAgentId) {
    throw new Error(
      "prepareTokenUsageData requires a non-empty agentId or cybotId"
    );
  }
  const usage = normalizeUsage(rawUsage);
  const billingTarget = resolveBillingTarget({
    usage,
    fallbackProvider: agentConfig.provider,
    fallbackModel: agentConfig.model
  });
  const billedProvider = billingTarget.provider;
  const billedModel = billingTarget.model;
  const billedServiceTier = billingTarget.serviceTier;
  const recordProvider = billedProvider ?? agentConfig.provider ?? "unknown";
  const hasExternalPrice = agentConfig.inputPrice !== void 0 && agentConfig.inputPrice > 0 || agentConfig.outputPrice !== void 0 && agentConfig.outputPrice > 0;
  const { cost, pay } = calculatePrice({
    provider: billedProvider,
    modelName: billedModel,
    billingServiceTier: billedServiceTier,
    usage,
    externalPrice: hasExternalPrice ? {
      input: agentConfig.inputPrice ?? 0,
      output: agentConfig.outputPrice ?? 0,
      creatorId: agentConfig.userId ?? (agentConfig.id ? extractUserId(agentConfig.id) : "")
    } : void 0,
    sharingLevel: agentConfig.sharingLevel
  });
  const billable = resolveBillable({
    usage,
    userId,
    apiSource: agentConfig.apiSource,
    apiKeyRef: agentConfig.apiKeyRef,
    cost,
    hasExternalPrice
  });
  const serverBilled = billable && usage.server_billed === true;
  const finalBillable = serverBilled ? false : billable;
  return {
    usage,
    billedProvider,
    billedModel,
    billedServiceTier,
    recordProvider,
    tokenData: {
      ...usage,
      userId,
      username,
      agentId: resolvedAgentId,
      cybotId: resolvedAgentId,
      model: billedModel,
      provider: recordProvider,
      billing_service_tier: billedServiceTier,
      dialogId,
      cost,
      pay,
      timestamp,
      billable: finalBillable,
      ...stable_prefix_hash !== void 0 ? { stable_prefix_hash } : {},
      ...stable_prefix_estimated_tokens !== void 0 ? { stable_prefix_estimated_tokens } : {},
      ...entry_path !== void 0 ? { entry_path } : {}
    }
  };
};

// packages/ai/token/applyTokenUsageToDayStats.ts
var ZERO_STATS = { count: 0, tokens: { input: 0, output: 0 }, cost: 0 };
function applyTokenUsageToDayStats(prev, delta) {
  const base = prev ?? {
    userId: delta.userId,
    period: "day",
    timeKey: delta.timeKey,
    total: { ...ZERO_STATS },
    models: {},
    providers: {}
  };
  const modelName = delta.model || "unknown";
  const providerName2 = delta.provider || "unknown";
  const inc = (s3) => ({
    count: (s3?.count ?? 0) + 1,
    tokens: {
      input: (s3?.tokens.input ?? 0) + delta.input_tokens,
      output: (s3?.tokens.output ?? 0) + delta.output_tokens
    },
    cost: Number(((s3?.cost ?? 0) + delta.cost).toFixed(6))
  });
  return {
    ...base,
    total: inc(base.total),
    models: {
      ...base.models,
      [modelName]: inc(base.models[modelName])
    },
    providers: {
      ...base.providers,
      [providerName2]: inc(base.providers[providerName2])
    }
  };
}

// packages/core/keyedTaskQueue.ts
var queues = /* @__PURE__ */ new Map();
async function runKeyed(key, task) {
  const previous = queues.get(key) ?? Promise.resolve();
  const next = previous.catch(() => void 0).then(task);
  const cleanup = next.then(
    () => void 0,
    () => void 0
  );
  queues.set(key, cleanup);
  try {
    return await next;
  } finally {
    if (queues.get(key) === cleanup) {
      queues.delete(key);
    }
  }
}

// packages/chat/dialog/actions/updateTokensAction.ts
var logger3 = createClientLogger("token-usage");
var dialogTokenPatchQueue = /* @__PURE__ */ new Map();
var queueDialogTokenPatch = async (dialogKey, task) => {
  const previousTask = dialogTokenPatchQueue.get(dialogKey) ?? Promise.resolve();
  const nextTask = previousTask.catch(() => void 0).then(task);
  const queueEntry = nextTask.then(
    () => void 0,
    () => void 0
  );
  dialogTokenPatchQueue.set(dialogKey, queueEntry);
  try {
    return await nextTask;
  } finally {
    if (dialogTokenPatchQueue.get(dialogKey) === queueEntry) {
      dialogTokenPatchQueue.delete(dialogKey);
    }
  }
};
var updateStats = async (data, existingStats, key, thunkApi) => {
  try {
    const dateKey = format(data.timestamp ?? Date.now(), "yyyy-MM-dd");
    const newStats = applyTokenUsageToDayStats(existingStats, {
      userId: data.userId ?? "",
      timeKey: dateKey,
      model: data.model || "unknown",
      provider: data.provider || "unknown",
      input_tokens: data.input_tokens,
      output_tokens: data.output_tokens,
      cost: data.cost
    });
    await thunkApi.dispatch(
      write({
        data: { ...newStats, id: key, type: "token" /* TOKEN */ },
        customKey: key,
        userId: data.userId
      })
    ).unwrap();
    return newStats;
  } catch (error) {
    logger3.error(
      { key, userId: data.userId, error: error.message },
      "Failed to update token stats"
    );
    toast.error("Failed to update token stats");
    throw error;
  }
};
var saveTokenUsage = async (data, thunkApi) => {
  const dateKey = format(data.timestamp ?? Date.now(), "yyyy-MM-dd");
  const tokenDayStatsKey = createTokenStatsKey(data.userId ?? "", dateKey);
  return runKeyed(tokenDayStatsKey, async () => {
    try {
      let currentStats = null;
      try {
        currentStats = await thunkApi.dispatch(read({
          dbKey: tokenDayStatsKey
        })).unwrap();
      } catch (err2) {
        logger3.warn({ tokenDayStatsKey }, "No existing stats found");
      }
      const updatedStats = await updateStats(
        data,
        currentStats,
        tokenDayStatsKey,
        thunkApi
      );
      return {
        success: true,
        id: ulid(Date.now()),
        record: updatedStats
      };
    } catch (error) {
      logger3.error(
        {
          key: tokenDayStatsKey,
          userId: data.userId,
          error: error.message,
          tokenData: {
            input: data.input_tokens,
            output: data.output_tokens,
            model: data.model
          }
        },
        "Failed to process token usage"
      );
      toast.error("Failed to process token usage");
      throw error;
    }
  });
};
var updateTokensAction = async ({ dialogId, dialogKey, usage: usageRaw, agentConfig }, thunkApi) => {
  const state3 = thunkApi.getState();
  const { currentUser } = state3.auth;
  const dialogConfig = dialogKey ? selectById(state3, dialogKey) : null;
  const dialogConfigUserId = dialogConfig?.userId;
  const ownerUserId = resolveMessageOwner({
    dialogConfigUserId: typeof dialogConfigUserId === "string" ? dialogConfigUserId : null,
    dialogKey: typeof dialogKey === "string" ? dialogKey : "",
    currentAccountUserId: currentUser?.userId ?? null
  });
  const timestamp = Date.now();
  const prepared = prepareTokenUsageData({
    rawUsage: usageRaw,
    agentConfig,
    userId: ownerUserId,
    username: currentUser?.username,
    agentId: agentConfig.id,
    dialogId,
    timestamp,
    entry_path: "web-chat"
  });
  const { usage, tokenData, recordProvider, billedModel } = prepared;
  const result = { cost: tokenData.cost, pay: tokenData.pay };
  const persistedTokenData = {
    ...tokenData,
    type: "token" /* TOKEN */,
    id: ulid(timestamp),
    dateKey: format(timestamp, "yyyy-MM-dd"),
    // Keep the same clock used for id/dateKey so record keys never see
    // undefined when a prepare helper omits timestamp.
    timestamp
  };
  const billedCatalog = findModelConfig(recordProvider, billedModel)?.price;
  const record = createTokenRecord(persistedTokenData, {
    cost: result.cost,
    inputPrice: billedCatalog?.input ?? agentConfig.inputPrice,
    outputPrice: billedCatalog?.output ?? agentConfig.outputPrice
  });
  await saveTokenRecord(persistedTokenData, record, thunkApi);
  await saveTokenUsage(persistedTokenData, thunkApi);
  if (persistedTokenData.billable === true || persistedTokenData.billable === void 0 && result.cost > 0) {
    thunkApi.dispatch(deductBalance(result.cost));
  }
  if (dialogKey) {
    await queueDialogTokenPatch(dialogKey, async () => {
      const latestState = thunkApi.getState();
      const dialogConfig2 = selectById(latestState, dialogKey) ?? await thunkApi.dispatch(read({ dbKey: dialogKey })).unwrap();
      if (!dialogConfig2) {
        throw new Error(`Dialog not found for token update: ${dialogKey}`);
      }
      await thunkApi.dispatch(
        patch({
          dbKey: dialogKey,
          changes: {
            inputTokens: (dialogConfig2.inputTokens ?? 0) + usage.input_tokens,
            outputTokens: (dialogConfig2.outputTokens ?? 0) + usage.output_tokens,
            totalCost: (dialogConfig2.totalCost ?? 0) + result.cost
          }
        })
      ).unwrap();
    });
  }
  return {
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cost: result.cost
  };
};

// packages/chat/dialog/dialogTokenStats.ts
var mergeDialogTokenStats = (dialogConfig, runtimeTokens) => ({
  inputTokens: (dialogConfig?.inputTokens ?? 0) + runtimeTokens.inputTokens,
  outputTokens: (dialogConfig?.outputTokens ?? 0) + runtimeTokens.outputTokens,
  totalCost: (dialogConfig?.totalCost ?? 0) + runtimeTokens.totalCost
});

// packages/core/chat/dialogAttachmentCleanup.ts
var FILE_CONTENT_RE = /(?:https?:\/\/[^/"'\s]+)?\/api\/v1\/db\/file\/content\/([^?#"'\s)]+)/g;
function extractFileContentIds(value) {
  const ids = /* @__PURE__ */ new Set();
  const visit = (input) => {
    if (typeof input === "string") {
      for (const match2 of input.matchAll(FILE_CONTENT_RE)) {
        const fileId = decodeURIComponent(match2[1] ?? "").trim();
        if (fileId) ids.add(fileId);
      }
      return;
    }
    if (Array.isArray(input)) {
      for (const item of input) visit(item);
      return;
    }
    if (input && typeof input === "object") {
      for (const item of Object.values(input)) visit(item);
    }
  };
  visit(value);
  return [...ids];
}
function messageDbKey(dialogId, message) {
  const dbKey = asOptionalTrimmedString(message.dbKey);
  if (dbKey) return dbKey;
  const id = asOptionalTrimmedString(message.id);
  if (id) return dialogMessageKey(dialogId, id);
  return null;
}
function asText(value) {
  return asOptionalTrimmedString(value) ?? null;
}
function buildDialogAttachmentPlan(args) {
  const messageKeys = new Set(
    args.messages.map((message) => messageDbKey(args.dialogId, message)).filter((key) => Boolean(key))
  );
  const referencedFileIds = [
    ...new Set(args.messages.flatMap((message) => extractFileContentIds(message)))
  ];
  const candidates = referencedFileIds.map((fileId) => {
    const metadata = args.metadataByFileId[fileId];
    const ownerType = asText(metadata?.ownerType);
    const ownerId = asText(metadata?.ownerId);
    const ownerDbKey = asText(metadata?.ownerDbKey);
    const fileDbKey = asText(metadata?.dbKey);
    const source = asText(metadata?.source);
    const ownedByDialog = ownerType === "dialog" && ownerId === args.dialogId;
    const ownedByMessage = Boolean(ownerDbKey && messageKeys.has(ownerDbKey));
    const userOwnedReferenced = args.includeUserOwnedReferenced === true && Boolean(args.ownerId) && ownerType === "user" && ownerId === args.ownerId;
    const canDelete = Boolean(fileDbKey && (ownedByDialog || ownedByMessage || userOwnedReferenced));
    return {
      fileId,
      fileDbKey,
      size: asOptionalFiniteNumber(metadata?.size) ?? null,
      ownerType,
      ownerId,
      ownerDbKey,
      source,
      status: canDelete ? "delete" : "retain",
      reason: canDelete ? ownedByMessage ? "ownerDbKey matches a message in this dialog" : userOwnedReferenced ? "user-owned file is referenced by this dialog and explicit referenced-attachment deletion is enabled" : "ownerType/ownerId matches this dialog" : fileDbKey ? "file ownership is not exclusive to this dialog" : "file metadata not found"
    };
  });
  const deleteCandidates = candidates.filter((candidate) => candidate.status === "delete");
  const retainedCandidates = candidates.filter((candidate) => candidate.status === "retain");
  return {
    dialogId: args.dialogId,
    messageCount: args.messages.length,
    referencedFileIds,
    candidates,
    deleteCandidates,
    retainedCandidates,
    bytesToDelete: deleteCandidates.reduce((sum, candidate) => sum + (candidate.size ?? 0), 0),
    metadataReadFailures: args.metadataReadFailures ?? []
  };
}

// packages/ai/agent/cliChatClient.ts
function getCliChatRequestConfig(thunkApi) {
  const state3 = thunkApi.getState();
  const currentServer = selectCurrentServer(state3);
  const token = selectIdentityToken(state3);
  if (!currentServer) throw new Error("\u65E0\u6CD5\u83B7\u53D6\u5F53\u524D\u670D\u52A1\u5668\u5730\u5740\u3002");
  return { currentServer, token };
}
function resolveCliChatUrl(currentServer) {
  if (getIsDesktopApp()) return "/api/cli/chat";
  return `${currentServer}/api/cli/chat`;
}
function resolveCliScanUrl() {
  return "/api/cli/scan";
}
async function postCliChat(thunkApi, body, signal) {
  const { currentServer, token } = getCliChatRequestConfig(thunkApi);
  return fetch(resolveCliChatUrl(currentServer), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...token ? { Authorization: `Bearer ${token}` } : {}
    },
    body: JSON.stringify(body),
    signal
  });
}
async function startCliChatSession(thunkApi, args) {
  const response = await postCliChat(thunkApi, {
    action: "start",
    cliProvider: args.cliProvider,
    model: args.model,
    systemPrompt: args.systemPrompt,
    reasoningEffort: args.reasoningEffort,
    temperature: args.temperature,
    topP: args.topP,
    frequencyPenalty: args.frequencyPenalty,
    presencePenalty: args.presencePenalty,
    maxTokens: args.maxTokens,
    enableThinking: args.enableThinking,
    thinkingBudget: args.thinkingBudget
  });
  return response.json();
}
async function getCliChatSession(thunkApi, args) {
  const response = await postCliChat(thunkApi, {
    action: "get",
    sessionId: args.sessionId
  });
  return response.json();
}
async function closeCliChatSession(thunkApi, args) {
  const response = await postCliChat(thunkApi, {
    action: "close",
    sessionId: args.sessionId
  });
  return response.json();
}
function createCliChatTurnStream(thunkApi, args, signal) {
  return postCliChat(
    thunkApi,
    args.sessionId ? {
      action: "turn",
      sessionId: args.sessionId,
      prompt: args.prompt,
      model: args.model,
      reasoningEffort: args.reasoningEffort,
      temperature: args.temperature,
      topP: args.topP,
      frequencyPenalty: args.frequencyPenalty,
      presencePenalty: args.presencePenalty,
      maxTokens: args.maxTokens,
      enableThinking: args.enableThinking,
      thinkingBudget: args.thinkingBudget
    } : {
      prompt: args.prompt,
      model: args.model,
      cliProvider: args.cliProvider,
      systemPrompt: args.systemPrompt,
      reasoningEffort: args.reasoningEffort,
      temperature: args.temperature,
      topP: args.topP,
      frequencyPenalty: args.frequencyPenalty,
      presencePenalty: args.presencePenalty,
      maxTokens: args.maxTokens,
      enableThinking: args.enableThinking,
      thinkingBudget: args.thinkingBudget
    },
    signal
  );
}
async function scanInstalledClis(thunkApi, signal) {
  if (!getIsDesktopApp()) return [];
  let token;
  try {
    if (thunkApi?.getState) {
      token = selectIdentityToken(thunkApi.getState()) || void 0;
    }
  } catch {
  }
  try {
    const response = await fetch(resolveCliScanUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...token ? { Authorization: `Bearer ${token}` } : {}
      },
      body: "{}",
      signal
    });
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data?.installed)) return [];
    return data.installed.filter(isCliProvider);
  } catch {
    return [];
  }
}

// packages/chat/dialog/actions/cleanupCliSession.ts
async function cleanupCliSessionForDialog(thunkApi, dialogConfig) {
  const cliSessionId = dialogConfig?.cliSessionId;
  const dialogKey = dialogConfig?.dbKey;
  if (!cliSessionId || !dialogKey) return;
  try {
    await closeCliChatSession(
      { getState: thunkApi.getState },
      { sessionId: cliSessionId }
    );
  } catch {
  }
  try {
    const patchResult = thunkApi.dispatch(
      patch({
        dbKey: dialogKey,
        changes: {
          cliSessionId: null
        }
      })
    );
    if (typeof patchResult?.unwrap === "function") {
      await patchResult.unwrap();
    } else {
      await patchResult;
    }
  } catch {
  }
}

// packages/chat/dialog/deleteDialogOrchestration.ts
var collectKeys = async (prefix, db) => {
  const keys = [];
  let iterator = db.iterator({
    gte: prefix,
    lte: prefix + "\uFFFF"
  });
  if (iterator && typeof iterator.then === "function") {
    iterator = await iterator;
  }
  for await (const [key] of iterator) {
    keys.push(key);
  }
  return keys;
};
var collectEntries = async (prefix, db) => {
  const entries = [];
  let iterator = db.iterator({
    gte: prefix,
    lte: prefix + "\uFFFF"
  });
  if (iterator && typeof iterator.then === "function") {
    iterator = await iterator;
  }
  for await (const [key, value] of iterator) {
    entries.push([key, value]);
  }
  return entries;
};
var dbGetOrNull = async (db, key) => {
  if (!db || typeof db.get !== "function") return null;
  try {
    return await db.get(key);
  } catch {
    return null;
  }
};
var readLocalFileMetadata = async (db, fileId) => {
  const direct = await dbGetOrNull(db, fileId);
  if (direct) return direct;
  const index = await dbGetOrNull(db, createKey("file", "id", fileId));
  const mainKey = asOptionalTrimmedString(index?.mainKey) ?? null;
  return mainKey ? await dbGetOrNull(db, mainKey) : null;
};
var normalizeDeleteDialogPayload = (payload) => typeof payload === "string" ? { dialogKey: payload, includeAttachments: false } : {
  dialogKey: payload.dialogKey,
  includeAttachments: payload.includeAttachments === true
};
var deleteOwnedDialogAttachments = async (args) => {
  const messages = args.entries.map(
    ([dbKey, value]) => ({
      ...asRecordOrEmpty(value),
      dbKey
    })
  );
  const fileIds = [
    ...new Set(messages.flatMap((message) => extractFileContentIds(message)))
  ];
  const metadataByFileId = {};
  const metadataReadFailures = [];
  for (const fileId of fileIds) {
    const metadata = await readLocalFileMetadata(args.db, fileId);
    if (metadata) {
      metadataByFileId[fileId] = metadata;
    } else {
      metadataReadFailures.push({
        fileId,
        error: "local file metadata not found"
      });
    }
  }
  const plan = buildDialogAttachmentPlan({
    dialogId: args.dialogId,
    messages,
    metadataByFileId,
    metadataReadFailures
  });
  if (!plan.deleteCandidates.length) return plan;
  const { deleteFileAction } = await import("/public/assets/chunks/deleteFile-QTZBBIAL.js");
  for (const candidate of plan.deleteCandidates) {
    if (candidate.fileDbKey) {
      await deleteFileAction(candidate.fileDbKey, args.thunkApi);
    }
  }
  return plan;
};
var deleteDialogThunk = async (payload, thunkApi) => {
  const { dialogKey, includeAttachments } = normalizeDeleteDialogPayload(payload);
  const { dispatch, getState, extra } = thunkApi;
  const { db } = extra;
  const state3 = getState();
  const { currentServer, syncServers } = getRuntimeServerContext(state3);
  const currentDialogKey = getActiveDialogKey();
  const currentDialogId = currentDialogKey ? extractCustomId(currentDialogKey) : null;
  const targetDialogId = extractCustomId(dialogKey);
  const targetDialogConfig = selectById(state3, dialogKey);
  const isCurrentDialog = currentDialogId !== null && currentDialogId === targetDialogId;
  await cleanupCliSessionForDialog(
    { dispatch, getState },
    targetDialogConfig
  );
  const dialogOwnerId = typeof targetDialogConfig?.userId === "string" && String(targetDialogConfig.userId).trim() || (() => {
    const rest = dialogKey.startsWith("dialog-") ? dialogKey.slice("dialog-".length) : "";
    const last = rest.lastIndexOf("-");
    return last > 0 ? rest.slice(0, last) : "";
  })();
  const agentListIndexDels = buildDialogAgentListIndexDeleteOps({
    userId: dialogOwnerId,
    dialogKey,
    dialogId: targetDialogId || void 0,
    previousRecord: targetDialogConfig ? targetDialogConfig : null
  });
  await dispatch(remove(dialogKey));
  const prefix = createKey("dialog", targetDialogId, "msg");
  const deletedEntries = includeAttachments ? await collectEntries(prefix, db) : [];
  const attachmentPlan = includeAttachments && targetDialogId ? await deleteOwnedDialogAttachments({
    db,
    dialogId: targetDialogId,
    entries: deletedEntries,
    thunkApi
  }) : null;
  const deletedIds = includeAttachments ? deletedEntries.map(([key]) => key) : await collectKeys(prefix, db);
  const ops = [
    ...agentListIndexDels,
    ...deletedIds.map((key) => ({ type: "del", key }))
  ];
  if (ops.length > 0) {
    await db.batch(ops);
  }
  if (deletedIds.length > 0) {
    scheduleDeleteReplication({
      currentServer,
      syncServers,
      dbKey: targetDialogId,
      deleteOptions: { type: "messages" },
      state: state3
    });
  }
  if (isCurrentDialog) {
    await thunkApi.dispatch(resetMsgs());
    const { clearPendingAttachments: clearPendingAttachments2 } = await import("/public/assets/chunks/dialogSlice-5YLHPK2U.js");
    dispatch(clearPendingAttachments2());
    clearWorkflow();
  }
  return { dialogKey, isCurrentDialog, attachmentPlan };
};

// packages/chat/dialog/dialogSlice.ts
var runCreateDialogAction = async (args, thunkApi) => {
  const { createDialogAction } = await import("/public/assets/chunks/createDialogAction-VUWJATZ5.js");
  return createDialogAction(args, thunkApi);
};
var runCreateAgentAutomationAction = async (args, thunkApi) => {
  const { createAgentAutomationAction } = await import("/public/assets/chunks/createAgentAutomationAction-RX5S3RRK.js");
  return createAgentAutomationAction(args, thunkApi);
};
var runUpdateDialogTitleAction = async (args, thunkApi) => {
  const { updateDialogTitleAction } = await import("/public/assets/chunks/updateDialogTitleAction-WGU6A25E.js");
  return updateDialogTitleAction(args, thunkApi);
};
var runAddDialogAgentAction = async (args, thunkApi) => {
  const { addDialogAgentAction } = await import("/public/assets/chunks/addDialogAgentAction-DN5WBY6P.js");
  return addDialogAgentAction(args, thunkApi);
};
var runRemoveDialogAgentAction = async (args, thunkApi) => {
  const { removeDialogAgentAction } = await import("/public/assets/chunks/removeDialogAgentAction-IBB2OYBF.js");
  return removeDialogAgentAction(args, thunkApi);
};
var runSetPrimaryDialogAgentAction = async (args, thunkApi) => {
  const { setPrimaryDialogAgentAction } = await import("/public/assets/chunks/setPrimaryDialogAgentAction-THGVQIDH.js");
  return setPrimaryDialogAgentAction(args, thunkApi);
};
var runSetDialogExtraReferencesAction = async (args, thunkApi) => {
  const { setDialogExtraReferencesAction } = await import("/public/assets/chunks/setDialogExtraReferencesAction-5R5I7TS3.js");
  return setDialogExtraReferencesAction(args, thunkApi);
};
var runHandleSendMessageAction = async (args, thunkApi) => {
  const { handleSendMessageAction } = await import("/public/assets/chunks/handleSendMessageAction-YNKWEF2B.js");
  return handleSendMessageAction(args, thunkApi);
};
function clearDialogState() {
  applyClearDialogStateRuntime();
  return { type: "dialog/clearDialogState" };
}
clearDialogState.type = "dialog/clearDialogState";
var createPageAndAddReference = createAsyncThunk(
  "dialog/createPageAndAddReference",
  async (payload, { dispatch, getState, rejectWithValue }) => {
    const { slateData, jsonData, title, type, fileId, groupId, dialogKey } = payload;
    try {
      const { createDocState } = await import("/public/assets/chunks/docStore-MCFTY55O.js");
      const pageKey = await createDocState(
        { slateData, title },
        { dispatch, getState }
      );
      const newReference = {
        id: fileId,
        name: title,
        pageKey,
        dialogKey,
        type,
        groupId
      };
      const newRawData = jsonData ? { pageKey, jsonData } : null;
      addPageReferenceToRuntime({
        reference: newReference,
        rawData: newRawData,
        dialogKey
      });
      return { reference: newReference, rawData: newRawData, dialogKey };
    } catch (error) {
      console.error("\u521B\u5EFA\u9875\u9762\u6216\u5F15\u7528\u5931\u8D25:", error);
      return rejectWithValue(error.message);
    }
  }
);
var deleteDialog = createAsyncThunk(
  "dialog/deleteDialog",
  async (payload, thunkApi) => {
    const result = await deleteDialogThunk(payload, thunkApi);
    deleteDialogRuntime(result.dialogKey);
    if (result.isCurrentDialog) {
      setActiveDialogKey(null);
    }
    return result;
  }
);
var initDialog = createAsyncThunk(
  "dialog/initDialog",
  async (id, { dispatch, signal, getState }) => {
    setActiveDialogKey(id);
    resetDialogRuntimeSessionState(id);
    clearWorkflow();
    try {
      const { currentServer: preferredServerOrigin } = getRuntimeServerContext(
        getState()
      );
      return await dispatch(
        read({
          dbKey: id,
          signal,
          preferredServerOrigin
        })
      ).unwrap();
    } catch (error) {
      const err2 = error;
      const isAborted = isAbortError(err2) || err2?.message === "Aborted";
      const isCurrentDialog = getActiveDialogKey() === id;
      if (!isAborted && isCurrentDialog) {
        setDialogConfigError(err2?.message || "Failed to load dialog");
        console.info("Failed to load dialog config:", err2?.message);
      }
      throw error;
    }
  }
);
var handleSendMessage = createAsyncThunk(
  "dialog/handleSendMessage",
  runHandleSendMessageAction
);
var abortAllMessages = createAsyncThunk(
  "dialog/abortAllMessages",
  async (args, { dispatch }) => {
    abortActiveControllers(args);
    dispatch(clearAllStreaming(args));
    clearActiveControllers(args);
  }
);
var updateTokens = createAsyncThunk(
  "dialog/updateTokens",
  async (args, thunkApi) => {
    const payload = await updateTokensAction(args, thunkApi);
    const dialogKey = args?.dialogKey;
    if (dialogKey && payload) {
      applyUpdateTokensFulfilled({
        dialogKey,
        input_tokens: payload.input_tokens,
        output_tokens: payload.output_tokens,
        cost: payload.cost
      });
    }
    return payload;
  }
);
var createDialog = createAsyncThunk(
  "dialog/createDialog",
  runCreateDialogAction
);
var createAgentAutomation = createAsyncThunk(
  "dialog/createAgentAutomation",
  runCreateAgentAutomationAction
);
var updateDialogTitle = createAsyncThunk(
  "dialog/updateDialogTitle",
  runUpdateDialogTitleAction
);
var addDialogAgent = createAsyncThunk(
  "dialog/addDialogAgent",
  runAddDialogAgentAction
);
var removeDialogAgent = createAsyncThunk(
  "dialog/removeDialogAgent",
  runRemoveDialogAgentAction
);
var setPrimaryDialogAgent = createAsyncThunk(
  "dialog/setPrimaryDialogAgent",
  runSetPrimaryDialogAgentAction
);
var setDialogExtraReferences = createAsyncThunk(
  "dialog/setDialogExtraReferences",
  runSetDialogExtraReferencesAction
);
function selectCurrentDialogConfig(state3) {
  const key = getActiveDialogKey();
  return key ? selectById(state3, key) : null;
}
var selectCurrentDialogAgentIds = createSelector(
  (state3) => selectCurrentDialogConfig(state3),
  (dialogConfig) => getDialogAgentIds(dialogConfig)
);
var selectCurrentPrimaryAgentId = createSelector(
  (state3) => selectCurrentDialogConfig(state3),
  (dialogConfig) => getPrimaryDialogAgentId(dialogConfig)
);
var selectDialogConfigByKey = createSelector(
  (state3) => state3,
  (_, dialogKey) => dialogKey,
  (state3, dialogKey) => dialogKey ? selectById(state3, dialogKey) : null
);
var selectCurrentDialogTokens = createSelector(
  (state3) => state3,
  selectCurrentDialogConfig,
  (_state, dialogKey) => dialogKey,
  (state3, currentDialog, dialogKey) => {
    if (dialogKey) {
      const dialogConfig = selectById(state3, dialogKey);
      return mergeDialogTokenStats(
        dialogConfig,
        getDialogRuntimeTokens(dialogKey)
      );
    }
    return mergeDialogTokenStats(currentDialog, getDialogRuntimeTokens());
  }
);
var selectTotalDialogTokens = selectCurrentDialogTokens;

// packages/render/table/fetchAndCacheTableRows.ts
var getRowTimestamp = (row) => {
  if (!row || typeof row !== "object") return 0;
  return asOptionalPositiveFiniteNumber(Date.parse(row.updatedAt ?? "")) ?? asOptionalPositiveFiniteNumber(Date.parse(row.createdAt ?? "")) ?? 0;
};
var shouldReplaceMergedRow = (nextRow, currentRow) => {
  const nextTs = getRowTimestamp(nextRow);
  const currentTs = getRowTimestamp(currentRow);
  if (nextTs !== currentTs) return nextTs > currentTs;
  return Boolean(nextRow?.deletedAt) && !currentRow?.deletedAt;
};
var mergeTableRows = (...rowLists) => {
  const merged = /* @__PURE__ */ new Map();
  for (const rowList of rowLists) {
    for (const row of rowList) {
      const dbKey = row?.dbKey;
      if (!dbKey) continue;
      const existing = merged.get(dbKey);
      if (!existing || shouldReplaceMergedRow(row, existing)) {
        merged.set(dbKey, row);
      }
    }
  }
  return Array.from(merged.values());
};
var TABLE_SYNC_ENVELOPE = "table-sync-v1";
var getLatestTableMeta = (snapshots) => {
  let latestMeta = null;
  for (const snapshot of snapshots) {
    const tableMeta = snapshot.tableMeta;
    if (!tableMeta || typeof tableMeta !== "object") continue;
    if (!latestMeta || shouldReplaceMergedRow(tableMeta, latestMeta)) {
      latestMeta = tableMeta;
    }
  }
  return latestMeta;
};
var loadLocalTableRows = async (db, tenantId, tableId) => {
  if (!db || typeof db.iterator !== "function") {
    return [];
  }
  const rows = [];
  const { gte, lte } = rowKey.range(tenantId, tableId);
  try {
    for await (const [, value] of db.iterator({ gte, lte })) {
      if (value?.type === "table_row" /* TABLE_ROW */) {
        rows.push(value);
      }
    }
  } catch {
    return [];
  }
  return rows;
};
var fetchTableRowsFromServer = async (server, tenantId, tableId, headers) => {
  const res = await fetch(`${server}/rpc/listTableRows`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      tenantId,
      tableId,
      includeDeleted: true,
      envelope: TABLE_SYNC_ENVELOPE
    })
  });
  if (!res.ok) {
    let msg = `\u52A0\u8F7D\u8868 ${tableId} \u884C\u5931\u8D25\uFF08${res.status}\uFF09`;
    try {
      const err2 = await res.json();
      if (err2 && typeof err2.message === "string") {
        msg = err2.message;
      }
    } catch {
    }
    throw new Error(msg);
  }
  const data = await res.json();
  if (Array.isArray(data)) {
    return {
      rows: data,
      deletedRows: [],
      tableMeta: null,
      complete: false
    };
  }
  if (!data || typeof data !== "object" || !Array.isArray(data.rows)) {
    throw new Error("\u670D\u52A1\u5668\u8FD4\u56DE\u683C\u5F0F\u9519\u8BEF\uFF1A\u9884\u671F\u4E3A\u6570\u7EC4");
  }
  return {
    rows: data.rows,
    deletedRows: Array.isArray(data.deletedRows) ? data.deletedRows : [],
    tableMeta: data.tableMeta ?? null,
    complete: data.complete === true
  };
};
var cacheMergedTableRows = async (db, mergedRows) => {
  if (!db) return;
  await Promise.all(
    mergedRows.map(async (mergedRow) => {
      if (!mergedRow?.dbKey) return;
      try {
        const localRow = await db.get(mergedRow.dbKey).catch(() => null);
        if (!localRow) {
          await db.put(mergedRow.dbKey, mergedRow);
          return;
        }
        const serverTs = new Date(
          mergedRow.updatedAt ?? mergedRow.createdAt ?? 0
        ).getTime();
        const localTs = new Date(
          localRow.updatedAt ?? localRow.createdAt ?? 0
        ).getTime();
        const shouldOverwrite = serverTs > localTs || serverTs === localTs && Boolean(mergedRow.deletedAt) && !Boolean(localRow.deletedAt);
        if (shouldOverwrite) {
          await db.put(mergedRow.dbKey, mergedRow);
        }
      } catch {
      }
    })
  );
};
var clearStaleLocalRows = async (db, localRows, authoritativeRows) => {
  if (!db || typeof db.del !== "function") return;
  const authoritativeKeys = new Set(
    authoritativeRows.map((row) => row?.dbKey).filter((dbKey) => typeof dbKey === "string" && dbKey.length > 0)
  );
  await Promise.all(
    localRows.map(async (row) => {
      const dbKey = row?.dbKey;
      if (typeof dbKey !== "string" || authoritativeKeys.has(dbKey)) return;
      try {
        await db.del(dbKey);
      } catch {
      }
    })
  );
};
var keepRemoteRowForPartialMerge = (row, localRowsByKey) => {
  const dbKey = row?.dbKey;
  if (typeof dbKey !== "string" || !dbKey) return false;
  const localRow = localRowsByKey.get(dbKey);
  if (!localRow) return true;
  const remoteDeleted = Boolean(row?.deletedAt);
  const localDeleted = Boolean(localRow?.deletedAt);
  return remoteDeleted === localDeleted;
};
var fetchAndCacheTableRows = async ({
  db,
  tenantId,
  tableId,
  token,
  remoteServers = []
}) => {
  const headers = {
    "Content-Type": "application/json"
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const localRows = await loadLocalTableRows(db, tenantId, tableId);
  const remoteResults = await Promise.allSettled(
    remoteServers.map(
      (server) => fetchTableRowsFromServer(server, tenantId, tableId, headers)
    )
  );
  const fulfilledRemoteSnapshots = remoteResults.filter(
    (result) => result.status === "fulfilled"
  ).map((result) => result.value);
  if (fulfilledRemoteSnapshots.length === 0 && localRows.length === 0) {
    const firstFailure = remoteResults.find(
      (result) => result.status === "rejected"
    );
    throw new Error(firstFailure?.reason?.message || "\u52A0\u8F7D\u8868\u884C\u5931\u8D25");
  }
  const allRemoteSnapshotsComplete = remoteServers.length > 0 && remoteResults.length === remoteServers.length && fulfilledRemoteSnapshots.length === remoteServers.length && fulfilledRemoteSnapshots.every((snapshot) => snapshot.complete);
  const localRowsByKey = new Map(
    localRows.filter((row) => typeof row?.dbKey === "string" && row.dbKey.length > 0).map((row) => [row.dbKey, row])
  );
  const remoteRowLists = fulfilledRemoteSnapshots.map((snapshot) => {
    const snapshotRows = [...snapshot.rows, ...snapshot.deletedRows];
    return allRemoteSnapshotsComplete ? snapshotRows : snapshotRows.filter((row) => keepRemoteRowForPartialMerge(row, localRowsByKey));
  });
  const authoritativeRemoteRows = remoteRowLists.flat();
  const tableDeleted = allRemoteSnapshotsComplete && Boolean(getLatestTableMeta(fulfilledRemoteSnapshots)?.deletedAt);
  if (allRemoteSnapshotsComplete) {
    await clearStaleLocalRows(db, localRows, authoritativeRemoteRows);
  }
  const localRowsForMerge = allRemoteSnapshotsComplete ? localRows.filter(
    (row) => authoritativeRemoteRows.some((remoteRow) => remoteRow?.dbKey === row?.dbKey)
  ) : localRows;
  const mergedRows = mergeTableRows(localRowsForMerge, ...remoteRowLists);
  await cacheMergedTableRows(db, mergedRows);
  return tableDeleted ? [] : mergedRows.filter((row) => !row?.deletedAt);
};

// packages/render/table/tableColumnCore.ts
var ok = (value) => ({ ok: true, value });
var err = (error) => ({ ok: false, error });
var hasOwn2 = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
var buildMeta = (meta, columns, updatedAt) => ({
  meta: { ...meta, columns, updatedAt },
  metaChanges: { columns, updatedAt },
  noop: false
});
var reorderList = (list, from, to) => {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};
function addColumnToMeta(meta, input, deps) {
  const { columnName } = input;
  if (!columnName.trim()) {
    return err("\u5B57\u6BB5\u540D\u4E0D\u80FD\u4E3A\u7A7A");
  }
  if (meta.columns.some((c2) => c2.name === columnName)) {
    return err(`\u5B57\u6BB5 ${columnName} \u5DF2\u5B58\u5728`);
  }
  const newColumn = {
    id: deps.id,
    name: columnName,
    label: columnName
  };
  return ok(buildMeta(meta, [...meta.columns, newColumn], deps.nowIso));
}
function deleteColumnFromMeta(meta, rows, input, deps) {
  const { columnName } = input;
  const { nowIso } = deps;
  if (!meta.columns.some((c2) => c2.name === columnName)) {
    return err(`\u5B57\u6BB5 ${columnName} \u4E0D\u5B58\u5728`);
  }
  const newColumns = meta.columns.filter((c2) => c2.name !== columnName);
  const rowPatches = rows.filter((row) => hasOwn2(row, columnName)).map((row) => ({
    dbKey: row.dbKey,
    changes: { [columnName]: null, updatedAt: nowIso }
  }));
  const newRows = rows.map((row) => {
    if (!hasOwn2(row, columnName)) {
      return row;
    }
    const { [columnName]: _removed, ...rest } = row;
    return { ...rest, updatedAt: nowIso };
  });
  return ok({
    ...buildMeta(meta, newColumns, nowIso),
    rows: newRows,
    rowPatches
  });
}
function reorderColumnInMeta(meta, input, deps) {
  const { fromIndex, toIndex } = input;
  const columnCount = meta.columns.length;
  if (fromIndex < 0 || fromIndex >= columnCount || toIndex < 0 || toIndex >= columnCount) {
    return err("\u5217\u7D22\u5F15\u8D85\u51FA\u8303\u56F4");
  }
  if (fromIndex === toIndex) {
    return ok({
      meta,
      metaChanges: { columns: meta.columns, updatedAt: meta.updatedAt },
      noop: true
    });
  }
  return ok(
    buildMeta(meta, reorderList(meta.columns, fromIndex, toIndex), deps.nowIso)
  );
}
function renameColumnInMeta(meta, rows, input, deps) {
  const { oldName } = input;
  const { nowIso } = deps;
  const newName = input.newName.trim();
  if (!newName) {
    return err("\u65B0\u7684\u5B57\u6BB5\u540D\u4E0D\u80FD\u4E3A\u7A7A");
  }
  if (!meta.columns.some((c2) => c2.name === oldName)) {
    return err(`\u5B57\u6BB5 ${oldName} \u4E0D\u5B58\u5728`);
  }
  if (meta.columns.some((c2) => c2.name === newName)) {
    return err(`\u5B57\u6BB5 ${newName} \u5DF2\u5B58\u5728`);
  }
  const newColumns = meta.columns.map(
    (c2) => c2.name === oldName ? { ...c2, name: newName } : c2
  );
  const rowPatches = rows.filter((row) => hasOwn2(row, oldName)).map((row) => ({
    dbKey: row.dbKey,
    changes: {
      [newName]: row[oldName],
      [oldName]: null,
      updatedAt: nowIso
    }
  }));
  const newRows = rows.map((row) => {
    if (!hasOwn2(row, oldName)) {
      return row;
    }
    const { [oldName]: oldValue, ...rest } = row;
    return { ...rest, [newName]: oldValue, updatedAt: nowIso };
  });
  return ok({
    ...buildMeta(meta, newColumns, nowIso),
    rows: newRows,
    rowPatches
  });
}
function renameColumnLabelInMeta(meta, input, deps) {
  const { columnId } = input;
  const label = input.label.trim();
  if (!label) {
    return err("\u5B57\u6BB5\u663E\u793A\u540D\u4E0D\u80FD\u4E3A\u7A7A");
  }
  if (!meta.columns.some((c2) => c2.id === columnId)) {
    return err("\u8981\u91CD\u547D\u540D\u7684\u5B57\u6BB5\u4E0D\u5B58\u5728");
  }
  const newColumns = meta.columns.map(
    (c2) => c2.id === columnId ? { ...c2, label } : c2
  );
  return ok(buildMeta(meta, newColumns, deps.nowIso));
}
function updateColumnWidthInMeta(meta, input, deps) {
  const { columnId, width } = input;
  if (!meta.columns.some((c2) => c2.id === columnId)) {
    return err("\u8981\u8C03\u6574\u5BBD\u5EA6\u7684\u5B57\u6BB5\u4E0D\u5B58\u5728");
  }
  const normalizedWidth = typeof width === "number" && width > 0 ? Math.round(width) : void 0;
  const newColumns = meta.columns.map(
    (c2) => c2.id === columnId ? { ...c2, width: normalizedWidth } : c2
  );
  return ok(buildMeta(meta, newColumns, deps.nowIso));
}
function addColumnOptionInMeta(meta, input, deps) {
  const { columnId } = input;
  const option = input.option.trim();
  if (!option) {
    return err("\u9009\u9879\u540D\u4E0D\u80FD\u4E3A\u7A7A");
  }
  const column = meta.columns.find((c2) => c2.id === columnId);
  if (!column) {
    return err("\u8981\u65B0\u589E\u9009\u9879\u7684\u5B57\u6BB5\u4E0D\u5B58\u5728");
  }
  if ((column.options ?? []).some((o) => o.trim() === option)) {
    return ok({
      meta,
      metaChanges: { columns: meta.columns, updatedAt: meta.updatedAt },
      noop: true
    });
  }
  const newColumns = meta.columns.map(
    (c2) => c2.id === columnId ? { ...c2, options: [...c2.options ?? [], option] } : c2
  );
  return ok(buildMeta(meta, newColumns, deps.nowIso));
}

// packages/render/table/createTableAction.ts
var DEFAULT_COLUMNS = [
  {
    name: "title",
    label: "\u6807\u9898",
    type: "text",
    description: "\u8FD9\u4E00\u884C\u8BB0\u5F55\u7684\u4E3B\u9898\u6216\u540D\u79F0\u3002",
    isPrimary: true,
    required: true
  },
  {
    name: "note",
    label: "\u5907\u6CE8",
    type: "text",
    description: "\u5BF9\u8BE5\u6761\u76EE\u7684\u8865\u5145\u8BF4\u660E\u3002",
    required: false
  }
];
var normalizeColumns = (inputColumns) => {
  const base = Array.isArray(inputColumns) ? inputColumns : [];
  const normalized = base.map((c2) => {
    if (!c2 || typeof c2.name !== "string") return null;
    const name = c2.name.trim();
    if (!name) return null;
    const col = {
      id: asOptionalTrimmedString(c2.id) ?? ulid(),
      name
    };
    const label = asOptionalTrimmedString(c2.label);
    if (label) col.label = label;
    if (typeof c2.type === "string") {
      col.type = c2.type;
    }
    const description = asOptionalTrimmedString(c2.description);
    if (description) col.description = description;
    if (typeof c2.isPrimary === "boolean") {
      col.isPrimary = c2.isPrimary;
    }
    if (typeof c2.required === "boolean") {
      col.required = c2.required;
    }
    if (Array.isArray(c2.options)) {
      const opts = asTrimmedNonEmptyStringArray(c2.options);
      if (opts.length) {
        col.options = opts;
      }
    }
    return col;
  }).filter(Boolean);
  if (normalized.length > 0) {
    if (!normalized.some((c2) => c2.isPrimary)) {
      normalized[0].isPrimary = true;
    }
    return normalized;
  }
  return DEFAULT_COLUMNS.map((c2) => ({
    ...c2,
    id: ulid()
  }));
};
var normalizeStringArray2 = (value) => {
  if (!Array.isArray(value)) return void 0;
  const items = [...new Set(asTrimmedNonEmptyStringArray(value))];
  return items.length ? items : void 0;
};
var normalizePublicIntake = (input) => {
  if (!isRecord(input)) return void 0;
  const allowedFields = normalizeStringArray2(input.allowedFields) ?? [];
  if (input.enabled !== true) {
    return { enabled: false, allowedFields };
  }
  if (allowedFields.length === 0) {
    throw new Error("publicIntake.allowedFields \u81F3\u5C11\u9700\u8981\u4E00\u4E2A\u5B57\u6BB5\u3002");
  }
  const slug = asOptionalTrimmedString(input.slug);
  const honeypotField = asOptionalTrimmedString(input.honeypotField);
  return {
    enabled: true,
    ...slug ? { slug } : {},
    ...normalizeStringArray2(input.appIds) ? { appIds: normalizeStringArray2(input.appIds) } : {},
    allowedFields,
    ...normalizeStringArray2(input.requiredFields) ? { requiredFields: normalizeStringArray2(input.requiredFields) } : {},
    ...honeypotField ? { honeypotField } : {}
  };
};
var createTableAction = async ({
  spaceId: customSpaceId,
  title: customTitle,
  purpose: customPurpose,
  description: customDescription,
  tags: customTags,
  publicIntake,
  categoryId,
  columns,
  withDefaultRows = true
} = {}, { dispatch, getState }) => {
  const state3 = getState();
  const userId = selectIdentityUserId(state3);
  if (!userId) throw new Error("User ID not found.");
  const spaceId = customSpaceId ?? selectCurrentSpaceId(state3);
  const tableId = ulid();
  const now = /* @__PURE__ */ new Date();
  const nowIso = formatISO(now);
  const dbKey = metaKey(userId, tableId);
  const defaultTitle = client_default.t("space:newTable", {
    defaultValue: "\u65B0\u5EFA\u8868\u683C"
  });
  const title = asOptionalTrimmedString(customTitle) ?? defaultTitle;
  const purpose = asOptionalTrimmedString(customPurpose);
  const description = asOptionalTrimmedString(customDescription);
  const tags = Array.isArray(customTags) && customTags.length ? asTrimmedNonEmptyStringArray(customTags) : void 0;
  const finalPublicIntake = normalizePublicIntake(publicIntake);
  const finalColumns = normalizeColumns(columns);
  const tableMeta = {
    dbKey,
    tenantId: userId,
    tableId,
    spaceId: spaceId ?? null,
    displayName: title,
    purpose,
    description,
    tags,
    schemaVersion: 1,
    columns: finalColumns,
    views: [],
    // 后续可以在 UI 中新增视图
    triggers: [],
    // 后续可以在 UI/配置中新增触发器
    aiConfig: void 0,
    ...finalPublicIntake ? { publicIntake: finalPublicIntake } : {},
    createdAt: nowIso,
    updatedAt: nowIso,
    type: "table" /* TABLE */
  };
  await dispatch(
    write({
      data: tableMeta,
      customKey: dbKey
    })
  ).unwrap();
  if (withDefaultRows) {
    const defaultRows = [
      {
        title: "\u793A\u4F8B\u4E00",
        note: "\u4F60\u53EF\u4EE5\u5728\u8FD9\u91CC\u8BB0\u5F55\u4EFB\u4F55\u5185\u5BB9\uFF0C\u4F8B\u5982\u4EFB\u52A1\u3001\u60F3\u6CD5\u6216\u914D\u7F6E\u9879\u3002"
      },
      {
        title: "\u793A\u4F8B\u4E8C",
        note: "\u53CC\u51FB\u5355\u5143\u683C\u5F00\u59CB\u7F16\u8F91\uFF0C\u53F3\u4E0A\u89D2\u53EF\u4EE5\u6DFB\u52A0\u5B57\u6BB5\u548C\u884C\u3002"
      }
    ];
    await Promise.all(
      defaultRows.map(async (values) => {
        const { dbKey: rowKeyStr, rowId } = rowKey.create(userId, tableId);
        const row = {
          dbKey: rowKeyStr,
          tenantId: userId,
          tableId,
          rowId,
          createdAt: nowIso,
          updatedAt: nowIso,
          type: "table_row" /* TABLE_ROW */,
          ...values
        };
        await dispatch(
          write({
            data: row,
            customKey: rowKeyStr
          })
        ).unwrap();
      })
    );
  }
  if (spaceId) {
    await dispatch(
      addContentToSpace({
        spaceId,
        contentKey: dbKey,
        type: "table" /* TABLE */,
        title,
        categoryId
      })
    ).unwrap();
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("nolo-user-data-updated"));
  }
  return dbKey;
};

// packages/render/table/deleteTableAction.ts
var parseMetaKey = (dbKey) => {
  const parts = dbKey.split(SEPARATOR2);
  if (parts[0] !== "meta" || parts.length < 3) {
    throw new Error(`\u975E\u6CD5\u8868 key\uFF1A${dbKey}`);
  }
  const tenantId = parts[1];
  const tableId = parts.slice(2).join(SEPARATOR2);
  return { tenantId, tableId };
};
var collectEntriesByPrefix = async (db, prefix) => {
  const entries = [];
  for await (const [key, value] of db.iterator({
    gte: prefix,
    lte: prefix + "\uFFFF"
  })) {
    entries.push([key, value]);
  }
  return entries;
};
var belongsToTable = (value, tenantId, tableId) => Boolean(
  value && typeof value === "object" && value.tenantId === tenantId && value.tableId === tableId
);
var indexValueReferencesRows = (value, rowDbKeys, rowIds) => {
  if (typeof value === "string") {
    return rowDbKeys.has(value) || rowIds.has(value);
  }
  if (!value || typeof value !== "object") return false;
  const candidate = value;
  return typeof candidate.dbKey === "string" && rowDbKeys.has(candidate.dbKey) || typeof candidate.rowDbKey === "string" && rowDbKeys.has(candidate.rowDbKey) || typeof candidate.rowId === "string" && rowIds.has(candidate.rowId);
};
var deleteTableAction = async ({ dbKey }, {
  dispatch,
  getState,
  extra
}) => {
  const { db } = extra;
  const state3 = getState();
  const { currentServer, syncServers } = getRuntimeServerContext(state3);
  const { tenantId, tableId } = parseMetaKey(dbKey);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const rowPrefix = createKey("row", tenantId, tableId, "");
  const rowEntries = (await collectEntriesByPrefix(db, rowPrefix)).filter(
    ([, value]) => belongsToTable(value, tenantId, tableId)
  );
  const rowDbKeys = new Set(rowEntries.map(([key]) => key));
  const rowIds = new Set(
    rowEntries.map(([, value]) => value.rowId).filter((rowId) => typeof rowId === "string")
  );
  const idxPrefix = createKey("idx", tenantId, tableId, "");
  const idxEntries = await collectEntriesByPrefix(db, idxPrefix);
  const idxKeys = idxEntries.filter(
    ([, value]) => belongsToTable(value, tenantId, tableId) || indexValueReferencesRows(value, rowDbKeys, rowIds)
  ).map(([key]) => key);
  const viewPrefix = createKey("view", tenantId, tableId, "");
  const viewEntries = await collectEntriesByPrefix(db, viewPrefix);
  const viewKeys = viewEntries.filter(([, value]) => belongsToTable(value, tenantId, tableId)).map(([key]) => key);
  const metaRecord = typeof db.get === "function" ? await db.get(dbKey).catch(() => null) : null;
  const keysToDelete = Array.from(
    /* @__PURE__ */ new Set([
      ...idxKeys,
      ...viewKeys
    ])
  );
  const putOps = [
    ...metaRecord && typeof metaRecord === "object" ? [
      {
        type: "put",
        key: dbKey,
        value: buildTombstoneRecord(metaRecord, nowIso)
      }
    ] : [],
    ...rowEntries.map(([key, value]) => ({
      type: "put",
      key,
      value: buildTombstoneRecord(value, nowIso)
    }))
  ];
  if (keysToDelete.length > 0 || putOps.length > 0) {
    const ops = [
      ...putOps,
      ...keysToDelete.map((key) => ({
        type: "del",
        key
      }))
    ];
    await db.batch(ops);
  }
  scheduleDeleteReplication({
    currentServer,
    syncServers,
    dbKey,
    deleteOptions: { type: "table" },
    state: state3
  });
  return dbKey;
};

// packages/render/table/tableSlice.ts
var initialState5 = {
  currentTable: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  rows: [],
  focusContext: null
};
var createSliceWithThunks5 = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator }
});
var tableSlice = createSliceWithThunks5({
  name: "table",
  initialState: initialState5,
  reducers: (create) => ({
    /* --------------------------------------
     * 1. 创建表：createTable
     * ------------------------------------*/
    createTable: create.asyncThunk(
      createTableAction
    ),
    /* --------------------------------------
     * 2. 加载已有表定义：initTable
     * ------------------------------------*/
    initTable: create.asyncThunk(
      async (args, { dispatch, rejectWithValue }) => {
        const { tenantId, tableId } = args;
        const dbKey = metaKey(tenantId, tableId);
        try {
          const readAction2 = await dispatch(readAndWait(dbKey));
          if (readAndWait.fulfilled.match(readAction2) && readAction2.payload) {
            const meta = readAction2.payload;
            return meta;
          }
          const msg = readAction2.payload?.message || `\u65E0\u6CD5\u52A0\u8F7D\u8868 ${tableId}`;
          return rejectWithValue(msg);
        } catch (e2) {
          return rejectWithValue(e2.message || `\u521D\u59CB\u5316\u8868 ${tableId} \u65F6\u51FA\u9519`);
        }
      },
      {
        pending: (state3) => {
          state3.isLoading = true;
          state3.error = null;
          state3.isInitialized = false;
          state3.currentTable = null;
          state3.rows = [];
        },
        fulfilled: (state3, action2) => {
          state3.isLoading = false;
          state3.isInitialized = true;
          state3.currentTable = action2.payload;
          state3.error = null;
        },
        rejected: (state3, action2) => {
          state3.isLoading = false;
          state3.isInitialized = true;
          state3.currentTable = null;
          state3.error = action2.payload || action2.error.message || "\u521D\u59CB\u5316\u8868\u65F6\u53D1\u751F\u672A\u77E5\u9519\u8BEF";
          state3.rows = [];
        }
      }
    ),
    /* --------------------------------------
     * 2.1 加载某表的所有行：loadTableRows
     * ------------------------------------*/
    loadTableRows: create.asyncThunk(
      async (args, { getState, rejectWithValue, extra }) => {
        const { tenantId, tableId } = args;
        const { db } = extra;
        try {
          const state3 = getState();
          const { currentToken: token, remoteServers } = getRuntimeServerContext(state3);
          return await fetchAndCacheTableRows({
            db,
            tenantId,
            tableId,
            token,
            remoteServers
          });
        } catch (e2) {
          return rejectWithValue(e2.message || "\u52A0\u8F7D\u8868\u884C\u5931\u8D25");
        }
      },
      {
        pending: (state3) => {
          state3.error = null;
        },
        fulfilled: (state3, action2) => {
          state3.rows = action2.payload;
        },
        rejected: (state3, action2) => {
          state3.error = action2.payload || action2.error.message || "\u52A0\u8F7D\u8868\u884C\u65F6\u53D1\u751F\u672A\u77E5\u9519\u8BEF";
          state3.rows = [];
        }
      }
    ),
    /* --------------------------------------
     * 3. 新增一行：addRow
     * ------------------------------------*/
    addRow: create.asyncThunk(
      async (args, { dispatch, rejectWithValue }) => {
        const { tenantId, tableId, values } = args;
        try {
          const { dbKey, rowId } = rowKey.create(tenantId, tableId);
          const nowIso = formatISO(/* @__PURE__ */ new Date());
          const row = {
            dbKey,
            tenantId,
            tableId,
            rowId,
            createdAt: nowIso,
            updatedAt: nowIso,
            type: "table_row" /* TABLE_ROW */,
            ...values
          };
          await dispatch(
            write({
              data: row,
              customKey: dbKey
            })
          ).unwrap();
          return row;
        } catch (e2) {
          return rejectWithValue(e2.message || "\u65B0\u589E\u8868\u884C\u5931\u8D25");
        }
      },
      {
        pending: (state3) => {
          state3.error = null;
        },
        fulfilled: (state3, action2) => {
          const row = action2.payload;
          const meta = state3.currentTable;
          if (meta && row?.tenantId === meta.tenantId && row?.tableId === meta.tableId) {
            state3.rows.push(row);
          }
        },
        rejected: (state3, action2) => {
          state3.error = action2.payload || action2.error.message || "\u65B0\u589E\u8868\u884C\u65F6\u53D1\u751F\u672A\u77E5\u9519\u8BEF";
        }
      }
    ),
    /* --------------------------------------
     * 3.1 删除一行：deleteRow
     * ------------------------------------*/
    deleteRow: create.asyncThunk(
      async (dbKey, { dispatch, getState, rejectWithValue, extra }) => {
        try {
          const state3 = getState();
          const row = state3.table.rows.find((item) => item?.dbKey === dbKey);
          if (!row) {
            return rejectWithValue(`\u5F53\u524D\u8868\u4E2D\u627E\u4E0D\u5230\u8981\u5220\u9664\u7684\u884C\uFF1A${dbKey}`);
          }
          const nowIso = formatISO(/* @__PURE__ */ new Date());
          const tombstoneRow = {
            ...row,
            deletedAt: nowIso,
            updatedAt: nowIso,
            type: "table_row" /* TABLE_ROW */
          };
          if (extra?.db && typeof extra.db.put === "function") {
            await extra.db.put(dbKey, tombstoneRow);
          }
          dispatch(upsertSSREntity(tombstoneRow));
          const { currentServer, syncServers } = getRuntimeServerContext(state3);
          const servers = resolveReplicationServers(currentServer, syncServers);
          scheduleWriteReplication(
            servers,
            {
              data: tombstoneRow,
              customKey: dbKey
            },
            state3
          );
          return dbKey;
        } catch (e2) {
          return rejectWithValue(e2.message || "\u5220\u9664\u8868\u884C\u5931\u8D25");
        }
      },
      {
        pending: (state3) => {
          state3.error = null;
        },
        fulfilled: (state3, action2) => {
          const dbKey = action2.payload;
          state3.rows = state3.rows.filter((row) => row.dbKey !== dbKey);
        },
        rejected: (state3, action2) => {
          state3.error = action2.payload || action2.error.message || "\u5220\u9664\u8868\u884C\u65F6\u53D1\u751F\u672A\u77E5\u9519\u8BEF";
        }
      }
    ),
    /* --------------------------------------
     * 3.2 删除整张表：deleteTable
     * ------------------------------------*/
    deleteTable: create.asyncThunk(
      deleteTableAction,
      {
        pending: (state3) => {
          state3.error = null;
        },
        fulfilled: (state3, action2) => {
          const deletedKey = action2.payload;
          if (state3.currentTable?.dbKey === deletedKey) {
            state3.currentTable = null;
            state3.rows = [];
            state3.isInitialized = false;
          }
        },
        rejected: (state3, action2) => {
          state3.error = action2.payload || action2.error.message || "\u5220\u9664\u8868\u65F6\u53D1\u751F\u672A\u77E5\u9519\u8BEF";
        }
      }
    ),
    /* --------------------------------------
     * 4. 新增字段：addColumn
     * ------------------------------------*/
    addColumn: create.asyncThunk(
      async (args, { dispatch, getState, rejectWithValue }) => {
        const { tenantId, tableId, columnName } = args;
        const state3 = getState().table;
        const meta = state3.currentTable;
        if (!meta || meta.tenantId !== tenantId || meta.tableId !== tableId) {
          return rejectWithValue("\u5F53\u524D\u6CA1\u6709\u52A0\u8F7D\u5BF9\u5E94\u7684\u8868\u5B9A\u4E49");
        }
        const result = addColumnToMeta(
          meta,
          { columnName },
          { id: ulid(), nowIso: formatISO(/* @__PURE__ */ new Date()) }
        );
        if (!result.ok) {
          return rejectWithValue(result.error);
        }
        try {
          await dispatch(
            patch({
              dbKey: meta.dbKey,
              changes: result.value.metaChanges
            })
          ).unwrap();
          return result.value.meta;
        } catch (e2) {
          return rejectWithValue(e2.message || "\u6DFB\u52A0\u5B57\u6BB5\u5931\u8D25");
        }
      },
      {
        pending: (state3) => {
          state3.error = null;
        },
        fulfilled: (state3, action2) => {
          state3.currentTable = action2.payload;
          state3.isInitialized = true;
        },
        rejected: (state3, action2) => {
          state3.error = action2.payload || action2.error.message || "\u4E3A\u8868\u65B0\u589E\u5B57\u6BB5\u65F6\u53D1\u751F\u672A\u77E5\u9519\u8BEF";
        }
      }
    ),
    /* --------------------------------------
     * 4.1 删除字段：deleteColumn
     * ------------------------------------*/
    deleteColumn: create.asyncThunk(
      async (args, { dispatch, getState, rejectWithValue }) => {
        const { tenantId, tableId, columnName } = args;
        const state3 = getState().table;
        const meta = state3.currentTable;
        if (!meta || meta.tenantId !== tenantId || meta.tableId !== tableId) {
          return rejectWithValue("\u5F53\u524D\u6CA1\u6709\u52A0\u8F7D\u5BF9\u5E94\u7684\u8868\u5B9A\u4E49");
        }
        const result = deleteColumnFromMeta(
          meta,
          state3.rows,
          { columnName },
          { nowIso: formatISO(/* @__PURE__ */ new Date()) }
        );
        if (!result.ok) {
          return rejectWithValue(result.error);
        }
        const { meta: nextMeta, metaChanges, rows: newRows, rowPatches } = result.value;
        try {
          await Promise.all(
            rowPatches.map((p) => dispatch(patch(p)).unwrap())
          );
          await dispatch(
            patch({ dbKey: meta.dbKey, changes: metaChanges })
          ).unwrap();
          return { meta: nextMeta, rows: newRows };
        } catch (e2) {
          return rejectWithValue(e2.message || "\u5220\u9664\u5B57\u6BB5\u5931\u8D25");
        }
      },
      {
        pending: (state3) => {
          state3.error = null;
        },
        fulfilled: (state3, action2) => {
          state3.currentTable = action2.payload.meta;
          state3.rows = action2.payload.rows;
          state3.isInitialized = true;
        },
        rejected: (state3, action2) => {
          state3.error = action2.payload || action2.error.message || "\u5220\u9664\u5B57\u6BB5\u65F6\u53D1\u751F\u672A\u77E5\u9519\u8BEF";
        }
      }
    ),
    /* --------------------------------------
     * 4.1-bis 调整字段顺序：reorderColumn
     * ------------------------------------*/
    reorderColumn: create.asyncThunk(
      async (args, { dispatch, getState, rejectWithValue }) => {
        const { tenantId, tableId, fromIndex, toIndex } = args;
        const state3 = getState().table;
        const meta = state3.currentTable;
        if (!meta || meta.tenantId !== tenantId || meta.tableId !== tableId) {
          return rejectWithValue("\u5F53\u524D\u6CA1\u6709\u52A0\u8F7D\u5BF9\u5E94\u7684\u8868\u5B9A\u4E49");
        }
        const result = reorderColumnInMeta(
          meta,
          { fromIndex, toIndex },
          { nowIso: formatISO(/* @__PURE__ */ new Date()) }
        );
        if (!result.ok) {
          return rejectWithValue(result.error);
        }
        if (result.value.noop) {
          return meta;
        }
        const { meta: nextMeta, metaChanges } = result.value;
        try {
          await dispatch(
            patch({ dbKey: meta.dbKey, changes: metaChanges })
          ).unwrap();
          return nextMeta;
        } catch (e2) {
          return rejectWithValue(e2.message || "\u8C03\u6574\u5217\u987A\u5E8F\u5931\u8D25");
        }
      },
      {
        pending: (state3) => {
          state3.error = null;
        },
        fulfilled: (state3, action2) => {
          state3.currentTable = action2.payload;
          state3.isInitialized = true;
        },
        rejected: (state3, action2) => {
          state3.error = action2.payload || action2.error.message || "\u8C03\u6574\u5217\u987A\u5E8F\u65F6\u53D1\u751F\u672A\u77E5\u9519\u8BEF";
        }
      }
    ),
    /* --------------------------------------
     * 4.2 重命名字段（机器名）：renameColumn
     * 说明：这是“改字段 key 并迁移所有行数据”的重操作，
     * 目前 UI 不直接调用，保留给将来高级设置用。
     * ------------------------------------*/
    renameColumn: create.asyncThunk(
      async (args, { dispatch, getState, rejectWithValue }) => {
        const { tenantId, tableId, oldName, newName } = args;
        const state3 = getState().table;
        const meta = state3.currentTable;
        if (!meta || meta.tenantId !== tenantId || meta.tableId !== tableId) {
          return rejectWithValue("\u5F53\u524D\u6CA1\u6709\u52A0\u8F7D\u5BF9\u5E94\u7684\u8868\u5B9A\u4E49");
        }
        const result = renameColumnInMeta(
          meta,
          state3.rows,
          { oldName, newName },
          { nowIso: formatISO(/* @__PURE__ */ new Date()) }
        );
        if (!result.ok) {
          return rejectWithValue(result.error);
        }
        const { meta: nextMeta, metaChanges, rows: newRows, rowPatches } = result.value;
        try {
          await Promise.all(
            rowPatches.map((p) => dispatch(patch(p)).unwrap())
          );
          await dispatch(
            patch({ dbKey: meta.dbKey, changes: metaChanges })
          ).unwrap();
          return { meta: nextMeta, rows: newRows };
        } catch (e2) {
          return rejectWithValue(e2.message || "\u91CD\u547D\u540D\u5B57\u6BB5\u5931\u8D25");
        }
      },
      {
        pending: (state3) => {
          state3.error = null;
        },
        fulfilled: (state3, action2) => {
          state3.currentTable = action2.payload.meta;
          state3.rows = action2.payload.rows;
          state3.isInitialized = true;
        },
        rejected: (state3, action2) => {
          state3.error = action2.payload || action2.error.message || "\u91CD\u547D\u540D\u5B57\u6BB5\u65F6\u53D1\u751F\u672A\u77E5\u9519\u8BEF";
        }
      }
    ),
    /* --------------------------------------
     * 4.2-bis 重命名字段显示名：renameColumnLabel
     * 说明：只改 columns[].label，不动 name / 行数据
     * UI 表头双击使用这一条。
     * ------------------------------------*/
    renameColumnLabel: create.asyncThunk(
      async (args, { dispatch, getState, rejectWithValue }) => {
        const { tenantId, tableId, columnId, newLabel } = args;
        const state3 = getState().table;
        const meta = state3.currentTable;
        if (!meta || meta.tenantId !== tenantId || meta.tableId !== tableId) {
          return rejectWithValue("\u5F53\u524D\u6CA1\u6709\u52A0\u8F7D\u5BF9\u5E94\u7684\u8868\u5B9A\u4E49");
        }
        const result = renameColumnLabelInMeta(
          meta,
          { columnId, label: newLabel },
          { nowIso: formatISO(/* @__PURE__ */ new Date()) }
        );
        if (!result.ok) {
          return rejectWithValue(result.error);
        }
        const { meta: nextMeta, metaChanges } = result.value;
        try {
          await dispatch(
            patch({ dbKey: meta.dbKey, changes: metaChanges })
          ).unwrap();
          return nextMeta;
        } catch (e2) {
          return rejectWithValue(e2.message || "\u91CD\u547D\u540D\u5B57\u6BB5\u663E\u793A\u540D\u5931\u8D25");
        }
      },
      {
        pending: (state3) => {
          state3.error = null;
        },
        fulfilled: (state3, action2) => {
          state3.currentTable = action2.payload;
          state3.isInitialized = true;
        },
        rejected: (state3, action2) => {
          state3.error = action2.payload || action2.error.message || "\u91CD\u547D\u540D\u5B57\u6BB5\u663E\u793A\u540D\u65F6\u53D1\u751F\u672A\u77E5\u9519\u8BEF";
        }
      }
    ),
    /* --------------------------------------
     * 4.2-ter 更新字段宽度：updateColumnWidth
     * 说明：只改 columns[].width，用于持久化列宽
     * ------------------------------------*/
    updateColumnWidth: create.asyncThunk(
      async (args, { dispatch, getState, rejectWithValue }) => {
        const { tenantId, tableId, columnId, width } = args;
        const state3 = getState().table;
        const meta = state3.currentTable;
        if (!meta || meta.tenantId !== tenantId || meta.tableId !== tableId) {
          return rejectWithValue("\u5F53\u524D\u6CA1\u6709\u52A0\u8F7D\u5BF9\u5E94\u7684\u8868\u5B9A\u4E49");
        }
        const result = updateColumnWidthInMeta(
          meta,
          { columnId, width },
          { nowIso: formatISO(/* @__PURE__ */ new Date()) }
        );
        if (!result.ok) {
          return rejectWithValue(result.error);
        }
        const { meta: nextMeta, metaChanges } = result.value;
        try {
          await dispatch(
            patch({ dbKey: meta.dbKey, changes: metaChanges })
          ).unwrap();
          return nextMeta;
        } catch (e2) {
          return rejectWithValue(e2.message || "\u66F4\u65B0\u5B57\u6BB5\u5BBD\u5EA6\u5931\u8D25");
        }
      },
      {
        pending: (state3) => {
          state3.error = null;
        },
        fulfilled: (state3, action2) => {
          state3.currentTable = action2.payload;
          state3.isInitialized = true;
        },
        rejected: (state3, action2) => {
          state3.error = action2.payload || action2.error.message || "\u66F4\u65B0\u5B57\u6BB5\u5BBD\u5EA6\u65F6\u53D1\u751F\u672A\u77E5\u9519\u8BEF";
        }
      }
    ),
    /* --------------------------------------
     * 4.2-quater 新增 select 选项：addColumnOption
     * 说明：把新选项追加到 columns[].options（select 弹层「+ 新建选项」入口），
     * 重复选项为 no-op：跳过 patch 直接返回原 meta，fulfilled 照常刷新 currentTable。
     * ------------------------------------*/
    addColumnOption: create.asyncThunk(
      async (args, { dispatch, getState, rejectWithValue }) => {
        const { tenantId, tableId, columnId, option } = args;
        const state3 = getState().table;
        const meta = state3.currentTable;
        if (!meta || meta.tenantId !== tenantId || meta.tableId !== tableId) {
          return rejectWithValue("\u5F53\u524D\u6CA1\u6709\u52A0\u8F7D\u5BF9\u5E94\u7684\u8868\u5B9A\u4E49");
        }
        const result = addColumnOptionInMeta(
          meta,
          { columnId, option },
          { nowIso: formatISO(/* @__PURE__ */ new Date()) }
        );
        if (!result.ok) {
          return rejectWithValue(result.error);
        }
        if (result.value.noop) {
          return meta;
        }
        const { meta: nextMeta, metaChanges } = result.value;
        try {
          await dispatch(
            patch({ dbKey: meta.dbKey, changes: metaChanges })
          ).unwrap();
          return nextMeta;
        } catch (e2) {
          return rejectWithValue(e2.message || "\u65B0\u589E\u9009\u9879\u5931\u8D25");
        }
      },
      {
        pending: (state3) => {
          state3.error = null;
        },
        fulfilled: (state3, action2) => {
          state3.currentTable = action2.payload;
          state3.isInitialized = true;
        },
        rejected: (state3, action2) => {
          state3.error = action2.payload || action2.error.message || "\u65B0\u589E\u9009\u9879\u65F6\u53D1\u751F\u672A\u77E5\u9519\u8BEF";
        }
      }
    ),
    /* --------------------------------------
     * 4.3 重命名表：renameTable（仅修改显示名称）
     * ------------------------------------*/
    renameTable: create.asyncThunk(
      async (args, { dispatch, getState, rejectWithValue }) => {
        const { tenantId, tableId, newName } = args;
        const trimmedName = newName.trim();
        if (!trimmedName) {
          return rejectWithValue("\u8868\u540D\u4E0D\u80FD\u4E3A\u7A7A");
        }
        const state3 = getState().table;
        const meta = state3.currentTable;
        if (!meta || meta.tenantId !== tenantId || meta.tableId !== tableId) {
          return rejectWithValue("\u5F53\u524D\u6CA1\u6709\u52A0\u8F7D\u5BF9\u5E94\u7684\u8868\u5B9A\u4E49");
        }
        const nowIso = formatISO(/* @__PURE__ */ new Date());
        try {
          await dispatch(
            patch({
              dbKey: meta.dbKey,
              changes: {
                displayName: trimmedName,
                updatedAt: nowIso
              }
            })
          ).unwrap();
          const nextMeta = {
            ...meta,
            displayName: trimmedName,
            updatedAt: nowIso
          };
          return nextMeta;
        } catch (e2) {
          return rejectWithValue(e2.message || "\u91CD\u547D\u540D\u8868\u5931\u8D25");
        }
      },
      {
        pending: (state3) => {
          state3.error = null;
        },
        fulfilled: (state3, action2) => {
          state3.currentTable = action2.payload;
        },
        rejected: (state3, action2) => {
          state3.error = action2.payload || action2.error.message || "\u91CD\u547D\u540D\u8868\u65F6\u53D1\u751F\u672A\u77E5\u9519\u8BEF";
        }
      }
    ),
    updateTableIcon: create.asyncThunk(
      async (args, { dispatch, getState, rejectWithValue }) => {
        const { tenantId, tableId, icon } = args;
        const state3 = getState().table;
        const meta = state3.currentTable;
        if (!meta || meta.tenantId !== tenantId || meta.tableId !== tableId) {
          return rejectWithValue("\u5F53\u524D\u6CA1\u6709\u52A0\u8F7D\u5BF9\u5E94\u7684\u8868\u5B9A\u4E49");
        }
        const nowIso = formatISO(/* @__PURE__ */ new Date());
        try {
          await dispatch(
            patch({
              dbKey: meta.dbKey,
              changes: {
                icon: icon ?? null,
                updatedAt: nowIso
              }
            })
          ).unwrap();
          const nextMeta = {
            ...meta,
            icon: icon ?? null,
            updatedAt: nowIso
          };
          return nextMeta;
        } catch (e2) {
          return rejectWithValue(e2.message || "\u66F4\u65B0\u8868\u683C\u56FE\u6807\u5931\u8D25");
        }
      },
      {
        pending: (state3) => {
          state3.error = null;
        },
        fulfilled: (state3, action2) => {
          state3.currentTable = action2.payload;
        },
        rejected: (state3, action2) => {
          state3.error = action2.payload || action2.error.message || "\u66F4\u65B0\u8868\u683C\u56FE\u6807\u65F6\u53D1\u751F\u672A\u77E5\u9519\u8BEF";
        }
      }
    ),
    /* --------------------------------------
     * 4.4 更新单元格：updateCell
     * ------------------------------------*/
    updateCell: create.asyncThunk(
      async (args, { dispatch, rejectWithValue }) => {
        const { dbKey, columnName, value } = args;
        try {
          const nowIso = formatISO(/* @__PURE__ */ new Date());
          await dispatch(
            patch({
              dbKey,
              changes: {
                [columnName]: value,
                updatedAt: nowIso
              }
            })
          ).unwrap();
          return { dbKey, columnName, value, updatedAt: nowIso };
        } catch (e2) {
          return rejectWithValue(e2.message || "\u66F4\u65B0\u5355\u5143\u683C\u5931\u8D25");
        }
      },
      {
        pending: (state3) => {
          state3.error = null;
        },
        fulfilled: (state3, action2) => {
          const { dbKey, columnName, value, updatedAt } = action2.payload;
          const row = state3.rows.find((r) => r.dbKey === dbKey);
          if (row) {
            row[columnName] = value;
            row.updatedAt = updatedAt;
          }
        },
        rejected: (state3, action2) => {
          state3.error = action2.payload || action2.error.message || "\u66F4\u65B0\u5355\u5143\u683C\u65F6\u53D1\u751F\u672A\u77E5\u9519\u8BEF";
        }
      }
    ),
    /* --------------------------------------
     * 5. 重置当前表状态
     * ------------------------------------*/
    setTableFocusContext: create.reducer(
      (state3, action2) => {
        state3.focusContext = action2.payload;
      }
    ),
    resetTable: create.reducer((state3) => {
      Object.assign(state3, initialState5);
    })
  }),
  selectors: {
    selectCurrentTable: (s3) => s3.currentTable,
    selectTableIsLoading: (s3) => s3.isLoading,
    selectTableIsInitialized: (s3) => s3.isInitialized,
    selectTableError: (s3) => s3.error,
    selectTableColumns: (s3) => s3.currentTable ? s3.currentTable.columns : [],
    selectTableRows: (s3) => s3.rows,
    selectTableFocusContext: (s3) => s3.focusContext
  }
});
var makeSelectRowsByTable = (tenantId, tableId) => createSelector(
  (state3) => selectAll(state3),
  (entities) => entities.filter((e2) => e2.tableId === tableId && e2.tenantId === tenantId)
);
var {
  createTable,
  initTable,
  addRow,
  deleteRow,
  deleteTable,
  addColumn,
  deleteColumn,
  renameColumn,
  renameColumnLabel,
  renameTable,
  updateTableIcon,
  resetTable,
  loadTableRows,
  updateCell,
  reorderColumn,
  updateColumnWidth,
  addColumnOption,
  setTableFocusContext
} = tableSlice.actions;
var {
  selectCurrentTable,
  selectTableIsLoading,
  selectTableIsInitialized,
  selectTableError,
  selectTableColumns,
  selectTableRows,
  selectTableFocusContext
} = tableSlice.selectors;
var tableSlice_default = tableSlice.reducer;

// packages/create/space/content/deleteContentFromSpaceAction.ts
var nextSpaceUpdatedAt = (value) => {
  const previousTimestamp = typeof value === "number" ? value : typeof value === "string" ? Date.parse(value) || 0 : 0;
  const nextTimestamp = Math.max(Date.now(), previousTimestamp + 1);
  return typeof value === "string" ? new Date(nextTimestamp).toISOString() : nextTimestamp;
};
var findContentReference = (spaceData, requestedContentKey) => {
  const contents = spaceData.contents ?? {};
  const directMatch = contents[requestedContentKey];
  if (directMatch) {
    return { entryKey: requestedContentKey, contentInfo: directMatch };
  }
  for (const [entryKey, item] of Object.entries(contents)) {
    if (!item) continue;
    if (item.contentKey === requestedContentKey) {
      return { entryKey, contentInfo: item };
    }
  }
  return null;
};
var ENTITY_DELETE_STRATEGIES = {
  dialog: async (key, { dispatch }) => {
    await dispatch(deleteDialog(key)).unwrap();
  },
  page: async (key, { dispatch, userId, sourceServerOrigin }) => {
    const isOwnerByKey = extractUserId(key) === userId;
    if (isOwnerByKey || isSystemAdmin(userId)) {
      await dispatch(remove({ dbKey: key, preferredServerOrigin: sourceServerOrigin }));
    }
  },
  table: async (key, { dispatch }) => {
    await dispatch(deleteTable({ dbKey: key })).unwrap();
  },
  file: async (key, { thunkAPI }) => {
    const { deleteFileAction } = await import("/public/assets/chunks/deleteFile-QTZBBIAL.js");
    await deleteFileAction(key, thunkAPI);
  },
  image: async (key, { thunkAPI }) => {
    const { deleteFileAction } = await import("/public/assets/chunks/deleteFile-QTZBBIAL.js");
    await deleteFileAction(key, thunkAPI);
  },
  agent: async (key, { dispatch, userId, sourceServerOrigin }) => {
    const parts = splitKey(key);
    const isPublic = parts[1] === "pub";
    const isOwnerByKey = parts[1] === userId;
    if (!isPublic) {
      if (isOwnerByKey || isSystemAdmin(userId)) {
        await dispatch(remove({ dbKey: key, preferredServerOrigin: sourceServerOrigin }));
      }
    } else {
      const agentData = await dispatch(read({
        dbKey: key,
        preferredServerOrigin: sourceServerOrigin
      })).unwrap();
      if (agentData) {
        const isCreator = agentData.userId === userId;
        const isAdmin = isSystemAdmin(userId);
        if (isCreator || isAdmin) {
          await dispatch(remove({ dbKey: key, preferredServerOrigin: sourceServerOrigin }));
        }
      }
    }
  }
};
var deleteContentFromSpaceAction = async (input, thunkAPI) => {
  const { contentKey, sourceServerOrigin } = input;
  const spaceId = normalizeSpaceId(input.spaceId);
  const { dispatch, getState } = thunkAPI;
  const accountUserId = selectIdentityUserId(getState());
  const spaceKey = createSpaceKey.space(spaceId);
  const spaceData = await dispatch(read({
    dbKey: spaceKey,
    preferredServerOrigin: sourceServerOrigin
  })).unwrap();
  if (!spaceData) throw new Error("\u7A7A\u95F4\u4E0D\u5B58\u5728");
  checkSpaceMembership(spaceData, accountUserId);
  const contentReference = findContentReference(spaceData, contentKey);
  if (!contentReference) {
    return { contentKey, spaceId, updatedSpaceData: spaceData };
  }
  const { entryKey, contentInfo } = contentReference;
  const entityKey = String(contentInfo.contentKey || contentKey || entryKey);
  const contentDeletes = {
    [entryKey]: null
  };
  if (entityKey !== entryKey) {
    contentDeletes[entityKey] = null;
  }
  const updatedSpaceData = await dispatch(
    patch({
      dbKey: spaceKey,
      preferredServerOrigin: sourceServerOrigin,
      changes: {
        contents: contentDeletes,
        updatedAt: nextSpaceUpdatedAt(spaceData.updatedAt),
        ...localSpaceAuthorityPatchStamp(spaceData)
      }
    })
  ).unwrap();
  const userId = isDeviceLocalSpaceBody(spaceData) ? DEVICE_LOCAL_OWNER_ID : String(accountUserId ?? "");
  let entityRemoveError = null;
  const contentType = String(contentInfo.type || "").toLowerCase();
  try {
    const strategy = ENTITY_DELETE_STRATEGIES[contentType];
    if (strategy) {
      await strategy(entityKey, { dispatch, userId, thunkAPI, sourceServerOrigin });
    } else if (isPageKey(entityKey)) {
      await ENTITY_DELETE_STRATEGIES.page(entityKey, {
        dispatch,
        userId,
        thunkAPI,
        sourceServerOrigin
      });
    } else if (isAgentKey(entityKey)) {
      await ENTITY_DELETE_STRATEGIES.agent(entityKey, {
        dispatch,
        userId,
        thunkAPI,
        sourceServerOrigin
      });
    }
  } catch (err2) {
    console.error(`[deleteContent] Failed to delete entity ${entityKey}:`, err2);
    entityRemoveError = err2.message || "Unknown error";
  }
  return {
    contentKey,
    spaceId,
    updatedSpaceData,
    entityRemoveError
  };
};

// packages/create/space/content/moveContentAction.ts
var logger4 = createClientLogger("move-content");
var moveContentAction = async (input, thunkAPI) => {
  const {
    contentKey,
    sourceSpaceId,
    targetSpaceId,
    targetCategoryId: rawTargetCategoryId
  } = input;
  const { dispatch, getState } = thunkAPI;
  const state3 = getState();
  const userId = selectIdentityUserId(state3);
  const now = Date.now();
  logger4.info({ ...input, userId }, "Initiating moveContentAction");
  if (sourceSpaceId === targetSpaceId) {
    logger4.error("Source and target space IDs are the same.");
    throw new Error(
      "\u6E90\u7A7A\u95F4\u548C\u76EE\u6807\u7A7A\u95F4\u4E0D\u80FD\u76F8\u540C\u3002\u5982\u9700\u4FEE\u6539\u5206\u7C7B\uFF0C\u8BF7\u4F7F\u7528\u66F4\u65B0\u5206\u7C7B\u64CD\u4F5C\u3002"
    );
  }
  if (!contentKey || typeof contentKey !== "string" || contentKey.trim() === "") {
    logger4.error("Invalid contentKey provided.");
    throw new Error("\u65E0\u6548\u7684\u5185\u5BB9 Key\u3002");
  }
  let sourceSpaceData = null;
  let targetSpaceData = null;
  let contentDataFromSource = null;
  let finalSourceData = null;
  let finalTargetData = null;
  let overallError = void 0;
  try {
    const sourceSpaceKey = createSpaceKey.space(sourceSpaceId);
    const targetSpaceKey = createSpaceKey.space(targetSpaceId);
    logger4.info(
      { sourceSpaceKey, targetSpaceKey },
      "Reading source and target space data."
    );
    const [sourceResult, targetResult] = await Promise.allSettled([
      dispatch(read({
        dbKey: sourceSpaceKey
      })).unwrap(),
      dispatch(read({
        dbKey: targetSpaceKey
      })).unwrap()
    ]);
    if (sourceResult.status === "rejected" || !sourceResult.value) {
      const reason = sourceResult.status === "rejected" ? sourceResult.reason : "Data is null";
      throw new Error(
        `\u65E0\u6CD5\u52A0\u8F7D\u6E90\u7A7A\u95F4 (${sourceSpaceId}): ${reason?.message || reason}`
      );
    }
    sourceSpaceData = sourceResult.value;
    if (targetResult.status === "rejected" || !targetResult.value) {
      const reason = targetResult.status === "rejected" ? targetResult.reason : "Data is null";
      throw new Error(
        `\u65E0\u6CD5\u52A0\u8F7D\u76EE\u6807\u7A7A\u95F4 (${targetSpaceId}): ${reason?.message || reason}`
      );
    }
    targetSpaceData = targetResult.value;
    logger4.info("Checking permissions for source and target spaces.");
    checkSpaceMembership(sourceSpaceData, userId);
    checkSpaceMembership(targetSpaceData, userId);
    if (!sourceSpaceData.contents || !sourceSpaceData.contents[contentKey]) {
      logger4.error(
        { contentKey, sourceSpaceId },
        "Content key not found in source space contents."
      );
      throw new Error(
        `\u5185\u5BB9 (${contentKey}) \u4E0D\u5728\u6E90\u7A7A\u95F4 (${sourceSpaceId}) \u4E2D\u3002`
      );
    }
    contentDataFromSource = sourceSpaceData.contents[contentKey];
    if (targetSpaceData.contents && targetSpaceData.contents[contentKey]) {
      logger4.warn(
        { contentKey, targetSpaceId },
        "Content key already exists in target space. Overwriting."
      );
    }
    let categoryIdForTargetStorage;
    if (rawTargetCategoryId && rawTargetCategoryId !== "" && rawTargetCategoryId !== UNCATEGORIZED_ID) {
      if (targetSpaceData.categories?.[rawTargetCategoryId]) {
        categoryIdForTargetStorage = rawTargetCategoryId;
      } else {
        logger4.warn(
          `Target category ${rawTargetCategoryId} not found in target space ${targetSpaceId}. Content will be uncategorized.`
        );
        categoryIdForTargetStorage = void 0;
      }
    } else {
      categoryIdForTargetStorage = void 0;
    }
    const contentReferenceForTarget = {
      ...contentDataFromSource,
      updatedAt: now
    };
    delete contentReferenceForTarget.categoryId;
    if (categoryIdForTargetStorage !== void 0) {
      contentReferenceForTarget.categoryId = categoryIdForTargetStorage;
    }
    const sourcePatchChanges = {
      contents: {
        [contentKey]: null
        // 从源移除引用 (null value in patch typically means delete key)
      },
      updatedAt: now,
      ...localSpaceAuthorityPatchStamp(sourceSpaceData)
    };
    const targetPatchChanges = {
      contents: {
        [contentKey]: contentReferenceForTarget
        // 向目标添加（或覆盖）引用
      },
      updatedAt: now,
      ...localSpaceAuthorityPatchStamp(targetSpaceData)
    };
    logger4.info("Patching source and target space data.");
    await Promise.all([
      dispatch(
        patch({ dbKey: sourceSpaceKey, changes: sourcePatchChanges })
      ).unwrap(),
      dispatch(
        patch({ dbKey: targetSpaceKey, changes: targetPatchChanges })
      ).unwrap()
    ]);
    logger4.info("Successfully patched both source and target spaces.");
  } catch (error) {
    logger4.error(
      { error: error.message, stack: error.stack },
      "Error during move content action execution."
    );
    overallError = error.message || "\u79FB\u52A8\u5185\u5BB9\u65F6\u53D1\u751F\u672A\u77E5\u9519\u8BEF";
  } finally {
    logger4.info("Attempting to re-read final space data.");
    const sourceSpaceKey = createSpaceKey.space(sourceSpaceId);
    const targetSpaceKey = createSpaceKey.space(targetSpaceId);
    const [finalSourceResult, finalTargetResult] = await Promise.allSettled([
      dispatch(read({
        dbKey: sourceSpaceKey
      })).unwrap(),
      dispatch(read({
        dbKey: targetSpaceKey
      })).unwrap()
    ]);
    if (finalSourceResult.status === "fulfilled") {
      finalSourceData = finalSourceResult.value;
    } else {
      logger4.error(
        { sourceSpaceId, reason: finalSourceResult.reason },
        "Failed to re-read final source space data."
      );
    }
    if (finalTargetResult.status === "fulfilled") {
      finalTargetData = finalTargetResult.value;
    } else {
      logger4.error(
        { targetSpaceId, reason: finalTargetResult.reason },
        "Failed to re-read final target space data."
      );
    }
    logger4.info(
      {
        hasError: !!overallError,
        sourceReadSuccess: !!finalSourceData,
        targetReadSuccess: !!finalTargetData
      },
      "Move content action finished."
    );
    const result = {
      sourceSpaceId,
      updatedSourceSpaceData: finalSourceData,
      targetSpaceId,
      updatedTargetSpaceData: finalTargetData,
      error: overallError
      // 如果过程中有错误，则传递错误信息
    };
    return result;
  }
};

// packages/create/space/content/spaceContentPatch.ts
var notifyUserDataUpdated = () => {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" && typeof window.Event === "function") {
    window.dispatchEvent(new window.Event("nolo-user-data-updated"));
  }
};
var loadSpaceContentOrThrow = async (dispatch, spaceId, contentKey, sourceServerOrigin) => {
  if (!contentKey || typeof contentKey !== "string" || contentKey.trim() === "") {
    throw new Error("Invalid contentKey provided.");
  }
  const spaceKey = createSpaceKey.space(spaceId);
  let spaceData = null;
  try {
    spaceData = await dispatch(
      read({ dbKey: spaceKey, preferredServerOrigin: sourceServerOrigin })
    ).unwrap();
  } catch (readError) {
    throw new Error(`\u65E0\u6CD5\u52A0\u8F7D\u7A7A\u95F4\u6570\u636E: ${spaceId}`);
  }
  if (!spaceData) {
    throw new Error("Space not found");
  }
  const content = spaceData.contents?.[contentKey];
  if (!content) {
    throw new Error("Content not found in space");
  }
  return { spaceKey, spaceData, content };
};
var patchIndividualContentRecord = async (dispatch, contentKey, changes, sourceServerOrigin, failMessagePrefix) => {
  let hasIndividualRecord = false;
  try {
    const existing = await dispatch(
      read({ dbKey: contentKey, preferredServerOrigin: sourceServerOrigin })
    ).unwrap();
    hasIndividualRecord = Boolean(existing);
  } catch {
    hasIndividualRecord = false;
  }
  if (hasIndividualRecord) {
    try {
      await dispatch(
        patch({
          dbKey: contentKey,
          changes,
          preferredServerOrigin: sourceServerOrigin
        })
      ).unwrap();
      notifyUserDataUpdated();
    } catch (contentPatchError) {
      throw new Error(
        `${failMessagePrefix}: ${contentPatchError?.message || "\u672A\u77E5\u9519\u8BEF"}`
      );
    }
  }
};

// packages/create/space/content/updateContentTitleAction.ts
var buildContentRecordTitleChanges = (content, title, updatedAt) => {
  const changes = { title, updatedAt };
  if (content.type === "app") {
    changes.name = title;
  }
  return changes;
};
var updateContentTitleAction = async (input, thunkAPI) => {
  const { spaceId, contentKey, title, skillSummary, sourceServerOrigin } = input;
  const { dispatch } = thunkAPI;
  if (title === void 0 || title === null || typeof title !== "string") {
    throw new Error("Invalid title provided.");
  }
  if (title.trim() === "") {
    throw new Error("Title cannot be empty.");
  }
  const { spaceKey, spaceData, content } = await loadSpaceContentOrThrow(
    dispatch,
    spaceId,
    contentKey,
    sourceServerOrigin
  );
  const trimmedTitle = title.trim();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const changes = {
    contents: {
      [contentKey]: {
        ...spaceData.contents[contentKey],
        title: trimmedTitle,
        updatedAt: now,
        ...skillSummary !== void 0 ? { skillSummary } : {}
      }
    },
    updatedAt: now
  };
  let updatedSpaceData;
  try {
    updatedSpaceData = await dispatch(
      patch({
        dbKey: spaceKey,
        changes,
        preferredServerOrigin: sourceServerOrigin
      })
    ).unwrap();
  } catch (patchError) {
    throw new Error(`\u66F4\u65B0\u5185\u5BB9\u6807\u9898\u5931\u8D25: ${patchError.message || "\u672A\u77E5\u9519\u8BEF"}`);
  }
  await patchIndividualContentRecord(
    dispatch,
    contentKey,
    buildContentRecordTitleChanges(content, trimmedTitle, now),
    sourceServerOrigin,
    "\u6807\u9898\u5DF2\u5199\u5165\u7A7A\u95F4\uFF0C\u4F46\u540C\u6B65\u72EC\u7ACB\u8BB0\u5F55\u5931\u8D25"
  );
  if (contentKey.startsWith("meta-")) {
    const parts = contentKey.split(SEPARATOR2);
    if (parts.length >= 3) {
      const tableId = parts.slice(2).join(SEPARATOR2);
      const tenantId = parts[1];
      try {
        await dispatch(
          renameTable({
            tenantId,
            tableId,
            newName: trimmedTitle
          })
        ).unwrap();
      } catch (tableError) {
        console.error("Failed to sync title to TableMeta:", tableError);
      }
    }
  }
  return { spaceId, updatedSpaceData };
};

// packages/create/space/content/updateContentPinnedAction.ts
var updateContentPinnedAction = async (input, thunkAPI) => {
  const { spaceId, contentKey, pinned, sourceServerOrigin } = input;
  const { dispatch } = thunkAPI;
  if (typeof pinned !== "boolean") {
    throw new Error("Invalid pinned value provided.");
  }
  if (!spaceId) {
    if (!contentKey || typeof contentKey !== "string" || contentKey.trim() === "") {
      throw new Error("Invalid contentKey provided.");
    }
    await patchIndividualContentRecord(
      dispatch,
      contentKey,
      { pinned },
      sourceServerOrigin,
      "\u66F4\u65B0\u7F6E\u9876\u72B6\u6001\u5931\u8D25"
    );
    return { spaceId: null, updatedSpaceData: null };
  }
  const { spaceKey, spaceData } = await loadSpaceContentOrThrow(
    dispatch,
    spaceId,
    contentKey,
    sourceServerOrigin
  );
  const changes = {
    contents: {
      [contentKey]: { ...spaceData.contents[contentKey], pinned }
    },
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  let updatedSpaceData;
  try {
    updatedSpaceData = await dispatch(
      patch({ dbKey: spaceKey, changes, preferredServerOrigin: sourceServerOrigin })
    ).unwrap();
  } catch (patchError) {
    throw new Error(`\u66F4\u65B0\u5185\u5BB9\u7F6E\u9876\u72B6\u6001\u5931\u8D25: ${patchError.message || "\u672A\u77E5\u9519\u8BEF"}`);
  }
  await patchIndividualContentRecord(
    dispatch,
    contentKey,
    { pinned },
    sourceServerOrigin,
    "\u7F6E\u9876\u72B6\u6001\u5DF2\u5199\u5165\u7A7A\u95F4\uFF0C\u4F46\u540C\u6B65\u72EC\u7ACB\u8BB0\u5F55\u5931\u8D25"
  );
  return { spaceId, updatedSpaceData };
};

// packages/create/space/content/updateContentCategoryAction.ts
var updateContentCategoryAction = async (input, thunkAPI) => {
  const { spaceId, contentKey, categoryId: targetContainerId } = input;
  const { dispatch, getState } = thunkAPI;
  const state3 = getState();
  const userId = selectIdentityUserId(state3);
  if (!userId) {
    throw new Error("User is not logged in.");
  }
  if (!contentKey || typeof contentKey !== "string" || contentKey.trim() === "") {
    throw new Error("Invalid contentKey provided.");
  }
  if (typeof targetContainerId !== "string") {
    throw new Error("Invalid target container ID provided (must be a string).");
  }
  const spaceKey = createSpaceKey.space(spaceId);
  let spaceData = null;
  try {
    spaceData = await dispatch(read({
      dbKey: spaceKey
    })).unwrap();
  } catch (readError) {
    console.error(
      `[updateContentCategoryAction] Failed to read space data for key ${spaceKey}:`,
      readError
    );
    throw new Error(
      `\u65E0\u6CD5\u52A0\u8F7D\u7A7A\u95F4\u6570\u636E: ${spaceId}, \u539F\u56E0: ${readError.message || "\u672A\u77E5\u9519\u8BEF"}`
    );
  }
  if (!spaceData) {
    throw new Error(`\u7A7A\u95F4\u4E0D\u5B58\u5728: ${spaceId}`);
  }
  try {
    checkSpaceMembership(spaceData, userId);
  } catch (permissionError) {
    throw new Error(`\u6743\u9650\u4E0D\u8DB3\uFF0C\u65E0\u6CD5\u4FEE\u6539\u5185\u5BB9\u5206\u7C7B: ${permissionError.message}`);
  }
  const currentContent = spaceData.contents?.[contentKey];
  if (!currentContent) {
    console.warn(
      `[updateContentCategoryAction] Content ${contentKey} not found in space ${spaceId}.`
    );
    throw new Error("Content not found");
  }
  if (targetContainerId !== UNCATEGORIZED_ID) {
    if (!spaceData.categories[targetContainerId]) {
      console.warn(
        `[updateContentCategoryAction] Target category ${targetContainerId} not found or invalid in space ${spaceId}. Cannot move content.`
      );
      throw new Error("Target category not found or is invalid");
    }
  }
  const now = Date.now();
  const categoryIdValueForPatch = targetContainerId === UNCATEGORIZED_ID ? null : targetContainerId;
  const currentCategoryId = currentContent.categoryId;
  let needsUpdate = true;
  if (categoryIdValueForPatch === null && currentCategoryId === void 0) {
    needsUpdate = false;
  } else if (categoryIdValueForPatch === currentCategoryId) {
    needsUpdate = false;
  }
  let changes = null;
  if (needsUpdate) {
    changes = {
      contents: {
        // 使用动态键更新指定的 contentKey
        [contentKey]: {
          // --- 修改: 使用计算出的 categoryIdValueForPatch ---
          categoryId: categoryIdValueForPatch,
          // null 或 目标分类 ID
          updatedAt: now
          // 更新内容的 updatedAt
        }
      },
      updatedAt: now
      // 更新顶层的 updatedAt
    };
  } else {
    console.log(
      `[updateContentCategoryAction] No category change needed for ${contentKey}. Skipping patch.`
    );
    return { spaceId, updatedSpaceData: spaceData };
  }
  let updatedSpaceData;
  try {
    updatedSpaceData = await dispatch(
      patch({ dbKey: spaceKey, changes })
      // 使用非空断言，因为已检查
    ).unwrap();
  } catch (patchError) {
    console.error(
      `[updateContentCategoryAction] Failed to patch space data for key ${spaceKey}:`,
      patchError
    );
    throw new Error(`\u66F4\u65B0\u5185\u5BB9\u5206\u7C7B\u5931\u8D25: ${patchError.message || "\u672A\u77E5\u9519\u8BEF"}`);
  }
  return { spaceId, updatedSpaceData };
};

// packages/create/space/content/deleteMultipleContentAction.ts
var logger5 = createClientLogger("delete-multiple-content");
var deleteMultipleContentAction = async (input, thunkAPI) => {
  const { contentKeys, spaceId } = input;
  if (!contentKeys || contentKeys.length === 0) {
    logger5.warn("deleteMultipleContentAction called with no contentKeys.");
    return { spaceId, updatedSpaceData: null };
  }
  const { dispatch, getState } = thunkAPI;
  const state3 = getState();
  const userId = selectIdentityUserId(state3);
  logger5.info(
    { count: contentKeys.length, spaceId, userId },
    "Initiating deleteMultipleContentAction"
  );
  const spaceKey = createSpaceKey.space(spaceId);
  const spaceData = await dispatch(
    read({
      dbKey: spaceKey
    })
  ).unwrap();
  if (!spaceData) {
    logger5.error({ spaceKey }, "Space data not found for batch delete");
    throw new Error("\u7A7A\u95F4\u4E0D\u5B58\u5728");
  }
  if (!userId || !spaceData.members.includes(userId)) {
    logger5.warn({ userId, spaceId }, "Unauthorized attempt for batch delete");
    throw new Error("\u65E0\u6743\u4FEE\u6539\u6B64\u7A7A\u95F4");
  }
  const changes = {
    contents: contentKeys.reduce(
      (acc, key) => {
        acc[key] = null;
        return acc;
      },
      {}
    )
  };
  try {
    await dispatch(patch({ dbKey: spaceKey, changes })).unwrap();
    logger5.info(
      { spaceKey, count: contentKeys.length },
      "Successfully batched patch to remove content references"
    );
  } catch (patchError) {
    logger5.error(
      { error: patchError, spaceKey },
      "Failed to batch patch space data. Aborting."
    );
    throw new Error(`\u66F4\u65B0\u7A7A\u95F4\u5F15\u7528\u5931\u8D25: ${patchError.message}`);
  }
  const removePromises = contentKeys.map(
    (key) => dispatch(remove(key)).unwrap()
  );
  const results = await Promise.allSettled(removePromises);
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      logger5.info({ contentKey: contentKeys[index] }, "Entity removed");
    } else {
      logger5.error(
        { contentKey: contentKeys[index], error: result.reason },
        "Failed to remove an entity"
      );
    }
  });
  const finalSpaceData = await dispatch(
    read({
      dbKey: spaceKey
    })
  ).unwrap();
  logger5.info({ spaceId }, "Finished batch delete and refetched space data.");
  return {
    spaceId,
    updatedSpaceData: finalSpaceData
  };
};

// packages/create/space/content/uploadAndAddFileToSpaceAction.ts
var uploadAndAddFileToSpaceAction = async (payload, thunkAPI) => {
  const { spaceId, file, categoryId } = payload;
  const { dispatch, getState } = thunkAPI;
  const state3 = getState();
  const userId = selectIdentityUserId(state3);
  if (!userId) {
    console.warn("[uploadAndAddFileToSpace] Warning: No userId found in state. Uploading as anonymous/unknown might cause issues.");
  }
  try {
    const id = ulid2();
    const dbKey = fileKey.single(userId || "unknown", id);
    const contentType = "file" /* FILE */;
    const fileCategory = resolveFileCategory({
      mimeType: file.type,
      fileName: file.name
    });
    const fileMetadata = await uploadFileAction(
      { file, customKey: dbKey, userId },
      thunkAPI
    );
    if (!fileMetadata) {
      throw new Error("Upload failed, no metadata returned");
    }
    const contentKey = fileMetadata.dbKey || dbKey;
    const title = file.name;
    const result = await addContentAction({
      spaceId,
      contentKey,
      title,
      type: contentType,
      fileCategory,
      mimeType: file.type || void 0,
      fileSize: asOptionalFiniteNumber(file.size),
      originalName: file.name,
      categoryId
    }, thunkAPI);
    await dispatch(
      patch({
        dbKey: contentKey,
        changes: {
          title,
          spaceId,
          fileCategory,
          mimeType: file.type || void 0,
          fileSize: asOptionalFiniteNumber(file.size),
          originalName: file.name
        }
      })
    ).unwrap();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("nolo-user-data-updated"));
    }
    return { ...result, contentKey, fileId: fileMetadata.id };
  } catch (error) {
    console.error("Upload and add file error:", error);
    throw error;
  }
};

// packages/create/space/content/contentThunks.ts
var createContentThunks = (create) => ({
  /**
   * Add content into a space. When the content lands in a real category,
   * force-expand that category (Redux + localStorage) so "create page"
   * never leaves the new item trapped inside a default-collapsed section.
   */
  addContentToSpace: create.asyncThunk(
    async (input, thunkAPI) => {
      const result = await addContentAction(input, thunkAPI);
      const rawCategoryId = asTrimmedString(input.categoryId);
      const expandCategoryId = rawCategoryId && rawCategoryId !== UNCATEGORIZED_ID ? rawCategoryId : null;
      if (expandCategoryId) {
        const rootState = thunkAPI.getState();
        const collapsedCategories = {
          ...rootState.space.collapsedCategories,
          [expandCategoryId]: false
        };
        if (typeof window !== "undefined") {
          writeStoredCollapsedCategories(
            result.spaceId,
            collapsedCategories,
            window.localStorage
          );
        }
        return { ...result, expandCategoryId, collapsedCategories };
      }
      return { ...result, expandCategoryId: null };
    },
    {
      fulfilled: (state3, action2) => {
        const { spaceId, updatedSpaceData, expandCategoryId, collapsedCategories } = action2.payload;
        const normalizedSpaceId = normalizeSpaceId(spaceId);
        const normalizedCurrentSpaceId = state3.currentSpaceId ? normalizeSpaceId(state3.currentSpaceId) : null;
        if (normalizedCurrentSpaceId === normalizedSpaceId) {
          state3.currentSpace = updatedSpaceData;
          if (collapsedCategories) {
            state3.collapsedCategories = {
              ...state3.collapsedCategories,
              ...collapsedCategories
            };
          } else if (expandCategoryId) {
            state3.collapsedCategories[expandCategoryId] = false;
          }
        }
      }
    }
  ),
  moveContentToSpace: create.asyncThunk(moveContentAction, {
    fulfilled: (state3, action2) => {
      const {
        sourceSpaceId,
        updatedSourceSpaceData,
        targetSpaceId,
        updatedTargetSpaceData
      } = action2.payload;
      if (state3.currentSpaceId === sourceSpaceId && updatedSourceSpaceData) {
        state3.currentSpace = updatedSourceSpaceData;
      }
      if (state3.currentSpaceId === targetSpaceId && updatedTargetSpaceData) {
        state3.currentSpace = updatedTargetSpaceData;
      }
    }
  }),
  deleteContentFromSpace: create.asyncThunk(deleteContentFromSpaceAction, {
    fulfilled: (state3, action2) => {
      const { spaceId, updatedSpaceData } = action2.payload;
      const normalizedSpaceId = normalizeSpaceId(spaceId);
      const normalizedCurrentSpaceId = state3.currentSpaceId ? normalizeSpaceId(state3.currentSpaceId) : null;
      if (normalizedCurrentSpaceId === normalizedSpaceId) {
        state3.currentSpace = updatedSpaceData;
      }
    }
  }),
  // --- 新增: 批量删除内容的 Thunk ---
  deleteMultipleContent: create.asyncThunk(deleteMultipleContentAction, {
    fulfilled: (state3, action2) => {
      const normalizedSpaceId = normalizeSpaceId(action2.payload.spaceId);
      const normalizedCurrentSpaceId = state3.currentSpaceId ? normalizeSpaceId(state3.currentSpaceId) : null;
      if (normalizedCurrentSpaceId === normalizedSpaceId) {
        state3.currentSpace = action2.payload.updatedSpaceData;
      }
    }
  }),
  uploadAndAddFileToSpace: create.asyncThunk(uploadAndAddFileToSpaceAction, {
    fulfilled: (state3, action2) => {
      if (state3.currentSpaceId === action2.payload.spaceId) {
        state3.currentSpace = action2.payload.updatedSpaceData;
      }
    }
  }),
  // --- 结束新增 ---
  updateContentTitle: create.asyncThunk(updateContentTitleAction, {
    fulfilled: (state3, action2) => {
      if (state3.currentSpaceId === action2.payload.spaceId) {
        state3.currentSpace = action2.payload.updatedSpaceData;
      }
    },
    rejected: (_state, action2) => {
      const message = action2.error.message || "\u6807\u9898\u4FDD\u5B58\u5931\u8D25";
      if (message.includes("\u65E0\u6CD5\u52A0\u8F7D\u7A7A\u95F4\u6570\u636E")) return;
      toast.error(message);
    }
  }),
  updateContentPinned: create.asyncThunk(updateContentPinnedAction, {
    fulfilled: (state3, action2) => {
      if (action2.payload.updatedSpaceData && state3.currentSpaceId === action2.payload.spaceId) {
        state3.currentSpace = action2.payload.updatedSpaceData;
      }
    },
    rejected: (_state, action2) => {
      toast.error(action2.error.message || "\u7F6E\u9876\u72B6\u6001\u66F4\u65B0\u5931\u8D25");
    }
  }),
  updateContentCategory: create.asyncThunk(updateContentCategoryAction, {
    fulfilled: (state3, action2) => {
      if (state3.currentSpaceId === action2.payload.spaceId) {
        state3.currentSpace = action2.payload.updatedSpaceData;
      }
    }
  })
});

// packages/create/space/spaceAccess.ts
var resolveSpaceRemoteServers = (state3) => {
  const currentServer = typeof state3?.settings?.currentServer === "string" ? state3.settings.currentServer : void 0;
  const syncServers = Array.isArray(state3?.settings?.syncServers) ? state3.settings.syncServers : void 0;
  return getAllServers(currentServer, syncServers);
};
var selectSpaceRemoteAuth = (state3) => ({
  token: state3?.auth?.currentToken ?? null,
  userId: state3?.auth?.currentUser?.userId ?? null,
  servers: resolveSpaceRemoteServers(state3)
});
var spaceListsUser = (spaceData, userId) => {
  if (!spaceData || isTombstoneRecord(spaceData)) return false;
  if (spaceData.ownerId === userId) return true;
  return Array.isArray(spaceData.members) && spaceData.members.includes(userId);
};
var membershipBelongsToUser = (membership, userId) => !membership.userId || membership.userId === userId;
var fetchRemoteUserSpaceMemberships = async (server, token, userId, timeoutMs = 5e3) => {
  if (!token) return { ok: false, memberships: [] };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${server}/rpc/getUserSpaceMemberships`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userId }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      console.error(
        `Failed to fetch memberships from ${server}: ${response.statusText}`
      );
      return { ok: false, memberships: [] };
    }
    const data = await response.json();
    return {
      ok: true,
      server,
      memberships: Array.isArray(data) ? data : []
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`Error fetching memberships from ${server}:`, error);
    return { ok: false, memberships: [] };
  }
};
var fetchRemoteSpace = async (server, token, spaceId) => {
  try {
    const space = await fetchFromServer(
      server,
      createSpaceKey.space(normalizeSpaceId(spaceId)),
      token ?? void 0
    );
    return space && typeof space === "object" ? space : null;
  } catch {
    return null;
  }
};
var hasActiveRemoteMembership = async (server, token, userId, spaceId) => {
  const result = await fetchRemoteUserSpaceMemberships(server, token, userId);
  if (!result.ok) return false;
  const normalizedSpaceId = normalizeSpaceId(spaceId);
  return result.memberships.some((membership) => {
    const membershipSpaceId = typeof membership?.spaceId === "string" ? normalizeSpaceId(membership.spaceId) : "";
    return membershipSpaceId === normalizedSpaceId && membershipBelongsToUser(membership, userId) && !isTombstoneRecord(membership);
  });
};
var fetchAuthoritativeRemoteSpace = async ({
  servers,
  token,
  userId,
  spaceId
}) => {
  const normalizedSpaceId = normalizeSpaceId(spaceId);
  for (const server of servers) {
    const space = await fetchRemoteSpace(server, token, normalizedSpaceId);
    if (!space) continue;
    if (!spaceListsUser(space, userId)) {
      throw new Error(`Current user is not a member of space: ${normalizedSpaceId}`);
    }
    if (space.ownerId !== userId) {
      const hasMembership = await hasActiveRemoteMembership(
        server,
        token,
        userId,
        normalizedSpaceId
      );
      if (!hasMembership) {
        throw new Error(
          `Current user has no active membership for space: ${normalizedSpaceId}`
        );
      }
    }
    return space;
  }
  return null;
};

// packages/create/space/member/isSpaceMembershipRemoteUnavailableError.ts
var SPACE_MEMBERSHIP_REMOTE_UNAVAILABLE = "space_membership_remote_unavailable";
var isSpaceMembershipRemoteUnavailableError = (error) => {
  if (typeof error === "string") {
    return error.includes(SPACE_MEMBERSHIP_REMOTE_UNAVAILABLE);
  }
  if (error instanceof Error) {
    return error.message.includes(SPACE_MEMBERSHIP_REMOTE_UNAVAILABLE);
  }
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message.includes(
      SPACE_MEMBERSHIP_REMOTE_UNAVAILABLE
    );
  }
  return false;
};

// packages/create/space/member/fetchUserSpaceMembershipsAction.ts
var CONTENT_SPACE_RECOVERY_TYPES = [
  "app" /* APP */,
  "page" /* DOC */,
  "dialog" /* DIALOG */,
  "image" /* IMAGE */,
  "file" /* FILE */,
  "table" /* TABLE */,
  "agent" /* AGENT */
];
var readLocalSpaceData = async (db, spaceId) => {
  const normalizedSpaceId = normalizeSpaceId(spaceId);
  const spaceKey = createSpaceKey.space(normalizedSpaceId);
  try {
    return await db.get(spaceKey) ?? null;
  } catch {
    return null;
  }
};
var membershipCheckUserId = (membership, activeUserId) => isDeviceLocalSpaceMembership(membership) ? DEVICE_LOCAL_OWNER_ID : activeUserId;
var buildLocalMembershipPreview = async (userId, db, memberships) => {
  const preview = await Promise.all(
    memberships.map(async (membership) => {
      if (isTombstoneRecord(membership)) return null;
      const checkUserId = membershipCheckUserId(membership, userId);
      if (!membershipBelongsToUser(membership, checkUserId)) return null;
      const normalizedSpaceId = normalizeSpaceId(membership.spaceId);
      const localSpaceData = await readLocalSpaceData(db, normalizedSpaceId);
      if (!localSpaceData || isTombstoneRecord(localSpaceData)) return null;
      if (!spaceListsUser(localSpaceData, checkUserId)) return null;
      return {
        ...membership,
        spaceId: normalizedSpaceId
      };
    })
  );
  return preview.filter(
    (membership) => !!membership
  );
};
var fetchLocalForUser = async (userId, db) => {
  try {
    const memberships = [];
    const prefix = `space-member-${userId}`;
    let iterator = db.iterator({
      gte: prefix,
      lte: prefix + "\xFF"
    });
    if (iterator && typeof iterator.then === "function") {
      iterator = await iterator;
    }
    for await (const [_, memberData] of iterator) {
      if (memberData && typeof memberData === "object" && memberData.spaceId && !isTombstoneRecord(memberData)) {
        memberships.push(memberData);
      }
    }
    return memberships;
  } catch (error) {
    console.error("Error fetching local memberships:", error);
    return [];
  }
};
var fetchLocalUnion = async (userId, db) => {
  const deviceLocalRows = await fetchLocalForUser(DEVICE_LOCAL_OWNER_ID, db);
  const taggedLocal = deviceLocalRows.map(
    (membership) => ({
      ...membership,
      spaceId: normalizeSpaceId(membership.spaceId),
      deviceLocal: true,
      userId: membership.userId || DEVICE_LOCAL_OWNER_ID
    })
  );
  if (isDeviceLocalOwnerId(userId)) {
    return taggedLocal;
  }
  const accountRows = await fetchLocalForUser(userId, db);
  const taggedAccount = accountRows.map(
    (membership) => ({
      ...membership,
      spaceId: normalizeSpaceId(membership.spaceId),
      deviceLocal: false
    })
  );
  return [...taggedLocal, ...taggedAccount];
};
var fetchRemoteContentSpaceIds = async (server, userId, token) => {
  try {
    const queryParams = new URLSearchParams({ limit: "200" });
    const headers = {
      "Content-Type": "application/json"
    };
    const authToken = asTrimmedString(token);
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    const response = await fetch(
      `${server}${API_ENDPOINTS.DATABASE}/query/${encodeURIComponent(userId)}?${queryParams}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: [...CONTENT_SPACE_RECOVERY_TYPES],
          includeDeleted: true,
          summary: true
        })
      }
    );
    if (!response.ok) return [];
    const data = await response.json();
    const records = Array.isArray(data?.data?.data) ? data.data.data : [];
    return records.filter((record) => !isTombstoneRecord(record)).map(
      (record) => typeof record?.spaceId === "string" ? normalizeSpaceId(record.spaceId) : ""
    ).filter((spaceId) => spaceId.length > 0);
  } catch {
    return [];
  }
};
var recoverMembershipsFromContentSpaces = async ({
  servers,
  token,
  userId,
  knownSpaceIds
}) => {
  const candidateSpaceIds = /* @__PURE__ */ new Set();
  await Promise.all(
    servers.map(async (server) => {
      const spaceIds = await fetchRemoteContentSpaceIds(server, userId, token);
      spaceIds.forEach((spaceId) => {
        if (!knownSpaceIds.has(spaceId)) {
          candidateSpaceIds.add(spaceId);
        }
      });
    })
  );
  const results = await Promise.all(
    [...candidateSpaceIds].map(async (spaceId) => {
      try {
        for (const server of servers) {
          const remoteSpace = await fetchRemoteSpace(server, token, spaceId);
          if (!spaceListsUser(remoteSpace, userId)) continue;
          return {
            userId,
            spaceId,
            spaceName: typeof remoteSpace?.name === "string" && remoteSpace.name.trim() ? remoteSpace.name : spaceId,
            role: remoteSpace?.ownerId === userId ? "owner" /* OWNER */ : "member" /* MEMBER */,
            joinedAt: remoteSpace?.updatedAt ?? remoteSpace?.createdAt ?? Date.now(),
            sourceServer: server
          };
        }
      } catch {
      }
      return null;
    })
  );
  const recovered = results.filter(
    (m3) => m3 !== null
  );
  return recovered;
};
var fetchUserSpaceMembershipsAction = async (userId, thunkAPI) => {
  const state3 = thunkAPI.getState();
  const db = thunkAPI.extra.db;
  const { token, servers } = selectSpaceRemoteAuth(state3);
  const isLocalActor = isDeviceLocalOwnerId(userId);
  const localMembershipsPromise = fetchLocalUnion(userId, db);
  const remoteResultsPromise = isLocalActor ? Promise.resolve([]) : Promise.all(
    servers.map(
      (server) => fetchRemoteUserSpaceMemberships(server, token, userId)
    )
  );
  const localMemberships = await localMembershipsPromise;
  if (state3.space?.memberSpaces === null && localMemberships.length > 0) {
    const localPreview = await buildLocalMembershipPreview(
      userId,
      db,
      localMemberships
    );
    if (localPreview.length > 0) {
      thunkAPI.dispatch?.({
        type: "space/hydrateMemberSpacesFromLocal",
        payload: localPreview
      });
    }
  }
  const remoteResults = await remoteResultsPromise;
  const successfulRemoteResults = remoteResults.filter((result) => result.ok);
  const successfulRemoteMemberships = successfulRemoteResults.flatMap(
    (result) => result.memberships.map((membership) => ({
      ...membership,
      sourceServer: result.server
    }))
  );
  const hasSuccessfulRemoteFetch = successfulRemoteResults.length > 0;
  const hasRemoteAuthority = !isLocalActor && !!token && servers.length > 0;
  if (hasRemoteAuthority && !hasSuccessfulRemoteFetch) {
    throw new Error(
      `${SPACE_MEMBERSHIP_REMOTE_UNAVAILABLE}: unable to refresh memberships from ${servers.join(", ")}`
    );
  }
  const remoteSpaceIds = new Set(
    successfulRemoteMemberships.map(
      (membership) => normalizeSpaceId(membership.spaceId)
    )
  );
  const filteredLocalMemberships = hasSuccessfulRemoteFetch ? (await Promise.all(
    localMemberships.map(async (membership) => {
      const normalizedSpaceId = normalizeSpaceId(membership.spaceId);
      if (membership.deviceLocal || isDeviceLocalSpaceMembership(membership)) {
        return {
          ...membership,
          spaceId: normalizedSpaceId,
          deviceLocal: true
        };
      }
      if (remoteSpaceIds.has(normalizedSpaceId)) {
        return {
          ...membership,
          spaceId: normalizedSpaceId
        };
      }
      console.warn(
        `[SpaceMembership] Membership missing from remote index, verifying space record: user=${userId}, spaceId=${normalizedSpaceId}`
      );
      return {
        ...membership,
        spaceId: normalizedSpaceId,
        requiresRemoteSpaceVerification: true
      };
    })
  )).filter((membership) => !!membership) : localMemberships.map((membership) => ({
    ...membership,
    spaceId: normalizeSpaceId(membership.spaceId)
  }));
  const verifyActiveSpaceMembership = async (membership) => {
    if (isTombstoneRecord(membership)) return null;
    const checkUserId = membershipCheckUserId(membership, userId);
    if (!membershipBelongsToUser(membership, checkUserId)) return null;
    const normalizedSpaceId = normalizeSpaceId(membership.spaceId);
    const localSpaceData = await readLocalSpaceData(db, normalizedSpaceId);
    const isDeviceLocal = membership.deviceLocal || isDeviceLocalSpaceMembership(membership);
    if (isDeviceLocal) {
      if (!localSpaceData || isTombstoneRecord(localSpaceData)) return null;
      if (!spaceListsUser(localSpaceData, checkUserId)) {
        return null;
      }
      const {
        sourceServer: _s,
        requiresRemoteSpaceVerification: _r,
        deviceLocal: _d,
        ...visible
      } = membership;
      return {
        ...visible,
        spaceId: normalizedSpaceId,
        userId: DEVICE_LOCAL_OWNER_ID
      };
    }
    if (membership.sourceServer || membership.requiresRemoteSpaceVerification) {
      if (localSpaceData && isTombstoneRecord(localSpaceData)) return null;
      if (membership.sourceServer && !membership.requiresRemoteSpaceVerification) {
        const { sourceServer: _ss, ...verifiedMembership } = membership;
        return {
          ...verifiedMembership,
          spaceId: normalizedSpaceId
        };
      }
      try {
        const remoteSpaceServers = Array.from(
          new Set(
            [membership.sourceServer, ...servers].filter(
              (server) => typeof server === "string" && server.length > 0
            )
          )
        );
        let remoteSpace = null;
        for (const server of remoteSpaceServers) {
          remoteSpace = await fetchRemoteSpace(
            server,
            token,
            normalizedSpaceId
          );
          if (remoteSpace) break;
        }
        if (!spaceListsUser(remoteSpace, userId)) return null;
        const {
          requiresRemoteSpaceVerification,
          deviceLocal: _dl,
          ...verifiedMembership
        } = membership;
        return {
          ...verifiedMembership,
          spaceId: normalizedSpaceId
        };
      } catch {
        return null;
      }
    }
    if (localSpaceData) {
      return !spaceListsUser(localSpaceData, userId) ? null : {
        ...membership,
        spaceId: normalizedSpaceId
      };
    }
    if (!membership.sourceServer && servers.length === 0) {
      return {
        ...membership,
        spaceId: normalizedSpaceId
      };
    }
    try {
      const remoteSpace = await readAction(
        {
          dbKey: createSpaceKey.space(normalizedSpaceId),
          preferredServerOrigin: membership.sourceServer
        },
        thunkAPI
      );
      if (!spaceListsUser(remoteSpace, userId)) return null;
      return {
        ...membership,
        spaceId: normalizedSpaceId
      };
    } catch {
      return null;
    }
  };
  const activeMemberships = (await Promise.all(
    [...filteredLocalMemberships, ...successfulRemoteMemberships].map(
      verifyActiveSpaceMembership
    )
  )).filter((membership) => !!membership);
  const knownSpaceIds = new Set(
    [
      ...filteredLocalMemberships,
      ...successfulRemoteMemberships,
      ...activeMemberships
    ].map((membership) => normalizeSpaceId(membership.spaceId))
  );
  if (hasRemoteAuthority && hasSuccessfulRemoteFetch && !isLocalActor) {
    void recoverMembershipsFromContentSpaces({
      servers,
      token,
      userId,
      knownSpaceIds
    }).then((rawRecovered) => {
      const activeUserId = thunkAPI.getState()?.auth?.currentUser?.userId ?? null;
      if (activeUserId !== userId) return;
      if (rawRecovered.length === 0) return;
      const cleaned = rawRecovered.map((membership) => {
        const {
          sourceServer: _ss,
          requiresRemoteSpaceVerification: _rv,
          deviceLocal: _dl,
          ...visible
        } = membership;
        return { ...visible, spaceId: normalizeSpaceId(membership.spaceId) };
      });
      thunkAPI.dispatch?.({
        type: "space/appendRecoveredMemberships",
        payload: cleaned
      });
    }).catch(() => {
    });
  }
  const membershipMap = /* @__PURE__ */ new Map();
  const preferAccountOnCollision = (existing, next) => {
    if (!existing) return next;
    const existingLocal = isDeviceLocalSpaceMembership(existing);
    const nextLocal = isDeviceLocalSpaceMembership(next);
    if (existingLocal && !nextLocal) return next;
    if (!existingLocal && nextLocal) return existing;
    return next;
  };
  [...activeMemberships].forEach((membership) => {
    const normalizedSpaceId = normalizeSpaceId(membership.spaceId);
    const {
      sourceServer: _sourceServer,
      requiresRemoteSpaceVerification: _req,
      deviceLocal: _deviceLocal,
      ...visibleMembership
    } = membership;
    const cleaned = {
      ...visibleMembership,
      spaceId: normalizedSpaceId
    };
    const existing = membershipMap.get(normalizedSpaceId);
    membershipMap.set(
      normalizedSpaceId,
      preferAccountOnCollision(existing, cleaned)
    );
  });
  const finalMemberships = Array.from(membershipMap.values()).sort(
    (a3, b2) => (b2.joinedAt || 0) - (a3.joinedAt || 0)
  );
  return finalMemberships;
};

// packages/database/thunkApiTypes.ts
var dbThunkState = (thunkApi) => thunkApi.getState();
var dbThunkExtra = (thunkApi) => thunkApi.extra;

// packages/create/space/member/addMemberAction.ts
var addMemberAction = async (input, thunkAPI) => {
  const { spaceId, memberId, role = "member" /* MEMBER */ } = input;
  const { dispatch } = thunkAPI;
  const state3 = dbThunkState(thunkAPI);
  const currentUserId = selectIdentityUserId(state3);
  const { db } = dbThunkExtra(thunkAPI);
  const resolvedMemberId = db ? await resolveMemberId(db, memberId) : memberId.trim();
  const spaceKey = createSpaceKey.space(spaceId);
  const spaceData = await dispatch(read({
    dbKey: spaceKey
  })).unwrap();
  if (!spaceData) {
    throw new Error("Space not found");
  }
  if (!currentUserId) {
    throw new Error("User is not logged in.");
  }
  if (!spaceData.members.includes(currentUserId)) {
    throw new Error("\u5F53\u524D\u7528\u6237\u4E0D\u662F\u7A7A\u95F4\u6210\u5458\uFF0C\u65E0\u6CD5\u6DFB\u52A0\u6210\u5458");
  }
  if (spaceData.members.includes(resolvedMemberId)) {
    throw new Error("\u6210\u5458\u5DF2\u5B58\u5728");
  }
  const updatedSpaceData = {
    ...spaceData,
    members: [...spaceData.members, resolvedMemberId],
    updatedAt: Date.now()
  };
  await dispatch(
    write({ data: updatedSpaceData, customKey: spaceKey })
  ).unwrap();
  const now = Date.now();
  const spaceMemberData = {
    userId: resolvedMemberId,
    role,
    // 使用传入的 role，默认为 MEMBER
    joinedAt: now,
    updatedAt: now,
    // 可选字段，初始化时设置为当前时间
    spaceId,
    spaceName: spaceData.name,
    ownerId: spaceData.ownerId,
    visibility: spaceData.visibility,
    type: "space" /* SPACE */
    // 添加 type 字段
  };
  const spaceMemberKey = createSpaceKey.member(resolvedMemberId, spaceId);
  await dispatch(
    write({
      data: spaceMemberData,
      customKey: spaceMemberKey
    })
  ).unwrap();
  return { spaceId, updatedSpaceData };
};
async function resolveMemberId(db, identifier) {
  const trimmed = identifier.trim();
  let foundUserId = null;
  let matchCount = 0;
  try {
    for await (const [key, value] of db.iterator({
      gte: `${DB_PREFIX.USER}`,
      lte: `${DB_PREFIX.USER}\uFFFF`
    })) {
      if (value.username === trimmed) {
        foundUserId = key.slice(DB_PREFIX.USER.length);
        matchCount++;
      }
    }
  } catch (err2) {
    logger.warn({ err: err2, identifier: trimmed }, "Failed to scan users by username");
  }
  if (matchCount > 1) {
    throw new Error(
      `\u627E\u5230\u591A\u4E2A\u7528\u6237\u540D\u4E3A ${trimmed} \u7684\u7528\u6237\uFF0C\u8BF7\u4F7F\u7528\u7528\u6237 ID \u9080\u8BF7`
    );
  }
  if (matchCount === 1 && foundUserId) {
    return foundUserId;
  }
  return trimmed;
}

// packages/create/space/member/removeMemberAction.ts
var removeMemberAction = async (input, thunkAPI) => {
  const { spaceId, memberId } = input;
  const { dispatch, getState } = thunkAPI;
  const state3 = getState();
  const currentUserId = selectIdentityUserId(state3);
  const spaceKey = createSpaceKey.space(spaceId);
  const spaceData = await dispatch(read({
    dbKey: spaceKey
  })).unwrap();
  if (!spaceData) {
    throw new Error("Space not found");
  }
  if (spaceData.ownerId !== currentUserId) {
    throw new Error("\u53EA\u6709\u7A7A\u95F4\u6240\u6709\u8005\u624D\u80FD\u5220\u9664\u6210\u5458");
  }
  if (!spaceData.members.includes(memberId)) {
    throw new Error("\u5F85\u5220\u9664\u7684\u6210\u5458\u4E0D\u5B58\u5728");
  }
  const updatedSpaceData = {
    ...spaceData,
    members: spaceData.members.filter((id) => id !== memberId),
    updatedAt: Date.now()
  };
  const memberKey = createSpaceKey.member(memberId, spaceId);
  await Promise.all([
    dispatch(write({ data: updatedSpaceData, customKey: spaceKey })).unwrap(),
    dispatch(remove(memberKey)).unwrap()
    // 使用 remove 替代 del
  ]);
  return { spaceId, updatedSpaceData };
};

// packages/create/space/member/memberThunks.ts
var createMemberThunks = (create) => ({
  fetchUserSpaceMemberships: create.asyncThunk(
    fetchUserSpaceMembershipsAction,
    {
      pending: (state3) => {
        state3.loading = true;
        state3.membershipStatus = "loading";
      },
      fulfilled: (state3, action2) => {
        state3.memberSpaces = action2.payload;
        state3.loading = false;
        state3.error = void 0;
        state3.membershipStatus = "fresh";
        state3.initialized = true;
      },
      rejected: (state3, action2) => {
        state3.loading = false;
        state3.error = action2.error.message;
        if (isSpaceMembershipRemoteUnavailableError(action2.error)) {
          state3.membershipStatus = "offline";
        } else if (state3.membershipStatus === "loading") {
          state3.membershipStatus = "idle";
        }
      }
    }
  ),
  addMember: create.asyncThunk(addMemberAction, {
    fulfilled: (state3, action2) => {
      if (state3.currentSpaceId === action2.payload.spaceId) {
        state3.currentSpace = action2.payload.updatedSpaceData;
      }
    }
  }),
  removeMember: create.asyncThunk(removeMemberAction, {
    fulfilled: (state3, action2) => {
      if (state3.currentSpaceId === action2.payload.spaceId) {
        state3.currentSpace = action2.payload.updatedSpaceData;
      }
    }
  })
});

// packages/database/queryPrefixes.ts
function getUserDataPrefixes(type, userId) {
  const normalizedType = toTrimmedString(type);
  const normalizedUserId = toTrimmedString(userId);
  if (!normalizedType || !normalizedUserId) return [];
  const aliases = TYPE_STORAGE_PREFIXES[normalizedType] ?? [normalizedType];
  const seen = /* @__PURE__ */ new Set();
  const prefixes = [];
  for (const raw of aliases) {
    const alias = toTrimmedString(raw);
    if (!alias) continue;
    const prefix = `${alias}-${normalizedUserId}-`;
    if (seen.has(prefix)) continue;
    seen.add(prefix);
    prefixes.push(prefix);
  }
  return prefixes;
}

// packages/database/client/fetchUserData.ts
var attachQueriedKey = (key, value) => {
  if (!value || typeof value !== "object") return value;
  if (typeof value.dbKey === "string" && value.dbKey.trim().length > 0) {
    return value;
  }
  return {
    ...value,
    dbKey: key
  };
};
var normalizeTypeList = (types) => {
  const raw = Array.isArray(types) ? types : [types];
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const t2 of raw) {
    const n = toTrimmedString(t2);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
};
async function fetchUserData(db, types, userId, options = {}) {
  const results = {};
  const typeArray = normalizeTypeList(types);
  const includeDeleted = options.includeDeleted === true;
  try {
    for (const type of typeArray) {
      const byKey = /* @__PURE__ */ new Map();
      const prefixes = getUserDataPrefixes(type, userId);
      for (const prefix of prefixes) {
        if (!prefix) continue;
        let iterator = db.iterator({
          gte: prefix,
          lte: `${prefix}\uFFFF`
        });
        if (iterator && typeof iterator.then === "function") {
          iterator = await iterator;
        }
        for await (const [key, value] of iterator) {
          const keyStr = String(key);
          if (byKey.has(keyStr)) continue;
          const hydrated = attachQueriedKey(keyStr, value);
          if (!hydrated) continue;
          if (!includeDeleted && hydrated.deletedAt) continue;
          byKey.set(keyStr, hydrated);
        }
      }
      results[type] = [...byKey.values()];
    }
    if (Array.isArray(types)) {
      return results;
    }
    const single = toTrimmedString(types);
    return results[single] ?? [];
  } catch (error) {
    console.error("Query error:", error);
    throw error;
  }
}

// packages/create/space/addSpaceAction.ts
async function getUserDataOnce({
  types,
  userId,
  limit,
  isLoggedIn = false,
  currentUserId,
  db
}) {
  try {
    const typeArray = Array.isArray(types) ? types : [types];
    const effectiveUserId = userId === "local" && isLoggedIn && currentUserId ? currentUserId : userId;
    const localResults = await fetchUserData(db, typeArray, effectiveUserId);
    const localData = Object.values(localResults).flat();
    return { data: localData };
  } catch (err2) {
    const error = err2 instanceof Error ? err2 : new Error("Unknown error occurred");
    return { data: [], error };
  }
}
var targetTypes = ["dialog" /* DIALOG */, "page" /* DOC */];
var getCurrentPathForLog = () => typeof window !== "undefined" && typeof window.location?.pathname === "string" ? window.location.pathname : void 0;
var addSpaceAction = async (input, thunkAPI) => {
  const {
    name,
    description = "",
    boundFolder
  } = input;
  const visibility = input.visibility ?? "private" /* PRIVATE */;
  const { dispatch, getState, extra } = thunkAPI;
  const state3 = getState();
  const accountUserId = selectIdentityUserId(state3);
  const userId = resolveEffectiveSpaceActorId(accountUserId);
  const spaceId = ulid();
  const now = Date.now();
  const nowISO = new Date(now).toISOString();
  const spaceData = {
    id: spaceId,
    name,
    description,
    boundFolder,
    ownerId: userId,
    userId,
    visibility,
    members: [userId],
    categories: {},
    contents: {},
    createdAt: now,
    updatedAt: now,
    type: "space" /* SPACE */
  };
  const spaces = selectAllMemberSpaces(state3);
  const hasSpaceForActor = spaces.some(
    (membership) => {
      if (isDeviceLocalOwnerId(userId)) {
        return isDeviceLocalSpaceMembership(membership);
      }
      if (isDeviceLocalSpaceMembership(membership)) return false;
      return membership.userId === userId || membership.ownerId === userId;
    }
  );
  console.info("[space/create] addSpaceAction", {
    userId,
    name,
    visibility,
    boundFolder,
    memberSpaceCount: spaces.length,
    hasSpaceForActor,
    currentPath: getCurrentPathForLog()
  });
  if (!hasSpaceForActor) {
    const { data: oldItems = [] } = await getUserDataOnce({
      types: targetTypes,
      userId,
      limit: 100,
      db: extra.db
    });
    const hasOldSideData = oldItems.length > 0;
    if (hasOldSideData) {
      const contents = {};
      const updatePromises = [];
      for (const item of oldItems) {
        if (!item.id || !item.type) continue;
        const recordOwner = resolveRecordOwnerUserId(item);
        if (recordOwner !== userId) continue;
        const stableContentKey = typeof item.dbKey === "string" && item.dbKey.trim() ? item.dbKey : item.id;
        contents[stableContentKey] = {
          title: item.title || "",
          type: item.type,
          contentKey: stableContentKey,
          categoryId: "",
          pinned: false,
          createdAt: item.createdAt ?? now,
          updatedAt: item.updatedAt ?? now,
          order: item.order
        };
        if (item.dbKey) {
          updatePromises.push(
            dispatch(
              patch({
                dbKey: item.dbKey,
                changes: { spaceId, updatedAt: now }
              })
            )
          );
        }
      }
      spaceData.contents = contents;
      await Promise.all(updatePromises);
    }
  }
  const spaceKey = createSpaceKey.space(spaceId);
  await dispatch(
    write({ data: spaceData, customKey: spaceKey, userId })
  ).unwrap();
  const spaceMemberKey = createSpaceKey.member(userId, spaceId);
  const spaceMemberData = {
    dbKey: spaceMemberKey,
    type: "space" /* SPACE */,
    userId,
    role: "owner" /* OWNER */,
    joinedAt: now,
    spaceId,
    spaceName: name,
    ownerId: userId,
    visibility,
    createdAt: nowISO,
    updatedAt: nowISO
  };
  await dispatch(
    write({ data: spaceMemberData, customKey: spaceMemberKey, userId })
  ).unwrap();
  return spaceMemberData;
};

// packages/app/favorite/favoriteStore.ts
var import_react3 = __toESM(require_react());
var createInitialState2 = () => ({
  agentIds: [],
  contentIds: [],
  favoritedAtById: {},
  initialized: false,
  loading: false,
  error: null
});
var state2 = createInitialState2();
var listeners3 = /* @__PURE__ */ new Set();
var version3 = 0;
var notify3 = () => {
  version3 += 1;
  for (const listener2 of listeners3) {
    try {
      listener2();
    } catch {
    }
  }
};
async function rpcCall(method, params, token, server) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
  const res = await fetch(`${server}/rpc/${method}`, {
    method: "POST",
    headers,
    body: JSON.stringify(params ?? {})
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${method} failed: ${res.status} ${text}`);
  }
  return await res.json();
}
function getFavoriteServers(state3) {
  return selectRemoteServers(state3);
}
function buildFavoritedMap(result) {
  const map = {};
  if (Array.isArray(result.items) && result.items.length > 0) {
    result.items.forEach((item) => {
      if (item?.id) {
        map[item.id] = Number(item.favoritedAt) || 0;
      }
    });
    return map;
  }
  if (Array.isArray(result.ids) && result.ids.length > 0) {
    const base = Date.now();
    result.ids.forEach((id, index) => {
      map[id] = base - index;
    });
  }
  return map;
}
function mergeFavoritedMaps(results) {
  const merged = {};
  results.forEach((result) => {
    const map = buildFavoritedMap(result);
    Object.entries(map).forEach(([id, favoritedAt]) => {
      if (!merged[id] || favoritedAt > merged[id]) {
        merged[id] = favoritedAt;
      }
    });
  });
  return merged;
}
function sortFavoriteIds(favoritedAtById) {
  return Object.entries(favoritedAtById).sort((a3, b2) => b2[1] - a3[1]).map(([id]) => id);
}
async function loadFavoritesFromServer(server, token) {
  try {
    const batchResult = await rpcCall(
      "listFavorites",
      { targetType: ["agent", "content"] },
      token,
      server
    );
    if (Array.isArray(batchResult)) {
      const agentFavorites = batchResult.find((result) => result?.targetType === "agent") ?? createEmptyListResult("agent");
      const contentFavorites = batchResult.find((result) => result?.targetType === "content") ?? createEmptyListResult("content");
      return {
        server,
        agentFavorites,
        contentFavorites
      };
    }
  } catch (error) {
  }
  const [agentFavoritesResult, contentFavoritesResult] = await Promise.allSettled([
    rpcCall(
      "listFavorites",
      { targetType: "agent" },
      token,
      server
    ),
    listContentFavoritesWithFallback(token, server)
  ]);
  if (agentFavoritesResult.status === "rejected" && contentFavoritesResult.status === "rejected") {
    throw agentFavoritesResult.reason || contentFavoritesResult.reason;
  }
  return {
    server,
    agentFavorites: agentFavoritesResult.status === "fulfilled" ? agentFavoritesResult.value : createEmptyListResult("agent"),
    contentFavorites: contentFavoritesResult.status === "fulfilled" ? contentFavoritesResult.value : createEmptyListResult("content")
  };
}
function collectMissingFavoriteSyncOps(snapshots, agentFavoritedAtById, contentFavoritedAtById) {
  const operations = [];
  snapshots.forEach((snapshot) => {
    const agentSet = new Set(snapshot.agentFavorites.ids ?? []);
    const contentSet = new Set(snapshot.contentFavorites.ids ?? []);
    Object.entries(agentFavoritedAtById).forEach(([agentId, favoritedAt]) => {
      if (!agentSet.has(agentId)) {
        operations.push({
          server: snapshot.server,
          targetType: "agent",
          targetKey: agentId,
          favoritedAt
        });
      }
    });
    Object.entries(contentFavoritedAtById).forEach(
      ([contentId, favoritedAt]) => {
        if (!contentSet.has(contentId)) {
          operations.push({
            server: snapshot.server,
            targetType: "content",
            targetKey: contentId,
            favoritedAt
          });
        }
      }
    );
  });
  return operations;
}
async function listContentFavoritesWithFallback(token, server) {
  const targetTypes2 = ["content", "doc", "page"];
  let lastError = null;
  for (const targetType of targetTypes2) {
    try {
      return await rpcCall(
        "listFavorites",
        { targetType },
        token,
        server
      );
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error("listFavorites failed for content/doc/page");
}
async function setFavoriteOnServer(targetType, targetKey, isFavorite, token, server, favoritedAt) {
  return rpcCall(
    "setFavorite",
    {
      targetType,
      targetKey,
      isFavorite,
      favoritedAt
    },
    token,
    server
  );
}
async function setContentFavoriteOnServerWithFallback(contentKey, isFavorite, token, server, favoritedAt) {
  const targetTypes2 = ["content", "doc", "page"];
  let lastError = null;
  for (const targetType of targetTypes2) {
    try {
      return await setFavoriteOnServer(
        targetType,
        contentKey,
        isFavorite,
        token,
        server,
        favoritedAt
      );
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error("setFavorite failed for content/doc/page");
}
async function setFavoriteAcrossServers(targetType, targetKey, isFavorite, token, servers, favoritedAt) {
  if (servers.length === 0) {
    throw new Error("\u6CA1\u6709\u53EF\u7528\u670D\u52A1\u5668\uFF0C\u65E0\u6CD5\u540C\u6B65\u6536\u85CF");
  }
  const syncOperation = targetType === "agent" ? (server) => setFavoriteOnServer(
    targetType,
    targetKey,
    isFavorite,
    token,
    server,
    favoritedAt
  ) : (server) => setContentFavoriteOnServerWithFallback(
    targetKey,
    isFavorite,
    token,
    server,
    favoritedAt
  );
  const results = await Promise.allSettled(
    servers.map((server) => syncOperation(server))
  );
  const failures = results.filter(
    (result) => result.status === "rejected"
  );
  if (failures.length === results.length) {
    throw failures[0]?.reason ?? new Error("\u6240\u6709\u670D\u52A1\u5668\u7684\u6536\u85CF\u540C\u6B65\u90FD\u5931\u8D25\u4E86");
  }
  if (failures.length > 0) {
    console.warn(
      "[Favorites] Partial favorite sync failure:",
      failures.map((failure) => failure.reason)
    );
  }
}
async function reconcileFavoriteUnion(operations, token) {
  if (operations.length === 0) return;
  const results = await Promise.allSettled(
    operations.map(
      (operation) => operation.targetType === "agent" ? setFavoriteOnServer(
        operation.targetType,
        operation.targetKey,
        true,
        token,
        operation.server,
        operation.favoritedAt
      ) : setContentFavoriteOnServerWithFallback(
        operation.targetKey,
        true,
        token,
        operation.server,
        operation.favoritedAt
      )
    )
  );
  const failures = results.filter(
    (result) => result.status === "rejected"
  );
  if (failures.length > 0) {
    console.warn(
      "[Favorites] Failed to backfill merged favorites:",
      failures.map((failure) => failure.reason)
    );
  }
}
function createEmptyListResult(targetType) {
  return { targetType, ids: [], items: [] };
}
function resetFavorites() {
  state2 = createInitialState2();
  notify3();
}
function removeFavoriteLocally(payload) {
  const { targetType, id } = payload;
  if (targetType === "agent") {
    state2 = {
      ...state2,
      agentIds: state2.agentIds.filter((item) => item !== id),
      favoritedAtById: { ...state2.favoritedAtById }
    };
    delete state2.favoritedAtById[id];
    notify3();
    return;
  }
  if (targetType === "doc" || targetType === "page" || targetType === "content") {
    state2 = {
      ...state2,
      contentIds: state2.contentIds.filter((item) => item !== id),
      favoritedAtById: { ...state2.favoritedAtById }
    };
    delete state2.favoritedAtById[id];
    notify3();
  }
}
function markFavoritesLoading() {
  state2 = { ...state2, loading: true, error: null };
  notify3();
}
function replaceFavorites(data) {
  state2 = {
    agentIds: data.agentIds || [],
    contentIds: data.contentIds || [],
    favoritedAtById: data.favoritedAtById || {},
    initialized: true,
    loading: false,
    error: null
  };
  notify3();
}
function markFavoritesInitFailed(message) {
  state2 = {
    ...state2,
    loading: false,
    initialized: true,
    error: message
  };
  notify3();
}
function applyAgentToggle(agentKey, isFavorite) {
  const favoritedAtById = { ...state2.favoritedAtById };
  let agentIds = state2.agentIds;
  if (isFavorite) {
    if (!agentIds.includes(agentKey)) {
      agentIds = [agentKey, ...agentIds];
    }
    favoritedAtById[agentKey] = Date.now();
  } else {
    agentIds = agentIds.filter((id) => id !== agentKey);
    delete favoritedAtById[agentKey];
  }
  state2 = { ...state2, agentIds, favoritedAtById };
  notify3();
}
function applyContentToggle(contentKey, isFavorite) {
  const favoritedAtById = { ...state2.favoritedAtById };
  let contentIds = state2.contentIds;
  if (isFavorite) {
    if (!contentIds.includes(contentKey)) {
      contentIds = [contentKey, ...contentIds];
    }
    favoritedAtById[contentKey] = Date.now();
  } else {
    contentIds = contentIds.filter((id) => id !== contentKey);
    delete favoritedAtById[contentKey];
  }
  state2 = { ...state2, contentIds, favoritedAtById };
  notify3();
}
function markToggleFavoriteFailed(message) {
  state2 = { ...state2, error: message };
  notify3();
}
function getFavoriteAgentIds() {
  return state2.agentIds;
}
function getFavoriteContentIds() {
  return state2.contentIds;
}
function getFavoriteFavoritedAtById() {
  return state2.favoritedAtById;
}
function getFavoritesLoading() {
  return state2.loading;
}
function getFavoritesInitialized() {
  return state2.initialized;
}
function getFavoritesError() {
  return state2.error;
}
function isAgentFavorited(agentKey) {
  if (!agentKey) return false;
  return state2.agentIds.includes(agentKey);
}
function isContentFavorited(contentKey) {
  if (!contentKey) return false;
  return state2.contentIds.includes(contentKey);
}
function subscribe2(listener2) {
  listeners3.add(listener2);
  return () => {
    listeners3.delete(listener2);
  };
}
function getSnapshot2() {
  return version3;
}
function useFavoriteAgentIds() {
  (0, import_react3.useSyncExternalStore)(subscribe2, getSnapshot2, getSnapshot2);
  return getFavoriteAgentIds();
}
function useFavoriteContentIds() {
  (0, import_react3.useSyncExternalStore)(subscribe2, getSnapshot2, getSnapshot2);
  return getFavoriteContentIds();
}
function useFavoriteFavoritedAtById() {
  (0, import_react3.useSyncExternalStore)(subscribe2, getSnapshot2, getSnapshot2);
  return getFavoriteFavoritedAtById();
}
function useFavoritesLoading() {
  (0, import_react3.useSyncExternalStore)(subscribe2, getSnapshot2, getSnapshot2);
  return getFavoritesLoading();
}
function useFavoritesInitialized() {
  (0, import_react3.useSyncExternalStore)(subscribe2, getSnapshot2, getSnapshot2);
  return getFavoritesInitialized();
}
function useFavoritesError() {
  (0, import_react3.useSyncExternalStore)(subscribe2, getSnapshot2, getSnapshot2);
  return getFavoritesError();
}
function useIsAgentFavorited(agentKey) {
  (0, import_react3.useSyncExternalStore)(subscribe2, getSnapshot2, getSnapshot2);
  return isAgentFavorited(agentKey);
}
function useIsContentFavorited(contentKey) {
  (0, import_react3.useSyncExternalStore)(subscribe2, getSnapshot2, getSnapshot2);
  return isContentFavorited(contentKey);
}
var initFavorites = createAsyncThunk(
  "favorite/initFavorites",
  async (_, thunkAPI) => {
    markFavoritesLoading();
    try {
      const reduxState = thunkAPI.getState();
      const token = selectIdentityToken(reduxState);
      const servers = getFavoriteServers(reduxState);
      if (!token) {
        throw new Error("\u672A\u767B\u5F55\uFF0C\u65E0\u6CD5\u52A0\u8F7D\u6536\u85CF\u5217\u8868");
      }
      const snapshotResults = await Promise.allSettled(
        servers.map((server) => loadFavoritesFromServer(server, token))
      );
      const snapshots = snapshotResults.filter(
        (result) => result.status === "fulfilled"
      ).map((result) => result.value);
      const failures = snapshotResults.filter(
        (result) => result.status === "rejected"
      );
      if (snapshots.length === 0) {
        throw failures[0]?.reason ?? new Error("\u6240\u6709\u670D\u52A1\u5668\u7684\u6536\u85CF\u52A0\u8F7D\u90FD\u5931\u8D25\u4E86");
      }
      if (failures.length > 0) {
        console.warn(
          "[Favorites] Partial favorite load failure:",
          failures.map((failure) => failure.reason)
        );
      }
      const agentFavoritedAtById = mergeFavoritedMaps(
        snapshots.map((snapshot) => snapshot.agentFavorites)
      );
      const contentFavoritedAtById = mergeFavoritedMaps(
        snapshots.map((snapshot) => snapshot.contentFavorites)
      );
      const agentIds = sortFavoriteIds(agentFavoritedAtById);
      const contentIds = sortFavoriteIds(contentFavoritedAtById);
      const backfillOperations = collectMissingFavoriteSyncOps(
        snapshots,
        agentFavoritedAtById,
        contentFavoritedAtById
      );
      void reconcileFavoriteUnion(backfillOperations, token);
      const payload = {
        agentIds,
        contentIds,
        favoritedAtById: {
          ...agentFavoritedAtById,
          ...contentFavoritedAtById
        }
      };
      replaceFavorites(payload);
      return payload;
    } catch (error) {
      const message = error instanceof Error ? error.message : "load favorites failed";
      markFavoritesInitFailed(message);
      throw error;
    }
  }
);
var toggleFavorite = createAsyncThunk(
  "favorite/toggleFavorite",
  async (agentKey, thunkAPI) => {
    const reduxState = thunkAPI.getState();
    const token = selectIdentityToken(reduxState);
    const servers = getFavoriteServers(reduxState);
    const isCurrentlyFavorite = isAgentFavorited(agentKey);
    const nextFavoriteState = !isCurrentlyFavorite;
    const favoritedAt = nextFavoriteState ? Date.now() : void 0;
    if (!token) {
      throw new Error("\u672A\u767B\u5F55\uFF0C\u65E0\u6CD5\u64CD\u4F5C\u6536\u85CF");
    }
    try {
      await setFavoriteAcrossServers(
        "agent",
        agentKey,
        nextFavoriteState,
        token,
        servers,
        favoritedAt
      );
      applyAgentToggle(agentKey, nextFavoriteState);
      return { agentKey, isFavorite: nextFavoriteState };
    } catch (error) {
      const message = error instanceof Error ? error.message : "toggle favorite failed";
      markToggleFavoriteFailed(message);
      throw error;
    }
  }
);
var toggleContentFavorite = createAsyncThunk(
  "favorite/toggleContentFavorite",
  async (contentKey, thunkAPI) => {
    const reduxState = thunkAPI.getState();
    const token = selectIdentityToken(reduxState);
    const servers = getFavoriteServers(reduxState);
    const isCurrentlyFavorite = isContentFavorited(contentKey);
    const nextFavoriteState = !isCurrentlyFavorite;
    const favoritedAt = nextFavoriteState ? Date.now() : void 0;
    if (!token) {
      throw new Error("\u672A\u767B\u5F55\uFF0C\u65E0\u6CD5\u64CD\u4F5C\u6536\u85CF");
    }
    try {
      await setFavoriteAcrossServers(
        "content",
        contentKey,
        nextFavoriteState,
        token,
        servers,
        favoritedAt
      );
      applyContentToggle(contentKey, nextFavoriteState);
      return { contentKey, isFavorite: nextFavoriteState };
    } catch (error) {
      const message = error instanceof Error ? error.message : "toggle favorite failed";
      markToggleFavoriteFailed(message);
      throw error;
    }
  }
);

// packages/app/favorite/deletedFavoriteProjection.ts
var resolveDeletedFavoriteProjectionRemoval = (contentKey) => {
  if (!contentKey) return null;
  if (isAgentKey(contentKey)) {
    return { targetType: "agent", id: contentKey };
  }
  if (isPageKey(contentKey) || isTableMetaKey(contentKey) || isFileKey(contentKey)) {
    return { targetType: "content", id: contentKey };
  }
  return null;
};

// packages/agent-runtime/deleteAgentLocalCredential.ts
var AGENT_LOCAL_CREDENTIAL_DELETE_FAILED_MESSAGE = "Agent was deleted, but local API key cleanup failed. You may remove the leftover credential manually if needed.";
var createAgentLocalCredentialBroker = createFileCredentialBroker;
function isPublicAgentProjectionKey(dbKey) {
  const key = asTrimmedString(dbKey);
  return key.startsWith("agent-pub-");
}
function extractAgentLocalCredentialRef(record) {
  if (!record || typeof record !== "object") return null;
  const value = record.credentialRef;
  return asOptionalTrimmedString(value) ?? null;
}
async function deleteAgentLocalCredentialRef(credentialRef, options) {
  const ref = asTrimmedString(credentialRef);
  if (!ref) {
    return { deleted: false, skipped: true };
  }
  try {
    const factory2 = options?.brokerFactory ?? createAgentLocalCredentialBroker;
    const broker = factory2();
    await broker.delete(ref);
    return { deleted: true };
  } catch {
    return {
      deleted: false,
      warning: AGENT_LOCAL_CREDENTIAL_DELETE_FAILED_MESSAGE
    };
  }
}

// packages/app/hooks/deleteDbKey.ts
var performDirectDelete = async (dispatch, getState, contentKey, preferredServerOrigin, includeAttachments) => {
  if (isDialogKey(contentKey)) {
    await dispatch(
      deleteDialog({ dialogKey: contentKey, includeAttachments })
    ).unwrap();
    return;
  }
  if (isTableMetaKey(contentKey)) {
    await dispatch(deleteTable({ dbKey: contentKey })).unwrap();
    return;
  }
  if (isAgentKey(contentKey)) {
    let credentialRef = null;
    let credentialSynced = false;
    if (!isPublicAgentProjectionKey(contentKey)) {
      try {
        let record = selectById(getState(), contentKey);
        if (!record) {
          try {
            record = await dispatch(
              read({
                dbKey: contentKey,
                preferredServerOrigin
              })
            ).unwrap();
          } catch {
            record = null;
          }
        }
        credentialRef = extractAgentLocalCredentialRef(record);
        if (record && typeof record === "object" && "credentialSynced" in record) {
          credentialSynced = record.credentialSynced === true;
        }
      } catch {
        credentialRef = null;
      }
    }
    await dispatch(
      remove({
        dbKey: contentKey,
        preferredServerOrigin
      })
    ).unwrap();
    if (credentialRef) {
      const cleanup = await deleteAgentLocalCredentialRef(credentialRef);
      if (!cleanup.deleted && "warning" in cleanup) {
        console.warn(
          "[deleteDbKey] local API credential cleanup failed after agent delete:",
          cleanup.warning
        );
      }
    }
    if (credentialRef && credentialSynced) {
      try {
        const { currentServer, currentToken } = selectRuntimeSnapshot(
          getState()
        );
        if (currentServer && currentToken) {
          await deleteServerSyncedCredential(
            { currentServer, authToken: currentToken },
            credentialRef
          );
        }
      } catch {
      }
    }
    return;
  }
  if (isAppKey(contentKey) || isPageKey(contentKey) || isFileKey(contentKey) || isTaskKey(contentKey)) {
    await dispatch(
      remove({
        dbKey: contentKey,
        preferredServerOrigin
      })
    ).unwrap();
  }
};
var resolveDeleteInput = (input) => {
  if (typeof input === "string" && input.trim()) {
    return { contentKey: input };
  }
  if (input && typeof input === "object") {
    const candidates = [input.contentKey, input.dbKey, input.key];
    const preferredServerOrigin = asNonEmptyStringArray([
      input.preferredServerOrigin,
      input.serverOrigin
    ])[0];
    const inputSpaceId = typeof input.spaceId === "string" && input.spaceId.trim().length > 0 ? input.spaceId : null;
    const includeAttachments = input.includeAttachments === true;
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return {
          contentKey: candidate,
          preferredServerOrigin,
          inputSpaceId,
          includeAttachments
        };
      }
    }
  }
  throw new Error("Invalid delete key");
};
var extractDeleteErrorMessage = (error, seen = /* @__PURE__ */ new Set(), depth = 0) => {
  if (depth > 8) {
    return null;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  if (!error || typeof error !== "object") {
    return null;
  }
  if (seen.has(error)) {
    return null;
  }
  seen.add(error);
  const record = error;
  const directKeys = ["message", "error", "detail", "title"];
  for (const key of directKeys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  const nestedKeys = ["payload", "data", "cause"];
  for (const key of nestedKeys) {
    const message = extractDeleteErrorMessage(record[key], seen, depth + 1);
    if (message) {
      return message;
    }
  }
  if (Array.isArray(record.errors)) {
    const messages = record.errors.map((item) => extractDeleteErrorMessage(item, seen, depth + 1)).filter((item) => Boolean(item));
    if (messages.length > 0) {
      return messages.join("\n");
    }
  }
  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== "{}") {
      return serialized;
    }
  } catch {
    return null;
  }
  return null;
};
var getDeleteErrorMessage = (error, fallback = "Delete failed") => {
  return extractDeleteErrorMessage(error) ?? fallback;
};
var normalizeDeleteError = (error) => {
  if (error instanceof Error && error.message.trim()) {
    return error;
  }
  return new Error(getDeleteErrorMessage(error));
};
var deleteDbKey = (input, spaceId) => async (dispatch, getState) => {
  try {
    const {
      contentKey,
      preferredServerOrigin,
      inputSpaceId,
      includeAttachments
    } = resolveDeleteInput(input);
    const effectiveSpaceId = typeof spaceId === "string" && spaceId.trim().length > 0 ? spaceId : inputSpaceId ?? null;
    await performDirectDelete(
      dispatch,
      getState,
      contentKey,
      preferredServerOrigin,
      includeAttachments
    );
    const spaceIds = isAppKey(contentKey) ? /* @__PURE__ */ new Set([
      effectiveSpaceId,
      ...selectAllMemberSpaces(getState()).map((space) => space.spaceId)
    ]) : /* @__PURE__ */ new Set([effectiveSpaceId]);
    await Promise.all(
      [...spaceIds].filter((spaceId2) => Boolean(spaceId2)).map(
        (spaceId2) => dispatch(
          deleteContentFromSpace({
            contentKey,
            spaceId: spaceId2,
            ...preferredServerOrigin ? { sourceServerOrigin: preferredServerOrigin } : {}
          })
        ).unwrap().catch((err2) => {
          console.warn("[deleteDbKey] space cleanup failed (entity already tombstoned):", err2);
        })
      )
    );
    const favoriteProjectionRemoval = resolveDeletedFavoriteProjectionRemoval(contentKey);
    if (favoriteProjectionRemoval) {
      removeFavoriteLocally(favoriteProjectionRemoval);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("nolo-user-data-updated", {
          detail: { deletedDbKey: contentKey }
        })
      );
    }
    return true;
  } catch (error) {
    throw normalizeDeleteError(error);
  }
};

// packages/create/space/deleteSpaceAction.ts
var getCurrentUserId = (state3) => asOptionalTrimmedString(selectIdentityUserId(state3)) ?? null;
var fetchSpaceData = async (spaceId, dispatch) => {
  const spaceKey = createSpaceKey.space(spaceId);
  try {
    return await dispatch(read({
      dbKey: spaceKey
    })).unwrap();
  } catch (error) {
    console.warn(`Failed to read space ${spaceId}:`, error);
    return void 0;
  }
};
var checkOwnerPermission = (spaceData, accountUserId) => {
  if (!spaceData) return;
  if (isDeviceLocalSpaceBody(spaceData)) return;
  if (!accountUserId) {
    throw new Error("User is not logged in.");
  }
  if (spaceData.ownerId !== accountUserId) {
    throw new Error("Only owner can delete space");
  }
};
var deleteSpaceData = async (spaceId, dispatch) => {
  const spaceKey = createSpaceKey.space(spaceId);
  try {
    await dispatch(remove(spaceKey)).unwrap();
  } catch (error) {
    console.warn(`Failed to delete space ${spaceId}:`, error);
  }
};
var tombstoneLocalAuthorityRecord = async (dbKey, existing, dispatch) => {
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const base = existing && typeof existing === "object" ? { ...existing } : { dbKey };
  const tombstone = buildTombstoneRecord(
    {
      ...base,
      dbKey,
      userId: DEVICE_LOCAL_OWNER_ID
    },
    nowIso
  );
  await dispatch(
    write({
      data: tombstone,
      customKey: dbKey,
      userId: DEVICE_LOCAL_OWNER_ID
    })
  ).unwrap();
};
var deleteLocalSpaceAuthority = async (spaceId, spaceData, dispatch) => {
  const spaceKey = createSpaceKey.space(spaceId);
  try {
    await tombstoneLocalAuthorityRecord(
      spaceKey,
      spaceData && typeof spaceData === "object" ? spaceData : { dbKey: spaceKey },
      dispatch
    );
  } catch (error) {
    console.warn(`Failed to tombstone local space ${spaceId}:`, error);
    throw error;
  }
  const memberIds = /* @__PURE__ */ new Set([
    DEVICE_LOCAL_OWNER_ID,
    ...asTrimmedNonEmptyStringArray(spaceData?.members)
  ]);
  for (const memberId of memberIds) {
    const memberKey = createSpaceKey.member(memberId, spaceId);
    let existingMember = null;
    try {
      existingMember = await dispatch(read({ dbKey: memberKey })).unwrap();
    } catch {
      existingMember = null;
    }
    try {
      await tombstoneLocalAuthorityRecord(
        memberKey,
        existingMember ?? {
          dbKey: memberKey,
          type: "space" /* SPACE */,
          userId: memberId,
          spaceId: normalizeSpaceId(spaceId)
        },
        dispatch
      );
    } catch (err2) {
      console.warn(
        `Failed to tombstone local membership ${memberId} for space ${spaceId}:`,
        err2
      );
    }
  }
};
var deleteAllMembers = async (spaceData, spaceId, dispatch) => {
  if (spaceData?.members) {
    for (const memberId of spaceData.members) {
      const memberKey = createSpaceKey.member(memberId, spaceId);
      await dispatch(remove(memberKey)).unwrap().catch(
        (err2) => console.warn(
          `Failed to delete member ${memberId} for space ${spaceId}:`,
          err2
        )
      );
    }
  }
};
var deleteCurrentUserMember = async (userId, spaceId, dispatch) => {
  const currentUserMemberKey = createSpaceKey.member(userId, spaceId);
  await dispatch(remove(currentUserMemberKey)).unwrap().catch(
    (err2) => console.warn(
      `Failed to delete member key for user ${userId} in space ${spaceId}:`,
      err2
    )
  );
};
var resolveDeleteArgs = (input) => {
  if (typeof input === "string") {
    return { spaceId: input, strategy: "delete-space-only" };
  }
  return {
    spaceId: input.spaceId,
    strategy: input.strategy ?? "delete-space-only"
  };
};
var isOwnedByUser = (entityKey, entity, userId) => {
  if (!entityKey || !userId) return false;
  const keyParts = splitKey(entityKey);
  const keyedOwner = keyParts[1];
  if ((isDialogKey(entityKey) || isPageKey(entityKey) || isFileKey(entityKey) || isTableMetaKey(entityKey)) && keyedOwner === userId) {
    return true;
  }
  if ((isAgentKey(entityKey) || isAppKey(entityKey)) && entity?.userId === userId) {
    return true;
  }
  if (entity?.tenantId === userId || entity?.userId === userId || entity?.ownerId === userId) {
    return true;
  }
  return false;
};
var nextUpdatedAt = (entity) => {
  const source = entity?.updatedAt ?? entity?.updated_at ?? entity?.createdAt ?? entity?.created ?? Date.now();
  const timestamp = typeof source === "number" ? source : Date.parse(String(source)) || Date.now();
  return new Date(Math.max(Date.now(), timestamp + 1)).toISOString();
};
var listSpaceEntities = async (spaceData, dispatch) => {
  const results = [];
  const contents = Object.values(spaceData?.contents ?? {}).filter(Boolean);
  for (const item of contents) {
    const entityKey = typeof item.contentKey === "string" ? item.contentKey : "";
    if (!entityKey) continue;
    let entity = null;
    try {
      entity = await dispatch(read({ dbKey: entityKey })).unwrap();
    } catch {
      entity = null;
    }
    results.push({ entityKey, entity });
  }
  return results;
};
var clearEntitySpaceIds = async (entities, dispatch) => {
  await Promise.all(
    entities.filter(({ entity }) => entity && typeof entity === "object").map(
      ({ entityKey, entity }) => dispatch(
        patch({
          dbKey: entityKey,
          changes: {
            spaceId: null,
            updatedAt: nextUpdatedAt(entity)
          }
        })
      ).unwrap()
    )
  );
};
var deleteOwnedEntities = async (ownedEntities, dispatch) => {
  for (const { entityKey } of ownedEntities) {
    await dispatch(deleteDbKey(entityKey));
  }
};
var deleteSpaceAction = async (input, thunkAPI) => {
  const { dispatch, getState } = thunkAPI;
  const { spaceId, strategy } = resolveDeleteArgs(input);
  const accountUserId = getCurrentUserId(getState());
  const spaceData = await fetchSpaceData(spaceId, dispatch);
  const isLocalSpace = isDeviceLocalSpaceBody(spaceData);
  if (!isLocalSpace) {
    if (!accountUserId) {
      throw new Error("User is not logged in.");
    }
    checkOwnerPermission(spaceData, accountUserId);
  }
  const ownershipUserId = isLocalSpace ? DEVICE_LOCAL_OWNER_ID : accountUserId;
  if (spaceData && strategy !== "delete-space-only") {
    const allEntities = await listSpaceEntities(spaceData, dispatch);
    const ownedEntities = allEntities.filter(
      ({ entityKey, entity }) => isOwnedByUser(entityKey, entity, ownershipUserId)
    );
    const unownedEntities = allEntities.filter(
      ({ entityKey, entity }) => !isOwnedByUser(entityKey, entity, ownershipUserId)
    );
    if (strategy === "move-owned-to-all") {
      await clearEntitySpaceIds(allEntities, dispatch);
    } else if (strategy === "delete-owned-content") {
      await deleteOwnedEntities(ownedEntities, dispatch);
      await clearEntitySpaceIds(unownedEntities, dispatch);
    }
  }
  if (isLocalSpace) {
    await deleteLocalSpaceAuthority(spaceId, spaceData, dispatch);
  } else {
    await deleteSpaceData(spaceId, dispatch);
    await deleteAllMembers(spaceData, spaceId, dispatch);
    await deleteCurrentUserMember(accountUserId, spaceId, dispatch);
  }
  return { spaceId, strategy };
};

// packages/create/space/fetchSpaceAction.ts
var fetchSpaceAction = async (input, thunkAPI) => {
  const rawSpaceId = typeof input === "string" ? input : input?.spaceId;
  const fresh = typeof input === "object" && input !== null ? !!input.fresh : false;
  const { dispatch } = thunkAPI;
  if (!rawSpaceId) {
    throw new Error("spaceId is required");
  }
  const spaceId = normalizeSpaceId(rawSpaceId);
  const spaceKey = createSpaceKey.space(spaceId);
  const readSpace = async (dbKey) => {
    try {
      const { read: read2, readAndWait: readAndWait2 } = await import("/public/assets/chunks/dbSlice-KCSAFONH.js");
      if (fresh) {
        return await dispatch(readAndWait2(dbKey)).unwrap();
      }
      return await dispatch(
        read2({
          dbKey
        })
      ).unwrap();
    } catch {
      return null;
    }
  };
  const readLocalSpaceBody = async () => {
    let spaceData2 = await readSpace(spaceKey);
    if (!spaceData2 && rawSpaceId !== spaceKey) {
      spaceData2 = await readSpace(rawSpaceId);
    }
    if (!spaceData2 || isTombstoneRecord(spaceData2)) {
      return null;
    }
    return spaceData2;
  };
  if (fresh) {
    const localBody = await readLocalSpaceBody();
    if (localBody && isDeviceLocalSpaceBody(localBody)) {
      return { spaceId, spaceData: localBody };
    }
    const { token, userId, servers } = selectSpaceRemoteAuth(thunkAPI.getState());
    if (token && userId && servers.length > 0) {
      const remoteSpace = await fetchAuthoritativeRemoteSpace({
        servers,
        token,
        userId,
        spaceId
      });
      if (remoteSpace) return { spaceId, spaceData: remoteSpace };
      throw new Error(`Space not found: ${spaceId}`);
    }
    if (localBody) {
      return { spaceId, spaceData: localBody };
    }
    throw new Error(`Space not found: ${spaceId}`);
  }
  const spaceData = await readLocalSpaceBody();
  if (!spaceData) {
    throw new Error(`Space not found: ${spaceId}`);
  }
  return { spaceId, spaceData };
};

// packages/create/space/updateSpaceAction.ts
var updateSpaceAction = async (input, thunkAPI) => {
  const { spaceId, name, description, visibility, boundFolder } = input;
  const { dispatch, getState } = thunkAPI;
  const state3 = getState();
  const userId = selectIdentityUserId(state3);
  const spaceKey = createSpaceKey.space(spaceId);
  let spaceData = null;
  try {
    spaceData = await dispatch(read({
      dbKey: spaceKey
    })).unwrap();
  } catch (readError) {
    throw new Error(
      `\u65E0\u6CD5\u52A0\u8F7D\u7A7A\u95F4\u6570\u636E: ${spaceId}, \u539F\u56E0: ${toErrorMessage(readError)}`
    );
  }
  if (!spaceData) {
    throw new Error(`\u7A7A\u95F4\u4E0D\u5B58\u5728: ${spaceId}`);
  }
  if (!userId) {
    throw new Error("\u7528\u6237\u672A\u767B\u5F55\uFF0C\u65E0\u6CD5\u66F4\u65B0\u7A7A\u95F4\u8BBE\u7F6E\u3002");
  }
  if (!spaceData.members || !spaceData.members.includes(userId)) {
    throw new Error("\u5F53\u524D\u7528\u6237\u4E0D\u662F\u7A7A\u95F4\u6210\u5458\uFF0C\u65E0\u6CD5\u66F4\u65B0\u7A7A\u95F4\u8BBE\u7F6E\u3002");
  }
  const changes = {};
  let hasChanges = false;
  if (name !== void 0 && name !== spaceData.name) {
    changes.name = name.trim();
    hasChanges = true;
  }
  if (description !== void 0 && description !== spaceData.description) {
    changes.description = description;
    hasChanges = true;
  }
  if (visibility !== void 0 && visibility !== spaceData.visibility) {
    changes.visibility = visibility;
    hasChanges = true;
  }
  if (boundFolder !== void 0 && (boundFolder || void 0) !== (spaceData.boundFolder || void 0)) {
    changes.boundFolder = boundFolder || void 0;
    hasChanges = true;
  }
  if (!hasChanges) {
    return { updatedSpace: spaceData, spaceId };
  }
  const now = Date.now();
  changes.updatedAt = now;
  let updatedSpaceData;
  try {
    updatedSpaceData = await dispatch(
      patch({
        dbKey: spaceKey,
        changes
      })
    ).unwrap();
  } catch (patchError) {
    throw new Error(`\u66F4\u65B0\u7A7A\u95F4\u8BBE\u7F6E\u5931\u8D25: ${toErrorMessage(patchError)}`);
  }
  if (changes.name !== void 0) {
    const memberKey = createSpaceKey.member(userId, spaceId);
    try {
      const memberData = await dispatch(
        read({
          dbKey: memberKey
        })
      ).unwrap();
      if (memberData) {
        const memberChanges = {
          spaceName: changes.name,
          updatedAt: now
          // 为 member 数据也设置 updatedAt
        };
        await dispatch(
          patch({
            dbKey: memberKey,
            changes: memberChanges
          })
        ).unwrap();
      }
    } catch (memberError) {
      console.error(
        `Failed to update member data ${memberKey} for space name change:`,
        memberError
      );
    }
  }
  return {
    updatedSpace: updatedSpaceData,
    spaceId
  };
};

// packages/create/space/fetchSpaceSidebarStateAction.ts
var fetchSpaceSidebarStateAction = async (spaceId, thunkAPI) => {
  const { dispatch, getState } = thunkAPI;
  const normalizedSpaceId = normalizeSpaceId(spaceId);
  return {
    collapsedCategories: typeof window === "undefined" ? {} : readStoredCollapsedCategories(
      normalizedSpaceId,
      window.localStorage
    )
  };
};

// packages/create/space/changeSpaceAction.ts
var getSpaceUpdatedAt = (space) => {
  if (!space) return 0;
  return toTimestampMs(space.updatedAt);
};
var changeSpaceAction = async (spaceId, thunkAPI) => {
  const normalizedSpaceId = normalizeSpaceId(spaceId);
  const sidebarPromise = fetchSpaceSidebarStateAction(
    normalizedSpaceId,
    thunkAPI
  ).catch(() => ({ collapsedCategories: {} }));
  let spaceData = null;
  let usedLocal = false;
  try {
    const local = await fetchSpaceAction(
      { spaceId: normalizedSpaceId, fresh: false },
      thunkAPI
    );
    if (local?.spaceData) {
      spaceData = local.spaceData;
      usedLocal = true;
    }
  } catch {
  }
  if (!spaceData) {
    const fresh = await fetchSpaceAction(
      { spaceId: normalizedSpaceId, fresh: true },
      thunkAPI
    );
    if (!fresh?.spaceData) {
      throw new Error("\u7A7A\u95F4\u4E0D\u5B58\u5728\u6216\u52A0\u8F7D\u5931\u8D25");
    }
    spaceData = fresh.spaceData;
  } else if (usedLocal) {
    void fetchSpaceAction({ spaceId: normalizedSpaceId, fresh: true }, thunkAPI).then((result) => {
      if (!result?.spaceData) return;
      const state3 = thunkAPI.getState()?.space;
      if (!state3) return;
      if (normalizeSpaceId(state3.currentSpaceId || "") !== normalizedSpaceId) {
        return;
      }
      if (getSpaceUpdatedAt(result.spaceData) < getSpaceUpdatedAt(state3.currentSpace)) {
        return;
      }
      thunkAPI.dispatch({
        type: "space/fetchSpace/fulfilled",
        payload: {
          spaceId: normalizedSpaceId,
          spaceData: result.spaceData
        },
        meta: {
          arg: { spaceId: normalizedSpaceId, fresh: true },
          requestId: `changeSpace-revalidate-${normalizedSpaceId}`,
          requestStatus: "fulfilled"
        }
      });
    }).catch(() => {
    });
  }
  const sidebarState = await sidebarPromise;
  return {
    spaceId: normalizedSpaceId,
    spaceData,
    sidebarState
  };
};

// packages/create/space/spaceThunks.ts
var dedupeMemberSpaces = (memberSpaces) => {
  const membershipMap = /* @__PURE__ */ new Map();
  memberSpaces.forEach((space) => {
    const nextUpdatedAt2 = toTimestampMs(
      space.spaceUpdatedAt ?? space.memberUpdatedAt ?? space.updatedAt ?? space.createdAt ?? space.joinedAt
    );
    const prev = membershipMap.get(space.spaceId);
    const prevUpdatedAt = prev ? toTimestampMs(
      prev.spaceUpdatedAt ?? prev.memberUpdatedAt ?? prev.updatedAt ?? prev.createdAt ?? prev.joinedAt
    ) : -1;
    if (!prev || nextUpdatedAt2 >= prevUpdatedAt) {
      membershipMap.set(space.spaceId, space);
    }
  });
  return Array.from(membershipMap.values());
};
var createSpaceThunks = (create) => ({
  // --- 读取当前设备下的空间侧边栏状态 ---
  fetchSpaceSidebarState: create.asyncThunk(fetchSpaceSidebarStateAction, {
    fulfilled: (state3, action2) => {
      state3.collapsedCategories = action2.payload.collapsedCategories;
    },
    rejected: (state3, action2) => {
      console.error("\u83B7\u53D6\u7A7A\u95F4\u4FA7\u8FB9\u680F\u72B6\u6001\u5931\u8D25:", action2.error.message);
      state3.collapsedCategories = {};
    }
  }),
  // --- 切换空间 (核心操作) ---
  changeSpace: create.asyncThunk(changeSpaceAction, {
    pending: (state3, action2) => {
      const newSpaceId = normalizeSpaceId(action2.meta.arg);
      if (state3.currentSpaceId !== newSpaceId) {
        state3.loading = true;
        state3.currentSpace = null;
      }
      state3.error = void 0;
    },
    fulfilled: (state3, action2) => {
      state3.currentSpaceId = action2.payload.spaceId;
      state3.currentSpace = action2.payload.spaceData;
      state3.collapsedCategories = action2.payload.sidebarState?.collapsedCategories || {};
      state3.initialized = true;
      state3.loading = false;
    },
    rejected: (state3, action2) => {
      state3.error = action2.error.message || "\u5207\u6362\u7A7A\u95F4\u5931\u8D25";
      state3.initialized = true;
      state3.loading = false;
      state3.currentSpaceId = null;
      state3.currentSpace = null;
      state3.collapsedCategories = {};
    }
  }),
  // ... (保留后面的 actions 不变，只需对齐缩进)
  // --- 其他核心空间操作 ---
  addSpace: create.asyncThunk(addSpaceAction, {
    fulfilled: (state3, action2) => {
      state3.memberSpaces = dedupeMemberSpaces([
        ...state3.memberSpaces || [],
        action2.payload
      ]);
    },
    pending: (state3) => {
      state3.loading = true;
    },
    rejected: (state3, action2) => {
      state3.loading = false;
      state3.error = action2.error.message;
    }
  }),
  deleteSpace: create.asyncThunk(deleteSpaceAction, {
    fulfilled: (state3, action2) => {
      const normalizedSpaceId = normalizeSpaceId(action2.payload.spaceId);
      const normalizedCurrentSpaceId = state3.currentSpaceId ? normalizeSpaceId(state3.currentSpaceId) : null;
      if (state3.memberSpaces) {
        state3.memberSpaces = state3.memberSpaces.filter(
          (space) => normalizeSpaceId(space.spaceId) !== normalizedSpaceId
        );
      }
      if (normalizedCurrentSpaceId === normalizedSpaceId) {
        state3.currentSpace = null;
        state3.currentSpaceId = null;
        state3.collapsedCategories = {};
        state3.viewMode = "all";
      }
    }
  }),
  updateSpace: create.asyncThunk(updateSpaceAction, {
    fulfilled: (state3, action2) => {
      const { updatedSpace, spaceId } = action2.payload;
      if (spaceId === state3.currentSpaceId) {
        state3.currentSpace = updatedSpace;
      }
      if (state3.memberSpaces && updatedSpace.name) {
        state3.memberSpaces = state3.memberSpaces.map(
          (space) => space.spaceId === updatedSpace.id ? { ...space, spaceName: updatedSpace.name } : space
        );
      }
    }
  }),
  fetchSpace: create.asyncThunk(fetchSpaceAction, {
    fulfilled: (state3, action2) => {
      const { spaceId, spaceData } = action2.payload;
      if (!state3.currentSpaceId || state3.currentSpaceId === spaceId) {
        state3.currentSpaceId = spaceId;
        state3.currentSpace = spaceData;
        state3.initialized = true;
      }
    }
  })
});

// packages/create/space/spaceEventCore.ts
var nextSpaceEventTimestamp = (prev, now = Date.now()) => Math.max(now, toTimestampMs(prev) + 1);
var applySpaceEventCore = (state3, ev, now = Date.now()) => {
  if (ev.type === "dialog.created" && ev.dialogKey && ev.dialogId && ev.title) {
    const ts = nextSpaceEventTimestamp(state3.dialogEventTimestamps[ev.dialogId], now);
    if (state3.currentSpace) {
      if (!state3.currentSpace.contents) {
        state3.currentSpace.contents = {};
      }
      state3.currentSpace.contents[ev.dialogKey] = {
        title: ev.title,
        type: "dialog",
        contentKey: ev.dialogKey,
        pinned: false,
        createdAt: ts,
        updatedAt: ts
      };
      state3.currentSpace.updatedAt = ts;
    }
    state3.dialogStatuses[ev.dialogId] = "running";
    state3.dialogEventTimestamps[ev.dialogId] = ts;
    state3.dialogTitles[ev.dialogId] = ev.title;
    delete state3.unreadDialogIds[ev.dialogId];
  }
  if (ev.type === "dialog.done" && ev.dialogId) {
    state3.dialogStatuses[ev.dialogId] = "done";
    state3.dialogEventTimestamps[ev.dialogId] = nextSpaceEventTimestamp(
      state3.dialogEventTimestamps[ev.dialogId],
      now
    );
    state3.unreadDialogIds[ev.dialogId] = true;
  }
  if (ev.type === "dialog.failed" && ev.dialogId) {
    state3.dialogStatuses[ev.dialogId] = "failed";
    state3.dialogEventTimestamps[ev.dialogId] = nextSpaceEventTimestamp(
      state3.dialogEventTimestamps[ev.dialogId],
      now
    );
    state3.unreadDialogIds[ev.dialogId] = true;
  }
};

// packages/create/space/spaceSlice.ts
var DEFAULT_COLLAPSED_CATEGORIES = {
  [UNCATEGORIZED_ID]: false
};
var createSliceWithThunks6 = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator }
});
var FAVORITES_COLLAPSED_STORAGE_KEY = "nolo-sidebar-favorites-collapsed";
var readStoredFavoritesCollapsed = () => {
  try {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(FAVORITES_COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};
var writeStoredFavoritesCollapsed = (collapsed) => {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      FAVORITES_COLLAPSED_STORAGE_KEY,
      collapsed ? "1" : "0"
    );
  } catch {
  }
};
var initialState6 = {
  currentSpaceId: null,
  currentSpace: null,
  memberSpaces: null,
  loading: false,
  membershipStatus: "idle",
  initialized: false,
  collapsedCategories: {},
  viewMode: "all",
  dialogStatuses: {},
  dialogEventTimestamps: {},
  dialogTitles: {},
  // 第一层网页体验：对话切走后仍可在 sidebar 感知其运行中/已完成。
  // 多窗口/多 tab 的已读同步语义暂不在这里定义，等桌面端阶段统一设计。
  unreadDialogIds: {},
  favoritesCollapsed: readStoredFavoritesCollapsed()
};
var getSpaceUpdatedAt2 = (space) => {
  if (!space) return 0;
  return toTimestampMs(space.updatedAt);
};
var getMembershipUpdatedAt = (space) => {
  if (!space) return 0;
  return toTimestampMs(
    space.spaceUpdatedAt ?? space.memberUpdatedAt ?? space.updatedAt ?? space.createdAt ?? space.joinedAt
  );
};
var dedupeMemberSpacesById = (memberSpaces) => {
  const membershipMap = /* @__PURE__ */ new Map();
  memberSpaces.forEach((space) => {
    const prev = membershipMap.get(space.spaceId);
    if (!prev || getMembershipUpdatedAt(space) >= getMembershipUpdatedAt(prev)) {
      membershipMap.set(space.spaceId, space);
    }
  });
  return Array.from(membershipMap.values());
};
var spaceSlice = createSliceWithThunks6({
  name: "space",
  initialState: initialState6,
  reducers: (create) => ({
    ...createSpaceThunks(create),
    ...createCategoryActions(create),
    ...createContentThunks(create),
    ...createMemberThunks(create),
    /** 重置 space 状态（切换用户时调用），清空旧用户数据 */
    resetSpace: create.reducer((state3) => {
      state3.currentSpaceId = null;
      state3.currentSpace = null;
      state3.memberSpaces = null;
      state3.collapsedCategories = {};
      state3.viewMode = "all";
      state3.favoritesCollapsed = readStoredFavoritesCollapsed();
      state3.initialized = false;
      state3.loading = false;
      state3.error = void 0;
      state3.membershipStatus = "idle";
      state3.dialogStatuses = {};
      state3.dialogEventTimestamps = {};
      state3.dialogTitles = {};
      state3.unreadDialogIds = {};
    }),
    /** 切换侧边栏视图模式：全部 vs 分类 */
    setViewMode: create.reducer((state3, action2) => {
      state3.viewMode = action2.payload;
    }),
    /** 切换侧边栏「我的收藏」专区折叠态，并持久化到 localStorage */
    toggleFavoritesCollapse: create.reducer((state3) => {
      state3.favoritesCollapsed = !state3.favoritesCollapsed;
      writeStoredFavoritesCollapsed(state3.favoritesCollapsed);
    }),
    /** 用本地缓存先恢复空间列表，远端校验完成后再由 fetchUserSpaceMemberships.fulfilled 覆盖。 */
    hydrateMemberSpacesFromLocal: create.reducer(
      (state3, action2) => {
        if (state3.memberSpaces !== null || action2.payload.length === 0) return;
        state3.memberSpaces = dedupeMemberSpacesById(action2.payload);
        state3.loading = false;
      }
    ),
    /** 后台内容空间恢复完成后，把补漏的 membership 追加到列表。
     * recoverMembershipsFromContentSpaces 查"本地有内容但缺 membership 索引"的 space，
     * 是一致性兜底，不阻塞首屏。thunk 先返回 verify 后的列表，recover 完成后 dispatch 此 action。
     * 注意：thunk 端已做 actor 校验（账户切换后旧 recover 不 dispatch），且已剥离
     * sourceServer/requiresRemoteSpaceVerification/deviceLocal 等传输字段。 */
    appendRecoveredMemberships: create.reducer(
      (state3, action2) => {
        if (!action2.payload || action2.payload.length === 0) return;
        if (state3.memberSpaces === null) {
          state3.memberSpaces = dedupeMemberSpacesById(action2.payload);
          return;
        }
        state3.memberSpaces = dedupeMemberSpacesById([
          ...state3.memberSpaces,
          ...action2.payload
        ]).sort((a3, b2) => toTimestampMs(b2.joinedAt) - toTimestampMs(a3.joinedAt));
      }
    ),
    /** 进入某个对话后清除其未读提示。
     * 当前阶段只做"网页端切换不停止"的第一层体验：
     * - 侧边栏能看到后台对话 done/failed 后有未读点
     * - 持久化未读写在 dialog 记录的 unreadAt（跨 space / 刷新后仍可见），这里一并 patch 为 null
     * - 真正的跨窗口/多 tab 已读同步，留到桌面端阶段再设计
     */
    markDialogRead: create.asyncThunk(
      async (payload, thunkAPI) => {
        if (payload.dialogKey) {
          try {
            await thunkAPI.dispatch(
              patch({ dbKey: payload.dialogKey, changes: { unreadAt: null } })
            ).unwrap();
          } catch (error) {
            console.warn(
              "[space/markDialogRead] failed to clear unreadAt",
              payload.dialogKey,
              error
            );
          }
        }
        return { dialogId: payload.dialogId };
      },
      {
        // 乐观清除：派发即同步删内存态未读，让点击进入瞬间未读点消失，
        // 不等 patch 网络往返。patch 失败也不会把未读恢复（已在内存层清掉）。
        pending: (state3, action2) => {
          delete state3.unreadDialogIds[action2.meta.arg.dialogId];
        },
        fulfilled: (state3, action2) => {
          delete state3.unreadDialogIds[action2.payload.dialogId];
        }
      }
    ),
    /** 处理来自 SSE 的 space 实时事件，直接 patch Redux state，无需 re-fetch。
     *  纯决策已剥至 spaceEventCore（Wave22），此处仅接线。 */
    applySpaceEvent: create.reducer((state3, action2) => {
      applySpaceEventCore(state3, action2.payload);
    })
  })
});
var {
  toggleCategoryCollapse,
  setAllCategoriesCollapsed,
  changeSpace,
  addSpace,
  deleteSpace,
  updateSpace,
  fetchSpace,
  addCategory,
  deleteCategory,
  updateCategoryName,
  reorderCategories,
  addContentToSpace,
  moveContentToSpace,
  deleteContentFromSpace,
  deleteMultipleContent,
  updateContentTitle,
  updateContentPinned,
  updateContentCategory,
  uploadAndAddFileToSpace,
  fetchUserSpaceMemberships,
  addMember,
  removeMember,
  fetchSpaceSidebarState,
  applySpaceEvent,
  markDialogRead,
  resetSpace,
  setViewMode,
  toggleFavoritesCollapse,
  hydrateMemberSpacesFromLocal,
  appendRecoveredMemberships
} = spaceSlice.actions;
var selectSpaceState = (state3) => state3.space;
var selectCurrentSpaceId = createSelector(
  selectSpaceState,
  (space) => space.viewMode === "all" ? null : space.currentSpaceId
);
var selectCurrentSpace = createSelector(
  [
    selectSpaceState,
    (state3) => {
      const spaceState = state3.space;
      if (spaceState?.viewMode === "all") return void 0;
      if (!spaceState?.currentSpaceId) return void 0;
      const dbKey = createSpaceKey.space(spaceState.currentSpaceId);
      return selectEntities(state3)[dbKey];
    }
  ],
  (space, spaceEntity) => {
    if (space.viewMode === "all") return null;
    if (!space.currentSpaceId) return null;
    if (!space.currentSpace) return spaceEntity || null;
    if (!spaceEntity) return space.currentSpace;
    return getSpaceUpdatedAt2(spaceEntity) > getSpaceUpdatedAt2(space.currentSpace) ? spaceEntity : space.currentSpace;
  }
);
var selectSpaceById = createSelector(
  [
    selectEntities,
    (_state, spaceId) => spaceId
  ],
  (entities, spaceId) => {
    if (!spaceId) return null;
    return entities[createSpaceKey.space(spaceId)] || null;
  }
);
var selectAllMemberSpaces = createSelector(
  selectSpaceState,
  (space) => {
    const memberSpaces = dedupeMemberSpacesById(space.memberSpaces || []);
    return [...memberSpaces].sort((a3, b2) => {
      return getMembershipUpdatedAt(b2) - getMembershipUpdatedAt(a3);
    });
  }
);
var selectOwnedMemberSpaces = createSelector(
  selectAllMemberSpaces,
  (memberSpaces) => memberSpaces.filter((space) => space.role === "owner" /* OWNER */)
);
var selectSpaceLoading = createSelector(
  selectSpaceState,
  (space) => space.loading
);
var selectMemberSpacesLoaded = createSelector(
  selectSpaceState,
  (space) => space.memberSpaces !== null
);
var selectMembershipStatus = createSelector(
  selectSpaceState,
  (space) => space.membershipStatus ?? "idle"
);
var selectSpaceInitialized = createSelector(
  selectSpaceState,
  (space) => space.initialized
);
var selectCollapsedCategories = createSelector(
  selectSpaceState,
  (space) => space.collapsedCategories
);
var selectIsCategoryCollapsed = (categoryId) => createSelector(
  selectCollapsedCategories,
  (collapsed) => collapsed[categoryId] ?? (DEFAULT_COLLAPSED_CATEGORIES[categoryId] ?? true)
);
var selectFavoritesCollapsed = createSelector(
  selectSpaceState,
  (space) => space.favoritesCollapsed ?? false
);
var selectDialogStatuses = createSelector(
  selectSpaceState,
  (space) => space.dialogStatuses ?? {}
);
var selectDialogEventTimestamps = createSelector(
  selectSpaceState,
  (space) => space.dialogEventTimestamps ?? {}
);
var selectDialogTitles = createSelector(
  selectSpaceState,
  (space) => space.dialogTitles ?? {}
);
var selectDialogStatus = (dialogId) => createSelector(selectDialogStatuses, (statuses) => statuses[dialogId]);
var selectUnreadDialogIds = createSelector(
  selectSpaceState,
  (space) => space.unreadDialogIds ?? {}
);
var selectIsDialogUnread = (dialogId) => createSelector(selectUnreadDialogIds, (unreadMap) => unreadMap[dialogId] === true);
var selectDialogStatusFromEntity = (dialogKey) => createSelector(selectEntities, (entities) => {
  const entity = entities[dialogKey];
  return entity?.status;
});
var selectIsDialogUnreadFromEntity = (dialogKey) => createSelector(selectEntities, (entities) => {
  const entity = entities[dialogKey];
  return typeof entity?.unreadAt === "number" && entity.unreadAt > 0;
});
var selectViewMode = createSelector(
  selectSpaceState,
  (space) => space.viewMode
);
var spaceSlice_default = spaceSlice.reducer;

// packages/core/generateMainKey.ts
var import_tweetnacl = __toESM(require_nacl_fast(), 1);
var generateUserIdV1 = (publicKey, username, language, extra = "") => {
  const text = publicKey + username + language + extra;
  const encodedText = new TextEncoder().encode(text);
  const hash = import_tweetnacl.default.hash(encodedText);
  const hexString = Array.from(hash).map((b2) => b2.toString(16).padStart(2, "0")).join("");
  return hexString.slice(0, 10);
};

// packages/core/generateKeyPairFromSeedV1.ts
var import_tweetnacl2 = __toESM(require_nacl_fast(), 1);

// node_modules/js-base64/base64.mjs
var version4 = "3.7.7";
var VERSION = version4;
var _hasBuffer = typeof Buffer === "function";
var _TD = typeof TextDecoder === "function" ? new TextDecoder() : void 0;
var _TE = typeof TextEncoder === "function" ? new TextEncoder() : void 0;
var b64ch = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
var b64chs = Array.prototype.slice.call(b64ch);
var b64tab = ((a3) => {
  let tab = {};
  a3.forEach((c2, i2) => tab[c2] = i2);
  return tab;
})(b64chs);
var b64re = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/;
var _fromCC = String.fromCharCode.bind(String);
var _U8Afrom = typeof Uint8Array.from === "function" ? Uint8Array.from.bind(Uint8Array) : (it) => new Uint8Array(Array.prototype.slice.call(it, 0));
var _mkUriSafe = (src) => src.replace(/=/g, "").replace(/[+\/]/g, (m0) => m0 == "+" ? "-" : "_");
var _tidyB64 = (s3) => s3.replace(/[^A-Za-z0-9\+\/]/g, "");
var btoaPolyfill = (bin) => {
  let u32, c0, c1, c2, asc = "";
  const pad = bin.length % 3;
  for (let i2 = 0; i2 < bin.length; ) {
    if ((c0 = bin.charCodeAt(i2++)) > 255 || (c1 = bin.charCodeAt(i2++)) > 255 || (c2 = bin.charCodeAt(i2++)) > 255)
      throw new TypeError("invalid character found");
    u32 = c0 << 16 | c1 << 8 | c2;
    asc += b64chs[u32 >> 18 & 63] + b64chs[u32 >> 12 & 63] + b64chs[u32 >> 6 & 63] + b64chs[u32 & 63];
  }
  return pad ? asc.slice(0, pad - 3) + "===".substring(pad) : asc;
};
var _btoa = typeof btoa === "function" ? (bin) => btoa(bin) : _hasBuffer ? (bin) => Buffer.from(bin, "binary").toString("base64") : btoaPolyfill;
var _fromUint8Array = _hasBuffer ? (u8a) => Buffer.from(u8a).toString("base64") : (u8a) => {
  const maxargs = 4096;
  let strs = [];
  for (let i2 = 0, l = u8a.length; i2 < l; i2 += maxargs) {
    strs.push(_fromCC.apply(null, u8a.subarray(i2, i2 + maxargs)));
  }
  return _btoa(strs.join(""));
};
var fromUint8Array = (u8a, urlsafe = false) => urlsafe ? _mkUriSafe(_fromUint8Array(u8a)) : _fromUint8Array(u8a);
var cb_utob = (c2) => {
  if (c2.length < 2) {
    var cc = c2.charCodeAt(0);
    return cc < 128 ? c2 : cc < 2048 ? _fromCC(192 | cc >>> 6) + _fromCC(128 | cc & 63) : _fromCC(224 | cc >>> 12 & 15) + _fromCC(128 | cc >>> 6 & 63) + _fromCC(128 | cc & 63);
  } else {
    var cc = 65536 + (c2.charCodeAt(0) - 55296) * 1024 + (c2.charCodeAt(1) - 56320);
    return _fromCC(240 | cc >>> 18 & 7) + _fromCC(128 | cc >>> 12 & 63) + _fromCC(128 | cc >>> 6 & 63) + _fromCC(128 | cc & 63);
  }
};
var re_utob = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g;
var utob = (u2) => u2.replace(re_utob, cb_utob);
var _encode = _hasBuffer ? (s3) => Buffer.from(s3, "utf8").toString("base64") : _TE ? (s3) => _fromUint8Array(_TE.encode(s3)) : (s3) => _btoa(utob(s3));
var encode = (src, urlsafe = false) => urlsafe ? _mkUriSafe(_encode(src)) : _encode(src);
var encodeURI = (src) => encode(src, true);
var re_btou = /[\xC0-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF]{2}|[\xF0-\xF7][\x80-\xBF]{3}/g;
var cb_btou = (cccc) => {
  switch (cccc.length) {
    case 4:
      var cp = (7 & cccc.charCodeAt(0)) << 18 | (63 & cccc.charCodeAt(1)) << 12 | (63 & cccc.charCodeAt(2)) << 6 | 63 & cccc.charCodeAt(3), offset = cp - 65536;
      return _fromCC((offset >>> 10) + 55296) + _fromCC((offset & 1023) + 56320);
    case 3:
      return _fromCC((15 & cccc.charCodeAt(0)) << 12 | (63 & cccc.charCodeAt(1)) << 6 | 63 & cccc.charCodeAt(2));
    default:
      return _fromCC((31 & cccc.charCodeAt(0)) << 6 | 63 & cccc.charCodeAt(1));
  }
};
var btou = (b2) => b2.replace(re_btou, cb_btou);
var atobPolyfill = (asc) => {
  asc = asc.replace(/\s+/g, "");
  if (!b64re.test(asc))
    throw new TypeError("malformed base64.");
  asc += "==".slice(2 - (asc.length & 3));
  let u24, bin = "", r1, r2;
  for (let i2 = 0; i2 < asc.length; ) {
    u24 = b64tab[asc.charAt(i2++)] << 18 | b64tab[asc.charAt(i2++)] << 12 | (r1 = b64tab[asc.charAt(i2++)]) << 6 | (r2 = b64tab[asc.charAt(i2++)]);
    bin += r1 === 64 ? _fromCC(u24 >> 16 & 255) : r2 === 64 ? _fromCC(u24 >> 16 & 255, u24 >> 8 & 255) : _fromCC(u24 >> 16 & 255, u24 >> 8 & 255, u24 & 255);
  }
  return bin;
};
var _atob = typeof atob === "function" ? (asc) => atob(_tidyB64(asc)) : _hasBuffer ? (asc) => Buffer.from(asc, "base64").toString("binary") : atobPolyfill;
var _toUint8Array = _hasBuffer ? (a3) => _U8Afrom(Buffer.from(a3, "base64")) : (a3) => _U8Afrom(_atob(a3).split("").map((c2) => c2.charCodeAt(0)));
var toUint8Array = (a3) => _toUint8Array(_unURI(a3));
var _decode = _hasBuffer ? (a3) => Buffer.from(a3, "base64").toString("utf8") : _TD ? (a3) => _TD.decode(_toUint8Array(a3)) : (a3) => btou(_atob(a3));
var _unURI = (a3) => _tidyB64(a3.replace(/[-_]/g, (m0) => m0 == "-" ? "+" : "/"));
var decode = (src) => _decode(_unURI(src));
var isValid2 = (src) => {
  if (typeof src !== "string")
    return false;
  const s3 = src.replace(/\s+/g, "").replace(/={0,2}$/, "");
  return !/[^\s0-9a-zA-Z\+/]/.test(s3) || !/[^\s0-9a-zA-Z\-_]/.test(s3);
};
var _noEnum = (v) => {
  return {
    value: v,
    enumerable: false,
    writable: true,
    configurable: true
  };
};
var extendString = function() {
  const _add = (name, body) => Object.defineProperty(String.prototype, name, _noEnum(body));
  _add("fromBase64", function() {
    return decode(this);
  });
  _add("toBase64", function(urlsafe) {
    return encode(this, urlsafe);
  });
  _add("toBase64URI", function() {
    return encode(this, true);
  });
  _add("toBase64URL", function() {
    return encode(this, true);
  });
  _add("toUint8Array", function() {
    return toUint8Array(this);
  });
};
var extendUint8Array = function() {
  const _add = (name, body) => Object.defineProperty(Uint8Array.prototype, name, _noEnum(body));
  _add("toBase64", function(urlsafe) {
    return fromUint8Array(this, urlsafe);
  });
  _add("toBase64URI", function() {
    return fromUint8Array(this, true);
  });
  _add("toBase64URL", function() {
    return fromUint8Array(this, true);
  });
};
var extendBuiltins = () => {
  extendString();
  extendUint8Array();
};
var gBase64 = {
  version: version4,
  VERSION,
  atob: _atob,
  atobPolyfill,
  btoa: _btoa,
  btoaPolyfill,
  fromBase64: decode,
  toBase64: encode,
  encode,
  encodeURI,
  encodeURL: encodeURI,
  utob,
  btou,
  decode,
  isValid: isValid2,
  fromUint8Array,
  toUint8Array,
  extendString,
  extendUint8Array,
  extendBuiltins
};

// packages/core/generateKeyPairFromSeedV1.ts
var generateKeyPairFromSeedV1 = (seedData) => {
  const seed = new TextEncoder().encode(seedData);
  const hashSeed = import_tweetnacl2.default.hash(seed);
  const seed32 = hashSeed.slice(0, 32);
  const keyPair = import_tweetnacl2.default.sign.keyPair.fromSeed(seed32);
  return {
    publicKey: gBase64.fromUint8Array(keyPair.publicKey, true),
    secretKey: gBase64.fromUint8Array(keyPair.secretKey, true)
  };
};

// packages/core/password.ts
var import_pbkdf2 = __toESM(require_pbkdf2(), 1);
var import_enc_base64 = __toESM(require_enc_base64(), 1);
var import_sha512 = __toESM(require_sha512(), 1);
var import_core = __toESM(require_core(), 1);

// packages/core/config.ts
var providerName = "nolotus";
var slogonforYou = "The goodness or badness of this world concerns every individual.";
var AUTH_VERSION = {
  "1": {
    iterations: 1e4,
    salt: providerName + slogonforYou,
    keylen: 32
  }
};
var SALT = AUTH_VERSION[1].salt;

// packages/core/password.ts
var SHA512Algo = import_core.default.algo.SHA512;
if (!SHA512Algo) {
  throw new Error(
    "crypto-js/sha512 not registered; subpath import order broken"
  );
}
var hashPasswordV1 = async (password) => {
  const hash = (0, import_pbkdf2.default)(password, SALT, {
    keySize: 256 / AUTH_VERSION[1].keylen,
    iterations: AUTH_VERSION[1].iterations,
    hasher: SHA512Algo
  });
  return hash.toString(import_enc_base64.default);
};

// packages/chat/dialog/composerImageDraftStore.ts
var draftsByDialogKey = {};
function getComposerImageDraft(dialogKey) {
  if (!dialogKey) return [];
  const draft = draftsByDialogKey[dialogKey];
  return draft ? draft.items.map((item) => ({ ...item })) : [];
}
function setComposerImageDraft(dialogKey, items) {
  if (!dialogKey) return;
  if (items.length === 0) {
    delete draftsByDialogKey[dialogKey];
    return;
  }
  draftsByDialogKey[dialogKey] = {
    items: items.map((item) => ({ ...item }))
  };
}
function clearComposerImageDraft(dialogKey) {
  if (!dialogKey) return;
  const existing = draftsByDialogKey[dialogKey];
  if (existing) {
    for (const item of existing.items) {
      if (item.previewUrl.startsWith("blob:") && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(item.previewUrl);
      }
    }
  }
  delete draftsByDialogKey[dialogKey];
}
function clearAllComposerImageDrafts() {
  for (const key of Object.keys(draftsByDialogKey)) {
    clearComposerImageDraft(key);
  }
}

// packages/database/sync/syncJobRegistry.ts
var normalizeId = (value) => asTrimmedString(value);
var nextJobSeq = 0;
var allocateJobId = () => {
  nextJobSeq += 1;
  return `sync-job-${nextJobSeq}`;
};
var toPublicJob = (job) => ({
  id: job.id,
  accountUserId: job.accountUserId,
  label: job.label,
  startedAt: job.startedAt,
  signal: job.controller.signal,
  abort: (reason) => {
    if (!job.controller.signal.aborted) {
      job.controller.abort(reason);
    }
  }
});
var toRegistration = (job) => ({
  id: job.id,
  accountUserId: job.accountUserId,
  label: job.label,
  startedAt: job.startedAt,
  signal: job.controller.signal
});
function createSyncJobRegistry(options) {
  const now = options?.now ?? Date.now;
  const jobs = /* @__PURE__ */ new Map();
  const drop = (id) => {
    const job = jobs.get(id);
    if (!job) return;
    job.controller.signal.removeEventListener("abort", job.onAbort);
    jobs.delete(id);
  };
  return {
    register(input = {}) {
      const requestedId = normalizeId(input.id);
      const id = requestedId || allocateJobId();
      if (jobs.has(id)) {
        throw new Error(`sync job already registered: ${id}`);
      }
      const ownsController = !input.controller;
      const controller = input.controller ?? new AbortController();
      const accountUserId = normalizeId(input.accountUserId) || void 0;
      const label = normalizeId(input.label) || void 0;
      const internal = {
        id,
        accountUserId,
        label,
        startedAt: now(),
        controller,
        ownsController,
        onAbort: () => {
          drop(id);
        }
      };
      controller.signal.addEventListener("abort", internal.onAbort, { once: true });
      if (controller.signal.aborted) {
        return toPublicJob(internal);
      }
      jobs.set(id, internal);
      return toPublicJob(internal);
    },
    get(id) {
      const key = normalizeId(id);
      if (!key) return null;
      const job = jobs.get(key);
      return job ? toPublicJob(job) : null;
    },
    list(filter) {
      const accountUserId = normalizeId(filter?.accountUserId);
      return Array.from(jobs.values()).filter((job) => {
        if (!accountUserId) return true;
        return job.accountUserId === accountUserId;
      }).map(toRegistration).sort(
        (left, right) => left.startedAt - right.startedAt || left.id.localeCompare(right.id)
      );
    },
    cancel(id, reason) {
      const key = normalizeId(id);
      if (!key) return false;
      const job = jobs.get(key);
      if (!job) return false;
      if (!job.controller.signal.aborted) {
        job.controller.abort(reason ?? new Error("sync job cancelled"));
      } else {
        drop(key);
      }
      return true;
    },
    cancelByAccountUserId(accountUserId, reason) {
      const key = normalizeId(accountUserId);
      if (!key) return 0;
      const ids = Array.from(jobs.values()).filter((job) => job.accountUserId === key).map((job) => job.id);
      let cancelled2 = 0;
      for (const id of ids) {
        if (this.cancel(id, reason)) cancelled2 += 1;
      }
      return cancelled2;
    },
    cancelAll(reason) {
      const ids = Array.from(jobs.keys());
      let cancelled2 = 0;
      for (const id of ids) {
        if (this.cancel(id, reason)) cancelled2 += 1;
      }
      return cancelled2;
    },
    unregister(id) {
      const key = normalizeId(id);
      if (!key) return false;
      if (!jobs.has(key)) return false;
      drop(key);
      return true;
    },
    size() {
      return jobs.size;
    }
  };
}
var defaultSyncJobRegistry = createSyncJobRegistry();
function cancelAllSyncJobs(reason) {
  return defaultSyncJobRegistry.cancelAll(
    reason ?? new Error("auth-scoped sync cancelled")
  );
}
function getDefaultSyncJobRegistry() {
  return defaultSyncJobRegistry;
}

// packages/auth/resetAuthScopedClientState.ts
var resetAuthScopedClientState = async (dispatch) => {
  cancelAllSyncJobs();
  clearSyncMappings();
  await dispatch(abortAllMessages({ all: true })).unwrap();
  clearPendingAttachments({ all: true });
  clearAllComposerImageDrafts();
  dispatch(clearDialogState());
  clearPendingUserInputQueue({ all: true });
  dispatch(resetMsgs({ all: true }));
  clearWorkflow();
  resetFavorites();
  dispatch(resetSpace());
};

// packages/core/crypto.ts
var import_tweetnacl3 = __toESM(require_nacl_fast(), 1);
var verifySignedMessage = (signedMessageBase64, publicKeyBase64) => {
  const message = import_tweetnacl3.default.sign.open(
    gBase64.toUint8Array(signedMessageBase64),
    gBase64.toUint8Array(publicKeyBase64)
  );
  if (!message) throw new Error("Decoding failed");
  return new TextDecoder().decode(message);
};
var detachedSign = (message, secretKeyBase64) => {
  const signature = import_tweetnacl3.default.sign.detached(
    new TextEncoder().encode(message),
    gBase64.toUint8Array(secretKeyBase64)
  );
  return gBase64.fromUint8Array(signature, true);
};

// packages/auth/token.ts
var buildPersistentAuthTokenPayload = (payload, nowSec = Math.floor(Date.now() / 1e3)) => ({
  ...payload,
  iat: nowSec,
  nbf: nowSec
});
var signToken = (payload, secretKey) => {
  const encodedPayload = gBase64.encode(JSON.stringify(payload));
  const signature = detachedSign(encodedPayload, secretKey);
  return `${encodedPayload}.${signature}`;
};
var parseToken = (token) => {
  try {
    const [payloadBase64] = token.split(".");
    return JSON.parse(gBase64.decode(payloadBase64));
  } catch {
    return null;
  }
};

// packages/auth/action/signUpAction.ts
var TIMEOUT2 = 5e3;
var getSignUpErrorMessage = async (response) => {
  try {
    const payload = await response.clone().json();
    if (typeof payload?.error === "string" && payload.error.trim()) {
      return payload.error;
    }
    if (typeof payload?.message === "string" && payload.message.trim()) {
      return payload.message;
    }
  } catch {
  }
  try {
    const text = (await response.text()).trim();
    if (text) return text;
  } catch {
  }
  return `\u6CE8\u518C\u5931\u8D25\uFF0C\u670D\u52A1\u5668\u54CD\u5E94\u72B6\u6001\u7801\uFF1A${response.status}`;
};
var getPublicIp = async () => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.ip || null;
  } catch {
    return null;
  }
};
var signUpToServer = async (server, sendData, nolotusPubKey, signal) => {
  const response = await fetch(`${server}${API_VERSION}/users/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...sendData?.clientIp ? { "X-Client-IP": String(sendData.clientIp) } : {}
    },
    body: JSON.stringify(sendData),
    signal
  });
  if (!response.ok) {
    throw new Error(await getSignUpErrorMessage(response));
  }
  const { encryptedData } = await response.json();
  const decryptedData = await verifySignedMessage(
    encryptedData,
    nolotusPubKey
  );
  const result = JSON.parse(decryptedData);
  return result;
};
var signUpToBackupServers = (servers, sendData, nolotusPubKey) => {
  servers.forEach((server) => {
    const abortController = new AbortController();
    const timeoutId = setTimeout(
      () => abortController.abort(),
      TIMEOUT2
    );
    signUpToServer(server, sendData, nolotusPubKey, abortController.signal).then((result) => {
      clearTimeout(timeoutId);
      if (!result) {
      }
    }).catch(() => {
      clearTimeout(timeoutId);
    });
  });
};
var signUpAction = async (user, thunkAPI) => {
  const { username, locale: locale2, password, email, inviterId } = user;
  const state3 = thunkAPI.getState();
  const tokenManager = thunkAPI.extra.tokenManager;
  const encryptionKey = await hashPasswordV1(password);
  const { publicKey, secretKey } = generateKeyPairFromSeedV1(
    username + encryptionKey + locale2
  );
  const clientIp = await getPublicIp();
  const sendData = {
    username,
    publicKey,
    locale: locale2,
    email,
    inviterId,
    clientIp
  };
  const nolotusPubKey = "pqjbGua2Rp-wkh3Vip1EBV6p4ggZWtWvGyNC37kKPus";
  const currentServer = selectRemoteServer(state3);
  const configuredSyncServers = selectRemoteSyncServers(state3) ?? [];
  const mainServers = getAllServers(currentServer, []);
  const mainServer = mainServers[0];
  if (!mainServer) {
    throw new Error("No available server for sign up (possibly offline).");
  }
  const mainAbortController = new AbortController();
  const mainTimeoutId = setTimeout(() => mainAbortController.abort(), TIMEOUT2);
  let remoteData;
  try {
    remoteData = await signUpToServer(
      mainServer,
      sendData,
      nolotusPubKey,
      mainAbortController.signal
    );
  } finally {
    clearTimeout(mainTimeoutId);
  }
  if (!remoteData) {
    throw new Error("Failed to register on current server");
  }
  const localUserId = generateUserIdV1(publicKey, username, locale2);
  const isValid3 = remoteData.publicKey === publicKey && remoteData.username === username && remoteData.userId === localUserId;
  if (!isValid3) {
    throw new Error("Server data does not match local data");
  }
  const backupCandidates = getAllServers(void 0, configuredSyncServers);
  const backupServers = backupCandidates.filter((s3) => s3 !== mainServer);
  if (backupServers.length > 0) {
    Promise.resolve().then(() => {
      signUpToBackupServers(backupServers, sendData, nolotusPubKey);
    });
  }
  const nowSec = Math.floor(Date.now() / 1e3);
  const token = signToken(
    buildPersistentAuthTokenPayload(
      {
        userId: localUserId,
        username,
        publicKey,
        tokenVersion: Math.max(
          0,
          Math.floor(asOptionalFiniteNumber(remoteData.tokenVersion) ?? 0)
        )
      },
      nowSec
    ),
    secretKey
  );
  await resetAuthScopedClientState(thunkAPI.dispatch);
  await tokenManager.storeToken(token);
  const parsedUser = parseToken(token);
  return { user: parsedUser, token };
};

// packages/auth/routes.ts
var authRoutes = {
  login: {
    path: `${API_VERSION}/users/login`,
    method: "POST",
    createPath: () => `${API_VERSION}/users/login`
  },
  signup: {
    path: `${API_VERSION}/users/signup`,
    method: "POST",
    createPath: () => `${API_VERSION}/users/signup`
  },
  users: {
    cliLoginStart: {
      path: `${API_VERSION}/users/cli-login/start`,
      method: "POST",
      createPath: () => `${API_VERSION}/users/cli-login/start`
    },
    cliLoginAuthorize: {
      path: `${API_VERSION}/users/cli-login/authorize`,
      method: "POST",
      createPath: () => `${API_VERSION}/users/cli-login/authorize`
    },
    cliLoginPoll: {
      path: `${API_VERSION}/users/cli-login/poll`,
      method: "POST",
      createPath: () => `${API_VERSION}/users/cli-login/poll`
    },
    list: {
      path: `${API_VERSION}/users`,
      method: "GET",
      createPath: () => `${API_VERSION}/users`
    },
    usageReport: {
      path: `${API_VERSION}/users/usage-report`,
      method: "GET",
      createPath: () => `${API_VERSION}/users/usage-report`
    },
    growthReport: {
      path: `${API_VERSION}/users/growth-report`,
      method: "GET",
      createPath: () => `${API_VERSION}/users/growth-report`
    },
    providerBillingHealth: {
      path: `${API_VERSION}/users/provider-billing-health`,
      method: "GET",
      createPath: () => `${API_VERSION}/users/provider-billing-health`
    },
    providerBillingDrilldown: {
      path: `${API_VERSION}/users/provider-billing-drilldown`,
      method: "GET",
      createPath: () => `${API_VERSION}/users/provider-billing-drilldown`
    },
    providerCredentials: {
      path: `${API_VERSION}/users/provider-credentials`,
      method: "GET",
      createPath: () => `${API_VERSION}/users/provider-credentials`
    },
    providerCredentialLifecycle: {
      path: `${API_VERSION}/users/provider-credentials/lifecycle`,
      method: "POST",
      createPath: () => `${API_VERSION}/users/provider-credentials/lifecycle`
    },
    billingAnomalyLifecycle: {
      path: `${API_VERSION}/users/billing-anomalies/lifecycle`,
      method: "POST",
      createPath: () => `${API_VERSION}/users/billing-anomalies/lifecycle`
    },
    billingAnomalyDrilldown: {
      path: `${API_VERSION}/users/billing-anomalies/drilldown`,
      method: "GET",
      createPath: () => `${API_VERSION}/users/billing-anomalies/drilldown`
    },
    billingAnomalyAudit: {
      path: `${API_VERSION}/users/billing-anomalies/audit`,
      method: "POST",
      createPath: () => `${API_VERSION}/users/billing-anomalies/audit`
    },
    detail: {
      path: `${API_VERSION}/users/:userId`,
      method: "GET",
      createPath: (params) => `${API_VERSION}/users/${params.userId}`
    },
    sessionRevoke: {
      path: `${API_VERSION}/users/session-revoke`,
      method: "POST",
      createPath: () => `${API_VERSION}/users/session-revoke`
    },
    transfer: {
      path: `${API_VERSION}/users/:userId/transfer`,
      method: "POST",
      createPath: (params) => `${API_VERSION}/users/${params.userId}/transfer`
    },
    delete: {
      path: `${API_VERSION}/users/:userId`,
      method: "DELETE",
      createPath: (params) => `${API_VERSION}/users/${params.userId}`
    },
    disable: {
      path: `${API_VERSION}/users/:userId/disable`,
      method: "POST",
      createPath: (params) => `${API_VERSION}/users/${params.userId}/disable`
    },
    enable: {
      path: `${API_VERSION}/users/:userId/enable`,
      method: "POST",
      createPath: (params) => `${API_VERSION}/users/${params.userId}/enable`
    },
    adminPermissions: {
      path: `${API_VERSION}/users/:userId/admin-permissions`,
      method: "POST",
      createPath: (params) => `${API_VERSION}/users/${params.userId}/admin-permissions`
    },
    sendEmail: {
      path: `${API_VERSION}/users/send-email`,
      method: "POST",
      createPath: () => `${API_VERSION}/users/send-email`
    },
    spaceInvite: {
      path: `${API_VERSION}/users/space-invite`,
      method: "POST",
      createPath: () => `${API_VERSION}/users/space-invite`
    },
    spaceInviteStatus: {
      path: `${API_VERSION}/users/space-invite/status`,
      method: "GET",
      createPath: () => `${API_VERSION}/users/space-invite/status`
    },
    spaceInviteAccept: {
      path: `${API_VERSION}/users/space-invite/accept`,
      method: "POST",
      createPath: () => `${API_VERSION}/users/space-invite/accept`
    },
    emailPreferencesGet: {
      path: `${API_VERSION}/users/email-preferences`,
      method: "GET",
      createPath: () => `${API_VERSION}/users/email-preferences`
    },
    emailPreferencesUpdate: {
      path: `${API_VERSION}/users/email-preferences`,
      method: "POST",
      createPath: () => `${API_VERSION}/users/email-preferences`
    },
    emailReport: {
      path: `${API_VERSION}/users/email-report`,
      method: "GET",
      createPath: () => `${API_VERSION}/users/email-report`
    },
    emailRetryRun: {
      path: `${API_VERSION}/users/email-retry/run`,
      method: "POST",
      createPath: () => `${API_VERSION}/users/email-retry/run`
    },
    emailReplayFailures: {
      path: `${API_VERSION}/users/email-replay-failures`,
      method: "POST",
      createPath: () => `${API_VERSION}/users/email-replay-failures`
    },
    emailConfigGet: {
      path: `${API_VERSION}/users/email-config`,
      method: "GET",
      createPath: () => `${API_VERSION}/users/email-config`
    },
    emailConfigUpdate: {
      path: `${API_VERSION}/users/email-config`,
      method: "POST",
      createPath: () => `${API_VERSION}/users/email-config`
    },
    emailUnsubscribe: {
      path: `${API_VERSION}/users/email-unsubscribe`,
      method: "GET",
      createPath: () => `${API_VERSION}/users/email-unsubscribe`
    },
    rechargeHistory: {
      path: `${API_VERSION}/users/:userId/recharge-history`,
      method: "POST",
      createPath: (params) => `${API_VERSION}/users/${params.userId}/recharge-history`
    }
  }
};

// packages/auth/client/loginRequest.ts
var loginRequest = async (currentServer, data) => {
  const path = authRoutes.login.createPath();
  const fullUrl = `${currentServer}${path}`;
  console.log(`[Auth] loginRequest \u2192 ${fullUrl}`, {
    userId: data?.userId,
    hasToken: Boolean(data?.token)
  });
  try {
    const response = await fetch(fullUrl, {
      method: authRoutes.login.method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    console.log(`[Auth] loginRequest \u2190 ${response.status} ${response.statusText} from ${fullUrl}`);
    return response;
  } catch (error) {
    console.error(`[Auth] loginRequest \u2717 network error from ${fullUrl}:`, error?.message || error);
    throw error;
  }
};

// packages/auth/authSlice.ts
var getLoginErrorMessage = async (response) => {
  try {
    const payload = await response.clone().json();
    if (typeof payload?.error === "string" && payload.error.trim()) {
      return payload.error;
    }
    if (typeof payload?.message === "string" && payload.message.trim()) {
      return payload.message;
    }
  } catch {
  }
  try {
    const text = (await response.text()).trim();
    if (text) return text;
  } catch {
  }
  return `\u670D\u52A1\u5668\u54CD\u5E94\u72B6\u6001\u7801\uFF1A${response.status}`;
};
var initialState7 = {
  currentUser: null,
  users: [],
  isLoggedIn: false,
  currentToken: null,
  isLoading: false,
  isInitialized: false
};
var isUser = (value) => typeof value === "object" && value !== null && typeof value.userId === "string";
var parseUserToken = (token) => {
  const parsed = parseToken(token);
  return isUser(parsed) ? parsed : null;
};
var parseStoredTokenEntries = (tokens) => {
  const seenUserIds = /* @__PURE__ */ new Set();
  return tokens.flatMap((token) => {
    const user = parseUserToken(token);
    if (user && seenUserIds.has(user.userId)) return [];
    if (user) seenUserIds.add(user.userId);
    return user ? [{ token, user }] : [];
  });
};
var compactUsers = (users) => users.filter(isUser);
var compactUniqueUsers = (users) => {
  const seenUserIds = /* @__PURE__ */ new Set();
  return compactUsers(users).filter((user) => {
    if (seenUserIds.has(user.userId)) return false;
    seenUserIds.add(user.userId);
    return true;
  });
};
function mergeUserState(existingUser, nextUser) {
  if (!existingUser || existingUser.userId !== nextUser.userId) {
    return nextUser;
  }
  return {
    ...existingUser,
    ...nextUser
  };
}
var createSliceWithThunks7 = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator }
});
var authSlice = createSliceWithThunks7({
  name: "auth",
  initialState: initialState7,
  reducers: (create) => ({
    signIn: create.asyncThunk(
      async (input, thunkAPI) => {
        const { tokenManager } = thunkAPI.extra;
        const state3 = thunkAPI.getState();
        const startTime = Date.now();
        console.log("[Auth] signIn thunk started");
        try {
          const { username, locale: locale2, localeCandidates: rawLocaleCandidates, password } = input;
          const hashStart = Date.now();
          const encryptionKey = await hashPasswordV1(password);
          console.log(`[Auth] hashPasswordV1 took ${Date.now() - hashStart}ms`);
          const nowSec = Math.floor(Date.now() / 1e3);
          const currentServer = selectRemoteServer(state3);
          console.log(`[Auth] currentServer resolved to: ${currentServer}`);
          const localeCandidates = [
            ...new Set(
              asTrimmedNonEmptyStringArray(
                Array.isArray(rawLocaleCandidates) && rawLocaleCandidates.length > 0 ? rawLocaleCandidates : [locale2]
              )
            )
          ];
          console.log(`[Auth] localeCandidates: [${localeCandidates.join(", ")}]`);
          let matchedPublicKey = null;
          let matchedSecretKey = null;
          let matchedUserId = null;
          let res = null;
          let preferredErrorMessage = null;
          let notFoundErrorMessage = null;
          for (const loginLocale of localeCandidates) {
            const keyGenStart = Date.now();
            const { publicKey, secretKey } = generateKeyPairFromSeedV1(
              username + encryptionKey + loginLocale
            );
            console.log(
              `[Auth] generateKeyPairFromSeedV1 took ${Date.now() - keyGenStart}ms for locale ${loginLocale}`
            );
            const userId = generateUserIdV1(publicKey, username, loginLocale);
            console.log(`[Auth] generated userId=${userId} (username=${username}, locale=${loginLocale})`);
            const loginToken = signToken(
              buildPersistentAuthTokenPayload({ userId, publicKey, username }, nowSec),
              secretKey
            );
            console.log(`[Auth] Sending loginRequest to: ${currentServer} (locale=${loginLocale})`);
            const networkStart = Date.now();
            const attemptResponse = await loginRequest(currentServer, { userId, token: loginToken });
            console.log(
              `[Auth] loginRequest took ${Date.now() - networkStart}ms, status: ${attemptResponse.status}, locale=${loginLocale}`
            );
            if (attemptResponse.status === 200) {
              matchedPublicKey = publicKey;
              matchedSecretKey = secretKey;
              matchedUserId = userId;
              res = attemptResponse;
              break;
            }
            const errorMessage = await getLoginErrorMessage(attemptResponse);
            if (attemptResponse.status === 404) {
              notFoundErrorMessage = errorMessage;
              continue;
            }
            preferredErrorMessage = errorMessage;
          }
          if (!res || !matchedPublicKey || !matchedSecretKey || !matchedUserId) {
            return thunkAPI.rejectWithValue(
              preferredErrorMessage || notFoundErrorMessage || "\u767B\u5F55\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u8D26\u53F7\u4FE1\u606F\u540E\u91CD\u8BD5\u3002"
            );
          }
          const result = await res.json();
          const tokenVersion = Math.max(
            0,
            Math.floor(asOptionalFiniteNumber(result?.tokenVersion) ?? 0)
          );
          const token = signToken(
            buildPersistentAuthTokenPayload(
              { userId: matchedUserId, publicKey: matchedPublicKey, username, tokenVersion },
              Math.floor(Date.now() / 1e3)
            ),
            matchedSecretKey
          );
          const storageStart = Date.now();
          await resetAuthScopedClientState(thunkAPI.dispatch);
          await tokenManager.storeToken(token);
          const parsedUser = parseUserToken(token);
          if (!parsedUser) {
            return thunkAPI.rejectWithValue("\u767B\u5F55\u72B6\u6001\u89E3\u6790\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002");
          }
          console.log(`[Auth] token storage took ${Date.now() - storageStart}ms`);
          console.log(`[Auth] Total signIn thunk took ${Date.now() - startTime}ms`);
          return { token };
        } catch (error) {
          console.error("[Auth] signIn thunk error:", error);
          return thunkAPI.rejectWithValue(toErrorMessage(error));
        }
      },
      {
        pending: (state3) => {
          state3.isLoading = true;
        },
        rejected: (state3) => {
          state3.isLoading = false;
        },
        fulfilled: (state3, action2) => {
          const { token } = action2.payload;
          const user = parseUserToken(token);
          if (!user) {
            state3.isLoading = false;
            return;
          }
          const existingUsers = compactUniqueUsers(state3.users);
          state3.currentUser = mergeUserState(state3.currentUser, user);
          state3.currentToken = token;
          state3.isLoggedIn = true;
          state3.users = [user, ...existingUsers.filter((item) => item.userId !== user.userId)];
          state3.isLoading = false;
        }
      }
    ),
    signUp: create.asyncThunk(signUpAction, {
      /* ... signUp implementation ... */
      fulfilled: (state3, action2) => {
        const { user, token } = action2.payload;
        state3.currentUser = user;
        state3.isLoggedIn = true;
        state3.users.unshift(user);
        state3.currentToken = token;
      }
    }),
    inviteSignUp: create.asyncThunk(() => {
      console.log("inviteSignUp - \u8BE5\u529F\u80FD\u6682\u672A\u5B9E\u73B0");
    }, {}),
    initializeAuth: create.asyncThunk(
      /* ... initializeAuth implementation ... */
      async (_, thunkAPI) => {
        const { tokenManager } = thunkAPI.extra;
        const tokens = await tokenManager.initTokens();
        const tokenEntries = parseStoredTokenEntries(tokens ?? []);
        if (tokenEntries.length !== (tokens?.length ?? 0)) {
          const invalidTokens = (tokens ?? []).filter(
            (token) => !tokenEntries.some((entry) => entry.token === token)
          );
          for (const invalidToken of invalidTokens) {
            await tokenManager.removeToken(invalidToken);
          }
        }
        if (tokenEntries.length > 0) {
          return {
            tokens: tokenEntries.map((entry) => entry.token),
            user: tokenEntries[0]?.user ?? null
          };
        }
        return { tokens: [], user: null };
      },
      {
        // 不设 pending：initialState 已是 false；运行中若重复 dispatch
        // （热更新/重连）会把已 true 的状态打回 false 导致已展示页面闪回
        // PageLoading。只在 fulfilled/rejected 设 true。
        rejected: (state3) => {
          state3.isInitialized = true;
        },
        fulfilled: (state3, action2) => {
          const { tokens, user } = action2.payload;
          if (user) {
            state3.currentUser = user;
            state3.isLoggedIn = true;
          }
          if (tokens && tokens.length > 0) {
            state3.currentToken = tokens[0];
            state3.users = parseStoredTokenEntries(tokens).map((entry) => entry.user);
          }
          state3.isInitialized = true;
        }
      }
    ),
    signOut: create.asyncThunk(
      /* ... signOut implementation ... */
      async (_, thunkAPI) => {
        const { tokenManager } = thunkAPI.extra;
        const state3 = thunkAPI.getState();
        const token = selectCurrentToken(state3);
        await resetAuthScopedClientState(thunkAPI.dispatch);
        if (token) {
          await tokenManager.removeToken(token);
        }
        const remainingTokens = await tokenManager.getTokens();
        return { tokens: remainingTokens };
      },
      {
        fulfilled: (state3, action2) => {
          const { tokens } = action2.payload;
          const otherUsers = compactUniqueUsers(state3.users).filter(
            (user) => user.userId !== state3.currentUser?.userId
          );
          if (otherUsers.length > 0) {
            const nextUser = otherUsers[0];
            const nextToken = tokens.find((t2) => parseUserToken(t2)?.userId === nextUser.userId) || null;
            state3.currentUser = nextUser;
            state3.users = otherUsers;
            state3.currentToken = nextToken;
          } else {
            state3.isLoggedIn = false;
            state3.currentUser = null;
            state3.users = [];
            state3.currentToken = null;
          }
        }
      }
    ),
    replaceCurrentToken: create.asyncThunk(
      async (input, thunkAPI) => {
        const { tokenManager } = thunkAPI.extra;
        const state3 = thunkAPI.getState();
        const currentToken = selectCurrentToken(state3);
        if (currentToken) {
          await tokenManager.removeToken(currentToken);
        }
        await tokenManager.storeToken(input.token);
        return { token: input.token };
      },
      {
        fulfilled: (state3, action2) => {
          const nextUser = parseUserToken(action2.payload.token);
          if (!nextUser) {
            return;
          }
          const existingUsers = compactUniqueUsers(state3.users);
          state3.currentToken = action2.payload.token;
          state3.currentUser = mergeUserState(state3.currentUser, nextUser);
          state3.users = [
            mergeUserState(
              existingUsers.find((item) => item.userId === nextUser.userId),
              nextUser
            ),
            ...existingUsers.filter((item) => item.userId !== nextUser.userId)
          ];
          state3.isLoggedIn = true;
        }
      }
    ),
    changeUser: create.asyncThunk(
      /* ... changeUser implementation ... */
      async (user, thunkAPI) => {
        const { tokenManager } = thunkAPI.extra;
        const { dispatch } = thunkAPI;
        try {
          await resetAuthScopedClientState(dispatch);
          await dispatch(fetchUserSpaceMemberships(user.userId)).unwrap();
        } catch (error) {
          console.warn("Failed to initialize user settings:", error);
        }
        const tokens = await tokenManager.getTokens();
        const updatedToken = tokens.find(
          (t2) => parseUserToken(t2)?.userId === user.userId
        );
        if (!updatedToken) {
          return thunkAPI.rejectWithValue("Token not found for user");
        }
        await tokenManager.removeToken(updatedToken);
        await tokenManager.storeToken(updatedToken);
        return { user, token: updatedToken };
      },
      {
        pending: (state3) => {
          state3.isInitialized = false;
          state3.currentUser = null;
        },
        fulfilled: (state3, action2) => {
          const { user, token } = action2.payload;
          state3.currentUser = user;
          state3.currentToken = token;
          state3.isInitialized = true;
          state3.isLoggedIn = true;
        },
        rejected: (state3) => {
          state3.isInitialized = true;
          state3.isLoggedIn = false;
          state3.currentToken = null;
        }
      }
    ),
    fetchUserProfile: create.asyncThunk(
      /* ... fetchUserProfile implementation ... */
      async (_, thunkAPI) => {
        const state3 = thunkAPI.getState();
        const serverUrl = selectRemoteServer(state3);
        const token = selectCurrentToken(state3);
        const currentUser = selectCurrentUser(state3);
        console.log("[Auth] fetchUserProfile thunk started. User:", currentUser?.userId);
        if (!serverUrl || !token || !currentUser?.userId) {
          return thunkAPI.rejectWithValue(
            "\u65E0\u6CD5\u83B7\u53D6\u7528\u6237\u4FE1\u606F\uFF1A\u7F3A\u5C11\u5FC5\u8981\u53C2\u6570\uFF08\u670D\u52A1\u5668\u5730\u5740\u3001Token\u6216\u7528\u6237ID\uFF09"
          );
        }
        const { userId } = currentUser;
        const path = authRoutes.users.detail.createPath({ userId });
        const url = `${serverUrl}${path}`;
        try {
          const response = await fetchWithTransientReadRetry(url, {
            method: authRoutes.users.detail.method,
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          if (!response.ok) {
            const errorText = await response.text();
            return thunkAPI.rejectWithValue(
              `\u8BF7\u6C42\u5931\u8D25: ${response.status} ${errorText}`
            );
          }
          const profileData = await response.json();
          return {
            userId,
            balance: profileData.balance,
            gptProAccess: profileData.gptProAccess,
            adminPermissions: profileData.adminPermissions
          };
        } catch (error) {
          return thunkAPI.rejectWithValue(
            error.message || "\u83B7\u53D6\u7528\u6237\u4FE1\u606F\u65F6\u53D1\u751F\u672A\u77E5\u9519\u8BEF"
          );
        }
      },
      {
        rejected: (state3, action2) => {
          console.error("\u83B7\u53D6\u7528\u6237 Profile \u5931\u8D25:", action2.payload);
        },
        fulfilled: (state3, action2) => {
          const { userId, balance, gptProAccess, adminPermissions } = action2.payload;
          if (state3.currentUser && state3.currentUser.userId === userId) {
            state3.currentUser.balance = balance;
            state3.currentUser.gptProAccess = gptProAccess;
            state3.currentUser.adminPermissions = adminPermissions;
          }
          const userIndex = state3.users.findIndex(
            (user) => user.userId === userId
          );
          if (userIndex !== -1) {
            state3.users[userIndex].balance = balance;
            state3.users[userIndex].gptProAccess = gptProAccess;
            state3.users[userIndex].adminPermissions = adminPermissions;
          }
        }
      }
    ),
    // 前端临时扣款: 接收一个 cost 数值，从当前用户的余额中扣除。
    // 这可以让 UI 实时显示余额变化，而无需等待下一次从服务器完整刷新。
    deductBalance: create.reducer((state3, action2) => {
      const cost = action2.payload;
      if (state3.currentUser && typeof state3.currentUser.balance === "number") {
        state3.currentUser.balance -= cost;
      }
      if (state3.currentUser) {
        const userInArray = state3.users.find(
          (u2) => u2.userId === state3.currentUser.userId
        );
        if (userInArray && typeof userInArray.balance === "number") {
          userInArray.balance -= cost;
        }
      }
    })
  })
});
var {
  signIn,
  signUp,
  inviteSignUp,
  signOut,
  replaceCurrentToken,
  changeUser,
  initializeAuth,
  fetchUserProfile,
  deductBalance
  // 导出新的 action
} = authSlice.actions;
var authSlice_default = authSlice.reducer;
var selectCurrentUser = (state3) => state3.auth.currentUser;
var selectUsers = (state3) => state3.auth.users;
var selectUserId = (state3) => state3.auth.currentUser?.userId;
var selectIsLoggedIn = (state3) => state3.auth.isLoggedIn;
var selectCurrentToken = (state3) => state3.auth.currentToken;
var selectIsInitialized = (state3) => state3.auth.isInitialized;
var selectCurrentUserBalance = (state3) => state3.auth.currentUser?.balance;

// packages/identity/selectors.cloud.ts
var selectIdentityUserId = (state3) => selectUserId(state3);
var selectIdentityToken = (state3) => selectCurrentToken(state3);
var selectIdentityIsLoggedIn = (state3) => selectIsLoggedIn(state3);
var selectIdentityIsInitialized = (state3) => selectIsInitialized(state3);
var selectIdentityUser = (state3) => selectCurrentUser(state3);

// packages/app/stateViews/runtime.ts
var selectCurrentToken2 = (state3) => {
  if (!state3?.auth) return void 0;
  const token = selectIdentityToken(state3);
  return typeof token === "string" ? token : void 0;
};
var selectCurrentUserId = (state3) => {
  if (!state3?.auth) return void 0;
  const userId = selectIdentityUserId(state3);
  return typeof userId === "string" ? userId : void 0;
};
var EMPTY_SYNC_SERVERS = [];
var selectRuntimeRemoteServer = (state3) => {
  const configuredServer = normalizeKnownServerOrigin(state3.settings?.currentServer) ?? void 0;
  if (!getIsDesktopApp()) return configuredServer || SERVERS.MAIN;
  return isLocalServerUrl(configuredServer) ? SERVERS.MAIN : configuredServer || SERVERS.MAIN;
};
var selectConfiguredSyncServers = (state3) => state3.settings?.syncServers;
var selectRuntimeRemoteSyncServers = createSelector(
  [selectConfiguredSyncServers],
  (syncServers) => {
    if (!Array.isArray(syncServers) || syncServers.length === 0) {
      return EMPTY_SYNC_SERVERS;
    }
    const normalized = syncServers.map(normalizeKnownServerOrigin).filter((server) => !!server);
    if (!getIsDesktopApp()) return normalized;
    return normalized.filter((server) => !isLocalServerUrl(server));
  }
);
var selectLocalRuntimeOrigin = () => {
  if (typeof window !== "undefined" && typeof window.location?.origin === "string" && /^https?:\/\//.test(window.location.origin)) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return void 0;
};
var selectRuntimeSnapshot = createSelector(
  [
    selectCurrentToken2,
    selectCurrentUserId,
    selectRuntimeRemoteServer,
    selectRuntimeRemoteSyncServers,
    selectLocalRuntimeOrigin
  ],
  (currentToken, currentUserId, currentServer, syncServers, localRuntimeOrigin) => ({
    currentToken,
    currentUserId,
    currentServer,
    syncServers,
    localRuntimeOrigin
  })
);
var selectRuntimeCurrentServer = createSelector(
  [selectRuntimeSnapshot],
  (runtime) => runtime.currentServer
);
var selectRuntimeRemoteServers = createSelector(
  [selectRuntimeSnapshot],
  (runtime) => getAllServers(runtime.currentServer, runtime.syncServers)
);

// packages/database/runtimeServerContext.ts
var getRuntimeServerContext = (state3, preferredServerOrigin) => {
  const {
    currentToken,
    currentUserId,
    currentServer,
    syncServers = []
  } = selectRuntimeSnapshot(state3);
  return {
    currentToken,
    currentUserId,
    currentServer,
    syncServers,
    userAuthorityRegistry: resolveRuntimeUserAuthorityRegistry(state3),
    remoteServers: getAllServers(
      currentServer,
      syncServers,
      preferredServerOrigin
    )
  };
};
var resolveRuntimeUserAuthorityRegistry = (state3) => {
  const settingsRegistry = state3.settings?.userAuthorityRegistry;
  if (settingsRegistry && typeof settingsRegistry === "object") {
    return settingsRegistry;
  }
  const userRegistry = state3.auth?.currentUser?.authorityRegistry;
  if (userRegistry && typeof userRegistry === "object") {
    return userRegistry;
  }
  return void 0;
};

// packages/database/actions/read.ts
var updateClientDbIfNewer = async (clientDb, dbKey, remoteData, localData) => {
  if (!clientDb) return;
  try {
    if (isRemoteDataNewer2(remoteData, localData)) {
      await clientDb.put(
        dbKey,
        normalizeReadRecord(dbKey, remoteData, { forCache: true })
      );
    }
  } catch (err2) {
    throw err2;
  }
};
var normalizeReadRecord = (dbKey, data, options = {}) => {
  if (!data || typeof data !== "object") return data;
  const baseRecord = options.forCache ? data : { ...data, dbKey };
  return baseRecord;
};
var isRemoteDataNewer2 = (remoteData, localData) => {
  if (!remoteData || typeof remoteData !== "object") return false;
  if (!localData || typeof localData !== "object") return true;
  return shouldReplaceWithNextRecord(remoteData, localData);
};
var syncLocalDataToServer2 = async (replicationContext, dbKey, localData) => {
  try {
    scheduleExistingRecordReplication({
      currentServer: replicationContext.currentServer,
      syncServers: replicationContext.syncServers,
      dbKey,
      localData,
      state: replicationContext.state
    });
  } catch (err2) {
  }
};
var saveRemoteDataToClientDb = async (clientDb, dbKey, remoteData, serverOrigin) => {
  if (!clientDb) return;
  try {
    const normalizedRemoteData = normalizeReadRecord(dbKey, remoteData, {
      forCache: true
    });
    await clientDb.put(
      dbKey,
      serverOrigin ? {
        ...normalizedRemoteData,
        serverOrigin
      } : normalizedRemoteData
    );
  } catch (err2) {
  }
};
var processRemoteDataInBackground = async (clientDb, dbKey, remotePromises, remoteServers, localData, replicationContext) => {
  if (!clientDb) return;
  try {
    const settledResults = await Promise.allSettled(remotePromises);
    const remoteResult = pickBestSettledRemoteRecord({
      settledResults,
      isBetterCandidate: (current2, latest) => shouldReplaceWithNextRecord(current2, latest)
    });
    const validRemoteData = remoteResult ? remoteResult.data : null;
    const serverOrigin = remoteResult && remoteServers[remoteResult.index] ? remoteServers[remoteResult.index] : void 0;
    if (shouldReplaceLocalWithRemoteRecord({
      localData,
      remoteData: validRemoteData,
      isRemoteNewer: isRemoteDataNewer2
    })) {
      await updateClientDbIfNewer(
        clientDb,
        dbKey,
        serverOrigin ? { ...validRemoteData, serverOrigin } : validRemoteData,
        localData
      );
    }
    if (shouldReplicateLocalRecord({
      localData,
      remoteData: validRemoteData,
      remoteTargetCount: remotePromises.length
    })) {
      await syncLocalDataToServer2(replicationContext, dbKey, localData);
    }
  } catch (err2) {
  }
};
var readAction = async (payload, thunkApi) => {
  const dbKey = payload.dbKey;
  const signal = payload.signal;
  const preferredServerOrigin = payload.preferredServerOrigin;
  if (!dbKey || typeof dbKey !== "string") {
    throw new Error("readAction requires a non-empty dbKey.");
  }
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  const { db: clientDb } = thunkApi.extra;
  if (!clientDb) {
    throw new Error("Client database is not available.");
  }
  const executeRead = async () => {
    const isDialogKey2 = dbKey.startsWith("dialog-") && !dbKey.includes("-msg-");
    const readStartedAt = isDialogKey2 ? Date.now() : 0;
    const state3 = thunkApi.getState();
    const {
      currentToken,
      remoteServers: configuredServers,
      currentServer,
      currentUserId,
      syncServers,
      userAuthorityRegistry
    } = getRuntimeServerContext(state3, preferredServerOrigin);
    const allServers = resolveAgentReadServers({ dbKey, configuredServers });
    const isLoggedIn = !!currentToken;
    const now = Date.now();
    const localData = await fetchFromClientDb(clientDb, dbKey);
    if (isDialogKey2) {
      console.info("[readAction-perf] dialog local-read", {
        dbKey,
        localHit: !!localData,
        localReadMs: Date.now() - readStartedAt,
        serverCount: allServers.length
      });
    }
    const authority = resolveRecordAuthority({
      dbKey,
      record: localData,
      currentUserId,
      currentServer,
      userAuthorityRegistry
    });
    const authorityPlannedServers = planAuthorityReadServers({
      allServers,
      authorityServer: preferredServerOrigin ?? authority.authorityServer,
      serverOrigin: authority.serverOrigin
    });
    const { preferredServer, fallbackServers, orderedServersForLocalHit } = partitionReadServers({
      allServers: authorityPlannedServers,
      preferredServerOrigin: preferredServerOrigin ?? authority.authorityServer
    });
    readRequestManager.cleanupMisses(now);
    readRequestManager.cleanupLocalHitRevalidations(now);
    if (localData) {
      readRequestManager.clearMiss(dbKey);
    } else {
      const retryInMs = readRequestManager.getRetryInMs(dbKey, now);
      if (typeof retryInMs === "number" && retryInMs > 0) {
        logger.debug(
          { dbKey, retryInMs },
          "[readAction] Suppressing repeated miss read"
        );
        throw new Error(
          `Read temporarily suppressed for missing key "${dbKey}".`
        );
      }
    }
    if (authorityPlannedServers.length === 0) {
      if (localData) {
        if (isDialogKey2) {
          console.info("[readAction-perf] dialog offline-local-hit", {
            dbKey,
            totalMs: Date.now() - readStartedAt
          });
        }
        return normalizeReadRecord(dbKey, localData);
      }
      readRequestManager.markMiss(dbKey, now);
      throw new Error(
        `Failed to fetch data for key "${dbKey}" because network is offline and no local data is available.`
      );
    }
    if (localData) {
      const retryInMs = signal?.aborted ? void 0 : readRequestManager.getLocalHitRevalidateInMs(dbKey, now);
      if (!signal?.aborted) {
        if (retryInMs === null) {
          readRequestManager.markLocalHitRevalidated(dbKey, now);
          const remotePromises2 = orderedServersForLocalHit.map(
            (server) => fetchFromServer(
              server,
              dbKey,
              isLoggedIn ? currentToken : void 0,
              signal
            )
          );
          void processRemoteDataInBackground(
            clientDb,
            dbKey,
            remotePromises2,
            orderedServersForLocalHit,
            localData,
            { currentServer, syncServers, state: state3 }
          );
        } else {
          logger.debug(
            { dbKey, retryInMs },
            "[readAction] Skipping frequent local-hit revalidation"
          );
        }
      }
      if (isDialogKey2) {
        console.info("[readAction-perf] dialog local-hit-return", {
          dbKey,
          totalMs: Date.now() - readStartedAt,
          revalidating: retryInMs === null
        });
      }
      return normalizeReadRecord(dbKey, localData);
    }
    if (preferredServer) {
      try {
        const preferredRemoteData = await fetchFromServer(
          preferredServer,
          dbKey,
          isLoggedIn ? currentToken : void 0,
          signal
        );
        if (preferredRemoteData) {
          await saveRemoteDataToClientDb(
            clientDb,
            dbKey,
            preferredRemoteData,
            preferredServer
          );
          readRequestManager.clearMiss(dbKey);
          if (isDialogKey2) {
            console.info("[readAction-perf] dialog preferred-remote-hit", {
              dbKey,
              totalMs: Date.now() - readStartedAt,
              server: preferredServer
            });
          }
          return normalizeReadRecord(dbKey, {
            ...preferredRemoteData,
            serverOrigin: preferredServer
          });
        }
      } catch (error) {
        if (signal?.aborted || isAbortError(error)) {
          throw error;
        }
        if (isReadTimeoutError(error)) {
          logger.warn(
            { dbKey, preferredServer, error: String(error.message) },
            "[readAction] Preferred server timed out; falling back to remaining servers"
          );
        } else {
          logger.warn(
            { dbKey, preferredServer, error: String(error) },
            "[readAction] Preferred server read failed; falling back to remaining servers"
          );
        }
      }
    }
    const remotePromises = fallbackServers.map(
      (server) => fetchFromServer(
        server,
        dbKey,
        isLoggedIn ? currentToken : void 0,
        signal
      )
    );
    const settledResults = await Promise.allSettled(remotePromises);
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    const remoteResult = pickBestSettledRemoteRecord({
      settledResults,
      isBetterCandidate: (current2, latest) => shouldReplaceWithNextRecord(current2, latest)
    });
    if (remoteResult) {
      const { data: validRemoteData } = remoteResult;
      const serverOrigin = fallbackServers[remoteResult.index];
      if (!signal?.aborted) {
        await saveRemoteDataToClientDb(
          clientDb,
          dbKey,
          validRemoteData,
          serverOrigin
        );
      }
      readRequestManager.clearMiss(dbKey);
      const remoteData = serverOrigin ? { ...validRemoteData, dbKey, serverOrigin } : { ...validRemoteData, dbKey };
      return normalizeReadRecord(dbKey, remoteData);
    }
    readRequestManager.markMiss(dbKey, Date.now());
    throw new Error(
      `Failed to fetch data for key "${dbKey}" from all sources.`
    );
  };
  const canDedup = !signal;
  if (canDedup) {
    const existing = readRequestManager.getInFlight(dbKey);
    if (existing) return existing;
    let inFlightPromise;
    inFlightPromise = executeRead().finally(() => {
      readRequestManager.clearInFlight(dbKey, inFlightPromise);
    });
    readRequestManager.setInFlight(dbKey, inFlightPromise);
    return inFlightPromise;
  }
  return executeRead();
};

export {
  buildPersistentAuthTokenPayload,
  signToken,
  parseToken,
  MyToastRegion,
  configureStore,
  createAsyncThunk,
  DEFAULT_AGENT_BASE_POLICY,
  DEFAULT_USER_PREFERENCE_PROFILE,
  SYSTEM_AGENT_CAPABILITIES,
  SYSTEM_AGENT_CAPABILITY_IDS,
  AGENT_UPDATE_FIELD_NAMES,
  PRIMARY_AUTO_APPROVE_SELF_UPDATE_FIELDS,
  HIGH_IMPACT_SELF_UPDATE_FIELDS,
  normalizeAgentUpdateFieldList,
  SERVERS,
  NOLO_CLUSTER_SERVERS,
  normalizeKnownServerOrigin,
  API_ENDPOINTS,
  FONT_PRESET_VALUES,
  FONT_PRESET_STORAGE_KEY,
  iris,
  trail,
  wave,
  rose,
  mono,
  catppuccin,
  SYSTEM_DARK_MEDIA_QUERY,
  resolveThemeModeIsDark,
  readStoredThemeDensity,
  readStoredThemeName,
  readStoredFontPreset,
  resolveThemeModePreload,
  SYSTEM_DEFAULT_AGENT_ID,
  asRecordOrEmpty,
  ulid,
  ulid2,
  toTrimmedString,
  normalizeUserId,
  toNonEmptyString,
  normalizeAuthorName,
  toSafeTimestamp,
  formatShareTime,
  extractAgentInfo,
  extractCoverImage,
  toPublicAgentKey,
  resolveShareAuthorIdentity,
  sanitizeShareData,
  shareKey,
  isDialogKey,
  createDialogKey,
  dialogMessageKey,
  createDialogMessageKeyAndId,
  dialogMessageRange,
  SEPARATOR2 as SEPARATOR,
  createKey,
  isTableMetaKey,
  isAgentKey,
  rowKey,
  metaKey,
  createUserKey,
  createMemoryKey,
  memoryOwnerRange,
  memorySubjectKindRange,
  createTokenKey,
  createTokenStatsKey,
  createAgentAutomationKey,
  createAgentAutomationOwnerIndexKey,
  buildAgentAutomationOwnerIndexValue,
  createNotificationKey,
  createPageKey,
  createAgentKey,
  pubAgentKeys,
  fileKey,
  toTimestampMs,
  selectIdentityUserId,
  selectIdentityToken,
  selectIdentityIsLoggedIn,
  selectIdentityIsInitialized,
  selectIdentityUser,
  isAbortError,
  logger,
  getAllServers,
  fetchFromClientDb,
  normalizeTimeFields,
  selectRuntimeSnapshot,
  selectRuntimeCurrentServer,
  selectRuntimeRemoteServers,
  getRuntimeServerContext,
  deleteFileFromIndexedDb,
  noloWriteRequest,
  noloDeleteRequest,
  isDeviceLocalOwnerId,
  resolveEffectiveSpaceActorId,
  isDeviceLocalDbKey,
  canChatDeviceLocalWithoutLogin,
  getRecordTimestamp,
  isTombstoneRecord,
  shouldReplaceWithNextRecord,
  buildRestorePatch,
  prepareTombstoneRecordForCache,
  removeAction,
  readAndWaitAction,
  registerDatabaseActionToast,
  readAction,
  getCompactFileMetaLabel,
  isVideoMimeType,
  isAudioMimeType,
  isPdfMimeType,
  isImageResourceLike,
  isImageFile,
  filterImageFiles,
  splitFiles,
  extractFilesFromDataTransfer,
  dbAdapter,
  selectById,
  selectEntities,
  selectAll,
  selectIds,
  selectTotal,
  remove,
  purge,
  read,
  readAndWait,
  write,
  patch,
  upsert,
  upload,
  readFileContent,
  share,
  upsertSSREntity,
  removeCachedEntity,
  dbSlice_default,
  nolotusId,
  isSystemAdmin,
  noloAgentId,
  QUICK_CHAT_IMAGE_AGENT_KEY,
  QUICK_CHAT_DEFAULT_TIER_AGENTS,
  normalizeSettingChanges,
  LOCAL_FIRST_APPEARANCE_KEYS,
  LOCAL_ONLY_SETTINGS_KEYS,
  isLocalFirstAppearanceChange,
  stripRegisterBackedFieldsFromSettingsWrite,
  sanitizeStoredSettingsRecord,
  hydrateStoredSettings,
  buildSettingsPersistencePlan,
  getCachedDefaultAgentRegisterRecord,
  persistDefaultAgentRegister,
  selectSettings,
  selectCurrentServer,
  selectSyncServers,
  selectRemoteServer,
  selectRemoteSyncServers,
  selectRemoteServers,
  selectPreferredAnimationSet,
  selectShowThinking,
  selectMaxCost,
  selectMaxExecutionTime,
  selectIsDark,
  selectThemeMode,
  selectHeaderHeight,
  selectThemeName,
  selectThemeFollowsSystem,
  selectSidebarWidth,
  selectDensity,
  selectFontPreset,
  selectEnableReadCurrentSpace,
  selectGlobalPrompt,
  selectUserTonePreset,
  selectKnowledgeCaptureLevel,
  selectSpaceContextLevel,
  selectAutoApproveSelfUpdateFields,
  selectAiRecentContentLimit,
  selectDefaultAgentPreference,
  selectDefaultAgentId,
  selectOcrModel,
  selectShowScrollToTopButton,
  selectShowScrollToBottomButton,
  selectCreateMenuOpenCount,
  selectDesktopChromeConnectorEnabled,
  selectDeveloperModeEnabled,
  selectDiagnosticModeEnabled,
  selectCopyDiagnosticsEnabled,
  selectEditorDefaultMode,
  selectEditorLightCodeTheme,
  selectEditorDarkCodeTheme,
  selectEditorWordCountEnabled,
  selectEditorShortcuts,
  selectDeleteShortcut,
  selectEditorFontSize,
  selectEditorAutoSave,
  selectEditorAutoSaveInterval,
  selectSystemBuiltinSkills,
  selectEditorCodeTheme,
  selectEditorConfig,
  selectTheme,
  getSettings,
  setSettings,
  changeTheme,
  changeDensity,
  changeFontPreset,
  changeDarkMode,
  toggleShowThinking,
  setThemeFollowsSystem,
  setSidebarWidth,
  toggleEnableReadCurrentSpace,
  setEditorDefaultMode,
  setEditorLightCodeTheme,
  setEditorDarkCodeTheme,
  setEditorCodeTheme,
  toggleEditorWordCount,
  toggleEditorShortcut,
  setEditorFontSize,
  toggleEditorAutoSave,
  setEditorAutoSaveInterval,
  setGlobalPrompt,
  setUserTonePreset,
  setKnowledgeCaptureLevel,
  setSpaceContextLevel,
  setAiRecentContentLimit,
  setMaxExecutionTime,
  setDefaultAgentId,
  setThemeMode,
  addHostToCurrentServer,
  settingSlice_default,
  UNCATEGORIZED_ID,
  toast,
  addContentAction,
  normalizeToolDisplaySummary,
  isHiddenOrchestratorToolMessage,
  TOOL_OUTPUT_PREVIEW_CHARS,
  TOOL_OUTPUT_PREVIEW_LINES,
  shouldPreviewToolText,
  previewToolText,
  shouldToolMessageRowStartCollapsed,
  buildRunStreamingAgentHandoffPresentation,
  isAssistantToolStub,
  isIntermediateAssistantProgress,
  isAwaitingVisibleAssistantReply,
  shouldAutoCollapseToolGroup,
  fetchAndCacheMessages,
  fetchServerSyncedCredential,
  sanitizeOptionalModelString,
  createFileCredentialBroker,
  fetchAndCacheTableRows,
  estimateTokenCount,
  formatTokenCount,
  CONTEXT_BUDGET,
  isOAuthApiKeyRef,
  shouldUseServerProxy,
  setWorkflow,
  updateStep,
  incrementStepsExecuted,
  incrementFailedSteps,
  requiredArgs,
  startOfDay,
  differenceInMinutes,
  eachDayOfInterval,
  startOfUTCWeek,
  buildFormatLongFn,
  buildLocalizeFn,
  buildMatchFn,
  buildMatchPatternFn,
  format,
  formatDistanceToNow,
  formatISO,
  subDays,
  parseISO,
  tableSlice,
  makeSelectRowsByTable,
  createTable,
  initTable,
  addRow,
  deleteRow,
  deleteTable,
  addColumn,
  deleteColumn,
  renameColumn,
  renameColumnLabel,
  renameTable,
  updateTableIcon,
  resetTable,
  loadTableRows,
  updateCell,
  reorderColumn,
  updateColumnWidth,
  addColumnOption,
  setTableFocusContext,
  selectCurrentTable,
  selectTableIsLoading,
  selectTableIsInitialized,
  selectTableError,
  selectTableColumns,
  selectTableRows,
  selectTableFocusContext,
  tableSlice_default,
  buildDatabaseFileContentUrl,
  uiAskChoiceFunctionSchema,
  uiAskChoiceFunc,
  getPrimaryDialogAgentId,
  addDialogAgentIds,
  replacePrimaryDialogAgentId,
  removeDialogAgentId,
  isAutoDialog,
  resolveDialogAutoAgentConfig,
  resolveDialogRuntimeAgentKey,
  useFavoriteAgentIds,
  useFavoriteContentIds,
  useFavoriteFavoritedAtById,
  useFavoritesLoading,
  useFavoritesInitialized,
  useFavoritesError,
  useIsAgentFavorited,
  useIsContentFavorited,
  initFavorites,
  toggleFavorite,
  toggleContentFavorite,
  getDeleteErrorMessage,
  deleteDbKey,
  fetchUserData,
  planContextUsage,
  getModelContextWindow,
  getModelInfo,
  dataURLtoFile,
  compressImageFile,
  waitForFileReady,
  buildMessageFileContentUrl,
  isLocalFileContentUrl,
  stripDurableImageInlinePayload,
  serializeMessageContent,
  updateTokensAction,
  asOptionalJsonRecord,
  extractReferenceKeysFromMessage,
  PERSONALIZATION_DIALOG_CATEGORY,
  PERSONALIZATION_DIALOG_EXTRA_TOOLS,
  buildPersonalizationDialogTitle,
  buildPersonalizationStarterPrompt,
  buildPersonalizationRuntimeOptions,
  buildPersonalizationDialogPolicyContext,
  startPersonalizationDialog,
  startCliChatSession,
  getCliChatSession,
  createCliChatTurnStream,
  scanInstalledClis,
  estimateMissingUsage,
  setAgentCredentialBrokerFactoryForTests,
  slice,
  runLlm,
  runAgent,
  streamAgentChatTurn,
  createAgent,
  updateAgent,
  agentSlice_default,
  BUILTIN_TITLE_LLM_CONFIG,
  updateDialogSummaryAction,
  resolveHandleSendMessageContext,
  resolveToolDisplayName,
  createToolNameTranslator,
  formatToolGroupHeaderSummary,
  extractToolCallArgs,
  formatToolRowHeaderSummary,
  buildActivityTimeline,
  selectCurrentDialogId,
  useIsLoadingInitial,
  useMessageSessionError,
  useLastStreamTimestamp,
  useMessagesLoadingState,
  useHasStreamingMessage,
  selectAllMsgs,
  selectMsgById,
  selectLastAssistantMessage,
  addUserMessage,
  messageStreaming,
  resetMsgs,
  removeTransientMessage,
  finalizeTransientMessageOnError,
  prepareAndPersistMessage,
  prepareAndPersistUserMessage,
  initMsgs,
  loadOlderMessages,
  messageStreamEnd,
  deleteMessage,
  editUserMessageAndReplay,
  addToolMessage,
  updateToolMessage,
  messageSlice_default,
  cleanupCliSessionForDialog,
  clearDialogState,
  createPageAndAddReference,
  deleteDialog,
  initDialog,
  handleSendMessage,
  abortAllMessages,
  updateTokens,
  createDialog,
  createAgentAutomation,
  updateDialogTitle,
  addDialogAgent,
  removeDialogAgent,
  setPrimaryDialogAgent,
  setDialogExtraReferences,
  selectCurrentDialogConfig,
  selectCurrentDialogAgentIds,
  selectCurrentPrimaryAgentId,
  selectDialogConfigByKey,
  selectCurrentDialogTokens,
  selectTotalDialogTokens,
  isSpaceMembershipRemoteUnavailableError,
  DEFAULT_COLLAPSED_CATEGORIES,
  dedupeMemberSpacesById,
  toggleCategoryCollapse,
  setAllCategoriesCollapsed,
  changeSpace,
  addSpace,
  deleteSpace,
  updateSpace,
  fetchSpace,
  addCategory,
  deleteCategory,
  updateCategoryName,
  reorderCategories,
  addContentToSpace,
  moveContentToSpace,
  deleteContentFromSpace,
  deleteMultipleContent,
  updateContentTitle,
  updateContentPinned,
  updateContentCategory,
  uploadAndAddFileToSpace,
  fetchUserSpaceMemberships,
  addMember,
  removeMember,
  fetchSpaceSidebarState,
  applySpaceEvent,
  markDialogRead,
  resetSpace,
  setViewMode,
  toggleFavoritesCollapse,
  hydrateMemberSpacesFromLocal,
  appendRecoveredMemberships,
  selectCurrentSpaceId,
  selectCurrentSpace,
  selectSpaceById,
  selectAllMemberSpaces,
  selectOwnedMemberSpaces,
  selectSpaceLoading,
  selectMemberSpacesLoaded,
  selectMembershipStatus,
  selectSpaceInitialized,
  selectCollapsedCategories,
  selectIsCategoryCollapsed,
  selectFavoritesCollapsed,
  selectDialogStatuses,
  selectDialogEventTimestamps,
  selectDialogTitles,
  selectDialogStatus,
  selectUnreadDialogIds,
  selectIsDialogUnread,
  selectDialogStatusFromEntity,
  selectIsDialogUnreadFromEntity,
  selectViewMode,
  spaceSlice_default,
  generateKeyPairFromSeedV1,
  hashPasswordV1,
  getComposerImageDraft,
  setComposerImageDraft,
  clearComposerImageDraft,
  getDefaultSyncJobRegistry,
  authRoutes,
  signIn,
  signUp,
  inviteSignUp,
  signOut,
  replaceCurrentToken,
  changeUser,
  initializeAuth,
  fetchUserProfile,
  authSlice_default,
  selectCurrentUser,
  selectUsers,
  selectUserId,
  selectCurrentToken,
  selectCurrentUserBalance
};
