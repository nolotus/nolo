import * as stylex from "@stylexjs/stylex";
import React from "react";
import { homeStyles } from "./HomeStyles";
import { withLiteralClass } from "./share/withLiteralClass";

const CARD_COUNT = 6;

// 骨架静态样式在 HomeStyles.ts；shimmer 动画仍在 Home.css 逃生舱，
// 经 hook 类名 home-pane-skeleton__shimmer 挂载。
const HomePaneSkeleton = () => (
  <div {...stylex.props(homeStyles.homeSkeleton)} aria-hidden="true">
    <div {...stylex.props(homeStyles.homeSkeletonGrid)}>
      {Array.from({ length: CARD_COUNT }).map((_, index) => (
        <div key={index} {...stylex.props(homeStyles.homeSkeletonCard)}>
          <div {...stylex.props(homeStyles.homeSkeletonHeader)}>
            <div
              {...withLiteralClass("home-pane-skeleton__shimmer", homeStyles.homeSkeletonAvatar)}
            />
            <div {...stylex.props(homeStyles.homeSkeletonHeaderText)}>
              <div
                {...withLiteralClass(
                  "home-pane-skeleton__shimmer",
                  homeStyles.homeSkeletonLine,
                  homeStyles.homeSkeletonLineTitle
                )}
              />
              <div
                {...withLiteralClass(
                  "home-pane-skeleton__shimmer",
                  homeStyles.homeSkeletonLine,
                  homeStyles.homeSkeletonLineSubtitle
                )}
              />
            </div>
          </div>
          <div {...stylex.props(homeStyles.homeSkeletonBody)}>
            <div {...withLiteralClass("home-pane-skeleton__shimmer", homeStyles.homeSkeletonLine)} />
            <div {...withLiteralClass("home-pane-skeleton__shimmer", homeStyles.homeSkeletonLine)} />
            <div
              {...withLiteralClass(
                "home-pane-skeleton__shimmer",
                homeStyles.homeSkeletonLine,
                homeStyles.homeSkeletonLineShort
              )}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default React.memo(HomePaneSkeleton);
