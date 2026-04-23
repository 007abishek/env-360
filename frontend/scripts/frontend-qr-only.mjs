#!/usr/bin/env node

/**
 * Show ONLY Frontend QR Code (for scanning on mobile)
 */

import qrcode from "qrcode-terminal";

const NGROK_API = "http://127.0.0.1:4040/api/tunnels";

async function showFrontendQR() {
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║                                        ║");
  console.log("║  📱 SCAN THIS QR CODE ON YOUR PHONE   ║");
  console.log("║                                        ║");
  console.log("╚════════════════════════════════════════╝\n");

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

    if (frontendTunnel) {
      const frontendUrl = frontendTunnel.public_url;
      
      console.log("🌐 FRONTEND URL:");
      console.log(`   ${frontendUrl}\n`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      
      qrcode.generate(frontendUrl, { small: false });
      
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("\n👆 SCAN THE QR CODE ABOVE 👆\n");
      console.log("✅ This opens the app UI on your mobile");
      console.log("❌ Do NOT scan any other QR code\n");
      
      // Find backend URL for reference
      const backendTunnel = tunnels.find(t => 
        t.config.addr && t.config.addr.includes("8000")
      );
      
      if (backendTunnel) {
        const backendUrl = backendTunnel.public_url;
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("\n📝 AFTER SCANNING, SET THIS BACKEND URL:\n");
        console.log(`   ${backendUrl}\n`);
        console.log("Steps:");
        console.log("  1. Scan QR code above");
        console.log("  2. Click '🚀 New System (Test)'");
        console.log("  3. Click 'Set Custom Backend URL'");
        console.log("  4. Enter: " + backendUrl);
        console.log("  5. Done! ✅\n");
      }
      
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      
    } else {
      console.log("❌ Frontend ngrok tunnel not found!");
      console.log("\nMake sure you ran:");
      console.log("  1. npm run start:all");
      console.log("  2. Wait 30-60 seconds");
      console.log("  3. Then run this command again\n");
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`\n❌ Error: ${message}\n`);
    console.error("Troubleshooting:");
    console.error("  1. Make sure ngrok is running");
    console.error("  2. Run: npm run start:all");
    console.error("  3. Wait 30-60 seconds");
    console.error("  4. Try this command again\n");
    process.exit(1);
  }
}

showFrontendQR();
