// render/web/elements/TextBlockRenderer.tsx
import "../elements.css";
import React, { useMemo } from "react";
import { NavLink } from "app/routing";

// 类型定义
type TextBlockType =
  | "paragraph"
  | "heading-one"
  | "heading-two"
  | "heading-three"
  | "heading-four"
  | "heading-five"
  | "heading-six"
  | "quote"
  | "thematic-break";

type TextBlockProps = {
  attributes: any;
  children: React.ReactNode;
  element: {
    type: TextBlockType;
    align?: "left" | "center" | "right" | "justify";
    isNested?: boolean;
    cite?: string;
    children?: Array<{ type?: string } | { text?: string }>;
  };
};

type SafeLinkProps = {
  attributes?: any;
  children: React.ReactNode;
  href: string;
  [key: string]: any;
};

// 链接分析函数
const getLinkInfo = (
  rawHref: string | undefined
): { href: string; isExternal: boolean } => {
  if (!rawHref || typeof rawHref !== "string") {
    return { href: "about:blank", isExternal: true };
  }

  const href = rawHref.trim();

  if (/^(https?:|mailto:|tel:)/i.test(href)) {
    return { href, isExternal: true };
  }

  if (href.startsWith("//")) {
    return { href, isExternal: true };
  }

  if (href.includes(".") && !href.includes(" ") && !href.startsWith("/")) {
    return { href: `//${href}`, isExternal: true };
  }

  return { href, isExternal: false };
};

// SafeLink 组件
export const SafeLink: React.FC<SafeLinkProps> = ({
  attributes,
  children,
  href,
  ...props
}) => {
  const { href: finalHref, isExternal } = useMemo(
    () => getLinkInfo(href),
    [href]
  );

  if (isExternal) {
    return (
      <a
        href={finalHref}
        target="_blank"
        rel="noopener noreferrer"
        {...attributes}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <NavLink to={finalHref} {...attributes} {...props}>
      {children}
    </NavLink>
  );
};

// HTML 标签映射
const TAG_MAP: Record<TextBlockType, React.ElementType> = {
  "heading-one": "h1",
  "heading-two": "h2",
  "heading-three": "h3",
  "heading-four": "h4",
  "heading-five": "h5",
  "heading-six": "h6",
  quote: "blockquote",
  "thematic-break": "hr",
  paragraph: "p",
};

const INLINE_CHILD_TYPES = new Set(["link", "code-inline", "html-inline"]);

const paragraphNeedsBlockContainer = (element: TextBlockProps["element"]) => {
  if (element.type !== "paragraph" || !Array.isArray(element.children)) return false;

  return element.children.some((child) => {
    if (!child || typeof child !== "object" || !("type" in child)) return false;
    return typeof child.type === "string" && !INLINE_CHILD_TYPES.has(child.type);
  });
};

// 基于 CSS 变量和类名的样式定义（兼顾多语言排版）

// 主渲染组件
export const TextBlockRenderer: React.FC<TextBlockProps> = ({
  attributes,
  children,
  element,
}) => {
  const HtmlTag =
    paragraphNeedsBlockContainer(element) ? "div" : TAG_MAP[element.type];

  // 组合类名
  const classNames = ["text-block", `text-${element.type}`];

  if (element.align) {
    classNames.push(`align-${element.align}`);
  }

  if (element.type === "paragraph" && element.isNested) {
    classNames.push("nested");
  }

  const finalClassName = classNames.join(" ");

  // 使用 Fragment 包裹样式和内容，<style> 利用 href 去重
  return (
    <>
      

      {element.type === "thematic-break" ? (
        React.createElement(HtmlTag as any, { ...attributes, className: finalClassName })
      ) : (
        React.createElement(
          HtmlTag as any,
          { ...attributes, className: finalClassName },
          children,
          element.type === "quote" && element.cite ? (
            <cite key="cite">— {element.cite}</cite>
          ) : null
        )
      )}
    </>
  );
};
