from IPython.core.magic_arguments import magic_arguments, argument, parse_argstring
from IPython.core.magic import (
    Magics, magics_class, cell_magic, line_magic, needs_local_scope
)

from openalea.lpy import Lsystem

from .widgets import SceneWidget, LsystemWidget


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

    @line_magic
    @magic_arguments()
    @argument('file', type=str, help='L-Py file path')
    @argument('--size', '-s', default='400,400', type=str, help='Width and hight of the canvas')
    @argument('--cell', '-c', default=1., type=float, help='Size of cell for a single derivation step')
    def lpy_plot(self, line):

        from math import ceil, sqrt, floor

        try:
            ip = get_ipython()
        except NameError:
            ip = None

        args = parse_argstring(self.lpy_plot, line)
        file = args.file
        sizes = [int(i.strip()) for i in args.size.split(',')]

        cell = args.cell
        size_display = (int(sizes[0]), int(sizes[1])) if len(sizes) > 1 else (int(sizes[0]), int(sizes[0]))

        ls = Lsystem(file)
        rows = cols = ceil(sqrt(ls.derivationLength + 1))
        size = rows * cell
        start = -size/2 + cell/2
        sw = SceneWidget(size_display=size_display, size_world=size)
        sw.add(ls.sceneInterpretation(ls.axiom), position=(start, start, 0))

        def plot():
            tree = ls.axiom
            for i in range(1, ls.derivationLength):
                row = floor(i / rows)
                col = (i - row * cols)
                x = row * cell + start
                y = col * cell + start
                tree = ls.derive(tree, i, 1)
                sw.add(ls.sceneInterpretation(tree), (x, y, 0))
            ip.events.unregister('post_run_cell', plot)

        if ip:
            ip.events.register('post_run_cell', plot)

        return sw
