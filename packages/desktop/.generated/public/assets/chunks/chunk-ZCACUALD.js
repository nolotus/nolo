// packages/create/space/publicCatalogSpace.ts
var PUBLIC_CATALOG_SPACE_ID = "01KKY77TT0DA9NY7TNW3R7255N";
function isPublicCatalogSpace(spaceId) {
  return typeof spaceId === "string" && spaceId.trim() === PUBLIC_CATALOG_SPACE_ID;
}

export {
  PUBLIC_CATALOG_SPACE_ID,
  isPublicCatalogSpace
};
