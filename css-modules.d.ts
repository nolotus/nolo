/** Ambient modules for CSS side-effect imports (esbuild bundles real CSS). */
declare module "*.css";

/** Ambient modules for static image imports (esbuild bundles/urls real assets). */
declare module "*.png" {
  const src: string;
  export default src;
}
declare module "*.jpg" {
  const src: string;
  export default src;
}
declare module "*.jpeg" {
  const src: string;
  export default src;
}
declare module "*.svg" {
  const src: string;
  export default src;
}
