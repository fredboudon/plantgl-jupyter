import { terser } from 'rollup-plugin-terser';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default args => ({
    input: 'src/worker.js',
    output: [
        { file: `build/worker.js`, format: 'es', preferConst: true }
    ],
    plugins: args.configDebug ? [nodeResolve(), commonjs()] : [terser(), nodeResolve(), commonjs()]
});
