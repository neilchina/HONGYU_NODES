import { app } from "../../scripts/app.js";

const NODE_TYPE = "MultiBool";
const MAX_OUTPUTS = 64;

function outputName(index, trueCount) {
  return `bool_${index + 1} (${index < trueCount ? "True" : "False"})`;
}

function getLinkIds(node, index) {
  const fromSlot = node.outputs?.[index]?.links;
  if (fromSlot != null) {
    return Array.isArray(fromSlot) ? fromSlot : [fromSlot];
  }
  const raw = node.outputLinks?.[index];
  if (raw == null) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function getLink(graph, linkId) {
  if (linkId == null) return null;
  return (
    graph.getLink?.(linkId) ??
    graph.links?.[linkId] ??
    graph._links?.get?.(linkId) ??
    null
  );
}

function propagateToDownstream(node, trueCount) {
  const graph = node.graph;
  if (!graph) return;
  const allNodes = graph._nodes ?? graph.nodes ?? [];
  for (let i = 0; i < node.outputs.length; i++) {
    const value = i < trueCount;
    for (const linkId of getLinkIds(node, i)) {
      const link = getLink(graph, linkId);
      if (!link) continue;
      const target = allNodes.find((n) => n.id === link.target_id);
      if (!target) continue;
      const inputName = target.inputs?.[link.target_slot]?.name;
      if (!inputName) continue;
      const widget = target.widgets?.find((w) => w.name === inputName);
      if (!widget || widget.value === value) continue;
      widget.value = value;
      if (target.type === "DaSiWa_NodeStatusSwitch" && inputName === "enabled") {
        // Fire the switch's own callback so it applies the mode to its
        // target nodes live (its mirror loop can't read our multi-output
        // node, so it falls back to this local widget value).
        widget.callback?.(value);
      }
      target.setDirtyCanvas(true, true);
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

    const onConnectionsChange = nodeType.prototype.onConnectionsChange;
    nodeType.prototype.onConnectionsChange = function () {
      const result = onConnectionsChange?.apply(this, arguments);
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
