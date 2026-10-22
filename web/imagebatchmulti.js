import { app } from "../../scripts/app.js";

const NODE_TYPE = "ImageBatchMulti";

// Grows the image_N slots to match the inputcount widget and adds the
// "Update inputs" button, the same way the KJNodes node of the same name does.
function setupDynamicInputs(node) {
  if (node._batchMultiRebuild) return node._batchMultiRebuild;

  const rebuild = () => {
    if (!node.inputs) node.inputs = [];
    const countW = node.widgets?.find((w) => w.name === "inputcount");
    if (!countW) return;
    const target = countW.value;
    const current = node.inputs.filter((i) => i.name?.startsWith("image_")).length;
    if (target === current) return;
    if (target < current) {
      for (let i = 0; i < current - target; i++) node.removeInput(node.inputs.length - 1);
    } else {
      for (let i = current + 1; i <= target; i++) node.addInput(`image_${i}`, "IMAGE", { shape: 7 });
    }
  };

  node._batchMultiRebuild = rebuild;
  node.addWidget("button", "Update inputs", null, rebuild);

  const countW = node.widgets?.find((w) => w.name === "inputcount");
  if (countW) {
    const origCb = countW.callback;
    countW.callback = function (value, canvas) {
      const r = origCb ? origCb.apply(this, arguments) : undefined;
      if (!canvas) rebuild(); // bare call = API reload, skip an interactive scrub
      return r;
    };
  }

  return rebuild;
}

app.registerExtension({
  name: "HONGYU.ImageBatchMulti",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== NODE_TYPE) return;
    if (nodeData.category?.startsWith("KJNodes")) return;

    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      const result = onNodeCreated?.apply(this, arguments);
      const rebuild = setupDynamicInputs(this);
      requestAnimationFrame(() => rebuild());
      return result;
    };
  },
});
