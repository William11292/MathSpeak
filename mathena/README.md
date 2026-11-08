# Speak Math

Speak or type an equation and see it as an image, as LaTeX and as clean spoken text. Then move through its layers and edit it in a chat workspace.

## Files

`index.html` holds the page markup for every tab (Math Workspace, MathSpeak Help, Export, Organize & Export). Styles and code live in separate files, grouped by tab:

```
index.html
css/
  base.css          design tokens, app shell, sidebar, shared controls
  workspace.css     Math Workspace and its command bar
  help.css          MathSpeak Help
  export.css        Export list
  organize.css      Organize & Export
  print.css         printing (PDF export)
js/
  core/state.js        shared state and helpers (loads first)
  core/rule-parser.js  built-in rules: spoken words to LaTeX
  core/layers.js       layer engine: LaTeX to tree to MathSpeak
  workspace/           render, convert, voice, commands, navigate
  export/              saved-list, files, organize, docx
  api-key.js           standalone mode: your own Claude API key
  shell.js             tabs and sidebar
  main.js              wiring and start-up (loads last)
```

The scripts are plain `<script>` files, not modules, so the page still works when you open `index.html` straight from disk. They share top-level names, and **load order matters**: a file can only use, at load time, names from files above it in `index.html`. New page-wide overlays (like a tutorial) go at the top level of `index.html`, outside the tab sections.

## Layout

A retractable left sidebar switches between three pages:

- **Math Workspace**: split screen. Left: equation input and the change box for the selected layer. Right, top to bottom: Image, Text · LaTeX and Clean text equation, with the layer path pinned along the bottom. Navigation is always on: click any part or focus a view and use ↑ out, ↓ in, ← → neighbors. Controls live in a MathVoice-style command bar at the bottom right, and every button is also a voice command: **Dictation** (“Start listening”, “Pause”, “Done”, “Clear”), **Edit the math** (“Select that”, “Out a layer”, “In a layer”, “Previous”, “Next”, “Delete”) **Refine** (“Say a change”, “Refine with AI”, “Refine manually”) and **Export** (“Save” adds the current equation to the Export list; nothing is saved automatically). Once the mic is on it stays on for commands, so the page can be used hands-free.
- **MathSpeak Help**: how it works, scope cues to say, and the navigation keys.
- **Export**: the saved equations, numbered in save order, each shown as an image with its MathSpeak text and a checkbox. Check several (or Select all) and press **Organize & Export**.
- **Organize & Export** (from Export): the checked equations become blocks of a document. Add headings and text blocks, edit any block, reorder with the arrows, or remove blocks. On the right: document title, category (**Document**: equations plus written content, as PDF or Word; **Equation images**: PNG or SVG, one file per equation), equation numbering, and a live preview. Word files embed each equation as an image whose alt text is its MathSpeak, so screen readers can read it.

## Claude conversion

- **Inside Claude (as an artifact):** uses Claude's built-in artifact AI. No setup needed.
- **Anywhere else (GitHub Pages, opened locally):** open "Use your own Claude API key" under the Submit button and paste an Anthropic API key. The page calls the Claude API directly from your browser with the same prompt (Haiku for quick conversions). The key is stored only in that browser's local storage and sent only to `api.anthropic.com`. Without a key, the built-in rules are used.

Never commit an API key to this repo.
