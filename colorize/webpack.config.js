const path = require('path');

module.exports = {
    mode: 'production',

    entry: './src/index.ts',
    devtool: 'source-map',
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
        extensions: ['.ts', '.js'],
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'colorize.js',
        library: {
            name: 'colorize',
            type: 'umd',
        },
    },
};