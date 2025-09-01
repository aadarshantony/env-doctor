<p align="center">
  <img src="logo.png" alt="Env Doctor Logo" width="150">
</p>


# Env Doctor

> **Diagnose, validate, and audit your environment variables across your entire project.**
>
> Env Doctor scans all your `.env` files and your source code to catch **missing** and **unused** environment variables.

---

## Features

* Recursively finds **all `.env` files** in your project
* Scans source files (`.js`, `.ts`, `.jsx`, `.tsx`, `.mjs`, `.cjs`)
* Detects environment usage via:

  * `process.env.KEY` / `process.env["KEY"]`
  * `import.meta.env.KEY`
  * `$env/static/*` or `astro:env/*` imports
* Reports **missing** and **unused** keys
* Pretty output with spinners and colors

---

## Installation

```bash
npm install -g envdoc
```

---

## Usage

Run inside any project:

```bash
envdoc diagnose
```

That’s it — Env Doctor will automatically:

1. Find all `.env` files
2. Parse them
3. Scan your codebase for environment variable usage
4. Compare → Report missing & unused keys

---

## Example

Project structure:

```
my-app/
 ├─ src/
 │   ├─ index.js
 │   └─ utils.ts
 ├─ .env
 └─ .env.local
```

`.env` file:

```env
PORT=3000
DATABASE_URL=
DEBUG_MODE=true
```

`src/index.js`:

```js
console.log(process.env.PORT);
console.log(process.env.DATABASE_URL);
```

Run:

```bash
envdoc diagnose
```

Output:

```
SUCCESS: Found 2 .env file(s).
SUCCESS: Parsed all .env files (3 unique keys found).
SUCCESS: Scan complete.

Used keys in code: [ 'PORT', 'DATABASE_URL' ]
Keys defined in .env files: [ 'PORT', 'DATABASE_URL', 'DEBUG_MODE' ]

WARNING: Missing keys in .env file(s): [ 'DATABASE_URL' ]
WARNING: Unused keys in .env file(s): [ 'DEBUG_MODE' ]
```

---

## 🛠 CLI

| Command               | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `envdoc diagnose` | Scan your project and report missing/unused env keys |
more commands coming soon

---

## Contributing

1. Fork the repo
2. Create a branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m "Add feature"`)
4. Push (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## License

MIT License © 2025 [Adarsh Antony](https://github.com/aadarshantony)
