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


class HONGYUExtension(ComfyExtension):
    async def get_node_list(self):
        return [MultiBool, RefImageGate, RefAudioGate]
