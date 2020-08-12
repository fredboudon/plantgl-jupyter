import { terser } from 'rollup-plugin-terser';
// import copy from 'rollup-plugin-copy'

export default args => ({
    input: 'src/index.js',
    output: [
        { file: args.configDebug ? 'build/index-debug.js' : 'dist/index.js', format: 'es', preferConst: true }
    ],
    plugins: args.configDebug ? [] : [terser()]
});
