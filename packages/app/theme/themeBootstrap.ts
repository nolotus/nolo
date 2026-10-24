import {
  DEFAULT_THEME_NAME,
  SPACE,
  THEME_COLORS,
  THEME_NAME_ALIASES,
} from "app/theme/theme.config";
import {
  DEFAULT_FONT_PRESET,
  FONT_PRESET_ALIASES,
  FONT_PRESET_CSS_VARIABLES,
  FONT_PRESET_STORAGE_KEY,
  FONT_ROOT_VARIABLES,
} from "app/theme/fontPreference";
import { createHash } from "node:crypto";
import { webAssetPublicPath } from "./webAssetPaths";

/**
 * Generated once at module/build initialization, never serialized per request.
 * Keep the existing first-paint algorithm verbatim: the runtime controllers clear
 * its font overrides / replace #global-theme-variables during hydration.
 * Future runtime palettes must be supplied by that controller, not this immutable
 * preset catalog. This is a classic blocking script, not async/defer/module.
 */
const serializeJsonForScript = (value: unknown) => JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");
const fontBootstrapData = serializeJsonForScript({
    storageKey: FONT_PRESET_STORAGE_KEY,
    defaultPreset: DEFAULT_FONT_PRESET,
    presetVariables: FONT_PRESET_CSS_VARIABLES,
    aliases: FONT_PRESET_ALIASES,
  });
const fontRootVariableLines = FONT_ROOT_VARIABLES.map(
    ({ name, key }) =>
      `fontRoot.style.setProperty('${name}',fontVariables[${JSON.stringify(
        key
      )}]);`
  ).join("\n            ");
const themeBootstrapData = serializeJsonForScript({
    defaultThemeName: DEFAULT_THEME_NAME,
    themeColors: THEME_COLORS,
    themeAliases: THEME_NAME_ALIASES,
    compactSpace: SPACE,
  });


