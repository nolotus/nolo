import {
  $23f2114a1b82827e$export$4282f70798064fe0,
  $23f2114a1b82827e$export$b4f377a2b6254582,
  $23f2114a1b82827e$export$cd4e5573fbe2b576,
  $23f2114a1b82827e$export$da7af4355d792141,
  $23f2114a1b82827e$export$e58f029f0fbfdb29,
  $2add3ce32c6007eb$export$78551043582a6a98,
  $2eb8e6d23f3d0cb0$export$43bb16f9c6d9e3f7,
  $390e54f620492c70$export$f680877a34711e37,
  $3e6197669829fe11$export$40bfa8c7b0832715,
  $7230ffa83bc0c2cf$export$2881499e37b75b9a,
  $7230ffa83bc0c2cf$export$29f1550f4b0d4415,
  $7230ffa83bc0c2cf$export$4d86445c2cf5e3,
  $7230ffa83bc0c2cf$export$df3a06d6289f983e,
  $8e9d2fae0ecb9001$export$457c3d6518dd4c6f,
  $8f5a2122b0992be3$export$630ff653c5ada6a9,
  $8f5a2122b0992be3$export$b9b3dfddab17db27,
  $bbaa08b3cd72f041$export$9d1611c77c2fe928,
  $c4867b2f328c2698$export$e5c5a5f917a5871c,
  $c7eafbbe1ea5834e$export$535bd6ca7f90a273,
  $d1116acdf220c2da$export$13f3202a3e5ddd5,
  $d1116acdf220c2da$export$4c014de7c8940b4c,
  $d447af545b77c9f1$export$f531f92e2a15358f,
  $e969f22b6713ca4a$export$ae780daf29e6d456,
  $fcc7165e876206c6$export$45fda7c47f93fd48,
  $fcc7165e876206c6$export$6d3443f2c48bfc20,
  $fe16bffc7a557bf0$export$7f54fc3180508a52
} from "/public/assets/chunks/chunk-I2UX5KHN.js";
import {
  require_react_dom
} from "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// node_modules/react-aria-components/dist/private/OverlayArrow.mjs
var import_react = __toESM(require_react(), 1);
var $4fcfe18fac72dabd$export$2de4954e8ae13b9f = /* @__PURE__ */ (0, import_react.createContext)({
  placement: "bottom"
});
var $4fcfe18fac72dabd$export$746d02f47f4d381 = /* @__PURE__ */ (0, import_react.forwardRef)(function OverlayArrow(props, ref) {
  [props, ref] = (0, $7230ffa83bc0c2cf$export$29f1550f4b0d4415)(props, ref, $4fcfe18fac72dabd$export$2de4954e8ae13b9f);
  let placement = props.placement;
  let style = {
    position: "absolute",
    transform: placement === "top" || placement === "bottom" ? "translateX(-50%)" : "translateY(-50%)"
  };
  if (placement != null) style[placement] = "100%";
  let renderProps = (0, $7230ffa83bc0c2cf$export$4d86445c2cf5e3)({
    ...props,
    defaultClassName: "react-aria-OverlayArrow",
    values: {
      placement
    }
  });
  if (renderProps.style) Object.keys(renderProps.style).forEach((key) => renderProps.style[key] === void 0 && delete renderProps.style[key]);
  let DOMProps = (0, $8e9d2fae0ecb9001$export$457c3d6518dd4c6f)(props);
  return /* @__PURE__ */ (0, import_react.default).createElement((0, $7230ffa83bc0c2cf$export$df3a06d6289f983e).div, {
    ...DOMProps,
    ...renderProps,
    style: {
      ...style,
      ...renderProps.style
    },
    ref,
    "data-placement": placement
  });
});

// node_modules/react-stately/dist/private/utils/number.mjs
function $240e9101ba2842f5$export$7d15b64cf5a3a4c4(value, min = -Infinity, max = Infinity) {
  let newValue = Math.min(Math.max(value, min), max);
  return newValue;
}
function $240e9101ba2842f5$export$e1a7b8e69ef6c52f(value, step) {
  let roundedValue = value;
  let precision = 0;
  let stepString = step.toString();
  let eIndex = stepString.toLowerCase().indexOf("e-");
  if (eIndex > 0) precision = Math.abs(Math.floor(Math.log10(Math.abs(step)))) + eIndex;
  else {
    let pointIndex = stepString.indexOf(".");
    if (pointIndex >= 0) precision = stepString.length - pointIndex;
  }
  if (precision > 0) {
    let pow = Math.pow(10, precision);
    roundedValue = Math.round(roundedValue * pow) / pow;
  }
  return roundedValue;
}
function $240e9101ba2842f5$export$cb6e0bb50bc19463(value, min, max, step) {
  min = Number(min);
  max = Number(max);
  let remainder = (value - (isNaN(min) ? 0 : min)) % step;
  let snappedValue = $240e9101ba2842f5$export$e1a7b8e69ef6c52f(Math.abs(remainder) * 2 >= step ? value + Math.sign(remainder) * (step - Math.abs(remainder)) : value - remainder, step);
  if (!isNaN(min)) {
    if (snappedValue < min) snappedValue = min;
    else if (!isNaN(max) && snappedValue > max) snappedValue = min + Math.floor($240e9101ba2842f5$export$e1a7b8e69ef6c52f((max - min) / step, step)) * step;
  } else if (!isNaN(max) && snappedValue > max) snappedValue = Math.floor($240e9101ba2842f5$export$e1a7b8e69ef6c52f(max / step, step)) * step;
  snappedValue = $240e9101ba2842f5$export$e1a7b8e69ef6c52f(snappedValue, step);
  return snappedValue;
}

