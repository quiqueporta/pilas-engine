import Component from "@ember/component";

export default Component.extend({
  tagName: "",
  truncate: true,
  class: `
    ba pa2 button
    dib br2
    verdana f6 link pointer
    black bg-animate hover-bg-black-10 b--black-20
    unselectable
  `,
  accion: () => {}
});
