import{a as f}from"/public/assets/chunks/chunk-P6I6EUS4.js";import{a as k}from"/public/assets/chunks/chunk-VYH5EHGA.js";import{a as o}from"/public/assets/chunks/chunk-2BJQMS5L.js";import{a as g}from"/public/assets/chunks/chunk-EFFT3IGY.js";import{e as c}from"/public/assets/chunks/chunk-HA3VNNOB.js";var u=c(k(),1),a=c(g(),1),C=(0,u.default)({name:"Pagination"});function z({currentPage:i,totalItems:r,pageSize:m,onPageChange:h,className:x=""}){let b=f(),e=Math.ceil(r/m),y=(i-1)*m+1,v=Math.min(i*m,r),w=()=>{let s=[];if(e<=5)for(let t=1;t<=e;t++)s.push(t);else{let t=Math.max(1,i-2),p=Math.min(e,t+5-1);p-t+1<5&&(t=Math.max(1,p-5+1)),t>1&&(s.push(1),t>2&&s.push("..."));for(let d=t;d<=p;d++)s.push(d);p<e&&(p<e-1&&s.push("..."),s.push(e))}return s},l=n=>{n!==i&&(C.debug({from:i,to:n},"Page change requested"),h(n))};return r===0?null:(0,a.jsxs)(a.Fragment,{children:[(0,a.jsxs)("div",{className:`pagination ${x}`,children:[(0,a.jsxs)("div",{className:"pagination-info",children:["\u663E\u793A ",y,"-",v," \u6761\uFF0C\u5171 ",r," \u6761"]}),(0,a.jsxs)("div",{className:"pagination-buttons",children:[(0,a.jsx)(o,{variant:"secondary",size:"small",disabled:i===1,onClick:()=>l(1),className:"page-button",children:"\u9996\u9875"}),(0,a.jsx)(o,{variant:"secondary",size:"small",disabled:i===1,onClick:()=>l(i-1),className:"page-button",children:"\u4E0A\u4E00\u9875"}),w().map((n,s)=>n==="..."?(0,a.jsx)("span",{className:"ellipsis",children:"..."},`ellipsis-${s}`):(0,a.jsx)(o,{variant:n===i?"primary":"secondary",size:"small",className:"page-button",onClick:()=>l(n),disabled:n===i,children:n},n)),(0,a.jsx)(o,{variant:"secondary",size:"small",disabled:i===e,onClick:()=>l(i+1),className:"page-button",children:"\u4E0B\u4E00\u9875"}),(0,a.jsx)(o,{variant:"secondary",size:"small",disabled:i===e,onClick:()=>l(e),className:"page-button",children:"\u672B\u9875"})]})]}),(0,a.jsx)("style",{jsx:!0,children:`
        .pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 0;
          gap: 16px;
          flex-wrap: wrap;
        }

        .pagination-info {
          font-size: var(--fontSize-base);
          color: ${b.textSecondary};
          white-space: nowrap;
        }

        .pagination-buttons {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .ellipsis {
          color: ${b.textSecondary};
          padding: 0 4px;
          user-select: none;
        }

        :global(.page-button) {
          min-width: var(--control-sm);
          height: var(--control-sm);
          padding: 0 8px;
        }

        @media (max-width: 640px) {
          .pagination {
            justify-content: center;
          }

          .pagination-info {
            width: 100%;
            text-align: center;
            order: 2;
          }

          .pagination-buttons {
            width: 100%;
            justify-content: center;
            order: 1;
          }
        }
      `})]})}export{z as a};