// node_modules/react-aria/dist/private/overlays/calculatePosition.mjs
var $954926fb6168ae2a$var$AXIS = {
  top: "top",
  bottom: "top",
  left: "left",
  right: "left"
};
var $954926fb6168ae2a$var$FLIPPED_DIRECTION = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left"
};
var $954926fb6168ae2a$var$CROSS_AXIS = {
  top: "left",
  left: "top"
};
var $954926fb6168ae2a$var$AXIS_SIZE = {
  top: "height",
  left: "width"
};
var $954926fb6168ae2a$var$TOTAL_SIZE = {
  width: "totalWidth",
  height: "totalHeight"
};
var $954926fb6168ae2a$var$PARSED_PLACEMENT_CACHE = {};
var $954926fb6168ae2a$var$getVisualViewport = () => typeof document !== "undefined" ? window.visualViewport : null;
function $954926fb6168ae2a$var$getContainerDimensions(containerNode, visualViewport) {
  let width = 0, height = 0, totalWidth = 0, totalHeight = 0, top = 0, left = 0;
  let scroll = {};
  let isPinchZoomedIn = (visualViewport?.scale ?? 1) > 1;
  if (containerNode.tagName === "BODY" || containerNode.tagName === "HTML") {
    let documentElement = document.documentElement;
    totalWidth = documentElement.clientWidth;
    totalHeight = documentElement.clientHeight;
    width = visualViewport?.width ?? totalWidth;
    height = visualViewport?.height ?? totalHeight;
    scroll.top = documentElement.scrollTop || containerNode.scrollTop;
    scroll.left = documentElement.scrollLeft || containerNode.scrollLeft;
    if (visualViewport) {
      top = visualViewport.offsetTop;
      left = visualViewport.offsetLeft;
    }
  } else {
    ({ width, height, top, left } = $954926fb6168ae2a$var$getOffset(containerNode, false));
    scroll.top = containerNode.scrollTop;
    scroll.left = containerNode.scrollLeft;
    totalWidth = width;
    totalHeight = height;
  }
  if ((0, $2add3ce32c6007eb$export$78551043582a6a98)() && (containerNode.tagName === "BODY" || containerNode.tagName === "HTML") && isPinchZoomedIn) {
    scroll.top = 0;
    scroll.left = 0;
    top = visualViewport?.pageTop ?? 0;
    left = visualViewport?.pageLeft ?? 0;
  }
  return {
    width,
    height,
    totalWidth,
    totalHeight,
    scroll,
    top,
    left
  };
}
function $954926fb6168ae2a$var$getScroll(node) {
  return {
    top: node.scrollTop,
    left: node.scrollLeft,
    width: node.scrollWidth,
    height: node.scrollHeight
  };
}
function $954926fb6168ae2a$var$getDelta(axis, offset, size, boundaryDimensions, containerDimensions, padding, containerOffsetWithBoundary) {
  let containerScroll = containerDimensions.scroll[axis] ?? 0;
  let boundarySize = boundaryDimensions[$954926fb6168ae2a$var$AXIS_SIZE[axis]];
  let boundaryStartEdge = containerOffsetWithBoundary[axis] + boundaryDimensions.scroll[$954926fb6168ae2a$var$AXIS[axis]] + padding;
  let boundaryEndEdge = containerOffsetWithBoundary[axis] + boundaryDimensions.scroll[$954926fb6168ae2a$var$AXIS[axis]] + boundarySize - padding;
  let startEdgeOffset = offset - containerScroll + boundaryDimensions.scroll[$954926fb6168ae2a$var$AXIS[axis]] + containerOffsetWithBoundary[axis] - boundaryDimensions[$954926fb6168ae2a$var$AXIS[axis]];
  let endEdgeOffset = offset - containerScroll + size + boundaryDimensions.scroll[$954926fb6168ae2a$var$AXIS[axis]] + containerOffsetWithBoundary[axis] - boundaryDimensions[$954926fb6168ae2a$var$AXIS[axis]];
  if (startEdgeOffset < boundaryStartEdge) return boundaryStartEdge - startEdgeOffset;
  else if (endEdgeOffset > boundaryEndEdge) return Math.max(boundaryEndEdge - endEdgeOffset, boundaryStartEdge - startEdgeOffset);
  else return 0;
}
function $954926fb6168ae2a$var$getMargins(node) {
  let style = window.getComputedStyle(node);
  return {
    top: parseInt(style.marginTop, 10) || 0,
    bottom: parseInt(style.marginBottom, 10) || 0,
    left: parseInt(style.marginLeft, 10) || 0,
    right: parseInt(style.marginRight, 10) || 0
  };
}
function $954926fb6168ae2a$var$parsePlacement(input) {
  if ($954926fb6168ae2a$var$PARSED_PLACEMENT_CACHE[input]) return $954926fb6168ae2a$var$PARSED_PLACEMENT_CACHE[input];
  let [placement, crossPlacement] = input.split(" ");
  let axis = $954926fb6168ae2a$var$AXIS[placement] || "right";
  let crossAxis = $954926fb6168ae2a$var$CROSS_AXIS[axis];
  if (!$954926fb6168ae2a$var$AXIS[crossPlacement]) crossPlacement = "center";
  let size = $954926fb6168ae2a$var$AXIS_SIZE[axis];
  let crossSize = $954926fb6168ae2a$var$AXIS_SIZE[crossAxis];
  $954926fb6168ae2a$var$PARSED_PLACEMENT_CACHE[input] = {
    placement,
    crossPlacement,
    axis,
    crossAxis,
    size,
    crossSize
  };
  return $954926fb6168ae2a$var$PARSED_PLACEMENT_CACHE[input];
}
function $954926fb6168ae2a$var$computePosition(childOffset, boundaryDimensions, overlaySize, placementInfo, offset, crossOffset, containerOffsetWithBoundary, isContainerPositioned, arrowSize, arrowBoundaryOffset, containerDimensions) {
  let { placement, crossPlacement, axis, crossAxis, size, crossSize } = placementInfo;
  let position = {};
  position[crossAxis] = childOffset[crossAxis] ?? 0;
  if (crossPlacement === "center")
    position[crossAxis] += ((childOffset[crossSize] ?? 0) - (overlaySize[crossSize] ?? 0)) / 2;
  else if (crossPlacement !== crossAxis)
    position[crossAxis] += (childOffset[crossSize] ?? 0) - (overlaySize[crossSize] ?? 0);
  position[crossAxis] += crossOffset;
  const minPosition = childOffset[crossAxis] - overlaySize[crossSize] + arrowSize + arrowBoundaryOffset;
  const maxPosition = childOffset[crossAxis] + childOffset[crossSize] - arrowSize - arrowBoundaryOffset;
  position[crossAxis] = (0, $240e9101ba2842f5$export$7d15b64cf5a3a4c4)(position[crossAxis], minPosition, maxPosition);
  if (placement === axis) {
    let containerHeight = isContainerPositioned ? containerDimensions[size] : containerDimensions[$954926fb6168ae2a$var$TOTAL_SIZE[size]];
    position[$954926fb6168ae2a$var$FLIPPED_DIRECTION[axis]] = Math.floor(containerHeight - childOffset[axis] + offset);
  } else position[axis] = Math.floor(childOffset[axis] + childOffset[size] + offset);
  return position;
}
function $954926fb6168ae2a$var$getMaxHeight(position, boundaryDimensions, containerOffsetWithBoundary, isContainerPositioned, margins, padding, overlayHeight, heightGrowthDirection, containerDimensions, isContainerDescendentOfBoundary, visualViewport) {
  let overlayTop = (position.top != null ? position.top : containerDimensions[$954926fb6168ae2a$var$TOTAL_SIZE.height] - (position.bottom ?? 0) - overlayHeight) - (containerDimensions.scroll.top ?? 0);
  let boundaryToContainerTransformOffset = isContainerDescendentOfBoundary ? containerOffsetWithBoundary.top : 0;
  let boundingRect = {
    // This should be boundary top in container coord system vs viewport top in container coord system
    // For the viewport top, there are several cases
    // 1. pinchzoom case where we want the viewports offset top as top here
    // 2. case where container is offset from the boundary and is contained by the boundary. In this case the top we want here is NOT 0, we want to take boundary's top even though is is a negative number OR the visual viewport, whichever is more restrictive
    top: Math.max(boundaryDimensions.top + boundaryToContainerTransformOffset, (visualViewport?.offsetTop ?? boundaryDimensions.top) + boundaryToContainerTransformOffset),
    bottom: Math.min(boundaryDimensions.top + boundaryDimensions.height + boundaryToContainerTransformOffset, (visualViewport?.offsetTop ?? 0) + (visualViewport?.height ?? 0))
  };
  let maxHeight = heightGrowthDirection !== "top" ? Math.max(0, boundingRect.bottom - // this is the bottom of the boundary
  overlayTop - // this is the top of the overlay
  ((margins.top ?? 0) + (margins.bottom ?? 0) + padding)) : Math.max(0, overlayTop + overlayHeight - // this is the bottom of the overlay
  boundingRect.top - // this is the top of the boundary
  ((margins.top ?? 0) + (margins.bottom ?? 0) + padding));
  return maxHeight;
}
function $954926fb6168ae2a$var$getAvailableSpace(boundaryDimensions, containerOffsetWithBoundary, childOffset, margins, padding, placementInfo, containerDimensions, isContainerDescendentOfBoundary) {
  let { placement, axis, size } = placementInfo;
  if (placement === axis) return Math.max(0, childOffset[axis] - // trigger start
  (containerDimensions.scroll[axis] ?? 0) - // transform trigger position to be with respect to viewport 0,0
  (boundaryDimensions[axis] + (isContainerDescendentOfBoundary ? containerOffsetWithBoundary[axis] : 0)) - // boundary start
  (margins[axis] ?? 0) - // margins usually for arrows or other decorations
  margins[$954926fb6168ae2a$var$FLIPPED_DIRECTION[axis]] - padding);
  return Math.max(0, boundaryDimensions[size] + boundaryDimensions[axis] + (isContainerDescendentOfBoundary ? containerOffsetWithBoundary[axis] : 0) - childOffset[axis] - childOffset[size] + (containerDimensions.scroll[axis] ?? 0) - (margins[axis] ?? 0) - margins[$954926fb6168ae2a$var$FLIPPED_DIRECTION[axis]] - padding);
}
function $954926fb6168ae2a$export$6839422d1f33cee9(placementInput, childOffset, overlaySize, scrollSize, margins, padding, flip, boundaryDimensions, containerDimensions, containerOffsetWithBoundary, offset, crossOffset, isContainerPositioned, userSetMaxHeight, arrowSize, arrowBoundaryOffset, isContainerDescendentOfBoundary, visualViewport) {
  let placementInfo = $954926fb6168ae2a$var$parsePlacement(placementInput);
  let { size, crossAxis, crossSize, placement, crossPlacement } = placementInfo;
  let position = $954926fb6168ae2a$var$computePosition(childOffset, boundaryDimensions, overlaySize, placementInfo, offset, crossOffset, containerOffsetWithBoundary, isContainerPositioned, arrowSize, arrowBoundaryOffset, containerDimensions);
  let normalizedOffset = offset;
  let space = $954926fb6168ae2a$var$getAvailableSpace(boundaryDimensions, containerOffsetWithBoundary, childOffset, margins, padding + offset, placementInfo, containerDimensions, isContainerDescendentOfBoundary);
  if (flip && overlaySize[size] > space) {
    let flippedPlacementInfo = $954926fb6168ae2a$var$parsePlacement(`${$954926fb6168ae2a$var$FLIPPED_DIRECTION[placement]} ${crossPlacement}`);
    let flippedPosition = $954926fb6168ae2a$var$computePosition(childOffset, boundaryDimensions, overlaySize, flippedPlacementInfo, offset, crossOffset, containerOffsetWithBoundary, isContainerPositioned, arrowSize, arrowBoundaryOffset, containerDimensions);
    let flippedSpace = $954926fb6168ae2a$var$getAvailableSpace(boundaryDimensions, containerOffsetWithBoundary, childOffset, margins, padding + offset, flippedPlacementInfo, containerDimensions, isContainerDescendentOfBoundary);
    if (flippedSpace > space) {
      placementInfo = flippedPlacementInfo;
      position = flippedPosition;
      normalizedOffset = offset;
    }
  }
  let heightGrowthDirection = "bottom";
  if (placementInfo.axis === "top") {
    if (placementInfo.placement === "top") heightGrowthDirection = "top";
    else if (placementInfo.placement === "bottom") heightGrowthDirection = "bottom";
  } else if (placementInfo.crossAxis === "top") {
    if (placementInfo.crossPlacement === "top") heightGrowthDirection = "bottom";
    else if (placementInfo.crossPlacement === "bottom") heightGrowthDirection = "top";
  }
  let delta = $954926fb6168ae2a$var$getDelta(crossAxis, position[crossAxis], overlaySize[crossSize], boundaryDimensions, containerDimensions, padding, containerOffsetWithBoundary);
  position[crossAxis] += delta;
  let maxHeight = $954926fb6168ae2a$var$getMaxHeight(position, boundaryDimensions, containerOffsetWithBoundary, isContainerPositioned, margins, padding, overlaySize.height, heightGrowthDirection, containerDimensions, isContainerDescendentOfBoundary, visualViewport);
  if (userSetMaxHeight && userSetMaxHeight < maxHeight) maxHeight = userSetMaxHeight;
  overlaySize.height = Math.min(overlaySize.height, maxHeight);
  position = $954926fb6168ae2a$var$computePosition(childOffset, boundaryDimensions, overlaySize, placementInfo, normalizedOffset, crossOffset, containerOffsetWithBoundary, isContainerPositioned, arrowSize, arrowBoundaryOffset, containerDimensions);
  delta = $954926fb6168ae2a$var$getDelta(crossAxis, position[crossAxis], overlaySize[crossSize], boundaryDimensions, containerDimensions, padding, containerOffsetWithBoundary);
  position[crossAxis] += delta;
  let arrowPosition = {};
  let origin = childOffset[crossAxis] - position[crossAxis] - margins[$954926fb6168ae2a$var$AXIS[crossAxis]];
  let preferredArrowPosition = origin + 0.5 * childOffset[crossSize];
  const arrowMinPosition = arrowSize / 2 + arrowBoundaryOffset;
  const overlayMargin = $954926fb6168ae2a$var$AXIS[crossAxis] === "left" ? (margins.left ?? 0) + (margins.right ?? 0) : (margins.top ?? 0) + (margins.bottom ?? 0);
  const arrowMaxPosition = overlaySize[crossSize] - overlayMargin - arrowSize / 2 - arrowBoundaryOffset;
  const arrowOverlappingChildMinEdge = childOffset[crossAxis] + arrowSize / 2 - (position[crossAxis] + margins[$954926fb6168ae2a$var$AXIS[crossAxis]]);
  const arrowOverlappingChildMaxEdge = childOffset[crossAxis] + childOffset[crossSize] - arrowSize / 2 - (position[crossAxis] + margins[$954926fb6168ae2a$var$AXIS[crossAxis]]);
  const arrowPositionOverlappingChild = (0, $240e9101ba2842f5$export$7d15b64cf5a3a4c4)(preferredArrowPosition, arrowOverlappingChildMinEdge, arrowOverlappingChildMaxEdge);
  arrowPosition[crossAxis] = (0, $240e9101ba2842f5$export$7d15b64cf5a3a4c4)(arrowPositionOverlappingChild, arrowMinPosition, arrowMaxPosition);
  ({ placement, crossPlacement } = placementInfo);
  if (arrowSize) origin = arrowPosition[crossAxis];
  else if (crossPlacement === "right") origin += childOffset[crossSize];
  else if (crossPlacement === "center") origin += childOffset[crossSize] / 2;
  let crossOrigin = placement === "left" || placement === "top" ? overlaySize[size] : 0;
  let triggerAnchorPoint = {
    x: placement === "top" || placement === "bottom" ? origin : crossOrigin,
    y: placement === "left" || placement === "right" ? origin : crossOrigin
  };
  return {
    position,
    maxHeight,
    arrowOffsetLeft: arrowPosition.left,
    arrowOffsetTop: arrowPosition.top,
    placement,
    triggerAnchorPoint
  };
}
function $954926fb6168ae2a$export$b3ceb0cbf1056d98(opts) {
  let { placement, targetNode, overlayNode, scrollNode, padding, shouldFlip, boundaryElement, offset, crossOffset, maxHeight, arrowSize = 0, arrowBoundaryOffset = 0, targetRect } = opts;
  let visualViewport = $954926fb6168ae2a$var$getVisualViewport();
  let container = overlayNode instanceof HTMLElement ? $954926fb6168ae2a$var$getContainingBlock(overlayNode) : document.documentElement;
  let isViewportContainer = container === document.documentElement;
  const containerPositionStyle = window.getComputedStyle(container).position;
  let isContainerPositioned = !!containerPositionStyle && containerPositionStyle !== "static";
  let childOffset = isViewportContainer ? $954926fb6168ae2a$var$getOffset(targetNode, false, targetRect) : $954926fb6168ae2a$var$getPosition(targetNode, container, false, targetRect);
  if (!isViewportContainer) {
    let { marginTop, marginLeft } = window.getComputedStyle(targetNode);
    childOffset.top += parseInt(marginTop, 10) || 0;
    childOffset.left += parseInt(marginLeft, 10) || 0;
  }
  let overlaySize = $954926fb6168ae2a$var$getOffset(overlayNode, true);
  let margins = $954926fb6168ae2a$var$getMargins(overlayNode);
  overlaySize.width += (margins.left ?? 0) + (margins.right ?? 0);
  overlaySize.height += (margins.top ?? 0) + (margins.bottom ?? 0);
  let scrollSize = $954926fb6168ae2a$var$getScroll(scrollNode);
  let boundaryDimensions = $954926fb6168ae2a$var$getContainerDimensions(boundaryElement, visualViewport);
  let containerDimensions = $954926fb6168ae2a$var$getContainerDimensions(container, visualViewport);
  let containerOffsetWithBoundary;
  if ((boundaryElement.tagName === "BODY" || boundaryElement.tagName === "HTML") && !isViewportContainer) {
    let containerRect = $954926fb6168ae2a$export$4b834cebd9e5cebe(container, false);
    containerOffsetWithBoundary = {
      top: -(containerRect.top - boundaryDimensions.top),
      left: -(containerRect.left - boundaryDimensions.left),
      width: 0,
      height: 0
    };
  } else if ((boundaryElement.tagName === "BODY" || boundaryElement.tagName === "HTML") && isViewportContainer)
    containerOffsetWithBoundary = {
      top: 0,
      left: 0,
      width: 0,
      height: 0
    };
  else
    containerOffsetWithBoundary = $954926fb6168ae2a$var$getPosition(boundaryElement, container, false);
  let isContainerDescendentOfBoundary = (0, $23f2114a1b82827e$export$4282f70798064fe0)(boundaryElement, container);
  return $954926fb6168ae2a$export$6839422d1f33cee9(placement, childOffset, overlaySize, scrollSize, margins, padding, shouldFlip, boundaryDimensions, containerDimensions, containerOffsetWithBoundary, offset, crossOffset, isContainerPositioned, maxHeight, arrowSize, arrowBoundaryOffset, isContainerDescendentOfBoundary, visualViewport);
}
function $954926fb6168ae2a$export$4b834cebd9e5cebe(node, ignoreScale) {
  let { top, left, width, height } = node.getBoundingClientRect();
  if (ignoreScale && node instanceof node.ownerDocument.defaultView.HTMLElement) {
    width = node.offsetWidth;
    height = node.offsetHeight;
  }
  return {
    top,
    left,
    width,
    height
  };
}
function $954926fb6168ae2a$var$getOffset(node, ignoreScale, overrideRect) {
  let { top, left, width, height } = overrideRect || $954926fb6168ae2a$export$4b834cebd9e5cebe(node, ignoreScale);
  let { scrollTop, scrollLeft, clientTop, clientLeft } = document.documentElement;
  return {
    top: top + scrollTop - clientTop,
    left: left + scrollLeft - clientLeft,
    width,
    height
  };
}
function $954926fb6168ae2a$var$getPosition(node, parent, ignoreScale, overrideRect) {
  let style = window.getComputedStyle(node);
  let offset;
  if (style.position === "fixed") offset = overrideRect || $954926fb6168ae2a$export$4b834cebd9e5cebe(node, ignoreScale);
  else {
    offset = $954926fb6168ae2a$var$getOffset(node, ignoreScale, overrideRect);
    let parentOffset = $954926fb6168ae2a$var$getOffset(parent, ignoreScale);
    let parentStyle = window.getComputedStyle(parent);
    parentOffset.top += (parseInt(parentStyle.borderTopWidth, 10) || 0) - parent.scrollTop;
    parentOffset.left += (parseInt(parentStyle.borderLeftWidth, 10) || 0) - parent.scrollLeft;
    offset.top -= parentOffset.top;
    offset.left -= parentOffset.left;
  }
  offset.top -= parseInt(style.marginTop, 10) || 0;
  offset.left -= parseInt(style.marginLeft, 10) || 0;
  return offset;
}
function $954926fb6168ae2a$var$getContainingBlock(node) {
  let offsetParent = node.offsetParent;
  if (offsetParent && offsetParent === document.body && window.getComputedStyle(offsetParent).position === "static" && !$954926fb6168ae2a$var$isContainingBlock(offsetParent)) offsetParent = document.documentElement;
  if (offsetParent == null) {
    offsetParent = node.parentElement;
    while (offsetParent && !$954926fb6168ae2a$var$isContainingBlock(offsetParent)) offsetParent = offsetParent.parentElement;
  }
  return offsetParent || document.documentElement;
}
function $954926fb6168ae2a$var$isContainingBlock(node) {
  let style = window.getComputedStyle(node);
  return style.transform !== "none" || /transform|perspective/.test(style.willChange) || style.filter !== "none" || style.contain === "paint" || "backdropFilter" in style && style.backdropFilter !== "none" || "WebkitBackdropFilter" in style && style.WebkitBackdropFilter !== "none";
}

