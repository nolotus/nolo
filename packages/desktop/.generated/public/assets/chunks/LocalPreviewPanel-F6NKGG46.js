import{a as f,b as z,c as E,e as C,f as I}from"/public/assets/chunks/chunk-EXRONQ7G.js";import{a as p}from"/public/assets/chunks/chunk-2BJQMS5L.js";import"/public/assets/chunks/chunk-B4ZQOXFP.js";import"/public/assets/chunks/chunk-WA4OTMP3.js";import{b as k}from"/public/assets/chunks/chunk-TWBDD7AR.js";import"/public/assets/chunks/chunk-QOSCV6NU.js";import{ih as N}from"/public/assets/chunks/chunk-HKUXCXEJ.js";import"/public/assets/chunks/chunk-SXWL6VTT.js";import"/public/assets/chunks/chunk-E6T75ZBQ.js";import"/public/assets/chunks/chunk-XALR5WJZ.js";import{Dc as P,fd as b,ue as S}from"/public/assets/chunks/chunk-YCHPG2J3.js";import"/public/assets/chunks/chunk-JJPKQBGY.js";import"/public/assets/chunks/chunk-SPQDGJEP.js";import"/public/assets/chunks/chunk-4YTIRDRO.js";import"/public/assets/chunks/chunk-FG7XJFJK.js";import"/public/assets/chunks/chunk-PUUF5POR.js";import"/public/assets/chunks/chunk-R4O5ZQKC.js";import"/public/assets/chunks/chunk-U4Y5UIOZ.js";import"/public/assets/chunks/chunk-WXUJXMLM.js";import"/public/assets/chunks/chunk-2A2V6TYA.js";import"/public/assets/chunks/chunk-QEV77ZRC.js";import"/public/assets/chunks/chunk-POLSHW4R.js";import"/public/assets/chunks/chunk-HTZ3TX2K.js";import"/public/assets/chunks/chunk-5JAIXTMH.js";import{a as L}from"/public/assets/chunks/chunk-EFFT3IGY.js";import"/public/assets/chunks/chunk-2SFLHF46.js";import{a as B}from"/public/assets/chunks/chunk-CLEBNC37.js";import"/public/assets/chunks/chunk-RXYEQGOK.js";import{e as m}from"/public/assets/chunks/chunk-HA3VNNOB.js";var r=m(B());var e=m(L()),T="nolo-inspector";function F(){let g=k(N),l=g?.boundFolder,a=g?.id,[o,M]=(0,r.useState)(null),[w,y]=(0,r.useState)(null),[O,_]=(0,r.useState)(!1),[R,h]=(0,r.useState)(0),x=(0,r.useRef)(null),n=C(),v=I(),d=(0,r.useCallback)(async()=>{if(!(!l||!a)){_(!0),y(null);try{let t=await fetch("/api/local-preview/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({previewId:a,root:l})}),i=await t.json();if(!t.ok||!i.url)throw new Error(i.error||"\u542F\u52A8\u9884\u89C8\u5931\u8D25");M(i.url)}catch(t){y(t instanceof Error?t.message:String(t))}finally{_(!1)}}},[l,a]);(0,r.useEffect)(()=>{d()},[d]),(0,r.useEffect)(()=>{if(!o||!a)return;let t=!1,i=setInterval(async()=>{try{let j=await(await fetch("/api/local-preview/status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({previewId:a})})).json();if(t||j.running)return;await d(),t||h(A=>A+1)}catch{}},5e3);return()=>{t=!0,clearInterval(i)}},[o,a,d]);let c=(0,r.useMemo)(()=>o?new URL(o).origin:null,[o]),u=(0,r.useCallback)(t=>{c&&x.current?.contentWindow?.postMessage({source:T,...t},c)},[c]);return(0,r.useEffect)(()=>{if(!c)return;let t=i=>{if(i.origin!==c)return;let s=i.data;if(!(!s||s.source!==T)){if(s.type==="ready"){u({type:"set-inspecting",value:n});return}s.type==="selected"&&s.node&&a&&(z({appKey:a,node:s.node}),f(!1))}};return window.addEventListener("message",t),()=>window.removeEventListener("message",t)},[n,u,c,a]),(0,r.useEffect)(()=>{u({type:"set-inspecting",value:n})},[n,u]),(0,r.useEffect)(()=>()=>f(!1),[]),l?(0,e.jsxs)("div",{className:"LocalPreview",children:[(0,e.jsxs)("div",{className:"LocalPreview__toolbar",children:[(0,e.jsx)(p,{size:"small",variant:n?"primary":"secondary",icon:(0,e.jsx)(P,{size:14}),onClick:()=>f(!n),disabled:!o,children:n?"\u9000\u51FA\u6807\u6CE8":"\u6807\u6CE8"}),(0,e.jsx)(p,{size:"small",variant:"ghost",icon:(0,e.jsx)(b,{size:14}),onClick:()=>h(t=>t+1),disabled:!o,title:"\u5237\u65B0\u9884\u89C8",children:"\u5237\u65B0"}),(0,e.jsx)("span",{className:"LocalPreview__path",title:l,children:l}),v?(0,e.jsxs)("span",{className:"LocalPreview__selected",children:[(0,e.jsxs)("code",{children:["<",v.tagName,">"]}),v.noloLoc?(0,e.jsx)("span",{className:"LocalPreview__loc",children:v.noloLoc}):null,(0,e.jsx)(p,{size:"small",variant:"ghost",icon:(0,e.jsx)(S,{size:14}),onClick:()=>E(),title:"\u53D6\u6D88\u9009\u4E2D"})]}):null]}),(0,e.jsx)("div",{className:"LocalPreview__body",children:w?(0,e.jsxs)("div",{className:"LocalPreview__message",children:[(0,e.jsx)("div",{className:"LocalPreview__error",children:w}),(0,e.jsx)(p,{size:"small",variant:"secondary",onClick:()=>void d(),children:"\u91CD\u8BD5"})]}):o?(0,e.jsx)("iframe",{ref:x,src:o,title:"\u672C\u5730\u9884\u89C8",className:"LocalPreview__frame"},`${o}#${R}`):(0,e.jsx)("div",{className:"LocalPreview__message",children:O?"\u6B63\u5728\u542F\u52A8\u672C\u5730\u9884\u89C8\u2026":"\u9884\u89C8\u672A\u542F\u52A8"})}),(0,e.jsx)("style",{children:`
        .LocalPreview {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
        }

        .LocalPreview__toolbar {
          display: flex;
          align-items: center;
          gap: var(--space-2, 8px);
          padding: var(--space-2, 8px) var(--space-3, 12px);
          border-bottom: 1px solid var(--border);
          background: var(--background);
        }

        .LocalPreview__path {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          direction: rtl;
          text-align: left;
          font-size: var(--fontSize-sm, 12px);
          color: var(--textTertiary);
        }

        .LocalPreview__selected {
          display: inline-flex;
          align-items: center;
          gap: var(--space-1, 4px);
          padding: 2px 2px 2px 8px;
          border-radius: var(--radius-sm, 6px);
          background: var(--primaryGhost, var(--backgroundSecondary));
          font-size: var(--fontSize-sm, 12px);
          white-space: nowrap;
        }

        .LocalPreview__selected code {
          font-family: var(--fontFamily-mono, monospace);
          color: var(--primary);
        }

        .LocalPreview__loc {
          color: var(--textTertiary);
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .LocalPreview__body {
          flex: 1;
          min-height: 0;
          background: var(--backgroundSecondary);
        }

        .LocalPreview__frame {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }

        .LocalPreview__message {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-3, 12px);
          height: 100%;
          padding: var(--space-6, 24px);
          color: var(--textSecondary);
          font-size: var(--fontSize-sm, 13px);
          text-align: center;
        }

        .LocalPreview__error {
          color: var(--error);
        }
      `})]}):(0,e.jsx)("div",{style:{padding:24},children:"\u5F53\u524D\u7A7A\u95F4\u6CA1\u6709\u7ED1\u5B9A\u672C\u5730\u6587\u4EF6\u5939\uFF0C\u65E0\u6CD5\u9884\u89C8\u3002\u53EF\u4EE5\u5728\u7A7A\u95F4\u8BBE\u7F6E\u91CC\u7ED1\u5B9A\u4E00\u4E2A\u76EE\u5F55\u3002"})}export{F as default};
