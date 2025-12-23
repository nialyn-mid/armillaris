# Icehellionx v12 Data Mapping Guide

This document describes how raw **Icehellionx v12** lorebook entries are transformed into Armillaris `LoreEntry` objects. This mapping is designed to be lossless for all functional fields, allowing for the original v12 structure to be reconstructed from the Armillaris export.

## Overview

Each entry in the `dynamicLore` array of a v12 file is converted into a `LoreEntry` with the following structure:

| v12 Field | Armillaris Path | Notes |
| :--- | :--- | :--- |
| `tag` | `label` | Primary identifier. Falls back to first keyword or personality snippet. |
| `personality` | `properties.Personality` | Canonical personality text. |
| `scenario` | `properties.Scenario` | Canonical scenario context. |
| `keywords` / `Keywords` | `properties.Keywords` | Merged into a unique array of strings. |
| `triggers` | `properties.Triggers` | Merged into an array of strings. |
| (various) | `properties.Meta` | Inferred for categorization (see below). |
| `*` (any other) | `properties.*` | All other fields (`priority`, `requires`, `Shifts`, etc.) are preserved in `properties`. |

## Detailed Mapping Logic

### 1. Identity & Labeling
- **`label`**: The display name in the Armillaris UI. 
    - Order of precedence: `entry.tag` > `entry.Keywords[0]` > `personality excerpt` > `"V12 Entry [Index]"`.
- **`sourceId`**: Set to `entry.tag` if available, otherwise a generated index string.
- **`sourceType`**: Always set to `icehellionx_v12`.

### 2. Meta Categorization (`properties.Meta`)
Armillaris uses the `Meta` property to group entries. For v12 imports, this is inferred to maintain the "Trigger/Emit" relationship:
1. `entry.Meta` (if explicitly defined in the source)
2. `entry.triggers[0]` (the first tag emitted by this entry)
3. `entry.tag` (the entry's own internal label)
4. `"entry"` (generic fallback)

### 3. Keyword & Trigger Handling
Both `keywords` (lowercase) and `Keywords` (PascalCase) from the v12 source are concatenated into a single unique array in `properties.Keywords`. Redundant lowercase keys are removed from the root of the `properties` object to prevent clutter.

### 4. Gating & Logic (LOSSLESS)
All gating fields are moved into `properties` with their original v12 names and structures preserved:
- **Priority/Probability**: `priority`, `probability`
- **Time Gates**: `minMessages`, `maxMessages`
- **Text Gates**: `requires`, `andAny`, `andAll`, `notAny`, `notAll`, `block`
- **Tag Gates**: `andAnyTags`, `andAllTags`, `notAnyTags`, `notAllTags`
- **Name Blocks**: `nameBlock`
- **Shifts**: The `Shifts` array is preserved exactly as it appears in the JS source, including its nested objects.

## Reconstruction Example

### Raw v12 (JS)
```javascript
{
    tag: "espresso_base",
    keywords: ["espresso", "coffee"],
    priority: 4,
    triggers: ["action_brew"],
    personality: "A focused barista.",
    requires: { all: ["machine", "portafilter"] },
    Shifts: [
        { keywords: ["latte"], personality: "Frothing milk." }
    ]
}
```

### Armillaris `LoreEntry`
```json
{
    "id": "uuid...",
    "label": "espresso_base",
    "sourceType": "icehellionx_v12",
    "sourceId": "espresso_base",
    "properties": {
        "Meta": "action_brew",
        "Keywords": ["espresso", "coffee"],
        "Triggers": ["action_brew"],
        "Personality": "A focused barista.",
        "Scenario": "",
        "priority": 4,
        "requires": { "all": ["machine", "portafilter"] },
        "Shifts": [
            { "keywords": ["latte"], "personality": "Frothing milk." }
        ]
    }
}
```

> [!TIP]
> To recreate the v12 format from Armillaris, extract all fields from `properties`. The fields `Keywords`, `Triggers`, `Personality`, and `Scenario` map back to their v12 names (mapping `Keywords` to either casing as needed). The `Meta` property can be ignored if a `tag` or `triggers` array is present.
