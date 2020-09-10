from .widgets import SceneWidget, LsystemWidget
from .editors import ParameterEditor
from ._version import __version__, version_info
from .nbextension import _jupyter_nbextension_paths
from .magics import PglMagics

if get_ipython is not None:
    get_ipython().register_magics(PglMagics)
