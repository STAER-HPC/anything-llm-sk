module.exports = {
  apps: [
    {
      name: "anythingllm-server",
      script: "node",
      args: "index.js",
      cwd: "./server",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "anythingllm-collector",
      script: "node",
      args: "index.js",
      cwd: "./collector",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};