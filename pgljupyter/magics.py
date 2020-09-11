from IPython.core.magic_arguments import magic_arguments, argument, parse_argstring
from IPython.core.magic import Magics, magics_class, cell_magic, needs_local_scope

from .widgets import LsystemWidget


@magics_class
class PGLMagics(Magics):

    @cell_magic
    @needs_local_scope
    @magic_arguments()
    @argument('--size', '-s', default='400,400')
    @argument('--unit', '-u', default='m')
    @argument('--animate', '-a', default=False)
    def lpy(self, line, cell, local_ns):

        args = parse_argstring(self.lpy, line)
        sizes = [int(i.strip()) for i in args.size.split(',')]
        unit = args.unit
        animate = bool(args.animate)
        context = local_ns

        size_display = (int(sizes[0]), int(sizes[1])) if len(sizes) > 1 else (int(sizes[0]), int(sizes[0]))

        return LsystemWidget('', code=cell, size_display=size_display, unit=unit, animate=animate, context=context)
