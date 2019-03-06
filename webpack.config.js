
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const scriptName = 'bundle.js';
const isProduction = process.env.NODE_ENV === 'production';
let devtool = 'eval-source-map';

const appDirectory = fs.realpathSync(process.cwd());
const srcPath = path.resolve(appDirectory, './src');
const dstPath = path.resolve(appDirectory, './dst');
const publicPath = path.resolve(srcPath, './public');
const indexPath = path.resolve(publicPath, 'index.html');

const plugins = [
    new webpack.EnvironmentPlugin([
        'NODE_ENV',
    ]),
    new HtmlWebpackPlugin({
        filename: 'index.html',
        template: indexPath,
        scriptName,
        rootPath: '/',
        inject: false,
    }),
];

let cacheDirectory = true;
let optimization;
if (isProduction) {
    cacheDirectory = false;
    optimization = {
        minimizer: [
            new TerserPlugin({
                sourceMap: true,
                terserOptions: {
                    ecma: 6,
                },
            }),
        ],
    };
    devtool = false;
} else {
    plugins.push(
        new webpack.HotModuleReplacementPlugin(),
        new CopyWebpackPlugin([{
            from: publicPath,
            to: dstPath,
        }])
    );
}

const rules = [
    {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
            loader: 'babel-loader',
            options: {
                cacheDirectory,
                presets: [
                    '@babel/preset-env',
                ],
                plugins: [
                    [
                        require.resolve('@babel/plugin-proposal-object-rest-spread'), { useBuiltIns: true },
                    ],
                    require.resolve('@babel/plugin-proposal-class-properties'),
                ],
            },
        },
    },
    {
        test: /\.css$/,
        exclude: /\.module\.css$/,
        loaders: [
            require.resolve('style-loader'),
            require.resolve('css-loader'),
        ],
    },
    {
        test: /\.(otf|ttf|eot|woff|woff2)$/,
        use: [
            {
                loader: require.resolve('url-loader'),
                options: {
                    limit: 1000000,
                    name: '/fonts/[name].[ext]',
                },
            },
        ],
    },
];

const options = {
    mode: isProduction ? 'production' : 'development',
    entry: path.resolve(srcPath, 'index.js'),
    target: 'web',
    output: {
        path: dstPath,
        filename: scriptName,
        libraryTarget: 'var',
    },
    devtool,
    module: {
        strictExportPresence: true,
        rules,
    },
    plugins,
    devServer: {
        contentBase: dstPath,
        hot: true,
        inline: true,
        compress: true,
        port: 9000,
        watchOptions: {
            ignored: /node_modules/,
        },
        historyApiFallback: true,
    },
    optimization,
    performance: {
        hints: false,
    },
};
module.exports = options;
