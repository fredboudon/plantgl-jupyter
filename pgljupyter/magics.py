from IPython.core.magic_arguments import magic_arguments, argument, parse_argstring
from IPython.core.magic import Magics, magics_class, cell_magic

from .widgets import LsystemWidget


@magics_class
class PGLMagics(Magics):

    @cell_magic
    @magic_arguments()
    @argument('--size', '-s', default='400,400')
    @argument('--unit', '-u', default='m')
    @argument('--animate', '-a', default=False)
    @argument('--context', '-c', default='')
    def lpy(self, line, cell):

        args = parse_argstring(self.lpy, line)
        sizes = args.size.split(',')
        unit = args.unit
        animate = bool(args.animate)
        context_keys = args.context

        context = {}
        user_ns_keys = self.shell.user_ns.keys()
        for key in context_keys.split(','):
            if key in user_ns_keys:
                context[key] = self.shell.user_ns[key]

        size_display = (int(sizes[0]), int(sizes[1])) if len(sizes) > 1 else (int(sizes[0]), int(sizes[0]))

        return LsystemWidget('', code=cell, size_display=size_display, unit=unit, animate=animate, context=context)
