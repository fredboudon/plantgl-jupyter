from IPython.core import magic_arguments
from IPython.core.magic import (Magics, magics_class, line_magic,
                                cell_magic, line_cell_magic)
import openalea.plantgl.all as pgl

from .widgets import SceneWidget, LsystemWidget


@magics_class
class PglMagics(Magics):

    @cell_magic
    @magic_arguments.magic_arguments()
    @magic_arguments.argument('--size', '-s')
    def lpy(self, line, cell):

        args = magic_arguments.parse_argstring(self.lpy, line)
        sizes = args.size.split(',')
        size_display = (int(sizes[0]), int(sizes[1])) if len(sizes) > 1 else (int(sizes[0]), int(sizes[0]))

        return SceneWidget([], size_display=size_display)
