import React from "react";
import { MediaJobCard } from "./MediaJobCard";

export interface MediaJobDraft {
  sourceText: string;
  sourceLang?: string;
  targetLang?: string;
  topic?: string;
}

export interface MediaJobDraftProps {
  jobId: string;
  fileName: string;
  sourceText: string;
  draft?: MediaJobDraft;
  onDraftChange?: (draft: MediaJobDraft) => void;
  onJobMissing?: () => void;
  onJobDiscard?: () => void;
}

export function MediaJobAttachment({
  jobId,
  fileName,
  sourceText,
  draft,
  onDraftChange,
  onJobMissing,
  onJobDiscard,
}: MediaJobDraftProps) {
  return (
    <MediaJobCard
      jobId={jobId}
      fileName={fileName}
      sourceText={draft?.sourceText ?? sourceText}
      sourceLang={draft?.sourceLang}
      targetLang={draft?.targetLang}
      topic={draft?.topic}
      onSourceLangChange={(sourceLang) =>
        onDraftChange?.({ ...draft, sourceText, sourceLang })
      }
      onTargetLangChange={(targetLang) =>
        onDraftChange?.({ ...draft, sourceText, targetLang })
      }
      onTopicChange={(topic) =>
        onDraftChange?.({ ...draft, sourceText, topic })
      }
      onLanguageHints={(hints) =>
        onDraftChange?.({
          ...draft,
          sourceText,
          sourceLang: draft?.sourceLang ?? hints.sourceLang,
          targetLang: draft?.targetLang ?? hints.targetLang,
        })
      }
      onJobMissing={onJobMissing}
      onJobDiscard={onJobDiscard}
    />
  );
}
