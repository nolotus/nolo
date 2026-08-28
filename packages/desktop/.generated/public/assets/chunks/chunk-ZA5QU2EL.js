import{a as P}from"/public/assets/chunks/chunk-HITTDVUX.js";import{a as I}from"/public/assets/chunks/chunk-KQ7NZJZD.js";import{a as k}from"/public/assets/chunks/chunk-EEV5JOAS.js";import{a as y}from"/public/assets/chunks/chunk-J4D6WQNO.js";import{pi as f}from"/public/assets/chunks/chunk-K6SBFEEZ.js";import{b as v,y as b}from"/public/assets/chunks/chunk-I4KLHIYO.js";import{h as w}from"/public/assets/chunks/chunk-MVW2HXM5.js";import{a as x}from"/public/assets/chunks/chunk-U3FV4FR4.js";import{a as T}from"/public/assets/chunks/chunk-DYHF2IZM.js";import{d as h}from"/public/assets/chunks/chunk-WEOWWZTJ.js";var o=h(T());var t=h(x()),A=`
  .attachments-preview {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
    align-items: flex-start;
    width: 100%;
    box-sizing: border-box;
  }

  .attachment-item {
    position: relative;
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    flex-shrink: 0;
    max-width: 120px;
  }

  .attachment-item:hover:not(.processing):not(.error) {
    transform: translateY(-1px);
  }

  .attachment-item.mobile {
    max-width: 110px;
  }

  .image-content {
    width: 44px;
    height: var(--control-lg);
    object-fit: cover;
    border-radius: var(--radius-xs);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    display: block;
  }

  .image-content:hover {
    border-color: var(--primary);
    transform: scale(1.05);
    box-shadow: 0 4px 12px var(--shadowMedium);
  }

  .image-content:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
    border-color: var(--primary);
  }

  .remove-button {
    position: absolute;
    border-radius: 50%;
    background: var(--error);
    color: white;
    border: 1px solid var(--background);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 2;
    box-shadow: 0 2px 4px var(--shadowMedium);
  }

  .remove-button:not(.mobile) {
    top: -6px;
    right: -6px;
    width: 22px;
    height: 22px;
    opacity: 0.85;
  }

  .remove-button.mobile {
    top: -8px;
    right: -8px;
    width: 30px;
    height: 30px;
    opacity: 1;
    box-shadow: 0 2px 8px var(--shadowHeavy);
    border-width: 1.5px;
  }

  .attachment-item:hover .remove-button:not(.mobile):not(:disabled) {
    opacity: 1;
  }

  .remove-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    pointer-events: none;
  }

  .remove-button:hover:not(:disabled) {
    transform: scale(1.1);
    background: #dc2626;
    box-shadow: 0 4px 12px var(--shadowHeavy);
  }

  .remove-button:focus-visible {
    opacity: 1;
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .remove-button:active:not(:disabled) {
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    .attachments-preview {
      gap: var(--space-1);
      justify-content: flex-start;
      align-items: flex-start;
      overflow-x: visible;
    }

    .attachment-item {
      min-width: 44px;
    }

    .attachment-item.mobile {
      max-width: 100px;
    }

    .remove-button.mobile {
      width: 28px;
      height: var(--control-sm);
    }
  }

  @media (hover: none) and (pointer: coarse) {
    .remove-button:not(.mobile) {
      opacity: 1;
      top: -8px;
      right: -8px;
      width: 26px;
      height: 26px;
    }

    .attachment-item:hover,
    .image-content:hover {
      transform: none;
    }
  }

  @media (prefers-contrast: high) {
    .image-content {
      border-width: 2px;
    }

    .remove-button {
      border-width: 2px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .attachment-item,
    .image-content,
    .remove-button {
      transition: none;
    }

    .attachment-item:hover,
    .image-content:hover,
    .remove-button:hover {
      transform: none;
    }
  }

  .attachment-item.error {
    opacity: 0.7;
  }

  .attachment-item.error .image-content {
    border-color: var(--error);
  }

  .attachment-item.processing {
    opacity: 0.6;
    pointer-events: none;
  }
`,C=(0,o.memo)(({image:r,index:a,isMobile:l,onPreview:d,onRemove:n})=>{let c=(0,o.useCallback)(()=>{d(r.url)},[r.url,d]),p=(0,o.useCallback)(s=>{s.stopPropagation(),n(r.id)},[r.id,n]);return(0,t.jsxs)("div",{className:`attachment-item image-item ${l?"mobile":""}`,role:"group","aria-label":`\u56FE\u7247\u9644\u4EF6 ${a+1}`,children:[(0,t.jsx)("img",{src:r.url,alt:`\u9884\u89C8\u56FE\u7247 ${a+1}`,className:"image-content",onClick:c,onKeyDown:s=>{(s.key==="Enter"||s.key===" ")&&(s.preventDefault(),c())},tabIndex:0,role:"button","aria-label":`\u70B9\u51FB\u67E5\u770B\u5927\u56FE ${a+1}`}),(0,t.jsx)("button",{type:"button",onClick:p,className:`remove-button ${l?"mobile":""}`,"aria-label":`\u5220\u9664\u56FE\u7247 ${a+1}`,title:`\u5220\u9664\u56FE\u7247 ${a+1}`,children:l?(0,t.jsx)(b,{size:16,"aria-hidden":"true"}):(0,t.jsx)(v,{size:14,"aria-hidden":"true"})})]})});C.displayName="ImageItem";var D=({imagePreviews:r,pendingFiles:a,onRemoveImage:l,processingFiles:d=new Set,isMobile:n=!1})=>{let c=f(),[p,s]=(0,o.useState)(null),[i,u]=(0,o.useState)(null),F=(0,o.useMemo)(()=>r.length>0||a.length>0,[r.length,a.length]),N=(0,o.useCallback)(e=>{c(w(e))},[c]),$=(0,o.useCallback)(e=>{s(e)},[]),E=(0,o.useCallback)(()=>{s(null)},[]),R=(0,o.useCallback)(e=>{u(e)},[]),g=(0,o.useCallback)(()=>{u(null)},[]);return F?(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("style",{"data-name":"attachments-preview-fixed",precedence:"high",children:A}),(0,t.jsxs)("div",{className:"attachments-preview",role:"group","aria-label":"\u9644\u4EF6\u9884\u89C8","aria-live":"polite",children:[r.map((e,m)=>(0,t.jsx)(C,{image:e,index:m,isMobile:n,onPreview:$,onRemove:l},e.id)),a.map(e=>{let m=d.has(e.trackingId??e.id),z=S=>{S.stopPropagation(),N(e.id)},M=["attachment-item","file-item",n?"mobile":"",m?"processing":"",e.error?"error":""].filter(Boolean).join(" ");return(0,t.jsxs)("div",{className:M,role:"group","aria-label":`\u6587\u4EF6\u9644\u4EF6 ${e.name}`,children:[(0,t.jsx)(P,{file:e,variant:"attachment",isMobile:n,isProcessing:m,error:e.error,onPreview:e.type==="dialog"?void 0:()=>!m&&!e.error&&R(e)}),(0,t.jsx)("button",{type:"button",onClick:z,className:`remove-button ${n?"mobile":""}`,disabled:m,"aria-label":`\u5220\u9664\u6587\u4EF6 ${e.name}`,title:`\u5220\u9664\u6587\u4EF6 ${e.name}`,children:n?(0,t.jsx)(b,{size:16,"aria-hidden":"true"}):(0,t.jsx)(v,{size:14,"aria-hidden":"true"})})]},e.id)})]}),(0,t.jsx)(y,{imageUrl:p,onClose:E,alt:"\u653E\u5927\u9884\u89C8\u56FE\u7247"}),i&&i.type==="table"?(0,t.jsx)(k,{isOpen:!!i,onClose:g,tableKey:i.pageKey||"",tableName:i.name||""}):i&&(0,t.jsx)(I,{isOpen:!!i,onClose:g,pageKey:i.pageKey||"",fileName:i.name||""})]}):null},V=(0,o.memo)(D);export{V as a};
