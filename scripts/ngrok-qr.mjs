import qrcode from "qrcode-terminal";

const NGROK_API = "http://127.0.0.1:4040/api/tunnels";

const pickPublicUrl = (tunnels) => {
  const httpsTunnel = tunnels.find((tunnel) => tunnel.public_url?.startsWith("https://"));
  if (httpsTunnel) return httpsTunnel.public_url;

  const httpTunnel = tunnels.find((tunnel) => tunnel.public_url?.startsWith("http://"));
  return httpTunnel?.public_url ?? null;
};

const main = async () => {
  try {
    const response = await fetch(NGROK_API);
    if (!response.ok) {
      throw new Error(`ngrok API returned ${response.status}`);
    }

    const data = await response.json();
    const publicUrl = pickPublicUrl(data.tunnels ?? []);
    if (!publicUrl) {
      throw new Error("No active ngrok tunnel found.");
    }

    console.log(`ngrok URL: ${publicUrl}`);
    console.log("Scan this QR from your phone camera:");
    qrcode.generate(publicUrl, { small: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Could not generate QR: ${message}`);
    console.error("Make sure ngrok is running, e.g. `ngrok http 5173`.");
    process.exit(1);
  }
};

await main();
