<div align="center">

<img src="docs/media/banner.svg" alt="Jianwei — from an idea to something you can act on" width="100%" />

### From a rough thought to directions, evidence, and a next step.

A local creative research workspace built around the idea you're exploring.

[简体中文](README.md) · [English](README.en.md)

[Watch the product overview](https://github.com/XiaoWuheng/jianwei/releases/latest) · [Get started](#get-started) · [License](LICENSE)

</div>

![Actual startup, idea capture, directions, sources, and tasks](docs/media/preview.gif)

## Explore an idea, then give it a first step

“I want dinners alone to feel a little more special. Maybe it becomes something I can share with friends. Where do I start?”

Capture it in your own words. Explore alternatives, look up relevant examples, and turn a promising direction into a small experiment. An idea can become a story, an experience, a service, research, or a product.

| View | What happens here |
| :--- | :--- |
| Keep talking | Clarify goals and constraints. Keep the original words and earlier versions. |
| Explore directions | Compare possible approaches, assumptions, and small experiments. |
| Research | Find examples, products, code, and public research with traceable sources. |
| Plan | Define stages, deliverables, and acceptance criteria. Export a Markdown execution brief. |

Saved ideas can be searched, combined, and summarized periodically. Summaries retain references to the original records.

## Get started

Install [Node.js 24+](https://nodejs.org/), Git, and [Codex CLI](https://github.com/openai/codex#quickstart). Sign in and check `codex login status`.

```sh
git clone https://github.com/XiaoWuheng/jianwei.git
cd jianwei
npm ci
npm run build
npm start
```

Open **[http://127.0.0.1:4317](http://127.0.0.1:4317)**. Write down an idea and select 「帮我想一想」.

On Windows, `打开见微.vbs` launches a fullscreen Chrome or Edge app window after building. Press F11 to leave fullscreen. Engine detection on Windows requires the native `codex.exe` from the official standalone installer. Set `JIANWEI_CODEX_PATH` if it is not on PATH.

The interface currently uses Chinese labels. A fresh installation starts with an empty database. Screenshots show a real demonstration case.

## Data and model access

- Ideas, conversations, notes, research, and task progress are stored in local SQLite at `data/jianwei.sqlite`. Full JSON export and import are available.
- Thinking, research, and summaries use the model service configured in your local Codex installation. They require network access and service quota. Relevant inputs and context are sent to that service.
- Research follows public sources relevant to the task. Each report describes actual coverage. Some authenticated, paywalled, or unindexed content may be unavailable.
- The server listens on loopback by default. Browser voice input depends on browser support.

## Development

```sh
npm run dev
npm test
```

The React / TypeScript UI and Three.js scene are in `src/`. The local server, model calls, and SQLite storage are in `server/`. Set `JIANWEI_PORT` and `JIANWEI_DATA_DIR` to change the port and data directory.

[Issues](https://github.com/XiaoWuheng/jianwei/issues) and pull requests are welcome. Include reproduction steps and viewport dimensions for UI issues. Run `npm test` and `npm run build` before submitting.

## License

Original code is [MIT licensed](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md) for dependency and font licenses.

The product video uses an edited excerpt of [Discovery by Scott Buckley](https://www.scottbuckley.com.au/library/discovery/) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), mixed with narration. The video includes the required credits.
