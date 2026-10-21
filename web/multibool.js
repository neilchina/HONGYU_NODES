import { app } from "../../scripts/app.js";

const MAX_OUTPUTS = 64;

app.registerExtension({
  name: "HONGYU.MultiBool",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== "MultiBool") return;

    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      const result = onNodeCreated?.apply(this, arguments);
      const totalWidget = this.widgets?.find((w) => w.name === "total");
      if (totalWidget) {
        const syncOutputs = (total) => {
          const count = Math.max(1, Math.min(total, MAX_OUTPUTS));
          while (this.outputs.length > count) {
            this.removeOutput(this.outputs.length - 1);
          }
          while (this.outputs.length < count) {
            this.addOutput(`bool_${this.outputs.length + 1}`, "BOOLEAN");
          }
        };
        syncOutputs(totalWidget.value);
        totalWidget.callback = (value) => {
          syncOutputs(value);
          this.setDirtyCanvas(true, true);
        };
      }
      return result;
    };
  },
});
