// postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    "postcss-preset-env": {
      stage: 1,
      features: {
        "oklab-function": true, 
        "lab-function": true, 
      },
    },
  },
};

export default config;