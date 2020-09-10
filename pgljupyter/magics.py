from IPython.core.magic_arguments import magic_arguments, argument
from IPython.core.magic import Magics, magics_class, cell_magic

from .widgets import LsystemWidget


@magics_class
class PGLMagics(Magics):

    @cell_magic
    @magic_arguments()
    @argument('--size', '-s')
    def lpy(self, line, cell):

        args = magic_arguments.parse_argstring(self.lpy, line)
        sizes = args.size.split(',')
        size_display = (int(sizes[0]), int(sizes[1])) if len(sizes) > 1 else (int(sizes[0]), int(sizes[0]))

        return LsystemWidget('', size_display=size_display)