// node_modules/react-aria/dist/private/overlays/useCloseOnScroll.mjs
var import_react2 = __toESM(require_react(), 1);
var $22e2f5f6490788e8$export$f6211563215e3b37 = /* @__PURE__ */ new WeakMap();
function $22e2f5f6490788e8$export$18fc8428861184da(opts) {
  let { triggerRef, isOpen, onClose } = opts;
  (0, import_react2.useEffect)(() => {
    if (!isOpen || onClose === null) return;
    let onScroll = (e) => {
      let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
      if (!triggerRef.current || target instanceof Node && !(0, $23f2114a1b82827e$export$4282f70798064fe0)(target, triggerRef.current)) return;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      let onCloseHandler = onClose || $22e2f5f6490788e8$export$f6211563215e3b37.get(triggerRef.current);
      if (onCloseHandler) onCloseHandler();
    };
    return (0, $d447af545b77c9f1$export$f531f92e2a15358f)((0, $23f2114a1b82827e$export$da7af4355d792141)(triggerRef.current), "scroll", onScroll, true);
  }, [
    isOpen,
    onClose,
    triggerRef
  ]);
}

// node_modules/react-aria/dist/private/utils/useResizeObserver.mjs
var import_react3 = __toESM(require_react(), 1);
function $970072cf4b13fde3$var$hasResizeObserver() {
  return typeof window.ResizeObserver !== "undefined";
}
function $970072cf4b13fde3$export$683480f191c0e3ea(options) {
  const { ref, box, onResize } = options;
  let onResizeEvent = (0, $fe16bffc7a557bf0$export$7f54fc3180508a52)(onResize);
  (0, import_react3.useEffect)(() => {
    let element = ref?.current;
    if (!element) return;
    if (!$970072cf4b13fde3$var$hasResizeObserver()) {
      window.addEventListener("resize", onResizeEvent, false);
      return () => {
        window.removeEventListener("resize", onResizeEvent, false);
      };
    } else {
      const resizeObserverInstance = new window.ResizeObserver((entries) => {
        if (!entries.length) return;
        onResizeEvent();
      });
      resizeObserverInstance.observe(element, {
        box
      });
      return () => {
        if (element) resizeObserverInstance.unobserve(element);
      };
    }
  }, [
    ref,
    box
  ]);
}

