import {
  GlobalWorkerOptions,
  getDocument
} from "/public/assets/chunks/chunk-X4BPF27F.js";
import {
  asTrimmedLowercaseString
} from "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/create/editor/utils/pdfToSlate.ts
GlobalWorkerOptions.workerSrc = "/public/assets/pdf.worker.mjs";
var convertPdfToSlate = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const slateNodes = [];
    let listStack = [];
    let lineHeightDiffs = [];
    let fontSizes = [];
    let avgLineHeight = 0;
    let baseFontSize = 0;
    const outline = await pdf.getOutline();
    const outlineItems = [];
    if (outline) {
      const processOutline = async (items, parentLevel = 0) => {
        for (const item of items) {
          const title = item.title || "";
          const level = parentLevel + 1;
          let pageNumber = null;
          if (item.dest && typeof item.dest === "string") {
            const destRef = await pdf.getDestination(item.dest);
            if (destRef && destRef.length > 0 && typeof destRef[0] === "number") {
              pageNumber = await pdf.getPageIndex(destRef[0]) + 1;
            }
          } else if (item.dest && item.dest.length > 0 && typeof item.dest[0] === "number") {
            pageNumber = await pdf.getPageIndex(item.dest[0]) + 1;
          }
          outlineItems.push({ title, level, pageNumber, dest: item.dest });
          if (item.items && item.items.length > 0) {
            await processOutline(item.items, level);
          }
        }
      };
      await processOutline(outline);
    }
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      let previousY = 0;
      textContent.items.forEach((item, index) => {
        if ("transform" in item) {
          const currentY = item.transform[5];
          const diff = Math.abs(currentY - previousY);
          if (index > 0 && diff > 0 && diff < 50) {
            lineHeightDiffs.push(diff);
          }
          previousY = currentY;
        }
        if ("fontName" in item) {
          const fontSize = extractFontSize(item.fontName, item);
          if (numPages <= 3 || i <= numPages - 2) {
            fontSizes.push(fontSize);
          }
        }
      });
    }
    lineHeightDiffs.sort((a, b) => a - b);
    avgLineHeight = lineHeightDiffs.length > 0 ? lineHeightDiffs[Math.floor(lineHeightDiffs.length / 2)] : 12;
    baseFontSize = calculateBaseFontSize(fontSizes);
    let titleCount = 0;
    let totalParagraphs = 0;
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const annotations = await page.getAnnotations();
      const pageOutlineItems = outlineItems.filter(
        (item) => item.pageNumber === i
      );
      const pageLinks = annotations.flatMap(
        (annot) => annot.subtype === "Link" && annot.url ? [
          {
            url: annot.url,
            rect: annot.rect
            // 矩形区域 [x1, y1, x2, y2]
          }
        ] : []
      );
      let currentLineText = "";
      let currentLineStyles = [];
      let currentParagraphText = "";
      let currentParagraphStyles = [];
      let previousY = 0;
      let previousX = 0;
      textContent.items.forEach((item, index) => {
        if ("str" in item && item.str.trim()) {
          const fontSize = item.fontName ? extractFontSize(item.fontName, item) : 12;
          const currentY = item.transform ? item.transform[5] : 0;
          const currentX = item.transform ? item.transform[4] : 0;
          const isBold = item.fontName?.toLowerCase().includes("bold");
          const isItalic = item.fontName?.toLowerCase().includes("italic");
          const isNewLine = index > 0 && Math.abs(currentY - previousY) > avgLineHeight * 0.5;
          const isNewParagraph = index > 0 && Math.abs(currentY - previousY) > avgLineHeight * 1.8;
          if (isNewLine && currentLineText.trim()) {
            currentParagraphText += currentLineText + "\n";
            currentParagraphStyles.push(...currentLineStyles);
            currentLineText = "";
            currentLineStyles = [];
          }
          if (isNewParagraph && currentParagraphText.trim()) {
            totalParagraphs++;
            const isTitleCandidateBySize = isLineTitleBySize(
              currentParagraphStyles,
              baseFontSize
            );
            const isTitleCandidateByBold = isLineTitleByBold(
              currentParagraphStyles
            );
            const titleRatio = titleCount / (totalParagraphs || 1);
            const isTitleLengthValid = isTitleLengthAcceptable(currentParagraphText);
            const matchedOutlineItem = matchOutlineItem(
              currentParagraphText,
              pageOutlineItems
            );
            const isTitle = (matchedOutlineItem || isTitleCandidateByBold || isTitleCandidateBySize && titleRatio < 0.3) && isTitleLengthValid;
            const isListItem = index > 0 && Math.abs(currentX - previousX) > 5 && (currentParagraphText.trim().match(/^[0-9]+[\.\)]/) || currentParagraphText.trim().match(/^[-•◦]/));
            let nodeType = "paragraph";
            let headingLevel = 0;
            if (isTitle) {
              titleCount++;
              const titleFontSize = currentParagraphStyles[0]?.fontSize || baseFontSize;
              if (matchedOutlineItem) {
                headingLevel = Math.min(matchedOutlineItem.level, 6);
              } else if (titleFontSize > baseFontSize) {
                headingLevel = Math.min(
                  Math.floor((titleFontSize - baseFontSize) / 2) + 1,
                  6
                );
              } else {
                headingLevel = Math.min(
                  Math.floor((baseFontSize - titleFontSize) / 2) + 3,
                  6
                );
              }
              nodeType = `heading-${toLowerCaseNumber(headingLevel.toString())}`;
            } else if (isListItem) {
              nodeType = "list-item";
            }
            const itemNode = buildSlateNodeWithLinks(
              nodeType,
              currentParagraphText,
              currentParagraphStyles,
              pageLinks
            );
            if (isListItem && !isTitle) {
              const listLevel = Math.floor((currentX - previousX) / 20);
              const isOrdered = currentParagraphText.trim().match(/^[0-9]+[\.\)]/) !== null;
              handleListItem(
                itemNode,
                listStack,
                slateNodes,
                listLevel,
                isOrdered
              );
            } else {
              slateNodes.push(itemNode);
              listStack = [];
            }
            currentParagraphText = "";
            currentParagraphStyles = [];
          }
          currentLineText += item.str;
          currentLineStyles.push({
            fontSize,
            bold: isBold,
            italic: isItalic,
            text: item.str,
            x: currentX,
            y: currentY
          });
          previousY = currentY;
          previousX = currentX;
        }
      });
      if (currentLineText.trim()) {
        currentParagraphText += currentLineText + "\n";
        currentParagraphStyles.push(...currentLineStyles);
      }
      if (currentParagraphText.trim()) {
        totalParagraphs++;
        const isTitleCandidateBySize = isLineTitleBySize(
          currentParagraphStyles,
          baseFontSize
        );
        const isTitleCandidateByBold = isLineTitleByBold(
          currentParagraphStyles
        );
        const titleRatio = titleCount / (totalParagraphs || 1);
        const isTitleLengthValid = isTitleLengthAcceptable(currentParagraphText);
        const matchedOutlineItem = matchOutlineItem(
          currentParagraphText,
          pageOutlineItems
        );
        const isTitle = (matchedOutlineItem || isTitleCandidateByBold || isTitleCandidateBySize && titleRatio < 0.3) && isTitleLengthValid;
        const isListItem = Math.abs(previousX) > 5 && (currentParagraphText.trim().match(/^[0-9]+[\.\)]/) || currentParagraphText.trim().match(/^[-•◦]/));
        let nodeType = "paragraph";
        let headingLevel = 0;
        if (isTitle) {
          titleCount++;
          const titleFontSize = currentParagraphStyles[0]?.fontSize || baseFontSize;
          if (matchedOutlineItem) {
            headingLevel = Math.min(matchedOutlineItem.level, 6);
          } else if (titleFontSize > baseFontSize) {
            headingLevel = Math.min(
              Math.floor((titleFontSize - baseFontSize) / 2) + 1,
              6
            );
          } else {
            headingLevel = Math.min(
              Math.floor((baseFontSize - titleFontSize) / 2) + 3,
              6
            );
          }
          nodeType = `heading-${toLowerCaseNumber(headingLevel.toString())}`;
        } else if (isListItem) {
          nodeType = "list-item";
        }
        const itemNode = buildSlateNodeWithLinks(
          nodeType,
          currentParagraphText,
          currentParagraphStyles,
          pageLinks
        );
        if (isListItem && !isTitle) {
          const listLevel = Math.floor(previousX / 20);
          const isOrdered = currentParagraphText.trim().match(/^[0-9]+[\.\)]/) !== null;
          handleListItem(itemNode, listStack, slateNodes, listLevel, isOrdered);
        } else {
          slateNodes.push(itemNode);
          listStack = [];
        }
      }
      const imageAnnotations = annotations.filter(
        (annot) => annot.subtype === "Widget" || annot.subtype === "Stamp"
      );
      if (imageAnnotations.length > 0) {
        imageAnnotations.forEach(() => {
          slateNodes.push({
            type: "image",
            url: "",
            // 占位符，无具体图片信息
            alt: "Image Placeholder",
            children: [{ text: "" }]
          });
        });
      }
      if (i < numPages) {
        slateNodes.push({
          type: "thematic-break",
          children: [{ text: "" }]
        });
      }
    }
    if (slateNodes.length === 0) {
      slateNodes.push({
        type: "paragraph",
        children: [{ text: "\uFF08\u7A7A PDF \u6216\u65E0\u6709\u6548\u5185\u5BB9\uFF09" }]
      });
    }
    return slateNodes;
  } catch (error) {
    console.error("\u8F6C\u6362 PDF \u5230 Slate.js \u683C\u5F0F\u5931\u8D25\uFF1A", error);
    throw error;
  }
};
function extractFontSize(fontName, item) {
  if (item.transform) {
    return Math.round(item.transform[0] * 10);
  }
  return 12;
}
function calculateBaseFontSize(fontSizes) {
  if (fontSizes.length === 0) return 12;
  const sizeCount = {};
  fontSizes.forEach((size) => {
    sizeCount[size] = (sizeCount[size] || 0) + 1;
  });
  let maxCount = 0;
  let baseSize = 12;
  for (const size in sizeCount) {
    if (sizeCount[size] > maxCount) {
      maxCount = sizeCount[size];
      baseSize = parseFloat(size);
    }
  }
  return baseSize;
}
function isLineTitleBySize(styles, baseFontSize) {
  if (styles.length === 0) return false;
  const allLarger = styles.every((style) => style.fontSize > baseFontSize + 2);
  const allSmaller = styles.every((style) => style.fontSize < baseFontSize - 2);
  return allLarger || allSmaller;
}
function isLineTitleByBold(styles) {
  if (styles.length === 0) return false;
  const allBold = styles.every((style) => style.bold);
  return allBold;
}
function isTitleLengthAcceptable(text) {
  const trimmedText = text.trim();
  const wordCount = trimmedText.split(/\s+/).length;
  const charCount = trimmedText.length;
  return wordCount < 15 && charCount < 100;
}
function matchOutlineItem(text, outlineItems) {
  const trimmedText = asTrimmedLowercaseString(text);
  for (const item of outlineItems) {
    const outlineTitle = item.title.toLowerCase();
    if (trimmedText.includes(outlineTitle) || outlineTitle.includes(trimmedText)) {
      return item;
    }
  }
  return null;
}
function buildSlateNodeWithLinks(type, text, styles, links) {
  const allSameStyle = styles.every(
    (s) => s.bold === styles[0].bold && s.italic === styles[0].italic
  );
  const trimmedText = text.trim();
  if (allSameStyle && styles.length > 0) {
    const link = findMatchingLink(styles, links);
    if (link) {
      return {
        type: "link",
        url: link.url,
        children: [
          {
            text: trimmedText,
            ...styles[0].bold && { bold: true },
            ...styles[0].italic && { italic: true }
          }
        ]
      };
    }
    return {
      type,
      children: [
        {
          text: trimmedText,
          ...styles[0].bold && { bold: true },
          ...styles[0].italic && { italic: true }
        }
      ]
    };
  }
  const children = [];
  let currentText = "";
  let currentStyle = styles[0];
  let startIndex = 0;
  for (let i = 0; i < styles.length; i++) {
    const style = styles[i];
    if (i > 0 && (style.bold !== currentStyle.bold || style.italic !== currentStyle.italic)) {
      if (currentText) {
        const subStyles = styles.slice(startIndex, i);
        const link = findMatchingLink(subStyles, links);
        if (link) {
          children.push({
            type: "link",
            url: link.url,
            children: [
              {
                text: currentText,
                ...currentStyle.bold && { bold: true },
                ...currentStyle.italic && { italic: true }
              }
            ]
          });
        } else {
          children.push({
            text: currentText,
            ...currentStyle.bold && { bold: true },
            ...currentStyle.italic && { italic: true }
          });
        }
        currentText = "";
      }
      startIndex = i;
      currentStyle = style;
    }
    currentText += style.text;
  }
  if (currentText) {
    const subStyles = styles.slice(startIndex);
    const link = findMatchingLink(subStyles, links);
    if (link) {
      children.push({
        type: "link",
        url: link.url,
        children: [
          {
            text: currentText,
            ...currentStyle.bold && { bold: true },
            ...currentStyle.italic && { italic: true }
          }
        ]
      });
    } else {
      children.push({
        text: currentText,
        ...currentStyle.bold && { bold: true },
        ...currentStyle.italic && { italic: true }
      });
    }
  }
  return {
    type,
    children
  };
}
function findMatchingLink(styles, links) {
  if (styles.length === 0 || links.length === 0) return null;
  const xMin = Math.min(...styles.map((s) => s.x));
  const xMax = Math.max(...styles.map((s) => s.x));
  const yMin = Math.min(...styles.map((s) => s.y));
  const yMax = Math.max(...styles.map((s) => s.y));
  for (const link of links) {
    const [linkX1, linkY1, linkX2, linkY2] = link.rect;
    if (xMax > linkX1 && xMin < linkX2 && yMax > linkY1 && yMin < linkY2) {
      return link;
    }
  }
  return null;
}
function toLowerCaseNumber(num) {
  const numbers = ["one", "two", "three", "four", "five", "six"];
  const index = parseInt(num) - 1;
  return numbers[index] || "one";
}
function handleListItem(itemNode, listStack, slateNodes, listLevel, isOrdered) {
  if (listStack.length === 0) {
    const newList = {
      type: "list",
      ordered: isOrdered,
      children: [itemNode]
    };
    slateNodes.push(newList);
    listStack.push({ node: newList, level: listLevel });
  } else if (listStack[listStack.length - 1].level < listLevel) {
    const newList = {
      type: "list",
      ordered: isOrdered,
      children: [itemNode]
    };
    const parentList = listStack[listStack.length - 1].node;
    const lastListItem = parentList.children[parentList.children.length - 1];
    lastListItem.children.push(newList);
    listStack.push({ node: newList, level: listLevel });
  } else if (listStack[listStack.length - 1].level > listLevel) {
    while (listStack.length > 0 && listStack[listStack.length - 1].level > listLevel) {
      listStack.pop();
    }
    if (listStack.length > 0) {
      listStack[listStack.length - 1].node.children.push(itemNode);
    } else {
      const newList = {
        type: "list",
        ordered: isOrdered,
        children: [itemNode]
      };
      slateNodes.push(newList);
      listStack.push({ node: newList, level: listLevel });
    }
  } else {
    listStack[listStack.length - 1].node.children.push(itemNode);
  }
}
export {
  convertPdfToSlate
};
