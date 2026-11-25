import React from "react";
import "./DialogEntrySkeleton.css";

export default function DialogEntrySkeleton() {
  return (
    <div className="DialogEntrySkeleton" role="status" aria-busy="true">
      <div className="DialogEntrySkeleton-message" />
      <div className="DialogEntrySkeleton-composer" />
    </div>
  );
}
