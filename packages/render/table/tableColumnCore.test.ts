// 文件: render/table/tableColumnCore.test.ts
//
// 纯函数单测：不装 Redux store、不 mock dispatch、不碰 db。
// 这正是把列操作剥成 core 的主要收益。

import { describe, expect, test } from "bun:test";
import {
  addColumnOptionInMeta,
  addColumnToMeta,
  assertTableMeta,
  deleteColumnFromMeta,
  renameColumnInMeta,
  renameColumnLabelInMeta,
  reorderColumnInMeta,
  reorderList,
  updateColumnWidthInMeta,
} from "./tableColumnCore";
import type { TableMeta } from "./types";
import { DataType } from "create/types";

const NOW = "2026-08-09T00:00:00+08:00";
const OLD = "2026-01-01T00:00:00+08:00";

const makeMeta = (): TableMeta => ({
  dbKey: "table-meta-1",
  tenantId: "t1",
  tableId: "tb1",
  displayName: "任务表",
  type: DataType.TABLE,
  createdAt: OLD,
  updatedAt: OLD,
  columns: [
    { id: "c1", name: "title", label: "标题" },
    { id: "c2", name: "status", label: "状态" },
    { id: "c3", name: "owner", label: "负责人" },
  ],
});

const makeRows = () => [
  { dbKey: "row-1", title: "A", status: "todo", owner: "me" },
  { dbKey: "row-2", title: "B", status: "done" }, // 无 owner 字段
];

/** 断言 core 返回成功并取出 value，失败时直接让测试报错。 */
function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!r.ok) throw new Error(`expected ok, got error: ${r.error}`);
  return r.value;
}

/** 断言 core 返回失败并取出错误信息。 */
function unwrapErr(r: { ok: boolean; error?: string }): string {
  if (r.ok) throw new Error("expected error, got ok");
  return r.error as string;
}

describe("reorderList", () => {
  test("向后移动元素并顺延其余项", () => {
    expect(reorderList([1, 2, 3, 4], 0, 2)).toEqual([2, 3, 1, 4]);
  });

  test("向前移动元素", () => {
    expect(reorderList([1, 2, 3, 4], 3, 1)).toEqual([1, 4, 2, 3]);
  });

  test("不修改入参数组", () => {
    const src = [1, 2, 3];
    reorderList(src, 0, 2);
    expect(src).toEqual([1, 2, 3]);
  });
});

describe("assertTableMeta", () => {
  test("meta 为 null 时报错", () => {
    expect(unwrapErr(assertTableMeta(null, "t1", "tb1"))).toBe(
      "当前没有加载对应的表定义"
    );
  });

  test("tenantId / tableId 不匹配时报错", () => {
    const meta = makeMeta();
    expect(unwrapErr(assertTableMeta(meta, "other", "tb1"))).toBe(
      "当前没有加载对应的表定义"
    );
    expect(unwrapErr(assertTableMeta(meta, "t1", "other"))).toBe(
      "当前没有加载对应的表定义"
    );
  });

  test("匹配时原样返回 meta", () => {
    const meta = makeMeta();
    expect(unwrap(assertTableMeta(meta, "t1", "tb1"))).toBe(meta);
  });
});

describe("addColumnToMeta", () => {
  const deps = { id: "c-new", nowIso: NOW };

  test("追加列并把 label 默认设为机器名", () => {
    const r = unwrap(addColumnToMeta(makeMeta(), { columnName: "due" }, deps));
    expect(r.meta.columns).toHaveLength(4);
    expect(r.meta.columns[3]).toEqual({
      id: "c-new",
      name: "due",
      label: "due",
    });
    expect(r.meta.updatedAt).toBe(NOW);
    expect(r.metaChanges.updatedAt).toBe(NOW);
    expect(r.noop).toBe(false);
  });

  test("空白字段名被拒绝", () => {
    expect(
      unwrapErr(addColumnToMeta(makeMeta(), { columnName: "   " }, deps))
    ).toBe("字段名不能为空");
  });

  test("重名字段被拒绝", () => {
    expect(
      unwrapErr(addColumnToMeta(makeMeta(), { columnName: "status" }, deps))
    ).toBe("字段 status 已存在");
  });

  test("不修改入参 meta", () => {
    const meta = makeMeta();
    addColumnToMeta(meta, { columnName: "due" }, deps);
    expect(meta.columns).toHaveLength(3);
    expect(meta.updatedAt).toBe(OLD);
  });
});

