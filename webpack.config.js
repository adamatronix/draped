const HtmlWebpackPlugin = require("html-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const path = require("path");

module.exports = {
  entry: {
    index: './src/Examples.tsx' 
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'build')
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "src", "index.html")
    })
  ],
  module: {
    rules: [  
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        }, 
        {
            test: /\.js$/,
            exclude: /(node_modules|bower_components)/,
            use: {
                loader: 'babel-loader',
            }
        },
        {
          test: /\.scss$/,
          use: [{
            loader: 'style-loader'
          }, {
            loader: 'css-loader'
          }, {
            loader: 'sass-loader'
          }]
        },
        {
          test: /\.(png|svg|jpg|gif)$/,
          use: [
            {
              loader: 'file-loader'
            }
          ]
        },
        {
          test: /\.(obj|fbx|glb|gltf|mp4)$/,
          loader: 'url-loader'
        }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: { 
      "path": require.resolve("path-browserify"),
      "fs": false
    }
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
};