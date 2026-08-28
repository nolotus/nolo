import{a as Se,b as Re,c as Te,d as Ae,e as sr,f as Ce}from"/public/assets/chunks/chunk-TE255C6C.js";import{A as cr,B as ur,a as Ke,b as _,c as Yn,d as W,e as Vn,f as ht,g as qn,h as Zn,i as Mt,j as ue,k as ye,l as Xn,m as T,n as Ge,o as Dt,p as Ot,q as Jn,r as Qn,s as er,t as tr,u as nr,v as rr,w as ar,x as or,y as ir,z as lr}from"/public/assets/chunks/chunk-5EOMRUF4.js";import{a as dr}from"/public/assets/chunks/chunk-YCYM3CAM.js";import{a as Wn}from"/public/assets/chunks/chunk-J4D6WQNO.js";import{a as Gn}from"/public/assets/chunks/chunk-7HZ6N6Y4.js";import{a as ft}from"/public/assets/chunks/chunk-BQI3OTHD.js";import{P as Hn}from"/public/assets/chunks/chunk-TLBYNK3L.js";import{k as _n}from"/public/assets/chunks/chunk-CORPI7HT.js";import{p as Vt}from"/public/assets/chunks/chunk-5NMWODED.js";import{Fc as In,Ga as Sn,Hc as gt,Se as $n,_d as zn,bh as jn,cb as Rn,db as Tn,df as Un,ob as An,od as Nn,oi as be,pi as je,tb as Cn,td as Je,ub as Ln,uh as Kn,yc as Fn}from"/public/assets/chunks/chunk-K6SBFEEZ.js";import{$c as dn,Ab as on,Cc as un,H as Jt,Ib as dt,Mb as sn,Od as mn,P as Qt,Sd as pt,Tb as ln,Ub as cn,c as qt,cd as pn,ee as fn,h as Zt,he as hn,je as bn,ma as en,me as yn,o as ct,q as Xt,re as En,sb as nn,se as kn,te as vn,ua as tn,ub as rn,uc as Nt,ue as wn,vb as ut,wb as an,y as xe,zd as gn}from"/public/assets/chunks/chunk-I4KLHIYO.js";import{b as Bn}from"/public/assets/chunks/chunk-I5HE5HNS.js";import{a as xn}from"/public/assets/chunks/chunk-E6T75ZBQ.js";import{a as lt}from"/public/assets/chunks/chunk-P6V6WVAI.js";import{a as D}from"/public/assets/chunks/chunk-U3FV4FR4.js";import{a as ne}from"/public/assets/chunks/chunk-DYHF2IZM.js";import{a as Mn,b as he,c as X,d as Pe,e as se,f as mt,g as k,i as Dn,k as On,l as v,m as Pn}from"/public/assets/chunks/chunk-R3S7FEWJ.js";import{b as xa,d as A}from"/public/assets/chunks/chunk-WEOWWZTJ.js";var Rr=xa((mi,xt)=>{var Na=typeof window<"u"?window:typeof WorkerGlobalScope<"u"&&self instanceof WorkerGlobalScope?self:{};var S=function(e){var t=/(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i,n=0,a={},r={manual:e.Prism&&e.Prism.manual,disableWorkerMessageHandler:e.Prism&&e.Prism.disableWorkerMessageHandler,util:{encode:function c(s){return s instanceof o?new o(s.type,c(s.content),s.alias):Array.isArray(s)?s.map(c):s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/\u00a0/g," ")},type:function(c){return Object.prototype.toString.call(c).slice(8,-1)},objId:function(c){return c.__id||Object.defineProperty(c,"__id",{value:++n}),c.__id},clone:function c(s,p){p=p||{};var m,h;switch(r.util.type(s)){case"Object":if(h=r.util.objId(s),p[h])return p[h];m={},p[h]=m;for(var w in s)s.hasOwnProperty(w)&&(m[w]=c(s[w],p));return m;case"Array":return h=r.util.objId(s),p[h]?p[h]:(m=[],p[h]=m,s.forEach(function(F,x){m[x]=c(F,p)}),m);default:return s}},getLanguage:function(c){for(;c;){var s=t.exec(c.className);if(s)return s[1].toLowerCase();c=c.parentElement}return"none"},setLanguage:function(c,s){c.className=c.className.replace(RegExp(t,"gi"),""),c.classList.add("language-"+s)},currentScript:function(){if(typeof document>"u")return null;if(document.currentScript&&document.currentScript.tagName==="SCRIPT")return document.currentScript;try{throw new Error}catch(m){var c=(/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(m.stack)||[])[1];if(c){var s=document.getElementsByTagName("script");for(var p in s)if(s[p].src==c)return s[p]}return null}},isActive:function(c,s,p){for(var m="no-"+s;c;){var h=c.classList;if(h.contains(s))return!0;if(h.contains(m))return!1;c=c.parentElement}return!!p}},languages:{plain:a,plaintext:a,text:a,txt:a,extend:function(c,s){var p=r.util.clone(r.languages[c]);for(var m in s)p[m]=s[m];return p},insertBefore:function(c,s,p,m){m=m||r.languages;var h=m[c],w={};for(var F in h)if(h.hasOwnProperty(F)){if(F==s)for(var x in p)p.hasOwnProperty(x)&&(w[x]=p[x]);p.hasOwnProperty(F)||(w[F]=h[F])}var I=m[c];return m[c]=w,r.languages.DFS(r.languages,function(O,te){te===I&&O!=c&&(this[O]=w)}),w},DFS:function c(s,p,m,h){h=h||{};var w=r.util.objId;for(var F in s)if(s.hasOwnProperty(F)){p.call(s,F,s[F],m||F);var x=s[F],I=r.util.type(x);I==="Object"&&!h[w(x)]?(h[w(x)]=!0,c(x,p,null,h)):I==="Array"&&!h[w(x)]&&(h[w(x)]=!0,c(x,p,F,h))}}},plugins:{},highlightAll:function(c,s){r.highlightAllUnder(document,c,s)},highlightAllUnder:function(c,s,p){var m={callback:p,container:c,selector:'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'};r.hooks.run("before-highlightall",m),m.elements=Array.prototype.slice.apply(m.container.querySelectorAll(m.selector)),r.hooks.run("before-all-elements-highlight",m);for(var h=0,w;w=m.elements[h++];)r.highlightElement(w,s===!0,m.callback)},highlightElement:function(c,s,p){var m=r.util.getLanguage(c),h=r.languages[m];r.util.setLanguage(c,m);var w=c.parentElement;w&&w.nodeName.toLowerCase()==="pre"&&r.util.setLanguage(w,m);var F=c.textContent,x={element:c,language:m,grammar:h,code:F};function I(te){x.highlightedCode=te,r.hooks.run("before-insert",x),x.element.innerHTML=x.highlightedCode,r.hooks.run("after-highlight",x),r.hooks.run("complete",x),p&&p.call(x.element)}if(r.hooks.run("before-sanity-check",x),w=x.element.parentElement,w&&w.nodeName.toLowerCase()==="pre"&&!w.hasAttribute("tabindex")&&w.setAttribute("tabindex","0"),!x.code){r.hooks.run("complete",x),p&&p.call(x.element);return}if(r.hooks.run("before-highlight",x),!x.grammar){I(r.util.encode(x.code));return}if(s&&e.Worker){var O=new Worker(r.filename);O.onmessage=function(te){I(te.data)},O.postMessage(JSON.stringify({language:x.language,code:x.code,immediateClose:!0}))}else I(r.highlight(x.code,x.grammar,x.language))},highlight:function(c,s,p){var m={code:c,grammar:s,language:p};if(r.hooks.run("before-tokenize",m),!m.grammar)throw new Error('The language "'+m.language+'" has no grammar.');return m.tokens=r.tokenize(m.code,m.grammar),r.hooks.run("after-tokenize",m),o.stringify(r.util.encode(m.tokens),m.language)},tokenize:function(c,s){var p=s.rest;if(p){for(var m in p)s[m]=p[m];delete s.rest}var h=new l;return g(h,h.head,c),d(c,h,s,h.head,0),f(h)},hooks:{all:{},add:function(c,s){var p=r.hooks.all;p[c]=p[c]||[],p[c].push(s)},run:function(c,s){var p=r.hooks.all[c];if(!(!p||!p.length))for(var m=0,h;h=p[m++];)h(s)}},Token:o};e.Prism=r;function o(c,s,p,m){this.type=c,this.content=s,this.alias=p,this.length=(m||"").length|0}o.stringify=function c(s,p){if(typeof s=="string")return s;if(Array.isArray(s)){var m="";return s.forEach(function(I){m+=c(I,p)}),m}var h={type:s.type,content:c(s.content,p),tag:"span",classes:["token",s.type],attributes:{},language:p},w=s.alias;w&&(Array.isArray(w)?Array.prototype.push.apply(h.classes,w):h.classes.push(w)),r.hooks.run("wrap",h);var F="";for(var x in h.attributes)F+=" "+x+'="'+(h.attributes[x]||"").replace(/"/g,"&quot;")+'"';return"<"+h.tag+' class="'+h.classes.join(" ")+'"'+F+">"+h.content+"</"+h.tag+">"};function i(c,s,p,m){c.lastIndex=s;var h=c.exec(p);if(h&&m&&h[1]){var w=h[1].length;h.index+=w,h[0]=h[0].slice(w)}return h}function d(c,s,p,m,h,w){for(var F in p)if(!(!p.hasOwnProperty(F)||!p[F])){var x=p[F];x=Array.isArray(x)?x:[x];for(var I=0;I<x.length;++I){if(w&&w.cause==F+","+I)return;var O=x[I],te=O.inside,me=!!O.lookbehind,ie=!!O.greedy,z=O.alias;if(ie&&!O.pattern.global){var re=O.pattern.toString().match(/[imsuy]*$/)[0];O.pattern=RegExp(O.pattern.source,re+"g")}for(var Ne=O.pattern||O,B=m.next,G=h;B!==s.tail&&!(w&&G>=w.reach);G+=B.value.length,B=B.next){var J=B.value;if(s.length>c.length)return;if(!(J instanceof o)){var ke=1,Z;if(ie){if(Z=i(Ne,G,c,me),!Z||Z.index>=c.length)break;var Me=Z.index,ot=Z.index+Z[0].length,ae=G;for(ae+=B.value.length;Me>=ae;)B=B.next,ae+=B.value.length;if(ae-=B.value.length,G=ae,B.value instanceof o)continue;for(var ve=B;ve!==s.tail&&(ae<ot||typeof ve.value=="string");ve=ve.next)ke++,ae+=ve.value.length;ke--,J=c.slice(G,ae),Z.index-=G}else if(Z=i(Ne,0,J,me),!Z)continue;var Me=Z.index,De=Z[0],qe=J.slice(0,Me),Ze=J.slice(Me+De.length),Oe=G+J.length;w&&Oe>w.reach&&(w.reach=Oe);var $e=B.prev;qe&&($e=g(s,$e,qe),G+=qe.length),u(s,$e,ke);var Ft=new o(F,te?r.tokenize(De,te):De,z,De);if(B=g(s,$e,Ft),Ze&&g(s,B,Ze),ke>1){var Xe={cause:F+","+I,reach:Oe};d(c,s,p,B.prev,G,Xe),w&&Xe.reach>w.reach&&(w.reach=Xe.reach)}}}}}}function l(){var c={value:null,prev:null,next:null},s={value:null,prev:c,next:null};c.next=s,this.head=c,this.tail=s,this.length=0}function g(c,s,p){var m=s.next,h={value:p,prev:s,next:m};return s.next=h,m.prev=h,c.length++,h}function u(c,s,p){for(var m=s.next,h=0;h<p&&m!==c.tail;h++)m=m.next;s.next=m,m.prev=s,c.length-=h}function f(c){for(var s=[],p=c.head.next;p!==c.tail;)s.push(p.value),p=p.next;return s}if(!e.document)return e.addEventListener&&(r.disableWorkerMessageHandler||e.addEventListener("message",function(c){var s=JSON.parse(c.data),p=s.language,m=s.code,h=s.immediateClose;e.postMessage(r.highlight(m,r.languages[p],p)),h&&e.close()},!1)),r;var y=r.util.currentScript();y&&(r.filename=y.src,y.hasAttribute("data-manual")&&(r.manual=!0));function b(){r.manual||r.highlightAll()}if(!r.manual){var R=document.readyState;R==="loading"||R==="interactive"&&y&&y.defer?document.addEventListener("DOMContentLoaded",b):window.requestAnimationFrame?window.requestAnimationFrame(b):window.setTimeout(b,16)}return r}(Na);typeof xt<"u"&&xt.exports&&(xt.exports=S);typeof global<"u"&&(global.Prism=S);S.languages.markup={comment:{pattern:/<!--(?:(?!<!--)[\s\S])*?-->/,greedy:!0},prolog:{pattern:/<\?[\s\S]+?\?>/,greedy:!0},doctype:{pattern:/<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,greedy:!0,inside:{"internal-subset":{pattern:/(^[^\[]*\[)[\s\S]+(?=\]>$)/,lookbehind:!0,greedy:!0,inside:null},string:{pattern:/"[^"]*"|'[^']*'/,greedy:!0},punctuation:/^<!|>$|[[\]]/,"doctype-tag":/^DOCTYPE/i,name:/[^\s<>'"]+/}},cdata:{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,greedy:!0},tag:{pattern:/<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,greedy:!0,inside:{tag:{pattern:/^<\/?[^\s>\/]+/,inside:{punctuation:/^<\/?/,namespace:/^[^\s>\/:]+:/}},"special-attr":[],"attr-value":{pattern:/=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,inside:{punctuation:[{pattern:/^=/,alias:"attr-equals"},{pattern:/^(\s*)["']|["']$/,lookbehind:!0}]}},punctuation:/\/?>/,"attr-name":{pattern:/[^\s>\/]+/,inside:{namespace:/^[^\s>\/:]+:/}}}},entity:[{pattern:/&[\da-z]{1,8};/i,alias:"named-entity"},/&#x?[\da-f]{1,8};/i]};S.languages.markup.tag.inside["attr-value"].inside.entity=S.languages.markup.entity;S.languages.markup.doctype.inside["internal-subset"].inside=S.languages.markup;S.hooks.add("wrap",function(e){e.type==="entity"&&(e.attributes.title=e.content.replace(/&amp;/,"&"))});Object.defineProperty(S.languages.markup.tag,"addInlined",{value:function(t,n){var a={};a["language-"+n]={pattern:/(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,lookbehind:!0,inside:S.languages[n]},a.cdata=/^<!\[CDATA\[|\]\]>$/i;var r={"included-cdata":{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,inside:a}};r["language-"+n]={pattern:/[\s\S]+/,inside:S.languages[n]};var o={};o[t]={pattern:RegExp(/(<__[^>]*>)(?:<!\[CDATA\[(?:[^\]]|\](?!\]>))*\]\]>|(?!<!\[CDATA\[)[\s\S])*?(?=<\/__>)/.source.replace(/__/g,function(){return t}),"i"),lookbehind:!0,greedy:!0,inside:r},S.languages.insertBefore("markup","cdata",o)}});Object.defineProperty(S.languages.markup.tag,"addAttribute",{value:function(e,t){S.languages.markup.tag.inside["special-attr"].push({pattern:RegExp(/(^|["'\s])/.source+"(?:"+e+")"+/\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))/.source,"i"),lookbehind:!0,inside:{"attr-name":/^[^\s=]+/,"attr-value":{pattern:/=[\s\S]+/,inside:{value:{pattern:/(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,lookbehind:!0,alias:[t,"language-"+t],inside:S.languages[t]},punctuation:[{pattern:/^=/,alias:"attr-equals"},/"|'/]}}}})}});S.languages.html=S.languages.markup;S.languages.mathml=S.languages.markup;S.languages.svg=S.languages.markup;S.languages.xml=S.languages.extend("markup",{});S.languages.ssml=S.languages.xml;S.languages.atom=S.languages.xml;S.languages.rss=S.languages.xml;(function(e){var t=/(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;e.languages.css={comment:/\/\*[\s\S]*?\*\//,atrule:{pattern:RegExp("@[\\w-](?:"+/[^;{\s"']|\s+(?!\s)/.source+"|"+t.source+")*?"+/(?:;|(?=\s*\{))/.source),inside:{rule:/^@[\w-]+/,"selector-function-argument":{pattern:/(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,lookbehind:!0,alias:"selector"},keyword:{pattern:/(^|[^\w-])(?:and|not|only|or)(?![\w-])/,lookbehind:!0}}},url:{pattern:RegExp("\\burl\\((?:"+t.source+"|"+/(?:[^\\\r\n()"']|\\[\s\S])*/.source+")\\)","i"),greedy:!0,inside:{function:/^url/i,punctuation:/^\(|\)$/,string:{pattern:RegExp("^"+t.source+"$"),alias:"url"}}},selector:{pattern:RegExp(`(^|[{}\\s])[^{}\\s](?:[^{};"'\\s]|\\s+(?![\\s{])|`+t.source+")*(?=\\s*\\{)"),lookbehind:!0},string:{pattern:t,greedy:!0},property:{pattern:/(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,lookbehind:!0},important:/!important\b/i,function:{pattern:/(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,lookbehind:!0},punctuation:/[(){};:,]/},e.languages.css.atrule.inside.rest=e.languages.css;var n=e.languages.markup;n&&(n.tag.addInlined("style","css"),n.tag.addAttribute("style","css"))})(S);S.languages.clike={comment:[{pattern:/(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,lookbehind:!0,greedy:!0},{pattern:/(^|[^\\:])\/\/.*/,lookbehind:!0,greedy:!0}],string:{pattern:/(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,greedy:!0},"class-name":{pattern:/(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,lookbehind:!0,inside:{punctuation:/[.\\]/}},keyword:/\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,boolean:/\b(?:false|true)\b/,function:/\b\w+(?=\()/,number:/\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,operator:/[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,punctuation:/[{}[\];(),.:]/};S.languages.javascript=S.languages.extend("clike",{"class-name":[S.languages.clike["class-name"],{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,lookbehind:!0}],keyword:[{pattern:/((?:^|\})\s*)catch\b/,lookbehind:!0},{pattern:/(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,lookbehind:!0}],function:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,number:{pattern:RegExp(/(^|[^\w$])/.source+"(?:"+(/NaN|Infinity/.source+"|"+/0[bB][01]+(?:_[01]+)*n?/.source+"|"+/0[oO][0-7]+(?:_[0-7]+)*n?/.source+"|"+/0[xX][\dA-Fa-f]+(?:_[\dA-Fa-f]+)*n?/.source+"|"+/\d+(?:_\d+)*n/.source+"|"+/(?:\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[Ee][+-]?\d+(?:_\d+)*)?/.source)+")"+/(?![\w$])/.source),lookbehind:!0},operator:/--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/});S.languages.javascript["class-name"][0].pattern=/(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/;S.languages.insertBefore("javascript","keyword",{regex:{pattern:RegExp(/((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)/.source+/\//.source+"(?:"+/(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}/.source+"|"+/(?:\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.)*\])*\])*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}v[dgimyus]{0,7}/.source+")"+/(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/.source),lookbehind:!0,greedy:!0,inside:{"regex-source":{pattern:/^(\/)[\s\S]+(?=\/[a-z]*$)/,lookbehind:!0,alias:"language-regex",inside:S.languages.regex},"regex-delimiter":/^\/|\/$/,"regex-flags":/^[a-z]+$/}},"function-variable":{pattern:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,alias:"function"},parameter:[{pattern:/(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,lookbehind:!0,inside:S.languages.javascript},{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,lookbehind:!0,inside:S.languages.javascript},{pattern:/(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,lookbehind:!0,inside:S.languages.javascript},{pattern:/((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,lookbehind:!0,inside:S.languages.javascript}],constant:/\b[A-Z](?:[A-Z_]|\dx?)*\b/});S.languages.insertBefore("javascript","string",{hashbang:{pattern:/^#!.*/,greedy:!0,alias:"comment"},"template-string":{pattern:/`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,greedy:!0,inside:{"template-punctuation":{pattern:/^`|`$/,alias:"string"},interpolation:{pattern:/((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,lookbehind:!0,inside:{"interpolation-punctuation":{pattern:/^\$\{|\}$/,alias:"punctuation"},rest:S.languages.javascript}},string:/[\s\S]+/}},"string-property":{pattern:/((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,lookbehind:!0,greedy:!0,alias:"property"}});S.languages.insertBefore("javascript","operator",{"literal-property":{pattern:/((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,lookbehind:!0,alias:"property"}});S.languages.markup&&(S.languages.markup.tag.addInlined("script","javascript"),S.languages.markup.tag.addAttribute(/on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source,"javascript"));S.languages.js=S.languages.javascript;(function(){if(typeof S>"u"||typeof document>"u")return;Element.prototype.matches||(Element.prototype.matches=Element.prototype.msMatchesSelector||Element.prototype.webkitMatchesSelector);var e="Loading\u2026",t=function(y,b){return"\u2716 Error "+y+" while fetching file: "+b},n="\u2716 Error: File does not exist or is empty",a={js:"javascript",py:"python",rb:"ruby",ps1:"powershell",psm1:"powershell",sh:"bash",bat:"batch",h:"c",tex:"latex"},r="data-src-status",o="loading",i="loaded",d="failed",l="pre[data-src]:not(["+r+'="'+i+'"]):not(['+r+'="'+o+'"])';function g(y,b,R){var c=new XMLHttpRequest;c.open("GET",y,!0),c.onreadystatechange=function(){c.readyState==4&&(c.status<400&&c.responseText?b(c.responseText):c.status>=400?R(t(c.status,c.statusText)):R(n))},c.send(null)}function u(y){var b=/^\s*(\d+)\s*(?:(,)\s*(?:(\d+)\s*)?)?$/.exec(y||"");if(b){var R=Number(b[1]),c=b[2],s=b[3];return c?s?[R,Number(s)]:[R,void 0]:[R,R]}}S.hooks.add("before-highlightall",function(y){y.selector+=", "+l}),S.hooks.add("before-sanity-check",function(y){var b=y.element;if(b.matches(l)){y.code="",b.setAttribute(r,o);var R=b.appendChild(document.createElement("CODE"));R.textContent=e;var c=b.getAttribute("data-src"),s=y.language;if(s==="none"){var p=(/\.(\w+)$/.exec(c)||[,"none"])[1];s=a[p]||p}S.util.setLanguage(R,s),S.util.setLanguage(b,s);var m=S.plugins.autoloader;m&&m.loadLanguages(s),g(c,function(h){b.setAttribute(r,i);var w=u(b.getAttribute("data-range"));if(w){var F=h.split(/\r\n?|\n/g),x=w[0],I=w[1]==null?F.length:w[1];x<0&&(x+=F.length),x=Math.max(0,Math.min(x-1,F.length)),I<0&&(I+=F.length),I=Math.max(0,Math.min(I,F.length)),h=F.slice(x,I).join(`
`),b.hasAttribute("data-start")||b.setAttribute("data-start",String(x+1))}R.textContent=h,S.highlightElement(R)},function(h){b.setAttribute(r,d),R.textContent=h})}}),S.plugins.fileHighlight={highlight:function(b){for(var R=(b||document).querySelectorAll(l),c=0,s;s=R[c++];)S.highlightElement(s)}};var f=!1;S.fileHighlight=function(){f||(console.warn("Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead."),f=!0),S.plugins.fileHighlight.highlight.apply(this,arguments)}})()});var M=A(ne(),1);var Sa={isHistory(e){return Mn(e)&&Array.isArray(e.redos)&&Array.isArray(e.undos)&&(e.redos.length===0||mt.isOperationList(e.redos[0].operations))&&(e.undos.length===0||mt.isOperationList(e.undos[0].operations))}};var Pt=new WeakMap,ze=new WeakMap,bt=new WeakMap,pe={isHistoryEditor(e){return Sa.isHistory(e.history)&&k.isEditor(e)},isMerging(e){return ze.get(e)},isSplittingOnce(e){return bt.get(e)},setSplittingOnce(e,t){bt.set(e,t)},isSaving(e){return Pt.get(e)},redo(e){e.redo()},undo(e){e.undo()},withMerging(e,t){var n=pe.isMerging(e);ze.set(e,!0),t(),ze.set(e,n)},withNewBatch(e,t){var n=pe.isMerging(e);ze.set(e,!0),bt.set(e,!0),t(),ze.set(e,n),bt.delete(e)},withoutMerging(e,t){var n=pe.isMerging(e);ze.set(e,!1),t(),ze.set(e,n)},withoutSaving(e,t){var n=pe.isSaving(e);Pt.set(e,!1);try{t()}finally{Pt.set(e,n)}}},pr=e=>{var t=e,{apply:n}=t;return t.history={undos:[],redos:[]},t.redo=()=>{var{history:a}=t,{redos:r}=a;if(r.length>0){var o=r[r.length-1];o.selectionBefore&&v.setSelection(t,o.selectionBefore),pe.withoutSaving(t,()=>{k.withoutNormalizing(t,()=>{for(var i of o.operations)t.apply(i)})}),a.redos.pop(),t.writeHistory("undos",o)}},t.undo=()=>{var{history:a}=t,{undos:r}=a;if(r.length>0){var o=r[r.length-1];pe.withoutSaving(t,()=>{k.withoutNormalizing(t,()=>{var i=o.operations.map(mt.inverse).reverse();for(var d of i)t.apply(d);o.selectionBefore&&v.setSelection(t,o.selectionBefore)})}),t.writeHistory("redos",o),a.undos.pop()}},t.apply=a=>{var{operations:r,history:o}=t,{undos:i}=o,d=i[i.length-1],l=d&&d.operations[d.operations.length-1],g=pe.isSaving(t),u=pe.isMerging(t);if(g==null&&(g=Ta(a)),g){if(u==null&&(d==null?u=!1:r.length!==0?u=!0:u=Ra(a,l)),pe.isSplittingOnce(t)&&(u=!1,pe.setSplittingOnce(t,void 0)),d&&u)d.operations.push(a);else{var f={operations:[a],selectionBefore:t.selection};t.writeHistory("undos",f)}for(;i.length>100;)i.shift();o.redos=[]}n(a)},t.writeHistory=(a,r)=>{t.history[a].push(r)},t},Ra=(e,t)=>!!(t&&e.type==="insert_text"&&t.type==="insert_text"&&e.offset===t.offset+t.text.length&&he.equals(e.path,t.path)||t&&e.type==="remove_text"&&t.type==="remove_text"&&e.offset+e.text.length===t.offset&&he.equals(e.path,t.path)),Ta=(e,t)=>e.type!=="set_selection";var gr=e=>{let{normalizeNode:t}=e;return e.normalizeNode=n=>{let[a,r]=n;if(k.isEditor(a)&&r.length===0&&a.children.length===0){let i={type:"paragraph",children:[{text:""}]};v.insertNodes(e,i,{at:[0]});return}return t(n)},e};var zt="list",Qe=e=>T(e)&&e.type==="list-item",yt=(e,t,n="type")=>{let{selection:a}=e;if(!a)return!1;let[r]=Array.from(k.nodes(e,{at:k.unhangRange(e,a),match:o=>T(o)&&o[n]===t}));return!!r},Et=e=>{let{selection:t}=e;if(!t)return null;let[n]=k.nodes(e,{at:k.unhangRange(e,t),match:i=>!k.isEditor(i)&&Qe(i)});if(!n)return null;let[a,r]=n;if(a.checked!==void 0)return"task";let o=se.get(e,he.parent(r));return!T(o)||o.type!==zt?null:o.ordered?"ordered":"unordered"},mr=e=>{v.unwrapNodes(e,{match:t=>T(t)&&t.type===zt,split:!0})},et=(e,t)=>{mr(e),v.unsetNodes(e,"checked",{match:n=>Qe(n)}),v.setNodes(e,{type:t})},Bt=(e,t)=>{let a=Et(e)===t;if(mr(e),a){v.unsetNodes(e,"checked",{match:r=>Qe(r)}),v.setNodes(e,{type:"paragraph"});return}v.setNodes(e,{type:"list-item"}),t==="task"?v.setNodes(e,{checked:!1},{match:r=>Qe(r)}):v.unsetNodes(e,"checked",{match:r=>Qe(r)}),v.wrapNodes(e,{type:zt,ordered:t==="ordered",children:[]})},kt=e=>Bt(e,"ordered"),vt=e=>Bt(e,"unordered"),wt=e=>Bt(e,"task");var le=(e,t)=>{tt(e,t)?k.removeMark(e,t):k.addMark(e,t,!0)},tt=(e,t)=>{let n=k.marks(e);return n?n[t]===!0:!1};var Aa={"*":{type:"list-item",wrapper:"list",ordered:!1},"-":{type:"list-item",wrapper:"list",ordered:!1},"+":{type:"list-item",wrapper:"list",ordered:!1},"1.":{type:"list-item",wrapper:"list",ordered:!0},"[]":{type:"list-item",wrapper:"list",ordered:!1,checked:!1},"[x]":{type:"list-item",wrapper:"list",ordered:!1,checked:!0},"#":"heading-one","##":"heading-two","###":"heading-three","####":"heading-four","#####":"heading-five","######":"heading-six",">":"block-quote","```":"code-block","---":"divider"},fr={"mod+b":"bold","mod+i":"italic","mod+u":"underline","mod+`":"code"},Ca=(e,t)=>{try{let n=e.startsWith("mod+"),a=n?e.slice(4):e,r=t.ctrlKey||t.metaKey;return n&&!r||!n&&r?!1:t.key.toLowerCase()===a.toLowerCase()}catch(n){return console.warn("Error checking hotkey:",n),!1}},hr=e=>{let{deleteBackward:t,insertText:n}=e,a=e.onKeyDown;return e.insertText=r=>{let{selection:o}=e;if(r.endsWith(" ")&&o&&X.isCollapsed(o)){let{anchor:i}=o,d=k.above(e,{match:b=>T(b)&&k.isBlock(e,b)});if(!d){n(r);return}let l=d[1],g=k.start(e,l),u={anchor:i,focus:g},f=k.string(e,u)+r.slice(0,-1),y=Aa[f];if(y){if(v.select(e,u),v.delete(e),typeof y=="string")et(e,y);else{let{ordered:b,checked:R}=y;R!==void 0?(wt(e),R&&v.setNodes(e,{checked:!0},{match:c=>T(c)&&c.type==="list-item"})):b?kt(e):vt(e)}return}}n(r)},e.deleteBackward=(...r)=>{let{selection:o}=e;if(o&&X.isCollapsed(o)){let i=k.above(e,{match:d=>T(d)&&k.isBlock(e,d)});if(i){let[d,l]=i,g=k.start(e,l);if(T(d)&&d.type!=="paragraph"&&Dn.equals(o.anchor,g)){et(e,"paragraph");return}}}t(...r)},e.onKeyDown=r=>{for(let o in fr)if(Ca(o,r)){r.preventDefault();let i=fr[o];le(e,i);return}a&&a(r)},e};var br=e=>{let{isInline:t}=e;return e.isInline=n=>T(n)&&n.type==="link"?!0:t(n),e};var yr=e=>{let{normalizeNode:t}=e;return e.normalizeNode=([n,a])=>{if(T(n)&&n.type==="table"){let r=n,o=0,i=!1;if(!r.children||r.children.length===0){v.removeNodes(e,{at:a});return}for(let l of r.children)T(l)&&l.type==="table-row"&&(o=Math.max(o,l.children?.length||0));let d=r.columns;if((!d||d.length!==o)&&(i=!0),i&&o>0){let l=Array.from({length:o},()=>({width:null,align:"left"}));v.setNodes(e,{columns:l},{at:a});return}}return t([n,a])},e};var Er=e=>{let t=e;if(!t||!t.trim())return t;t=t.replace(/[!！]{2,}/g,"\uFF01").replace(/[?？]{2,}/g,"\uFF1F").replace(/[,，]{2,}/g,"\uFF0C").replace(/[.。]{2,}/g,"\u3002");let a="[\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF]",r={",":"\uFF0C",".":"\u3002","!":"\uFF01","?":"\uFF1F",":":"\uFF1A",";":"\uFF1B"};t=t.replace(new RegExp(`(${a})([,.!?:;])`,"g"),(i,d,l)=>d+(r[l]??l)),t=t.replace(new RegExp(`([,.!?:;])(${a})`,"g"),(i,d,l)=>(r[d]??d)+l),t=t.replace(/\s*([，。！？：；])\s*/g,"$1");let o="[A-Za-z0-9]";return t=t.replace(new RegExp(`(${a})(${o})`,"g"),"$1 $2"),t=t.replace(new RegExp(`(${o})(${a})`,"g"),"$1 $2"),t=t.replace(new RegExp(`(${a})([0-9])`,"g"),"$1 $2"),t=t.replace(new RegExp(`([0-9])(${a})`,"g"),"$1 $2"),t=t.replace(/(\d)([A-Za-z])/,"$1 $2"),t=t.replace(/ {2,}/g," "),t};var La=(e,t)=>{let[,n]=t;return!!k.above(e,{at:n,match:r=>Pe.isElement(r)&&["code-block","code-line","code-inline","link"].includes(r.type)})},kr=e=>{let{normalizeNode:t}=e;return e.normalizeNode=n=>{let[a,r]=n;if(On.isText(a)){if(La(e,n))return t(n);let o=a.text,i=Er(o);if(i!==o){v.setNodes(e,{text:i},{at:r});return}}t(n)},e};var vr=e=>{let{isInline:t,isVoid:n}=e;return e.isInline=a=>a.type==="mention"?!0:t(a),e.isVoid=a=>a.type==="mention"?!0:n(a),e};var Fa=new Set(["heading-one","heading-two","heading-three","heading-four","heading-five","heading-six","quote","thematic-break"]),Ia=e=>T(e)&&e.type==="list",wr=e=>T(e)&&e.type==="list-item",xr=e=>{let{normalizeNode:t}=e;return e.normalizeNode=([n,a])=>{if(Ia(n)){for(let[r,o]of se.children(e,a))if(!wr(r)){v.wrapNodes(e,{type:"list-item",children:[]},{at:o});return}}if(wr(n)){for(let[r,o]of se.children(e,a))if(T(r)&&Fa.has(r.type)){v.setNodes(e,{type:"paragraph"},{at:o});return}}t([n,a])},e};var Sr=()=>{let e=Zn(Pn()),t=pr(e),n=br(t),a=gr(n),r=xr(a),o=hr(r),i=kr(o),d=yr(i),g=vr(d),{isInline:u}=g;return g.isInline=f=>f.type==="code-inline"?!0:u(f),g};var St=A(ne(),1);var Le=globalThis;if(typeof Le.document<"u"&&typeof Le.Element>"u"){class e{}e.prototype.matches=()=>!1,Le.Element=e}typeof Le.document<"u"&&typeof Le.HTMLElement>"u"&&typeof Le.Element<"u"&&(Le.HTMLElement=Le.Element);var Tr=A(Rr(),1),Ar=Tr.default;Prism.languages.javascript=Prism.languages.extend("clike",{"class-name":[Prism.languages.clike["class-name"],{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,lookbehind:!0}],keyword:[{pattern:/((?:^|\})\s*)catch\b/,lookbehind:!0},{pattern:/(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,lookbehind:!0}],function:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,number:{pattern:RegExp(/(^|[^\w$])/.source+"(?:"+(/NaN|Infinity/.source+"|"+/0[bB][01]+(?:_[01]+)*n?/.source+"|"+/0[oO][0-7]+(?:_[0-7]+)*n?/.source+"|"+/0[xX][\dA-Fa-f]+(?:_[\dA-Fa-f]+)*n?/.source+"|"+/\d+(?:_\d+)*n/.source+"|"+/(?:\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[Ee][+-]?\d+(?:_\d+)*)?/.source)+")"+/(?![\w$])/.source),lookbehind:!0},operator:/--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/});Prism.languages.javascript["class-name"][0].pattern=/(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/;Prism.languages.insertBefore("javascript","keyword",{regex:{pattern:RegExp(/((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)/.source+/\//.source+"(?:"+/(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}/.source+"|"+/(?:\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.)*\])*\])*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}v[dgimyus]{0,7}/.source+")"+/(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/.source),lookbehind:!0,greedy:!0,inside:{"regex-source":{pattern:/^(\/)[\s\S]+(?=\/[a-z]*$)/,lookbehind:!0,alias:"language-regex",inside:Prism.languages.regex},"regex-delimiter":/^\/|\/$/,"regex-flags":/^[a-z]+$/}},"function-variable":{pattern:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,alias:"function"},parameter:[{pattern:/(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,lookbehind:!0,inside:Prism.languages.javascript},{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,lookbehind:!0,inside:Prism.languages.javascript},{pattern:/(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,lookbehind:!0,inside:Prism.languages.javascript},{pattern:/((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,lookbehind:!0,inside:Prism.languages.javascript}],constant:/\b[A-Z](?:[A-Z_]|\dx?)*\b/});Prism.languages.insertBefore("javascript","string",{hashbang:{pattern:/^#!.*/,greedy:!0,alias:"comment"},"template-string":{pattern:/`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,greedy:!0,inside:{"template-punctuation":{pattern:/^`|`$/,alias:"string"},interpolation:{pattern:/((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,lookbehind:!0,inside:{"interpolation-punctuation":{pattern:/^\$\{|\}$/,alias:"punctuation"},rest:Prism.languages.javascript}},string:/[\s\S]+/}},"string-property":{pattern:/((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,lookbehind:!0,greedy:!0,alias:"property"}});Prism.languages.insertBefore("javascript","operator",{"literal-property":{pattern:/((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,lookbehind:!0,alias:"property"}});Prism.languages.markup&&(Prism.languages.markup.tag.addInlined("script","javascript"),Prism.languages.markup.tag.addAttribute(/on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source,"javascript"));Prism.languages.js=Prism.languages.javascript;(function(e){var t=e.util.clone(e.languages.javascript),n=/(?:\s|\/\/.*(?!.)|\/\*(?:[^*]|\*(?!\/))\*\/)/.source,a=/(?:\{(?:\{(?:\{[^{}]*\}|[^{}])*\}|[^{}])*\})/.source,r=/(?:\{<S>*\.{3}(?:[^{}]|<BRACES>)*\})/.source;function o(l,g){return l=l.replace(/<S>/g,function(){return n}).replace(/<BRACES>/g,function(){return a}).replace(/<SPREAD>/g,function(){return r}),RegExp(l,g)}r=o(r).source,e.languages.jsx=e.languages.extend("markup",t),e.languages.jsx.tag.pattern=o(/<\/?(?:[\w.:-]+(?:<S>+(?:[\w.:$-]+(?:=(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s{'"/>=]+|<BRACES>))?|<SPREAD>))*<S>*\/?)?>/.source),e.languages.jsx.tag.inside.tag.pattern=/^<\/?[^\s>\/]*/,e.languages.jsx.tag.inside["attr-value"].pattern=/=(?!\{)(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s'">]+)/,e.languages.jsx.tag.inside.tag.inside["class-name"]=/^[A-Z]\w*(?:\.[A-Z]\w*)*$/,e.languages.jsx.tag.inside.comment=t.comment,e.languages.insertBefore("inside","attr-name",{spread:{pattern:o(/<SPREAD>/.source),inside:e.languages.jsx}},e.languages.jsx.tag),e.languages.insertBefore("inside","special-attr",{script:{pattern:o(/=<BRACES>/.source),alias:"language-javascript",inside:{"script-punctuation":{pattern:/^=(?=\{)/,alias:"punctuation"},rest:e.languages.jsx}}},e.languages.jsx.tag);var i=function(l){return l?typeof l=="string"?l:typeof l.content=="string"?l.content:l.content.map(i).join(""):""},d=function(l){for(var g=[],u=0;u<l.length;u++){var f=l[u],y=!1;if(typeof f!="string"&&(f.type==="tag"&&f.content[0]&&f.content[0].type==="tag"?f.content[0].content[0].content==="</"?g.length>0&&g[g.length-1].tagName===i(f.content[0].content[1])&&g.pop():f.content[f.content.length-1].content==="/>"||g.push({tagName:i(f.content[0].content[1]),openedBraces:0}):g.length>0&&f.type==="punctuation"&&f.content==="{"?g[g.length-1].openedBraces++:g.length>0&&g[g.length-1].openedBraces>0&&f.type==="punctuation"&&f.content==="}"?g[g.length-1].openedBraces--:y=!0),(y||typeof f=="string")&&g.length>0&&g[g.length-1].openedBraces===0){var b=i(f);u<l.length-1&&(typeof l[u+1]=="string"||l[u+1].type==="plain-text")&&(b+=i(l[u+1]),l.splice(u+1,1)),u>0&&(typeof l[u-1]=="string"||l[u-1].type==="plain-text")&&(b=i(l[u-1])+b,l.splice(u-1,1),u--),l[u]=new e.Token("plain-text",b,null,b)}f.content&&typeof f.content!="string"&&d(f.content)}};e.hooks.add("after-tokenize",function(l){l.language!=="jsx"&&l.language!=="tsx"||d(l.tokens)})})(Prism);(function(e){e.languages.typescript=e.languages.extend("javascript",{"class-name":{pattern:/(\b(?:class|extends|implements|instanceof|interface|new|type)\s+)(?!keyof\b)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?:\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>)?/,lookbehind:!0,greedy:!0,inside:null},builtin:/\b(?:Array|Function|Promise|any|boolean|console|never|number|string|symbol|unknown)\b/}),e.languages.typescript.keyword.push(/\b(?:abstract|declare|is|keyof|readonly|require)\b/,/\b(?:asserts|infer|interface|module|namespace|type)\b(?=\s*(?:[{_$a-zA-Z\xA0-\uFFFF]|$))/,/\btype\b(?=\s*(?:[\{*]|$))/),delete e.languages.typescript.parameter,delete e.languages.typescript["literal-property"];var t=e.languages.extend("typescript",{});delete t["class-name"],e.languages.typescript["class-name"].inside=t,e.languages.insertBefore("typescript","function",{decorator:{pattern:/@[$\w\xA0-\uFFFF]+/,inside:{at:{pattern:/^@/,alias:"operator"},function:/^[\s\S]+/}},"generic-function":{pattern:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>(?=\s*\()/,greedy:!0,inside:{function:/^#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*/,generic:{pattern:/<[\s\S]+/,alias:"class-name",inside:t}}}}),e.languages.ts=e.languages.typescript})(Prism);(function(e){var t=e.util.clone(e.languages.typescript);e.languages.tsx=e.languages.extend("jsx",t),delete e.languages.tsx.parameter,delete e.languages.tsx["literal-property"];var n=e.languages.tsx.tag;n.pattern=RegExp(/(^|[^\w$]|(?=<\/))/.source+"(?:"+n.pattern.source+")",n.pattern.flags),n.lookbehind=!0})(Prism);Prism.languages.json={property:{pattern:/(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?=\s*:)/,lookbehind:!0,greedy:!0},string:{pattern:/(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,lookbehind:!0,greedy:!0},comment:{pattern:/\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/,greedy:!0},number:/-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/i,punctuation:/[{}[\],]/,operator:/:/,boolean:/\b(?:false|true)\b/,null:{pattern:/\bnull\b/,alias:"keyword"}};Prism.languages.webmanifest=Prism.languages.json;(function(e){var t=/[*&][^\s[\]{},]+/,n=/!(?:<[\w\-%#;/?:@&=+$,.!~*'()[\]]+>|(?:[a-zA-Z\d-]*!)?[\w\-%#;/?:@&=+$.~*'()]+)?/,a="(?:"+n.source+"(?:[ 	]+"+t.source+")?|"+t.source+"(?:[ 	]+"+n.source+")?)",r=/(?:[^\s\x00-\x08\x0e-\x1f!"#%&'*,\-:>?@[\]`{|}\x7f-\x84\x86-\x9f\ud800-\udfff\ufffe\uffff]|[?:-]<PLAIN>)(?:[ \t]*(?:(?![#:])<PLAIN>|:<PLAIN>))*/.source.replace(/<PLAIN>/g,function(){return/[^\s\x00-\x08\x0e-\x1f,[\]{}\x7f-\x84\x86-\x9f\ud800-\udfff\ufffe\uffff]/.source}),o=/"(?:[^"\\\r\n]|\\.)*"|'(?:[^'\\\r\n]|\\.)*'/.source;function i(d,l){l=(l||"").replace(/m/g,"")+"m";var g=/([:\-,[{]\s*(?:\s<<prop>>[ \t]+)?)(?:<<value>>)(?=[ \t]*(?:$|,|\]|\}|(?:[\r\n]\s*)?#))/.source.replace(/<<prop>>/g,function(){return a}).replace(/<<value>>/g,function(){return d});return RegExp(g,l)}e.languages.yaml={scalar:{pattern:RegExp(/([\-:]\s*(?:\s<<prop>>[ \t]+)?[|>])[ \t]*(?:((?:\r?\n|\r)[ \t]+)\S[^\r\n]*(?:\2[^\r\n]+)*)/.source.replace(/<<prop>>/g,function(){return a})),lookbehind:!0,alias:"string"},comment:/#.*/,key:{pattern:RegExp(/((?:^|[:\-,[{\r\n?])[ \t]*(?:<<prop>>[ \t]+)?)<<key>>(?=\s*:\s)/.source.replace(/<<prop>>/g,function(){return a}).replace(/<<key>>/g,function(){return"(?:"+r+"|"+o+")"})),lookbehind:!0,greedy:!0,alias:"atrule"},directive:{pattern:/(^[ \t]*)%.+/m,lookbehind:!0,alias:"important"},datetime:{pattern:i(/\d{4}-\d\d?-\d\d?(?:[tT]|[ \t]+)\d\d?:\d{2}:\d{2}(?:\.\d*)?(?:[ \t]*(?:Z|[-+]\d\d?(?::\d{2})?))?|\d{4}-\d{2}-\d{2}|\d\d?:\d{2}(?::\d{2}(?:\.\d*)?)?/.source),lookbehind:!0,alias:"number"},boolean:{pattern:i(/false|true/.source,"i"),lookbehind:!0,alias:"important"},null:{pattern:i(/null|~/.source,"i"),lookbehind:!0,alias:"important"},string:{pattern:i(o),lookbehind:!0,greedy:!0},number:{pattern:i(/[+-]?(?:0x[\da-f]+|0o[0-7]+|(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|\.inf|\.nan)/.source,"i"),lookbehind:!0},tag:n,important:t,punctuation:/---|[:[\]{}\-,|>?]|\.\.\./},e.languages.yml=e.languages.yaml})(Prism);Prism.languages.python={comment:{pattern:/(^|[^\\])#.*/,lookbehind:!0,greedy:!0},"string-interpolation":{pattern:/(?:f|fr|rf)(?:("""|''')[\s\S]*?\1|("|')(?:\\.|(?!\2)[^\\\r\n])*\2)/i,greedy:!0,inside:{interpolation:{pattern:/((?:^|[^{])(?:\{\{)*)\{(?!\{)(?:[^{}]|\{(?!\{)(?:[^{}]|\{(?!\{)(?:[^{}])+\})+\})+\}/,lookbehind:!0,inside:{"format-spec":{pattern:/(:)[^:(){}]+(?=\}$)/,lookbehind:!0},"conversion-option":{pattern:/![sra](?=[:}]$)/,alias:"punctuation"},rest:null}},string:/[\s\S]+/}},"triple-quoted-string":{pattern:/(?:[rub]|br|rb)?("""|''')[\s\S]*?\1/i,greedy:!0,alias:"string"},string:{pattern:/(?:[rub]|br|rb)?("|')(?:\\.|(?!\1)[^\\\r\n])*\1/i,greedy:!0},function:{pattern:/((?:^|\s)def[ \t]+)[a-zA-Z_]\w*(?=\s*\()/g,lookbehind:!0},"class-name":{pattern:/(\bclass\s+)\w+/i,lookbehind:!0},decorator:{pattern:/(^[\t ]*)@\w+(?:\.\w+)*/m,lookbehind:!0,alias:["annotation","punctuation"],inside:{punctuation:/\./}},keyword:/\b(?:_(?=\s*:)|and|as|assert|async|await|break|case|class|continue|def|del|elif|else|except|exec|finally|for|from|global|if|import|in|is|lambda|match|nonlocal|not|or|pass|print|raise|return|try|while|with|yield)\b/,builtin:/\b(?:__import__|abs|all|any|apply|ascii|basestring|bin|bool|buffer|bytearray|bytes|callable|chr|classmethod|cmp|coerce|compile|complex|delattr|dict|dir|divmod|enumerate|eval|execfile|file|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|intern|isinstance|issubclass|iter|len|list|locals|long|map|max|memoryview|min|next|object|oct|open|ord|pow|property|range|raw_input|reduce|reload|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|unichr|unicode|vars|xrange|zip)\b/,boolean:/\b(?:False|None|True)\b/,number:/\b0(?:b(?:_?[01])+|o(?:_?[0-7])+|x(?:_?[a-f0-9])+)\b|(?:\b\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\B\.\d+(?:_\d+)*)(?:e[+-]?\d+(?:_\d+)*)?j?(?!\w)/i,operator:/[-+%=]=?|!=|:=|\*\*?=?|\/\/?=?|<[<=>]?|>[=>]?|[&|^~]/,punctuation:/[{}[\];(),.:]/};Prism.languages.python["string-interpolation"].inside.interpolation.inside.rest=Prism.languages.python;Prism.languages.py=Prism.languages.python;(function(e){function t(n,a){return"___"+n.toUpperCase()+a+"___"}Object.defineProperties(e.languages["markup-templating"]={},{buildPlaceholders:{value:function(n,a,r,o){if(n.language===a){var i=n.tokenStack=[];n.code=n.code.replace(r,function(d){if(typeof o=="function"&&!o(d))return d;for(var l=i.length,g;n.code.indexOf(g=t(a,l))!==-1;)++l;return i[l]=d,g}),n.grammar=e.languages.markup}}},tokenizePlaceholders:{value:function(n,a){if(n.language!==a||!n.tokenStack)return;n.grammar=e.languages[a];var r=0,o=Object.keys(n.tokenStack);function i(d){for(var l=0;l<d.length&&!(r>=o.length);l++){var g=d[l];if(typeof g=="string"||g.content&&typeof g.content=="string"){var u=o[r],f=n.tokenStack[u],y=typeof g=="string"?g:g.content,b=t(a,u),R=y.indexOf(b);if(R>-1){++r;var c=y.substring(0,R),s=new e.Token(a,e.tokenize(f,n.grammar),"language-"+a,f),p=y.substring(R+b.length),m=[];c&&m.push.apply(m,i([c])),m.push(s),p&&m.push.apply(m,i([p])),typeof g=="string"?d.splice.apply(d,[l,1].concat(m)):g.content=m}}else g.content&&i(g.content)}return d}i(n.tokens)}}})})(Prism);(function(e){var t=/\/\*[\s\S]*?\*\/|\/\/.*|#(?!\[).*/,n=[{pattern:/\b(?:false|true)\b/i,alias:"boolean"},{pattern:/(::\s*)\b[a-z_]\w*\b(?!\s*\()/i,greedy:!0,lookbehind:!0},{pattern:/(\b(?:case|const)\s+)\b[a-z_]\w*(?=\s*[;=])/i,greedy:!0,lookbehind:!0},/\b(?:null)\b/i,/\b[A-Z_][A-Z0-9_]*\b(?!\s*\()/],a=/\b0b[01]+(?:_[01]+)*\b|\b0o[0-7]+(?:_[0-7]+)*\b|\b0x[\da-f]+(?:_[\da-f]+)*\b|(?:\b\d+(?:_\d+)*\.?(?:\d+(?:_\d+)*)?|\B\.\d+)(?:e[+-]?\d+)?/i,r=/<?=>|\?\?=?|\.{3}|\??->|[!=]=?=?|::|\*\*=?|--|\+\+|&&|\|\||<<|>>|[?~]|[/^|%*&<>.+-]=?/,o=/[{}\[\](),:;]/;e.languages.php={delimiter:{pattern:/\?>$|^<\?(?:php(?=\s)|=)?/i,alias:"important"},comment:t,variable:/\$+(?:\w+\b|(?=\{))/,package:{pattern:/(namespace\s+|use\s+(?:function\s+)?)(?:\\?\b[a-z_]\w*)+\b(?!\\)/i,lookbehind:!0,inside:{punctuation:/\\/}},"class-name-definition":{pattern:/(\b(?:class|enum|interface|trait)\s+)\b[a-z_]\w*(?!\\)\b/i,lookbehind:!0,alias:"class-name"},"function-definition":{pattern:/(\bfunction\s+)[a-z_]\w*(?=\s*\()/i,lookbehind:!0,alias:"function"},keyword:[{pattern:/(\(\s*)\b(?:array|bool|boolean|float|int|integer|object|string)\b(?=\s*\))/i,alias:"type-casting",greedy:!0,lookbehind:!0},{pattern:/([(,?]\s*)\b(?:array(?!\s*\()|bool|callable|(?:false|null)(?=\s*\|)|float|int|iterable|mixed|object|self|static|string)\b(?=\s*\$)/i,alias:"type-hint",greedy:!0,lookbehind:!0},{pattern:/(\)\s*:\s*(?:\?\s*)?)\b(?:array(?!\s*\()|bool|callable|(?:false|null)(?=\s*\|)|float|int|iterable|mixed|never|object|self|static|string|void)\b/i,alias:"return-type",greedy:!0,lookbehind:!0},{pattern:/\b(?:array(?!\s*\()|bool|float|int|iterable|mixed|object|string|void)\b/i,alias:"type-declaration",greedy:!0},{pattern:/(\|\s*)(?:false|null)\b|\b(?:false|null)(?=\s*\|)/i,alias:"type-declaration",greedy:!0,lookbehind:!0},{pattern:/\b(?:parent|self|static)(?=\s*::)/i,alias:"static-context",greedy:!0},{pattern:/(\byield\s+)from\b/i,lookbehind:!0},/\bclass\b/i,{pattern:/((?:^|[^\s>:]|(?:^|[^-])>|(?:^|[^:]):)\s*)\b(?:abstract|and|array|as|break|callable|case|catch|clone|const|continue|declare|default|die|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|enum|eval|exit|extends|final|finally|fn|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|match|namespace|never|new|or|parent|print|private|protected|public|readonly|require|require_once|return|self|static|switch|throw|trait|try|unset|use|var|while|xor|yield|__halt_compiler)\b/i,lookbehind:!0}],"argument-name":{pattern:/([(,]\s*)\b[a-z_]\w*(?=\s*:(?!:))/i,lookbehind:!0},"class-name":[{pattern:/(\b(?:extends|implements|instanceof|new(?!\s+self|\s+static))\s+|\bcatch\s*\()\b[a-z_]\w*(?!\\)\b/i,greedy:!0,lookbehind:!0},{pattern:/(\|\s*)\b[a-z_]\w*(?!\\)\b/i,greedy:!0,lookbehind:!0},{pattern:/\b[a-z_]\w*(?!\\)\b(?=\s*\|)/i,greedy:!0},{pattern:/(\|\s*)(?:\\?\b[a-z_]\w*)+\b/i,alias:"class-name-fully-qualified",greedy:!0,lookbehind:!0,inside:{punctuation:/\\/}},{pattern:/(?:\\?\b[a-z_]\w*)+\b(?=\s*\|)/i,alias:"class-name-fully-qualified",greedy:!0,inside:{punctuation:/\\/}},{pattern:/(\b(?:extends|implements|instanceof|new(?!\s+self\b|\s+static\b))\s+|\bcatch\s*\()(?:\\?\b[a-z_]\w*)+\b(?!\\)/i,alias:"class-name-fully-qualified",greedy:!0,lookbehind:!0,inside:{punctuation:/\\/}},{pattern:/\b[a-z_]\w*(?=\s*\$)/i,alias:"type-declaration",greedy:!0},{pattern:/(?:\\?\b[a-z_]\w*)+(?=\s*\$)/i,alias:["class-name-fully-qualified","type-declaration"],greedy:!0,inside:{punctuation:/\\/}},{pattern:/\b[a-z_]\w*(?=\s*::)/i,alias:"static-context",greedy:!0},{pattern:/(?:\\?\b[a-z_]\w*)+(?=\s*::)/i,alias:["class-name-fully-qualified","static-context"],greedy:!0,inside:{punctuation:/\\/}},{pattern:/([(,?]\s*)[a-z_]\w*(?=\s*\$)/i,alias:"type-hint",greedy:!0,lookbehind:!0},{pattern:/([(,?]\s*)(?:\\?\b[a-z_]\w*)+(?=\s*\$)/i,alias:["class-name-fully-qualified","type-hint"],greedy:!0,lookbehind:!0,inside:{punctuation:/\\/}},{pattern:/(\)\s*:\s*(?:\?\s*)?)\b[a-z_]\w*(?!\\)\b/i,alias:"return-type",greedy:!0,lookbehind:!0},{pattern:/(\)\s*:\s*(?:\?\s*)?)(?:\\?\b[a-z_]\w*)+\b(?!\\)/i,alias:["class-name-fully-qualified","return-type"],greedy:!0,lookbehind:!0,inside:{punctuation:/\\/}}],constant:n,function:{pattern:/(^|[^\\\w])\\?[a-z_](?:[\w\\]*\w)?(?=\s*\()/i,lookbehind:!0,inside:{punctuation:/\\/}},property:{pattern:/(->\s*)\w+/,lookbehind:!0},number:a,operator:r,punctuation:o};var i={pattern:/\{\$(?:\{(?:\{[^{}]+\}|[^{}]+)\}|[^{}])+\}|(^|[^\\{])\$+(?:\w+(?:\[[^\r\n\[\]]+\]|->\w+)?)/,lookbehind:!0,inside:e.languages.php},d=[{pattern:/<<<'([^']+)'[\r\n](?:.*[\r\n])*?\1;/,alias:"nowdoc-string",greedy:!0,inside:{delimiter:{pattern:/^<<<'[^']+'|[a-z_]\w*;$/i,alias:"symbol",inside:{punctuation:/^<<<'?|[';]$/}}}},{pattern:/<<<(?:"([^"]+)"[\r\n](?:.*[\r\n])*?\1;|([a-z_]\w*)[\r\n](?:.*[\r\n])*?\2;)/i,alias:"heredoc-string",greedy:!0,inside:{delimiter:{pattern:/^<<<(?:"[^"]+"|[a-z_]\w*)|[a-z_]\w*;$/i,alias:"symbol",inside:{punctuation:/^<<<"?|[";]$/}},interpolation:i}},{pattern:/`(?:\\[\s\S]|[^\\`])*`/,alias:"backtick-quoted-string",greedy:!0},{pattern:/'(?:\\[\s\S]|[^\\'])*'/,alias:"single-quoted-string",greedy:!0},{pattern:/"(?:\\[\s\S]|[^\\"])*"/,alias:"double-quoted-string",greedy:!0,inside:{interpolation:i}}];e.languages.insertBefore("php","variable",{string:d,attribute:{pattern:/#\[(?:[^"'\/#]|\/(?![*/])|\/\/.*$|#(?!\[).*$|\/\*(?:[^*]|\*(?!\/))*\*\/|"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*')+\](?=\s*[a-z$#])/im,greedy:!0,inside:{"attribute-content":{pattern:/^(#\[)[\s\S]+(?=\]$)/,lookbehind:!0,inside:{comment:t,string:d,"attribute-class-name":[{pattern:/([^:]|^)\b[a-z_]\w*(?!\\)\b/i,alias:"class-name",greedy:!0,lookbehind:!0},{pattern:/([^:]|^)(?:\\?\b[a-z_]\w*)+/i,alias:["class-name","class-name-fully-qualified"],greedy:!0,lookbehind:!0,inside:{punctuation:/\\/}}],constant:n,number:a,operator:r,punctuation:o}},delimiter:{pattern:/^#\[|\]$/,alias:"punctuation"}}}}),e.hooks.add("before-tokenize",function(l){if(/<\?/.test(l.code)){var g=/<\?(?:[^"'/#]|\/(?![*/])|("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|(?:\/\/|#(?!\[))(?:[^?\n\r]|\?(?!>))*(?=$|\?>|[\r\n])|#\[|\/\*(?:[^*]|\*(?!\/))*(?:\*\/|$))*?(?:\?>|$)/g;e.languages["markup-templating"].buildPlaceholders(l,"php",g)}}),e.hooks.add("after-tokenize",function(l){e.languages["markup-templating"].tokenizePlaceholders(l,"php")})})(Prism);Prism.languages.sql={comment:{pattern:/(^|[^\\])(?:\/\*[\s\S]*?\*\/|(?:--|\/\/|#).*)/,lookbehind:!0},variable:[{pattern:/@(["'`])(?:\\[\s\S]|(?!\1)[^\\])+\1/,greedy:!0},/@[\w.$]+/],string:{pattern:/(^|[^@\\])("|')(?:\\[\s\S]|(?!\2)[^\\]|\2\2)*\2/,greedy:!0,lookbehind:!0},identifier:{pattern:/(^|[^@\\])`(?:\\[\s\S]|[^`\\]|``)*`/,greedy:!0,lookbehind:!0,inside:{punctuation:/^`|`$/}},function:/\b(?:AVG|COUNT|FIRST|FORMAT|LAST|LCASE|LEN|MAX|MID|MIN|MOD|NOW|ROUND|SUM|UCASE)(?=\s*\()/i,keyword:/\b(?:ACTION|ADD|AFTER|ALGORITHM|ALL|ALTER|ANALYZE|ANY|APPLY|AS|ASC|AUTHORIZATION|AUTO_INCREMENT|BACKUP|BDB|BEGIN|BERKELEYDB|BIGINT|BINARY|BIT|BLOB|BOOL|BOOLEAN|BREAK|BROWSE|BTREE|BULK|BY|CALL|CASCADED?|CASE|CHAIN|CHAR(?:ACTER|SET)?|CHECK(?:POINT)?|CLOSE|CLUSTERED|COALESCE|COLLATE|COLUMNS?|COMMENT|COMMIT(?:TED)?|COMPUTE|CONNECT|CONSISTENT|CONSTRAINT|CONTAINS(?:TABLE)?|CONTINUE|CONVERT|CREATE|CROSS|CURRENT(?:_DATE|_TIME|_TIMESTAMP|_USER)?|CURSOR|CYCLE|DATA(?:BASES?)?|DATE(?:TIME)?|DAY|DBCC|DEALLOCATE|DEC|DECIMAL|DECLARE|DEFAULT|DEFINER|DELAYED|DELETE|DELIMITERS?|DENY|DESC|DESCRIBE|DETERMINISTIC|DISABLE|DISCARD|DISK|DISTINCT|DISTINCTROW|DISTRIBUTED|DO|DOUBLE|DROP|DUMMY|DUMP(?:FILE)?|DUPLICATE|ELSE(?:IF)?|ENABLE|ENCLOSED|END|ENGINE|ENUM|ERRLVL|ERRORS|ESCAPED?|EXCEPT|EXEC(?:UTE)?|EXISTS|EXIT|EXPLAIN|EXTENDED|FETCH|FIELDS|FILE|FILLFACTOR|FIRST|FIXED|FLOAT|FOLLOWING|FOR(?: EACH ROW)?|FORCE|FOREIGN|FREETEXT(?:TABLE)?|FROM|FULL|FUNCTION|GEOMETRY(?:COLLECTION)?|GLOBAL|GOTO|GRANT|GROUP|HANDLER|HASH|HAVING|HOLDLOCK|HOUR|IDENTITY(?:COL|_INSERT)?|IF|IGNORE|IMPORT|INDEX|INFILE|INNER|INNODB|INOUT|INSERT|INT|INTEGER|INTERSECT|INTERVAL|INTO|INVOKER|ISOLATION|ITERATE|JOIN|KEYS?|KILL|LANGUAGE|LAST|LEAVE|LEFT|LEVEL|LIMIT|LINENO|LINES|LINESTRING|LOAD|LOCAL|LOCK|LONG(?:BLOB|TEXT)|LOOP|MATCH(?:ED)?|MEDIUM(?:BLOB|INT|TEXT)|MERGE|MIDDLEINT|MINUTE|MODE|MODIFIES|MODIFY|MONTH|MULTI(?:LINESTRING|POINT|POLYGON)|NATIONAL|NATURAL|NCHAR|NEXT|NO|NONCLUSTERED|NULLIF|NUMERIC|OFF?|OFFSETS?|ON|OPEN(?:DATASOURCE|QUERY|ROWSET)?|OPTIMIZE|OPTION(?:ALLY)?|ORDER|OUT(?:ER|FILE)?|OVER|PARTIAL|PARTITION|PERCENT|PIVOT|PLAN|POINT|POLYGON|PRECEDING|PRECISION|PREPARE|PREV|PRIMARY|PRINT|PRIVILEGES|PROC(?:EDURE)?|PUBLIC|PURGE|QUICK|RAISERROR|READS?|REAL|RECONFIGURE|REFERENCES|RELEASE|RENAME|REPEAT(?:ABLE)?|REPLACE|REPLICATION|REQUIRE|RESIGNAL|RESTORE|RESTRICT|RETURN(?:ING|S)?|REVOKE|RIGHT|ROLLBACK|ROUTINE|ROW(?:COUNT|GUIDCOL|S)?|RTREE|RULE|SAVE(?:POINT)?|SCHEMA|SECOND|SELECT|SERIAL(?:IZABLE)?|SESSION(?:_USER)?|SET(?:USER)?|SHARE|SHOW|SHUTDOWN|SIMPLE|SMALLINT|SNAPSHOT|SOME|SONAME|SQL|START(?:ING)?|STATISTICS|STATUS|STRIPED|SYSTEM_USER|TABLES?|TABLESPACE|TEMP(?:ORARY|TABLE)?|TERMINATED|TEXT(?:SIZE)?|THEN|TIME(?:STAMP)?|TINY(?:BLOB|INT|TEXT)|TOP?|TRAN(?:SACTIONS?)?|TRIGGER|TRUNCATE|TSEQUAL|TYPES?|UNBOUNDED|UNCOMMITTED|UNDEFINED|UNION|UNIQUE|UNLOCK|UNPIVOT|UNSIGNED|UPDATE(?:TEXT)?|USAGE|USE|USER|USING|VALUES?|VAR(?:BINARY|CHAR|CHARACTER|YING)|VIEW|WAITFOR|WARNINGS|WHEN|WHERE|WHILE|WITH(?: ROLLUP|IN)?|WORK|WRITE(?:TEXT)?|YEAR)\b/i,boolean:/\b(?:FALSE|NULL|TRUE)\b/i,number:/\b0x[\da-f]+\b|\b\d+(?:\.\d*)?|\B\.\d+\b/i,operator:/[-+*\/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?|\b(?:AND|BETWEEN|DIV|ILIKE|IN|IS|LIKE|NOT|OR|REGEXP|RLIKE|SOUNDS LIKE|XOR)\b/i,punctuation:/[;[\]()`,.]/};(function(e){var t=/\b(?:abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|exports|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|module|native|new|non-sealed|null|open|opens|package|permits|private|protected|provides|public|record(?!\s*[(){}[\]<>=%~.:,;?+\-*/&|^])|requires|return|sealed|short|static|strictfp|super|switch|synchronized|this|throw|throws|to|transient|transitive|try|uses|var|void|volatile|while|with|yield)\b/,n=/(?:[a-z]\w*\s*\.\s*)*(?:[A-Z]\w*\s*\.\s*)*/.source,a={pattern:RegExp(/(^|[^\w.])/.source+n+/[A-Z](?:[\d_A-Z]*[a-z]\w*)?\b/.source),lookbehind:!0,inside:{namespace:{pattern:/^[a-z]\w*(?:\s*\.\s*[a-z]\w*)*(?:\s*\.)?/,inside:{punctuation:/\./}},punctuation:/\./}};e.languages.java=e.languages.extend("clike",{string:{pattern:/(^|[^\\])"(?:\\.|[^"\\\r\n])*"/,lookbehind:!0,greedy:!0},"class-name":[a,{pattern:RegExp(/(^|[^\w.])/.source+n+/[A-Z]\w*(?=\s+\w+\s*[;,=()]|\s*(?:\[[\s,]*\]\s*)?::\s*new\b)/.source),lookbehind:!0,inside:a.inside},{pattern:RegExp(/(\b(?:class|enum|extends|implements|instanceof|interface|new|record|throws)\s+)/.source+n+/[A-Z]\w*\b/.source),lookbehind:!0,inside:a.inside}],keyword:t,function:[e.languages.clike.function,{pattern:/(::\s*)[a-z_]\w*/,lookbehind:!0}],number:/\b0b[01][01_]*L?\b|\b0x(?:\.[\da-f_p+-]+|[\da-f_]+(?:\.[\da-f_p+-]+)?)\b|(?:\b\d[\d_]*(?:\.[\d_]*)?|\B\.\d[\d_]*)(?:e[+-]?\d[\d_]*)?[dfl]?/i,operator:{pattern:/(^|[^.])(?:<<=?|>>>?=?|->|--|\+\+|&&|\|\||::|[?:~]|[-+*/%&|^!=<>]=?)/m,lookbehind:!0},constant:/\b[A-Z][A-Z_\d]+\b/}),e.languages.insertBefore("java","string",{"triple-quoted-string":{pattern:/"""[ \t]*[\r\n](?:(?:"|"")?(?:\\.|[^"\\]))*"""/,greedy:!0,alias:"string"},char:{pattern:/'(?:\\.|[^'\\\r\n]){1,6}'/,greedy:!0}}),e.languages.insertBefore("java","class-name",{annotation:{pattern:/(^|[^.])@\w+(?:\s*\.\s*\w+)*/,lookbehind:!0,alias:"punctuation"},generics:{pattern:/<(?:[\w\s,.?]|&(?!&)|<(?:[\w\s,.?]|&(?!&)|<(?:[\w\s,.?]|&(?!&)|<(?:[\w\s,.?]|&(?!&))*>)*>)*>)*>/,inside:{"class-name":a,keyword:t,punctuation:/[<>(),.:]/,operator:/[?&|]/}},import:[{pattern:RegExp(/(\bimport\s+)/.source+n+/(?:[A-Z]\w*|\*)(?=\s*;)/.source),lookbehind:!0,inside:{namespace:a.inside.namespace,punctuation:/\./,operator:/\*/,"class-name":/\w+/}},{pattern:RegExp(/(\bimport\s+static\s+)/.source+n+/(?:\w+|\*)(?=\s*;)/.source),lookbehind:!0,alias:"static",inside:{namespace:a.inside.namespace,static:/\b\w+$/,punctuation:/\./,operator:/\*/,"class-name":/\w+/}}],namespace:{pattern:RegExp(/(\b(?:exports|import(?:\s+static)?|module|open|opens|package|provides|requires|to|transitive|uses|with)\s+)(?!<keyword>)[a-z]\w*(?:\.[a-z]\w*)*\.?/.source.replace(/<keyword>/g,function(){return t.source})),lookbehind:!0,inside:{punctuation:/\./}}})})(Prism);(function(e){var t=/(?:\\.|[^\\\n\r]|(?:\n|\r\n?)(?![\r\n]))/.source;function n(u){return u=u.replace(/<inner>/g,function(){return t}),RegExp(/((?:^|[^\\])(?:\\{2})*)/.source+"(?:"+u+")")}var a=/(?:\\.|``(?:[^`\r\n]|`(?!`))+``|`[^`\r\n]+`|[^\\|\r\n`])+/.source,r=/\|?__(?:\|__)+\|?(?:(?:\n|\r\n?)|(?![\s\S]))/.source.replace(/__/g,function(){return a}),o=/\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?(?:\n|\r\n?)/.source;e.languages.markdown=e.languages.extend("markup",{}),e.languages.insertBefore("markdown","prolog",{"front-matter-block":{pattern:/(^(?:\s*[\r\n])?)---(?!.)[\s\S]*?[\r\n]---(?!.)/,lookbehind:!0,greedy:!0,inside:{punctuation:/^---|---$/,"front-matter":{pattern:/\S+(?:\s+\S+)*/,alias:["yaml","language-yaml"],inside:e.languages.yaml}}},blockquote:{pattern:/^>(?:[\t ]*>)*/m,alias:"punctuation"},table:{pattern:RegExp("^"+r+o+"(?:"+r+")*","m"),inside:{"table-data-rows":{pattern:RegExp("^("+r+o+")(?:"+r+")*$"),lookbehind:!0,inside:{"table-data":{pattern:RegExp(a),inside:e.languages.markdown},punctuation:/\|/}},"table-line":{pattern:RegExp("^("+r+")"+o+"$"),lookbehind:!0,inside:{punctuation:/\||:?-{3,}:?/}},"table-header-row":{pattern:RegExp("^"+r+"$"),inside:{"table-header":{pattern:RegExp(a),alias:"important",inside:e.languages.markdown},punctuation:/\|/}}}},code:[{pattern:/((?:^|\n)[ \t]*\n|(?:^|\r\n?)[ \t]*\r\n?)(?: {4}|\t).+(?:(?:\n|\r\n?)(?: {4}|\t).+)*/,lookbehind:!0,alias:"keyword"},{pattern:/^```[\s\S]*?^```$/m,greedy:!0,inside:{"code-block":{pattern:/^(```.*(?:\n|\r\n?))[\s\S]+?(?=(?:\n|\r\n?)^```$)/m,lookbehind:!0},"code-language":{pattern:/^(```).+/,lookbehind:!0},punctuation:/```/}}],title:[{pattern:/\S.*(?:\n|\r\n?)(?:==+|--+)(?=[ \t]*$)/m,alias:"important",inside:{punctuation:/==+$|--+$/}},{pattern:/(^\s*)#.+/m,lookbehind:!0,alias:"important",inside:{punctuation:/^#+|#+$/}}],hr:{pattern:/(^\s*)([*-])(?:[\t ]*\2){2,}(?=\s*$)/m,lookbehind:!0,alias:"punctuation"},list:{pattern:/(^\s*)(?:[*+-]|\d+\.)(?=[\t ].)/m,lookbehind:!0,alias:"punctuation"},"url-reference":{pattern:/!?\[[^\]]+\]:[\t ]+(?:\S+|<(?:\\.|[^>\\])+>)(?:[\t ]+(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\)))?/,inside:{variable:{pattern:/^(!?\[)[^\]]+/,lookbehind:!0},string:/(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\))$/,punctuation:/^[\[\]!:]|[<>]/},alias:"url"},bold:{pattern:n(/\b__(?:(?!_)<inner>|_(?:(?!_)<inner>)+_)+__\b|\*\*(?:(?!\*)<inner>|\*(?:(?!\*)<inner>)+\*)+\*\*/.source),lookbehind:!0,greedy:!0,inside:{content:{pattern:/(^..)[\s\S]+(?=..$)/,lookbehind:!0,inside:{}},punctuation:/\*\*|__/}},italic:{pattern:n(/\b_(?:(?!_)<inner>|__(?:(?!_)<inner>)+__)+_\b|\*(?:(?!\*)<inner>|\*\*(?:(?!\*)<inner>)+\*\*)+\*/.source),lookbehind:!0,greedy:!0,inside:{content:{pattern:/(^.)[\s\S]+(?=.$)/,lookbehind:!0,inside:{}},punctuation:/[*_]/}},strike:{pattern:n(/(~~?)(?:(?!~)<inner>)+\2/.source),lookbehind:!0,greedy:!0,inside:{content:{pattern:/(^~~?)[\s\S]+(?=\1$)/,lookbehind:!0,inside:{}},punctuation:/~~?/}},"code-snippet":{pattern:/(^|[^\\`])(?:``[^`\r\n]+(?:`[^`\r\n]+)*``(?!`)|`[^`\r\n]+`(?!`))/,lookbehind:!0,greedy:!0,alias:["code","keyword"]},url:{pattern:n(/!?\[(?:(?!\])<inner>)+\](?:\([^\s)]+(?:[\t ]+"(?:\\.|[^"\\])*")?\)|[ \t]?\[(?:(?!\])<inner>)+\])/.source),lookbehind:!0,greedy:!0,inside:{operator:/^!/,content:{pattern:/(^\[)[^\]]+(?=\])/,lookbehind:!0,inside:{}},variable:{pattern:/(^\][ \t]?\[)[^\]]+(?=\]$)/,lookbehind:!0},url:{pattern:/(^\]\()[^\s)]+/,lookbehind:!0},string:{pattern:/(^[ \t]+)"(?:\\.|[^"\\])*"(?=\)$)/,lookbehind:!0}}}}),["url","bold","italic","strike"].forEach(function(u){["url","bold","italic","strike","code-snippet"].forEach(function(f){u!==f&&(e.languages.markdown[u].inside.content.inside[f]=e.languages.markdown[f])})}),e.hooks.add("after-tokenize",function(u){if(u.language!=="markdown"&&u.language!=="md")return;function f(y){if(!(!y||typeof y=="string"))for(var b=0,R=y.length;b<R;b++){var c=y[b];if(c.type!=="code"){f(c.content);continue}var s=c.content[1],p=c.content[3];if(s&&p&&s.type==="code-language"&&p.type==="code-block"&&typeof s.content=="string"){var m=s.content.replace(/\b#/g,"sharp").replace(/\b\+\+/g,"pp");m=(/[a-z][\w-]*/i.exec(m)||[""])[0].toLowerCase();var h="language-"+m;p.alias?typeof p.alias=="string"?p.alias=[p.alias,h]:p.alias.push(h):p.alias=[h]}}}f(u.tokens)}),e.hooks.add("wrap",function(u){if(u.type==="code-block"){for(var f="",y=0,b=u.classes.length;y<b;y++){var R=u.classes[y],c=/language-(.+)/.exec(R);if(c){f=c[1];break}}var s=e.languages[f];if(s)u.content=e.highlight(g(u.content),s,f);else if(f&&f!=="none"&&e.plugins.autoloader){var p="md-"+new Date().valueOf()+"-"+Math.floor(Math.random()*1e16);u.attributes.id=p,e.plugins.autoloader.loadLanguages(f,function(){var m=document.getElementById(p);m&&(m.innerHTML=e.highlight(m.textContent,e.languages[f],f))})}}});var i=RegExp(e.languages.markup.tag.pattern.source,"gi"),d={amp:"&",lt:"<",gt:">",quot:'"'},l=String.fromCodePoint||String.fromCharCode;function g(u){var f=u.replace(i,"");return f=f.replace(/&(\w{1,8}|#x?[\da-f]{1,8});/gi,function(y,b){if(b=b.toLowerCase(),b[0]==="#"){var R;return b[1]==="x"?R=parseInt(b.slice(2),16):R=Number(b.slice(1)),l(R)}else{var c=d[b];return c||y}}),f}e.languages.md=e.languages.markdown})(Prism);(function(e){e.languages.diff={coord:[/^(?:\*{3}|-{3}|\+{3}).*$/m,/^@@.*@@$/m,/^\d.*$/m]};var t={"deleted-sign":"-","deleted-arrow":"<","inserted-sign":"+","inserted-arrow":">",unchanged:" ",diff:"!"};Object.keys(t).forEach(function(n){var a=t[n],r=[];/^\w+$/.test(n)||r.push(/\w+/.exec(n)[0]),n==="diff"&&r.push("bold"),e.languages.diff[n]={pattern:RegExp("^(?:["+a+`].*(?:\r
?|
|(?![\\s\\S])))+`,"m"),alias:r,inside:{line:{pattern:/(.)(?=[\s\S]).*(?:\r\n?|\n)?/,lookbehind:!0},prefix:{pattern:/[\s\S]/,alias:/\w+/.exec(n)[0]}}}}),Object.defineProperty(e.languages.diff,"PREFIXES",{value:t})})(Prism);Prism.languages.mermaid={comment:{pattern:/%%.*/,greedy:!0},style:{pattern:/^([ \t]*(?:classDef|linkStyle|style)[ \t]+[\w$-]+[ \t]+)\w.*[^\s;]/m,lookbehind:!0,inside:{property:/\b\w[\w-]*(?=[ \t]*:)/,operator:/:/,punctuation:/,/}},"inter-arrow-label":{pattern:/([^<>ox.=-])(?:-[-.]|==)(?![<>ox.=-])[ \t]*(?:"[^"\r\n]*"|[^\s".=-](?:[^\r\n.=-]*[^\s.=-])?)[ \t]*(?:\.+->?|--+[->]|==+[=>])(?![<>ox.=-])/,lookbehind:!0,greedy:!0,inside:{arrow:{pattern:/(?:\.+->?|--+[->]|==+[=>])$/,alias:"operator"},label:{pattern:/^([\s\S]{2}[ \t]*)\S(?:[\s\S]*\S)?/,lookbehind:!0,alias:"property"},"arrow-head":{pattern:/^\S+/,alias:["arrow","operator"]}}},arrow:[{pattern:/(^|[^{}|o.-])[|}][|o](?:--|\.\.)[|o][|{](?![{}|o.-])/,lookbehind:!0,alias:"operator"},{pattern:/(^|[^<>ox.=-])(?:[<ox](?:==+|--+|-\.*-)[>ox]?|(?:==+|--+|-\.*-)[>ox]|===+|---+|-\.+-)(?![<>ox.=-])/,lookbehind:!0,alias:"operator"},{pattern:/(^|[^<>()x-])(?:--?(?:>>|[x>)])(?![<>()x])|(?:<<|[x<(])--?(?!-))/,lookbehind:!0,alias:"operator"},{pattern:/(^|[^<>|*o.-])(?:[*o]--|--[*o]|<\|?(?:--|\.\.)|(?:--|\.\.)\|?>|--|\.\.)(?![<>|*o.-])/,lookbehind:!0,alias:"operator"}],label:{pattern:/(^|[^|<])\|(?:[^\r\n"|]|"[^"\r\n]*")+\|/,lookbehind:!0,greedy:!0,alias:"property"},text:{pattern:/(?:[(\[{]+|\b>)(?:[^\r\n"()\[\]{}]|"[^"\r\n]*")+(?:[)\]}]+|>)/,alias:"string"},string:{pattern:/"[^"\r\n]*"/,greedy:!0},annotation:{pattern:/<<(?:abstract|choice|enumeration|fork|interface|join|service)>>|\[\[(?:choice|fork|join)\]\]/i,alias:"important"},keyword:[{pattern:/(^[ \t]*)(?:action|callback|class|classDef|classDiagram|click|direction|erDiagram|flowchart|gantt|gitGraph|graph|journey|link|linkStyle|pie|requirementDiagram|sequenceDiagram|stateDiagram|stateDiagram-v2|style|subgraph)(?![\w$-])/m,lookbehind:!0,greedy:!0},{pattern:/(^[ \t]*)(?:activate|alt|and|as|autonumber|deactivate|else|end(?:[ \t]+note)?|loop|opt|par|participant|rect|state|note[ \t]+(?:over|(?:left|right)[ \t]+of))(?![\w$-])/im,lookbehind:!0,greedy:!0}],entity:/#[a-z0-9]+;/,operator:{pattern:/(\w[ \t]*)&(?=[ \t]*\w)|:::|:/,lookbehind:!0},punctuation:/[(){};]/};var Ma=/\r\n|\r|\n/,Cr=e=>{e.length===0?e.push({types:["plain"],content:`
`,empty:!0}):e.length===1&&e[0].content===""&&(e[0].content=`
`,e[0].empty=!0)},Lr=(e,t)=>{let n=e.length;return n>0&&e[n-1]===t?e:e.concat(t)},Fr=e=>{let t=[[]],n=[e],a=[0],r=[e.length],o=0,i=0,d=[],l=[d];for(;i>-1;){for(;(o=a[i]++)<r[i];){let g,u=t[i],y=n[i][o];if(typeof y=="string"?(u=i>0?u:["plain"],g=y):(u=Lr(u,y.type),y.alias&&(u=Lr(u,y.alias)),g=y.content),typeof g!="string"){i++,t.push(u),n.push(g),a.push(0),r.push(g.length);continue}let b=g.split(Ma),R=b.length;d.push({types:u,content:b[0]});for(let c=1;c<R;c++)Cr(d),l.push(d=[]),d.push({types:u,content:b[c]})}i--,t.pop(),n.pop(),a.pop(),r.pop()}return Cr(d),l};var Da=(...e)=>{let t=new Map;for(let n of e)for(let[a,r]of n)t.set(a,r);return t},Oa=([e,t],n)=>{let a=new Map;if(!T(e)||e.type!==ue||!Array.isArray(e.children)||e.preview==="true")return a;let r=e,o=r.children.filter(f=>T(f)&&f.type===ye);if(o.length===0)return a;let i=(r.language||"plain").toLowerCase(),d=n.languages[i]||n.languages.plain||{},l="";try{l=o.map(f=>se.string(f)).join(`
`)}catch(f){return console.error("\u4ECE\u4EE3\u7801\u884C\u63D0\u53D6\u6587\u672C\u65F6\u51FA\u9519:",f),a}let g;try{g=n.tokenize(l,d)}catch(f){return console.error(`Prism \u5728\u5904\u7406 ${i} \u65F6\u51FA\u9519:`,f),a}return Fr(g).forEach((f,y)=>{if(y>=o.length)return;let b=o[y];a.set(b,[]);let R=0;for(let c of f){let p=(typeof c.content=="string"?c.content:"").length;if(p===0)continue;let m=R,h=m+p,w=[...t,y,0],F=(c.types||[]).filter(I=>I!=="text"),x={anchor:{path:w,offset:m},focus:{path:w,offset:h},token:!0,...Object.fromEntries(F.map(I=>[I,!0]))};a.get(b).push(x),R=h}}),a},Ir=e=>(0,St.useCallback)(([t])=>{let n=e.nodeToDecorations;return T(t)&&t.type===ye&&n?.has(t)?n.get(t):[]},[e]),Nr=({highlightEnabled:e,docVersion:t})=>{let n=W(),a=(0,St.useMemo)(()=>{if(!e)return new Map;let o=Array.from(k.nodes(n,{at:[],match:i=>T(i)&&i.type===ue&&i.preview!=="true"})).map(i=>Oa(i,Ar));return Da(...o)},[n,t,e]);return n.nodeToDecorations=a,null};var Dr=A(ne(),1);var Mr={"mod+b":"bold","mod+i":"italic","mod+u":"underline"},Pa=new Set(["heading-one","heading-two","heading-three","heading-four","heading-five","heading-six"]),za=(e,t)=>{let n=e.split("+"),a=n.pop(),r=n.includes("mod")&&(t.metaKey||t.ctrlKey),o=n.includes("shift")&&t.shiftKey;return r&&t.key.toLowerCase()===a},Or=e=>(0,Dr.useCallback)(t=>{let n=e;if(t.key==="Tab"&&!Ge(n)){let{selection:a}=e;if(a){let r=k.above(e,{at:a,match:i=>T(i)&&i.type==="list-item"}),o=!1;if(r){let[i,d]=r,l=Math.max(0,Number(i.indent||0));if(t.shiftKey){let g=Math.max(0,l-1);g!==l&&v.setNodes(e,{indent:g||void 0},{at:d}),o=!0}else if(d[d.length-1]>0){let u=se.get(e,he.previous(d)),f=Math.max(0,Number(u?.indent||0)),y=Math.min(l+1,f+1);y!==l&&v.setNodes(e,{indent:y},{at:d}),o=!0}}if(o){t.preventDefault(),t.stopPropagation();return}}}if(t.key==="Enter"){let{selection:a}=e;if(a&&X.isCollapsed(a)){let r=k.above(e,{at:a,match:i=>T(i)&&k.isBlock(e,i)});if(r){let[i,d]=r;if(T(i)&&Pa.has(i.type)&&k.isEnd(e,a.anchor,d)){t.preventDefault();let l=he.next(d);v.insertNodes(e,{type:"paragraph",children:[{text:""}]},{at:l}),v.select(e,k.start(e,l));return}}let o=k.above(e,{at:a,match:i=>T(i)&&i.type==="list-item"});if(o){t.preventDefault();let[i,d]=o,l=i.checked!==void 0;if(se.string(i).trim()===""){v.setNodes(e,{type:"paragraph"},{at:d}),v.unsetNodes(e,"checked",{at:d}),v.unwrapNodes(e,{at:d,match:y=>T(y)&&y.type==="list",split:!0});return}let u={type:"list-item",...l?{checked:!1}:{},indent:i.indent,children:[{text:""}]},f=he.next(d);v.insertNodes(e,u,{at:f}),v.select(e,k.start(e,f));return}}}if(Ge(n)){if(t.key==="Tab"){t.preventDefault(),t.shiftKey?nr(n):tr(n);return}let{selection:a}=e;if(a&&X.isCollapsed(a)){let r=Array.from(k.nodes(e,{match:o=>T(o)&&o.type==="table-cell",at:a}))[0];if(r){let[,o]=r,i=k.isStart(e,a.anchor,o),d=k.isEnd(e,a.anchor,o);switch(t.key){case"ArrowUp":i&&(t.preventDefault(),rr(n));return;case"ArrowDown":d&&(t.preventDefault(),ar(n));return;case"ArrowLeft":i&&(t.preventDefault(),or(n));return;case"ArrowRight":d&&(t.preventDefault(),ir(n));return}}}}for(let a in Mr)if(za(a,t)){t.preventDefault(),le(e,Mr[a]);return}t.key==="Tab"&&!Ge(n)&&(t.preventDefault(),k.above(e,{match:r=>T(r)&&r.type==="code-block"})&&k.insertText(e,"  "))},[e]);var nt=A(ne(),1);var Pr=A(lt(),1);var Y=A(D(),1),zr=({target:e,options:t,selectedIndex:n,onSelect:a,category:r,onCategoryChange:o})=>{let i=be(gt),d=W(),l=(0,nt.useRef)(null),{x:g,y:u,strategy:f,refs:y,update:b}=Ce({placement:"bottom-start",whileElementsMounted:Se,middleware:[Re(5),Ae(),Te({padding:5}),sr({apply({availableHeight:s,elements:p}){Object.assign(p.floating.style,{maxHeight:`${Math.min(s,300)}px`})}})]});if((0,nt.useEffect)(()=>{if(e){let p=_.toDOMRange(d,e).getBoundingClientRect();y.setReference({getBoundingClientRect:()=>p}),b()}},[e,d,y,b]),(0,nt.useEffect)(()=>{if(l.current){let s=l.current.children[n];s&&s.scrollIntoView&&s.scrollIntoView({block:"nearest"})}},[n]),!e)return null;let R=s=>{switch(s){case"page":return(0,Y.jsx)(Nt,{size:14,"aria-hidden":"true"});case"space":return(0,Y.jsx)(on,{size:14,"aria-hidden":"true"});case"agent":return(0,Y.jsx)(mn,{size:14,"aria-hidden":"true"});case"tool":return(0,Y.jsx)(qt,{size:14,"aria-hidden":"true"});default:return(0,Y.jsx)(Nt,{size:14,"aria-hidden":"true"})}},c=[{id:"all",label:"All"},{id:"space",label:"Spaces"},{id:"page",label:"Pages"},{id:"agent",label:"Agents"},{id:"tool",label:"Tools"}];return(0,Pr.createPortal)((0,Y.jsxs)("div",{ref:y.setFloating,style:{position:f,top:u??0,left:g??0,zIndex:1e4,backgroundColor:i.backgroundSecondary,borderRadius:"var(--radius-md)",boxShadow:`0 4px 12px ${i.shadowMedium}`,display:"flex",flexDirection:"column",width:"280px",border:`1px solid ${i.border}`,overflow:"hidden"},"data-test-id":"mention-list",onMouseDown:s=>s.preventDefault(),children:[(0,Y.jsx)("div",{style:{display:"flex",borderBottom:`1px solid ${i.border}`,backgroundColor:i.backgroundTertiary,padding:"4px 4px 0 4px",gap:"4px"},children:c.map(s=>(0,Y.jsx)("button",{type:"button",onClick:p=>{p.preventDefault(),p.stopPropagation(),o&&o(s.id)},"aria-pressed":r===s.id,style:{margin:0,padding:"6px 12px",fontSize:"var(--fontSize-sm)",fontFamily:"inherit",cursor:"pointer",borderTopLeftRadius:"var(--radius-md)",borderTopRightRadius:"var(--radius-md)",backgroundColor:r===s.id?i.backgroundSecondary:"transparent",color:r===s.id?i.text:i.textSecondary,fontWeight:r===s.id?600:400,border:"none",borderBottom:r===s.id?`2px solid ${i.primary}`:"2px solid transparent",transition:"all 0.1s ease",appearance:"none"},children:s.label},s.id))}),(0,Y.jsx)("div",{ref:l,style:{overflowY:"auto",maxHeight:"260px",padding:"4px"},children:t.length===0?(0,Y.jsx)("div",{style:{padding:"12px",color:i.textTertiary,fontSize:"var(--fontSize-sm)",textAlign:"center"},children:"No results found"}):t.map((s,p)=>(0,Y.jsxs)("button",{type:"button",onClick:()=>a(s),style:{width:"100%",margin:0,padding:"8px 12px",cursor:"pointer",borderRadius:"var(--radius-md)",border:"none",backgroundColor:p===n?i.backgroundTertiary:"transparent",color:p===n?i.text:i.textSecondary,display:"flex",alignItems:"center",gap:"8px",transition:"background-color 0.1s ease",font:"inherit",textAlign:"left",appearance:"none"},children:[(0,Y.jsx)("span",{style:{display:"flex",alignItems:"center",color:i.textTertiary},children:R(s.type)}),(0,Y.jsxs)("div",{style:{display:"flex",flexDirection:"column",overflow:"hidden",flex:1},children:[(0,Y.jsx)("span",{style:{fontSize:"var(--fontSize-base)",fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},children:s.label}),s.description&&(0,Y.jsx)("span",{style:{fontSize:"var(--fontSize-sm)",color:i.textTertiary,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},children:s.description})]})]},`${s.type}-${s.id}`))})]}),document.body)};var Br=`
/**
 * prism.js default theme for JavaScript, CSS and HTML
 * Based on dabblet (http://dabblet.com)
 * @author Lea Verou
 */

code[class*="language-"],
pre[class*="language-"] {
    color: black;
    background: none;
    text-shadow: 0 1px white;
    font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
    font-size: 1em;
    text-align: left;
    white-space: pre;
    word-spacing: normal;
    word-break: normal;
    word-wrap: normal;
    line-height: 1.5;

    -moz-tab-size: 4;
    -o-tab-size: 4;
    tab-size: 4;

    -webkit-hyphens: none;
    -moz-hyphens: none;
    -ms-hyphens: none;
    hyphens: none;
}

pre[class*="language-"]::-moz-selection, pre[class*="language-"] ::-moz-selection,
code[class*="language-"]::-moz-selection, code[class*="language-"] ::-moz-selection {
    text-shadow: none;
    background: #b3d4fc;
}

pre[class*="language-"]::selection, pre[class*="language-"] ::selection,
code[class*="language-"]::selection, code[class*="language-"] ::selection {
    text-shadow: none;
    background: #b3d4fc;
}

@media print {
    code[class*="language-"],
    pre[class*="language-"] {
        text-shadow: none;
    }
}

/* Code blocks */
pre[class*="language-"] {
    padding: 1em;
    margin: .5em 0;
    overflow: auto;
}

:not(pre) > code[class*="language-"],
pre[class*="language-"] {
    background: #f5f2f0;
}

/* Inline code */
:not(pre) > code[class*="language-"] {
    padding: .1em;
    border-radius: .3em;
    white-space: normal;
}

.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
    color: slategray;
}

.token.punctuation {
    color: #999;
}

.token.namespace {
    opacity: .7;
}

.token.property,
.token.tag,
.token.boolean,
.token.number,
.token.constant,
.token.symbol,
.token.deleted {
    color: #905;
}

.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
    color: #690;
}

.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string {
    color: #9a6e3a;
    /* This background color was intended by the author of this theme. */
    background: hsla(0, 0%, 100%, .5);
}

.token.atrule,
.token.attr-value,
.token.keyword {
    color: #07a;
}

.token.function,
.token.class-name {
    color: #DD4A68;
}

.token.regex,
.token.important,
.token.variable {
    color: #e90;
}

.token.important,
.token.bold {
    font-weight: bold;
}
.token.italic {
    font-style: italic;
}

.token.entity {
    cursor: help;
}
`;var _r=`
/**
 * okaidia theme for JavaScript, CSS and HTML
 * Loosely based on Monokai textmate theme by http://www.monokai.nl/
 * @author ocodia
 */

code[class*="language-"],
pre[class*="language-"] {
	color: #f8f8f2;
	text-shadow: 0 1px rgba(0, 0, 0, 0.3);
	font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
	direction: ltr;
	text-align: left;
	white-space: pre;
	word-spacing: normal;
	word-break: normal;
	word-wrap: normal;
	line-height: 1.5;

	-moz-tab-size: 4;
	-o-tab-size: 4;
	tab-size: 4;

	-webkit-hyphens: none;
	-moz-hyphens: none;
	-ms-hyphens: none;
	hyphens: none;
}

/* Code blocks */
pre[class*="language-"] {
	padding: 1em;
	margin: .5em 0;
	overflow: auto;
	border-radius: 0.3em;
}

:not(pre) > code[class*="language-"],
pre[class*="language-"] {
	background: #272822;
}

/* Inline code */
:not(pre) > code[class*="language-"] {
	padding: .1em;
	border-radius: .3em;
	white-space: normal;
}

.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
	color: slategray;
}

.token.punctuation {
	color: #f8f8f2;
}

.namespace {
	opacity: .7;
}

.token.property,
.token.tag,
.token.constant,
.token.symbol,
.token.deleted {
	color: #f92672;
}

.token.boolean,
.token.number {
	color: #ae81ff;
}

.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
	color: #a6e22e;
}

.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string,
.token.variable {
	color: #f8f8f2;
}

.token.atrule,
.token.attr-value,
.token.function {
	color: #e6db74;
}

.token.keyword {
	color: #66d9ef;
}

.token.regex,
.token.important {
	color: #fd971f;
}

.token.important,
.token.bold {
	font-weight: bold;
}
.token.italic {
	font-style: italic;
}

.token.entity {
	cursor: help;
}

pre.line-numbers {
	position: relative;
	padding-left: 3.8em;
	counter-reset: linenumber;
}

pre.line-numbers > code {
	position: relative;
}

.line-numbers .line-numbers-rows {
	position: absolute;
	pointer-events: none;
	top: 0;
	font-size: 100%;
	left: -3.8em;
	width: 3em; /* works for line-numbers below 1000 lines */
	letter-spacing: -1px;
	border-right: 1px solid #999;

	-webkit-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
	user-select: none;

}

.line-numbers-rows > span {
	pointer-events: none;
	display: block;
	counter-increment: linenumber;
}

.line-numbers-rows > span:before {
	content: counter(linenumber);
	color: #999;
	display: block;
	padding-right: 0.8em;
	text-align: right;
}

div.prism-show-language {
	position: relative;
}

div.prism-show-language > div.prism-show-language-label[data-language] {
	color: black;
	background-color: #CFCFCF;
	display: inline-block;
	position: absolute;
	bottom: auto;
	left: auto;
	top: 0;
	right: 0;
	width: auto;
	height: auto;
	font-size: 0.9em;
	border-radius: 0 0 0 5px;
	padding: 0 0.5em;
	text-shadow: none;
	z-index: 1;
	-webkit-box-shadow: none;
	-moz-box-shadow: none;
	box-shadow: none;
	-webkit-transform: none;
	-moz-transform: none;
	-ms-transform: none;
	-o-transform: none;
	transform: none;
}
`;var $r=`
/**
 * GitHub-like light theme for Prism.js
 * \u53C2\u8003 GitHub \u4EE3\u7801\u914D\u8272\uFF08\u6D45\u8272\uFF09
 */

code[class*="language-"],
pre[class*="language-"] {
  color: #24292e;
  background: none;
  text-shadow: none;
  font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
  font-size: 1em;
  text-align: left;
  white-space: pre;
  word-spacing: normal;
  word-break: normal;
  word-wrap: normal;
  line-height: 1.5;

  -moz-tab-size: 4;
  -o-tab-size: 4;
  tab-size: 4;

  -webkit-hyphens: none;
  -moz-hyphens: none;
  -ms-hyphens: none;
  hyphens: none;
}

/* Code blocks */
pre[class*="language-"] {
  margin: .5em 0;
  padding: 1em;
  overflow: auto;
  border-radius: 6px;
  background: #f6f8fa;
  border: 1px solid #d0d7de;
}

/* Inline code */
:not(pre) > code[class*="language-"] {
  padding: .2em .4em;
  border-radius: 4px;
  background-color: rgba(175, 184, 193, 0.2);
  color: #24292f;
  white-space: normal;
}

/* Selection */
pre[class*="language-"] ::selection,
code[class*="language-"] ::selection {
  background: rgba(180, 213, 255, 0.7);
}

pre[class*="language-"]::-moz-selection,
code[class*="language-"]::-moz-selection {
  background: rgba(180, 213, 255, 0.7);
}

/* Tokens */

.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
 : #6a737d;
}

.token.punctuation {
  color: #24292e;
}

.namespace {
  opacity: .7;
}

.token.property,
.token.tag,
.token.constant,
.token.symbol,
.token.deleted {
  color: #d73a49; /* \u7EA2 */
}

.token.boolean,
.token.number {
  color: #005cc5; /* \u84DD */
}

.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
  color: #032f62; /* \u6DF1\u84DD/\u5B57\u7B26\u4E32 */
}

.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string {
  color: #d73a49;
}

.token.atrule,
.token.attr-value,
.token.keyword {
  color: #d73a49;
}

.token.function,
.token.class-name {
  color: #6f42c1; /* \u7D2B\u8272\u51FD\u6570/\u7C7B\u540D */
}

.token.regex,
.token.important,
.token.variable {
  color: #e36209; /* \u6A59\u8272 */
}

.token.important,
.token.bold {
  font-weight: bold;
}

.token.italic {
  font-style: italic;
}

.token.entity {
  cursor: help;
}
`;var Ur=`
/**
 * GitHub-like dark theme for Prism.js
 * \u53C2\u8003 GitHub Dark \u4EE3\u7801\u914D\u8272
 */

code[class*="language-"],
pre[class*="language-"] {
  color: #c9d1d9;
  background: none;
  text-shadow: none;
  font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
  font-size: 1em;
  text-align: left;
  white-space: pre;
  word-spacing: normal;
  word-break: normal;
  word-wrap: normal;
  line-height: 1.5;

  -moz-tab-size: 4;
  -o-tab-size: 4;
  tab-size: 4;

  -webkit-hyphens: none;
  -moz-hyphens: none;
  -ms-hyphens: none;
  hyphens: none;
}

/* Code blocks */
pre[class*="language-"] {
  margin: .5em 0;
  padding: 1em;
  overflow: auto;
  border-radius: 6px;
  background: #0d1117;
  border: 1px solid #30363d;
}

/* Inline code */
:not(pre) > code[class*="language-"] {
  padding: .2em .4em;
  border-radius: 4px;
  background-color: rgba(110, 118, 129, 0.4);
  color: #e6edf3;
  white-space: normal;
}

/* Selection */
pre[class*="language-"] ::selection,
code[class*="language-"] ::selection {
  background: rgba(56, 139, 253, 0.4);
}

pre[class*="language-"]::-moz-selection,
code[class*="language-"]::-moz-selection {
  background: rgba(56, 139, 253, 0.4);
}

/* Tokens */

.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
  color: #8b949e;
}

.token.punctuation {
  color: #c9d1d9;
}

.namespace {
  opacity: .7;
}

.token.property,
.token.tag,
.token.constant,
.token.symbol,
.token.deleted {
  color: #ff7b72; /* \u7EA2/\u6807\u7B7E\u7B49 */
}

.token.boolean,
.token.number {
  color: #f2cc60; /* \u9EC4/\u6570\u503C */
}

.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
  color: #a5d6ff; /* \u6D45\u84DD/\u5B57\u7B26\u4E32 */
}

.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string {
  color: #f0883e;
}

.token.atrule,
.token.attr-value,
.token.keyword {
  color: #ff7b72; /* \u5173\u952E\u5B57\u7EA2\u6A59 */
}

.token.function,
.token.class-name {
  color: #d2a8ff; /* \u7D2B */
}

.token.regex,
.token.important,
.token.variable {
  color: #f2cc60; /* \u9EC4 */
}

.token.important,
.token.bold {
  font-weight: bold;
}

.token.italic {
  font-style: italic;
}

.token.entity {
  cursor: help;
}
`;var Hr={default:Br,okaidia:_r,"github-light":$r,"github-dark":Ur},jr=e=>Hr[e??"default"]??Hr.default;var V=A(D(),1),Kr=()=>(0,V.jsxs)(V.Fragment,{children:[(0,V.jsx)("h2",{children:"\u6B22\u8FCE\u8BB0\u5F55\u4F60\u7684\u7075\u611F\u4E0E\u60F3\u6CD5"}),(0,V.jsx)("p",{children:"\u{1F44B} \u5728\u8FD9\u91CC\u8BB0\u5F55\u4F60\u7684\u7075\u611F\u4E0E\u60F3\u6CD5\u5427\uFF01"}),(0,V.jsx)("p",{children:"\u2728 \u8BD5\u8BD5\u4EE5\u4E0B\u5FEB\u6377\u65B9\u5F0F\uFF0C\u9AD8\u6548\u7F16\u8F91\u4F60\u7684\u5185\u5BB9\uFF1A"}),(0,V.jsxs)("p",{children:["\u8F93\u5165 ",(0,V.jsx)("code",{children:"#"})," \u7136\u540E\u6309\u7A7A\u683C\u952E\uFF1A\u521B\u5EFA\u5927\u6807\u9898"]}),(0,V.jsxs)("p",{children:["\u8F93\u5165 ",(0,V.jsx)("code",{children:"##"})," \u7136\u540E\u6309\u7A7A\u683C\u952E\uFF1A\u521B\u5EFA\u4E2D\u6807\u9898"]}),(0,V.jsxs)("p",{children:["\u8F93\u5165 ",(0,V.jsx)("code",{children:"*"})," \u7136\u540E\u6309\u7A7A\u683C\u952E\uFF1A\u521B\u5EFA\u65E0\u5E8F\u5217\u8868"]}),(0,V.jsxs)("p",{children:["\u8F93\u5165 ",(0,V.jsx)("code",{children:"1."})," \u7136\u540E\u6309\u7A7A\u683C\u952E\uFF1A\u521B\u5EFA\u6709\u5E8F\u5217\u8868"]}),(0,V.jsx)("p",{children:"\u{1F4A1} \u66F4\u591A\u529F\u80FD\u7B49\u4F60\u63A2\u7D22\uFF0C\u5FEB\u5F00\u59CB\u5427\uFF01"})]});var de=A(D(),1),Ba={bold:{fontWeight:600,color:"var(--text)"},italic:{fontStyle:"italic",color:"var(--textSecondary)"},underline:{textDecorationThickness:"0.1em",textUnderlineOffset:"0.2em",textDecorationColor:"var(--primary)",color:"var(--text)"},strikethrough:{textDecorationThickness:"0.1em",textDecorationColor:"var(--textTertiary)",opacity:.65,color:"var(--textTertiary)"},subscript:{fontSize:"0.75em",color:"var(--textSecondary)"},superscript:{fontSize:"0.75em",color:"var(--textSecondary)"},highlight:{backgroundColor:"var(--primaryLight)",color:"var(--text)",padding:"var(--space-0) var(--space-1)",borderRadius:"var(--space-1)",boxShadow:"0 0 0 1px var(--primary)"}},_a={backgroundColor:"var(--backgroundSecondary)",color:"var(--primary)",padding:"var(--space-1) var(--space-2)",borderRadius:"var(--space-1)",fontFamily:'var(--font-mono, "JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',fontSize:"0.85em",border:"1px solid var(--border)",wordBreak:"break-word",lineHeight:"var(--leading-tight)",fontWeight:500},$a=["bold","italic","underline","strikethrough","subscript","superscript","highlight"],Ua=new Set(["text","token","types","type","prismType","bold","italic","underline","strikethrough","subscript","superscript","highlight","code"]),Ha=(e,t)=>{let n=Ba[e];switch(e){case"bold":return(0,de.jsx)("strong",{style:n,children:t});case"italic":return(0,de.jsx)("em",{style:n,children:t});case"underline":return(0,de.jsx)("u",{style:n,children:t});case"strikethrough":return(0,de.jsx)("del",{style:n,children:t});case"subscript":return(0,de.jsx)("sub",{style:n,children:t});case"superscript":return(0,de.jsx)("sup",{style:n,children:t});case"highlight":return(0,de.jsx)("mark",{style:n,children:t});default:return t}},ja=e=>{if(!e.token)return;let t=Array.isArray(e.types)?e.types:[],n=typeof e.prismType=="string"?[e.prismType]:typeof e.type=="string"?[e.type]:[],a=[...t,...n].flatMap(i=>i?[String(i)]:[]),r=Object.keys(e).filter(i=>!Ua.has(i)&&e[i]===!0),o=[...a,...r.filter(i=>!a.includes(i))];return o.length===0?"token":["token",...o].join(" ")},Ka=({attributes:e,children:t,leaf:n})=>{let{code:a,token:r,...o}=n;if(a&&!r){let f=[e?.className,"inline-code"].filter(Boolean).join(" ")||void 0;return(0,de.jsx)("code",{...e,className:f,style:_a,children:t})}let i=$a.reduce((u,f)=>o[f]?Ha(f,u):u,t),d=ja(n),g=[e?.className,d].filter(Boolean).join(" ")||void 0;return(0,de.jsx)("span",{...e,className:g,children:i})},Gr=e=>(0,de.jsx)(Ka,{...e});var We=A(ne(),1);var rt=A(ne(),1);var K=A(D(),1),Ga=e=>{if(!e||!(e.blob instanceof Blob))return{src:null,objectUrl:null};let t=URL.createObjectURL(e.blob);return{src:t,objectUrl:t}},Wr=({attributes:e,children:t,element:n,style:a,readOnly:r=!1})=>{let o=je(),i=be(Sn),d=Ke(),l=Yn(),g=ht(),[u,f]=(0,rt.useState)(null),y=i||"",b=n.url||$n(y,n.fileId)||"",[R,c]=(0,rt.useState)(b||null);(0,rt.useEffect)(()=>{if(c(b||null),n.url||!n.fileId)return;let z=!1,re=null;return(async()=>{try{let B=await o(Ln({fileId:n.fileId})).unwrap(),{src:G,objectUrl:J}=Ga(B);!z&&G&&(c(G),re=J)}catch{}})(),()=>{z=!0,re&&URL.revokeObjectURL(re)}},[o,n.fileId,n.url,b]);let s=R||"",p=a||{},{textAlign:m,...h}=p,w=n.align==="center"?{marginLeft:"auto",marginRight:"auto",display:"block"}:n.align==="right"?{marginLeft:"auto",display:"block"}:{},F={display:n.align?"block":"inline-block",...n.align?{}:{marginRight:"var(--space-3)"},marginBottom:"var(--space-3)",verticalAlign:"top",maxWidth:"100%",...h,...w},x=l&&g,I=z=>{z.preventDefault(),z.stopPropagation();let re=_.findPath(d,n);v.removeNodes(d,{at:re})},O=z=>{z.preventDefault(),z.stopPropagation();let re=window.prompt("\u8BBE\u7F6E\u56FE\u7247\u66FF\u4EE3\u6587\u672C\uFF08alt\uFF09\uFF1A",n.alt||"");if(re===null)return;let Ne=_.findPath(d,n);v.setNodes(d,{alt:re||void 0},{at:Ne})},te=()=>{s&&f(s)},me=z=>{r&&(z.preventDefault(),z.stopPropagation(),te())},ie=z=>{z.preventDefault(),z.stopPropagation(),te()};return(0,K.jsxs)(K.Fragment,{children:[(0,K.jsx)("div",{...e,style:F,children:(0,K.jsxs)("div",{style:{display:"inline-block",maxWidth:"100%"},children:[s&&(0,K.jsxs)("div",{contentEditable:!1,style:{position:"relative",display:"block",maxWidth:"100%"},children:[(0,K.jsx)("img",{src:s,alt:n.alt||"",loading:"lazy",onMouseDown:me,style:{display:"block",maxWidth:"100%",maxHeight:"20em",borderRadius:"var(--radius-md)",boxShadow:x?"0 0 0 2px var(--primary)":"0 0 0 1px rgba(0, 0, 0, 0.12)",cursor:r?"zoom-in":"default"}}),x&&!r&&(0,K.jsxs)("div",{style:{position:"absolute",top:8,right:8,display:"flex",gap:6},children:[(0,K.jsx)("button",{type:"button",onMouseDown:O,style:_t,title:"\u7F16\u8F91 Alt \u6587\u672C","aria-label":"\u7F16\u8F91 Alt \u6587\u672C",children:(0,K.jsx)(Xt,{size:14,"aria-hidden":"true"})}),(0,K.jsx)("button",{type:"button",onMouseDown:ie,style:_t,title:"\u9884\u89C8\u5927\u56FE","aria-label":"\u9884\u89C8\u5927\u56FE",children:(0,K.jsx)(Zt,{size:14,"aria-hidden":"true"})}),(0,K.jsx)("button",{type:"button",onMouseDown:I,style:_t,title:"\u5220\u9664\u56FE\u7247","aria-label":"\u5220\u9664\u56FE\u7247",children:(0,K.jsx)(xe,{size:14,"aria-hidden":"true"})})]})]}),(0,K.jsx)("div",{style:{marginTop:6,minHeight:18,fontSize:"var(--fontSize-sm)",color:"var(--textSecondary)",textAlign:"center",fontStyle:"italic"},children:t})]})}),(0,K.jsx)(Wn,{imageUrl:u,alt:n.alt||"",onClose:()=>f(null),contentKey:n.fileId})]})},_t={width:26,height:26,borderRadius:999,border:"none",padding:0,display:"flex",alignItems:"center",justifyContent:"center",backgroundColor:"rgba(0, 0, 0, 0.6)",color:"#fff",cursor:"pointer"};var Rt=A(ne(),1);var oe=A(D(),1),Yr=({attributes:e,children:t,element:n})=>{let a=n.ordered?"ol":"ul",o=Rt.default.Children.toArray(t).map((l,g)=>({child:l,indent:Math.max(0,Number(n.children?.[g]?.indent||0))})),i=(l,g)=>{let u=[],f=l;for(;f<o.length;){let y=o[f];if(y.indent<g)break;if(y.indent>g){let b=u[u.length-1];if(Rt.default.isValidElement(b)){let[R,c]=i(f,y.indent);u[u.length-1]=Rt.default.cloneElement(b,{},(0,oe.jsxs)(oe.Fragment,{children:[b.props.children,(0,oe.jsx)(a,{className:"custom-list custom-list--nested",children:R})]})),f=c;continue}}u.push(y.child),f+=1}return[u,f]},[d]=i(0,0);return(0,oe.jsx)(oe.Fragment,{children:(0,oe.jsx)(a,{...e,className:"custom-list",children:d})})},Vr=({attributes:e,children:t,element:n,readOnly:a=!1})=>{let r=Ke(),o=n.checked!==void 0,i=n.checked===!0,d=["custom-list-item",o&&"task-list-item",i&&"task-completed"].filter(Boolean).join(" ");return o?(0,oe.jsxs)("li",{...e,className:d,children:[(0,oe.jsx)("input",{type:"checkbox",checked:n.checked,readOnly:!0,className:"list-checkbox",contentEditable:!1,"aria-label":i?"Completed task":"Incomplete task",onMouseDown:l=>{if(a)return;l.preventDefault(),l.stopPropagation();let g=_.findPath(r,n);k.withoutNormalizing(r,()=>{v.setNodes(r,{checked:!n.checked},{at:g,match:u=>Pe.isElement(u)&&u===n})})}}),(0,oe.jsx)("div",{className:`task-content${i?" task-completed":""}`,children:t})]}):(0,oe.jsx)("li",{...e,className:d,children:t})};var at=A(ne(),1);var Fe=A(D(),1),Wa=e=>{if(!e||typeof e!="string")return{href:"about:blank",isExternal:!0};let t=e.trim();return/^(https?:|mailto:|tel:)/i.test(t)?{href:t,isExternal:!0}:t.startsWith("//")?{href:t,isExternal:!0}:t.includes(".")&&!t.includes(" ")&&!t.startsWith("/")?{href:`//${t}`,isExternal:!0}:{href:t,isExternal:!1}},qr=({attributes:e,children:t,href:n,...a})=>{let{href:r,isExternal:o}=(0,at.useMemo)(()=>Wa(n),[n]);return o?(0,Fe.jsx)("a",{href:r,target:"_blank",rel:"noopener noreferrer",...e,...a,children:t}):(0,Fe.jsx)(Vt,{to:r,...e,...a,children:t})},Ya={"heading-one":"h1","heading-two":"h2","heading-three":"h3","heading-four":"h4","heading-five":"h5","heading-six":"h6",quote:"blockquote","thematic-break":"hr",paragraph:"p"},Va=new Set(["link","code-inline","html-inline"]),qa=e=>e.type!=="paragraph"||!Array.isArray(e.children)?!1:e.children.some(t=>!t||typeof t!="object"||!("type"in t)?!1:typeof t.type=="string"&&!Va.has(t.type)),Zr=({attributes:e,children:t,element:n})=>{let a=qa(n)?"div":Ya[n.type],r=["text-block",`text-${n.type}`];n.align&&r.push(`align-${n.align}`),n.type==="paragraph"&&n.isNested&&r.push("nested");let o=r.join(" ");return(0,Fe.jsx)(Fe.Fragment,{children:n.type==="thematic-break"?at.default.createElement(a,{...e,className:o}):at.default.createElement(a,{...e,className:o},t,n.type==="quote"&&n.cite?(0,Fe.jsxs)("cite",{children:["\u2014 ",n.cite]},"cite"):null)})};var H=A(D(),1),Za=["paragraph","heading-one","heading-two","heading-three","heading-four","heading-five","heading-six","quote","thematic-break"],Xa=(0,We.lazy)(()=>import("/public/assets/chunks/CodeBlock-Y6K55WUA.js")),Xr=e=>{let{attributes:t,children:n,element:a,isStreaming:r=!1,readOnly:o}=e,i=Ke(),d=(0,We.useCallback)(u=>{u.defaultPrevented||u.button!==0||u.metaKey||u.ctrlKey||u.altKey||u.shiftKey||u.preventDefault()},[]),l=o?void 0:d,g=(u={})=>({...a.align?{textAlign:a.align}:{},...u});if(Za.includes(a.type))return(0,H.jsx)(Zr,{attributes:t,element:a,children:n});if(a.type===ue)return(0,H.jsx)(We.Suspense,{fallback:(0,H.jsx)("pre",{className:"code-loading",children:"\u4EE3\u7801\u5757\u52A0\u8F7D\u4E2D..."}),children:(0,H.jsx)(Xa,{attributes:t,element:a,isStreaming:r,children:n})});if(a.type===ye)return(0,H.jsx)("div",{...t,style:g(),children:n});switch(a.type){case"code-inline":return(0,H.jsx)("code",{...t,style:g({background:"var(--backgroundSecondary)",color:"var(--primary)",padding:"var(--space-1) var(--space-2)",borderRadius:"var(--space-1)",fontFamily:'var(--font-mono, "JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',fontSize:"0.85em",border:"1px solid var(--border)",wordBreak:"break-word",lineHeight:"var(--leading-tight)",fontWeight:500}),children:n});case"link":return(0,H.jsx)(qr,{href:a.url,onClick:l,...t,style:g({color:"var(--primary)",textDecoration:"underline",textDecorationColor:"var(--primary)",textUnderlineOffset:"1px"}),children:n});case"image":return(0,H.jsx)(Wr,{...e,readOnly:o,style:g({margin:"var(--space-4) 0"})});case"list":return(0,H.jsx)(Yr,{attributes:t,element:a,children:n});case"list-item":return(0,H.jsx)(Vr,{attributes:t,element:a,readOnly:o,children:n});case"table":{let u=_.findPath(i,a);return(0,H.jsx)(lr,{...e,path:u,style:g({margin:"var(--space-4) 0"}),children:n})}case"table-row":return(0,H.jsx)(cr,{attributes:t,style:g(),children:n});case"table-cell":{let u=_.findPath(i,a),f=u[u.length-2]===0;return(0,H.jsx)(ur,{...e,path:u,isFirstRow:f,style:g({padding:"var(--space-2) var(--space-3)",lineHeight:"var(--leading-normal)"}),children:n})}case"html-inline":return(0,H.jsx)("span",{...t,style:g(),dangerouslySetInnerHTML:{__html:a.html}});case"mention":return(0,H.jsxs)("span",{...t,contentEditable:!1,style:g({padding:"0 4px",borderRadius:"var(--radius-sm)",backgroundColor:"var(--backgroundTertiary)",color:"var(--primary)",fontWeight:500,userSelect:"none",margin:"0 2px",border:"1px solid var(--border)",fontSize:"0.9em",verticalAlign:"baseline",display:"inline-flex",alignItems:"center"}),children:["@",a.label,n]});case"html-block":return(0,H.jsx)("div",{...t,style:g({margin:"var(--space-3) 0"}),dangerouslySetInnerHTML:{__html:a.html}});default:{let u=i.isInline(a)?"span":"div";return(0,H.jsx)(u,{...t,style:g({...i.isInline(a)?{}:{margin:"var(--space-2) 0"}}),children:n})}}};var _e=A(ne(),1);var Jr=A(ne(),1),Qr=A(lt(),1),$t=A(D(),1),$=({className:e="",active:t=!1,reversed:n=!1,children:a,style:r={},...o})=>{let[i,d]=(0,Jr.useState)(!1);return(0,$t.jsx)("span",{...o,className:e,onMouseEnter:()=>d(!0),onMouseLeave:()=>d(!1),style:{cursor:"pointer",color:n?t?"var(--background)":"var(--textQuaternary)":t?"var(--primary)":"var(--textSecondary)",padding:"var(--space-1) var(--space-2)",borderRadius:"var(--space-1)",backgroundColor:i?n?"var(--backgroundHover)":"var(--focus)":t?n?"var(--backgroundSelected)":"var(--primaryHover)":"transparent",transition:"color 0.2s, background-color 0.2s",display:"inline-flex",alignItems:"center",justifyContent:"center",...r},children:a})},Ye=({className:e="",style:t={},ref:n,...a})=>(0,$t.jsx)("div",{...a,ref:n,"data-test-id":"menu",className:e,style:{display:"flex",flexWrap:"wrap",gap:"var(--space-2)",...t}}),ea=({children:e})=>typeof document=="object"?Qr.default.createPortal(e,document.body):null;var Ut=A(D(),1),ta=e=>{let[t]=k.nodes(e,{match:n=>T(n)&&n.type===ue});return!!t},Ja=e=>{let t=ta(e),n=[...Object.values(Xn),Mt],a=r=>T(r)&&n.includes(r.type);t?(v.setNodes(e,{type:Mt},{match:r=>T(r)&&r.type===ye}),v.unwrapNodes(e,{match:r=>T(r)&&r.type===ue,split:!0})):(v.setNodes(e,{type:ye},{match:a}),v.wrapNodes(e,{type:ue,language:"tsx",children:[]},{match:r=>T(r)&&r.type===ye,split:!0}))},na=()=>{let e=W(),t=ta(e),n="\u4EE3\u7801\u5757";return(0,Ut.jsx)($,{"data-test-id":"code-block-button",active:t,role:"button",tabIndex:0,title:n,"aria-label":n,"aria-pressed":t,onMouseDown:a=>{a.preventDefault(),Ja(e)},children:(0,Ut.jsx)(un,{size:18,"aria-hidden":"true"})})};var Ht=e=>{let[t]=k.nodes(e,{match:n=>T(n)&&n.type==="link"});return!!t},ra=e=>{v.unwrapNodes(e,{match:t=>T(t)&&t.type==="link"})},Qa=(e,t)=>{Ht(e)&&ra(e);let{selection:n}=e,a=n&&X.isCollapsed(n),r={type:"link",url:t,children:a?[{text:t}]:[]};a?v.insertNodes(e,r):(v.wrapNodes(e,r,{split:!0}),v.collapse(e,{edge:"end"}))},eo=(e,t)=>{if(!t){Ht(e)&&ra(e);return}let{selection:n}=e;n&&Qa(e,t)},Ee={isLinkActive:Ht,toggleLink:eo};var Be=A(ne(),1);var Q=A(D(),1),aa=({isOpen:e,onClose:t,onConfirm:n,onRemove:a,initialUrl:r=""})=>{let{t:o}=Bn(),[i,d]=(0,Be.useState)(r);(0,Be.useEffect)(()=>{e&&d(r||"")},[r,e]);let l=(0,Be.useCallback)(()=>{i.trim()&&(n(i.trim()),t())},[i,n,t]),g=(0,Be.useCallback)(()=>{a(),t()},[a,t]),u=y=>{y.key==="Enter"&&(y.preventDefault(),l())},f=!!r;return(0,Q.jsxs)(Gn,{isOpen:e,onClose:t,title:f?o("linkModal.editTitle","\u7F16\u8F91\u94FE\u63A5"):o("linkModal.addTitle","\u6DFB\u52A0\u94FE\u63A5"),size:"small",children:[(0,Q.jsxs)("div",{className:"link-modal-container",children:[(0,Q.jsxs)("div",{className:"input-wrapper",children:[(0,Q.jsx)(ut,{size:16,className:"input-icon","aria-hidden":"true"}),(0,Q.jsx)("input",{type:"text",className:"link-input",value:i,onChange:y=>d(y.target.value),onKeyDown:u,placeholder:o("linkModal.placeholder","https://example.com"),autoFocus:!0})]}),(0,Q.jsxs)("div",{className:"actions-wrapper",children:[f&&(0,Q.jsxs)(ft,{onClick:g,variant:"danger",size:"small",children:[(0,Q.jsx)(xe,{size:14,"aria-hidden":"true"}),(0,Q.jsx)("span",{style:{marginLeft:"4px"},children:o("common.remove","\u79FB\u9664")})]}),(0,Q.jsx)("div",{className:"spacer"}),(0,Q.jsx)(ft,{onClick:t,variant:"secondary",size:"small",children:o("common.cancel","\u53D6\u6D88")}),(0,Q.jsx)(ft,{onClick:l,size:"small",disabled:!i.trim(),children:f?o("common.save","\u4FDD\u5B58"):o("common.add","\u6DFB\u52A0")})]})]}),(0,Q.jsx)("style",{jsx:!0,children:`
        .link-modal-container {
          display: flex;
          flex-direction: column;
          gap: 24px; /* \u95F4\u8DDD */
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;
          top: 50%;
          left: 12px;
          transform: translateY(-50%);
          color: var(--theme-textTertiary); /* \u4F7F\u7528 CSS \u53D8\u91CF\u6216 theme \u5BF9\u8C61 */
        }

        /* \u8FD9\u662F\u4E00\u4E2A\u57FA\u7840\u7684 Input \u6837\u5F0F\uFF0C\u5982\u679C\u9879\u76EE\u4E2D\u6709\u6807\u51C6 Input \u7EC4\u4EF6\uFF0C\u8BF7\u66FF\u6362 */
        .link-input {
          width: 100%;
          height: var(--control-lg);
          padding: 0 12px 0 36px; /* \u5DE6\u4FA7\u7559\u51FA\u56FE\u6807\u7A7A\u95F4 */
          box-sizing: border-box;
          border-radius: var(--radius-md);
          border: 1px solid var(--theme-border, #e5e7eb);
          background-color: var(--theme-backgroundSecondary, #f9fafb);
          color: var(--theme-text, #111827);
          font-size: var(--fontSize-base);
          transition:
            border-color 0.2s,
            box-shadow 0.2s;
        }

        .link-input:focus {
          outline: none;
          border-color: var(--theme-primary, #3b82f6);
          box-shadow: 0 0 0 2px
            var(--theme-primary-light, rgba(59, 130, 246, 0.2));
        }

        .actions-wrapper {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 8px; /* \u6309\u94AE\u95F4\u8DDD */
        }

        .spacer {
          flex-grow: 1;
        }
      `})]})};var to=e=>`slate-image-${e.lastModified}-${e.size}-${Math.random().toString(36).slice(2)}`,Tt=async(e,t,n,a)=>{let r=to(n),o=Je.loading("\u6B63\u5728\u4E0A\u4F20\u56FE\u7247\u2026");try{let i;a?i=await t(Kn({spaceId:a,file:n})).unwrap():i=await t(Cn({file:n,customKey:r})).unwrap();let d=i?.fileId||i?.id||i?.dbKey;if(!d)return Je.error("\u4E0A\u4F20\u5931\u8D25\uFF1A\u672A\u8FD4\u56DE\u6587\u4EF6 ID",{id:o}),null;let l={type:"image",fileId:d,alt:n.name,children:[{text:""}]};return v.insertNodes(e,l),Je.success("\u56FE\u7247\u4E0A\u4F20\u6210\u529F",{id:o}),d}catch{return Je.error("\u56FE\u7247\u4E0A\u4F20\u5931\u8D25",{id:o}),null}};var C=A(D(),1),ia=["left","center","right","justify"],oa="list",sa="task-list",la=e=>{let[t]=k.nodes(e,{match:n=>T(n)&&n.type==="table"});return!!t},no=e=>{if(la(e))return;let t=()=>({type:"table-cell",children:[{type:"paragraph",children:[{text:""}]}]}),n=o=>({type:"table-row",children:Array.from({length:o},t)}),a={type:"table",columns:[{width:null,align:"left"},{width:null,align:"left"}],children:[n(2),n(2)]};v.insertNodes(e,a);let[r]=k.nodes(e,{match:o=>T(o)&&o.type==="table"});r&&v.select(e,k.start(e,r[1]))},ro=()=>{let e=W(),t=la(e),n="\u63D2\u5165\u8868\u683C";return(0,C.jsx)($,{disabled:t,role:"button",tabIndex:t?-1:0,"aria-disabled":t||void 0,title:n,"aria-label":n,onMouseDown:a=>{a.preventDefault(),!t&&no(e)},children:(0,C.jsx)(Jt,{size:18,"aria-hidden":"true"})})},ao=()=>{let e=W(),t=je(),n=(0,_e.useRef)(null),a=(0,_e.useCallback)(()=>{n.current?.click()},[]),r=async i=>{let d=i.target.files?.[0];d&&(i.target.value="",Rn(d)&&(_.isFocused(e)||_.focus(e),await Tt(e,t,d)))},o="\u63D2\u5165\u56FE\u7247";return(0,C.jsxs)(C.Fragment,{children:[(0,C.jsx)($,{role:"button",tabIndex:0,title:o,"aria-label":o,onMouseDown:i=>{i.preventDefault(),a()},children:(0,C.jsx)(sn,{size:18,"aria-hidden":"true"})}),(0,C.jsx)("input",{ref:n,type:"file",accept:"image/*",style:{display:"none"},onChange:r})]})},oo=({className:e="",style:t={},...n})=>(0,C.jsx)(Ye,{...n,className:`editor-toolbar ${e}`,style:{position:"relative",padding:"var(--space-2) var(--space-3)",backgroundColor:"var(--backgroundSecondary)",borderRadius:"var(--space-1)",boxShadow:"0 1px 3px var(--shadowMedium)",marginBottom:"var(--space-4)",display:"flex",flexWrap:"wrap",alignItems:"center",gap:"var(--space-2)",...t}}),io=(e,t,n)=>{let a=t===sa,r=t==="list"||a;if(a){wt(e);return}if(t==="list"){n?kt(e):vt(e);return}if(ia.includes(t)){let i=yt(e,t,"align");v.setNodes(e,{align:i?void 0:t});return}let o=yt(e,t,"type");et(e,o?"paragraph":t)},so={"heading-one":"\u4E00\u7EA7\u6807\u9898","heading-two":"\u4E8C\u7EA7\u6807\u9898",quote:"\u5F15\u7528",list:"\u5217\u8868","task-list":"\u4EFB\u52A1\u5217\u8868",left:"\u5DE6\u5BF9\u9F50",center:"\u5C45\u4E2D\u5BF9\u9F50",right:"\u53F3\u5BF9\u9F50",justify:"\u4E24\u7AEF\u5BF9\u9F50"},lo={bold:"\u7C97\u4F53",italic:"\u659C\u4F53",underline:"\u4E0B\u5212\u7EBF",code:"\u884C\u5185\u4EE3\u7801"},ge=({format:e,Icon:t,ordered:n,label:a})=>{let r=W(),o=e===sa?Et(r)==="task":e===oa?Et(r)===(n?"ordered":"unordered"):yt(r,e,ia.includes(e)?"align":"type"),i=a||(e===oa?n?"\u6709\u5E8F\u5217\u8868":"\u65E0\u5E8F\u5217\u8868":so[e]||e);return(0,C.jsx)($,{active:o,role:"button",tabIndex:0,title:i,"aria-label":i,"aria-pressed":o,onMouseDown:d=>{d.preventDefault(),io(r,e,n)},children:(0,C.jsx)(t,{size:18,"aria-hidden":"true"})})},At=({format:e,Icon:t,label:n})=>{let a=W(),r=tt(a,e),o=n||lo[e]||e;return(0,C.jsx)($,{active:r,role:"button",tabIndex:0,title:o,"aria-label":o,"aria-pressed":r,onMouseDown:i=>{i.preventDefault(),le(a,e)},children:(0,C.jsx)(t,{size:18,"aria-hidden":"true"})})},co=()=>{let e=W(),[t,n]=(0,_e.useState)(!1),a=Ee.isLinkActive(e),r=(0,_e.useCallback)(()=>{if(!a)return"";let[l]=k.nodes(e,{match:g=>T(g)&&g.type==="link"});return l?l[0].url:""},[e,a]),o=l=>{Ee.toggleLink(e,l),n(!1)},i=()=>{Ee.toggleLink(e),n(!1)},d="\u94FE\u63A5";return(0,C.jsxs)(C.Fragment,{children:[(0,C.jsx)($,{active:a,role:"button",tabIndex:0,title:d,"aria-label":d,"aria-pressed":a,onMouseDown:l=>{l.preventDefault(),_.isFocused(e)||_.focus(e),n(!0)},children:(0,C.jsx)(ut,{size:18,"aria-hidden":"true"})}),t&&(0,C.jsx)(aa,{isOpen:t,onClose:()=>n(!1),onConfirm:o,onRemove:i,initialUrl:r()})]})},ca=()=>{let e={display:"flex",gap:"var(--space-1)"},t=(0,C.jsx)("div",{style:{borderLeft:"1px solid var(--border)",height:"var(--space-5)"}});return(0,C.jsxs)(oo,{children:[(0,C.jsxs)("div",{style:e,children:[(0,C.jsx)(At,{format:"bold",Icon:pt}),(0,C.jsx)(At,{format:"italic",Icon:dt}),(0,C.jsx)(At,{format:"underline",Icon:ct}),(0,C.jsx)(At,{format:"code",Icon:pn}),(0,C.jsx)(co,{})]}),t,(0,C.jsxs)("div",{style:e,children:[(0,C.jsx)(ge,{format:"heading-one",Icon:cn}),(0,C.jsx)(ge,{format:"heading-two",Icon:ln}),(0,C.jsx)(ge,{format:"quote",Icon:tn})]}),t,(0,C.jsxs)("div",{style:e,children:[(0,C.jsx)(ge,{format:"list",ordered:!0,Icon:rn}),(0,C.jsx)(ge,{format:"list",ordered:!1,Icon:nn}),(0,C.jsx)(ge,{format:"task-list",Icon:Qt})]}),t,(0,C.jsxs)("div",{style:e,children:[(0,C.jsx)(ge,{format:"left",Icon:kn}),(0,C.jsx)(ge,{format:"center",Icon:wn}),(0,C.jsx)(ge,{format:"right",Icon:En}),(0,C.jsx)(ge,{format:"justify",Icon:vn})]}),t,(0,C.jsx)("div",{style:e,children:(0,C.jsx)(na,{})}),t,(0,C.jsxs)("div",{style:e,children:[(0,C.jsx)(ao,{}),(0,C.jsx)(ro,{})]})]})};var ce=A(ne(),1);var Ve=A(ne(),1),ua=A(lt(),1);var Ie=A(D(),1),da=({isOpen:e,initialUrl:t,onConfirm:n,onRemove:a,onClose:r})=>{let o=be(gt),i=(0,Ve.useRef)(null),[d,l]=(0,Ve.useState)(""),g=t!=="",{x:u,y:f,strategy:y,refs:b}=Ce({placement:"top",whileElementsMounted:Se,middleware:[Re(8),Ae(),Te({padding:8})]});(0,Ve.useEffect)(()=>{if(!e)return;let s=window.getSelection();if(s&&s.rangeCount>0){let m=s.getRangeAt(0);b.setReference({getBoundingClientRect:()=>m.getBoundingClientRect()})}l(t);let p=window.setTimeout(()=>{i.current?.focus(),i.current?.select()},0);return()=>{window.clearTimeout(p)}},[e,t,b]);let R=()=>{n(d.trim())},c=s=>{s.key==="Enter"?(s.preventDefault(),R()):s.key==="Escape"&&(s.preventDefault(),r())};return e?(0,ua.createPortal)((0,Ie.jsxs)(Ye,{ref:b.setFloating,style:{position:y,top:f??0,left:u??0,zIndex:9999,backgroundColor:o.backgroundSecondary,borderRadius:"var(--radius-md)",boxShadow:`0 3px 12px ${o.shadowMedium}`,padding:"8px",display:"flex",gap:"8px",alignItems:"center"},onMouseDown:s=>s.preventDefault(),children:[(0,Ie.jsx)("input",{ref:i,type:"text",value:d,onChange:s=>l(s.target.value),onKeyDown:c,placeholder:"\u7C98\u8D34\u6216\u8F93\u5165\u94FE\u63A5...",style:{background:o.backgroundTertiary,border:`1px solid ${o.border}`,color:o.text,borderRadius:"var(--radius-sm)",padding:"6px 10px",fontSize:"var(--fontSize-base)",width:"240px",outline:"none"}}),(0,Ie.jsx)($,{reversed:!0,active:!0,role:"button",tabIndex:0,title:"\u786E\u8BA4\u94FE\u63A5","aria-label":"\u786E\u8BA4\u94FE\u63A5",onClick:R,children:(0,Ie.jsx)(gn,{size:20,color:o.textSecondary,"aria-hidden":"true"})}),g&&(0,Ie.jsx)($,{reversed:!0,active:!0,role:"button",tabIndex:0,title:"\u79FB\u9664\u94FE\u63A5","aria-label":"\u79FB\u9664\u94FE\u63A5",onClick:a,children:(0,Ie.jsx)(xe,{size:16,color:o.textSecondary,"aria-hidden":"true"})})]}),document.body):null};var ee=A(D(),1),uo={bold:"\u7C97\u4F53",italic:"\u659C\u4F53",underline:"\u4E0B\u5212\u7EBF"},jt=({format:e,icon:t})=>{let n=W(),a=tt(n,e),r=uo[e]||e;return(0,ee.jsx)($,{reversed:!0,active:a,role:"button",tabIndex:0,title:r,"aria-label":r,"aria-pressed":a,onMouseDown:o=>{o.preventDefault(),le(n,e)},children:(0,ee.jsx)(t,{size:16,"aria-hidden":"true"})})},pa=()=>{let e=W(),t=ht(),{x:n,y:a,strategy:r,refs:o}=Ce({placement:"top",whileElementsMounted:Se,middleware:[Re(8),Ae(),Te({padding:8})]}),[i,d]=(0,ce.useState)(!1),[l,g]=(0,ce.useState)(!1),[u,f]=(0,ce.useState)(null);(0,ce.useEffect)(()=>{let{selection:p}=e,m=!!(p&&t&&!i&&!X.isCollapsed(p)&&k.string(e,p)!=="");if(g(m),m){let h=window.getSelection();if(h&&h.rangeCount>0){let w=h.getRangeAt(0);o.setReference({getBoundingClientRect:()=>w.getBoundingClientRect()})}}},[e.selection,t,i,o,e]);let y=(0,ce.useCallback)(()=>{let[p]=k.nodes(e,{match:m=>T(m)&&m.type==="link",at:e.selection||void 0});return p?p[0].url:""},[e]),b=(0,ce.useCallback)(()=>{e.selection&&(f(e.selection),d(!0))},[e]),R=(0,ce.useCallback)(()=>{d(!1),u&&(_.focus(e),v.select(e,u)),f(null)},[e,u]),c=(0,ce.useCallback)(p=>{u&&(v.select(e,u),Ee.toggleLink(e,p),R())},[e,u,R]),s=(0,ce.useCallback)(()=>{u&&(v.select(e,u),Ee.toggleLink(e),R())},[e,u,R]);return(0,ee.jsxs)(ee.Fragment,{children:[(0,ee.jsx)(ea,{children:l&&(0,ee.jsxs)(Ye,{ref:o.setFloating,style:{position:r,top:a??0,left:n??0,padding:"6px 8px",zIndex:9998,backgroundColor:"#222",borderRadius:"6px",transition:"opacity 0.2s",display:"flex",gap:"4px"},onMouseDown:p=>p.preventDefault(),children:[(0,ee.jsx)(jt,{format:"bold",icon:pt}),(0,ee.jsx)(jt,{format:"italic",icon:dt}),(0,ee.jsx)(jt,{format:"underline",icon:ct}),(0,ee.jsx)($,{reversed:!0,active:Ee.isLinkActive(e),role:"button",tabIndex:0,title:"\u94FE\u63A5","aria-label":"\u94FE\u63A5","aria-pressed":Ee.isLinkActive(e),onMouseDown:p=>{p.preventDefault(),b()},children:(0,ee.jsx)(an,{size:16,"aria-hidden":"true"})})]})}),(0,ee.jsx)(da,{isOpen:i,onConfirm:c,onRemove:s,onClose:R,initialUrl:y()})]})};var Ct=A(ne(),1);var ga=A(lt(),1);var U=A(D(),1),ma=()=>{let e=W(),{x:t,y:n,refs:a,strategy:r,context:o}=Ce({whileElementsMounted:Se,placement:"right-start",middleware:[Re(12),Ae(),Te()]}),[i,d]=(0,Ct.useState)(!1);(0,Ct.useEffect)(()=>{let{selection:u}=e,f=!!(u&&_.isFocused(e)&&Ge(e));if(d(f),f){let[y]=k.nodes(e,{match:b=>T(b)&&b.type==="table"});if(y){let b=_.toDOMNode(e,y[0]);a.setReference(b)}}},[e,e.selection,a]);let l={display:"flex",flexDirection:"column",gap:"var(--space-1)"},g=i?(0,U.jsxs)("div",{ref:a.setFloating,onMouseDown:u=>u.preventDefault(),style:{position:r,top:n??0,left:t??0,zIndex:20,backgroundColor:"var(--background)",borderRadius:"var(--space-2)",boxShadow:"0 4px 12px var(--shadowHeavy)",padding:"var(--space-2)",display:"flex",flexDirection:"column",gap:"var(--space-2)",transition:"opacity 0.15s ease-in-out"},children:[(0,U.jsxs)("div",{style:l,children:[(0,U.jsxs)($,{onClick:()=>Dt(e,"above"),children:[(0,U.jsx)(fn,{size:16,style:{marginRight:"var(--space-2)"},"aria-hidden":"true"})," ","\u63D2\u5165\u4E0A\u65B9\u884C"]}),(0,U.jsxs)($,{onClick:()=>Dt(e,"below"),children:[(0,U.jsx)(yn,{size:16,style:{marginRight:"var(--space-2)"},"aria-hidden":"true"})," ","\u63D2\u5165\u4E0B\u65B9\u884C"]})]}),(0,U.jsxs)("div",{style:l,children:[(0,U.jsxs)($,{onClick:()=>Ot(e,"left"),children:[(0,U.jsx)(bn,{size:16,style:{marginRight:"var(--space-2)"},"aria-hidden":"true"})," ","\u63D2\u5165\u5DE6\u4FA7\u5217"]}),(0,U.jsxs)($,{onClick:()=>Ot(e,"right"),children:[(0,U.jsx)(hn,{size:16,style:{marginRight:"var(--space-2)"},"aria-hidden":"true"})," ","\u63D2\u5165\u53F3\u4FA7\u5217"]})]}),(0,U.jsx)("div",{style:{borderTop:"1px solid var(--border)",margin:"var(--space-1) 0"}}),(0,U.jsxs)("div",{style:l,children:[(0,U.jsxs)($,{onClick:()=>Jn(e),children:[(0,U.jsx)(en,{size:16,style:{marginRight:"var(--space-2)"},"aria-hidden":"true"})," ","\u5220\u9664\u884C"]}),(0,U.jsxs)($,{onClick:()=>Qn(e),children:[(0,U.jsx)(dn,{size:16,style:{marginRight:"var(--space-2)"},"aria-hidden":"true"})," ","\u5220\u9664\u5217"]}),(0,U.jsxs)($,{onClick:()=>er(e),children:[(0,U.jsx)(xe,{size:16,style:{marginRight:"var(--space-2)"},"aria-hidden":"true"})," ","\u5220\u9664\u8868\u683C"]})]})]}):null;return typeof document>"u"?null:(0,ga.createPortal)(g,document.body)};function Lt(e){return e.some(t=>{if(!T(t))return!1;if(t.type===ue)return t.preview!=="true";let n=t.children;return Array.isArray(n)&&Lt(n)})}var fa=()=>{let e=[];return Object.entries(Hn).forEach(([t,n])=>{dr(t)&&e.push({id:t,label:t,type:"tool",description:n.description})}),e};var q=A(D(),1),ha=e=>{let n=e.map(a=>se.string(a)).join(`
`).match(/[a-zA-Z0-9]+|[\u4e00-\u9fa5]/g);return n?n.length:0},po=(e,t)=>{let{selection:n}=e;if(!n)return{isFocused:t,isCollapsed:!0,anchorPath:[],anchorOffset:0,focusPath:[],focusOffset:0,selectedText:null,blockType:null};let a=k.above(e,{at:n.anchor,match:r=>k.isBlock(e,r)});return{isFocused:t,isCollapsed:X.isCollapsed(n),anchorPath:[...n.anchor.path],anchorOffset:n.anchor.offset,focusPath:[...n.focus.path],focusOffset:n.focus.offset,selectedText:X.isCollapsed(n)?null:k.string(e,n).slice(0,200),blockType:a&&Pe.isElement(a[0])?a[0].type:null}},go=({initialValue:e,readOnly:t=!1,onChange:n,isStreaming:a=!1,autoFocus:r=!1,onBlur:o,onCompositionChange:i,onWordCountChange:d})=>{let l=(0,M.useMemo)(()=>Sr(),[]),g=je(),u=(0,M.useRef)(!1);(0,M.useEffect)(()=>{if(!(t||!r)){if(l.children&&l.children.length>0){let E=k.end(l,[]);v.select(l,E)}_.focus(l)}},[l,t,r]);let f=be(Fn),y=be(In),[b,R]=(0,M.useState)(()=>ha(e));(0,M.useEffect)(()=>{d?.(b)},[b,d]);let[c,s]=(0,M.useState)(0),[p,m]=(0,M.useState)(()=>Lt(e)),[h,w]=(0,M.useState)(!1),[F,x]=(0,M.useState)(!1),[I,O]=(0,M.useState)(null),[te,me]=(0,M.useState)({options:[],index:0}),ie=te.options,z=te.index,[re,Ne]=(0,M.useState)(""),[B,G]=(0,M.useState)("all"),J=(0,M.useCallback)(E=>{_n(po(l,E))},[l]),ke=zn(),Z=jn(),ot=Nn(),ae=Un(),[ve,Me]=(0,M.useState)([]);(0,M.useEffect)(()=>{if(!ae||ae.length===0){Me([]);return}let E=!1;return(async()=>{let N=await Promise.all(ae.map(async L=>{try{let j=await g(An({dbKey:L})).unwrap();if(!j||E)return null;let we=xn(j.name)||L;return{agentKey:L,name:we,description:j.description||j.introduction||void 0}}catch{return{agentKey:L,name:L}}}));E||Me(N.filter(L=>L!==null))})(),()=>{E=!0}},[ae,g]);let De=(0,M.useMemo)(()=>{let E=[];return E.push(...fa()),Z?.contents&&Object.entries(Z.contents).forEach(([P,N])=>{if(N){let L=N;E.push({id:L.contentKey||P,label:L.title||"Untitled",type:"page",description:`File in ${Z.name}`})}}),ke&&ke.forEach(P=>{let N=P;E.push({id:N.spaceId,label:N.spaceName,type:"space",description:`Space \u2022 ${N.role}`})}),ve.forEach(P=>{E.push({id:P.agentKey,label:P.name,type:"agent",description:P.description})}),E},[ke,Z,ve]);(0,M.useEffect)(()=>{if(!I)return;let E=re.toLowerCase(),N=B;E.startsWith("page ")?(N="page",E=E.slice(5)):E.startsWith("space ")?(N="space",E=E.slice(6)):E.startsWith("agent ")?(N="agent",E=E.slice(6)):E.startsWith("tool ")&&(N="tool",E=E.slice(5)),N!==B&&G(N);let L=De.filter(j=>j.label.toLowerCase().includes(E)||j.description?.toLowerCase().includes(E));N!=="all"&&(L=L.filter(j=>j.type===N)),N==="all"&&L.sort((j,fe)=>{let we={agent:4,space:3,page:2,tool:1},Ue=we[j.type]||0,He=we[fe.type]||0;return Ue!==He?He-Ue:0}),me({options:L,index:0})},[re,De,B,I]);let qe=Ir(l),Ze=Or(l),Oe=(0,M.useMemo)(()=>!a&&p,[a,p]),$e=(0,M.useCallback)(E=>(0,q.jsx)(Xr,{...E,isStreaming:a,highlightEnabled:Oe,readOnly:t}),[a,Oe,t]),Ft=(0,M.useCallback)(E=>{let P=l.operations.some(L=>L.type!=="set_selection");if(console.log("[NoloEditor] handleChange called",{isAstChange:P,isComposing:u.current,operations:l.operations.map(L=>L.type),selection:l.selection}),J(!0),!P){console.log("[NoloEditor] handleChange -> not AST change, return");return}if(s(L=>L+1),m(Lt(E)),R(ha(E)),u.current){console.log("[NoloEditor] handleChange -> in composition, skip external onChange");return}console.log("[NoloEditor] handleChange -> call onChange",{selectionAfter:l.selection});let{selection:N}=l;if(N&&X.isCollapsed(N)){let[L]=X.edges(N),j=k.above(l,{at:L,match:fe=>k.isBlock(l,fe)});if(j){let[,fe]=j,Ue={anchor:k.start(l,fe),focus:L},He=k.string(l,Ue),it=He.lastIndexOf("@"),st=it!==-1?He.slice(it):null;if(st&&/^@[^\s]*$/.test(st)){let Wt=it>0?He[it-1]:null;if(Wt===null||/\s/.test(Wt)){let wa=st.length,Yt=k.before(l,L,{distance:wa,unit:"character"});Yt?(O({anchor:Yt,focus:L}),Ne(st.slice(1)),me(It=>It.index===0?It:{...It,index:0})):O(null)}else O(null)}else O(null)}else O(null)}else O(null);n?.(E)},[l,n,J]),Xe=(0,M.useCallback)(E=>{switch(E.inputType){case"formatBold":E.preventDefault(),le(l,"bold");break;case"formatItalic":E.preventDefault(),le(l,"italic");break;case"formatUnderline":E.preventDefault(),le(l,"underline");break;default:break}},[l]),Kt=(0,M.useCallback)(E=>{if(!t&&(E.key==="Backspace"||E.key==="Delete")){let{selection:P}=l;if(P&&X.isCollapsed(P)){let[N]=k.nodes(l,{at:P,match:L=>!k.isEditor(L)&&Pe.isElement(L)&&L.type==="image"});if(N){E.preventDefault();let[,L]=N;v.removeNodes(l,{at:L});return}}}Ze(E)},[l,Ze,t]),ba=(0,M.useCallback)(E=>{if(I&&ie.length>0)switch(E.key){case"ArrowDown":E.preventDefault();let P=z>=ie.length-1?0:z+1;me(L=>({...L,index:P}));return;case"ArrowUp":E.preventDefault();let N=z<=0?ie.length-1:z-1;me(L=>({...L,index:N}));return;case"Tab":case"Enter":E.preventDefault(),ie[z]&&(Gt(l,ie[z],I),O(null));return;case"Escape":E.preventDefault(),O(null);return;case"ArrowRight":case"ArrowLeft":break}Kt(E)},[Kt,I,z,ie,l]),Gt=(E,P,N)=>{v.select(E,N);let L={type:"mention",resourceType:P.type,resourceId:P.id,label:P.label,children:[{text:""}]};v.insertNodes(E,L),v.move(E)},ya=(0,M.useCallback)(E=>{if(t)return;let{dataTransfer:P}=E;if(!P)return;let N=Array.from(E.dataTransfer.types||[]),L=N.includes("Files"),j=N.includes("application/x-slate-fragment");!L||j||(E.preventDefault(),E.stopPropagation(),w(!0))},[t]),Ea=(0,M.useCallback)(()=>{h&&w(!1)},[h]),ka=(0,M.useCallback)(async E=>{if(t)return;let{dataTransfer:P}=E;if(!P)return;let N=Array.from(E.dataTransfer.types||[]),L=N.includes("Files"),j=N.includes("application/x-slate-fragment");if(!L||j)return;E.preventDefault(),E.stopPropagation(),w(!1);let fe=Tn(Array.from(E.dataTransfer.files||[]));if(!fe.length)return;let we=_.findEventRange(l,E);we&&v.select(l,we);for(let Ue of fe)await Tt(l,g,Ue,ot||void 0)},[g,l,t,ot]),va=(0,M.useMemo)(()=>jr(y),[y]);return(0,q.jsxs)("div",{className:["nolo-editor-container",!t&&F?"nolo-editor-container--focused":""].filter(Boolean).join(" "),children:[(0,q.jsxs)(qn,{editor:l,initialValue:e,onChange:Ft,children:[!t&&(0,q.jsxs)("div",{className:"toolbar-container",children:[(0,q.jsx)(ca,{}),(0,q.jsx)(pa,{}),(0,q.jsx)(ma,{}),(0,q.jsx)(zr,{target:I,options:ie,selectedIndex:z,category:B,onCategoryChange:G,onSelect:E=>{I&&(Gt(l,E,I),O(null),G("all"))}})]}),(0,q.jsx)(Nr,{highlightEnabled:Oe,docVersion:c}),(0,q.jsx)(Vn,{renderPlaceholder:({attributes:E})=>(0,q.jsx)("div",{...E,children:(0,q.jsx)(Kr,{})}),readOnly:t,decorate:qe,renderElement:$e,renderLeaf:Gr,onKeyDown:ba,onDOMBeforeInput:Xe,onDrop:ka,onDragOver:ya,onDragLeave:Ea,onBlur:()=>{x(!1),J(!1),o?.()},onFocus:()=>{x(!0),J(!0)},onCompositionStart:()=>{u.current=!0,x(!0),J(!0),i?.(!0)},onCompositionEnd:()=>{u.current=!1,x(!0),J(!0),i?.(!1),n?.(l.children)},style:h?{backgroundColor:"color-mix(in srgb, var(--primary) 6%, transparent)",transition:"background-color 0.15s ease-out"}:void 0}),(0,q.jsx)("style",{children:va})]}),!t&&f&&!d&&(0,q.jsxs)("div",{className:"word-count-display",children:[b," \u5B57"]}),(0,q.jsx)("style",{children:mo})]})},Kc=go,mo=`
  .nolo-editor-container {
    position: relative;
    padding: var(--space-1) 0;
    /* Full-bleed document canvas \u2014 no card/input chrome around the body. */
  }

  .toolbar-container {
    position: sticky;
    top: var(--space-2);
    margin-bottom: var(--space-2);
    padding: var(--space-1);
    z-index: 10;
  }

  .nolo-editor-container [data-slate-editor] {
    font-size: var(--fontSize-base);
    line-height: var(--leading-relaxed);
    color: var(--text);
    -webkit-text-size-adjust: 100%;
    outline: none;
    border: 0;
    border-radius: 0;
    background: transparent;
    padding: 0;
    /* Tall empty surface so empty pages feel like full-page writing, not a strip. */
    min-height: min(52vh, 28rem);
    /* Brighter caret for focus signal (no box ring). */
    caret-color: color-mix(in srgb, var(--primary) 72%, #0ea5e9 28%);
  }

  .nolo-editor-container [data-slate-editor]::selection,
  .nolo-editor-container [data-slate-editor] *::selection {
    background: color-mix(in srgb, var(--primary) 28%, transparent);
    color: inherit;
  }

  .nolo-editor-container a {
    color: var(--primary);
    text-decoration: none;
    cursor: pointer;
  }

  .nolo-editor-container a:hover {
    text-decoration: underline;
  }

  .inline-code {
    font-family:
      var(--font-mono, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
      "Courier New", monospace);
    background-color: var(--backgroundSecondary);
    color: var(--primary);
    padding: 0.1em 0.35em;
    border-radius: var(--radius-sm);
    font-size: 0.85em;
    border: 1px solid var(--border);
  }

  .word-count-display {
    position: absolute;
    right: var(--space-2, 8px);
    bottom: var(--space-1, 4px);
    font-size: 11px;
    font-weight: 400;
    color: var(--textQuaternary, var(--textTertiary, #a1a1aa));
    letter-spacing: 0.02em;
    user-select: none;
    opacity: 0.4;
    transition: opacity 0.2s ease;
    z-index: 2;
  }

  .word-count-display:hover {
    opacity: 0.85;
  }

  @media (max-width: 768px) {
    .nolo-editor-container {
      padding: 0;
    }

    .nolo-editor-container [data-slate-editor] {
      font-size: var(--fontSize-base);
      line-height: var(--leading-normal);
      min-height: min(48vh, 22rem);
    }

    .toolbar-container {
      padding: var(--space-1);
      margin-bottom: var(--space-1);
    }

    .inline-code {
      padding: 0.12em 0.35em;
      font-size: 0.9em;
    }

    .word-count-display {
      margin-top: var(--space-1);
    }
  }
`;export{Yr as a,qr as b,Zr as c,Kc as d};
