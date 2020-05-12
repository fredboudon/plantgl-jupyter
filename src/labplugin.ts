import { IJupyterWidgetRegistry } from '@jupyter-widgets/base';
import * as widgets from './widgets/widgets';
import * as models from './widgets/models';
import {
  MODULE_NAME, MODULE_VERSION
} from './version';

export default {
  id: 'pgljupyter:plugin',
  requires: [IJupyterWidgetRegistry],
  activate: (app, registry) => {
    registry.registerWidget({
      name: MODULE_NAME,
      version: MODULE_VERSION,
      exports: { ...widgets, ...models }
    });
  },
  autoStart: true
};