describe("deleteColumnFromMeta", () => {
  const deps = { nowIso: NOW };

  test("移除列，并只为含该字段的行生成 patch", () => {
    const r = unwrap(
      deleteColumnFromMeta(makeMeta(), makeRows(), { columnName: "owner" }, deps)
    );

    expect(r.meta.columns.map((c) => c.name)).toEqual(["title", "status"]);
    // row-2 没有 owner 字段，不应产生 patch
    expect(r.rowPatches).toEqual([
      { dbKey: "row-1", changes: { owner: null, updatedAt: NOW } },
    ]);
  });

  test("内存态 rows 删掉该字段，未受影响的行保持同一引用", () => {
    const rows = makeRows();
    const r = unwrap(
      deleteColumnFromMeta(makeMeta(), rows, { columnName: "owner" }, deps)
    );

    expect(r.rows[0]).toEqual({
      dbKey: "row-1",
      title: "A",
      status: "todo",
      updatedAt: NOW,
    });
    expect(r.rows[1]).toBe(rows[1]);
  });

  test("字段不存在时报错", () => {
    expect(
      unwrapErr(
        deleteColumnFromMeta(makeMeta(), makeRows(), { columnName: "ghost" }, deps)
      )
    ).toBe("字段 ghost 不存在");
  });
});

describe("reorderColumnInMeta", () => {
  const deps = { nowIso: NOW };

  test("调整顺序并刷新 updatedAt", () => {
    const r = unwrap(
      reorderColumnInMeta(makeMeta(), { fromIndex: 0, toIndex: 2 }, deps)
    );
    expect(r.meta.columns.map((c) => c.name)).toEqual([
      "status",
      "owner",
      "title",
    ]);
    expect(r.noop).toBe(false);
    expect(r.meta.updatedAt).toBe(NOW);
  });

  test("from === to 时标记 noop 且不改 updatedAt", () => {
    const meta = makeMeta();
    const r = unwrap(
      reorderColumnInMeta(meta, { fromIndex: 1, toIndex: 1 }, deps)
    );
    expect(r.noop).toBe(true);
    expect(r.meta).toBe(meta);
    expect(r.meta.updatedAt).toBe(OLD);
  });

  test("索引越界时报错", () => {
    const meta = makeMeta();
    for (const input of [
      { fromIndex: -1, toIndex: 0 },
      { fromIndex: 0, toIndex: 3 },
      { fromIndex: 3, toIndex: 0 },
    ]) {
      expect(unwrapErr(reorderColumnInMeta(meta, input, deps))).toBe(
        "列索引超出范围"
      );
    }
  });
});

describe("renameColumnInMeta", () => {
  const deps = { nowIso: NOW };

  test("改机器名并迁移行数据（新键写值、旧键置 null）", () => {
    const r = unwrap(
      renameColumnInMeta(
        makeMeta(),
        makeRows(),
        { oldName: "owner", newName: "assignee" },
        deps
      )
    );

    expect(r.meta.columns[2]).toEqual({
      id: "c3",
      name: "assignee",
      label: "负责人",
    });
    expect(r.rowPatches).toEqual([
      {
        dbKey: "row-1",
        changes: { assignee: "me", owner: null, updatedAt: NOW },
      },
    ]);
    expect(r.rows[0]).toEqual({
      dbKey: "row-1",
      title: "A",
      status: "todo",
      assignee: "me",
      updatedAt: NOW,
    });
  });

  test("新名首尾空格被裁剪", () => {
    const r = unwrap(
      renameColumnInMeta(
        makeMeta(),
        makeRows(),
        { oldName: "owner", newName: "  assignee  " },
        deps
      )
    );
    expect(r.meta.columns[2].name).toBe("assignee");
  });

  test("空新名、旧名不存在、新名重复分别报错", () => {
    const meta = makeMeta();
    const rows = makeRows();

    expect(
      unwrapErr(renameColumnInMeta(meta, rows, { oldName: "owner", newName: " " }, deps))
    ).toBe("新的字段名不能为空");

    expect(
      unwrapErr(
        renameColumnInMeta(meta, rows, { oldName: "ghost", newName: "x" }, deps)
      )
    ).toBe("字段 ghost 不存在");

    expect(
      unwrapErr(
        renameColumnInMeta(meta, rows, { oldName: "owner", newName: "status" }, deps)
      )
    ).toBe("字段 status 已存在");
  });
});

