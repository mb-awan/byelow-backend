// eslint-disable-next-line no-undef
module.exports = {
  apps: [
    {
      name: 'byelow-backend',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
