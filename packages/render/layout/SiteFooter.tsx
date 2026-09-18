import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "app/routing";
import { LEGAL_LINKS } from "app/constants/legalLinks";
import "./siteFooter.css";

const SUPPORT_EMAIL = "s@nolotus.com";

/**
 * 站点页脚：承载法务文件入口（Waffo 进件合规要求）。
 * 只在 shouldRenderSiteFooter 命中的内容型路由渲染，见 siteFooterRoutes.ts。
 *
 * 视觉主题：河畔草地露营。河流自右上角蜿蜒流向左下角；
 * 场景为纯装饰 SVG（aria-hidden），只保留地面景物，配色跟随明暗主题，
 * 动画尊重 prefers-reduced-motion。
 *
 * 构图与响应式策略：
 * - 拒绝扁平压缩：采用高纵深构图与 xMidYMax slice 保持纯正几何等比，彻底消除横向拉伸与上下挤压感；
 * - 层次远近有度：远山叠嶂、中景丘陵、流水逶迤、近景开阔草坪；
 * - 桌面端：全幅开阔画卷，左侧水湾停泊独木舟，空中掠过飞鸟，右侧扎营立挺大帐篷、青帐篷与温暖篝火；
 * - 移动端：专注营地黄金视域，饱满生动，元素比例舒适不局促。
 */
