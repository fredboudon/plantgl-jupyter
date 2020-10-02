const path = require('path');
const version = require('./package.json').version;
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const TerserPlugin = require('terser-webpack-plugin');

// Custom webpack rules
const rules = [
  { test: /\.ts$/, loader: 'ts-loader' },
  { test: /\.js$/, loader: 'source-map-loader', exclude:  [path.join(process.cwd(), 'node_modules')] },
  { test: /\.css$/, use: ['style-loader', 'css-loader']},
  { test: /\.svg$/, loader: 'svg-inline-loader' }
];

// Packages that shouldn't be bundled but loaded at runtime
const externals = [
  '@jupyter-widgets/base',
  "@jupyter-widgets/controls",
  '@jupyterlab/application',
  '@jupyterlab/codemirror',
  '@jupyterlab/ui-components',
  '@jupyterlab/docregistry',
  '@jupyterlab/rendermime',
  '@jupyterlab/rendermime-interfaces',
  "@lumino/application",
  "@lumino/widgets"
];

const resolve = {
  // Add '.ts' and '.tsx' as resolvable extensions.
  extensions: [".webpack.js", ".web.js", ".ts", ".js"]
};

module.exports = [
  /**
   * Notebook extension
   *
   * This bundle only contains the part of the JavaScript that is run on load of
   * the notebook.
   */
  {
    entry: './src/extension.ts',
    output: {
      filename: 'index.js',
      path: path.resolve(__dirname, 'pgljupyter', 'nbextension', 'static'),
      libraryTarget: 'amd'
    },
    module: {
      rules: rules
    },
    // devtool: 'source-map',
    externals,
    resolve,
    performance: {
      hints: false
    },
    plugins: [
      new TerserPlugin(),
      // new BundleAnalyzerPlugin()
    ]
  },

  /**
   * Embeddable pgljupyter bundle
   *
   * This bundle is almost identical to the notebook extension bundle. The only
   * difference is in the configuration of the webpack public path for the
   * static assets.
   *
   * The target bundle is always `dist/index.js`, which is the path required by
   * the custom widget embedder.
   */
  {
    entry: './src/index.ts',
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'amd',
        library: 'pgljupyter',
        publicPath: 'https://unpkg.com/pgljupyter@' + version + '/dist/'
    },
    // devtool: 'source-map',
    module: {
        rules: rules
    },
    plugins: [
      new TerserPlugin(),
      // new BundleAnalyzerPlugin()
    ],
    externals: [
      '@jupyter-widgets/base',
      "@jupyter-widgets/controls",
      '@jupyterlab/application',
      '@jupyterlab/codemirror',
      '@jupyterlab/docregistry',
      '@jupyterlab/rendermime',
      '@jupyterlab/rendermime-interfaces',
      "@lumino/application"
    ],
    resolve,
    performance: {
      hints: false
    }
  },


  /**
   * Documentation widget bundle
   *
   * This bundle is used to embed widgets in the package documentation.
   */
  {
    entry: './src/index.ts',
    output: {
      filename: 'embed-bundle.js',
      path: path.resolve(__dirname, 'docs', 'source', '_static'),
      library: "pgljupyter",
      libraryTarget: 'amd'
    },
    module: {
      rules: rules
    },
    // devtool: '',
    externals,
    resolve,
    performance: {
      hints: false
    }
  }

];
