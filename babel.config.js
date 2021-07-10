module.exports = {
  presets: ['@babel/preset-react', 'module:metro-react-native-babel-preset'],
  plugins: [
    ['babel-plugin-styled-components'],
    ['@babel/plugin-transform-runtime'],
    [
      'module-resolver',
      {
        alias: {
          'pouchdb-md5': 'react-native-pouchdb-md5',
          'pouchdb-binary-utils':
            '@craftzdog/pouchdb-binary-utils-react-native',
        },
      },
    ],
  ],
};
