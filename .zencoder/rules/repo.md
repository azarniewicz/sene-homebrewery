---
description: Repository Information Overview
alwaysApply: true
---

# The Homebrewery Information

## Summary
The Homebrewery is a web application for creating authentic D&D homebrew content using Markdown. It transforms markdown text into professionally styled D&D-like documents with the aesthetic of the Player's Handbook. The application is built with Express.js backend, React frontend, and MongoDB for data persistence. Licensed under MIT.

## Structure
**Main Directories**:
- **`client/`**: React frontend components (admin, homebrew editor, icons)
- **`server/`**: Express.js API endpoints and models (homebrew.api.js, admin.api.js, vault.api.js)
- **`shared/`**: Shared utilities and markdown processors used by both client and server
- **`themes/`**: Styling assets (LESS stylesheets, fonts, PHB themes)
- **`scripts/`**: Build scripts (buildHomebrew.js, buildAdmin.js, dev.js)
- **`tests/`**: Test suites (markdown, html, routes)
- **`config/`**: Configuration files for different environments
- **`install/`**: Installation guides for FreeBSD, Ubuntu, and Windows
- **`.github/`**: CI/CD workflows and issue templates

## Language & Runtime
**Language**: JavaScript (ES modules)  
**Node Version**: ^20.18.x  
**NPM Version**: ^10.8.x  
**Build System**: Vitreum (custom React build tool)  
**Package Manager**: npm  
**Module System**: ES modules (`"type": "module"` in package.json)

## Dependencies
**Main Framework Dependencies**:
- `express@^5.1.0` - Web server framework
- `react@^18.3.1` + `react-dom@^18.3.1` - Frontend UI
- `mongoose@^8.20.0` - MongoDB ODM
- `marked@15.0.12` - Markdown parser with multiple extensions
- `codemirror@^5.65.6` - Code editor component
- `vitreum` - Custom build tool for React applications

**Key Markdown Extensions**:
- `marked-extended-tables`, `marked-definition-lists`, `marked-emoji`, `marked-variables`, `marked-alignment-paragraphs`, `marked-nonbreaking-spaces`, `marked-smartypants-lite`, `marked-subsuper-text`

**Authentication & API**:
- `jwt-simple@^0.5.6` - Token authentication
- `@googleapis/drive@^19.2.0` - Google Drive integration
- `body-parser@^2.2.0`, `cookie-parser@^1.4.7` - Request parsing

**Styling**:
- `less@^3.13.1` - CSS preprocessor
- `classnames@^2.5.1` - Dynamic class management

**Development Dependencies**:
- `eslint@^9.39.1` + plugins (react, jest)
- `stylelint@^16.25.0` + plugins
- `jest@^30.2.0` - Testing framework
- `babel` - Transpilation (@babel/core, preset-env, preset-react)
- `supertest@^7.1.4` - HTTP testing

## Build & Installation
**Prerequisites**:
- Node.js v20.18.x or higher
- MongoDB (Community edition)
- Git
- Environment variable: `NODE_ENV=local` for local development

**Installation**:
```bash
git clone https://github.com/naturalcrit/homebrewery.git
cd homebrewery
npm install
npm start
```

**Build Commands**:
```bash
npm run build          # Full production build (homebrew + admin)
npm run builddev       # Development build with source maps
npm run dev            # Development server with hot reload
npm run quick          # Quick build without full recompilation
npm run phb            # Generate standalone PHB stylesheet
```

**Development**:
```bash
npm run dev            # Start development server with watch mode
```

**Linting**:
```bash
npm run lint           # Fix JavaScript linting issues
npm run lint:dry       # Check linting without fixing
npm run stylelint      # Fix LESS styling issues
npm run stylelint:dry  # Check styling without fixing
npm run verify         # Run lint + tests
```

**Server Entry Point**: `server.js` (connects to MongoDB then starts Express server on port 8000)

## Docker
**Dockerfile**: `/Dockerfile`  
**Base Image**: `node:22-alpine`  
**Environment**: `NODE_ENV=docker`  
**Exposed Port**: 8000

**Configuration**:
- Multi-stage build with dependency caching
- Installs git in Alpine image
- Copies package.json first for layer caching
- Runs `npm install --ignore-scripts` then `npm run build`
- Entry command: `npm start`

**Docker Compose**: `/docker-compose.yml`  
**Services**:
- `mongodb`: Official MongoDB image with persistent volume
- `homebrewery`: Application container (port 8000)
- `nginx`: Reverse proxy with basic auth (port 8001)

**Docker Commands**:
```bash
docker-compose up                           # Start all services
npm run docker:build                        # Build tagged image
npm run docker:publish                      # Publish to registry
```

**MongoDB Connection**: `mongodb://mongodb/homebrewery` (via MONGODB_URI env var)

## Testing
**Framework**: Jest v30.2.0  
**Test Locations**:
- `server/*.spec.js` - API unit tests (admin, homebrew, middleware)
- `tests/markdown/*.test.js` - Markdown parsing tests
- `tests/routes/*.test.js` - Route/endpoint tests
- `tests/html/*.test.js` - HTML safety/sanitization tests

**Naming Conventions**:
- Unit tests: `*.spec.js` (co-located with source files)
- Integration tests: `*.test.js` (in tests/ directory)

**Configuration** (in package.json):
- Test timeout: 30000ms
- Coverage thresholds: 50% statements/lines, 40% branches/functions
- Higher threshold for critical files (homebrew.api.js: 60-70%)
- Setup: `jest-expect-message` for better assertions

**Run Commands**:
```bash
npm test                              # Run all tests
npm run test:api-unit                 # Server API unit tests
npm run test:coverage                 # Generate coverage report
npm run test:dev                      # Watch mode for development
npm run test:basic                    # Basic markdown tests
npm run test:mustache-syntax          # Template syntax tests
npm run test:route                    # Route tests
npm run test:safehtml                 # HTML sanitization tests
```

**Special Test Scripts**:
- Granular test runners for specific features (themes, CSS, notifications)
- Separate runners for inline/block/injection mustache syntax
- Individual markdown feature tests (emojis, hard-breaks, variables)

## Configuration
**Config Files** (in `config/`):
- `default.json` - Default configuration values
- Environment-specific configs loaded via `nconf`

**Key Settings**:
- `web_port`: 8000
- `host`: Application host URL
- `naturalcrit_url`: NaturalCrit service URL
- `local_environments`: ["docker", "local"]
- `public_url`: Public-facing URL

**Babel Configuration** (`babel.config.json`):
- Presets: @babel/preset-env, @babel/preset-react
- Plugins: transform-runtime, transform-import-meta

**ESLint Configuration** (`eslint.config.mjs`):
- ES modules format with modern syntax
- React and Jest plugins
- Enforces camelCase, ES6 class avoidance, JSX best practices
- Tab indentation, single quotes, semicolons required
- Max complexity rules: 200 lines, 4 depth, 5 params

## Key API Endpoints
**Main APIs** (in `server/`):
- `homebrew.api.js` - Core brew CRUD operations
- `admin.api.js` - Administrative functions
- `vault.api.js` - User vault/storage operations
- `googleActions.js` - Google Drive integration

**Models**:
- `homebrew.model.js` - Brew document schema
- `notifications.model.js` - User notifications

**Middleware**:
- `forcessl.mw.js` - HTTPS redirect middleware
- `content-negotiation.spec.js` - Content type handling
- `dbCheck.spec.js` - Database health checks
