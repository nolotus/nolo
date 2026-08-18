import{i as s,p as c}from"/public/assets/chunks/chunk-WA4OTMP3.js";import{a as o}from"/public/assets/chunks/chunk-EFFT3IGY.js";import{e as r}from"/public/assets/chunks/chunk-HA3VNNOB.js";var t=r(o(),1),m=({path:e,label:i,icon:a,onClick:n,end:l})=>{let v=s();return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("style",{children:`
          .nav-list-item {
            display: flex;
            align-items: center;
            padding: 0 var(--space-3);
            border: none;
            border-radius: var(--radius-md);
            color: var(--text);
            background: transparent;
            text-decoration: none;
            transition: all 0.2s ease;
            cursor: pointer;
            font: inherit;
            font-weight: 400;
            height: 32px;
            font-size: var(--fontSize-base);
            width: 100%;
            text-align: left;
          }

          .nav-list-icon {
            display: flex;
            align-items: center;
            margin-right: var(--space-2);
            color: var(--textSecondary);
          }

          .nav-list-item:hover {
            color: var(--primary);
            background: var(--primaryGhost);
          }

          .nav-list-item:hover .nav-list-icon {
            color: var(--primary);
          }

          .nav-list-item.active {
            background: var(--primary);
            color: var(--background);
          }

          .nav-list-item.active .nav-list-icon {
            color: var(--background);
          }

          @media (prefers-reduced-motion: reduce) {
            .nav-list-item {
              transition: none;
            }
          }
        `}),n?(0,t.jsxs)("button",{type:"button",onClick:n,className:"nav-list-item",children:[a&&(0,t.jsx)("span",{className:"nav-list-icon","aria-hidden":"true",children:a}),i]}):e?(0,t.jsxs)(c,{to:e,state:v.state,end:l,className:({isActive:d})=>`nav-list-item ${d?"active":""}`,children:[a&&(0,t.jsx)("span",{className:"nav-list-icon","aria-hidden":"true",children:a}),i]}):null]})},u=m;export{u as a};
