const path = require('path');

module.exports = {
    mode: 'development',

    entry: './dev/demo.ts',
    devtool: 'inline-source-map',
    devServer: {
        static: './dev',
    },

    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            }
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
    },
};