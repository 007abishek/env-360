#!/usr/bin/env node

/**
 * Show QR Codes for Frontend and Backend Ngrok URLs
 */

import qrcode from "qrcode-terminal";

const NGROK_API = "http://127.0.0.1:4040/api/tunnels";

async function showQRCodes() {
  console.log("\n========================================");
  console.log("📱 Ngrok QR Codes");
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

    // Find frontend tunnel (port 5173)
    const frontendTunnel = tunnels.find(t => 
      t.config.addr && t.config.addr.includes("5173")
    );

    // Find backend tunnel (port 8000)
    const backendTunnel = tunnels.find(t => 
      t.config.addr && t.config.addr.includes("8000")
    );

    // Show Frontend QR Code
    if (frontendTunnel) {
      const frontendUrl = frontendTunnel.public_url;
      console.log("╔════════════════════════════════════════╗");
      console.log("║  📱 SCAN THIS QR CODE ON YOUR PHONE   ║");
      console.log("║     (This opens the app UI)            ║");
      console.log("╚════════════════════════════════════════╝\n");
      console.log("🌐 FRONTEND URL:");
      console.log(`   ${frontendUrl}\n`);
      qrcode.generate(frontendUrl, { small: true });
      console.log("\n👆 SCAN THIS QR CODE ABOVE 👆\n");
    } else {
      console.log("⚠️  Frontend ngrok tunnel not found (port 5173)");
      console.log("   Make sure to run: npx ngrok http 5173\n");
    }

    // Show Backend URL (for manual entry)
    if (backendTunnel) {
      const backendUrl = backendTunnel.public_url;
      console.log("========================================");
      console.log("🔧 BACKEND URL (DO NOT SCAN - Copy This):");
      console.log(`   ${backendUrl}\n`);
      console.log("💡 After scanning the FRONTEND QR above:");
      console.log("   1. Click '🚀 New System (Test)'");
      console.log("   2. Click 'Set Custom Backend URL'");
      console.log("   3. Enter: " + backendUrl);
      console.log("   4. Done! ✅\n");
    } else {
      console.log("⚠️  Backend ngrok tunnel not found (port 8000)");
      console.log("   Make sure to run: npx ngrok http 8000\n");
    }

    console.log("========================================");
    console.log("✅ Ready to test on mobile!");
    console.log("========================================\n");

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Error: ${message}`);
    console.error("\nTroubleshooting:");
    console.error("  1. Make sure ngrok is running");
    console.error("  2. Frontend: npx ngrok http 5173");
    console.error("  3. Backend: npx ngrok http 8000");
    console.error("  4. Check ngrok web interface: http://127.0.0.1:4040\n");
    process.exit(1);
  }
}

showQRCodes();
