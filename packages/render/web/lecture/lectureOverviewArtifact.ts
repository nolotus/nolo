export const LECTURE_OVERVIEW_ARTIFACT_CODE = `function Example() {
  const result = useArtifactData() || {};
  const source = result.source || {};
  const segments = result.segments || [];
  const outline = result.outline || [];
  const points = result.keyPoints || [];
  const trims = result.trimSuggestions || [];
  const placeholder = { color: "inherit", opacity: 0.72, fontSize: 14, padding: "12px 0" };
  const outlineTree = {
    name: source.name || "课程",
    children: outline.map(node => ({ name: node.title, value: node.startSec, children: (node.children || []).map(child => ({ name: child.title, value: child.startSec })) }))
  };
  const chart = {
    tooltip: { trigger: "item" },
    series: [{
      type: "tree",
      data: [outlineTree],
      top: "5%", left: "8%", bottom: "5%", right: "20%",
      symbolSize: 10,
      label: { position: "left", verticalAlign: "middle", align: "right" },
      leaves: { label: { position: "right", align: "left" } },
      expandAndCollapse: true,
      animationDuration: 250
    }]
  };
  const seek = sec => emitArtifactEvent("seek", { sec });
  return <div style={{fontFamily:"sans-serif",padding:16,color:"#172033"}}>
    <h2>课程概览 · {source.name}</h2>
    <h3>时间轴</h3>
    {segments.length === 0 ? <p data-testid="lecture-timeline-empty" style={placeholder}>暂无时间轴数据</p> :
    <div data-testid="lecture-timeline" style={{display:"flex",height:32,position:"relative",borderRadius:8,overflow:"hidden"}}>
      {segments.map(segment => <button key={segment.id} aria-label={segment.label + " " + segment.startSec} onClick={() => seek(segment.startSec)} style={{flex:Math.max(.01,segment.endSec-segment.startSec),background:segment.label === "lecture" ? "#4f7cff" : "#aab2c0",border:trims.some(trim => trim.fromSec < segment.endSec && trim.toSec > segment.startSec) ? "2px dashed #d97706" : 0,cursor:"pointer"}} />)}
    </div>}
    <h3>课程大纲</h3>
    {outline.length === 0 ? <p data-testid="lecture-outline-empty" style={placeholder}>本档位未生成大纲（选择含大纲的档位可补充）</p> :
    <div data-testid="lecture-outline"><ReactECharts option={chart} style={{height:260}} onEvents={{click: params => seek(Number(params.data && params.data.value) || 0)}} /></div>}
    <h3>重点</h3>
    {points.length === 0 ? <p data-testid="lecture-key-points-empty" style={placeholder}>暂无重点</p> :
    <div data-testid="lecture-key-points" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8}}>
      {points.map((point,index) => { const segment = segments.find(item => item.id === (point.segmentIds || [])[0]); return <button key={index} onClick={() => seek(segment ? segment.startSec : 0)} style={{padding:12,textAlign:"left",border:"1px solid #dbe2ee",borderRadius:8,background:"white"}}>{point.text}</button>; })}
    </div>}
  </div>;
}`;
