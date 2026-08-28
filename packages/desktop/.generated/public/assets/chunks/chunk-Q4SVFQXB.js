function $(n){if(!n||typeof n.text!="string")return"";let r=n.text;return r?(n.bold&&(r=`**${r}**`),n.italic&&(r=`*${r}*`),n.strikethrough&&(r=`~~${r}~~`),r):""}function d(n,r={}){return n?typeof n.text=="string"?$(n):Array.isArray(n.children)?n.children.map(t=>d(t,r)).join(""):"":""}function w(n,r){let t=Array.isArray(n.children)?n.children:[];if(t.length===0)return"";let e=Array.isArray(n.columns)?n.columns.map(s=>s?.align||"left"):[],a=t.map(s=>(Array.isArray(s?.children)?s.children:[]).map(u=>d(u,r).replace(/\n+/g," ").trim()||" ")),c=a[0]||[],l=c.map((s,u)=>{let m=e[u];return m==="center"?":---:":m==="right"?"---:":"---"}),g=a.slice(1);return[c,l,...g].map(s=>`| ${s.join(" | ")} |`).join(`
`)+`

`}function o(n,r,t,e,a,c={}){let l="  ".repeat(r),g=n.checked===!0?"- [x]":n.checked===!1?"- [ ]":t?`${e+a}.`:"-",u=(Array.isArray(n.children)?n.children:[]).flatMap(y=>{let h=i(y,r+1,c).trimEnd();return h?[h]:[]});if(u.length===0)return`${l}${g}
`;let[m,...j]=u,f=m.split(`
`),k=f.shift()||"",p=f.map(y=>`${l}  ${y}`).join(`
`),b=j.map(y=>`${l}  ${y}`).join(`
`);return[`${l}${g} ${k}`,p,b].filter(Boolean).join(`
`)+`
`}function i(n,r=0,t={}){if(!n)return"";switch(n.type){case"heading-one":return`# ${n.children.map(e=>i(e,r,t)).join("")}

`;case"heading-two":return`## ${n.children.map(e=>i(e,r,t)).join("")}

`;case"heading-three":return`### ${n.children.map(e=>i(e,r,t)).join("")}

`;case"heading-four":return`#### ${n.children.map(e=>i(e,r,t)).join("")}

`;case"heading-five":return`##### ${n.children.map(e=>i(e,r,t)).join("")}

`;case"heading-six":return`###### ${n.children.map(e=>i(e,r,t)).join("")}

`;case"paragraph":return`${n.children.map(e=>i(e,r,t)).join("")}

`;case"list":return n.children.map((e,a)=>o(e,r,!!n.ordered,n.start||1,a,t)).join("");case"list-item":return o(n,r,!1,1,0,t);case"quote":return`> ${n.children.map(a=>i(a,r,t)).join("").trim().replace(/\n/g,`
> `)}

`;case"code-block":{let e=n.children.map(a=>(a.children||[]).map(c=>c.text).join("")).join(`
`);return"```"+(n.language||"")+`
`+e+"\n```\n\n"}case"link":return`[${n.children.map(a=>i(a,r,t)).join("")}](${n.url})`;case"table":return w(n,t);case"code-inline":return`\`${n.children.map(e=>i(e,r,t)).join("")}\``;case"mention":{if(t.mentionResolver)return t.mentionResolver(n);let e=n.label||n.resourceId||"mention",a=n.resourceType||"unknown",c=n.resourceId||"unknown";return`@[${a}:${c}|${e}]`}case"image":{let e=n.alt||"",a=n.title?` "${n.title}"`:"";return`![${e}](${n.url||""}${a})`}case"html-inline":return typeof n.html=="string"?n.html:"";case"html-block":return typeof n.html=="string"?`${n.html}

`:"";case"thematic-break":return`---

`;default:return $(n)||(n.children?n.children.map(e=>i(e,r,t)).join(""):"")}}function x(n,r={}){return!n||n.length===0?"":n.map(t=>i(t,0,r)).join("").trim()+`
`}export{x as a};
