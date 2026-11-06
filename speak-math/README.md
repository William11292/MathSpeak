# Speak Math

Speak or type an equation and see it as an image, as LaTeX and as clean spoken text. Then move through its layers and edit it in a chat workspace.

Self-contained: everything is in `index.html`.

## Claude conversion

- **Inside Claude (as an artifact):** uses Claude's built-in artifact AI. No setup needed.
- **Anywhere else (GitHub Pages, opened locally):** open "Use your own Claude API key" under the Submit button and paste an Anthropic API key. The page calls the Claude API directly from your browser with the same prompt (Haiku for quick conversions). The key is stored only in that browser's local storage and sent only to `api.anthropic.com`. Without a key, the built-in rules are used.

Never commit an API key to this repo.
