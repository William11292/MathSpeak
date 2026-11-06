# Speak Math

Speak or type an equation and see it as an image, as LaTeX and as clean spoken text. Then move through its layers and edit it in a chat workspace.

Self-contained: everything is in `index.html`.

## Layout

A retractable left sidebar switches between three pages:

- **Math Workspace**: split screen. Left: equation input (type or dictate) and the edit history. Right, top to bottom: Image, Text · LaTeX and Clean text equation, with the layer path pinned along the bottom. Navigation is always on: click any part or focus a view and use ↑ out, ↓ in, ← → neighbors. Press **Edit LaTeX** to edit the source directly.
- **MathSpeak Help**: how it works, scope cues to say, and the navigation keys.
- **Export**: save the current equation as PNG or SVG, copy LaTeX or clean text, and the log of past equations.

## Claude conversion

- **Inside Claude (as an artifact):** uses Claude's built-in artifact AI. No setup needed.
- **Anywhere else (GitHub Pages, opened locally):** open "Use your own Claude API key" under the Submit button and paste an Anthropic API key. The page calls the Claude API directly from your browser with the same prompt (Haiku for quick conversions). The key is stored only in that browser's local storage and sent only to `api.anthropic.com`. Without a key, the built-in rules are used.

Never commit an API key to this repo.
