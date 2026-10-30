import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import os from "os";

function getLocalIP() {
    const interfaces = os.networkInterfaces();

    for (const addresses of Object.values(interfaces)) {
        for (const address of addresses || []) {
            if (address.family === "IPv4" && !address.internal) {
                return address.address;
            }
        }
    }

    return "127.0.0.1";
}

export default defineConfig({
    plugins: [react()],

    server: {
        host: "0.0.0.0",
        port: 5173,
        strictPort: true,
        proxy: {
            "/rpc": {
                target: "http://127.0.0.1:8545",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/rpc/, "")
            }
        }
    },

    define: {
        __KALI_IP__: JSON.stringify(getLocalIP())
    }
});