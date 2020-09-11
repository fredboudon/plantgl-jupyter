from IPython.core.magic_arguments import magic_arguments, argument, parse_argstring
from IPython.core.magic import Magics, magics_class, cell_magic

from .widgets import LsystemWidget


@magics_class
class PGLMagics(Magics):

    @cell_magic
    @magic_arguments()
    @argument('--size', '-s')
    @argument('--unit', '-u')
    @argument('--animate', '-a')
    def lpy(self, line, cell):

        args = parse_argstring(self.lpy, line)
        sizes = args.size.split(',') if args is not None and hasattr(args, 'size') else (400, 400)
        unit = args.unit if args is not None and hasattr(args, 'unit') else 'cm'
        animate = bool(args.animate) if args is not None and hasattr(args, 'animate') else False

        size_display = (int(sizes[0]), int(sizes[1])) if len(sizes) > 1 else (int(sizes[0]), int(sizes[0]))

        return LsystemWidget('', code=cell, size_display=size_display, unit=unit, animate=animate)
