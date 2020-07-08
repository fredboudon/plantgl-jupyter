import { terser } from 'rollup-plugin-terser';

export default args => ({
    input: 'src/worker.js',
    output: [
        { file: `build/worker.js`, format: 'es', preferConst: true }
    ],
    plugins: args.configDebug ? [] : [terser({ output: { quote_style: 1 } })]
});
