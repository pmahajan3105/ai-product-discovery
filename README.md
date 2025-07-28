# FeedbackHub

A simplified feedback management SaaS built by extracting and improving proven patterns from Zeda.io.

## Architecture

- **apps/web**: Next.js frontend with TypeScript
- **apps/api**: Express.js backend with TypeScript
- **packages/ui**: Shared UI components
- **packages/database**: Database models and migrations  
- **packages/types**: Shared TypeScript types

## Quick Start

```bash
npm install
npm run dev
```

## Key Improvements Over Complex Alternatives

- **Simplified Architecture**: Clear separation of concerns without over-engineering
- **Intuitive UI**: Focus on user experience over feature completeness
- **Reliable Integrations**: Battle-tested patterns from production systems
- **Smart AI Features**: Practical automation without complexity

## Development

- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm run test` - Run test suite
- `npm run lint` - Check code quality
- `npm run type-check` - TypeScript validation

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Express.js, TypeScript, PostgreSQL
- **Database**: PostgreSQL with Sequelize ORM
- **Cache**: Redis
- **AI**: OpenAI GPT-4 for analysis
- **Auth**: Session-based with Redis storage