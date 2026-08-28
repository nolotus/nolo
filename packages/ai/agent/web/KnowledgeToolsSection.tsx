/**
 * 知识与工具区——合并 ReferencesTab + ToolsTab。
 *
 * 自研 useForm：value/onChange 直连。
 */

import React from "react";
import ReferencesTab from "./ReferencesTab";
import ToolsTab from "./ToolsTab";
import type { FormData } from "../createAgentSchema";

type KnowledgeToolsSectionProps = {
  errors: Record<string, string>;
  values: FormData;
  set: (name: string, value: unknown) => void;
  initialValues: any;
};

const KnowledgeToolsSection: React.FC<KnowledgeToolsSectionProps> = ({
  errors,
  values,
  set,
  initialValues,
}) => {
  return (
    <div className="knowledge-tools-section">
      <ReferencesTab errors={errors} values={values} set={set} />
      <hr className="knowledge-tools-section__divider" />
      <ToolsTab errors={errors} values={values} set={set} initialValues={initialValues} />
      <style>{`
        .knowledge-tools-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .knowledge-tools-section__divider {
          border: none;
          border-top: 1px solid var(--border);
          margin: var(--space-4) 0;
        }
      `}</style>
    </div>
  );
};

export default KnowledgeToolsSection;