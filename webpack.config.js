const webpack = require('webpack');

module.exports = {
    devtool: 'source-map',
    entry: './src/GameBoy.js',
    output: {
        publicPath: '/output',
        filename: 'emulator.js'
    },
    module: {
        rules: [
            {
                enforce: 'pre',
                test: /\.(js)$/,
                include: /src/,
                loader: 'eslint-loader'
            },
            {
                test: /\.(js)$/,
                include: /src/,
                loaders: 'babel-loader'
            }
        ]
    },
    plugins: [
        new webpack.NoEmitOnErrorsPlugin()
    ]
};
