import{a as S}from"/public/assets/chunks/chunk-TABZZ7CG.js";import{f as z}from"/public/assets/chunks/chunk-S4SPCA2A.js";import{a as w}from"/public/assets/chunks/chunk-P6I6EUS4.js";import{a as v}from"/public/assets/chunks/chunk-PF7MTCHE.js";import{a as N}from"/public/assets/chunks/chunk-QPNHSGT6.js";import"/public/assets/chunks/chunk-IOQKDOEC.js";import{a as y}from"/public/assets/chunks/chunk-2BJQMS5L.js";import"/public/assets/chunks/chunk-BHUMEZ7R.js";import"/public/assets/chunks/chunk-5HKEMIZS.js";import"/public/assets/chunks/chunk-7KOH4NGE.js";import"/public/assets/chunks/chunk-3C4Z6MLW.js";import"/public/assets/chunks/chunk-B4ZQOXFP.js";import{p as g}from"/public/assets/chunks/chunk-WA4OTMP3.js";import{b as h,c as b}from"/public/assets/chunks/chunk-TWBDD7AR.js";import"/public/assets/chunks/chunk-QOSCV6NU.js";import{Mh as x}from"/public/assets/chunks/chunk-HKUXCXEJ.js";import"/public/assets/chunks/chunk-SXWL6VTT.js";import"/public/assets/chunks/chunk-E6T75ZBQ.js";import"/public/assets/chunks/chunk-XALR5WJZ.js";import{lc as f}from"/public/assets/chunks/chunk-YCHPG2J3.js";import{b as u}from"/public/assets/chunks/chunk-JJPKQBGY.js";import"/public/assets/chunks/chunk-SPQDGJEP.js";import"/public/assets/chunks/chunk-4YTIRDRO.js";import"/public/assets/chunks/chunk-FG7XJFJK.js";import"/public/assets/chunks/chunk-PUUF5POR.js";import"/public/assets/chunks/chunk-R4O5ZQKC.js";import{d as r}from"/public/assets/chunks/chunk-U4Y5UIOZ.js";import"/public/assets/chunks/chunk-WXUJXMLM.js";import"/public/assets/chunks/chunk-2A2V6TYA.js";import"/public/assets/chunks/chunk-QEV77ZRC.js";import"/public/assets/chunks/chunk-POLSHW4R.js";import"/public/assets/chunks/chunk-HTZ3TX2K.js";import"/public/assets/chunks/chunk-5JAIXTMH.js";import{a as d}from"/public/assets/chunks/chunk-EFFT3IGY.js";import"/public/assets/chunks/chunk-2SFLHF46.js";import{a as L}from"/public/assets/chunks/chunk-CLEBNC37.js";import"/public/assets/chunks/chunk-RXYEQGOK.js";import{e as p}from"/public/assets/chunks/chunk-HA3VNNOB.js";var k=p(L(),1);var e=p(d(),1),R=()=>{let o=w(),{isLoading:s}=h(n=>n.auth),A=b(),{t}=u(),[c,i]=(0,k.useState)(null),F=r.object({email:r.string().nonempty({message:t("emailRequired")||""}).email({message:t("invalidEmail")||""}),purpose:r.string().nonempty({message:t("purposeRequired")||""}).min(10,{message:t("purposeTooShort")||""})}),{register:l,handleSubmit:$,formState:{errors:a}}=z({resolver:S(F)}),E=async n=>{try{let m=await A(x(n));if(m.payload.success)return;switch(m.payload.status){case 422:i(t("invalidEmail"));break;case 409:i(t("emailExists"));break;default:i(t("operationFailed"))}}catch{i(t("networkError"))}};return(0,e.jsxs)("div",{className:"beta-access-container",children:[(0,e.jsx)("style",{children:`
        .beta-access-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: calc(100dvh - 60px);
          padding: 24px;
        }

        .beta-access-form {
          width: 100%;
          max-width: 380px;
        }

        .beta-access-title {
          font-size: 32px;
          font-weight: 600;
          color: ${o.text};
          margin-bottom: 24px;
          text-align: center;
          letter-spacing: -0.5px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .beta-tag {
          display: inline-block;
          background-color: ${o.primary};
          color: white;
          font-size: 14px;
          padding: 2px 10px;
          border-radius: var(--radius-xs);
          font-weight: 500;
        }

        .description {
          text-align: center;
          color: ${o.textSecondary};
          font-size: 15px;
          margin-bottom: 40px;
          line-height: 1.6;
        }

        .field-group {
          margin-bottom: 28px;
        }

        .error-message {
          font-size: 14px;
          color: ${o.error};
          margin-top: 8px;
        }

        .beta-access-footer {
          display: flex;
          flex-direction: column;
          gap: 32px;
          align-items: center;
        }

        .login-section {
          text-align: center;
        }

        .link-text {
          color: ${o.textSecondary};
          font-size: 15px;
        }

        .login-link {
          color: ${o.primary};
          text-decoration: none;
          font-size: 15px;
          margin-left: 6px;
          font-weight: 500;
          transition: color 0.2s;
        }

        .login-link:hover {
          color: ${o.primaryLight};
        }

        @media (min-width: 768px) {
          .beta-access-form {
            max-width: 420px;
          }

          .beta-access-title {
            font-size: 36px;
          }

          .description {
            font-size: 16px;
            margin-bottom: 48px;
          }
        }

        @media (min-width: 1200px) {
          .beta-access-form {
            max-width: 460px;
          }

          .beta-access-title {
            font-size: 40px;
          }

          .description {
            margin-bottom: 56px;
          }
        }
      `}),(0,e.jsxs)("form",{onSubmit:$(E),className:"beta-access-form",children:[(0,e.jsxs)("h1",{className:"beta-access-title",children:[t("betaAccess"),(0,e.jsx)("span",{className:"beta-tag",children:"Beta"})]}),(0,e.jsx)("p",{className:"description",children:t("betaDescription")}),(0,e.jsxs)("div",{className:"field-group",children:[(0,e.jsx)(v,{placeholder:t("enterEmail"),...l("email"),error:!!a.email,icon:(0,e.jsx)(f,{size:20,"aria-hidden":"true"}),type:"email",autoComplete:"email"}),a.email&&(0,e.jsx)("p",{className:"error-message",children:a.email.message})]}),(0,e.jsxs)("div",{className:"field-group",children:[(0,e.jsx)(N,{placeholder:t("purposeHolder"),...l("purpose"),error:!!a.purpose,rows:3}),a.purpose&&(0,e.jsx)("p",{className:"error-message",children:a.purpose.message})]}),c&&(0,e.jsx)("p",{className:"error-message",children:c}),(0,e.jsxs)("div",{className:"beta-access-footer",children:[(0,e.jsx)(y,{variant:"primary",size:"large",loading:s,disabled:s,style:{width:"100%"},type:"submit",children:t(s?"loading":"applyForAccess")}),(0,e.jsxs)("div",{className:"login-section",children:[(0,e.jsx)("span",{className:"link-text",children:t("haveAccount")}),(0,e.jsx)(g,{to:"/login",className:"login-link",children:t("loginNow")})]})]})]})]})},O=R;export{O as default};
