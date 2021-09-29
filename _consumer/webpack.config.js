const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');


module.exports = {
    mode: 'development',
    entry: {
        engine1Demo: './src/engine1Demo.ts',
        bicubicDemo: './src/bicubicDemo.ts'
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
    devtool: 'inline-source-map',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
            filename: 'index.html',
            inject: false
        }),
        new HtmlWebpackPlugin({
            inject: true,
            template: './src/engine1Demo.html',
            filename: 'engine1Demo.html',
            chunks: ['engine1Demo']
        }),
        new HtmlWebpackPlugin({
            inject: true,
            template: './src/bicubicDemo.html',
            filename: 'bicubicDemo.html',
            chunks: ['bicubicDemo']
        }),
    ],
    devServer: {
        static: './dist',
    },
};