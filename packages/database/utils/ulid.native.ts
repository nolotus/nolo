import { monotonicFactory } from "ulid";

// 简单的随机数生成器，虽然不加密安全，但在 RN 开发环境下够用了
const prng = () => Math.random();

export const ulid = monotonicFactory(prng);
