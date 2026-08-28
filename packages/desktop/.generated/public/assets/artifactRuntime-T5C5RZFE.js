import{a as M}from"/public/assets/chunks/chunk-GP3Z74JB.js";import"/public/assets/chunks/chunk-P6V6WVAI.js";import{a as g}from"/public/assets/chunks/chunk-U3FV4FR4.js";import{a as x}from"/public/assets/chunks/chunk-DYHF2IZM.js";import{a as b}from"/public/assets/chunks/chunk-2SFLHF46.js";import{d}from"/public/assets/chunks/chunk-WEOWWZTJ.js";var A=d(M(),1);var o=d(x(),1);var r=d(g(),1),T="nolo-artifact-host",P="nolo-artifact-runtime",H="nolo-artifact-ready",G="nolo-artifact-height",V="nolo-artifact-error",F=o.default.lazy(async()=>({default:(await import("/public/assets/chunks/esm-26I4EDB2.js")).default})),i=new Map,C=new Map;function c(e){return(0,r.jsxs)("svg",{viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",...e,children:[(0,r.jsx)("path",{d:"M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"}),(0,r.jsx)("path",{d:"M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"})]})}function S(e){let t=Array.from(new Set(e)).filter(n=>/^Lu[A-Z][A-Za-z0-9]*$/.test(n)&&!i.has(n));if(t.length===0)return Promise.resolve();let l=import(`/artifact-icons?names=${encodeURIComponent(t.sort().join(","))}`).then(n=>{for(let a of t)i.set(a,n[a]||c)}).catch(()=>{for(let n of t)i.set(n,c)});for(let n of t)C.set(n,l.then(()=>i.get(n)||c));return l}function z(e){let t=f=>{let[l,n]=(0,o.useState)(()=>i.get(e)||c);return(0,o.useEffect)(()=>{if(i.has(e)){n(()=>i.get(e)||c);return}let a=!0;return(C.get(e)||S([e]).then(()=>i.get(e)||c)).then(p=>{a&&n(()=>p||c)}),()=>{a=!1}},[]),(0,r.jsx)(l,{...f})};return t.displayName=e,t}var v=new Proxy({LuSparkles:c},{get(e,t){return typeof t=="string"&&t.startsWith("Lu")&&(e[t]||(e[t]=z(t))),e[t]}});function h(e){window.parent.postMessage({source:P,...e},"*")}function u(){let e=document.body,t=document.documentElement;h({type:G,height:Math.max(e.scrollHeight,e.offsetHeight,t.clientHeight,t.scrollHeight,t.offsetHeight,180)})}function O(){h({type:H}),u(),requestAnimationFrame(u)}function _(){let e=(0,o.useRef)(null),[t,f]=(0,o.useState)(null),[l,n]=(0,o.useState)(!1);return(0,o.useEffect)(()=>{let a=new ResizeObserver(()=>u());a.observe(document.documentElement),a.observe(document.body);let m=s=>{n(!0),h({type:V,message:s}),u()},p=s=>{m(s.message||"runtime error")},y=s=>{m(String(s.reason||"runtime error"))},E=s=>{if(s.data?.source===T&&s.data?.type==="render"&&typeof s.data?.code=="string")try{n(!1);let R={React:o.default,ReactECharts:F,Icons:v,...v,__noloArtifactPreloadIcons:S,useState:o.default.useState,useEffect:o.default.useEffect,useMemo:o.default.useMemo,useCallback:o.default.useCallback,useRef:o.default.useRef,useReducer:o.default.useReducer,useContext:o.default.useContext};Object.assign(window,R);let w=new Function(`${s.data.code}
return Example;`)();if(typeof w!="function")throw new Error("Example component not found");f(()=>w)}catch(R){m(b(R))}};return window.addEventListener("error",p),window.addEventListener("unhandledrejection",y),window.addEventListener("message",E),h({type:"nolo-artifact-runtime-loaded"}),u(),()=>{a.disconnect(),window.removeEventListener("error",p),window.removeEventListener("unhandledrejection",y),window.removeEventListener("message",E)}},[]),(0,o.useLayoutEffect)(()=>{!t||!e.current||O()},[t]),(0,r.jsxs)("main",{className:"ArtifactRuntimePage",children:[(0,r.jsx)("div",{ref:e,"data-nolo-artifact-root":!0,children:l?(0,r.jsx)("div",{className:"nolo-artifact-error",children:"\u9875\u9762\u6B63\u5728\u751F\u6210\uFF0C\u8BF7\u7A0D\u5019\u91CD\u8BD5\u3002"}):t?(0,r.jsx)(o.default.Suspense,{fallback:(0,r.jsx)("div",{className:"nolo-artifact-loading",children:"\u56FE\u8868\u52A0\u8F7D\u4E2D\u2026"}),children:(0,r.jsx)(t,{})}):null}),(0,r.jsx)("style",{children:`
        :root {
          color-scheme: light dark;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: transparent;
          color: #111827;
        }
        * { box-sizing: border-box; }
        html, body, #root {
          margin: 0;
          min-height: 100%;
          background: transparent;
        }
        body {
          overflow: auto;
          overscroll-behavior: contain;
        }
        button, input, select, textarea {
          font: inherit;
        }
        a {
          color: inherit;
        }
        .ArtifactRuntimePage {
          min-height: 100%;
          background: transparent;
        }
        .nolo-artifact-error {
          min-height: 180px;
          display: grid;
          place-items: center;
          padding: 24px;
          color: #64748b;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
        }
        .nolo-artifact-loading {
          min-height: 180px;
          display: grid;
          place-items: center;
          padding: 24px;
          color: #64748b;
        }
      `})]})}var I=_;var k=d(g(),1),L=document.getElementById("root");L&&(0,A.createRoot)(L).render((0,k.jsx)(I,{}));