// node_modules/react-aria/dist/private/overlays/useOverlayPosition.mjs
var import_react4 = __toESM(require_react(), 1);
var $b3526bc71400be8d$var$visualViewport = typeof document !== "undefined" ? window.visualViewport : null;
function $b3526bc71400be8d$export$d39e1813b3bdd0e1(props) {
  let { direction } = (0, $2eb8e6d23f3d0cb0$export$43bb16f9c6d9e3f7)();
  let { arrowSize, targetRef, overlayRef, arrowRef, scrollRef = overlayRef, placement = "bottom", containerPadding = 12, shouldFlip = true, boundaryElement = typeof document !== "undefined" ? document.body : null, offset = 0, crossOffset = 0, shouldUpdatePosition = true, isOpen = true, onClose, maxHeight, arrowBoundaryOffset = 0, getTargetRect } = props;
  let [position, setPosition] = (0, import_react4.useState)(null);
  let deps = [
    shouldUpdatePosition,
    placement,
    // oxlint-disable-next-line react/react-compiler
    overlayRef.current,
    // oxlint-disable-next-line react/react-compiler
    targetRef.current,
    // oxlint-disable-next-line react/react-compiler
    arrowRef?.current,
    // oxlint-disable-next-line react/react-compiler
    scrollRef.current,
    containerPadding,
    shouldFlip,
    boundaryElement,
    offset,
    crossOffset,
    isOpen,
    direction,
    maxHeight,
    arrowBoundaryOffset,
    arrowSize
  ];
  let lastScale = (0, import_react4.useRef)($b3526bc71400be8d$var$visualViewport?.scale);
  (0, import_react4.useEffect)(() => {
    if (isOpen) lastScale.current = $b3526bc71400be8d$var$visualViewport?.scale;
  }, [
    isOpen
  ]);
  let updatePosition = (0, import_react4.useCallback)(() => {
    if (shouldUpdatePosition === false || !isOpen || !overlayRef.current || !targetRef.current || !boundaryElement) return;
    if ($b3526bc71400be8d$var$visualViewport?.scale !== lastScale.current) return;
    let anchor = null;
    if (scrollRef.current && (0, $23f2114a1b82827e$export$b4f377a2b6254582)(scrollRef.current)) {
      let anchorRect = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)()?.getBoundingClientRect();
      let scrollRect = scrollRef.current.getBoundingClientRect();
      anchor = {
        type: "top",
        offset: (anchorRect?.top ?? 0) - scrollRect.top
      };
      if (anchor.offset > scrollRect.height / 2) {
        anchor.type = "bottom";
        anchor.offset = (anchorRect?.bottom ?? 0) - scrollRect.bottom;
      }
    }
    let overlay = overlayRef.current;
    if (!maxHeight && overlayRef.current) {
      overlay.style.top = "0px";
      overlay.style.bottom = "";
      overlay.style.maxHeight = (window.visualViewport?.height ?? window.innerHeight) + "px";
    }
    let position2 = (0, $954926fb6168ae2a$export$b3ceb0cbf1056d98)({
      placement: $b3526bc71400be8d$var$translateRTL(placement, direction),
      overlayNode: overlayRef.current,
      targetNode: targetRef.current,
      scrollNode: scrollRef.current || overlayRef.current,
      padding: containerPadding,
      shouldFlip,
      boundaryElement,
      offset,
      crossOffset,
      maxHeight,
      arrowSize: arrowSize ?? (arrowRef?.current ? (0, $954926fb6168ae2a$export$4b834cebd9e5cebe)(arrowRef.current, true).width : 0),
      arrowBoundaryOffset,
      targetRect: getTargetRect?.(targetRef.current)
    });
    if (!position2.position) return;
    overlay.style.top = "";
    overlay.style.bottom = "";
    overlay.style.left = "";
    overlay.style.right = "";
    Object.keys(position2.position).forEach((key) => overlay.style[key] = position2.position[key] + "px");
    overlay.style.maxHeight = position2.maxHeight != null ? position2.maxHeight + "px" : "";
    let activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)();
    if (anchor && activeElement && scrollRef.current) {
      let anchorRect = activeElement.getBoundingClientRect();
      let scrollRect = scrollRef.current.getBoundingClientRect();
      let newOffset = anchorRect[anchor.type] - scrollRect[anchor.type];
      scrollRef.current.scrollTop += newOffset - anchor.offset;
    }
    setPosition(position2);
  }, deps);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(updatePosition, deps);
  $b3526bc71400be8d$var$useResize(updatePosition);
  (0, $970072cf4b13fde3$export$683480f191c0e3ea)({
    ref: overlayRef,
    onResize: updatePosition
  });
  (0, $970072cf4b13fde3$export$683480f191c0e3ea)({
    ref: targetRef,
    onResize: updatePosition
  });
  let isResizing = (0, import_react4.useRef)(false);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    let timeout;
    let onResize = () => {
      isResizing.current = true;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        isResizing.current = false;
      }, 500);
      updatePosition();
    };
    let onScroll = () => {
      if (isResizing.current) onResize();
    };
    $b3526bc71400be8d$var$visualViewport?.addEventListener("resize", onResize);
    $b3526bc71400be8d$var$visualViewport?.addEventListener("scroll", onScroll);
    return () => {
      $b3526bc71400be8d$var$visualViewport?.removeEventListener("resize", onResize);
      $b3526bc71400be8d$var$visualViewport?.removeEventListener("scroll", onScroll);
    };
  }, [
    updatePosition
  ]);
  let close = (0, import_react4.useCallback)(() => {
    if (!isResizing.current) onClose?.();
  }, [
    onClose,
    isResizing
  ]);
  (0, $22e2f5f6490788e8$export$18fc8428861184da)({
    triggerRef: targetRef,
    isOpen,
    onClose: onClose && close
  });
  return {
    overlayProps: {
      style: {
        position: position ? "absolute" : "fixed",
        top: !position ? 0 : void 0,
        left: !position ? 0 : void 0,
        zIndex: 1e5,
        ...position?.position,
        maxHeight: position?.maxHeight ?? "100vh"
      }
    },
    placement: position?.placement ?? null,
    triggerAnchorPoint: position?.triggerAnchorPoint ?? null,
    arrowProps: {
      "aria-hidden": "true",
      role: "presentation",
      style: {
        left: position?.arrowOffsetLeft,
        top: position?.arrowOffsetTop
      }
    },
    updatePosition
  };
}
function $b3526bc71400be8d$var$useResize(onResize) {
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    window.addEventListener("resize", onResize, false);
    return () => {
      window.removeEventListener("resize", onResize, false);
    };
  }, [
    onResize
  ]);
}
function $b3526bc71400be8d$var$translateRTL(position, direction) {
  if (direction === "rtl") return position.replace("start", "right").replace("end", "left");
  return position.replace("start", "left").replace("end", "right");
}

