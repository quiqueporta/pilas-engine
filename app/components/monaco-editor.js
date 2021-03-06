import { observer } from "@ember/object";
import { inject as service } from "@ember/service";
import Component from "@ember/component";
import layout from "ember-monaco-editor/templates/components/monaco-editor";
import getFrameById from "ember-monaco-editor/utils/get-frame-by-id";
import formatear from "pilas-engine/utils/formatear";
import utils from "../utils/utils";

export default Component.extend({
  layout,
  classNames: ["monaco-editor", "w-100", "flex1", "ba", "b--light-gray"],
  code: "// demo",
  loading: true,
  readOnly: false,
  editor: null,
  bus: service(),
  declaraciones: service(),
  linenumbers: true,

  cuandoCambiaDeArchivo: observer("titulo", function() {
    this.cargarCodigo();
  }),

  cargarCodigo() {
    let editor = this.get("editor");
    let code = this.get("code");
    let codigoFormateado = formatear(code);
    if (editor) {
      let pos = editor.getPosition();
      editor.getModel().setValue(codigoFormateado);
      editor.setPosition(pos);
    }
  },

  /*
   * Se encarga de mantener actualizado el estado del editor con respecto al
   * atributo readOnly.
   */
  sincronizarReadOnly: observer("readOnly", function() {
    if (this.get("editor")) {
      this.get("editor").updateOptions({ readOnly: this.get("readOnly") });
    }
  }),

  sincronizarOscuro: observer("oscuro", function() {
    var theme = "vs";

    if (this.get("oscuro")) {
      theme = "vs-dark";
    }

    if (this.get("editor")) {
      this.get("editor").updateOptions({ theme: theme });
    }
  }),

  init() {
    this._super(...arguments);

    const subscription = event => {
      if (event.origin != utils.HOST) {
        return;
      }

      if (
        event.source === this.get("frame") &&
        event.data &&
        event.data.updatedCode
      ) {
        if (this.get("onChange")) {
          this.get("onChange")(event.data.updatedCode);
        }
      }

      if (
        event.source === this.get("frame") &&
        event.data &&
        event.data.message
      ) {
        if (event.data.message === "load-complete") {
          this.onLoadEditor(this.get("frame").editor);
        }

        if (event.data.message === "on-save") {
          this.cargarCodigo();
          this.onSave(this.get("frame").editor);
        }
      }
    };

    this.set("_subscription", subscription);
    window.addEventListener("message", subscription);
  },

  didInsertElement() {
    this.get("declaraciones")
      .iniciar()
      .then(() => {
        this.iniciarEditor();
      });
  },

  iniciarEditor() {
    if (this.get("isDestroyed") || this.get("isDestroying")) {
      return;
    }
    const frame = getFrameById(this.get("elementId"));
    const frameDoc = frame.document;
    let oscuro = this.get("oscuro");
    this.set("frame", frame);

    let declaraciones_de_pilas_engine_ts = this.get("declaraciones").obtener();
    let rootURL = this.get("rootURL");

    frameDoc.open();
    frameDoc.write(`

      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en" id="print-modal-content">
      <head>

        <script>
        var HOST = "file://";

        if (window.location.host) {
          HOST = "http://" + window.location.host;
        }
        </script>

        <script src="${rootURL}vs/loader.js"></script>


        <style type="text/css">
          html,
          body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
          }
        </style>

        <script>
          window.require.config({
            'vs/nls' : {
              availableLanguages: {
                '*': 'es'
              }
            },
            paths: {
              'vs': '${rootURL}vs'
            }
          });

          window.require(['${rootURL}vs/editor/editor.main'], function () {

            if (typeof monaco !== "undefined") {

              monaco.languages.typescript.typescriptDefaults.addExtraLib(\`'${declaraciones_de_pilas_engine_ts}\`, 'pilas-engine.d.ts');

              var theme = 'vs';

              if (${oscuro}) {
                theme = 'vs-dark';
              }


              var editor = monaco.editor.create(document.getElementById('monaco-editor-wrapper'), {
                language: 'typescript',
                minimap: false,
                fontSize: 14,
                theme: theme,
                tabSize: 2,
                insertSpaces: true,
                tabWidth: 2,
                lineNumbers: ${this.get("linenumbers")},
                readOnly: ${this.get("readOnly")},
              });


              editor.onDidChangeModelContent(function (event) {
                window.top.postMessage({updatedCode: editor.getValue()}, HOST);
              });

              window.top.postMessage({message: "load-complete"}, HOST);
              window.editor = editor;

              window.onresize = function() {
                editor.layout();
              };

              var myBinding = editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, function() {
                window.top.postMessage({message: "on-save"}, HOST);
              });

            }
          });
          </script>
      </head>
      <body>
        <div id="monaco-editor-wrapper" style="width:100%;height:100%"></div>
      </body>
      </html>

      `);
    frameDoc.close();

    this.get("bus").on("hacerFocoEnElEditor", this, "hacerFoco");
  },

  onLoadEditor(editor) {
    this.set("editor", editor);

    if (this.get("code")) {
      this.cargarCodigo();
    }

    if (this.get("cuandoCarga")) {
      this.get("cuandoCarga")();
    }

    this.set("loading", false);
  },

  hacerFoco() {
    let editor = this.get("editor");
    let iframe = this.$("iframe");

    if (iframe) {
      iframe[0].contentWindow.focus();
    }

    if (editor) {
      editor.focus();
      window.editor = editor;
    }
  },

  willDestroyElement() {
    this._super(...arguments);
    window.removeEventListener("message", this.get("_subscription"));
    this.get("bus").on("hacerFocoEnElEditor", this, "hacerFoco");
  }
});
