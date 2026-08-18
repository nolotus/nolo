import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  selectTheme
} from "/public/assets/chunks/chunk-RWWUEPWY.js";

// packages/app/theme/index.ts
var useTheme = () => {
  const theme = useAppSelector(selectTheme);
  return theme;
};

export {
  useTheme
};
