module.exports = {
  presets: [
    '@babel/preset-env',
    '@babel/preset-react',
    'module:metro-react-native-babel-preset',
  ],
  plugins: [
    ['babel-plugin-styled-components'],
    ['@babel/plugin-transform-runtime'],
  ],
};
