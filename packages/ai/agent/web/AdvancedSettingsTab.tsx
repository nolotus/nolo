/**
 * AdvancedSettingsTab — 现在是薄壳，组合三个拆出的子组件。
 *
 * 自研 useForm：value/onChange 直连，无 Controller/useWatch。
 * 三个子组件（ModelSourceSection / AdvancedRuntimeSection / ModelParamsSection）
 * 各自接收 values/set/errors。
 */

import React from "react";
import type { ApiSourceType } from "./PersonaSection";
import type { FormData } from "../createAgentSchema";
import ModelSourceSection from "./ModelSourceSection";
import AdvancedRuntimeSection from "./AdvancedRuntimeSection";
import ModelParamsSection from "./ModelParamsSection";

type AdvancedSettingsTabProps = {
  errors: Record<string, string>;
  values: FormData;
  set: (name: string, value: unknown) => void;
  apiSource: ApiSourceType;
  setApiSource: (next: ApiSourceType) => void;
  readOnly?: boolean;
};

const AdvancedSettingsTab: React.FC<AdvancedSettingsTabProps> = (props) => {
  const { errors, values, set, apiSource, setApiSource, readOnly = false } = props;

  return (
    <div className="adv-settings">
      <ModelSourceSection
        errors={errors}
        values={values}
        set={set}
        apiSource={apiSource}
        setApiSource={setApiSource}
        readOnly={readOnly}
      />
      <AdvancedRuntimeSection
        errors={errors}
        values={values}
        set={set}
        apiSource={apiSource}
        readOnly={readOnly}
      />
      <ModelParamsSection
        errors={errors}
        values={values}
        set={set}
        readOnly={readOnly}
      />
      <style>{`
        .adv-settings {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
          animation: fadeInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .adv-settings__model {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          padding: 0 var(--space-2);
        }

        .adv-settings__group {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          padding: 0 var(--space-2);
        }

        .adv-settings__params {
          padding: var(--space-8);
          background: var(--backgroundSecondary);
          border-radius: var(--radius-md);
          border: none;
          box-shadow: 0 4px 20px var(--shadowLight);
          transition: all 0.3s ease;
        }

        .adv-settings__params-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-4);
        }

        .adv-settings__params-toggle {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          color: var(--text);
        }

        .adv-settings__title {
          font-size: var(--fontSize-md);
          font-weight: 600;
          margin: 0;
        }

        .adv-settings__params-chevron {
          transition: transform 0.3s ease;
        }

        .adv-settings__params-chevron.is-open {
          transform: rotate(180deg);
        }

        .adv-settings__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-6);
        }

        .adv-settings__item {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .adv-settings__max-tokens {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-3);
          align-items: flex-end;
        }

        .adv-settings__max-tokens .slider-container {
          flex: 1 1 220px;
          min-width: 220px;
        }

        :global(.reset-icon) {
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        :global(button:hover .reset-icon) {
          transform: rotate(180deg);
        }
        
        :global(button:active .reset-icon) {
          transform: rotate(360deg);
          transition: transform 0.3s ease;
        }

        :global(.cli-info-box__hint) {
          margin: var(--space-2) 0 0;
          color: var(--textSecondary);
          font-size: var(--fontSize-sm);
          line-height: 1.5;
        }

        @media (max-width: 768px) {
          .adv-settings__params {
            padding: var(--space-6);
            border-radius: var(--radius-md);
          }
          
          .adv-settings__grid {
            grid-template-columns: 1fr;
            gap: var(--space-8);
          }
          
          .adv-settings__params-header {
            margin-bottom: var(--space-8);
          }
        }
      `}</style>
    </div>
  );
};

export default AdvancedSettingsTab;