# ifaqai

A modern AI-powered FAQ chatbot application built with React and Cloudflare Workers. Users can create personalized chatbots trained on their own FAQ knowledge base.

## Description

ifaqai is a full-stack application that allows users to:
- Create accounts and manage profiles
- Build custom FAQ knowledge bases
- Generate personalized chatbots accessible via unique URLs
- Interact with chatbots that answer questions based on FAQ matching

The application features a responsive React frontend with a comprehensive UI component library, and a Cloudflare Worker backend that handles API routes and serves static assets.

## Project Structure

```
ifaqai/
├── src/                          # Source code
│   ├── components/               # React components
│   │   ├── ChatbotInterface.tsx # Main chatbot UI component
│   │   ├── Dashboard.tsx        # User dashboard
│   │   ├── FAQManager.tsx       # FAQ management component
│   │   ├── LoginPage.tsx        # Authentication page
│   │   ├── ProfileSetup.tsx     # User profile setup
│   │   ├── figma/               # Figma-related components
│   │   └── ui/                  # Reusable UI components (Radix UI)
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       └── ... (40+ UI components)
│   ├── App.tsx                  # Main React application component
│   ├── main.tsx                 # React entry point
│   ├── index.ts                 # Cloudflare Worker entry point
│   ├── index.css                # Global styles
│   ├── styles/
│   │   └── globals.css         # Additional global styles
│   └── guidelines/
│       └── Guidelines.md        # Project guidelines
├── public/                      # Static assets (build output)
│   ├── index.html              # Production HTML file
│   └── assets/                 # Compiled JS and CSS
├── test/                        # Test files
│   ├── index.spec.ts           # Worker tests
│   └── tsconfig.json
├── index.html                  # Development HTML file
├── package.json                # Dependencies and scripts
├── vite.config.mjs             # Vite build configuration
├── wrangler.jsonc              # Cloudflare Workers configuration
├── tsconfig.json               # TypeScript configuration
└── worker-configuration.d.ts  # Cloudflare Workers type definitions
```

## Core Components

### Application Components

- **App.tsx**: Main application router that handles authentication state and routing
- **LoginPage.tsx**: User authentication (login/signup)
- **ProfileSetup.tsx**: Initial profile configuration for new users
- **Dashboard.tsx**: Main dashboard for managing chatbot and FAQs
- **ChatbotInterface.tsx**: Interactive chat interface for users to interact with chatbots
- **FAQManager.tsx**: Component for creating and managing FAQ entries

### Chat Handling

The chat functionality is implemented in `ChatbotInterface.tsx`:

- **`handleSendMessage`**: Processes user messages and triggers bot responses
- **`findBestAnswer`**: Searches FAQ database to find the best matching answer using:
  - Exact match comparison
  - Word-based similarity scoring
  - Case-insensitive matching

## API Endpoints

### Base URL
All API endpoints are prefixed with `/api/`

### Available Endpoints

#### `GET /api/message`
Returns a simple greeting message.

**Response:**
```plaintext
Hello from ifaqai!
```

**Example:**
```bash
curl https://your-domain.workers.dev/api/message
```

#### `GET /api/random`
Generates and returns a random UUID.

**Response:**
```plaintext
550e8400-e29b-41d4-a716-446655440000
```

**Example:**
```bash
curl https://your-domain.workers.dev/api/random
```

### Routing

- **`/`**: Home/login page
- **`/<username>`**: Public chatbot interface for a specific user (e.g., `/john_doe`)
- **`/api/*`**: API endpoints handled by the Cloudflare Worker

All other routes are handled by React Router for client-side navigation.

## Technology Stack

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **Sonner**: Toast notifications

### Backend
- **Cloudflare Workers**: Edge runtime
- **Wrangler**: Development and deployment tool

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

3. Authenticate with Cloudflare (for deployment):
   ```bash
   npx wrangler login
   ```

## Development

### Start Development Server

Run the Cloudflare Workers development server:
```bash
npm run dev
# or
npm start
```

This starts Wrangler dev server which:
- Serves the React app locally
- Handles API routes
- Supports hot reload

### Build Frontend

Build the React application:
```bash
npm run build:frontend
```

Output will be in the `public/` directory.

### Build Worker

Build the Cloudflare Worker:
```bash
npm run build:worker
```

### Build Everything

Build both frontend and worker:
```bash
npm run build
```

## Deployment

Deploy to Cloudflare Workers:
```bash
npm run deploy
```

This command:
1. Builds the frontend (React app)
2. Builds the worker
3. Deploys to Cloudflare

## Testing

Run tests:
```bash
npm test
```

## Configuration

### Wrangler Configuration (`wrangler.jsonc`)
- Worker name: `ifaqai`
- Compatibility date: `2025-11-01`
- Static assets directory: `./public`

### Vite Configuration (`vite.config.mjs`)
- Build output: `public/`
- React plugin with SWC for fast compilation
- Path aliases configured for `@/` → `src/`

## Data Storage

Currently, the application uses **localStorage** for data persistence:
- User accounts and authentication
- User profiles and settings
- FAQ knowledge bases

**Note**: For production use, consider migrating to:
- Cloudflare D1 (SQLite database)
- Cloudflare KV (key-value store)
- Cloudflare R2 (object storage)

## Features

- ✅ User authentication (login/signup)
- ✅ Profile management
- ✅ FAQ creation and management
- ✅ Personalized chatbot URLs
- ✅ Real-time chat interface
- ✅ FAQ-based answer matching
- ✅ Responsive design
- ✅ Comprehensive UI component library

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]

