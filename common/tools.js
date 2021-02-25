import {useLayoutEffect} from 'react';
export const themeMap = new Map([
  ['dark', {'button-color': '#FFF'}],
  [
    'light',
    {
      primaryColor: '#03a9f4',
      backgroundColor: '#fff',
      borderRadius: ' 6px',
      neutralShade3: '#d1d3d4',
      neutralShade4: '#babdbf',
    },
  ],
]);
export const toHex = (str) => {
  let result = '';
  for (var i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString(16);
  }
  return result;
};
// const THEMES = {
//   dark: () => import("../style/dark.js"),
//   light: () => import("../style/light.js"),
// };

// export const loadThemes = (theme) =>THEMES[theme]()

export function useTheme(theme) {
  useLayoutEffect(
    () => {
      // Iterate through each value in theme object
      for (const key in theme) {
        // Update css variables in document's root element
        document.documentElement.style.setProperty(`--${key}`, theme[key]);
      }
    },
    [theme], // Only call again if theme object reference changes
  );
}
