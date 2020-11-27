const path = require("path");

module.exports = {
  entry: "/web/client.js",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "../public"),
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
};
