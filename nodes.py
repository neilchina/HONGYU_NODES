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
        true_count = min(true_count, total)
        return io.NodeOutput(*([True] * true_count + [False] * (total - true_count)))


class MultiBoolExtension(ComfyExtension):
    async def get_node_list(self):
        return [MultiBool]