export const themeBootstrapSource = `      (function(){try{
        var fontData=${fontBootstrapData};
        var fontPreset=fontData.defaultPreset;
        try{
          var storedFont=localStorage.getItem(fontData.storageKey);
          if(typeof storedFont==='string'){
            var aliasKey=storedFont.trim().toLowerCase();
            if(Object.prototype.hasOwnProperty.call(fontData.aliases,aliasKey))fontPreset=fontData.aliases[aliasKey];
          }
        }catch(e){}
        try{
          var fontVariables=(Object.prototype.hasOwnProperty.call(fontData.presetVariables,fontPreset)?fontData.presetVariables[fontPreset]:null)||fontData.presetVariables[fontData.defaultPreset];
          if(fontVariables){
            var fontRoot=document.documentElement;
            ${fontRootVariableLines}
          }
        }catch(e){}
        var t=localStorage.getItem('nolo-theme-mode');
        if(!t||t==='system')t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
        document.documentElement.setAttribute('data-theme',t);
        var d=localStorage.getItem('nolo-density');
        if(d==='compact'||d==='spacious')document.documentElement.setAttribute('data-density',d);
        var themeData=${themeBootstrapData};
        var themeName=localStorage.getItem('nolo-theme-name');
        var themeExplicit=localStorage.getItem('nolo-theme-name-explicit')==='1';
        var isDark=t==='dark';
        function hexToRgbString(value){
          if(typeof value!=='string') return null;
          var normalized=value.trim().replace(/^#/,'');
          var safe=normalized.length===3
            ? normalized.split('').map(function(char){return char+char;}).join('')
            : normalized;
          if(!/^[0-9a-fA-F]{6}$/.test(safe)) return null;
          var intValue=parseInt(safe,16);
          var r=(intValue>>16)&255;
          var g=(intValue>>8)&255;
          var b=intValue&255;
          return r+', '+g+', '+b;
        }
        function alphaColor(hex,alpha,fallback){
          var rgb=hexToRgbString(hex);
          return rgb?'rgba('+rgb+', '+alpha+')':fallback;
        }
        function generateCssVariables(obj,prefix){
          return Object.entries(obj).flatMap(function(entry){
            var key=entry[0];
            var value=entry[1];
            var name=prefix?prefix+'-'+key:key;
            if(typeof value==='object'&&value!==null&&!Array.isArray(value)){
              return generateCssVariables(value,name);
            }
            return value!=null?['--'+name+':'+value+';']:[];
          });
        }
        function generateCssString(theme){
          return ':root { '+generateCssVariables(theme).join(' ')+' }';
        }
        function resolveThemeName(value){
          if(typeof value!=='string') return themeData.defaultThemeName;
          var canonicalName=themeData.themeAliases[value]||value;
          if(!(canonicalName in themeData.themeColors)) return themeData.defaultThemeName;
          if(themeExplicit||canonicalName===themeData.defaultThemeName||canonicalName!=='neutral') return canonicalName;
          return themeData.defaultThemeName;
        }
        function buildThemeCss(name,isDarkMode,density){
          var mode=isDarkMode?'dark':'light';
          var validThemeName=resolveThemeName(name);
          var themeObject=themeData.themeColors[validThemeName];
          var c=themeObject[mode];
          var meta=themeObject.meta||{};
          var compact=density==='compact';
          var space=compact
            ? themeData.compactSpace
            : {0:'0',1:'5px',2:'10px',3:'14px',4:'20px',5:'24px',6:'30px',7:'34px',8:'40px',10:'50px',12:'60px',14:'70px',16:'80px',20:'100px',24:'120px'};
          var boost=meta.radiusBoost||0;
          var radiusXs=compact?'10px':'12px';
          var radiusSm=compact?(14+boost)+'px':(16+boost)+'px';
          var radiusMd=compact?'20px':'24px';
          return generateCssString({
            sidebarWidth:'280px',
            headerHeight:'56px',
            // Keep in sync with packages/app/settings/themeSelectors.ts
            // (sidebar denser than control-md for long lists).
            sidebarItemHeight:compact?'32px':'36px',
            sidebarIconSize:compact?'16px':'18px',
            sidebarItemGap:compact?'4px':'6px',
            space:space,
            fontSize:{
              xs:compact?'11px':'12px',
              sm:compact?'12px':'13px',
              base:compact?'14px':'15px',
              md:compact?'14px':'15.5px',
              lg:compact?'16px':'17.5px',
              xl:compact?'20px':'22px',
              '2xl':compact?'24px':'26px',
              '3xl':compact?'28px':'30px',
            },
            leading:{
              tight:compact?'1.3':'1.4',
              normal:compact?'1.45':'1.6',
              relaxed:compact?'1.6':'1.75',
            },
            control:{
              xs:compact?'24px':'28px',
              sm:compact?'28px':'32px',
              md:compact?'36px':'40px',
              lg:compact?'40px':'46px',
              xl:compact?'48px':'56px',
            },
            radius:{
              xs:radiusXs,
              sm:radiusSm,
              md:radiusMd,
              lg:radiusSm,
              xl:radiusMd,
            },
            motionEase:meta.motionEase||'cubic-bezier(0.33, 0, 0.2, 1)',
            ...c,
            borderSubtle:c.borderLight,
            borderFaint:alphaColor(c.border,isDarkMode?0.22:0.35,c.borderLight),
            borderStrong:c.borderHover,
            surface:c.backgroundSecondary,
            surfaceElevated:c.backgroundTertiary,
            surfaceCanvas:c.background,
            surfaceSidebar:c.background,
            surfacePanel:c.backgroundSecondary,
            surfaceCard:c.messageBackground,
            surfaceRaised:isDarkMode?c.backgroundTertiary:c.backgroundSecondary,
            surfaceInset:isDarkMode?c.backgroundSecondary:alphaColor(c.borderHover,0.05,c.codeBackground),
            surfaceCode:c.codeBackground,
            surfaceInteractive:c.backgroundTertiary,
            surfaceInteractiveHover:c.backgroundHover,
            textMuted:c.textSecondary,
            textSubtle:c.textTertiary,
            textHeading:c.textHeading||c.text,
            borderMuted:alphaColor(c.borderHover,isDarkMode?0.3:0.24,c.borderLight),
            accentSoft:alphaColor(c.primary,isDarkMode?0.18:0.1,c.primaryGhost),
            shadow:c.shadowMedium,
            shadow1:'0 1px 2px '+c.shadowLight,
            shadow2:'0 8px 24px -12px '+c.shadowMedium,
            shadow3:'0 18px 44px -24px '+c.shadowHeavy,
            primaryBorder:c.borderAccent||c.primary,
            primaryBgStrong:alphaColor(c.primary,isDarkMode?0.18:0.1,c.primaryGhost),
            success:c.success,
            warning:c.warning,
            info:c.info,
            successGhost:alphaColor(c.success,isDarkMode?0.2:0.12,'rgba(16, 185, 129, 0.12)'),
            warningGhost:alphaColor(c.warning,isDarkMode?0.2:0.12,'rgba(245, 158, 11, 0.12)'),
            infoGhost:alphaColor(c.info,isDarkMode?0.2:0.12,'rgba(59, 130, 246, 0.12)'),
            errorGhost:alphaColor(c.error,isDarkMode?0.2:0.12,'rgba(239, 68, 68, 0.12)'),
            primaryRgb:hexToRgbString(c.primary)||'59, 130, 246',
            focusRing:alphaColor(c.primary,isDarkMode?0.3:0.22,c.primaryGhost),
            fontWeight:{normal:400,medium:500,semibold:600,bold:700},
            tracking:{tight:'-0.02em',normal:'0',wide:'0.02em'},
            z:{sticky:100,dropdown:1000,modalBackdrop:1010,modal:1020,toast:1030,tooltip:1040},
            contentPadding:compact?'16px':'20px',
            sectionGap:compact?'32px':'40px',
            cardPadding:compact?'16px':'20px',
            inputPadding:compact?'8px 12px':'10px 14px',
            hoverBg:alphaColor(c.text,isDarkMode?0.06:0.04,c.backgroundTertiary),
            activeBg:alphaColor(c.text,isDarkMode?0.1:0.08,c.backgroundTertiary),
            disabledText:c.textTertiary,
            disabledBg:c.backgroundSecondary,
            codeBg:c.codeBackground,
            codeText:c.text,
            selectionBg:alphaColor(c.primary,isDarkMode?0.2:0.15,c.primaryGhost),
          });
        }
        if(themeName==='neutral'&&!themeExplicit){
          localStorage.removeItem('nolo-theme-name');
        }
        var css=buildThemeCss(themeName,isDark,d||'compact');
        if(css){var s=document.createElement('style');s.id='global-theme-variables';s.textContent=css;document.head.appendChild(s);}
      }catch(e){}})();`;
export const themeBootstrapHash = createHash("sha256").update(themeBootstrapSource).digest("hex").slice(0, 16);
export const themeBootstrapFile = `theme-bootstrap-${themeBootstrapHash}.js`;
export const getThemeBootstrapUrl = (publicPath = webAssetPublicPath) => `${publicPath}${themeBootstrapFile}`;
export const themeBootstrapUrl = getThemeBootstrapUrl();

// Runs before the blocking external script, even when its asset is unavailable.
// A nonce-bearing script works with CSP without requiring unsafe-inline handlers.
export const themeBootstrapFallback = `(function(){var r=document.documentElement,t,d;try{t=localStorage.getItem('nolo-theme-mode');d=localStorage.getItem('nolo-density')}catch(e){}r.setAttribute('data-theme',t==='dark'||t==='light'?t:window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');r.setAttribute('data-density',d==='spacious'?'spacious':'compact')})();`;

