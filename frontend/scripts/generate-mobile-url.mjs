#!/usr/bin/env node

/**
 * Show Frontend QR Code
 * Backend is proxied through Vite - only ONE ngrok tunnel needed!
 */

import qrcode from "qrcode-terminal";

const NGROK_API = "http://127.0.0.1:4040/api/tunnels";

async function showQR() {
  console.log("\n========================================");
  console.log("  Mobile QR Code");
  console.log("========================================\n");

  try {
    const response = await fetch(NGROK_API);

    if (!response.ok) {
      throw new Error(`Ngrok API returned ${response.status}`);
    }

    const data = await response.json();
    const tunnels = data.tunnels || [];

    if (tunnels.length === 0) {
      throw new Error("No active ngrok tunnels found.");
    }

    // Get any active tunnel (should only be one - frontend on 5173)
    const tunnel = tunnels.find(t =>
      t.config.addr && t.config.addr.includes("5173")
    ) || tunnels[0];

    const url = tunnel.public_url;

    console.log("Frontend URL:");
    console.log(`  ${url}\n`);
    console.log("Scan this QR code with your phone:\n");

    qrcode.generate(url, { small: true });

    console.log("\n========================================");
    console.log("  Backend is auto-proxied - no extra setup!");
    console.log("  Just scan and start capturing!");
    console.log("========================================\n");

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`\nError: ${message}`);
    console.error("\nMake sure ngrok is running:");
    console.error("  npx ngrok http 5173\n");
    process.exit(1);
  }
}

showQR();
