# Icehellionx v12 Data Mapping Guide

This document describes how raw **Icehellionx v12** lorebook entries are transformed into Armillaris `LoreEntry` objects. This mapping includes advanced preprocessing to flatten complex structures like `Shifts` and requirements for better compatibility with the Armillaris engine.

## Overview

Each entry in the `dynamicLore` array of a v12 file is converted into one or more `LoreEntry` objects. Nested `Shifts` are extracted and turned into standalone entries.

| v12 Field | Armillaris Path | Notes |
| :--- | :--- | :--- |
| `tag` | `label` | Primary identifier. Falls back to Keywords[0] or Personality snippet. |
| `personality` | `properties["Personality"]` | Canonical personality text. |
| `scenario` | `properties["Scenario"]` | Canonical scenario context. |
| `keywords` | `properties["Keywords"]` | Merged and preprocessed into `\bword\w*` regex. |
| `triggers` | `properties["Triggers"]` | Merged into an array of symbolic strings. |
| (inferred) | `properties["Related Triggers"]` | **Relation**: UUIDs resolved from symbolic triggers. |
| `requires` | `properties["And Any"]` / `["And All"]` / ... | Unified/flattened string list properties. |
| (inferred) | `properties["Related Tags"]` | **Relation**: UUIDs resolved from requirement tags. |
| `Shifts` | `properties["Shifts"]` | **Relation**: List of child UUIDs (stored on parent). |
| (linkage) | `properties["Meta"]` | Set to `"shift"` on child entries. |

## Detailed Mapping Logic

### 1. Identity & Labeling
- **`label`**: The display name in the Armillaris UI. 
    - Order of precedence: `entry.tag` > `entry.Keywords[0]` > `personality excerpt` > `"V12 Entry [Index]"`.
- **`sourceId`**: Set to `entry.tag` if available, otherwise a generated index string.
- **`sourceType`**: Always set to `icehellionx_v12`.

### 2. Meta Categorization (`properties["Meta"]`)
Armillaris uses the `Meta` property to group entries.
1. `entry.Meta`: Explicitly defined in source.
2. `entry.triggers[0]`: The first tag emitted.
3. `entry.tag`: The entry's own tag.
4. `"entry"`: Generic fallback.
5. **Special Case**: For flattened `Shifts`, the Meta is always set to `"shift"`.

### 3. Keyword Preprocessing (Regex & Wildcards)
Keywords are unified and transformed into patterns compatible with the engine:
- **Wildcards**: `greet*` is converted to `\bgreet\w*` (matches "greet", "greeting", "greeted" etc. with word boundary).
- **Regex Prefix**: `regex:foo` is converted to `foo`.

### 4. Gating & Logic (Flattened Requirements)
V12 requirements are unified and **recursively flattened** into string list properties. Any nested logical structures (like `all: [{ any: [...] }]`) are simplified into a single list of tags for the target property:
- **`properties["And Any"]`**: Matches if ANY of these tags/conditions are met.
- **`properties["And All"]`**: Matches if ALL of these tags/conditions are met.
- **`properties["Not Any"]`**: Matches if NONE of these tags/conditions are met.
- **`properties["Not All"]`**: Matches if NOT ALL of these tags/conditions are met.

### 5. Relation Resolution (Rel type)
Armillaris resolves V12 symbolic strings into UUID-based relations via a two-pass import:
1. **`Related Triggers`**: Arrays of UUIDs pointing to entries that match the symbolic `Triggers`.
2. **`Related Tags`**: Arrays of UUIDs pointing to entries that match the tags in requirement conditions.
3. **`Shift`**: Holds the UUID of the parent entry when processed from nested `Shifts`.

### 6. Property Cleanup
To maintain a lean data model, redundant or internal V12 fields are removed from the root of the `properties` object after being mapped (or replaced by Title Case equivalents).

## Reconstruction Example

### Raw v12 (JS)
```javascript
{
    tag: "espresso_base",
    keywords: ["espresso", "coffee*"],
    triggers: ["action_brew"],
    personality: "A focused barista.",
    requires: { 
        any: ["morning"], 
        all: [{ any: ["beans", "grind"] }] 
    },
    Shifts: [
        { keywords: ["latte"], personality: "Frothing milk." }
    ]
}
```

### Armillaris `LoreEntry` (Parent)
```json
{
    "id": "uuid-1",
    "label": "espresso_base",
    "properties": {
        "Meta": "action_brew",
        "Tag": "espresso_base",
        "Keywords": ["espresso", "\\bcoffee\\w*"],
        "Triggers": ["action_brew"],
        "Related Triggers": ["uuid-1"], 
        "Personality": "A focused barista.",
        "And Any": ["morning"],
        "And All": ["beans", "grind"],
        "Shifts": ["uuid-2"]
    }
}
```

### Armillaris `LoreEntry` (Child/Shift)
The shifted entries will now have `properties["Meta"] = "shift"` and be linked from the parent's `Shifts` list.
```json
{
    "id": "uuid-2",
    "label": "latte",
    "properties": {
        "Meta": "shift",
        "Keywords": ["latte"],
        "Personality": "Frothing milk."
    }
}
```
