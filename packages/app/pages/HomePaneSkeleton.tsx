import React from "react";

const CARD_COUNT = 6;

const HomePaneSkeleton = () => (
  <div className="home-pane-skeleton" aria-hidden="true">
    <div className="home-pane-skeleton__grid">
      {Array.from({ length: CARD_COUNT }).map((_, index) => (
        <div key={index} className="home-pane-skeleton__card">
          <div className="home-pane-skeleton__header">
            <div className="home-pane-skeleton__avatar home-pane-skeleton__shimmer" />
            <div className="home-pane-skeleton__header-text">
              <div className="home-pane-skeleton__line home-pane-skeleton__line--title home-pane-skeleton__shimmer" />
              <div className="home-pane-skeleton__line home-pane-skeleton__line--subtitle home-pane-skeleton__shimmer" />
            </div>
          </div>
          <div className="home-pane-skeleton__body">
            <div className="home-pane-skeleton__line home-pane-skeleton__shimmer" />
            <div className="home-pane-skeleton__line home-pane-skeleton__shimmer" />
            <div className="home-pane-skeleton__line home-pane-skeleton__line--short home-pane-skeleton__shimmer" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default React.memo(HomePaneSkeleton);