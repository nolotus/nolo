import{a as ht}from"/public/assets/chunks/chunk-WZ7BTFAH.js";import"/public/assets/chunks/chunk-A2AE4ZIY.js";import{a as St}from"/public/assets/chunks/chunk-WFAIOBOT.js";import{a as q}from"/public/assets/chunks/chunk-NB7EXH4Q.js";import"/public/assets/chunks/chunk-PF7MTCHE.js";import"/public/assets/chunks/chunk-IOQKDOEC.js";import"/public/assets/chunks/chunk-2BJQMS5L.js";import"/public/assets/chunks/chunk-BHUMEZ7R.js";import"/public/assets/chunks/chunk-5HKEMIZS.js";import"/public/assets/chunks/chunk-7KOH4NGE.js";import"/public/assets/chunks/chunk-3C4Z6MLW.js";import{a as ut}from"/public/assets/chunks/chunk-L2ZNABAN.js";import{a as M,e as P}from"/public/assets/chunks/chunk-QPHIGPJI.js";import"/public/assets/chunks/chunk-VF2ZXLXP.js";import{a as ct}from"/public/assets/chunks/chunk-Q4SVFQXB.js";import{a as y,f as D,g as mt,h as V,i as pt,j as ft,o as gt,r as B,s as vt,w as U}from"/public/assets/chunks/chunk-4M664IBC.js";import{a as W}from"/public/assets/chunks/chunk-VKGAWMN5.js";import"/public/assets/chunks/chunk-VKO4JFEF.js";import{f as yt}from"/public/assets/chunks/chunk-BV33QXUJ.js";import"/public/assets/chunks/chunk-3YN6ZSRO.js";import"/public/assets/chunks/chunk-B4ZQOXFP.js";import{r as nt}from"/public/assets/chunks/chunk-WA4OTMP3.js";import{b as R,c as _}from"/public/assets/chunks/chunk-TWBDD7AR.js";import"/public/assets/chunks/chunk-QOSCV6NU.js";import{Gc as dt,jd as F,xc as st}from"/public/assets/chunks/chunk-HKUXCXEJ.js";import"/public/assets/chunks/chunk-SXWL6VTT.js";import"/public/assets/chunks/chunk-E6T75ZBQ.js";import"/public/assets/chunks/chunk-XALR5WJZ.js";import{$a as $,Sc as rt,ca as at,da as ot}from"/public/assets/chunks/chunk-YCHPG2J3.js";import{b as lt}from"/public/assets/chunks/chunk-JJPKQBGY.js";import"/public/assets/chunks/chunk-SPQDGJEP.js";import{c as it}from"/public/assets/chunks/chunk-4YTIRDRO.js";import"/public/assets/chunks/chunk-FG7XJFJK.js";import"/public/assets/chunks/chunk-PUUF5POR.js";import"/public/assets/chunks/chunk-R4O5ZQKC.js";import"/public/assets/chunks/chunk-U4Y5UIOZ.js";import"/public/assets/chunks/chunk-WXUJXMLM.js";import"/public/assets/chunks/chunk-2A2V6TYA.js";import"/public/assets/chunks/chunk-QEV77ZRC.js";import"/public/assets/chunks/chunk-POLSHW4R.js";import"/public/assets/chunks/chunk-HTZ3TX2K.js";import"/public/assets/chunks/chunk-5JAIXTMH.js";import{a as E}from"/public/assets/chunks/chunk-EFFT3IGY.js";import"/public/assets/chunks/chunk-2SFLHF46.js";import{a as et}from"/public/assets/chunks/chunk-CLEBNC37.js";import"/public/assets/chunks/chunk-RXYEQGOK.js";import{e as v}from"/public/assets/chunks/chunk-HA3VNNOB.js";var t=v(et(),1);var wt=v(et(),1);var s=v(E(),1),xt=wt.default.memo(({status:e,hasPendingChanges:i})=>{let a=R(dt),o=e||(i?"pending":null);return o?(0,s.jsxs)("div",{className:"page-save-status-indicator",children:[o==="saving"&&(0,s.jsxs)("div",{className:"page-status-content",children:[(0,s.jsx)("div",{className:"page-status-spinner"}),(0,s.jsx)("span",{children:"\u6B63\u5728\u4FDD\u5B58..."})]}),o==="saved"&&(0,s.jsxs)("div",{className:"page-status-content",children:[(0,s.jsx)(ot,{size:14,color:a.success,"aria-hidden":"true"}),(0,s.jsx)("span",{children:"\u5DF2\u4FDD\u5B58"})]}),o==="pending"&&(0,s.jsxs)("div",{className:"page-status-content page-status-pending",children:[(0,s.jsx)("div",{className:"page-status-pending-dot"}),(0,s.jsx)("span",{children:"\u6709\u672A\u4FDD\u5B58\u7684\u66F4\u6539"})]}),o==="error"&&(0,s.jsxs)("div",{className:"page-status-content page-status-error",children:[(0,s.jsx)(at,{size:14,color:a.error,"aria-hidden":"true"}),(0,s.jsx)("span",{children:"\u4FDD\u5B58\u5931\u8D25"})]}),(0,s.jsx)("style",{jsx:!0,children:`
          .page-save-status-indicator {
            position: fixed;
            bottom: 16px;
            right: 16px;
            padding: 8px 12px;
            background-color: ${a.backgroundSecondary};
            border-radius: var(--radius-md);
            font-size: var(--fontSize-sm);
            box-shadow: 0 2px 8px ${a.shadowLight};
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }
          .page-status-content {
            display: flex;
            align-items: center;
            gap: 6px;
            color: ${a.textSecondary};
          }
          .page-status-content.page-status-pending {
            color: ${a.warning||"#faad14"};
          }
          .page-status-content.page-status-error {
            color: ${a.error};
          }
          .page-status-spinner {
            width: 14px;
            height: 14px;
            border: 2px solid transparent;
            border-top-color: ${a.primary};
            border-radius: 50%;
            animation: statusSpinnerRotate 0.8s linear infinite;
          }
          .page-status-pending-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: ${a.warning||"#faad14"};
            animation: statusPendingPulse 2s infinite;
          }
          @keyframes statusSpinnerRotate {
            to {
              transform: rotate(360deg);
            }
          }
          @keyframes statusPendingPulse {
            0% {
              transform: scale(0.95);
              opacity: 0.7;
            }
            50% {
              transform: scale(1.05);
              opacity: 1;
            }
            100% {
              transform: scale(0.95);
              opacity: 0.7;
            }
          }
        `})]}):null}),bt=xt;var n=v(E(),1),H=(0,t.lazy)(()=>import("/public/assets/chunks/Editor-3NHNULXH.js")),Lt=2e3,At=2e3,Ct=e=>{if(!e)return null;let i=Date.parse(e);if(!Number.isFinite(i))return null;try{return new Intl.DateTimeFormat(void 0,{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(i))}catch{return null}};function Nt(e,i){(0,t.useEffect)(()=>{if(i)return;let a=m=>{(m.ctrlKey||m.metaKey)&&m.key==="s"&&(m.preventDefault(),e("keydown-ctrl-s"))},o=()=>{document.visibilityState==="hidden"&&e("visibilitychange-hidden")},l=()=>{e("beforeunload")};return window.addEventListener("keydown",a),document.addEventListener("visibilitychange",o),window.addEventListener("beforeunload",l),()=>{window.removeEventListener("keydown",a),document.removeEventListener("visibilitychange",o),window.removeEventListener("beforeunload",l)}},[e,i])}function Ot(e,i){let a=_();U();let o=y(),l=o.isLoading,m=o.isInitialized,h=o.isReadOnly;return(0,t.useEffect)(()=>{if(!e)return;B({pageKey:e,isReadOnly:!i},{dispatch:a,getState:()=>({doc:y()})});let p=w=>{if(D())return;let S=w?.detail,b=typeof S=="string"?S:S?.dbKey;(!b||b===e)&&B({pageKey:e,isReadOnly:!i},{dispatch:a,getState:()=>({doc:y()})})};return typeof window<"u"&&window.addEventListener("nolo-user-data-updated",p),()=>{typeof window<"u"&&window.removeEventListener("nolo-user-data-updated",p)}},[a,e,i]),(0,t.useEffect)(()=>()=>{gt()},[a]),(0,t.useEffect)(()=>{let p=o?.error;p&&F.error(`\u52A0\u8F7D\u6587\u6863\u5931\u8D25: ${p}`)},[o]),{isLoading:l,isInitialized:m,doc:o,isReadOnly:h}}function zt(e,i){return(0,t.useMemo)(()=>{if(!i)return[M()];if(Array.isArray(e?.slateData)&&e.slateData.length)return P(e.slateData,e?.title).body;if(e?.content)try{let a=ut(e.content);if(a&&a.length)return P(a,e?.title).body}catch{return[{type:"paragraph",children:[{text:"\u539F\u59CB\u5185\u5BB9\u8F6C\u6362\u5931\u8D25\uFF0C\u8BF7\u76F4\u63A5\u7F16\u8F91\u6B64\u9875\u9762\u3002"}]}]}return[M()]},[e,i])}function $t(){U();let e=y(),i=e.isSaving,a=D(),o=e.saveError,l=e.justSaved;return(0,t.useEffect)(()=>{if(!l)return;let h=setTimeout(()=>ft(),Lt);return()=>clearTimeout(h)},[l]),(0,t.useEffect)(()=>{o&&o!=="\u5185\u5BB9\u65E0\u53D8\u5316"&&F.error("\u5185\u5BB9\u4FDD\u5B58\u5931\u8D25",{icon:"\u26A0\uFE0F"})},[o]),(0,n.jsx)(bt,{status:i?"saving":o&&a?"error":l?"saved":null,hasPendingChanges:a})}var Ft=({pageKey:e})=>{let{t:i}=lt(),[a]=nt(),o=_(),[l,m]=(0,t.useState)(!1),[h,p]=(0,t.useState)(!1),w=(0,t.useRef)(null),S=(0,t.useRef)(null),b=yt(e),j=a.get("edit"),Et=j!==null?j==="true":b,Y=R(st),[k,I]=(0,t.useState)(0),{isLoading:T,isInitialized:g,doc:c,isReadOnly:d}=Ot(e,Et),Pt=c.slateData,Dt=c.externalUpdateSeq,J=c.title||"",G=c.icon,x=c.createdAt,L=c.lastSavedAt,K=D(),Q=(0,t.useMemo)(()=>Ct(x)||Ct(L),[x,L]),f=zt(c,g),C=(0,t.useMemo)(()=>P(c?.slateData,c?.title).title,[c?.slateData,c?.title]),X=(0,t.useMemo)(()=>{if(Array.isArray(f)&&f.length>0){let r=ct(f).trim();if(r)return r}return it(c?.content)??null},[c?.content,f]);(0,t.useEffect)(()=>{!g||d||J==null&&C&&V(C)},[C,g,d]);let A=J??C??"",N=!d,u=(0,t.useCallback)((r="manual")=>{l||vt({pageKey:e,triggerSource:r},{dispatch:o,getState:()=>({doc:y()})})},[o,l,e]),Z=(0,t.useRef)(u);(0,t.useEffect)(()=>{Z.current=u},[u]),(0,t.useEffect)(()=>{if(!d)return()=>{Z.current("unmount")}},[d]),Nt(u,d),(0,t.useEffect)(()=>{if(d||l||!K)return;let r=window.setTimeout(()=>{u("autosave-debounced")},At);return()=>{window.clearTimeout(r)}},[d,l,K,u,Pt]);let Rt=(0,t.useCallback)(r=>{mt(r)},[]),kt=(0,t.useCallback)(()=>{d||u("editor-blur")},[d,u]),It=(0,t.useCallback)(r=>{pt(r),p(!1),window.setTimeout(()=>u("icon-select"),0)},[u]),O=(0,t.useCallback)(()=>{let r=w.current?.querySelector('[data-slate-editor="true"]');return r?(r.focus({preventScroll:!0}),!0):!1},[]);return(0,t.useEffect)(()=>{if(!N||T||!g)return;let r=!1,Tt=0,z=0,tt=()=>{r||O()||Tt++<12&&(z=window.requestAnimationFrame(tt))};return z=window.requestAnimationFrame(tt),()=>{r=!0,window.cancelAnimationFrame(z)}},[N,e,T,g,O]),T||!g?(0,n.jsx)(W,{message:"\u6B63\u5728\u6253\u5F00\uFF0C\u4E3A\u4F60\u51C6\u5907\u5185\u5BB9\u2026"}):(0,n.jsx)(t.Suspense,{fallback:(0,n.jsx)(W,{message:"\u6B63\u5728\u4E3A\u4F60\u51C6\u5907\u7F16\u8F91\u4F53\u9A8C\u2026"}),children:(0,n.jsx)("div",{className:"RenderPage-container",children:(0,n.jsxs)("div",{className:"RenderPage-editor-wrapper",ref:w,children:[(0,n.jsxs)("div",{className:"RenderPage-title-shell",children:[(0,n.jsx)("div",{className:"RenderPage-icon-anchor",children:d?(0,n.jsx)(q,{icon:G,fallback:$,size:38}):(0,n.jsxs)(n.Fragment,{children:[(0,n.jsxs)("button",{type:"button",className:"content-icon-button content-icon-button--editable RenderPage-iconButton",onClick:()=>p(r=>!r),title:i("contentIcon.change","\u66F4\u6362\u56FE\u6807"),"aria-label":i("contentIcon.change","\u66F4\u6362\u56FE\u6807"),children:[(0,n.jsx)(q,{icon:G,fallback:$,size:34}),(0,n.jsx)("span",{className:"content-icon-button__badge","aria-hidden":!0,children:(0,n.jsx)(rt,{size:11})})]}),(0,n.jsx)(St,{open:h,onClose:()=>p(!1),onSelect:It})]})}),(0,n.jsxs)("div",{className:"RenderPage-title-stack",children:[d?(0,n.jsx)("h1",{className:`RenderPage-title${A.trim()?"":" is-placeholder"}`,children:A.trim()||"\u672A\u547D\u540D\u9875\u9762"}):(0,n.jsx)("input",{ref:S,className:"RenderPage-titleInput",value:A,placeholder:"\u672A\u547D\u540D\u9875\u9762",onChange:r=>V(r.target.value),onBlur:()=>{u()},onKeyDown:r=>{r.key==="Enter"&&(r.preventDefault(),O())}}),Q||Y&&k>0?(0,n.jsx)("time",{className:"RenderPage-title-meta",dateTime:x||L||void 0,children:[Q,Y&&k>0?`${k} \u5B57`:""].filter(Boolean).join(" \xB7 ")}):null]})]}),d&&X?(0,n.jsx)(ht,{markdown:X,fallback:(0,n.jsx)(H,{initialValue:f,readOnly:!0,onWordCountChange:I})}):d?(0,n.jsx)(H,{initialValue:f,readOnly:!0,onWordCountChange:I}):(0,n.jsx)(H,{initialValue:f,onChange:Rt,onBlur:kt,readOnly:!1,autoFocus:N,onCompositionChange:m,onWordCountChange:I}),!d&&(0,n.jsx)($t,{})]},`${e}:${Dt}`)})})},ue=t.default.memo(Ft);export{ue as default};
