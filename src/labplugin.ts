import { IJupyterWidgetRegistry } from '@jupyter-widgets/base';
import { JupyterFrontEnd, JupyterFrontEndPlugin } from "@jupyterlab/application";
import { pythonIcon } from '@jupyterlab/ui-components';
import { Mode } from "@jupyterlab/codemirror";
import * as widgets from './widgets/widgets';
import * as models from './widgets/models';
import {
  MODULE_NAME, MODULE_VERSION
} from './version';

const registerLpyFileType = (app: JupyterFrontEnd) => {

  Mode.getModeInfo().push({
    name: 'Lpy',
    mime: 'text/x-python',
    mode: 'python',
    ext: ['lpy']
  });

  app.docRegistry.addFileType({
    name: 'lpy',
    displayName: 'Lpy File',
    extensions: ['.lpy'],
    mimeTypes: ['text/x-python'],
    icon: pythonIcon
  });

};

const plugin = {
  id: 'pgljupyter:plugin',
  requires: [IJupyterWidgetRegistry],
  activate: (app: JupyterFrontEnd, registry) => {
    registry.registerWidget({
      name: MODULE_NAME,
      version: MODULE_VERSION,
      exports: { ...widgets, ...models }
    });
    registerLpyFileType(app);
  },
  autoStart: true
};

export default plugin;
