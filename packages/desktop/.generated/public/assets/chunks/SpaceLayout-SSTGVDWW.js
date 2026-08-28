import{a as P}from"/public/assets/chunks/chunk-RYULNAV4.js";import{a as A}from"/public/assets/chunks/chunk-LXAJ2VYX.js";import{i as b,j as x,l as g,n as f}from"/public/assets/chunks/chunk-5NMWODED.js";import"/public/assets/chunks/chunk-B4ZQOXFP.js";import{bc as S,be as T,bh as R,eh as $,fi as z,od as I,oi as C,pi as L}from"/public/assets/chunks/chunk-K6SBFEEZ.js";import"/public/assets/chunks/chunk-2ZZ6V4LQ.js";import"/public/assets/chunks/chunk-3ICWFKJ6.js";import"/public/assets/chunks/chunk-XALR5WJZ.js";import{Nb as N,ca as w,k as y}from"/public/assets/chunks/chunk-I4KLHIYO.js";import"/public/assets/chunks/chunk-I5HE5HNS.js";import"/public/assets/chunks/chunk-E6T75ZBQ.js";import{m as k}from"/public/assets/chunks/chunk-W65LD2KU.js";import"/public/assets/chunks/chunk-QIQIZ5RO.js";import"/public/assets/chunks/chunk-MVW2HXM5.js";import"/public/assets/chunks/chunk-GQT5AZMC.js";import"/public/assets/chunks/chunk-JMHQCR2I.js";import"/public/assets/chunks/chunk-ZVR4E5KZ.js";import"/public/assets/chunks/chunk-WXUJXMLM.js";import"/public/assets/chunks/chunk-2A2V6TYA.js";import"/public/assets/chunks/chunk-QEV77ZRC.js";import"/public/assets/chunks/chunk-CNZCU3D4.js";import"/public/assets/chunks/chunk-HTZ3TX2K.js";import"/public/assets/chunks/chunk-P6V6WVAI.js";import{a as m}from"/public/assets/chunks/chunk-U3FV4FR4.js";import{a as j}from"/public/assets/chunks/chunk-DYHF2IZM.js";import"/public/assets/chunks/chunk-2SFLHF46.js";import{d as r}from"/public/assets/chunks/chunk-WEOWWZTJ.js";var o=r(j(),1);var a=r(m(),1),B=()=>{let{spaceId:t}=g(),c=x(),p=b(),s=z(),d=R(),l=T(),h=p.pathname,v=s&&!l,n=[{id:"home",path:`/space/${t}`,label:(0,a.jsxs)("span",{className:"nav-item-content",children:[(0,a.jsx)(N,{size:16,className:"nav-icon","aria-hidden":"true"}),"\u9996\u9875"]})},{id:"members",path:`/space/${t}/members`,label:(0,a.jsxs)("span",{className:"nav-item-content",children:[(0,a.jsxs)("span",{className:"nav-icon-wrap",children:[(0,a.jsx)(y,{size:16,className:"nav-icon","aria-hidden":"true"}),v&&(0,a.jsx)("span",{className:"nav-badge nav-badge--corner",children:d?.members?.length||0})]}),"\u6210\u5458"]})},{id:"settings",path:`/space/${t}/settings`,label:(0,a.jsxs)("span",{className:"nav-item-content",children:[(0,a.jsx)(w,{size:16,className:"nav-icon","aria-hidden":"true"}),"\u8BBE\u7F6E"]})}],W=(()=>{let i=h.replace(`/space/${t}`,"");return i===""||i==="/"?"home":i.split("/").filter(Boolean)[0]||"home"})(),_=i=>{let u=n.find(F=>F.id===i);u&&c(u.path)};return(0,a.jsx)("div",{className:"space-navigation",children:(0,a.jsx)("div",{className:"space-header",children:(0,a.jsx)("div",{className:"space-header__right",children:(0,a.jsx)(P,{tabs:n.map(i=>({id:i.id,label:i.label,disabled:!1})),activeTab:W,onChange:_,className:"space-tabs-nav"})})})})},M=B;var e=r(m(),1),E=()=>{let{spaceId:t,pageKey:c}=g(),p=L(),s=A(),d=C(S),l=I(),h=typeof c=="string"&&c.length>0,v=d>0?Math.max(1360,1600-Math.round(d*.6)):1600;return(0,o.useEffect)(()=>{if(!t)return;let n=k(t);n!==l&&p($(n))},[l,p,t]),h?(0,e.jsxs)("div",{className:"space-content-route-shell",children:[(0,e.jsx)(o.Suspense,{fallback:(0,e.jsx)("div",{className:"loading",children:"\u52A0\u8F7D\u4E2D..."}),children:(0,e.jsx)(f,{})}),(0,e.jsx)("style",{children:`
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
            color: ${s.textTertiary};
          }
        `})]}):(0,e.jsxs)("div",{className:"space-layout",children:[(0,e.jsx)(M,{}),(0,e.jsx)("div",{className:"space-content",children:(0,e.jsx)(o.Suspense,{fallback:(0,e.jsx)("div",{className:"loading",children:"\u52A0\u8F7D\u4E2D..."}),children:(0,e.jsx)(f,{})})}),(0,e.jsx)("style",{children:`
        .space-layout {
          --space-shell-max-width: ${v}px;
          --space-shell-padding-x: 24px;
          width: 100%;
          max-width: var(--space-shell-max-width);
          margin: 0 auto;
          padding: 0 var(--space-shell-padding-x) 40px;
          box-sizing: border-box;
          display: grid;
          grid-template-columns: 1fr;
          gap: ${s.space[5]};
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
          color: ${s.textTertiary};
        }

        @media (max-width: 768px) {
          .space-layout {
            --space-shell-padding-x: ${s.space[3]};
          }

          .space-content {
            min-height: 0;
          }
        }
      `})]})},oa=E;export{oa as default};
