from .nodes import HONGYUExtension

WEB_DIRECTORY = "./web"


async def comfy_entrypoint():
    return HONGYUExtension()
