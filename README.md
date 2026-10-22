# HONGYU_NODES

Custom nodes for ComfyUI.

## Install

Place this folder in `ComfyUI/custom_nodes/` and restart ComfyUI.

## Nodes

- **MultiBool** (`HONGYU`): `total` sets how many BOOLEAN outputs appear (max 64),
  `true_count` sets how many of them are True (the first ones).
- **Ref Image Gate** (`HONGYU`): passes a reference image on, or drops it (None) when
  `use` is False. The model ignores dropped references.
- **Ref Audio Gate** (`HONGYU`): the same for reference audio.

A reference count is usually driven by a `MultiBool`: every `bool_i` output feeds one
gate, so `true_count` decides how many references reach the model. The gates make the
count effective in the backend as well, which matters when the workflow is executed
through the API instead of the UI.

## Structure

```
HONGYU_NODES/
├── __init__.py    # comfy_entrypoint and web directory
├── nodes.py       # V3 node implementations
└── web/           # optional frontend extensions
```

Add a node class to `nodes.py` and return it from `HONGYUExtension.get_node_list`.