const SiteFooter: React.FC = () => {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="SiteFooter">
      <div className="SiteFooter__scene" aria-hidden="true">
        {/* 桌面与平板端全景画卷：高度舒展开阔，等比 slice 杜绝横向形变 */}
        <svg
          className="SiteFooter__svg SiteFooter__svg--desktop"
          viewBox="0 0 1440 180"
          preserveAspectRatio="xMidYMax slice"
        >
          {/* 水面垂直渐变：上=远（天空反射偏亮），下=近（水色偏深） */}
          <defs>
            <linearGradient id="sfRiverGradientDesktop" x1="0" y1="0" x2="0.18" y2="1">
              <stop className="sf-river-stop-far" offset="0%" stopColor="#8ccbe9" />
              <stop className="sf-river-stop-mid" offset="55%" stopColor="#4a9dc9" />
              <stop className="sf-river-stop-near" offset="100%" stopColor="#35789f" />
            </linearGradient>
          </defs>

          {/* 远山叠嶂（淡远山轮廓，增添辽远空间景深；峰值刻意压在 y≥62，
              使 ≥3840px 带鱼屏在 slice 顶部裁切 60 单位时仍不被削顶） */}
          <path
            className="sf-mountain-far"
            d="M-100,92 C60,62 220,78 380,92 C520,105 680,82 820,88 C980,95 1160,68 1340,80 C1440,86 1500,82 1540,85 L1540,180 L-100,180 Z"
          />

          {/* 青山坡（中景丘陵） */}
          <path
            className="sf-hill"
            d="M-100,114 C50,88 200,102 360,114 C500,124 640,110 780,112 C950,116 1100,94 1280,106 C1380,112 1480,105 1540,108 L1540,180 L-100,180 Z"
          />

          {/* 近岸开阔草地（平坦舒展，底部无缝衔接链接区）。
              必须画在河流之前：河从近岸草地里穿过，只有画在草地之上才不会被整段盖住。 */}
          <path
            className="sf-meadow"
            d="M-100,170 C60,162 200,170 340,162 C480,154 620,164 760,156 C900,148 1050,158 1200,152 C1320,148 1440,154 1540,151 L1540,180 L-100,180 Z"
          />

          {/* 蜿蜒河流：自远山深处的山涧流出，向左下逐渐变宽（远窄近宽的真实透视）。
              远端收成一点，近端约 33 单位宽（≈ 场景高度的 18%）。
              底边停在 y≈172 而不是 180，把最底部留给草地，保证与下方链接区的绿色接缝不断。 */}
          <path
            className="sf-river"
            d="M1230,97
               C1200,98.2 1108.3,101.7 1050,104
               C991.7,106.3 935,108.5 880,111
               C825,113.5 773.3,116.3 720,119
               C666.7,121.7 613.3,124.3 560,127
               C506.7,129.7 456.7,132.3 400,135
               C343.3,137.7 286.7,140.2 220,143
               C153.3,145.8 -36.7,150.5 0,152
               L0,172
               C36.7,171.7 153.3,171 220,170
               C286.7,169 343.3,167.7 400,166
               C456.7,164.3 506.7,162.3 560,160
               C613.3,157.7 666.7,155.5 720,152
               C773.3,148.5 825,144.3 880,139
               C935,133.7 991.7,127 1050,120
               C1108.3,113 1200,93.2 1230,97 Z"
          />
          <g className="sf-ripples">
            <path d="M1030,109 C1070,107 1110,107 1150,108" />
            <path d="M880,120 C925,118 970,118 1012,119" />
            <path d="M730,131 C775,129 820,129 862,130" />
            <path d="M550,142 C598,140 646,140 692,141" />
            <path d="M378,149 C428,147 478,147 526,148" />
            <path d="M205,155 C258,153 311,153 362,154" />
            <path d="M30,161 C77,159 124,159 170,160" />
          </g>

          {/* 近岸湿痕：沿水陆交界描一道深色，避免水面与草地硬切 */}
          <path
            className="sf-river-bank"
            d="M0,172 C36.7,171.7 153.3,171 220,170 C286.7,169 343.3,167.7 400,166 C456.7,164.3 506.7,162.3 560,160 C613.3,157.7 666.7,155.5 720,152 C773.3,148.5 825,144.3 880,139 C935,133.7 991.7,127 1050,120 C1108.3,113 1200,93.2 1230,97"
          />

          {/* 翱翔飞鸟群 */}
          <g className="sf-birds">
            <path className="sf-bird" d="M420,62 Q424,56 428,62 Q432,56 436,62 Q432,60 428,65 Q424,60 420,62 Z" />
            <path className="sf-bird" d="M446,52 Q450,47 454,52 Q458,47 462,52 Q458,50 454,55 Q450,50 446,52 Z" />
            <path className="sf-bird" d="M468,61 Q471,57 474,61 Q477,57 480,61 Q477,59 474,63 Q471,59 468,61 Z" />
          </g>

          {/* 左侧水岸停泊的独木舟与系缆桩（船体置于水带中线附近） */}
          <g transform="translate(195, 143)">
            <ellipse className="sf-shadow" cx="30" cy="17" rx="36" ry="4.5" />
            <g className="sf-canoe-group">
              <path className="sf-canoe" d="M-6,13 C12,19 52,19 70,10 C62,14 18,15 -6,13 Z" />
              <path className="sf-canoe-rim" d="M-8,12 C12,17 54,17 72,9 C64,12 18,13 -8,12 Z" />
              <line className="sf-paddle" x1="14" y1="6" x2="44" y2="18" />
              <path className="sf-paddle-blade" d="M38,15 L48,19 L44,21 Z" />
            </g>
            <rect className="sf-post" x="72" y="13" width="4.5" height="14" rx="1.5" />
            <path className="sf-rope" d="M62,14 C66,13 70,13 73,14" />
          </g>

          {/* 松树群落：全部种在河岸以上的陆地。每棵的树根 y 都小于该 x 处河流顶边，
              否则树会"长在水里"（曾出现三棵树泡在河中央）。 */}
          <g className="sf-pine" transform="translate(60,146) scale(0.95)">
            <rect className="sf-trunk" x="-4.5" y="-18" width="9" height="18" />
            <path d="M-36,-10 L0,-50 L36,-10 Z" />
            <path d="M-30,-32 L0,-66 L30,-32 Z" />
            <path d="M-22,-52 L0,-82 L22,-52 Z" />
          </g>
          <g className="sf-pine" transform="translate(1360,158) scale(0.85)">
            <rect className="sf-trunk" x="-4" y="-16" width="8" height="16" />
            <path d="M-32,-8 L0,-44 L32,-8 Z" />
            <path d="M-26,-28 L0,-58 L26,-28 Z" />
            <path d="M-19,-46 L0,-72 L19,-46 Z" />
          </g>
          <g className="sf-pine" transform="translate(320,137) scale(0.58)">
            <rect className="sf-trunk" x="-4" y="-16" width="8" height="16" />
            <path d="M-32,-8 L0,-44 L32,-8 Z" />
            <path d="M-26,-28 L0,-58 L26,-28 Z" />
            <path d="M-19,-46 L0,-72 L19,-46 Z" />
          </g>

          {/* 水岸绿树（树根同样落在河岸以上的陆地） */}
          <g className="sf-tree" transform="translate(150,142) scale(0.85)">
            <rect className="sf-trunk" x="-4.5" y="-20" width="9" height="20" />
            <circle cx="0" cy="-52" r="26" />
            <circle cx="-19" cy="-36" r="17" />
            <circle cx="19" cy="-36" r="17" />
          </g>

          {/* 挺拔大帐篷（高耸立体有型，彻底告别压扁！底 98，高 54） */}
          <g transform="translate(1070, 162)">
            <ellipse className="sf-shadow" cx="0" cy="4" rx="58" ry="7" />
            <path className="sf-tent-a" d="M-49,2 L0,-52 L49,2 Z" />
            <path className="sf-tent-a-dark" d="M0,-52 L49,2 L0,2 Z" />
            <path className="sf-tent-door-glow" d="M-15,2 L0,-30 L15,2 Z" />
            <path className="sf-tent-door" d="M-8,2 L0,-20 L8,2 Z" />
          </g>

          {/* 精致小帐篷（青色，底 52，高 36） */}
          <g transform="translate(1230, 158)">
            <ellipse className="sf-shadow" cx="0" cy="3" rx="30" ry="5" />
            <path className="sf-tent-b" d="M-26,2 L0,-36 L26,2 Z" />
            <path className="sf-tent-b-dark" d="M0,-36 L26,2 L0,2 Z" />
            <path className="sf-tent-door" d="M-9,2 L0,-17 L9,2 Z" />
          </g>

          {/* 湖畔石头与草丛 */}
          <ellipse className="sf-rock" cx="140" cy="173" rx="12" ry="6" />
          <ellipse className="sf-rock" cx="540" cy="174" rx="9" ry="5" />
          <g className="sf-tuft" transform="translate(110,172)"><path d="M-8,0 L-5,-11 L-2,0 M0,0 L3,-13 L6,0 M8,0 L11,-9 L13,0" /></g>
          <g className="sf-tuft" transform="translate(850,172)"><path d="M-8,0 L-5,-11 L-2,0 M0,0 L3,-13 L6,0 M8,0 L11,-9 L13,0" /></g>
          <g className="sf-tuft" transform="translate(980,166)"><path d="M-8,0 L-5,-11 L-2,0 M0,0 L3,-13 L6,0 M8,0 L11,-9 L13,0" /></g>
          <g className="sf-tuft" transform="translate(1310,166)"><path d="M-8,0 L-5,-11 L-2,0 M0,0 L3,-13 L6,0 M8,0 L11,-9 L13,0" /></g>

          {/* 欢腾篝火（两顶帐篷之间，正圆光晕与欢快火苗） */}
          <g transform="translate(1160, 162)">
            <circle className="sf-fire-glow" cx="0" cy="-10" r="21" />
            <rect className="sf-log" x="-12" y="-4.5" width="24" height="5" rx="2" transform="rotate(14)" />
            <rect className="sf-log" x="-12" y="-4.5" width="24" height="5" rx="2" transform="rotate(-14)" />
            <path className="sf-flame" d="M0,-30 C-8,-20 -9,-12 0,-4 C9,-12 8,-20 0,-30 Z" />
            <path className="sf-flame-inner" d="M0,-20 C-4,-14 -4.5,-8 0,-4 C4.5,-8 4,-14 0,-20 Z" />
          </g>

          {/* 萤火虫（仅深色主题显示） */}
          <g className="sf-fireflies">
            <circle className="sf-firefly" cx="480" cy="135" r="2.2" />
            <circle className="sf-firefly" cx="900" cy="125" r="1.8" style={{ animationDelay: "-1.4s" }} />
            <circle className="sf-firefly" cx="1140" cy="132" r="2.2" style={{ animationDelay: "-2.6s" }} />
            <circle className="sf-firefly" cx="230" cy="142" r="1.7" style={{ animationDelay: "-0.8s" }} />
            <circle className="sf-firefly" cx="780" cy="115" r="1.6" style={{ animationDelay: "-3.4s" }} />
          </g>
        </svg>

        {/* 移动端专注营地画卷：高度 135 充分舒展，等比 slice，消除筷子火与尖刺帐篷 */}
        <svg
          className="SiteFooter__svg SiteFooter__svg--mobile"
          viewBox="0 0 390 135"
          preserveAspectRatio="xMidYMax slice"
        >
          {/* 水面垂直渐变（与桌面端同构，独立 id 避免重复） */}
          <defs>
            <linearGradient id="sfRiverGradientMobile" x1="0" y1="0" x2="0.2" y2="1">
              <stop className="sf-river-stop-far" offset="0%" stopColor="#8ccbe9" />
              <stop className="sf-river-stop-mid" offset="55%" stopColor="#4a9dc9" />
              <stop className="sf-river-stop-near" offset="100%" stopColor="#35789f" />
            </linearGradient>
          </defs>

          {/* 移动端远山与丘陵 */}
          <path className="sf-mountain-far" d="M0,52 C70,36 160,44 240,54 C310,62 360,48 390,52 L390,135 L0,135 Z" />
          <path className="sf-hill" d="M0,72 C60,56 150,62 220,72 C290,82 340,68 390,72 L390,135 L0,135 Z" />

          {/* 近景草地（先画，河从草地中穿过，画在其上） */}
          <path className="sf-meadow" d="M0,126 C40,116 90,104 150,94 C210,84 300,88 390,84 L390,135 L0,135 Z" />

          {/* 移动端河流：自右上山涧流出，向左下渐宽，从左缘中段出画。
              底边停在 y≈126，把最底部留给草地以保持绿色接缝。 */}
          <path
            className="sf-river"
            d="M168,64
               C161.3,65.2 140.7,68.2 128,71
               C115.3,73.8 103.7,77.7 92,81
               C80.3,84.3 68.7,87.7 58,91
               C47.3,94.3 37.7,97.8 28,101
               C18.3,104.2 -4.7,108.5 0,110
               L0,126
               C5.3,125.5 20.7,124.7 32,123
               C43.3,121.3 56,118.8 68,116
               C80,113.2 92.7,109.8 104,106
               C115.3,102.2 125.3,97.8 136,93
               C146.7,88.2 162.7,74.3 168,77 Z"
          />
          <g className="sf-ripples">
            <path d="M120,80 C132,79 144,79 156,80" />
            <path d="M85,92 C97,91 109,90 121,91" />
            <path d="M52,101 C64,100 76,99 88,100" />
            <path d="M22,108 C34,107 46,106 58,107" />
            <path d="M4,116 C14,115 24,114 34,115" />
          </g>

          {/* 移动端近岸湿痕 */}
          <path
            className="sf-river-bank"
            d="M0,126 C5.3,125.5 20.7,124.7 32,123 C43.3,121.3 56,118.8 68,116 C80,113.2 92.7,109.8 104,106 C115.3,102.2 125.3,97.8 136,93 C146.7,88.2 162.7,74.3 168,77"
          />

          {/* 飞鸟 */}
          <g className="sf-birds">
            <path className="sf-bird" d="M150,38 Q153,34 156,38 Q159,34 162,38 Q159,36 156,39 Q153,36 150,38 Z" />
            <path className="sf-bird" d="M168,30 Q170,27 172,30 Q174,27 176,30 Q174,29 172,31 Q170,29 168,30 Z" />
          </g>

          {/* 左侧小舟（沿水带倾斜停泊） */}
          <g transform="translate(26, 104) rotate(-13) scale(0.9)">
            <ellipse className="sf-shadow" cx="24" cy="18" rx="22" ry="3.5" />
            <g className="sf-canoe-group">
              <path className="sf-canoe" d="M-2,15 C10,21 38,21 52,13 C45,17 16,17 -2,15 Z" />
              <path className="sf-canoe-rim" d="M-3,14 C12,19 40,19 54,12 C47,15 16,16 -3,14 Z" />
              <line className="sf-paddle" x1="12" y1="9" x2="34" y2="20" />
              <path className="sf-paddle-blade" d="M30,18 L38,21 L34,22 Z" />
            </g>
          </g>

          {/* 移动端松树 */}
          <g className="sf-pine" transform="translate(365,96) scale(0.78)">
            <rect className="sf-trunk" x="-4" y="-16" width="8" height="16" />
            <path d="M-32,-8 L0,-44 L32,-8 Z" />
            <path d="M-26,-28 L0,-58 L26,-28 Z" />
            <path d="M-19,-46 L0,-72 L19,-46 Z" />
          </g>

          {/* 移动端大帐篷（底 72，高 42，立体舒展） */}
          <g transform="translate(200, 114)">
            <ellipse className="sf-shadow" cx="0" cy="3" rx="42" ry="5.5" />
            <path className="sf-tent-a" d="M-36,2 L0,-42 L36,2 Z" />
            <path className="sf-tent-a-dark" d="M0,-42 L36,2 L0,2 Z" />
            <path className="sf-tent-door-glow" d="M-12,2 L0,-24 L12,2 Z" />
            <path className="sf-tent-door" d="M-7,2 L0,-16 L7,2 Z" />
          </g>

          {/* 移动端小帐篷 */}
          <g transform="translate(310, 108)">
            <ellipse className="sf-shadow" cx="0" cy="2.5" rx="22" ry="4" />
            <path className="sf-tent-b" d="M-20,2 L0,-28 L20,2 Z" />
            <path className="sf-tent-b-dark" d="M0,-28 L20,2 L0,2 Z" />
            <path className="sf-tent-door" d="M-7,2 L0,-14 L7,2 Z" />
          </g>

          {/* 移动端篝火（圆润篝火光圈与火苗） */}
          <g transform="translate(262, 114)">
            <circle className="sf-fire-glow" cx="0" cy="-8" r="16" />
            <rect className="sf-log" x="-10" y="-4" width="20" height="4" rx="1.8" transform="rotate(14)" />
            <rect className="sf-log" x="-10" y="-4" width="20" height="4" rx="1.8" transform="rotate(-14)" />
            <path className="sf-flame" d="M0,-24 C-6,-16 -7,-10 0,-3 C7,-10 6,-16 0,-24 Z" />
            <path className="sf-flame-inner" d="M0,-16 C-3.2,-11 -3.5,-7 0,-3 C3.5,-7 3.2,-11 0,-16 Z" />
          </g>

          {/* 移动端草丛 */}
          <g className="sf-tuft" transform="translate(135,118)"><path d="M-6,0 L-4,-9 L-1,0 M0,0 L2,-11 L5,0 M6,0 L8,-7 L10,0" /></g>
          <g className="sf-tuft" transform="translate(350,120)"><path d="M-6,0 L-4,-9 L-1,0 M0,0 L2,-11 L5,0 M6,0 L8,-7 L10,0" /></g>

          {/* 移动端萤火虫 */}
          <g className="sf-fireflies">
            <circle className="sf-firefly" cx="170" cy="76" r="2" />
            <circle className="sf-firefly" cx="250" cy="64" r="1.6" style={{ animationDelay: "-1.2s" }} />
            <circle className="sf-firefly" cx="340" cy="68" r="2" style={{ animationDelay: "-2.1s" }} />
            <circle className="sf-firefly" cx="90" cy="95" r="1.5" style={{ animationDelay: "-0.6s" }} />
          </g>
        </svg>
      </div>

      <div className="SiteFooter__inner">
        <nav className="SiteFooter__links" aria-label={t("footer.legal", "法律条款")}>
          {LEGAL_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="SiteFooter__link">
              {t(link.i18nKey, link.fallback)}
            </Link>
          ))}
          <Link to="/about" className="SiteFooter__link">
            {t("footer.about", "关于我们")}
          </Link>
          <Link to="/contact" className="SiteFooter__link">
            {t("footer.contact", "联系我们")}
          </Link>
          <a className="SiteFooter__link" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
        </nav>
        <p className="SiteFooter__copyright">
          © {year} Nolo. {t("footer.rights", "保留所有权利。")}
        </p>
      </div>
    </footer>
  );
};

export default SiteFooter;
