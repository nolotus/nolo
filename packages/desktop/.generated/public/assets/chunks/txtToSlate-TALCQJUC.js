import "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/create/editor/utils/txtToSlate.ts
var convertTxtToSlate = (textContent) => {
  if (!textContent) {
    return [{ type: "paragraph", children: [{ text: "" }] }];
  }
  const lines = textContent.split("\n");
  const slateContent = lines.map((line) => ({
    // `type: 'paragraph'` 定义了这个节点的类型。
    type: "paragraph",
    // `children` 是一个数组，包含了这个段落内的所有子节点。
    // 对于纯文本转换，这里只有一个 `text` 节点。
    children: [{ text: line }]
  }));
  return slateContent;
};
export {
  convertTxtToSlate
};
