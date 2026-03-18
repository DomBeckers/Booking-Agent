import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer } from "ws";
import { statusEmitter } from "./src/lib/ws/status-emitter";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const port = parseInt(process.env.PORT || "3000");

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || "", true);
    handle(req, res, parsedUrl);
  });

  // WebSocket server on /ws path
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const { pathname } = parse(request.url || "");

    if (pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws) => {
    console.log("[WS] Client connected");

    // Subscribe to status events
    const unsubscribe = statusEmitter.subscribe((event) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(event));
      }
    });

    ws.on("close", () => {
      console.log("[WS] Client disconnected");
      unsubscribe();
    });

    // Send initial connection confirmation
    ws.send(
      JSON.stringify({
        type: "agent_state",
        message: "Connected to booking agent",
        timestamp: new Date().toISOString(),
      })
    );
  });

  server.listen(port, () => {
    console.log(`\n  BC Family Booking Agent`);
    console.log(`  Ready on http://localhost:${port}`);
    console.log(`  WebSocket on ws://localhost:${port}/ws\n`);
  });
});
