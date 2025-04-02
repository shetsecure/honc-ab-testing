/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { nanoid } from "nanoid";
import { drizzle } from "drizzle-orm/d1";
import { eq, sql } from "drizzle-orm";
import { tests, views, Bindings } from "./db/schema";
import { serveStatic } from "hono/cloudflare-workers";

// Create Hono app with bindings
const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS
app.use("/*", cors());

// Serve static files
app.use("/", serveStatic({ root: "./", manifest: (c: { env: Bindings }) => c.env.ASSETS }));

// Redirect root to index.html
app.get("/", (c) => c.redirect("/index.html"));

// Create a new A/B test
app.post("/tests", async (c) => {
	const { name, description, variationA, variationB } = await c.req.json();

	if (!name || !variationA || !variationB) {
		return c.json(
			{ error: "Name, variation A, and variation B are required" },
			400
		);
	}

	const db = drizzle(c.env.DB);
	const testId = nanoid();

	await db.insert(tests).values({
		id: testId,
		name,
		description,
		variationA,
		variationB,
	});

	return c.json({
		id: testId,
		name,
		description,
		variationA,
		variationB,
		embedUrl: `${new URL(c.req.url).origin}/embed/${testId}`,
		analyticsUrl: `${new URL(c.req.url).origin}/analytics/${testId}`,
		embedCode: `<script>
  (function() {
    const script = document.createElement('script');
    script.src = '${new URL(c.req.url).origin}/embed/${testId}/script.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`,
	});
});

// List all tests
app.get("/tests", async (c) => {
	const db = drizzle(c.env.DB);
	const allTests = await db.select().from(tests);
	const origin = new URL(c.req.url).origin;

	return c.json(
		allTests.map((test) => ({
			...test,
			embedUrl: `${origin}/embed/${test.id}`,
			analyticsUrl: `${origin}/analytics/${test.id}`,
			embedCode: `<script>
  (function() {
    const script = document.createElement('script');
    script.src = '${origin}/embed/${test.id}/script.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`,
		}))
	);
});

// Get a specific test
app.get("/tests/:id", async (c) => {
	const db = drizzle(c.env.DB);
	const test = await db
		.select()
		.from(tests)
		.where(eq(tests.id, c.req.param("id")))
		.get();

	if (!test) {
		return c.json({ error: "Test not found" }, 404);
	}

	const origin = new URL(c.req.url).origin;
	return c.json({
		...test,
		embedUrl: `${origin}/embed/${test.id}`,
		analyticsUrl: `${origin}/analytics/${test.id}`,
		embedCode: `<script>
  (function() {
    const script = document.createElement('script');
    script.src = '${origin}/embed/${test.id}/script.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`,
	});
});

// Embed page endpoint
app.get("/embed/:id", async (c) => {
	const db = drizzle(c.env.DB);
	const test = await db
		.select()
		.from(tests)
		.where(eq(tests.id, c.req.param("id")))
		.get();

	if (!test) {
		return c.html(`
			<!DOCTYPE html>
			<html>
				<head>
					<title>Test Not Found</title>
					<script src="https://cdn.tailwindcss.com"></script>
				</head>
				<body class="bg-gray-100">
					<div class="container mx-auto px-4 py-8">
						<div class="bg-white p-6 rounded-lg shadow">
							<h1 class="text-2xl font-bold text-red-600">Test Not Found</h1>
							<p class="mt-4">The requested test could not be found.</p>
							<a href="/" class="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
								Back to Home
							</a>
						</div>
					</div>
				</body>
			</html>
		`);
	}

	// Randomly choose variation A or B
	const variation = Math.random() < 0.5 ? "A" : "B";
	const content = variation === "A" ? test.variationA : test.variationB;

	// Track the view
	await db.insert(views).values({
		id: nanoid(),
		testId: test.id,
		variation,
	});

	return c.html(`
		<!DOCTYPE html>
		<html>
			<head>
				<title>${test.name} - A/B Test</title>
				<script src="https://cdn.tailwindcss.com"></script>
			</head>
			<body class="bg-gray-100">
				<div class="container mx-auto px-4 py-8">
					<div class="bg-white p-6 rounded-lg shadow">
						<div class="flex justify-between items-center mb-6">
							<h1 class="text-2xl font-bold">${test.name}</h1>
							<a href="/analytics/${test.id}" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
								View Analytics
							</a>
						</div>
						${test.description ? `<p class="text-gray-600 mb-6">${test.description}</p>` : ''}
						<div class="mt-4">
							<h2 class="text-lg font-semibold mb-2">Current Variation (${variation})</h2>
							<div class="p-4 border rounded">
								${content}
							</div>
						</div>
					</div>
				</div>
			</body>
		</html>
	`);
});