describe("renameColumnLabelInMeta", () => {
  const deps = { nowIso: NOW };

  test("只改 label，不动 name", () => {
    const r = unwrap(
      renameColumnLabelInMeta(makeMeta(), { columnId: "c2", label: " 进度 " }, deps)
    );
    expect(r.meta.columns[1]).toEqual({
      id: "c2",
      name: "status",
      label: "进度",
    });
  });

  test("空 label 与不存在的列分别报错", () => {
    const meta = makeMeta();
    expect(
      unwrapErr(renameColumnLabelInMeta(meta, { columnId: "c2", label: "  " }, deps))
    ).toBe("字段显示名不能为空");
    expect(
      unwrapErr(renameColumnLabelInMeta(meta, { columnId: "nope", label: "x" }, deps))
    ).toBe("要重命名的字段不存在");
  });
});

describe("updateColumnWidthInMeta", () => {
  const deps = { nowIso: NOW };

  test("正数宽度取整写入", () => {
    const r = unwrap(
      updateColumnWidthInMeta(makeMeta(), { columnId: "c1", width: 123.6 }, deps)
    );
    expect(r.meta.columns[0].width).toBe(124);
  });

  test("非正宽度清除自定义列宽", () => {
    const r = unwrap(
      updateColumnWidthInMeta(makeMeta(), { columnId: "c1", width: 0 }, deps)
    );
    expect(r.meta.columns[0].width).toBeUndefined();
  });

  test("列不存在时报错", () => {
    expect(
      unwrapErr(
        updateColumnWidthInMeta(makeMeta(), { columnId: "nope", width: 100 }, deps)
      )
    ).toBe("要调整宽度的字段不存在");
  });
});

describe("addColumnOptionInMeta", () => {
  const deps = { nowIso: NOW };

  /** status 列（c2）带两个既有选项的 meta。 */
  const metaWithOptions = (): TableMeta => {
    const meta = makeMeta();
    meta.columns[1] = { ...meta.columns[1], options: ["todo", "doing"] };
    return meta;
  };

  test("追加新选项到 options 末尾并 bump updatedAt", () => {
    const r = unwrap(
      addColumnOptionInMeta(
        metaWithOptions(),
        { columnId: "c2", option: "done" },
        deps
      )
    );
    expect(r.meta.columns[1].options).toEqual(["todo", "doing", "done"]);
    expect(r.meta.updatedAt).toBe(NOW);
    expect(r.metaChanges.columns).toBe(r.meta.columns);
    expect(r.metaChanges.updatedAt).toBe(NOW);
    expect(r.noop).toBe(false);
  });

  test("列无 options 时从空数组起步", () => {
    const r = unwrap(
      addColumnOptionInMeta(makeMeta(), { columnId: "c2", option: "done" }, deps)
    );
    expect(r.meta.columns[1].options).toEqual(["done"]);
  });

  test("option 首尾空格被裁剪", () => {
    const r = unwrap(
      addColumnOptionInMeta(
        metaWithOptions(),
        { columnId: "c2", option: "  done  " },
        deps
      )
    );
    expect(r.meta.columns[1].options).toEqual(["todo", "doing", "done"]);
  });

  test("空选项名报错", () => {
    expect(
      unwrapErr(
        addColumnOptionInMeta(
          metaWithOptions(),
          { columnId: "c2", option: "   " },
          deps
        )
      )
    ).toBe("选项名不能为空");
  });

  test("列不存在时报错", () => {
    expect(
      unwrapErr(
        addColumnOptionInMeta(
          metaWithOptions(),
          { columnId: "nope", option: "x" },
          deps
        )
      )
    ).toBe("要新增选项的字段不存在");
  });

  test("已有同值选项（trim 后精确匹配）为 no-op，meta 原样不变", () => {
    const meta = metaWithOptions();
    const r = unwrap(
      addColumnOptionInMeta(meta, { columnId: "c2", option: " todo " }, deps)
    );
    expect(r.meta).toBe(meta);
    expect(r.meta.updatedAt).toBe(OLD);
    expect(r.metaChanges.updatedAt).toBe(OLD);
    expect(r.noop).toBe(true);
  });

  test("不修改入参 meta", () => {
    const meta = metaWithOptions();
    addColumnOptionInMeta(meta, { columnId: "c2", option: "done" }, deps);
    expect(meta.columns[1].options).toEqual(["todo", "doing"]);
    expect(meta.updatedAt).toBe(OLD);
  });
});
