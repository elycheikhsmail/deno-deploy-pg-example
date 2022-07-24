import { serve } from "https://deno.land/std@0.140.0/http/server.ts";
//import * as postgres from "https://deno.land/x/postgres@v0.14.0/mod.ts";
import "https://deno.land/std@0.149.0/dotenv/load.ts";
import * as postgres from "https://deno.land/x/postgres@v0.16.1/mod.ts";

// Get the connection string from the environment variable "DATABASE_URL"
const databaseUrl = Deno.env.get("DATABASE_URL")!; 
 
// Create a database pool with three connections that are lazily established
const pool = new postgres.Pool(databaseUrl, 3, true);

// Connect to the database
const connection = await pool.connect();
try {
  // Create the table
  await connection.queryObject`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL
    )
  `;
} finally {
  // Release the connection back into the pool
  connection.release();
}

serve(async (req) => {
  // Parse the URL and check that the requested endpoint is /todos. If it is
  // not, return a 404 response.
  const url = new URL(req.url);
  console.log({url:req.url})
  console.log({url:req.method})
  if (url.pathname !== "/todos") {
    return new Response("Not Found", { status: 404 });
  }

  // Grab a connection from the database pool
  const connection = await pool.connect();

  try {
    switch (req.method) {
      case "GET": { // This is a GET request. Return a list of all todos.
        // Run the query
        const result = await connection.queryObject`
          SELECT * FROM todos
        `;

        // Encode the result as JSON
        const body = JSON.stringify(result.rows, null, 2);

        // Return the result as JSON
        return new Response(body, {
          headers: { "content-type": "application/json" },
        });
      }
      case "POST": { // This is a POST request. Create a new todo.
        // Parse the request body as JSON. If the request body fails to parse,
        // is not a string, or is longer than 256 chars, return a 400 response.
        const data = await req.json().catch((e) => console.log(e));
        console.log({data})
        if (typeof data.title !== "string" || data.title.length > 256) {
          return new Response("Bad Request", { status: 400 });
        }

        // Insert the new todo into the database
        await connection.queryObject`
          INSERT INTO todos (title) VALUES (${data.title})
        `;

        // Return a 201 Created response
        return new Response("", { status: 201 });
      }
      default: // If this is neither a POST, or a GET return a 405 response.
        return new Response("Method Not Allowed", { status: 405 });
    }
  } catch (err) {
    console.error(err);
    // If an error occurs, return a 500 response
    return new Response(`Internal Server Error\n\n${err.message}`, {
      status: 500,
    });
  } finally {
    // Release the connection back into the pool
    connection.release();
  }
},{port:3002});