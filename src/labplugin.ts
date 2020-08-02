import { IJupyterWidgetRegistry } from '@jupyter-widgets/base';
import { JupyterFrontEnd, JupyterFrontEndPlugin } from "@jupyterlab/application";
import { pythonIcon, LabIcon } from '@jupyterlab/ui-components';
import { Mode } from "@jupyterlab/codemirror";
import * as widgets from './widgets/widgets';
import * as editors from './widgets/editors';
import * as models from './widgets/models';
import bgeom from './widgets/geom';
import {
  MODULE_NAME, MODULE_VERSION
} from './version';
import { IRenderMimeRegistry, IRenderMime } from '@jupyterlab/rendermime';
import { MimeDocumentFactory } from '@jupyterlab/docregistry';

const registerWidgets = (widgetRegistry: IJupyterWidgetRegistry) => {

    widgetRegistry.registerWidget({
        name: MODULE_NAME,
        version: MODULE_VERSION,
        exports: { ...widgets, ...editors, ...models } as any
    });

};

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

const registerGeomFileType = (app: JupyterFrontEnd, mimeRegistry: IRenderMimeRegistry) => {
    mimeRegistry.addFactory(bgeom.rendererFactory);
    bgeom.fileTypes.forEach((ft: any) => {
        if (ft.icon) {
          ft = { ...ft, icon: LabIcon.resolve({ icon: ft.icon }) };
        }
        app.docRegistry.addFileType(ft);
      });
    const options: any = bgeom.documentWidgetFactoryOptions;
    options.forEach(option => {
        const factory = new MimeDocumentFactory({
            renderTimeout: option.renderTimeout,
            dataType: option.dataType,
            rendermime: mimeRegistry,
            modelName: option.modelName,
            name: option.name,
            primaryFileType: app.docRegistry.getFileType(option.primaryFileType),
            fileTypes: option.fileTypes,
            defaultFor: option.defaultFor,
            defaultRendered: option.defaultRendered
        });
        app.docRegistry.addWidgetFactory(factory);
    });
};

const plugin = {
    id: 'pgljupyter:plugin',
    requires: [IJupyterWidgetRegistry, IRenderMimeRegistry],
    activate: (app: JupyterFrontEnd, widgetRegistry: IJupyterWidgetRegistry, mimeRegistry: IRenderMimeRegistry) => {
        registerWidgets(widgetRegistry);
        registerGeomFileType(app, mimeRegistry);
        registerLpyFileType(app);
    },
    autoStart: true
};

export default plugin;
