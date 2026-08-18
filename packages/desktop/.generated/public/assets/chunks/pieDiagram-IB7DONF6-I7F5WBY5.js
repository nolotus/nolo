import{a as q}from"/public/assets/chunks/chunk-5MDTKJHH.js";import{a as j}from"/public/assets/chunks/chunk-AXDJH4PY.js";import{a as H}from"/public/assets/chunks/chunk-UE42M5D2.js";import"/public/assets/chunks/chunk-YALHLDAG.js";import"/public/assets/chunks/chunk-GJUHL4LG.js";import"/public/assets/chunks/chunk-ZOKP5DDU.js";import"/public/assets/chunks/chunk-BW7U2Z5X.js";import"/public/assets/chunks/chunk-56T3SGXN.js";import{M as V,N as Z}from"/public/assets/chunks/chunk-4GJWQWD5.js";import"/public/assets/chunks/chunk-ZIKCFDIC.js";import{Da as D,Ga as U,O as G,S as O,T as W,U as M,V as P,W as R,X as I,Y as L,Z as N,h as i,j as m,ka as B,v as F}from"/public/assets/chunks/chunk-2ZRVNTY6.js";import"/public/assets/chunks/chunk-2TYVOXR5.js";import"/public/assets/chunks/chunk-JUWUH22W.js";import"/public/assets/chunks/chunk-HA3VNNOB.js";var J=F.pie,w={sections:new Map,showData:!1,config:J},h=w.sections,y=w.showData,oe=structuredClone(J),ne=i(()=>structuredClone(oe),"getConfig"),se=i(()=>{h=new Map,y=w.showData,O()},"clear"),le=i(({label:e,value:t})=>{h.has(e)||(h.set(e,t),m.debug(`added new section: ${e}, with value: ${t}`))},"addSection"),ce=i(()=>h,"getSections"),de=i(e=>{y=e},"setShowData"),pe=i(()=>y,"getShowData"),K={getConfig:ne,clear:se,setDiagramTitle:I,getDiagramTitle:L,setAccTitle:W,getAccTitle:M,setAccDescription:P,getAccDescription:R,addSection:le,getSections:ce,setShowData:de,getShowData:pe},ge=i((e,t)=>{q(e,t),t.setShowData(e.showData),e.sections.map(t.addSection)},"populateDb"),fe={parse:i(async e=>{let t=await H("pie",e);m.debug(t),ge(t,K)},"parse")},ue=i(e=>`
  .pieCircle{
    stroke: ${e.pieStrokeColor};
    stroke-width : ${e.pieStrokeWidth};
    opacity : ${e.pieOpacity};
  }
  .pieOuterCircle{
    stroke: ${e.pieOuterStrokeColor};
    stroke-width: ${e.pieOuterStrokeWidth};
    fill: none;
  }
  .pieTitleText {
    text-anchor: middle;
    font-size: ${e.pieTitleTextSize};
    fill: ${e.pieTitleTextColor};
    font-family: ${e.fontFamily};
  }
  .slice {
    font-family: ${e.fontFamily};
    fill: ${e.pieSectionTextColor};
    font-size:${e.pieSectionTextSize};
    // fill: white;
  }
  .legend text {
    fill: ${e.pieLegendTextColor};
    font-family: ${e.fontFamily};
    font-size: ${e.pieLegendTextSize};
  }
`,"getStyles"),me=ue,he=i(e=>{let t=[...e.entries()].map(o=>({label:o[0],value:o[1]})).sort((o,s)=>s.value-o.value);return U().value(o=>o.value)(t)},"createPieArcs"),Se=i((e,t,Q,o)=>{m.debug(`rendering pie chart
`+e);let s=o.db,T=N(),$=Z(s.getConfig(),T.pie),A=40,n=18,p=4,l=450,S=l,v=j(t),c=v.append("g");c.attr("transform","translate("+S/2+","+l/2+")");let{themeVariables:a}=T,[_]=V(a.pieOuterStrokeWidth);_??(_=2);let E=$.textPosition,g=Math.min(S,l)/2-A,X=D().innerRadius(0).outerRadius(g),Y=D().innerRadius(g*E).outerRadius(g*E);c.append("circle").attr("cx",0).attr("cy",0).attr("r",g+_/2).attr("class","pieOuterCircle");let b=s.getSections(),x=he(b),ee=[a.pie1,a.pie2,a.pie3,a.pie4,a.pie5,a.pie6,a.pie7,a.pie8,a.pie9,a.pie10,a.pie11,a.pie12],d=B(ee);c.selectAll("mySlices").data(x).enter().append("path").attr("d",X).attr("fill",r=>d(r.data.label)).attr("class","pieCircle");let k=0;b.forEach(r=>{k+=r}),c.selectAll("mySlices").data(x).enter().append("text").text(r=>(r.data.value/k*100).toFixed(0)+"%").attr("transform",r=>"translate("+Y.centroid(r)+")").style("text-anchor","middle").attr("class","slice"),c.append("text").text(s.getDiagramTitle()).attr("x",0).attr("y",-(l-50)/2).attr("class","pieTitleText");let C=c.selectAll(".legend").data(d.domain()).enter().append("g").attr("class","legend").attr("transform",(r,f)=>{let u=n+p,ae=u*d.domain().length/2,re=12*n,ie=f*u-ae;return"translate("+re+","+ie+")"});C.append("rect").attr("width",n).attr("height",n).style("fill",d).style("stroke",d),C.data(x).append("text").attr("x",n+p).attr("y",n-p).text(r=>{let{label:f,value:u}=r.data;return s.getShowData()?`${f} [${u}]`:f});let te=Math.max(...C.selectAll("text").nodes().map(r=>r?.getBoundingClientRect().width??0)),z=S+A+n+p+te;v.attr("viewBox",`0 0 ${z} ${l}`),G(v,l,z,$.useMaxWidth)},"draw"),ve={draw:Se},$e={parser:fe,db:K,renderer:ve,styles:me};export{$e as diagram};
