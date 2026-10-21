MAX_OUTPUTS = 64


class MultiBool:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "total": ("INT", {"default": 4, "min": 1, "max": MAX_OUTPUTS, "step": 1}),
                "true_count": ("INT", {"default": 1, "min": 0, "max": MAX_OUTPUTS, "step": 1}),
            }
        }

    RETURN_TYPES = ("BOOLEAN",) * MAX_OUTPUTS
    RETURN_NAMES = tuple(f"bool_{i + 1}" for i in range(MAX_OUTPUTS))
    FUNCTION = "build"
    CATEGORY = "HONGYU"

    def build(self, total, true_count):
        true_count = min(true_count, total)
        return tuple([True] * true_count + [False] * (total - true_count))
