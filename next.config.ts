import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: [
    "*.run.app",
    "**.run.app",
    "*.google.com",
    "**.google.com",
    "localhost",
    "127.0.0.1",
    "ais-dev-5tkmt5doh7kwr4uc2rqnlo-636150937638.europe-west1.run.app",
    "ais-pre-5tkmt5doh7kwr4uc2rqnlo-636150937638.europe-west1.run.app",
  ],
};

export default nextConfig;
