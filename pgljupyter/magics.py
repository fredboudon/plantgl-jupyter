from IPython.core.magic_arguments import magic_arguments, argument, parse_argstring
from IPython.core.magic import Magics, magics_class, cell_magic, needs_local_scope

from .widgets import LsystemWidget


@magics_class
class PGLMagics(Magics):

    @cell_magic
    @needs_local_scope
    @magic_arguments()
    @argument('--size', '-s', default='400,400', type=str, help='Width and hight of the canvas')
    @argument('--world', '-w', default=1.0, type=float, help='Size of the 3d scene in meters')
    @argument('--unit', '-u', default='m', type=str, help='Unit of the model - m, dm, cm, mm')
    @argument('--animate', '-a', type=bool, help='Animate Lsystem')
    def lpy(self, line, cell, local_ns):

        args = parse_argstring(self.lpy, line)
        sizes = [int(i.strip()) for i in args.size.split(',')]
        world = args.world
        unit = args.unit
        animate = args.animate if args.animate is not None else False
        context = local_ns

        size_display = (int(sizes[0]), int(sizes[1])) if len(sizes) > 1 else (int(sizes[0]), int(sizes[0]))

        return LsystemWidget(None, code=cell, size_display=size_display, size_world=world, unit=unit, animate=animate, context=context)
