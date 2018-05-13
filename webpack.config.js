const path = require('path');

const staticDir = path.resolve(__dirname, 'static');
const srcDir = path.resolve(__dirname, 'src');

module.exports = {
  mode: 'none',
  entry: './src/sandbox.ts',
  output: {
    filename: 'index.js',
    path: staticDir
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
    modules: [srcDir, 'node_modules']
  }
};
