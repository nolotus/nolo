import { describe, expect, it } from "bun:test";
import { buildEditingContextSummary } from "./buildEditingContext";

describe("buildEditingContextSummary", () => {
  it("tells the agent to wrap row fields inside values when adding a table row", () => {
    const summary = buildEditingContextSummary(
      {
        table: {
          currentTable: {
            tableId: "table-1",
            displayName: "反馈表",
            description: "记录用户反馈",
            tags: [],
            columns: [{ name: "content", label: "反馈内容", required: true }],
          },
          rows: [],
        },
        doc: {},
      } as any,
      {
        editingTarget: {
          kind: "table",
          key: "meta-tenant-1-table-1",
          metadata: {
            focusContext: {
              columnName: "content",
              rowIndex: 0,
              rowTitle: "第一条反馈",
              cellPreview: "这个功能很好用",
            },
          },
        },
      },
    );

    expect(summary).toContain("当前单元格列: content");
    expect(summary).toContain("当前行标题: 第一条反馈");
    expect(summary).toContain('{"values":{"title":"修 Bug #123","status":"todo","note":"高优先级"}}');
    expect(summary).not.toContain('例如：{"title": "修 Bug #123", "status": "todo", "note": "高优先级"}。');
  });

  it("describes document focus when selection metadata is available", () => {
    const summary = buildEditingContextSummary(
      {
        table: {},
        doc: {
          title: "产品发布说明",
        },
      } as any,
      {
        editingTarget: {
          kind: "page",
          key: "page-1",
          metadata: {
            focusContext: {
              isCollapsed: false,
              blockType: "paragraph",
              selectedText: "我们计划在下周发布",
              anchorPath: [2, 0],
            },
          },
        },
      }
    );

    expect(summary).toContain("当前选中文本: 我们计划在下周发布");
    expect(summary).toContain("当前块类型: paragraph");
    expect(summary).toContain("优先围绕该局部位置做定点改写");
  });

  it("describes app editing targets with appId, framework and reuse guidance", () => {
    const summary = buildEditingContextSummary(
      {
        table: {},
        doc: {},
      } as any,
      {
        editingTarget: {
          kind: "app",
          key: "01APP123",
          title: "数据看板",
          summary: "这是一个包含图表和筛选器的内部应用。",
          metadata: {
            framework: "react-spa",
            appUrl: "https://nolo.chat/apps/01APP123/",
            fileNames: ["main.tsx", "App.tsx", "components/Chart.tsx"],
            externalImports: ["react", "echarts-for-react"],
          },
        },
      }
    );

    expect(summary).toContain("应用 ID: 01APP123");
    expect(summary).toContain("技术形态: react-spa");
    expect(summary).toContain("当前源码文件: main.tsx, App.tsx, components/Chart.tsx");
    expect(summary).toContain("先识别当前应用是否已有 theme / tokens / design system");
    expect(summary).toContain("默认先把命中的视觉值抽到最小 token 层");
    expect(summary).toContain("appDeploy 必须继续传同一个 appId");
    expect(summary).toContain('继续沿用 framework: "react-spa" + files');
    expect(summary).toContain("默认优先改设计 token 或命中的局部组件");
    expect(summary).toContain("先 appPreflight，再 appDeploy");
    expect(summary).toContain("图表改动约束（echarts）");
    expect(summary).toContain("设计系统与小改动约束（design-system）");
  });

  it("injects targeted app constraint packs for icons and leaflet", () => {
    const summary = buildEditingContextSummary(
      {
        table: {},
        doc: {},
      } as any,
      {
        editingTarget: {
          kind: "app",
          key: "01APPMAP",
          title: "地图应用",
          metadata: {
            framework: "react-spa",
            fileNames: ["main.tsx", "App.tsx", "components/Map.tsx"],
            externalImports: ["react", "react-icons/lu", "react-leaflet", "leaflet"],
          },
        },
      }
    );

    expect(summary).toContain("当前激活约束包");
    expect(summary).toContain("Lucide 图标安全规则（react-icons-lu）");
    expect(summary).toContain("只能使用 react-icons/lu 中真实存在的图标名");
    expect(summary).toContain("Leaflet 地图约束（leaflet）");
    expect(summary).toContain("不要手动 import leaflet.css");
    expect(summary).toContain("如果 preflight / deploy 失败，优先根据返回的 issues 做定点修复");
  });

  it("warns when app editing target has no source file list", () => {
    const summary = buildEditingContextSummary(
      {
        table: {},
        doc: {},
      } as any,
      {
        editingTarget: {
          kind: "app",
          key: "01APPLEGACY",
          title: "旧应用",
          metadata: {
            framework: "worker",
            appUrl: "https://nolo.chat/apps/01APPLEGACY/",
            fileNames: [],
          },
        },
      }
    );

    expect(summary).toContain("未提供多文件清单");
    expect(summary).toContain("部署产物 / 打包 bundle");
    expect(summary).toContain("禁止在未告知用户风险的情况下整站重写");
  });

  it("describes image targets with lightweight object guidance", () => {
    const summary = buildEditingContextSummary(
      {
        table: {},
        doc: {},
      } as any,
      {
        editingTarget: {
          kind: "image",
          key: "image-1",
          title: "封面图",
          metadata: {
            fileId: "file-image-1",
            url: "https://example.com/image.png",
          },
        },
      }
    );

    expect(summary).toContain("当前编辑目标：一个图片对象");
    expect(summary).toContain("对象 key: image-1");
    expect(summary).toContain("标题: 封面图");
    expect(summary).toContain("fileId: file-image-1");
  });

  it("describes selected canvas node targets for precise updateNode edits", () => {
    const summary = buildEditingContextSummary(
      {
        table: {},
        doc: {},
      } as any,
      {
        editingTarget: {
          kind: "canvas_node",
          key: "metric-csat",
          title: "metric-csat",
          metadata: {
            selectedNodeId: "metric-csat",
            part: "metric-csat",
            path: ["root", "shell", "metric-grid", "metric-csat"],
            type: "MetricCard",
            props: { title: "客户满意度", value: "94.2%" },
            style: {},
          },
        },
      }
    );

    expect(summary).toContain("当前编辑目标：Canvas Tree 中的一个选中节点");
    expect(summary).toContain("节点 ID: metric-csat");
    expect(summary).toContain("节点路径: root > shell > metric-grid > metric-csat");
    expect(summary).toContain("只输出 updateNode");
    expect(summary).toContain('"title": "客户满意度"');
  });
});