// Embed script endpoint
app.get("/embed/:id/script.js", async (c) => {
	const db = drizzle(c.env.DB);
	const test = await db
		.select()
		.from(tests)
		.where(eq(tests.id, c.req.param("id")))
		.get();

	if (!test) {
		return c.json({ error: "Test not found" }, 404);
	}

	// Randomly choose variation A or B
	const variation = Math.random() < 0.5 ? "A" : "B";
	const content = variation === "A" ? test.variationA : test.variationB;

	// Track the view
	await db.insert(views).values({
		id: nanoid(),
		testId: test.id,
		variation,
	});

	// Return JavaScript that injects the content
	return c.text(`
(function() {
  const container = document.createElement('div');
  container.innerHTML = \`${content}\`;
  container.style.maxWidth = '800px';
  container.style.margin = '0 auto';
  container.style.padding = '2rem';
  container.style.lineHeight = '1.5';
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  
  const target = document.currentScript.parentElement;
  target.appendChild(container);
})();
`);
});

// Analytics endpoint
app.get("/analytics/:id", async (c) => {
	const db = drizzle(c.env.DB);
	const test = await db
		.select()
		.from(tests)
		.where(eq(tests.id, c.req.param("id")))
		.get();

	if (!test) {
		return c.html(`
			<!DOCTYPE html>
			<html>
				<head>
					<title>Test Not Found</title>
					<script src="https://cdn.tailwindcss.com"></script>
				</head>
				<body class="bg-gray-100">
					<div class="container mx-auto px-4 py-8">
						<div class="bg-white p-6 rounded-lg shadow">
							<h1 class="text-2xl font-bold text-red-600">Test Not Found</h1>
							<p class="mt-4">The requested test could not be found.</p>
							<a href="/" class="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
								Back to Home
							</a>
						</div>
					</div>
				</body>
			</html>
		`);
	}

	// Get view counts for each variation
	const viewCounts = await db
		.select({
			variation: views.variation,
			count: sql<number>`count(*)`,
		})
		.from(views)
		.where(eq(views.testId, test.id))
		.groupBy(views.variation);

	const totalViews = viewCounts.reduce((sum, v) => sum + v.count, 0);
	const variationA = viewCounts.find((v) => v.variation === "A");
	const variationB = viewCounts.find((v) => v.variation === "B");

	const origin = new URL(c.req.url).origin;
	const embedCode = `<script>
  (function() {
    const script = document.createElement('script');
    script.src = '${origin}/embed/${test.id}/script.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;

	return c.html(`
		<!DOCTYPE html>
		<html>
			<head>
				<title>Analytics - ${test.name}</title>
				<script src="https://cdn.tailwindcss.com"></script>
			</head>
			<body class="bg-gray-100">
				<div class="container mx-auto px-4 py-8">
					<div class="bg-white p-6 rounded-lg shadow">
						<div class="flex justify-between items-center mb-6">
							<h1 class="text-2xl font-bold">${test.name}</h1>
							<a href="/" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
								Back to Home
							</a>
						</div>
						${test.description ? `<p class="text-gray-600 mb-6">${test.description}</p>` : ''}
						
						<div class="grid grid-cols-2 gap-6">
							<div class="p-4 border rounded">
								<h2 class="text-lg font-semibold mb-2">Variation A</h2>
								<p class="mb-4">${test.variationA}</p>
								<div class="text-sm">
									<p>Views: ${variationA?.count || 0}</p>
									<p>Percentage: ${totalViews ? ((variationA?.count || 0) / totalViews * 100).toFixed(1) : 0}%</p>
								</div>
							</div>
							<div class="p-4 border rounded">
								<h2 class="text-lg font-semibold mb-2">Variation B</h2>
								<p class="mb-4">${test.variationB}</p>
								<div class="text-sm">
									<p>Views: ${variationB?.count || 0}</p>
									<p>Percentage: ${totalViews ? ((variationB?.count || 0) / totalViews * 100).toFixed(1) : 0}%</p>
								</div>
							</div>
						</div>
						
						<div class="mt-6">
							<h2 class="text-lg font-semibold mb-2">Total Views: ${totalViews}</h2>
							<div class="h-4 bg-gray-200 rounded overflow-hidden">
								<div class="h-full bg-blue-500" style="width: ${totalViews ? ((variationA?.count || 0) / totalViews * 100) : 0}%"></div>
							</div>
						</div>

						<div class="mt-8">
							<h2 class="text-lg font-semibold mb-2">Embed Code</h2>
							<pre class="bg-gray-100 p-4 rounded overflow-x-auto">
								<code>${embedCode}</code>
							</pre>
							<p class="text-sm text-gray-600 mt-2">Copy this code and paste it into your website where you want the test to appear.</p>
						</div>
					</div>
				</div>
			</body>
		</html>
	`);
});

export default app;