import { app } from "../../scripts/app.js";

const NODE_TYPE = "MultiBool";
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
  const trueCount = Math.max(0, Math.min(trueWidget.value, total));
  if (trueWidget.value !== trueCount) trueWidget.value = trueCount;
  if (trueWidget.options) trueWidget.options.max = total;
  const previousCount = node.outputs.length;

  while (node.outputs.length > total) {
    node.removeOutput(node.outputs.length - 1);
  }
  while (node.outputs.length < total) {
    node.addOutput("", "BOOLEAN");
  }
  for (let i = 0; i < total; i++) {
    const name = outputName(i, trueCount);
    node.outputs[i].name = name;
    node.outputs[i].label = name;
  }
  if (node.outputs.length !== previousCount) {
    node.setSize(node.computeSize());
  }
  node.setDirtyCanvas(true, true);
}

function attach(node) {
  if (node._multiBoolAttached) return;
  const totalWidget = node.widgets?.find((w) => w.name === "total");
  const trueWidget = node.widgets?.find((w) => w.name === "true_count");
  if (!totalWidget || !trueWidget) return;
  node._multiBoolAttached = true;

  const sync = () => {
    syncOutputs(node);
    scheduleQueue();
  };
  for (const widget of [totalWidget, trueWidget]) {
    const original = widget.callback;
    widget.callback = (...args) => {
      original?.apply(widget, args);
      sync();
    };
  }
}

app.registerExtension({
  name: "HONGYU.MultiBool",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== NODE_TYPE) return;

    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      const result = onNodeCreated?.apply(this, arguments);
      attach(this);
      syncOutputs(this);
      requestAnimationFrame(() => {
        attach(this);
        syncOutputs(this);
      });
      return result;
    };

    const onConfigure = nodeType.prototype.onConfigure;
    nodeType.prototype.onConfigure = function () {
      const result = onConfigure?.apply(this, arguments);
      attach(this);
      syncOutputs(this);
      requestAnimationFrame(() => syncOutputs(this));
      return result;
    };
  },

  async loadedGraphNode(node) {
    if (node.type !== NODE_TYPE) return;
    requestAnimationFrame(() => {
      attach(node);
      syncOutputs(node);
    });
  },
});
