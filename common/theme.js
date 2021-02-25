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
