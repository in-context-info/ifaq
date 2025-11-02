
# Custom AI Chatbot App

This is a code bundle for Custom AI Chatbot App. The original project is available at https://www.figma.com/design/8HW9JKdbJM4CIUIOD5n9CX/Custom-AI-Chatbot-App.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Cloudflare account (for deployment)

## Installation

1. Navigate to the project directory:
   ```bash
   cd ifaqai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Authenticate with Cloudflare (if not already done):
   ```bash
   npx wrangler login
   ```

## Development

### Start Vite Development Server (for local React development)
```bash
npm run dev
```
This starts the Vite dev server on port 3000 with hot reload.

### Start Wrangler Development Server (for Cloudflare Workers/Pages)
```bash
npm start
```

This runs `wrangler dev` which starts the Wrangler dev server with all configured bindings (AI, Vectorize, D1).

### Preview with Wrangler Pages
```bash
npm run build           # Build the project first
npm run preview:worker  # Preview with Pages dev server (runs `wrangler pages dev`)
```

## Building

Build the project for production:
```bash
npm run build
```

Output will be in the `build/` directory.

## Deployment

### Deploy as Worker
```bash
npm run deploy
```

### Deploy as Pages
```bash
npm run deploy:worker
```

### Deploy as Pages (create new project)
```bash
npm run deploy:create
```

## Configuration

- **Wrangler**: `wrangler.toml` and `wrangler.jsonc`
- **Vite**: `vite.config.ts`
- **TypeScript**: `tsconfig.json`

The project is configured with:
- AI Binding
- Vectorize Index (neocortex)
- D1 Database (hippocampus)

## Testing

Run tests:
```bash
npm test
```

## Project Structure

```
ifaqai/
├── src/              # React source files
│   ├── components/   # React components
│   └── ...
├── functions/        # Cloudflare Pages Functions
├── build/            # Build output (generated)
├── test/             # Test files
├── index.html        # Entry HTML file
└── ...
```
