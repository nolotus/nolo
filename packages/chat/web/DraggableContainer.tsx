import React, { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { sidebarStyles } from "./sidebarStyles";
import { withLiteralClass } from "./withLiteralClass";
import "./chatStylexEscapeHatch.css";

interface DraggableContainerProps {
  id: string;
  children: (handleProps: {
    onDragStart?: (e: React.DragEvent) => void;
    onDragEnd?: (e: React.DragEvent) => void;
  }) => React.ReactNode;
  onDropItem: (
    itemId: string,
    sourceContainer: string,
    targetContainer: string
  ) => void;
  onDropCategory?: (sourceId: string, targetId: string) => void;
}

export const DraggableContainer: React.FC<DraggableContainerProps> = ({
  id,
  children,
  onDropItem,
  onDropCategory,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dragType, setDragType] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDraggingOver(true);
    if (!dragType) {
      setDragType(e.dataTransfer.getData("dragType"));
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
    setDragType(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("dragType");
    setIsDraggingOver(false);
    setDragType(null);

    if (type === "category" && onDropCategory) {
      const sourceId = e.dataTransfer.getData("categoryId");
      if (sourceId && sourceId !== id) onDropCategory(sourceId, id);
    } else if (type === "item") {
      const itemId = e.dataTransfer.getData("itemId");
      const sourceContainer = e.dataTransfer.getData("sourceContainer");
      if (itemId && sourceContainer !== id)
        onDropItem(itemId, sourceContainer, id);
    }
  };

  const getDragOverClass = () => {
    if (!isDraggingOver) return "";
    if (dragType === "category" && onDropCategory)
      return "DraggableContainer--drag-over-category";
    if (dragType === "item") return "DraggableContainer--drag-over-item";
    return "";
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      {...withLiteralClass(
        `DraggableContainer ${getDragOverClass()}`,
        sidebarStyles.draggableContainer,
        isDraggingOver &&
          dragType === "category" &&
          onDropCategory &&
          sidebarStyles.draggableContainerDragOverCategory,
        isDraggingOver &&
          dragType === "item" &&
          sidebarStyles.draggableContainerDragOverItem
      )}
    >
      {children({})}
    </div>
  );
};
