import { useState, useEffect, useRef } from "react";
import { getModelsByProvider, getProviderByModelName } from "ai/llm/providers";
import type { Model, ModelPrice } from "ai/llm/types";

type ModelWithLegacyPricing = Partial<Model> & {
  pricing?: ModelPrice | null;
};

export const resolveModelPrice = (
  model?: ModelWithLegacyPricing | null
): ModelPrice => {
  const price = model?.price ?? model?.pricing;
  return {
    input: typeof price?.input === "number" ? price.input : 0,
    output: typeof price?.output === "number" ? price.output : 0,
    cachingWrite: price?.cachingWrite,
    cachingRead: price?.cachingRead,
    inputCacheHit: price?.inputCacheHit,
  };
};

const useModelPricing = (
  provider: string,
  modelName: string,
  setValue?: (name: string, value: number) => void
) => {
  const [models, setModels] = useState<Model[]>([]);
  const [inputPrice, setInputPrice] = useState<number>(0);
  const [outputPrice, setOutputPrice] = useState<number>(0);
  const setValueRef = useRef(setValue);

  useEffect(() => {
    setValueRef.current = setValue;
  }, [setValue]);

  useEffect(() => {
    // 若 provider 为空，从模型名反查（防止 provider 漏传导致定价缺失）
    const resolvedProvider = provider || getProviderByModelName(modelName);
    if (!resolvedProvider) return;
    setModels(getModelsByProvider(resolvedProvider as any));
  }, [provider, modelName]);

  useEffect(() => {
    const selectedModel = models.find((model) => model.name === modelName);
    if (selectedModel) {
      const price = resolveModelPrice(selectedModel as ModelWithLegacyPricing);
      setInputPrice((current) => current === price.input ? current : price.input);
      setOutputPrice((current) => current === price.output ? current : price.output);

      if (setValueRef.current) {
        setValueRef.current("inputPrice", price.input);
        setValueRef.current("outputPrice", price.output);
      }
    }
  }, [models, modelName]);

  const updateInputPrice = (value: number) => {
    setInputPrice(value);
    if (setValue) setValue("inputPrice", value);
  };

  const updateOutputPrice = (value: number) => {
    setOutputPrice(value);
    if (setValue) setValue("outputPrice", value);
  };

  return {
    inputPrice,
    outputPrice,
    setInputPrice: updateInputPrice,
    setOutputPrice: updateOutputPrice,
  };
};

export default useModelPricing;
