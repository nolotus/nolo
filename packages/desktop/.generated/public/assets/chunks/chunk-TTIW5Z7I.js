import{a as f}from"/public/assets/chunks/chunk-2SFLHF46.js";function $(n){if(!n||typeof n.text!="string")return"";let r=n.text;return r?(n.bold&&(r=`**${r}**`),n.italic&&(r=`*${r}*`),n.strikethrough&&(r=`~~${r}~~`),r):""}function w(n,r={}){return n?typeof n.text=="string"?$(n):Array.isArray(n.children)?n.children.map(t=>w(t,r)).join(""):"":""}function A(n,r,t){let i=Array.isArray(n.children)?n.children:[];if(i.length===0)return"";let l=Array.isArray(n.columns)?n.columns.map(s=>s?.align||"left"):[],u=i.map(s=>(Array.isArray(s?.children)?s.children:[]).map(d=>w(d,t).replace(/\n+/g," ").trim()||" ")),o=u[0]||[],e=o.map((s,d)=>{let m=l[d];return m==="center"?":---:":m==="right"?"---:":"---"}),c=u.slice(1);return`${[o,e,...c].map(s=>`| ${s.join(" | ")} |`).join(`
`)}

`}function h(n,r,t,i,l,u={}){let o="  ".repeat(r),e=n.checked===!0?"- [x]":n.checked===!1?"- [ ]":t?`${i+l}.`:"-",y=(Array.isArray(n.children)?n.children:[]).flatMap(g=>{let p=a(g,r+1,u).trimEnd();return p?[p]:[]});if(y.length===0)return`${o}${e}
`;let[s,...d]=y,m=s.split(`
`),x=m.shift()||"",j=m.map(g=>`${o}  ${g}`).join(`
`),b=d.map(g=>`${o}  ${g}`).join(`
`);return[`${o}${e} ${x}`,j,b].filter(Boolean).join(`
`)+`
`}function a(n,r=0,t={}){if(!n)return"";let i="  ".repeat(r);switch(n.type){case"heading-one":return`# ${n.children.map(e=>a(e,r,t)).join("")}

`;case"heading-two":return`## ${n.children.map(e=>a(e,r,t)).join("")}

`;case"heading-three":return`### ${n.children.map(e=>a(e,r,t)).join("")}

`;case"heading-four":return`#### ${n.children.map(e=>a(e,r,t)).join("")}

`;case"heading-five":return`##### ${n.children.map(e=>a(e,r,t)).join("")}

`;case"heading-six":return`###### ${n.children.map(e=>a(e,r,t)).join("")}

`;case"paragraph":return`${n.children.map(e=>a(e,r,t)).join("")}

`;case"list":return n.children.map((e,c)=>h(e,r,!!n.ordered,n.start||1,c,t)).join("");case"list-item":return h(n,r,!1,1,0,t);case"quote":return`> ${n.children.map(e=>a(e,r,t)).join("").trim().replace(/\n/g,`
> `)}

`;case"code-block":let u=n.children.map(e=>(e.children||[]).map(c=>c.text).join("")).join(`
`);return"```"+(n.language||"")+`
`+u+"\n```\n\n";case"link":return`[${n.children.map(e=>a(e,r,t)).join("")}](${n.url})`;case"table":return A(n,r,t);case"code-inline":return`\`${n.children.map(e=>a(e,r,t)).join("")}\``;case"mention":{if(t.mentionResolver)return t.mentionResolver(n);let e=n.label||n.resourceId||"mention",c=n.resourceType||"unknown",y=n.resourceId||"unknown";return`@[${c}:${y}|${e}]`}case"image":{let e=n.alt||"",c=n.title?` "${n.title}"`:"";return`![${e}](${n.url||""}${c})`}case"html-inline":return typeof n.html=="string"?n.html:"";case"html-block":return typeof n.html=="string"?`${n.html}

`:"";case"thematic-break":return`---

`;default:return $(n)||(n.children?n.children.map(e=>a(e,r,t)).join(""):"")}}function k(n,r={}){return!n||n.length===0?"":n.map(t=>a(t,0,r)).join("").trim()+`
`}var M={name:"readDoc",description:["\u8BFB\u53D6\u6307\u5B9A\u9875\u9762\u7684\u5185\u5BB9\uFF0C\u5E76\u5C06\u7ED3\u6784\u5316\u7684\u6570\u636E\u8F6C\u6362\u4E3A Markdown \u683C\u5F0F\u8FD4\u56DE\u3002","\u5982\u679C\u4F60\u62FF\u5230\u4E86\u9875\u9762\u7684 dbKey\uFF08\u5982 page-xxx\uFF09\uFF0C\u8BF7\u4F7F\u7528\u6B64\u5DE5\u5177\u67E5\u770B\u9875\u9762\u5185\u5BB9\u3002"].join(`
`),parameters:{type:"object",properties:{id:{type:"string",description:"\u9875\u9762/\u6587\u6863\u7684\u6570\u636E\u5E93\u952E\uFF08dbKey\uFF09\uFF0C\u4F8B\u5982 page-xxx\u3002"}},required:["id"]}},K={...M,name:"readPage"},S=n=>{let r=k(n.slateData||[]),t={success:!0,id:n.dbKey,title:n.title,content:r,metadata:{spaceId:n.spaceId,created:n.created}},i=`\u5DF2\u6210\u529F\u8BFB\u53D6\u9875\u9762\u300A${n.title}\u300B\u3002

\u5185\u5BB9\u5982\u4E0B\uFF1A

${r}`;return{rawData:t,displayData:i}};async function T(n,r){let t=n.id??n.doc??n.docKey??n.pageKey??n.key;if(!t||!t.toLowerCase().startsWith("page-"))throw new Error(`\u65E0\u6548\u7684\u9875\u9762 ID: ${t}\u3002\u9875\u9762 ID \u901A\u5E38\u4EE5 "page-" \u5F00\u5934\u3002`);try{let{readAction:i}=await import("/public/assets/chunks/read-T3N5X53F.js"),l=await i({dbKey:t},r);if(!l)throw new Error(`\u672A\u627E\u5230 ID \u4E3A ${t} \u7684\u9875\u9762\u3002`);return S(l)}catch(i){throw new Error(`\u8BFB\u53D6\u9875\u9762\u65F6\u51FA\u9519: ${f(i)}`)}}var O=T;export{k as a,M as b,K as c,S as d,T as e,O as f};
