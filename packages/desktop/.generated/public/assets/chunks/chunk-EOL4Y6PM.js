import{a as U}from"/public/assets/chunks/chunk-2TQUWQX7.js";import{b as V,ga as Y,yd as $,zd as j}from"/public/assets/chunks/chunk-I4KLHIYO.js";import{b as G}from"/public/assets/chunks/chunk-I5HE5HNS.js";import{a as P}from"/public/assets/chunks/chunk-U3FV4FR4.js";import{a as ie}from"/public/assets/chunks/chunk-DYHF2IZM.js";import{d as S}from"/public/assets/chunks/chunk-WEOWWZTJ.js";var a=S(ie(),1);var r=S(P(),1),ce=`
  .cbx-combobox {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    width: 100%;
    font-family: inherit;
  }

  .cbx-combobox__label {
    font-size: var(--fontSize-sm, 0.875rem);
    font-weight: 500;
    color: var(--text);
    margin-bottom: var(--space-1, 4px);
  }

  /* --- Trigger Base --- */
  .cbx-combobox__trigger {
    position: relative;
    width: 100%;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--background);
    color: var(--text);
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    outline: none;
    box-shadow: var(--shadow1, 0 1px 2px rgba(0, 0, 0, 0.05));
  }

  /* --- Variant: ghost --- */
  .cbx-combobox__trigger[data-variant="ghost"] {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
  }
  .cbx-combobox__trigger[data-variant="ghost"]:hover:not(:disabled):not([data-open]) {
    background: var(--backgroundHover);
  }

  /* --- Variant: filled --- */
  .cbx-combobox__trigger[data-variant="filled"] {
    background: var(--backgroundSecondary);
    border-color: transparent;
  }

  /* --- Size\uFF08\u5BF9\u9F50 control / fontSize tokens\uFF09 --- */
  .cbx-combobox__trigger[data-size="small"] {
    min-height: var(--control-sm);
    font-size: var(--fontSize-sm);
    /* right padding reserves chevron/clear; left uses space token */
    padding: 0 30px 0 var(--space-2);
  }
  .cbx-combobox__trigger[data-size="medium"] {
    min-height: var(--control-md);
    font-size: var(--fontSize-base);
    padding: 0 36px 0 var(--space-3);
  }
  .cbx-combobox__trigger[data-size="large"] {
    min-height: var(--control-xl);
    font-size: var(--fontSize-lg);
    padding: 0 var(--space-10) 0 var(--space-4);
  }

  .cbx-combobox__trigger:hover:not(:disabled):not([data-variant="ghost"]) {
    border-color: var(--borderHover, var(--textTertiary));
  }

  /* focus\uFF08\u952E\u76D8\uFF09\u4E0E open \u5171\u7528\u4E3B\u9898 primary / focus ring\uFF0C\u53BB\u6389\u786C\u7F16\u7801\u84DD */
  .cbx-combobox__trigger:focus-visible,
  .cbx-combobox__trigger[data-open] {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--focus, var(--primaryGhost, color-mix(in srgb, var(--primary) 18%, transparent)));
    z-index: 2;
  }

  /* error \u4F18\u5148\u4E8E open/focus \u7684\u8272\u76F8\uFF0C\u73AF\u4ECD\u53EF\u533A\u5206 */
  .cbx-combobox__trigger[aria-invalid="true"] {
    border-color: var(--danger, var(--error));
  }
  .cbx-combobox__trigger[aria-invalid="true"]:focus-visible,
  .cbx-combobox__trigger[aria-invalid="true"][data-open] {
    border-color: var(--danger, var(--error));
    box-shadow: 0 0 0 3px var(--danger-alpha-10, color-mix(in srgb, var(--danger, var(--error)) 15%, transparent));
  }

  .cbx-combobox__trigger:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    background: var(--backgroundSecondary);
    border-color: var(--border);
    box-shadow: none;
    color: var(--textTertiary);
  }

  .cbx-combobox__text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
  }
  .cbx-combobox__text[data-placeholder] {
    color: var(--textTertiary);
  }

  .cbx-combobox__icon-prefix {
    margin-right: var(--space-2, 8px);
    color: var(--textSecondary);
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .cbx-combobox__ctrl {
    position: absolute;
    right: var(--space-2, 8px);
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    gap: var(--space-1, 4px);
    color: var(--textTertiary);
  }

  .cbx-combobox__clear {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    border-radius: var(--radius-xs, var(--radius-sm));
    cursor: pointer;
    background: transparent;
    border: none;
    color: inherit;
    outline: none;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .cbx-combobox__clear:hover {
    background: var(--backgroundHover);
    color: var(--text);
  }
  .cbx-combobox__clear:focus-visible {
    background: var(--backgroundHover);
    color: var(--text);
    box-shadow: 0 0 0 2px var(--focus, var(--primaryGhost, color-mix(in srgb, var(--primary) 18%, transparent)));
  }

  .cbx-combobox__chevron {
    display: flex;
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }
  .cbx-combobox__trigger[data-open] .cbx-combobox__chevron {
    transform: rotate(180deg);
  }

  /* \u2605 Panel \u4F7F\u7528\u7EDD\u5BF9\u5B9A\u4F4D\uFF0C\u8D34\u7740\u89E6\u53D1\u5668\u4E0B\u65B9 */
  .cbx-combobox__panel {
    position: absolute;
    top: calc(100% + var(--space-1, 4px));
    left: 0;
    width: 100%;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
    box-shadow: var(--shadowMedium,
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 10px 15px -3px rgba(0, 0, 0, 0.1));
    display: flex;
    flex-direction: column;
    animation: cbx-fade-in 0.1s ease-out;
    z-index: ${U.dropdown};
  }

  @keyframes cbx-fade-in {
    from { opacity: 0; transform: translateY(-4px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .cbx-combobox__search-wrap {
    position: relative;
    border-bottom: 1px solid var(--borderLight);
    padding: var(--space-1, 4px) var(--space-2, 8px);
    flex-shrink: 0;
  }

  .cbx-combobox__search-icon {
    position: absolute;
    left: var(--space-3, 12px);
    top: 50%;
    transform: translateY(-50%);
    color: var(--textTertiary);
    pointer-events: none;
  }

  .cbx-combobox__search {
    width: 100%;
    height: var(--control-md);
    padding: 0 var(--space-2, 8px) 0 28px;
    border: none !important;
    outline: none !important;
    background: transparent;
    color: var(--text);
    font-size: var(--fontSize-base);
  }

  .cbx-combobox__list {
    max-height: 220px;
    overflow-y: auto;
    padding: var(--space-1, 4px);
    scroll-behavior: auto;
  }

  .cbx-combobox__item {
    padding: 6px var(--space-3, 12px) 6px var(--space-2, 8px);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--fontSize-base);
    color: var(--text);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2, 8px);
    transition: background 0.1s ease;
    user-select: none;
    scroll-margin: 40px;
  }

  /* highlight \u4EC5\u94FA\u5E95\uFF1Bselected \u4FDD\u7559 primary \u8272\u76F8\uFF0C\u4E8C\u8005\u53EF\u53E0\u52A0 */
  .cbx-combobox__item[data-highlighted]:not([data-selected]) {
    background: var(--backgroundHover);
  }

  .cbx-combobox__item[data-selected] {
    background: color-mix(in srgb, var(--primary) 12%, transparent);
    color: var(--primary);
    font-weight: 500;
  }

  .cbx-combobox__item[data-selected][data-highlighted] {
    background: color-mix(in srgb, var(--primary) 18%, transparent);
    color: var(--primary);
  }

  .cbx-combobox__item-check {
    color: var(--primary);
    margin-left: var(--space-2, 8px);
    flex-shrink: 0;
  }

  .cbx-combobox__status {
    padding: var(--space-3, 12px);
    text-align: center;
    font-size: var(--fontSize-base);
  }

  .cbx-combobox__status--loading {
    color: var(--textSecondary);
  }

  .cbx-combobox__status--empty {
    color: var(--textTertiary);
  }

  .cbx-combobox__helper {
    margin-top: var(--space-1, 4px);
    font-size: var(--fontSize-xs);
    color: var(--textSecondary);
  }
  .cbx-combobox__helper[data-error] {
    color: var(--danger, var(--error));
  }

  .cbx-combobox__list::-webkit-scrollbar { width: 5px; }
  .cbx-combobox__list::-webkit-scrollbar-thumb { background: var(--border); border-radius: var(--radius-sm); }
  .cbx-combobox__list::-webkit-scrollbar-thumb:hover { background: var(--textTertiary); }

  @media (prefers-reduced-motion: reduce) {
    .cbx-combobox__trigger,
    .cbx-combobox__clear,
    .cbx-combobox__item,
    .cbx-combobox__chevron {
      transition: none;
    }
    .cbx-combobox__panel {
      animation: none;
    }
  }
`;function se(...y){return d=>{y.forEach(i=>{i&&(typeof i=="function"?i(d):i.current=d)})}}function X(y){let{items:d=[],onChange:i,placeholder:q,labelField:E="label",valueField:L="value",disabled:f=!1,selectedItem:s,renderOptionContent:N,error:C=!1,helperText:I,label:R,icon:D,searchable:u=!1,clearable:J=!1,loading:H=!1,size:M="medium",variant:Q="default",ref:W}=y,{t:m}=G(),A=(0,a.useId)(),[t,l]=(0,a.useState)(!1),[b,p]=(0,a.useState)(-1),[x,K]=(0,a.useState)(""),O=(0,a.useRef)(null),h=(0,a.useRef)([]),w=(0,a.useRef)(null),B=(0,a.useRef)(null),g=(0,a.useCallback)(e=>e?String(e?.[E]??""):"",[E]),_=(0,a.useCallback)(e=>e?e?.[L]:void 0,[L]),k=(0,a.useCallback)((e,o)=>{let c=_(e),v=_(o);return c!==void 0&&v!==void 0?c===v:e===o},[_]),n=(0,a.useMemo)(()=>{if(!u||!x)return d;let e=x.toLowerCase();return d.filter(o=>g(o).toLowerCase().includes(e))},[d,x,u,g]);(0,a.useEffect)(()=>{if(!t)return;let e=o=>{w.current&&(w.current.contains(o.target)||l(!1))};return document.addEventListener("mousedown",e),document.addEventListener("touchstart",e),()=>{document.removeEventListener("mousedown",e),document.removeEventListener("touchstart",e)}},[t]),(0,a.useEffect)(()=>{t||(K(""),p(-1))},[t]),(0,a.useEffect)(()=>{if(!t)return;let e=-1;!x&&s&&(e=n.findIndex(c=>k(c,s))),e<0&&n.length>0&&(e=0),p(e);let o=window.requestAnimationFrame(()=>{t&&(e>=0&&h.current[e]&&h.current[e]?.scrollIntoView({block:"center",inline:"nearest"}),u&&O.current?.focus())});return()=>{window.cancelAnimationFrame(o)}},[t,n,k,x,s,u]),(0,a.useEffect)(()=>{if(!t||b<0)return;let e=h.current[b];e&&e.scrollIntoView({block:"nearest",inline:"nearest"})},[t,b]);let Z=s?g(s):"",ee=se(B,W),oe=()=>{f||l(e=>!e)},F=e=>{if(n.length===0){p(-1);return}p(o=>o<0?e==="down"?0:n.length-1:e==="down"?(o+1)%n.length:(o-1+n.length)%n.length)},T=()=>{b>=0&&n[b]&&(i?.(n[b]),l(!1))},re=e=>{if(f)return;let{key:o}=e;if(o==="ArrowDown"||o==="ArrowUp"){e.preventDefault(),t?F(o==="ArrowDown"?"down":"up"):l(!0);return}if(o==="Enter"||o===" "){e.preventDefault(),t?T():l(!0);return}o==="Escape"&&t&&(e.preventDefault(),l(!1))},ae=e=>{let{key:o}=e;if(o==="ArrowDown"||o==="ArrowUp"){e.preventDefault(),F(o==="ArrowDown"?"down":"up");return}if(o==="Enter"){e.preventDefault(),T();return}o==="Escape"&&(e.preventDefault(),l(!1),B.current?.focus())};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)("style",{children:ce}),(0,r.jsxs)("div",{className:"cbx-combobox",ref:w,children:[R&&(0,r.jsx)("label",{htmlFor:A,className:"cbx-combobox__label",children:R}),(0,r.jsxs)("button",{id:A,ref:ee,type:"button",className:"cbx-combobox__trigger",disabled:f,"data-open":t?"":void 0,"data-size":M,"data-variant":Q,"aria-expanded":t,"aria-invalid":C,onClick:oe,onKeyDown:re,children:[D&&(0,r.jsx)("span",{className:"cbx-combobox__icon-prefix","aria-hidden":"true",children:D}),(0,r.jsx)("span",{className:"cbx-combobox__text","data-placeholder":s?void 0:"",children:Z||q||m("dropdown.placeholder","Select...")}),(0,r.jsxs)("div",{className:"cbx-combobox__ctrl",children:[J&&s&&!f&&!H&&(0,r.jsx)("span",{role:"button",tabIndex:0,className:"cbx-combobox__clear","aria-label":m("dropdown.clear","Clear selection"),onClick:e=>{e.stopPropagation(),i?.(null)},onKeyDown:e=>{(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),e.stopPropagation(),i?.(null))},children:(0,r.jsx)(V,{size:14,"aria-hidden":"true"})}),(0,r.jsx)($,{className:"cbx-combobox__chevron",size:M==="small"?14:16,"aria-hidden":"true"})]})]}),I&&(0,r.jsx)("div",{className:"cbx-combobox__helper","data-error":C?"":void 0,children:I}),t&&(0,r.jsxs)("div",{className:"cbx-combobox__panel",onKeyDown:e=>{e.key==="Enter"&&(e.preventDefault(),T())},children:[u&&(0,r.jsxs)("div",{className:"cbx-combobox__search-wrap",children:[(0,r.jsx)(Y,{className:"cbx-combobox__search-icon",size:16,"aria-hidden":"true"}),(0,r.jsx)("input",{ref:O,className:"cbx-combobox__search",placeholder:m("dropdown.search","Search..."),value:x,onChange:e=>K(e.target.value),onClick:e=>e.stopPropagation(),onKeyDown:ae})]}),(0,r.jsx)("div",{role:"listbox",className:"cbx-combobox__list",children:H?(0,r.jsx)("div",{className:"cbx-combobox__status cbx-combobox__status--loading",role:"status","aria-live":"polite",children:m("dropdown.loading","Loading...")}):n.length===0?(0,r.jsx)("div",{className:"cbx-combobox__status cbx-combobox__status--empty",role:"status",children:m("dropdown.noResults","No results found")}):n.map((e,o)=>{let c=k(s,e),v=b===o,z=_(e),te=z!=null?String(z):`opt-${o}-${g(e).slice(0,24)}`;return(0,r.jsx)("div",{ref:ne=>{h.current[o]=ne},role:"option",tabIndex:-1,"aria-selected":c,className:"cbx-combobox__item","data-selected":c?"":void 0,"data-highlighted":v?"":void 0,onClick:()=>{i?.(e),l(!1)},onMouseEnter:()=>p(o),children:N?N(e,v,c):(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)("span",{children:g(e)}),c&&(0,r.jsx)(j,{size:16,className:"cbx-combobox__item-check","aria-hidden":"true"})]})},te)})})]})]})]})}X.displayName="Combobox";var ue=X;export{ue as a};
