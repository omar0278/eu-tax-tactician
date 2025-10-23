# EU Tax Tactician

## Overview

EU Tax Tactician is an educational browser-based game designed to teach players about EU business taxation and tax incentives across different member states. The application presents interactive scenarios where players match startup business profiles with optimal EU countries based on tax considerations, learning practical tax concepts through gameplay.

The project is built as a full-stack web application with a React frontend and Express backend, though the current implementation primarily focuses on client-side game logic with minimal backend integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:** The frontend uses React 18 with TypeScript, built with Vite as the build tool. The UI is constructed using Tailwind CSS for styling and shadcn/ui components (Radix UI primitives) for accessible, reusable interface elements.

**Rendering Approach:** The application employs React Three Fiber (@react-three/fiber) and related 3D libraries, suggesting an intention to incorporate 3D graphics or animations, though the current game implementation in `client/game.js` uses vanilla JavaScript with a traditional DOM-based approach.

**Design Rationale:** The dual approach (vanilla JS game + React infrastructure) indicates a phased development where the educational game logic was prototyped separately from the React shell. This allows rapid iteration on game mechanics while maintaining a modern component-based architecture for the surrounding UI.

**State Management:** The application uses Zustand with selector subscriptions for global state management (see `useGame.tsx` and `useAudio.tsx`). This provides a lightweight alternative to Redux while maintaining TypeScript support and efficient re-rendering.

**Data Layer:** Game content (scenarios, country data, trait glossaries) is stored in JSON files within `client/data/`, enabling non-developer content updates without code changes.

### Backend Architecture

**Framework:** Express.js server with TypeScript, using ES modules throughout the codebase.

**API Structure:** The backend is configured for RESTful API routes with a `/api` prefix, though actual route implementations are minimal in the current state. The `registerRoutes` function in `server/routes.ts` provides the extension point for future API development.

**Session Management:** Dependencies include `connect-pg-simple`, indicating plans for PostgreSQL-backed session storage, though sessions aren't currently implemented.

**Development Setup:** The server integrates Vite's development middleware, enabling hot module replacement during development while serving production builds in the deployed environment.

**Rationale:** The backend architecture is designed as a lightweight foundation that can scale with future requirements (user accounts, leaderboards, progress tracking) while keeping the initial implementation simple and focused on the game logic.

### Database Layer

**ORM:** Drizzle ORM with PostgreSQL dialect, configured to use Neon's serverless PostgreSQL driver (`@neondatabase/serverless`).

**Schema Management:** Database schemas are defined in `shared/schema.ts` with migrations output to the `./migrations` directory. Currently only defines a basic `users` table with username/password authentication.

**Validation:** Drizzle-Zod integration provides runtime schema validation and TypeScript type inference from database schemas.

**Rationale:** Drizzle was chosen for its TypeScript-first approach and serverless compatibility. The minimal current schema reflects the educational game's client-side focus, with infrastructure ready for user accounts and progress persistence when needed.

### Build System

**Development:** Vite handles frontend development with HMR, while `tsx` runs the TypeScript server directly during development.

**Production:** The build process compiles the React frontend with Vite and bundles the server using esbuild with ESM output, external package resolution, and Node.js platform targeting.

**Asset Handling:** Vite is configured to handle GLSL shaders (via `vite-plugin-glsl`) and large binary assets (GLTF/GLB models, audio files), supporting the 3D rendering capabilities.

**Rationale:** This dual-bundler approach optimizes each layer appropriately—Vite excels at frontend bundling with tree-shaking and code-splitting, while esbuild provides extremely fast server bundling without unnecessary transformations.

### Code Organization

**Monorepo Structure:** The codebase uses a shared TypeScript configuration with path aliases (`@/*` for client, `@shared/*` for shared code), enabling type-safe code sharing between frontend and backend.

**Client Organization:**
- `client/src/` - React application code
- `client/src/components/ui/` - shadcn/ui component library
- `client/src/lib/` - Utilities and state stores
- `client/data/` - Game content in JSON format
- `client/game.js` - Vanilla JS game logic

**Server Organization:**
- `server/index.ts` - Express server setup
- `server/routes.ts` - API route definitions
- `server/storage.ts` - Data access abstraction layer
- `server/vite.ts` - Vite development integration

**Shared Code:**
- `shared/schema.ts` - Database schemas and validation

**Rationale:** This structure separates concerns while enabling code reuse. The storage abstraction layer allows switching between in-memory development storage and production database implementations.

## External Dependencies

### Database

**PostgreSQL (via Neon):** The application is configured to use Neon's serverless PostgreSQL with connection pooling. Environment variable `DATABASE_URL` must be set for database connectivity.

### UI Component Libraries

**Radix UI:** Provides unstyled, accessible primitive components (@radix-ui/react-*) for dialogs, dropdowns, tooltips, and other interactive elements. Chosen for accessibility compliance and customization flexibility.

**React Three Fiber Ecosystem:** 
- `@react-three/fiber` - React renderer for Three.js
- `@react-three/drei` - Helper components and abstractions
- `@react-three/postprocessing` - Post-processing effects

These enable 3D graphics capabilities for potential game enhancements.

### Data Fetching

**TanStack Query:** (@tanstack/react-query) Handles server state management, caching, and data synchronization. Configured with custom query functions in `client/src/lib/queryClient.ts` that integrate with the Express backend's cookie-based authentication.

### Styling

**Tailwind CSS:** Utility-first CSS framework with custom theme configuration extending shadcn/ui design tokens. PostCSS processes Tailwind directives.

**Fonts:** Inter font family loaded from @fontsource for consistent typography.

### Development Tools

**Replit Vite Plugin:** `@replit/vite-plugin-runtime-error-modal` provides enhanced error overlays during development on the Replit platform.

### Build Dependencies

**TypeScript:** Strict mode enabled for type safety across the entire codebase.

**ESBuild:** Server-side bundling for production builds.

**Drizzle Kit:** Database migration management and schema pushing.

### Utility Libraries

- **clsx & tailwind-merge:** Class name composition utilities
- **class-variance-authority:** Type-safe component variant management
- **date-fns:** Date manipulation and formatting
- **zod:** Runtime type validation
- **cmdk:** Command menu implementation
- **nanoid:** Unique ID generation

**Rationale:** Dependencies prioritize TypeScript support, bundle size efficiency, and developer experience. The extensive UI component library (Radix + shadcn) accelerates feature development while maintaining accessibility standards.