import { app } from "../../scripts/app.js";

const NODE_TYPE = "MultiBool";
const MAX_OUTPUTS = 64;

function outputName(index, trueCount) {
  return `bool_${index + 1} (${index < trueCount ? "True" : "False"})`;
}

function propagateToDownstream(node, trueCount) {
  const graph = node.graph;
  if (!graph) return;
  for (let i = 0; i < node.outputs.length; i++) {
    const linkIds = node.outputLinks?.[i];
    if (!linkIds) continue;
    for (const linkId of linkIds) {
      const link = graph.links?.[linkId];
      if (!link) continue;
      const target = graph.getNodeById?.(link.target_id);
      if (!target) continue;
      const inputName = target.inputs?.[link.target_slot]?.name;
      if (!inputName) continue;
      const widget = target.widgets?.find((w) => w.name === inputName);
      if (widget && widget.value !== (i < trueCount)) {
        widget.value = i < trueCount;
        target.setDirtyCanvas(true, true);
      }
    }
  }
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
  propagateToDownstream(node, trueCount);
  node.setDirtyCanvas(true, true);
}

function attach(node) {
  if (node._multiBoolAttached) return;
  const totalWidget = node.widgets?.find((w) => w.name === "total");
  const trueWidget = node.widgets?.find((w) => w.name === "true_count");
  if (!totalWidget || !trueWidget) return;
  node._multiBoolAttached = true;

  const sync = () => syncOutputs(node);
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
