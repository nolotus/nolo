import{a as g,b as D,c as U,e as F,f as j}from"/public/assets/chunks/chunk-6CX6Z3WB.js";import{a as p}from"/public/assets/chunks/chunk-BQI3OTHD.js";import"/public/assets/chunks/chunk-5NMWODED.js";import"/public/assets/chunks/chunk-B4ZQOXFP.js";import{bh as A}from"/public/assets/chunks/chunk-K6SBFEEZ.js";import"/public/assets/chunks/chunk-2ZZ6V4LQ.js";import"/public/assets/chunks/chunk-3ICWFKJ6.js";import"/public/assets/chunks/chunk-XALR5WJZ.js";import{Ha as I,Hc as O,Va as B,b as R,qa as T}from"/public/assets/chunks/chunk-I4KLHIYO.js";import"/public/assets/chunks/chunk-I5HE5HNS.js";import"/public/assets/chunks/chunk-E6T75ZBQ.js";import"/public/assets/chunks/chunk-W65LD2KU.js";import"/public/assets/chunks/chunk-QIQIZ5RO.js";import"/public/assets/chunks/chunk-MVW2HXM5.js";import"/public/assets/chunks/chunk-GQT5AZMC.js";import"/public/assets/chunks/chunk-JMHQCR2I.js";import"/public/assets/chunks/chunk-ZVR4E5KZ.js";import"/public/assets/chunks/chunk-WXUJXMLM.js";import"/public/assets/chunks/chunk-2A2V6TYA.js";import"/public/assets/chunks/chunk-QEV77ZRC.js";import"/public/assets/chunks/chunk-CNZCU3D4.js";import"/public/assets/chunks/chunk-HTZ3TX2K.js";import"/public/assets/chunks/chunk-P6V6WVAI.js";import{a as M}from"/public/assets/chunks/chunk-U3FV4FR4.js";import{a as K}from"/public/assets/chunks/chunk-DYHF2IZM.js";import"/public/assets/chunks/chunk-2SFLHF46.js";import{d as P}from"/public/assets/chunks/chunk-WEOWWZTJ.js";var n=P(K());var t=P(M()),H="nolo-inspector";function q(){let L=A(),v=L?.boundFolder,s=L?.id,[a,J]=(0,n.useState)(null),[b,C]=(0,n.useState)(null),[X,S]=(0,n.useState)(!1),[G,E]=(0,n.useState)(0),[c,k]=(0,n.useState)(!1),l=(0,n.useRef)(null),y=(0,n.useRef)(!1),z=(0,n.useRef)(null),d=F(),m=j(),_=(0,n.useCallback)(()=>{let e=l.current;if(!e)return;let r=e.getBoundingClientRect(),o=window.devicePixelRatio||1,i=e.getContext("2d");if(!i)return;let h=e.width&&e.height?e.toDataURL():null;if(e.width=Math.max(1,Math.round(r.width*o)),e.height=Math.max(1,Math.round(r.height*o)),i.setTransform(o,0,0,o,0,0),h){let x=new Image;x.onload=()=>i.drawImage(x,0,0,r.width,r.height),x.src=h}},[]);(0,n.useEffect)(()=>{if(!c)return;_();let e=new ResizeObserver(_);return l.current&&e.observe(l.current),()=>e.disconnect()},[c,_]);let W=(0,n.useCallback)(()=>{let e=l.current,r=e?.getContext("2d");e&&r&&r.clearRect(0,0,e.width,e.height)},[]),Y=(0,n.useCallback)(e=>{let r=l.current,o=r?.getContext("2d");if(!r||!o||!y.current)return;let i=r.getBoundingClientRect();o.lineTo(e.clientX-i.left,e.clientY-i.top),o.stroke()},[]),N=(0,n.useCallback)(()=>{y.current=!1},[]),$=(0,n.useCallback)(e=>{let r=l.current,o=r?.getContext("2d");if(!r||!o)return;r.setPointerCapture(e.pointerId);let i=r.getBoundingClientRect();o.beginPath(),o.moveTo(e.clientX-i.left,e.clientY-i.top),o.lineWidth=3,o.lineCap="round",o.lineJoin="round",o.strokeStyle="#ef4444",y.current=!0},[]),f=(0,n.useCallback)(async()=>{if(!(!v||!s)){S(!0),C(null);try{let e=await fetch("/api/local-preview/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({previewId:s,root:v})}),r=await e.json();if(!e.ok||!r.url)throw new Error(r.error||"\u542F\u52A8\u9884\u89C8\u5931\u8D25");J(r.url)}catch(e){C(e instanceof Error?e.message:String(e))}finally{S(!1)}}},[v,s]);(0,n.useEffect)(()=>{f()},[f]),(0,n.useEffect)(()=>{if(!a||!s)return;let e=!1,r=setInterval(async()=>{try{let i=await(await fetch("/api/local-preview/status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({previewId:s})})).json();if(e||i.running)return;await f(),e||E(h=>h+1)}catch{}},5e3);return()=>{e=!0,clearInterval(r)}},[a,s,f]);let u=(0,n.useMemo)(()=>a?new URL(a).origin:null,[a]),w=(0,n.useCallback)(e=>{u&&z.current?.contentWindow?.postMessage({source:H,...e},u)},[u]);return(0,n.useEffect)(()=>{if(!u)return;let e=r=>{if(r.origin!==u)return;let o=r.data;if(!(!o||o.source!==H)){if(o.type==="ready"){w({type:"set-inspecting",value:d});return}o.type==="selected"&&o.node&&s&&(D({appKey:s,node:o.node}),g(!1))}};return window.addEventListener("message",e),()=>window.removeEventListener("message",e)},[d,w,u,s]),(0,n.useEffect)(()=>{w({type:"set-inspecting",value:d})},[d,w]),(0,n.useEffect)(()=>()=>g(!1),[]),v?(0,t.jsxs)("div",{className:"LocalPreview",children:[(0,t.jsxs)("div",{className:"LocalPreview__toolbar",children:[(0,t.jsx)(p,{size:"small",variant:c?"primary":"secondary",icon:(0,t.jsx)(I,{size:14}),onClick:()=>{k(e=>!e),g(!1)},disabled:!a,title:"\u5728\u9884\u89C8\u4E0A\u81EA\u7531\u7ED8\u5236",children:c?"\u9000\u51FA\u753B\u7B14":"\u753B\u7B14"}),c?(0,t.jsx)(p,{size:"small",variant:"ghost",icon:(0,t.jsx)(O,{size:14}),onClick:W,title:"\u6E05\u7A7A\u7B14\u8FF9",children:"\u6E05\u7A7A"}):null,(0,t.jsx)(p,{size:"small",variant:d?"primary":"secondary",icon:(0,t.jsx)(B,{size:14}),onClick:()=>{g(!d),k(!1)},disabled:!a,children:d?"\u9000\u51FA\u6807\u6CE8":"\u6807\u6CE8"}),(0,t.jsx)(p,{size:"small",variant:"ghost",icon:(0,t.jsx)(T,{size:14}),onClick:()=>E(e=>e+1),disabled:!a,title:"\u5237\u65B0\u9884\u89C8",children:"\u5237\u65B0"}),(0,t.jsx)("span",{className:"LocalPreview__path",title:v,children:v}),m?(0,t.jsxs)("span",{className:"LocalPreview__selected",children:[(0,t.jsxs)("code",{children:["<",m.tagName,">"]}),m.noloLoc?(0,t.jsx)("span",{className:"LocalPreview__loc",children:m.noloLoc}):null,(0,t.jsx)(p,{size:"small",variant:"ghost",icon:(0,t.jsx)(R,{size:14}),onClick:()=>U(),title:"\u53D6\u6D88\u9009\u4E2D"})]}):null]}),(0,t.jsx)("div",{className:"LocalPreview__body",children:b?(0,t.jsxs)("div",{className:"LocalPreview__message",children:[(0,t.jsx)("div",{className:"LocalPreview__error",children:b}),(0,t.jsx)(p,{size:"small",variant:"secondary",onClick:()=>void f(),children:"\u91CD\u8BD5"})]}):a?(0,t.jsxs)("div",{className:"LocalPreview__canvasArea",children:[(0,t.jsx)("iframe",{ref:z,src:a,title:"\u672C\u5730\u9884\u89C8",className:"LocalPreview__frame"},`${a}#${G}`),(0,t.jsx)("canvas",{ref:l,className:"LocalPreview__brushCanvas",onPointerDown:$,onPointerMove:Y,onPointerUp:N,onPointerCancel:N,"aria-label":"\u9884\u89C8\u753B\u5E03",style:{pointerEvents:c?"auto":"none",visibility:c?"visible":"hidden"}})]}):(0,t.jsx)("div",{className:"LocalPreview__message",children:X?"\u6B63\u5728\u542F\u52A8\u672C\u5730\u9884\u89C8\u2026":"\u9884\u89C8\u672A\u542F\u52A8"})}),(0,t.jsx)("style",{children:`
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

        .LocalPreview__canvasArea {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 0;
        }

        .LocalPreview__frame {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }

        .LocalPreview__brushCanvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          touch-action: none;
          cursor: crosshair;
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
      `})]}):(0,t.jsx)("div",{style:{padding:24},children:"\u5F53\u524D\u7A7A\u95F4\u6CA1\u6709\u7ED1\u5B9A\u672C\u5730\u6587\u4EF6\u5939\uFF0C\u65E0\u6CD5\u9884\u89C8\u3002\u53EF\u4EE5\u5728\u7A7A\u95F4\u8BBE\u7F6E\u91CC\u7ED1\u5B9A\u4E00\u4E2A\u76EE\u5F55\u3002"})}export{q as default};
