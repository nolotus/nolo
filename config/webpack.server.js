const path = require('path');
const webpackNodeExternals = require("webpack-node-externals");

module.exports = {
  entry: '/server/index.js',
  output: {
    filename: 'server.js',
    path: path.resolve(__dirname, '../build'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: "babel-loader",
        exclude: /node_modules/,
      },
    ],
  },
  externals: [webpackNodeExternals()],
};