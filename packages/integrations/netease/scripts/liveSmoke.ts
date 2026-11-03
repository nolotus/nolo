import { createNeteaseHttp } from "../neteaseHttp";

type UnikeyResponse = {
  code: number;
  unikey?: string;
  message?: string;
};

type SongUrlResponse = {
  code?: number;
  data?: Array<{
    id: number;
    url: string | null;
    br?: number;
    size?: number;
  }>;
};

async function main() {
  console.log("=== 网易云音乐网络层只读真网验证 (liveSmoke) ===");
  const http = createNeteaseHttp();

  // 1. 验证 weapi: 获取扫码登录 unikey
  console.log("\n[Step 1/2] 正在探测 weapi: POST https://music.163.com/weapi/login/qrcode/unikey ...");
  try {
    const unikeyRes = await http.weapi<UnikeyResponse>("/login/qrcode/unikey", {
      type: 1,
    });
    console.log("  服务端响应状态码:", unikeyRes.code);
    console.log("  返回 unikey:", unikeyRes.unikey);

    if (unikeyRes.code === 200 && typeof unikeyRes.unikey === "string" && unikeyRes.unikey.length >= 16) {
      console.log("  [PASS] weapi 验证成功：成功获取到合法的 unikey 登录凭据");
    } else {
      console.error("  [FAIL] weapi 响应异常:", JSON.stringify(unikeyRes).slice(0, 500));
      process.exit(1);
    }
  } catch (err) {
    console.error("  [FAIL] weapi 请求失败:", err);
    process.exit(1);
  }

  // 2. 验证 eapi: 获取公开歌曲播放地址 (347230《海阔天空》)
  console.log("\n[Step 2/2] 正在探测 eapi: POST https://interface.music.163.com/eapi/song/enhance/player/url/v1 ...");
  try {
    const songRes = await http.eapi<SongUrlResponse>("/song/enhance/player/url/v1", {
      ids: "[347230]",
      level: "standard",
      encodeType: "mp3",
    });

    const firstItem = songRes.data?.[0];
    console.log("  歌曲 ID:", firstItem?.id);
    console.log("  音频 URL (截断):", firstItem?.url ? firstItem.url.slice(0, 80) + "..." : null);
    console.log("  码率 (bps):", firstItem?.br);

    if (firstItem?.url && typeof firstItem.url === "string" && firstItem.url.startsWith("http")) {
      console.log("  [PASS] eapi 验证成功：成功解析到公开歌曲播放直链");
    } else {
      console.error("  [FAIL] eapi 未返回有效播放直链:", JSON.stringify(songRes).slice(0, 500));
      process.exit(1);
    }
  } catch (err) {
    console.error("  [FAIL] eapi 请求失败:", err);
    process.exit(1);
  }

  console.log("\n=== 验收完成：weapi 与 eapi 真网验证全部通过 ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
