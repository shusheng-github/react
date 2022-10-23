const path = require('path');
const {readdirSync} = require('fs');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const {DefinePlugin} = require('webpack');

const resolve = target => path.join(__dirname, target);
const generateReactAlias = () => {
  const reactLibraryRelativePath = '../packages';
  const reactPkgs = readdirSync(reactLibraryRelativePath);
  const alias = {};
  reactPkgs.forEach(filename => {
    alias[filename] = resolve(`${reactLibraryRelativePath}/${filename}`);
  });
  return alias;
};

module.exports = {
  entry: ['./src/index.js'],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|packages)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
      {
        test: /\.js$/,
        include: /(packages)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-flow',
            ],
          },
        },
      },
      {
        test: /\.jpg|png|webp|jpeg$/,
        loader: 'file-loader',
      }
    ],
  },
  resolve: {
    alias: generateReactAlias(),
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: './public/index.html',
      filename: './index.html',
    }),
    new DefinePlugin({
      __DEV__: true,
      __PROFILE__: false,
      __EXPERIMENTAL__: true,
      __UMD__: true,
      __VARIANT__: false,
    }),
  ],
  devServer: {
    hot: true,
    static: './dist',
    port: 9527,
  },
  mode: 'development',
  devtool: 'source-map',
};
