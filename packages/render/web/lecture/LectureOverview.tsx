import React from "react";
import * as stylex from "@stylexjs/stylex";
import type { LectureResult } from "ai/lecture/types";
import IframeArtifactBlock from "../elements/IframeArtifactBlock";
import { LECTURE_OVERVIEW_ARTIFACT_CODE } from "./lectureOverviewArtifact";
import { lectureOverviewStyles as styles } from "./LectureOverview.styles";

export function LectureOverview({ result, onSeek }: { result: LectureResult; onSeek: (sec: number) => void }) {
  const duration = result.source.durationSec;
  return <div {...stylex.props(styles.wrap)}>
    <IframeArtifactBlock
      rawCode={LECTURE_OVERVIEW_ARTIFACT_CODE}
      data={result}
      onArtifactEvent={event => {
        if (event.type === "seek") {
          const payload = event.payload as { sec?: unknown };
          onSeek(payload.sec as number);
        }
      }}
      allowedEvents={{ seek: payload => {
        if (!payload || typeof payload !== "object") return false;
        const sec = (payload as { sec?: unknown }).sec;
        return typeof sec === "number" && Number.isFinite(sec) && sec >= 0 && sec <= duration;
      } }}
    />
  </div>;
}