// node_modules/react-aria/dist/private/overlays/PortalProvider.mjs
var import_react5 = __toESM(require_react(), 1);
var $72abaeab4d80592f$export$60d741e20e0aa309 = /* @__PURE__ */ (0, import_react5.createContext)({});
function $72abaeab4d80592f$export$9fc1347d4195ccb3() {
  return (0, import_react5.useContext)($72abaeab4d80592f$export$60d741e20e0aa309) ?? {};
}

// node_modules/react-aria/dist/private/overlays/useModal.mjs
var import_react6 = __toESM(require_react(), 1);
var import_react_dom = __toESM(require_react_dom(), 1);
var $c07df45195231803$var$Context = /* @__PURE__ */ (0, import_react6.default).createContext(null);
function $c07df45195231803$export$178405afcd8c5eb(props) {
  let { children } = props;
  let parent = (0, import_react6.useContext)($c07df45195231803$var$Context);
  let [modalCount, setModalCount] = (0, import_react6.useState)(0);
  let context = (0, import_react6.useMemo)(() => ({
    parent,
    modalCount,
    addModal() {
      setModalCount((count) => count + 1);
      if (parent) parent.addModal();
    },
    removeModal() {
      setModalCount((count) => count - 1);
      if (parent) parent.removeModal();
    }
  }), [
    parent,
    modalCount
  ]);
  return /* @__PURE__ */ (0, import_react6.default).createElement($c07df45195231803$var$Context.Provider, {
    value: context
  }, children);
}
function $c07df45195231803$export$d9aaed4c3ece1bc0() {
  let context = (0, import_react6.useContext)($c07df45195231803$var$Context);
  return {
    modalProviderProps: {
      "aria-hidden": context && context.modalCount > 0 ? true : void 0
    }
  };
}
function $c07df45195231803$var$OverlayContainerDOM(props) {
  let { modalProviderProps } = $c07df45195231803$export$d9aaed4c3ece1bc0();
  return /* @__PURE__ */ (0, import_react6.default).createElement("div", {
    "data-overlay-container": true,
    ...props,
    ...modalProviderProps
  });
}
function $c07df45195231803$export$bf688221f59024e5(props) {
  return /* @__PURE__ */ (0, import_react6.default).createElement($c07df45195231803$export$178405afcd8c5eb, null, /* @__PURE__ */ (0, import_react6.default).createElement($c07df45195231803$var$OverlayContainerDOM, props));
}
function $c07df45195231803$export$b47c3594eab58386(props) {
  let isSSR = (0, $c7eafbbe1ea5834e$export$535bd6ca7f90a273)();
  let { portalContainer = isSSR ? null : document.body, ...rest } = props;
  let { getContainer } = (0, $72abaeab4d80592f$export$9fc1347d4195ccb3)();
  if (!props.portalContainer && getContainer) portalContainer = getContainer();
  (0, import_react6.default).useEffect(() => {
    if (portalContainer?.closest("[data-overlay-container]")) throw new Error("An OverlayContainer must not be inside another container. Please change the portalContainer prop.");
  }, [
    portalContainer
  ]);
  if (!portalContainer) return null;
  let contents = /* @__PURE__ */ (0, import_react6.default).createElement($c07df45195231803$export$bf688221f59024e5, rest);
  return /* @__PURE__ */ (0, import_react_dom.default).createPortal(contents, portalContainer);
}

