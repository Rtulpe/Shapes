# Shapes — Agentic Engineering Portfolio Example

This small web project demonstrates agentic engineering: it was assembled and iterated on by autonomous agents as a portfolio example.

Overview
- Lightweight browser app rendering shapes and simple mechanics.
- Open `zabka.html` in a browser or serve the folder with a static HTTP server.

Run locally
- Quick (no install): open `zabka.html` in your browser.
- Using Python's simple server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/zabka.html
```

Files
- Top-level: `zabka.html`, `game.js`, `styles.css`, `abilities.json`
- JS folder: `js/` contains game modules (`main.js`, `render.js`, `mechanics.js`, `shape.js`, etc.)

Notes for maintainers
- This repository was produced by agent workflows; treat it as a showcase of agent-driven development.
- See `guidelines.md` for rules future agents should follow when modifying or extending the project.

License
- This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE).

If you want me to:
- run a local web preview, create a `package.json`, or add CI, say which you'd prefer and I'll implement it.
