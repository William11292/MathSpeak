# MathSpeak

Prototypes from Team 25's Business + Tech Innovation Jam project at Michigan Ross: a text-to-speech and dictation tool for complex math equations, built to help college students with visual impairments learn math.

## Apps

| App | Path | What it does |
| --- | --- | --- |
| **Speak Math** | [`speak-math/`](speak-math/index.html) | Speak or type an equation and see it as an image, as LaTeX and as clean spoken text. Then move through its layers and edit it in a chat workspace. |
| **MathVoice Export Workflow** | [`mathvoice-export-workflow/`](mathvoice-export-workflow/index.html) | A math workspace that covers the workflow for exporting dictated math. |

Each app lives in its own folder and is fully isolated: a single self-contained `index.html` with no shared code, assets or dependencies between them. Open either file directly in a browser, or serve the repo with GitHub Pages.

## Notes

- Both apps started as Claude artifacts. Speak Math calls Claude's in-artifact AI features when it runs inside Claude. When it runs anywhere else, those features are switched off and the app falls back to local-only behavior.