// node_modules/react-aria-components/dist/private/Tooltip.mjs
var import_react10 = __toESM(require_react(), 1);

// node_modules/react-stately/dist/private/overlays/useOverlayTriggerState.mjs
var import_react7 = __toESM(require_react(), 1);
function $f11fb0bcf1b2687a$export$61c6a8c84e605fb6(props) {
  let [isOpen, setOpen] = (0, $3e6197669829fe11$export$40bfa8c7b0832715)(props.isOpen, props.defaultOpen || false, props.onOpenChange);
  let [point, setPoint] = (0, import_react7.useState)(null);
  const open = (0, import_react7.useCallback)(() => {
    setOpen(true);
  }, [
    setOpen
  ]);
  const close = (0, import_react7.useCallback)(() => {
    setOpen(false);
  }, [
    setOpen
  ]);
  const toggle = (0, import_react7.useCallback)(() => {
    setOpen(!isOpen);
  }, [
    setOpen,
    isOpen
  ]);
  return {
    isOpen,
    setOpen,
    open,
    close,
    toggle,
    point,
    setPoint
  };
}

// node_modules/react-stately/dist/private/tooltip/useTooltipTriggerState.mjs
var import_react8 = __toESM(require_react(), 1);
var $3834487504f4fc00$var$TOOLTIP_DELAY = 1500;
var $3834487504f4fc00$var$TOOLTIP_COOLDOWN = 500;
var $3834487504f4fc00$var$tooltips = {};
var $3834487504f4fc00$var$tooltipId = 0;
var $3834487504f4fc00$var$globalWarmedUp = false;
var $3834487504f4fc00$var$globalWarmUpTimeout = null;
var $3834487504f4fc00$var$globalCooldownTimeout = null;
function $3834487504f4fc00$export$4d40659c25ecb50b(props = {}) {
  let { delay = $3834487504f4fc00$var$TOOLTIP_DELAY, closeDelay = $3834487504f4fc00$var$TOOLTIP_COOLDOWN } = props;
  let { isOpen, open, close } = (0, $f11fb0bcf1b2687a$export$61c6a8c84e605fb6)(props);
  let [shouldSkipAnimation, setIsInstant] = (0, import_react8.useState)(false);
  let id = (0, import_react8.useMemo)(() => `${++$3834487504f4fc00$var$tooltipId}`, []);
  let closeTimeout = (0, import_react8.useRef)(null);
  let closeCallback = (0, import_react8.useRef)(close);
  let ensureTooltipEntry = () => {
    $3834487504f4fc00$var$tooltips[id] = hideTooltip;
  };
  let closeOpenTooltips = () => {
    for (let hideTooltipId in $3834487504f4fc00$var$tooltips) if (hideTooltipId !== id) {
      $3834487504f4fc00$var$tooltips[hideTooltipId](true, true);
      delete $3834487504f4fc00$var$tooltips[hideTooltipId];
    }
  };
  let showTooltip = (instant) => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    closeTimeout.current = null;
    closeOpenTooltips();
    ensureTooltipEntry();
    setIsInstant(!!instant);
    $3834487504f4fc00$var$globalWarmedUp = true;
    open();
    if ($3834487504f4fc00$var$globalWarmUpTimeout) {
      clearTimeout($3834487504f4fc00$var$globalWarmUpTimeout);
      $3834487504f4fc00$var$globalWarmUpTimeout = null;
    }
    if ($3834487504f4fc00$var$globalCooldownTimeout) {
      clearTimeout($3834487504f4fc00$var$globalCooldownTimeout);
      $3834487504f4fc00$var$globalCooldownTimeout = null;
    }
  };
  let hideTooltip = (immediate, instant) => {
    setIsInstant(!!instant);
    if (immediate || closeDelay <= 0) {
      if (closeTimeout.current) clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
      closeCallback.current();
    } else if (!closeTimeout.current) closeTimeout.current = setTimeout(() => {
      closeTimeout.current = null;
      closeCallback.current();
    }, closeDelay);
    if ($3834487504f4fc00$var$globalWarmUpTimeout) {
      clearTimeout($3834487504f4fc00$var$globalWarmUpTimeout);
      $3834487504f4fc00$var$globalWarmUpTimeout = null;
    }
    if ($3834487504f4fc00$var$globalWarmedUp) {
      if ($3834487504f4fc00$var$globalCooldownTimeout) clearTimeout($3834487504f4fc00$var$globalCooldownTimeout);
      $3834487504f4fc00$var$globalCooldownTimeout = setTimeout(() => {
        delete $3834487504f4fc00$var$tooltips[id];
        $3834487504f4fc00$var$globalCooldownTimeout = null;
        $3834487504f4fc00$var$globalWarmedUp = false;
      }, Math.max($3834487504f4fc00$var$TOOLTIP_COOLDOWN, closeDelay));
    }
  };
  let warmupTooltip = () => {
    closeOpenTooltips();
    ensureTooltipEntry();
    if (!isOpen && !$3834487504f4fc00$var$globalWarmedUp) {
      if ($3834487504f4fc00$var$globalWarmUpTimeout) clearTimeout($3834487504f4fc00$var$globalWarmUpTimeout);
      $3834487504f4fc00$var$globalWarmUpTimeout = setTimeout(() => {
        $3834487504f4fc00$var$globalWarmUpTimeout = null;
        $3834487504f4fc00$var$globalWarmedUp = true;
        showTooltip(false);
      }, delay);
    } else if (!isOpen)
      showTooltip(true);
  };
  (0, import_react8.useEffect)(() => {
    closeCallback.current = close;
  }, [
    close
  ]);
  (0, import_react8.useEffect)(() => {
    return () => {
      if (closeTimeout.current) clearTimeout(closeTimeout.current);
      let tooltip = $3834487504f4fc00$var$tooltips[id];
      if (tooltip) delete $3834487504f4fc00$var$tooltips[id];
    };
  }, [
    id
  ]);
  return {
    isOpen,
    shouldSkipAnimation,
    open: (immediate) => {
      if (!immediate && delay > 0 && !closeTimeout.current) warmupTooltip();
      else
        showTooltip($3834487504f4fc00$var$globalWarmedUp);
    },
    close: hideTooltip
  };
}

