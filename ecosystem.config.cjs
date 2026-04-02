module.exports = {
  apps: [
    {
      name: "webapp",
      script: "npx",
      args: "next dev --port 3000",
      cwd: "/home/user/webapp",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
        DATABASE_URL: "postgresql://neondb_owner:npg_Rijek4FWvcT6@ep-super-tree-amnvg5fu-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
        NEXTAUTH_SECRET: "your-super-secret-key-change-this-in-production",
        NEXTAUTH_URL: "https://3000-i7ros26y31zjgmiuyt4rh-0e616f0a.sandbox.novita.ai",
        AUTH_TRUST_HOST: "true",
      },
      watch: false,
      instances: 1,
      exec_mode: "fork",
    },
  ],
};
