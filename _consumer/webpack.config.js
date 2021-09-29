const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');


const demos = ['bicubicDemo', 'engine1Demo'];

const entries = {};
const pageHtmlConfigs = [];
for (const demo of demos) {
    entries[demo] = `./src/${demo}.ts`;
    pageHtmlConfigs.push(new HtmlWebpackPlugin({
        inject: true,
        template: `./src/${demo}.html`,
        filename: `${demo}.html`,
        chunks: [`${demo}`]
    }));
}


module.exports = {
    mode: 'development',

    // Section 1: compilation
    entry: entries,
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
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
        ... pageHtmlConfigs
    ],


    // Section 2: dev-tools
    devtool: 'inline-source-map',
    devServer: {
        static: './dist',
    },
};