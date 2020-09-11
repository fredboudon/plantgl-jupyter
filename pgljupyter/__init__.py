from .widgets import SceneWidget, LsystemWidget
from .editors import ParameterEditor
from ._version import __version__, version_info
from .nbextension import _jupyter_nbextension_paths
from .magics import PGLMagics

if 'get_ipython' in globals() :
    get_ipython().register_magics(PGLMagics)
