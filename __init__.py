from .nodes import MultiBool

NODE_CLASS_MAPPINGS = {
    "HongyuNodes": MultiBool,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "HongyuNodes": "HongyuNodes",
}

WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
