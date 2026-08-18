import{a as WE}from"/public/assets/chunks/chunk-U2QAJT4I.js";import"/public/assets/chunks/chunk-5LTSTRVI.js";import{a as D,b as p}from"/public/assets/chunks/chunk-FBX4YXLH.js";import{a as PE}from"/public/assets/chunks/chunk-DLI6NYSE.js";import{c as oE}from"/public/assets/chunks/chunk-BV33QXUJ.js";import"/public/assets/chunks/chunk-3YN6ZSRO.js";import{b as QE,c as _E}from"/public/assets/chunks/chunk-TWBDD7AR.js";import"/public/assets/chunks/chunk-QOSCV6NU.js";import{Qb as B,Rh as EE}from"/public/assets/chunks/chunk-HKUXCXEJ.js";import"/public/assets/chunks/chunk-SXWL6VTT.js";import"/public/assets/chunks/chunk-E6T75ZBQ.js";import"/public/assets/chunks/chunk-XALR5WJZ.js";import{Ca as Y,Dd as N,Fa as X,Pb as O,ca as A,da as R,pe as q,rc as H,y as J}from"/public/assets/chunks/chunk-YCHPG2J3.js";import"/public/assets/chunks/chunk-JJPKQBGY.js";import"/public/assets/chunks/chunk-SPQDGJEP.js";import"/public/assets/chunks/chunk-4YTIRDRO.js";import"/public/assets/chunks/chunk-FG7XJFJK.js";import"/public/assets/chunks/chunk-PUUF5POR.js";import"/public/assets/chunks/chunk-R4O5ZQKC.js";import"/public/assets/chunks/chunk-U4Y5UIOZ.js";import"/public/assets/chunks/chunk-WXUJXMLM.js";import"/public/assets/chunks/chunk-2A2V6TYA.js";import"/public/assets/chunks/chunk-QEV77ZRC.js";import"/public/assets/chunks/chunk-POLSHW4R.js";import"/public/assets/chunks/chunk-HTZ3TX2K.js";import"/public/assets/chunks/chunk-5JAIXTMH.js";import{a as C}from"/public/assets/chunks/chunk-EFFT3IGY.js";import{a as L}from"/public/assets/chunks/chunk-2SFLHF46.js";import{a as yE}from"/public/assets/chunks/chunk-CLEBNC37.js";import"/public/assets/chunks/chunk-RXYEQGOK.js";import{e as Z}from"/public/assets/chunks/chunk-HA3VNNOB.js";var o=Z(yE());var eE="/public/assets/assets/wechat-VAQPALMF.png";var iE="/public/assets/assets/alipay-UVFX5GSA.jpg";var pE=()=>({open:globalThis.window?.open?.bind(globalThis.window),assignLocation:s=>{globalThis.window.location.href=s}}),tE=(s,k=pE())=>{k.open?.(s,"_blank","noopener,noreferrer")||k.assignLocation?.(s)};var E=Z(C()),wE="s@nolotus.com",a={id:"waffo",name:"\u5168\u7403\u652F\u4ED8",configPath:"/api/payments/waffo/config",createOrderPath:"/api/payments/waffo/create-order",returnParam:"waffo"},w=!1,l=[{id:"crypto-usdt-tron",name:"USDT",color:"#26A17B",configPath:"/api/payments/crypto-usdt-tron/config",createOrderPath:"/api/payments/crypto-usdt-tron/create-order",creditRateKey:"creditsPerUsdt"},{id:"crypto-usdc-base",name:"USDC",color:"#2775CA",configPath:"/api/payments/crypto-usdc-base/config",createOrderPath:"/api/payments/crypto-usdc-base/create-order",creditRateKey:"creditsPerUsdc"}],f={minCredits:1,maxCredits:1e4,integerCreditsOnly:!0},lE=()=>{let s=PE(),k=_E(),i=QE(B),x=oE(),r=WE(768),[W,U]=(0,o.useState)(w?a.id:"wechat"),[h,v]=(0,o.useState)(!1),[rE,aE]=(0,o.useState)(!1),[n,nE]=(0,o.useState)(f),[S,sE]=(0,o.useState)("20"),[b,M]=(0,o.useState)(!1),[$,c]=(0,o.useState)(""),[j,cE]=(0,o.useState)({}),[kE,mE]=(0,o.useState)({}),[V,F]=(0,o.useState)(!1),[I,u]=(0,o.useState)(""),[K,G]=(0,o.useState)("");(0,o.useEffect)(()=>v(!1),[W]),(0,o.useEffect)(()=>{let Q=!1;return(async()=>{if(!(!w||!i))try{let t=await(await fetch(`${i}${a.configPath}`)).json();if(Q)return;let d=!!t?.configured,z=Number(t?.minCredits),y=Number(t?.maxCredits);nE({minCredits:Number.isInteger(z)&&z>0?z:f.minCredits,maxCredits:Number.isInteger(y)&&y>0?y:f.maxCredits,integerCreditsOnly:t?.integerCreditsOnly!==!1}),aE(d),!d&&W===a.id&&U("wechat")}catch{!Q&&W===a.id&&U("wechat")}})(),()=>{Q=!0}},[i,W]),(0,o.useEffect)(()=>{let Q=!1;return(async()=>{if(!i)return;let P={};await Promise.all(l.map(async t=>{try{let d=await fetch(`${i}${t.configPath}`);P[t.id]=await d.json()}catch{P[t.id]=null}})),Q||cE(P)})(),()=>{Q=!0}},[i]),(0,o.useEffect)(()=>{let _=new URLSearchParams(window.location.search).get(a.returnParam);_&&(_==="success"?(G("\u652F\u4ED8\u5DF2\u63D0\u4EA4\uFF0C\u5230\u8D26\u901A\u5E38\u4F1A\u5728\u56DE\u8C03\u786E\u8BA4\u540E\u81EA\u52A8\u5B8C\u6210\u3002"),k(EE())):_==="failed"?G("\u652F\u4ED8\u672A\u5B8C\u6210\uFF0C\u8BF7\u91CD\u65B0\u53D1\u8D77\u652F\u4ED8\u3002"):_==="cancel"&&G("\u5DF2\u53D6\u6D88\u672C\u6B21\u652F\u4ED8\u3002"))},[k]);let gE=l.filter(Q=>!!j[Q.id]?.configured),e=l.find(Q=>Q.id===W),m=e?j[e.id]:null,g=e?kE[e.id]:null,OE=[...gE.map(Q=>({id:Q.id,name:Q.name,icon:q,color:Q.color,disabled:!1})),...w?[{id:a.id,name:a.name,icon:X,color:"#2F80ED",disabled:!rE}]:[],{id:"wechat",name:"\u5FAE\u4FE1",icon:H,color:"#07C160"},{id:"alipay",name:"\u652F\u4ED8\u5B9D",icon:q,color:"#1677FF"}],xE=[{label:"\u5145\u503C\u91D1\u989D",content:"\u4EFB\u610F\u91D1\u989D"},{label:"\u5927\u989D\u5145\u503C",content:(0,E.jsx)(E.Fragment,{children:(0,E.jsxs)("div",{children:["\u5355\u7B14 \u2265 ",p," \u79EF\u5206\uFF1A\u89E3\u9501 GPT Pro \u7CFB\u5217\u4F7F\u7528\u8D44\u683C"]})}),highlight:!0},{label:"\u5230\u8D26\u65F6\u95F4",content:"1-30 \u5206\u949F",note:"\u4EBA\u5DE5\u5145\u503C\uFF0C\u90E8\u5206\u60C5\u51B5\u4F1A\u5EF6\u8FDF"},{label:"\u95EE\u9898\u54A8\u8BE2",content:wE}],uE=W==="wechat"||W==="alipay",dE=W==="wechat"?eE:iE,UE=W==="wechat"?"2/3":"3/4",T=W==="wechat"?"\u5FAE\u4FE1\u652F\u4ED8":"\u652F\u4ED8\u5B9D",hE=async()=>{let Q=Number(S);if(!Number.isFinite(Q)||!Number.isInteger(Q)||Q<n.minCredits||Q>n.maxCredits){c(`\u8BF7\u8F93\u5165 ${n.minCredits}-${n.maxCredits} \u4E4B\u95F4\u7684\u6574\u6570\u79EF\u5206`);return}if(!x){c("\u8BF7\u5148\u767B\u5F55\u540E\u518D\u5145\u503C");return}if(!i){c("\u5F53\u524D\u670D\u52A1\u5668\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");return}c(""),M(!0);try{let _=await fetch(`${i}${a.createOrderPath}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${x}`},body:JSON.stringify({credits:Q})}),P=await _.json(),t=P?.checkoutUrl||P?.redirectUrl;if(!_.ok||!t)throw new Error(P?.error?.message||P?.error||"\u521B\u5EFA\u652F\u4ED8\u8BA2\u5355\u5931\u8D25");tE(t)}catch(_){c(L(_))}finally{M(!1)}},GE=async()=>{if(e){if(!x){u("\u8BF7\u5148\u767B\u5F55\u540E\u518D\u5145\u503C");return}if(!i){u("\u5F53\u524D\u670D\u52A1\u5668\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");return}u(""),F(!0);try{let Q=await fetch(`${i}${e.createOrderPath}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${x}`}}),_=await Q.json();if(!Q.ok||!_?.depositAddress)throw new Error(_?.error?.message||_?.error||`\u521B\u5EFA ${e.name} \u5730\u5740\u5931\u8D25`);mE(P=>({...P,[e.id]:_}))}catch(Q){u(Q instanceof Error?Q.message:`\u521B\u5EFA ${e.name} \u5730\u5740\u5931\u8D25`)}finally{F(!1)}}},zE=async()=>{let Q=g?.depositAddress;Q&&await navigator.clipboard?.writeText(Q)};return(0,E.jsxs)(E.Fragment,{children:[(0,E.jsx)("style",{children:`
        .recharge-container {
          max-width: ${r?"100%":"1000px"};
          margin: 0 auto;
          padding: ${r?"var(--space-6)":"var(--space-12) var(--space-8)"};
          color: var(--text);
          animation: rechargeFadeIn 0.25s ease-out both;
        }

        @keyframes rechargeFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .page-title {
          font-size: ${r?"1.5rem":"2rem"};
          font-weight: 700;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: var(--space-3);
          margin: 0 0 var(--space-10);
          letter-spacing: -0.03em;
        }

        .content-grid {
          display: grid;
          grid-template-columns: ${r?"1fr":"1.1fr 0.9fr"};
          gap: var(--space-8);
          align-items: start;
        }

        .card {
          background: var(--backgroundSecondary);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: ${r?"var(--space-6)":"var(--space-10)"};
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02);
          position: relative;
          overflow: hidden;
        }

        /* \u652F\u4ED8\u65B9\u5F0F\u9009\u62E9\u5668 - \u62DF\u7269\u5316\u5206\u6BB5\u63A7\u4EF6 */
        .payment-tabs {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
          gap: 6px;
          margin-bottom: var(--space-8);
          background: var(--backgroundTertiary);
          border-radius: var(--radius-xl);
          padding: 6px;
          border: 1px solid var(--border);
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .payment-tab {
          padding: ${r?"var(--space-3)":"var(--space-4)"};
          background: transparent;
          border: none;
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition:
            color 0.18s ease,
            background-color 0.18s ease,
            box-shadow 0.18s ease,
            transform 0.18s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          position: relative;
          color: var(--textSecondary);
          min-height: 80px;
        }

        .payment-tab:hover:not(:disabled):not(.active) {
          color: var(--text);
          background: rgba(255, 255, 255, 0.05);
        }

        .payment-tab.active {
          background: var(--backgroundSecondary);
          color: var(--text);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.05);
          transform: scale(1.02);
        }

        .payment-tab:disabled {
          opacity: 0.3;
          cursor: not-allowed;
          filter: grayscale(1);
        }

        .tab-icon {
          font-size: ${r?"1.4rem":"1.6rem"};
          transition: transform 0.18s ease;
        }
        .payment-tab.active .tab-icon { transform: translateY(-2px); }

        .tab-name {
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .active-indicator {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 16px;
          height: 16px;
          background: var(--primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          animation: rechargeScaleIn 0.18s ease-out both;
        }

        @keyframes rechargeScaleIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }

        .coming-badge {
          position: absolute;
          bottom: 6px;
          background: var(--backgroundTertiary);
          color: var(--textTertiary);
          font-size: var(--fontSize-sm);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          font-weight: 500;
          border: 1px solid var(--border);
        }

        .amount-box {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: var(--space-3);
          align-items: end;
          margin-bottom: var(--space-6);
        }
        .amount-label {
          display: block;
          color: var(--textTertiary);
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: var(--space-2);
        }
        .amount-input {
          width: 100%;
          border: 1px solid var(--border);
          background: var(--background);
          color: var(--text);
          border-radius: var(--radius-lg);
          padding: 12px 14px;
          font-size: 1rem;
          outline: none;
        }
        .amount-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(var(--primary-rgb, 47, 128, 237), 0.12);
        }
        .amount-hint {
          color: var(--textTertiary);
          font-size: 0.8rem;
          font-weight: 600;
          margin: calc(var(--space-3) * -1) 0 var(--space-5);
        }
        .crypto-panel {
          display: grid;
          gap: var(--space-5);
        }
        .crypto-address-box {
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          background: var(--background);
          padding: var(--space-4);
        }
        .crypto-address-label {
          color: var(--textTertiary);
          font-size: 0.8rem;
          font-weight: 700;
          margin-bottom: var(--space-2);
        }
        .crypto-address-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: var(--space-3);
          align-items: center;
        }
        .crypto-address {
          color: var(--text);
          font-family: monospace;
          font-size: 0.86rem;
          overflow-wrap: anywhere;
        }
        .copy-button {
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--backgroundSecondary);
          color: var(--text);
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .checkout-button {
          border: none;
          border-radius: var(--radius-lg);
          padding: 12px 18px;
          background: var(--primary);
          color: white;
          font-weight: 700;
          cursor: pointer;
          min-width: 112px;
        }
        .checkout-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .checkout-error {
          color: #FF5252;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: var(--space-5);
        }
        .return-message {
          border: 1px solid var(--border);
          background: var(--backgroundTertiary);
          color: var(--textSecondary);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          margin-bottom: var(--space-5);
          font-size: 0.9rem;
          font-weight: 600;
        }

        /* \u63D0\u9192\u533A\u57DF - \u4F18\u96C5\u7684\u9AD8\u4EAE */
        .notice {
          background: linear-gradient(135deg, rgba(255, 107, 107, 0.05), rgba(255, 107, 107, 0.02));
          border-left: 4px solid #FF5252;
          border-radius: var(--radius-lg);
          padding: var(--space-5);
          margin-bottom: var(--space-8);
          display: flex;
          gap: var(--space-4);
        }

        .notice-icon {
          color: #FF5252;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .notice-content { flex: 1; }
        .notice-text { 
          display: block; 
          margin-bottom: var(--space-3); 
          font-weight: 500; 
          font-size: 0.95rem;
          color: var(--textSecondary);
        }
        
        .username-container {
          display: inline-flex;
          align-items: center;
          background: var(--background);
          padding: 4px 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          margin-left: 4px;
        }

        .notice-highlight {
          color: var(--primary);
          font-weight: 700;
          font-family: monospace;
          font-size: 1.1rem;
        }
        
        .notice-warning { 
          display: flex;
          align-items: center;
          gap: 6px;
          color: #FF5252; 
          font-size: 0.875rem; 
          font-weight: 600; 
          opacity: 0.9;
        }

        /* QR \u533A\u57DF - \u7CBE\u81F4\u5BB9\u5668\uFF1B\u5207\u6362\u65F6 skeleton \u5360\u4F4D + \u77ED opacity \u6DE1\u5165 */
        .qr-wrapper { 
          text-align: center;
          padding: var(--space-4) 0;
        }
        .qr-container {
          width: 100%;
          max-width: ${r?"240px":"280px"};
          aspect-ratio: ${UE};
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0,0,0,0.05);
          overflow: hidden;
          position: relative;
          margin: 0 auto;
          border: 8px solid white;
        }
        .qr-image { 
          width: 100%; 
          height: 100%; 
          object-fit: contain; 
          opacity: ${h?"1":"0"}; 
          transition: opacity 0.2s ease;
          filter: contrast(1.05);
        }
        .qr-loading { 
          position: absolute; 
          top: 0; left: 0; right: 0; bottom: 0;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #adb5bd;
          font-size: 0.85rem;
        }
        .qr-tip { 
          margin-top: var(--space-6); 
          display: inline-flex; 
          align-items: center; 
          gap: 10px; 
          padding: 8px 16px;
          background: var(--backgroundTertiary);
          border-radius: 100px;
          color: var(--textSecondary); 
          font-size: 0.85rem; 
          font-weight: 500;
        }

        /* \u5145\u503C\u8BF4\u660E - \u7ED3\u6784\u5316\u5217\u8868 */
        .info-title {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin: 0 0 var(--space-8);
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text);
        }

        .info-list { display: flex; flex-direction: column; gap: var(--space-6); }
        .info-item {
          display: grid;
          grid-template-columns: 90px 1fr;
          gap: var(--space-4);
          align-items: start;
        }
        .info-label { 
          color: var(--textTertiary); 
          font-weight: 600; 
          font-size: 0.875rem; 
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding-top: 2px;
        }
        .info-content { 
          color: var(--text); 
          font-size: 0.95rem; 
          line-height: var(--leading-normal);
          font-weight: 500;
        }
        .info-note { 
          display: block; 
          color: var(--textTertiary); 
          font-size: var(--fontSize-base); 
          margin-top: 6px;
          font-weight: 400;
        }

        .info-item-highlight {
          padding: var(--space-5);
          border-radius: var(--radius-xl);
          background: linear-gradient(to bottom right, var(--backgroundTertiary), var(--backgroundSecondary));
          border: 1px solid var(--border);
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .info-item-highlight .info-label { color: var(--primary); }
        .info-item-highlight .info-content { color: var(--text); font-weight: 600; }

        /* \u5E95\u90E8\u89C4\u5219\u63D0\u793A */
        .rule-mini {
          margin-top: var(--space-10);
          display: flex;
          gap: var(--space-3);
          align-items: flex-start;
          padding: var(--space-5);
          border-radius: var(--radius-xl);
          background: rgba(var(--primary-rgb, 100, 100, 100), 0.03);
          color: var(--textSecondary);
          font-size: var(--fontSize-base);
          line-height: var(--leading-relaxed);
          border: 1px dashed var(--border);
        }
        .rule-mini .icon { color: var(--primary); opacity: 0.8; }

        @media (max-width: 768px) {
          .info-item {
            grid-template-columns: 1fr;
            gap: 4px;
          }
          .info-label { font-size: 0.875rem; }
          .amount-box { grid-template-columns: 1fr; }
        }

        @media (prefers-reduced-motion: reduce) {
          .recharge-container,
          .active-indicator {
            animation: none;
          }

          .payment-tab,
          .tab-icon,
          .qr-image {
            transition: none;
          }

          .payment-tab.active {
            transform: none;
          }

          .payment-tab.active .tab-icon {
            transform: none;
          }

          .qr-image {
            opacity: ${h?"1":"0"};
          }
        }
      `}),(0,E.jsxs)("div",{className:"recharge-container",children:[(0,E.jsxs)("h1",{className:"page-title",children:[(0,E.jsx)(J,{size:r?24:32,"aria-hidden":"true"}),"\u8D26\u6237\u5145\u503C"]}),(0,E.jsxs)("div",{className:"content-grid",children:[(0,E.jsxs)("div",{className:"card",children:[(0,E.jsx)("div",{className:"payment-tabs",children:OE.map(Q=>{let _=Q.icon,P=W===Q.id;return(0,E.jsxs)("button",{type:"button",className:`payment-tab ${P?"active":""}`,onClick:()=>!Q.disabled&&U(Q.id),disabled:Q.disabled,children:[(0,E.jsx)(_,{className:"tab-icon",style:{color:P?Q.color:void 0},"aria-hidden":"true"}),(0,E.jsx)("span",{className:"tab-name",children:Q.name}),P&&!Q.disabled&&(0,E.jsx)("div",{className:"active-indicator",children:(0,E.jsx)(R,{size:10,"aria-hidden":"true"})}),Q.disabled&&(0,E.jsx)("span",{className:"coming-badge",children:"\u656C\u8BF7\u671F\u5F85"})]},Q.id)})}),K&&(0,E.jsx)("div",{className:"return-message",children:K}),e?(0,E.jsxs)("div",{className:"crypto-panel",children:[g?(0,E.jsxs)("div",{className:"crypto-address-box",children:[(0,E.jsxs)("div",{className:"crypto-address-label",children:[g.network," ",g.token,"\u6536\u6B3E\u5730\u5740"]}),(0,E.jsxs)("div",{className:"crypto-address-row",children:[(0,E.jsx)("div",{className:"crypto-address",children:g.depositAddress}),(0,E.jsx)("button",{type:"button",className:"copy-button",onClick:zE,title:"\u590D\u5236\u5730\u5740","aria-label":"\u590D\u5236\u5730\u5740",children:(0,E.jsx)(Y,{size:18,"aria-hidden":"true"})})]})]}):(0,E.jsx)("button",{type:"button",className:"checkout-button",onClick:GE,disabled:V,children:V?"\u521B\u5EFA\u4E2D...":`\u751F\u6210 ${e.name} \u5145\u503C\u5730\u5740`}),I&&(0,E.jsx)("div",{className:"checkout-error",children:I}),(0,E.jsxs)("div",{className:"rule-mini",style:{marginTop:0},children:[(0,E.jsx)(O,{className:"icon",size:20,"aria-hidden":"true"}),(0,E.jsxs)("div",{children:["\u53EA\u652F\u6301 ",m?.network," \u7F51\u7EDC\u5B98\u65B9",m?.token,"\u30021 ",m?.token," =",Number(m?.[e.creditRateKey]||1)," \u79EF\u5206\uFF0C\u6700\u4F4E\u81EA\u52A8\u5165\u8D26",Number(m?.minCredits||1)," \u79EF\u5206\u3002"]})]})]}):W===a.id?(0,E.jsxs)("div",{children:[(0,E.jsxs)("div",{className:"amount-box",children:[(0,E.jsxs)("label",{children:[(0,E.jsx)("span",{className:"amount-label",children:"\u5145\u503C\u91D1\u989D\uFF08\u79EF\u5206\uFF09"}),(0,E.jsx)("input",{className:"amount-input",type:"number",min:n.minCredits,max:n.maxCredits,step:"1",value:S,onChange:Q=>{sE(Q.target.value),c("")}})]}),(0,E.jsx)("button",{type:"button",className:"checkout-button",onClick:hE,disabled:b,children:b?"\u521B\u5EFA\u4E2D...":"\u53BB\u652F\u4ED8"})]}),(0,E.jsxs)("div",{className:"amount-hint",children:["\u5355\u7B14\u652F\u6301 ",n.minCredits,"-",n.maxCredits," \u4E2A\u6574\u6570\u79EF\u5206"]}),$&&(0,E.jsx)("div",{className:"checkout-error",children:$}),(0,E.jsxs)("div",{className:"rule-mini",style:{marginTop:0},children:[(0,E.jsx)(O,{className:"icon",size:20,"aria-hidden":"true"}),(0,E.jsx)("div",{children:"\u5C06\u6253\u5F00 Waffo \u5B89\u5168\u6536\u94F6\u53F0\uFF0C\u53EF\u4F7F\u7528\u94F6\u884C\u5361\u3001\u94B1\u5305\u7B49\u5DF2\u5F00\u901A\u7684\u672C\u5730\u652F\u4ED8\u65B9\u5F0F\u3002\u652F\u4ED8\u6210\u529F\u540E\u81EA\u52A8\u5165\u8D26\u3002"})]})]}):(0,E.jsxs)(E.Fragment,{children:[(0,E.jsxs)("div",{className:"notice",children:[(0,E.jsx)(A,{size:24,className:"notice-icon","aria-hidden":"true"}),(0,E.jsxs)("div",{className:"notice-content",children:[(0,E.jsxs)("span",{className:"notice-text",children:["\u8F6C\u8D26\u5907\u6CE8\u8BF7\u52A1\u5FC5\u586B\u5199\u7528\u6237\u540D\uFF1A",(0,E.jsx)("span",{className:"username-container",children:(0,E.jsx)("span",{className:"notice-highlight",children:s.user?.username||"username"})})]}),(0,E.jsx)("span",{className:"notice-warning",children:"\u672A\u586B\u5199\u5907\u6CE8\u5C06\u5BFC\u81F4\u5145\u503C\u65E0\u6CD5\u81EA\u52A8\u5230\u8D26\uFF0C\u9700\u4EBA\u5DE5\u5904\u7406"})]})]}),uE&&(0,E.jsxs)("div",{className:"qr-wrapper",children:[(0,E.jsxs)("div",{className:"qr-container",children:[!h&&(0,E.jsx)("div",{className:"qr-loading",children:"\u5B89\u5168\u52A0\u8F7D\u4E2D..."}),(0,E.jsx)("img",{src:dE,alt:`${T}\u5145\u503C\u4E8C\u7EF4\u7801`,className:"qr-image",onLoad:()=>v(!0)})]}),(0,E.jsxs)("div",{className:"qr-tip",children:[(0,E.jsx)(N,{size:18,"aria-hidden":"true"}),"\u6253\u5F00",T,"\u300C\u626B\u4E00\u626B\u300D\u5B8C\u6210\u652F\u4ED8"]})]})]})]}),(0,E.jsxs)("div",{className:"card",children:[(0,E.jsxs)("h3",{className:"info-title",children:[(0,E.jsx)(O,{size:22,"aria-hidden":"true"}),"\u5145\u503C\u987B\u77E5"]}),(0,E.jsx)("div",{className:"info-list",children:xE.map(Q=>(0,E.jsxs)("div",{className:`info-item ${Q.highlight?"info-item-highlight":""}`,children:[(0,E.jsx)("div",{className:"info-label",children:Q.label}),(0,E.jsxs)("div",{className:"info-content",children:[Q.content,Q.note&&(0,E.jsx)("span",{className:"info-note",children:Q.note})]})]},Q.label))}),(0,E.jsxs)("div",{className:"rule-mini",children:[(0,E.jsx)(O,{className:"icon",size:20,"aria-hidden":"true"}),(0,E.jsxs)("div",{children:["\u5145\u503C\u91D1\u989D\u65E0\u9650\u5236\u3002\u5982\u9700\u5F00\u542F\u8054\u7F51\u641C\u7D22\u3001\u6587\u6863\u5206\u6790\u7B49\u9AD8\u7EA7\u529F\u80FD\uFF0C\u8BF7\u786E\u4FDD\u4F59\u989D\u8FBE\u5230 ",D," \u79EF\u5206\uFF1BGPT Pro \u7CFB\u5217\u9700\u8981\u5355\u7B14 ",p," \u79EF\u5206\u3002"]})]})]})]})]})]})},YE=lE;export{YE as default};
