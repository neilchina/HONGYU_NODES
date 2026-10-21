import { app } from "../../scripts/app.js";

const MAX_OUTPUTS = 64;
const QUEUE_DELAY_MS = 300;

let queueTimer = null;

function scheduleQueue() {
  clearTimeout(queueTimer);
  queueTimer = setTimeout(() => {
    queueTimer = null;
    app.queuePrompt(0, 1);
  }, QUEUE_DELAY_MS);
}

function outputName(index, trueCount) {
  return `bool_${index + 1} (${index < trueCount ? "True" : "False"})`;
}

function syncOutputs(node) {
  const totalWidget = node.widgets?.find((w) => w.name === "total");
  const trueWidget = node.widgets?.find((w) => w.name === "true_count");
  if (!totalWidget || !trueWidget) return;

  const total = Math.max(1, Math.min(totalWidget.value, MAX_OUTPUTS));
  if (trueWidget.value > total) {
    trueWidget.value = total;
  }
  if (trueWidget.options) {
    trueWidget.options.max = total;
  }
  const trueCount = Math.max(0, Math.min(trueWidget.value, total));

  while (node.outputs.length > total) {
    node.removeOutput(node.outputs.length - 1);
  }
  while (node.outputs.length < total) {
    node.addOutput(outputName(node.outputs.length, trueCount), "BOOLEAN");
  }
  for (let i = 0; i < total; i++) {
    const name = outputName(i, trueCount);
    node.outputs[i].name = name;
    node.outputs[i].label = name;
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
        const sync = () => {
          syncOutputs(this);
          scheduleQueue();
        };
        syncOutputs(this);
        totalWidget.callback = sync;
        trueWidget.callback = sync;
        setTimeout(() => syncOutputs(this), 0);
      }
      return result;
    };

    const onConfigure = nodeType.prototype.onConfigure;
    nodeType.prototype.onConfigure = function () {
      const result = onConfigure?.apply(this, arguments);
      syncOutputs(this);
      setTimeout(() => syncOutputs(this), 0);
      return result;
    };
  },
});
