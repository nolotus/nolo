import{a as P}from"/public/assets/chunks/chunk-PSEWLHBA.js";import{a as A}from"/public/assets/chunks/chunk-P6I6EUS4.js";import{a as M}from"/public/assets/chunks/chunk-3YN6ZSRO.js";import"/public/assets/chunks/chunk-B4ZQOXFP.js";import{i as x,j as y,l as g,n as b}from"/public/assets/chunks/chunk-WA4OTMP3.js";import{b as n,c as C}from"/public/assets/chunks/chunk-TWBDD7AR.js";import"/public/assets/chunks/chunk-QOSCV6NU.js";import{Hg as $,ac as I,hh as z,ih as R,mh as L}from"/public/assets/chunks/chunk-HKUXCXEJ.js";import"/public/assets/chunks/chunk-SXWL6VTT.js";import"/public/assets/chunks/chunk-E6T75ZBQ.js";import"/public/assets/chunks/chunk-XALR5WJZ.js";import{Lb as w,le as k,td as S,zc as N}from"/public/assets/chunks/chunk-YCHPG2J3.js";import"/public/assets/chunks/chunk-JJPKQBGY.js";import{j as T}from"/public/assets/chunks/chunk-SPQDGJEP.js";import"/public/assets/chunks/chunk-4YTIRDRO.js";import"/public/assets/chunks/chunk-FG7XJFJK.js";import"/public/assets/chunks/chunk-PUUF5POR.js";import"/public/assets/chunks/chunk-R4O5ZQKC.js";import"/public/assets/chunks/chunk-U4Y5UIOZ.js";import"/public/assets/chunks/chunk-WXUJXMLM.js";import"/public/assets/chunks/chunk-2A2V6TYA.js";import"/public/assets/chunks/chunk-QEV77ZRC.js";import"/public/assets/chunks/chunk-POLSHW4R.js";import"/public/assets/chunks/chunk-HTZ3TX2K.js";import"/public/assets/chunks/chunk-5JAIXTMH.js";import{a as h}from"/public/assets/chunks/chunk-EFFT3IGY.js";import"/public/assets/chunks/chunk-2SFLHF46.js";import{a as B}from"/public/assets/chunks/chunk-CLEBNC37.js";import"/public/assets/chunks/chunk-RXYEQGOK.js";import{e as c}from"/public/assets/chunks/chunk-HA3VNNOB.js";var p=c(B(),1);var a=c(h(),1),H=()=>{let{spaceId:t}=g(),d=y(),l=x(),i=M(),r=n(R),m=n(L),v=l.pathname,u=i&&!m,o=[{id:"home",path:`/space/${t}`,label:(0,a.jsxs)("span",{className:"nav-item-content",children:[(0,a.jsx)(w,{size:16,className:"nav-icon","aria-hidden":"true"}),"\u9996\u9875"]})},{id:"members",path:`/space/${t}/members`,label:(0,a.jsxs)("span",{className:"nav-item-content",children:[(0,a.jsxs)("span",{className:"nav-icon-wrap",children:[(0,a.jsx)(k,{size:16,className:"nav-icon","aria-hidden":"true"}),u&&(0,a.jsx)("span",{className:"nav-badge nav-badge--corner",children:r?.members?.length||0})]}),"\u6210\u5458"]})},...r?.boundFolder?[{id:"preview",path:`/space/${t}/preview`,label:(0,a.jsxs)("span",{className:"nav-item-content",children:[(0,a.jsx)(N,{size:16,className:"nav-icon","aria-hidden":"true"}),"\u9884\u89C8"]})}]:[],{id:"settings",path:`/space/${t}/settings`,label:(0,a.jsxs)("span",{className:"nav-item-content",children:[(0,a.jsx)(S,{size:16,className:"nav-icon","aria-hidden":"true"}),"\u8BBE\u7F6E"]})}],_=(()=>{let s=v.replace(`/space/${t}`,"");return s===""||s==="/"?"home":s.split("/").filter(Boolean)[0]||"home"})(),F=s=>{let f=o.find(j=>j.id===s);f&&d(f.path)};return(0,a.jsx)("div",{className:"space-navigation",children:(0,a.jsx)("div",{className:"space-header",children:(0,a.jsx)("div",{className:"space-header__right",children:(0,a.jsx)(P,{tabs:o.map(s=>({id:s.id,label:s.label,disabled:!1})),activeTab:_,onChange:F,className:"space-tabs-nav"})})})})},W=H;var e=c(h(),1),K=()=>{let{spaceId:t,pageKey:d}=g(),l=C(),i=A(),r=n(I),m=n(z),v=typeof d=="string"&&d.length>0,u=r>0?Math.max(1360,1600-Math.round(r*.6)):1600;return(0,p.useEffect)(()=>{if(!t)return;let o=T(t);o!==m&&l($(o))},[m,l,t]),v?(0,e.jsxs)("div",{className:"space-content-route-shell",children:[(0,e.jsx)(p.Suspense,{fallback:(0,e.jsx)("div",{className:"loading",children:"\u52A0\u8F7D\u4E2D..."}),children:(0,e.jsx)(b,{})}),(0,e.jsx)("style",{children:`
          .space-content-route-shell {
            width: 100%;
            min-width: 0;
            min-height: 0;
            height: 100%;
            display: flex;
            flex-direction: column;
          }

          .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 400px;
            color: ${i.textTertiary};
          }
        `})]}):(0,e.jsxs)("div",{className:"space-layout",children:[(0,e.jsx)(W,{}),(0,e.jsx)("div",{className:"space-content",children:(0,e.jsx)(p.Suspense,{fallback:(0,e.jsx)("div",{className:"loading",children:"\u52A0\u8F7D\u4E2D..."}),children:(0,e.jsx)(b,{})})}),(0,e.jsx)("style",{children:`
        .space-layout {
          --space-shell-max-width: ${u}px;
          --space-shell-padding-x: 24px;
          width: 100%;
          max-width: var(--space-shell-max-width);
          margin: 0 auto;
          padding: 0 var(--space-shell-padding-x) 40px;
          box-sizing: border-box;
          display: grid;
          grid-template-columns: 1fr;
          gap: ${i.space[5]};
        }

        .space-content {
          border-radius: var(--radius-md);
          min-height: 600px;
          min-width: 0;
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 400px;
          color: ${i.textTertiary};
        }

        @media (max-width: 768px) {
          .space-layout {
            --space-shell-padding-x: ${i.space[3]};
          }

          .space-content {
            min-height: 0;
          }
        }
      `})]})},oa=K;export{oa as default};
