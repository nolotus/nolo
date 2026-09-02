// 文件路径: packages/chat/web/ImageConfigRow.tsx

import * as stylex from "@stylexjs/stylex";
import { messageInputStyles } from "./messageInputStyles";
import "./chatStylexEscapeHatch.css";
import React from "react";
import { useTranslation } from "react-i18next";
import { Select, SelectItem } from "render/web/ui/Select";

type ImageSizeKey = "1K" | "2K" | "4K";

interface ImageUiConfigForRow {
  supportedAspectRatios: string[];
  supportedImageSizes: ImageSizeKey[];
  pricePerImage?: number;
  waitHint?: string;
  defaultImageProfileKey?: "speed" | "quality";
  imageProfiles?: Array<{
    key: "speed" | "quality";
    label: string;
  }>;
}

interface ImageConfigRowProps {
  aspectRatio?: string;
  imageSize?: ImageSizeKey;
  imageProfileKey?: "speed" | "quality";
  imageUiConfig: ImageUiConfigForRow;
  onAspectRatioChange: (value?: string) => void;
  onImageSizeChange: (value?: ImageSizeKey) => void;
  onImageProfileChange: (value?: "speed" | "quality") => void;
}

const ImageConfigRow: React.FC<ImageConfigRowProps> = ({
  aspectRatio,
  imageSize,
  imageProfileKey,
  imageUiConfig,
  onAspectRatioChange,
  onImageSizeChange,
  onImageProfileChange,
}) => {
  const { t } = useTranslation("chat");

  const {
    supportedAspectRatios,
    supportedImageSizes,
    pricePerImage,
    waitHint,
    defaultImageProfileKey,
    imageProfiles = [],
  } = imageUiConfig;

  // 没有任何配置时，不展示
  if (
    !supportedAspectRatios.length &&
    !supportedImageSizes.length &&
    typeof pricePerImage !== "number" &&
    !waitHint &&
    imageProfiles.length === 0
  ) {
    return null;
  }

  const handleAspectRatioChange = (value: string | number | null) => {
    onAspectRatioChange(value ? String(value) : undefined);
  };

  const handleImageSizeChange = (value: string | number | null) => {
    onImageSizeChange((value ? String(value) : undefined) as ImageSizeKey | undefined);
  };

  const handleImageProfileChange = (value: string | number | null) => {
    onImageProfileChange((value ? String(value) : undefined) as "speed" | "quality" | undefined);
  };

  return (
    <>
      <div
        data-testid="image-config-row"
        {...stylex.props(messageInputStyles.imageConfigRow)}
      >
        <span>{t("imageOptionsLabel", "生成图片设置")}</span>

        {imageProfiles.length > 0 && (
          <Select
            selectedKey={imageProfileKey || ""}
            onSelectionChange={(key) =>
              handleImageProfileChange(key == null ? "" : String(key))
            }
            {...stylex.props(messageInputStyles.imageConfigRowSelect)}
          >
            <SelectItem
              id=""
              textValue={
                defaultImageProfileKey === "speed"
                  ? t("imageProfileDefaultSpeed", "模式: 默认（速度优先）")
                  : defaultImageProfileKey === "quality"
                    ? t("imageProfileDefaultQuality", "模式: 默认（质量优先）")
                    : t("imageProfileDefault", "模式: 默认")
              }
            >
              {defaultImageProfileKey === "speed"
                ? t("imageProfileDefaultSpeed", "模式: 默认（速度优先）")
                : defaultImageProfileKey === "quality"
                  ? t("imageProfileDefaultQuality", "模式: 默认（质量优先）")
                  : t("imageProfileDefault", "模式: 默认")}
            </SelectItem>
            {imageProfiles.map((profile) => (
              <SelectItem
                key={profile.key}
                id={profile.key}
                textValue={profile.label}
              >
                {profile.label}
              </SelectItem>
            ))}
          </Select>
        )}

        {supportedAspectRatios.length > 0 && (
          <Select
            selectedKey={aspectRatio || ""}
            onSelectionChange={(key) =>
              handleAspectRatioChange(key == null ? "" : String(key))
            }
            {...stylex.props(messageInputStyles.imageConfigRowSelect)}
          >
            <SelectItem id="" textValue={t("imageAspectDefault", "比例: 默认")}>
              {t("imageAspectDefault", "比例: 默认")}
            </SelectItem>
            {supportedAspectRatios.map((ratio) => (
              <SelectItem key={ratio} id={ratio} textValue={ratio}>
                {ratio}
              </SelectItem>
            ))}
          </Select>
        )}

        {supportedImageSizes.length > 0 && (
          <Select
            selectedKey={imageSize || ""}
            onSelectionChange={(key) =>
              handleImageSizeChange(key == null ? "" : String(key))
            }
            {...stylex.props(messageInputStyles.imageConfigRowSelect)}
          >
            <SelectItem id="" textValue={t("imageSizeDefault", "清晰度: 默认")}>
              {t("imageSizeDefault", "清晰度: 默认")}
            </SelectItem>
            {supportedImageSizes.map((sz) => (
              <SelectItem key={sz} id={sz} textValue={sz}>
                {sz}
              </SelectItem>
            ))}
          </Select>
        )}

        {typeof pricePerImage === "number" && (
          <span className="image-config-row__price">
            {t("imagePriceHint", "图像价格约")} {pricePerImage.toFixed(4)}
            {t("imagePriceUnitSuffix", " / 张（加上 token 费用）")}
          </span>
        )}
        {waitHint && (
          <span className="image-config-row__price">
            {waitHint}
          </span>
        )}
      </div>
    </>
  );
};

export default ImageConfigRow;
