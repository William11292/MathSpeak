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

- **Math Workspace**: split screen. Left: MathSpeak Input and the change box for the selected layer. Right, top to bottom: Image, LaTeX and MathSpeak, with the layer path pinned along the bottom. Navigation is always on: click any part or focus a view and use ↑ out, ↓ in, ← → neighbors. Controls live in a MathVoice-style command bar at the bottom right, and every button is also a voice command: **Input** (“Create new”, “Pause”, “Done”, “Clear”), **Navigate** (“Navigate”, “Out a layer”, “In a layer”, “Previous”, “Next”, “Delete”) **Refine** (“Say a change”, “Refine with AI”, “Refine manually”) and **Export** (“Save” adds the current equation to the Export list; nothing is saved automatically). The mic turns on when the page opens and waits in a commands-only standby, so nobody has to find a button first: say “Create new” to dictate, “Start edit” to change the current equation, or “Go to export”, “Help” and “Go to workspace” to switch pages from anywhere. “Stop listening” stops dictating but keeps the mic on for commands; “Turn off the mic” mutes it. If the browser won't start the mic on load, the first key press or tap anywhere starts it.

**Mic widget** (bottom of the sidebar, like a call's mute button): shows what the mic is doing (listening for commands, dictating, paused, muted, blocked), a live input-level meter, and “Hearing speech” when speech recognition picks up words. Mute (button or <kbd>Alt</kbd>+<kbd>M</kbd>) really closes the mic: recognition stops and the audio stream is released. Unmuting can't be done by voice, because a muted mic isn't listening.

**Typing and voice together**: typing into the box that's being dictated into pauses dictation and keeps what you typed; “Resume” adds new spoken words after it. Opening “Refine manually” also pauses dictation.

**How input is interpreted**: voice commands are exact phrases matched in code (no AI). Dictated math is converted by Claude only when the engine is set to “Convert with Claude” and Claude is available (inside Claude, or with an API key); otherwise by the built-in rules. “Refine with AI” always uses Claude.

**Select equations by voice** (Export page): a command bar under the list: “Select all”, “Select none”, “Select 3”, “Unselect 3”, “Select 2 to 5”, “Next page”, “Previous page”, “Read page”, and “Organize” to continue with the selected equations.

**Organize & Export by voice**: the page has its own command bar, pinned to the bottom. Navigate (“Previous”, “Next”, “Move up”, “Move down”, “Remove”, or name a block: “Move equation 3 down”, “Remove heading 1”), Add (“Add heading”, “Add text”, then the words and “Done”), Options (“LaTeX on/off”, “Numbering on/off”), Format (“PDF”, “Word”, “PNG”, “SVG”: one choice that sets both the category and the format) and Finalize (“Read back”, “Finalize”). “Go back” returns to Select equations. “Title …” sets the document title. “Show LaTeX” prints each equation's LaTeX source under it in PDF and Word.

**Serve it, don't open it as a file**: from a `file://` page Chrome doesn't remember the mic permission and can ask again every time recognition restarts (it restarts after each pause in speech). Run `python3 -m http.server 8000` in the repo and open `http://localhost:8000/mathena/`, or use GitHub Pages; Chrome then asks once.
- **MathSpeak Help**: how it works, scope cues to say, and the navigation keys.
- **Export**: the saved equations, numbered in save order, each shown as an image with its MathSpeak text and a checkbox. Check several (or Select all) and press **Organize & Export**.
- **Organize & Export** (from Export): the checked equations become blocks of a document. Add headings and text blocks, edit any block, reorder with the arrows, or remove blocks. On the right: document title, category (**Document**: equations plus written content, as PDF or Word; **Equation images**: PNG or SVG, one file per equation), equation numbering, and a live preview. Word files embed each equation as an image whose alt text is its MathSpeak, so screen readers can read it.

## Claude conversion

- **Inside Claude (as an artifact):** uses Claude's built-in artifact AI. No setup needed.
- **Anywhere else (GitHub Pages, opened locally):** open "Use your own Claude API key" under the Submit button and paste an Anthropic API key. The page calls the Claude API directly from your browser with the same prompt (Haiku for quick conversions). The key is stored only in that browser's local storage and sent only to `api.anthropic.com`. Without a key, the built-in rules are used.

Never commit an API key to this repo.