// node_modules/react-aria/dist/private/tooltip/useTooltip.mjs
function $8c383cffc84c9982$export$1c4b08e0eca38426(props, state) {
  let domProps = (0, $8e9d2fae0ecb9001$export$457c3d6518dd4c6f)(props, {
    labelable: true
  });
  let { hoverProps } = (0, $e969f22b6713ca4a$export$ae780daf29e6d456)({
    onHoverStart: () => state?.open(true),
    onHoverEnd: () => state?.close()
  });
  return {
    tooltipProps: (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(domProps, hoverProps, {
      role: "tooltip"
    })
  };
}

// node_modules/react-aria/dist/private/tooltip/useTooltipTrigger.mjs
var import_react9 = __toESM(require_react(), 1);
function $85908aa8a35f0fac$export$a6da6c504e4bba8b(props, state, ref) {
  let { isDisabled, trigger, shouldCloseOnPress = true } = props;
  let tooltipId = (0, $390e54f620492c70$export$f680877a34711e37)();
  let isHovered = (0, import_react9.useRef)(false);
  let isFocused = (0, import_react9.useRef)(false);
  let handleShow = () => {
    if (isHovered.current || isFocused.current) state.open(isFocused.current);
  };
  let handleHide = (immediate) => {
    if (!isHovered.current && !isFocused.current) state.close(immediate);
  };
  (0, import_react9.useEffect)(() => {
    let onKeyDown = (e) => {
      if (ref && ref.current) {
        if (e.key === "Escape") {
          e.stopPropagation();
          state.close(true);
        }
      }
    };
    if (state.isOpen) {
      document.addEventListener("keydown", onKeyDown, true);
      return () => {
        document.removeEventListener("keydown", onKeyDown, true);
      };
    }
  }, [
    ref,
    state
  ]);
  let onHoverStart = () => {
    if (trigger === "focus") return;
    if ((0, $8f5a2122b0992be3$export$630ff653c5ada6a9)() === "pointer") isHovered.current = true;
    else isHovered.current = false;
    handleShow();
  };
  let onHoverEnd = () => {
    if (trigger === "focus") return;
    isFocused.current = false;
    isHovered.current = false;
    handleHide();
  };
  let onPressStart = () => {
    if (!shouldCloseOnPress) return;
    isFocused.current = false;
    isHovered.current = false;
    handleHide(true);
  };
  let onFocus = () => {
    let isVisible = (0, $8f5a2122b0992be3$export$b9b3dfddab17db27)();
    if (isVisible) {
      isFocused.current = true;
      handleShow();
    }
  };
  let onBlur = () => {
    isFocused.current = false;
    isHovered.current = false;
    handleHide(true);
  };
  let { hoverProps } = (0, $e969f22b6713ca4a$export$ae780daf29e6d456)({
    isDisabled,
    onHoverStart,
    onHoverEnd
  });
  let { focusableProps } = (0, $d1116acdf220c2da$export$4c014de7c8940b4c)({
    isDisabled,
    onFocus,
    onBlur
  }, ref);
  return {
    triggerProps: {
      "aria-describedby": state.isOpen ? tooltipId : void 0,
      // oxlint-disable-next-line react/react-compiler
      ...(0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(focusableProps, hoverProps, {
        onPointerDown: onPressStart,
        onKeyDown: onPressStart
      }),
      tabIndex: void 0
    },
    tooltipProps: {
      id: tooltipId
    }
  };
}

// node_modules/react-aria-components/dist/private/Tooltip.mjs
var $05a50f7d78b03ad9$export$7a7623236eec67fa = /* @__PURE__ */ (0, import_react10.createContext)(null);
var $05a50f7d78b03ad9$export$39ae08fa83328b12 = /* @__PURE__ */ (0, import_react10.createContext)(null);
function $05a50f7d78b03ad9$export$8c610744efcf8a1d(props) {
  let state = (0, $3834487504f4fc00$export$4d40659c25ecb50b)(props);
  let ref = (0, import_react10.useRef)(null);
  let { triggerProps, tooltipProps } = (0, $85908aa8a35f0fac$export$a6da6c504e4bba8b)(props, state, ref);
  return /* @__PURE__ */ (0, import_react10.default).createElement((0, $7230ffa83bc0c2cf$export$2881499e37b75b9a), {
    values: [
      [
        $05a50f7d78b03ad9$export$7a7623236eec67fa,
        state
      ],
      [
        $05a50f7d78b03ad9$export$39ae08fa83328b12,
        {
          ...tooltipProps,
          triggerRef: ref
        }
      ]
    ]
  }, /* @__PURE__ */ (0, import_react10.default).createElement((0, $d1116acdf220c2da$export$13f3202a3e5ddd5), {
    ...triggerProps,
    ref
  }, props.children));
}
var $05a50f7d78b03ad9$export$28c660c63b792dea = /* @__PURE__ */ (0, import_react10.forwardRef)(function Tooltip({ UNSTABLE_portalContainer, ...props }, ref) {
  [props, ref] = (0, $7230ffa83bc0c2cf$export$29f1550f4b0d4415)(props, ref, $05a50f7d78b03ad9$export$39ae08fa83328b12);
  let contextState = (0, import_react10.useContext)($05a50f7d78b03ad9$export$7a7623236eec67fa);
  let localState = (0, $3834487504f4fc00$export$4d40659c25ecb50b)(props);
  let state = props.isOpen != null || props.defaultOpen != null || !contextState ? localState : contextState;
  let exitAnimation = (0, $fcc7165e876206c6$export$45fda7c47f93fd48)(ref, state.isOpen);
  let isExiting = props.isExiting || !state.shouldSkipAnimation && exitAnimation || false;
  if (!state.isOpen && !isExiting) return null;
  return /* @__PURE__ */ (0, import_react10.default).createElement((0, $c07df45195231803$export$b47c3594eab58386), {
    portalContainer: UNSTABLE_portalContainer
  }, /* @__PURE__ */ (0, import_react10.default).createElement($05a50f7d78b03ad9$var$TooltipInner, {
    ...props,
    tooltipRef: ref,
    isExiting
  }));
});
function $05a50f7d78b03ad9$var$TooltipInner(props) {
  let state = (0, import_react10.useContext)($05a50f7d78b03ad9$export$7a7623236eec67fa);
  let arrowRef = (0, import_react10.useRef)(null);
  let { overlayProps, arrowProps, placement, triggerAnchorPoint } = (0, $b3526bc71400be8d$export$d39e1813b3bdd0e1)({
    placement: props.placement || "top",
    targetRef: props.triggerRef,
    overlayRef: props.tooltipRef,
    arrowRef,
    offset: props.offset,
    crossOffset: props.crossOffset,
    isOpen: state.isOpen,
    arrowBoundaryOffset: props.arrowBoundaryOffset,
    shouldFlip: props.shouldFlip,
    containerPadding: props.containerPadding,
    onClose: () => state.close(true)
  });
  let enterAnimation = (0, $fcc7165e876206c6$export$6d3443f2c48bfc20)(props.tooltipRef, !!placement);
  let isEntering = props.isEntering || !state.shouldSkipAnimation && enterAnimation || false;
  let renderProps = (0, $7230ffa83bc0c2cf$export$4d86445c2cf5e3)({
    ...props,
    defaultClassName: "react-aria-Tooltip",
    values: {
      placement,
      isEntering,
      isExiting: props.isExiting,
      state
    }
  });
  props = (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(props, overlayProps);
  let { tooltipProps } = (0, $8c383cffc84c9982$export$1c4b08e0eca38426)(props, state);
  let DOMProps = (0, $8e9d2fae0ecb9001$export$457c3d6518dd4c6f)(props, {
    global: true
  });
  return /* @__PURE__ */ (0, import_react10.default).createElement((0, $7230ffa83bc0c2cf$export$df3a06d6289f983e).div, {
    ...(0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(DOMProps, renderProps, tooltipProps),
    ref: props.tooltipRef,
    style: {
      ...overlayProps.style,
      "--trigger-anchor-point": triggerAnchorPoint ? `${triggerAnchorPoint.x}px ${triggerAnchorPoint.y}px` : void 0,
      ...renderProps.style
    },
    "data-placement": placement ?? void 0,
    "data-entering": isEntering || void 0,
    "data-exiting": props.isExiting || void 0
  }, /* @__PURE__ */ (0, import_react10.default).createElement((0, $4fcfe18fac72dabd$export$2de4954e8ae13b9f).Provider, {
    value: {
      ...arrowProps,
      placement,
      ref: arrowRef
    }
  }, renderProps.children));
}

export {
  $240e9101ba2842f5$export$7d15b64cf5a3a4c4,
  $240e9101ba2842f5$export$cb6e0bb50bc19463,
  $4fcfe18fac72dabd$export$2de4954e8ae13b9f,
  $4fcfe18fac72dabd$export$746d02f47f4d381,
  $22e2f5f6490788e8$export$f6211563215e3b37,
  $970072cf4b13fde3$export$683480f191c0e3ea,
  $b3526bc71400be8d$export$d39e1813b3bdd0e1,
  $72abaeab4d80592f$export$9fc1347d4195ccb3,
  $f11fb0bcf1b2687a$export$61c6a8c84e605fb6,
  $3834487504f4fc00$export$4d40659c25ecb50b,
  $05a50f7d78b03ad9$export$8c610744efcf8a1d,
  $05a50f7d78b03ad9$export$28c660c63b792dea
};
