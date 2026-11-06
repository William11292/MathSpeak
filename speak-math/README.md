# Speak Math

Speak or type an equation and see it as an image, as LaTeX and as clean spoken text. Then move through its layers and edit it in a chat workspace.

Self-contained: everything is in `index.html`.

## Layout

A retractable left sidebar switches between three pages:

- **Math Workspace**: split screen. Left: equation input and the change box for the selected layer. Right, top to bottom: Image, Text · LaTeX and Clean text equation, with the layer path pinned along the bottom. Navigation is always on: click any part or focus a view and use ↑ out, ↓ in, ← → neighbors. Controls live in a MathVoice-style command bar at the bottom right, and every button is also a voice command: **Dictation** (“Start listening”, “Pause”, “Done”, “Clear”), **Edit the math** (“Select that”, “Out a layer”, “In a layer”, “Previous”, “Next”, “Delete”) **Refine** (“Say a change”, “Refine with AI”, “Refine manually”) and **Export** (“Save” adds the current equation to the Export list; nothing is saved automatically). Once the mic is on it stays on for commands, so the page can be used hands-free.
- **MathSpeak Help**: how it works, scope cues to say, and the navigation keys.
- **Export**: save the current equation as PNG or SVG, copy LaTeX or clean text, and the list of saved equations.

## Claude conversion

- **Inside Claude (as an artifact):** uses Claude's built-in artifact AI. No setup needed.
- **Anywhere else (GitHub Pages, opened locally):** open "Use your own Claude API key" under the Submit button and paste an Anthropic API key. The page calls the Claude API directly from your browser with the same prompt (Haiku for quick conversions). The key is stored only in that browser's local storage and sent only to `api.anthropic.com`. Without a key, the built-in rules are used.

Never commit an API key to this repo.
