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
├── __init__.py    # node mappings and web directory
├── nodes.py       # node implementations
└── web/           # optional frontend extensions
```

Add a node to `nodes.py` and register it in `__init__.py`:

```python
NODE_CLASS_MAPPINGS = {"HongyuExample": HongyuExample}
NODE_DISPLAY_NAME_MAPPINGS = {"HongyuExample": "Hongyu Example"}
```
