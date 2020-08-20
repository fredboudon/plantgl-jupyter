import { terser } from 'rollup-plugin-terser';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default args => ({
    input: 'src/index.js',
    output: [
        { file: args.configDebug ? 'build/index-debug.js' : 'dist/index.js', format: 'es', preferConst: true }
    ],
    plugins: args.configDebug ? [nodeResolve(), commonjs()] : [terser(), nodeResolve(), commonjs()]
});
