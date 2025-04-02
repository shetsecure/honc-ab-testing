# A/B Testing Platform with HONC Stack

Built during the Cloudflare & Fiberplane Hackathon, this project demonstrates the power of the HONC stack (Hono, ORM/Drizzle, Name/D1, Cloudflare Workers) by creating a simple yet effective A/B testing platform.

## Features

- Create A/B tests with two variations
- Generate unique embed codes for each test
- Track views and analytics for each variation
- Support for HTML content in variations (text, images, buttons, etc.)
- Real-time analytics dashboard
- Easy integration with any website

## Tech Stack

- **Hono**: Lightweight TypeScript API framework
- **Drizzle ORM**: Type-safe SQL query builder
- **Cloudflare D1**: Serverless SQLite database
- **Cloudflare Workers**: Edge runtime platform
- **Tailwind CSS**: For styling

## Demo Links

### Main Application
- Homepage: https://square-hall-9112.shetsecure.workers.dev/
- Test Page: https://square-hall-9112.shetsecure.workers.dev/test-page.html

### Example Tests
1. Button Style Test
   - Analytics: https://square-hall-9112.shetsecure.workers.dev/analytics/heWB-5l0QzD9Mkd71tzvw
   - Embed URL: https://square-hall-9112.shetsecure.workers.dev/embed/heWB-5l0QzD9Mkd71tzvw

2. Goose Image Test
   - Analytics: https://square-hall-9112.shetsecure.workers.dev/analytics/1Z4e_vuzx3H1buapKft5i
   - Embed URL: https://square-hall-9112.shetsecure.workers.dev/embed/1Z4e_vuzx3H1buapKft5i

## API Endpoints

- `POST /tests`: Create a new A/B test
- `GET /tests`: List all tests
- `GET /tests/:id`: Get a specific test
- `GET /embed/:id`: Preview a test
- `GET /embed/:id/script.js`: Get the embed script
- `GET /analytics/:id`: View test analytics

## How to Use

1. Create a new test using the homepage or API
2. Copy the embed code provided
3. Paste the embed code into your website
4. View analytics to track performance

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Deploy to Cloudflare Workers
pnpm deploy
```

## Project Structure

```
├── public/              # Static assets
│   ├── imgs/           # Images
│   ├── index.html      # Main page
│   └── test-page.html  # Example test page
├── src/
│   ├── db/             # Database schema and types
│   └── index.ts        # Main application code
└── wrangler.jsonc      # Cloudflare Workers configuration
```

## Built for Cloudflare & Fiberplane Hackathon

This project was built during the hackathon event where we explored the HONC stack and Cloudflare Workers. The project demonstrates:

- Modern web development practices
- Serverless architecture
- Edge computing capabilities
- Type-safe development
- Real-world A/B testing implementation

## License

MIT 