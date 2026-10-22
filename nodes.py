import torch
from comfy.utils import common_upscale

from comfy_api.latest import ComfyExtension, io

MAX_OUTPUTS = 64
OUTPUT_NAMES = tuple(f"bool_{i + 1}" for i in range(MAX_OUTPUTS))


class MultiBool(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="MultiBool",
            display_name="MultiBool",
            category="HONGYU",
            inputs=[
                io.Int.Input("total", default=4, min=1, max=MAX_OUTPUTS),
                io.Int.Input("true_count", default=1, min=0, max=MAX_OUTPUTS),
            ],
            outputs=[io.Boolean.Output(name) for name in OUTPUT_NAMES],
        )

    @classmethod
    def execute(cls, total, true_count):
        total = max(1, min(total, MAX_OUTPUTS))
        true_count = max(0, min(true_count, total))
        return io.NodeOutput(*([True] * true_count + [False] * (total - true_count)))


def _ref_gate(node_id, display_name, value_name, io_type):
    """Builds a node that passes a reference on, or drops it when the flag is off."""

    class RefGate(io.ComfyNode):
        @classmethod
        def define_schema(cls):
            return io.Schema(
                node_id=node_id,
                display_name=display_name,
                category="HONGYU",
                inputs=[
                    io.Boolean.Input("use", default=True,
                                     tooltip="When off the reference is dropped and the model ignores it."),
                    io_type.Input(value_name, optional=True),
                ],
                outputs=[io_type.Output(value_name)],
            )

        @classmethod
        def execute(cls, use, **kwargs):
            return io.NodeOutput(kwargs.get(value_name) if use else None)

    RefGate.__name__ = node_id
    RefGate.__qualname__ = node_id
    return RefGate


RefImageGate = _ref_gate("RefImageGate", "Ref Image Gate", "image", io.Image)
RefAudioGate = _ref_gate("RefAudioGate", "Ref Audio Gate", "audio", io.Audio)


class ImageBatchMulti:
    """Batches images into one batch.

    Same interface as the KJNodes node of the same name, so it can take over that
    node id: the image slots grow with the "inputcount" widget and a slot that is
    set to None is dropped instead of crashing the node.
    """

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "inputcount": ("INT", {"default": 2, "min": 2, "max": 1000, "step": 1}),
                "image_1": ("IMAGE", ),
            },
            "optional": {
                "image_2": ("IMAGE", ),
                "image_3": ("IMAGE", ),
                "image_4": ("IMAGE", ),
                "image_5": ("IMAGE", ),
            }
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("images",)
    FUNCTION = "combine"
    CATEGORY = "HONGYU_NODES"
    DESCRIPTION = """
Creates an image batch from multiple images.
Set how many inputs the node has with the **inputcount** widget and update the slots.
A slot that is set to None is left out of the batch.
"""

    def combine(self, inputcount, **kwargs):
        slots = []
        first = None
        for c in range(inputcount):
            key = f"image_{c + 1}"
            if key in kwargs:
                img = kwargs[key]
                if img is None:
                    continue  # the slot was dropped on purpose, keep it out of the batch
            else:
                img = None  # not connected, keep the placeholder
            if first is None and img is not None:
                first = img
            slots.append(img)

        if first is None:
            raise ValueError("ImageBatchMulti: no image is set")

        h, w = first.shape[1], first.shape[2]
        max_ch = max([img.shape[-1] for img in slots if img is not None] + [first.shape[-1]])
        total_frames = sum(first.shape[0] if img is None else img.shape[0] for img in slots)

        out = torch.empty((total_frames, h, w, max_ch), dtype=first.dtype)
        offset = 0
        for img in slots:
            if img is None:
                img = torch.zeros((first.shape[0], h, w, max_ch), dtype=first.dtype)
            if img.shape[1:3] != (h, w):
                img = common_upscale(img.movedim(-1, 1), w, h, "bilinear", "center").movedim(1, -1)
            if img.shape[-1] < max_ch:
                img = torch.nn.functional.pad(img, (0, max_ch - img.shape[-1]), mode="constant", value=1.0)
            n = img.shape[0]
            out[offset:offset + n].copy_(img)
            offset += n

        return (out.cpu(),)


class HONGYUExtension(ComfyExtension):
    async def on_load(self):
        # A V1 node cannot be returned from get_node_list, so the ImageBatchMulti
        # takes over that node id by hand.
        import nodes

        nodes.NODE_CLASS_MAPPINGS["ImageBatchMulti"] = ImageBatchMulti
        nodes.NODE_DISPLAY_NAME_MAPPINGS["ImageBatchMulti"] = "Image Batch Multi"

    async def get_node_list(self):
        return [MultiBool, RefImageGate, RefAudioGate]
