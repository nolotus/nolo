import { AppSelectedNode } from "./appInspectorStore";

export function installInspector(
  doc: Document,
  onSelect: (node: AppSelectedNode) => void
): () => void {
  const overlay = doc.createElement("div");
  overlay.style.position = "absolute";
  overlay.style.pointerEvents = "none";
  overlay.style.border = "2px solid #3b82f6";
  overlay.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
  overlay.style.zIndex = "9999999";
  overlay.style.boxSizing = "border-box";
  overlay.style.transition = "all 0.1s ease-out";

  const label = doc.createElement("div");
  label.style.position = "absolute";
  label.style.top = "-24px";
  label.style.left = "-2px";
  label.style.backgroundColor = "#3b82f6";
  label.style.color = "white";
  label.style.padding = "2px 6px";
  label.style.fontSize = "12px";
  label.style.fontFamily = "monospace";
  label.style.borderTopLeftRadius = "4px";
  label.style.borderTopRightRadius = "4px";
  label.style.whiteSpace = "nowrap";

  overlay.appendChild(label);

  const getCssPath = (el: HTMLElement): string => {
    const path: string[] = [];
    let current = el;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.nodeName.toLowerCase();
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break; // IDs are unique, we can stop here
      } else {
        let sibling = current.previousElementSibling;
        let nth = 1;
        while (sibling) {
          if (sibling.nodeName.toLowerCase() === selector) {
            nth++;
          }
          sibling = sibling.previousElementSibling;
        }
        if (nth > 1 || current.nextElementSibling) {
          selector += `:nth-of-type(${nth})`;
        }
      }
      path.unshift(selector);
      current = current.parentElement as HTMLElement;
    }
    return path.join(" > ");
  };

  const handleMouseOver = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target === doc.body || target === doc.documentElement) {
      if (overlay.parentElement) {
         overlay.parentElement.removeChild(overlay);
      }
      return;
    }
    const rect = target.getBoundingClientRect();
    
    // Convert to document coordinates
    const scrollX = doc.defaultView?.scrollX || 0;
    const scrollY = doc.defaultView?.scrollY || 0;
    
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.left = `${rect.left + scrollX}px`;
    overlay.style.top = `${rect.top + scrollY}px`;
    
    const tagName = target.tagName.toLowerCase();
    const classList = Array.from(target.classList);
    const firstClass = classList.find(c => c.trim().length > 0) || "";
    
    label.innerText = firstClass ? `${tagName}.${firstClass}` : tagName;
    
    if (!overlay.parentElement) {
      doc.body.appendChild(overlay);
    }
  };

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.target as HTMLElement;
    if (target === doc.body || target === doc.documentElement) return;

    const tagName = target.tagName.toLowerCase();
    const classList = Array.from(target.classList);
    const cssPath = getCssPath(target);
    const textSnippet = (target.innerText || "").slice(0, 80);
    const outerHTMLSnippet = (target.outerHTML || "").slice(0, 1000);
    const noloLoc = target.getAttribute("data-nolo-loc") || undefined;

    const node: AppSelectedNode = {
      cssPath,
      tagName,
      classList,
      textSnippet,
      outerHTMLSnippet,
      noloLoc
    };

    onSelect(node);
  };

  doc.addEventListener("mouseover", handleMouseOver, true);
  doc.addEventListener("click", handleClick, true);

  return () => {
    doc.removeEventListener("mouseover", handleMouseOver, true);
    doc.removeEventListener("click", handleClick, true);
    if (overlay.parentElement) {
      overlay.parentElement.removeChild(overlay);
    }
  };
}
