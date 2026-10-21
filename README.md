# HONGYU_NODES

Custom nodes for ComfyUI.

## Install

Place this folder in `ComfyUI/custom_nodes/` and restart ComfyUI.

## Nodes

- **MultiBool** (`HONGYU`): `total` sets how many BOOLEAN outputs appear (max 64),
  `true_count` sets how many of them are True (the first ones).

## Structure

```
HONGYU_NODES/
├── __init__.py    # comfy_entrypoint and web directory
├── nodes.py       # V3 node implementations
└── web/           # optional frontend extensions
```

Add a node class to `nodes.py` and return it from `MultiBoolExtension.get_node_list`.
