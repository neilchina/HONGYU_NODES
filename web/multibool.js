import { app } from "../../scripts/app.js";

const MAX_OUTPUTS = 64;

function syncOutputs(node) {
  const totalWidget = node.widgets?.find((w) => w.name === "total");
  const trueWidget = node.widgets?.find((w) => w.name === "true_count");
  if (!totalWidget || !trueWidget) return;

  const total = Math.max(1, Math.min(totalWidget.value, MAX_OUTPUTS));
  const trueCount = Math.max(0, Math.min(trueWidget.value, total));

  while (node.outputs.length > total) {
    node.removeOutput(node.outputs.length - 1);
  }
  while (node.outputs.length < total) {
    node.addOutput("", "BOOLEAN");
  }
  for (let i = 0; i < total; i++) {
    node.outputs[i].label = `bool_${i + 1} (${i < trueCount ? "True" : "False"})`;
  }
  node.setDirtyCanvas(true, true);
}

app.registerExtension({
  name: "HONGYU.MultiBool",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== "MultiBool") return;

    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      const result = onNodeCreated?.apply(this, arguments);
      const totalWidget = this.widgets?.find((w) => w.name === "total");
      const trueWidget = this.widgets?.find((w) => w.name === "true_count");
      if (totalWidget && trueWidget) {
        const sync = () => syncOutputs(this);
        sync();
        totalWidget.callback = sync;
        trueWidget.callback = sync;
      }
      return result;
    };

    const onConfigure = nodeType.prototype.onConfigure;
    nodeType.prototype.onConfigure = function () {
      const result = onConfigure?.apply(this, arguments);
      syncOutputs(this);
      return result;
    };
  },
});
