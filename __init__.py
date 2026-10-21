from .nodes import MultiBoolExtension

WEB_DIRECTORY = "./web"


async def comfy_entrypoint():
    return MultiBoolExtension()
