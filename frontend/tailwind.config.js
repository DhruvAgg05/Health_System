/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        paper: "#f8fafc",
      },
      boxShadow: {
        panel: "0 20px 45px rgba(15, 23, 42, 0.08)",
      },
      backgroundImage: {
        "hero-mesh":
          "radial-gradient(circle at top left, rgba(14,165,233,0.18), transparent 35%), radial-gradient(circle at top right, rgba(15,118,110,0.16), transparent 30%), linear-gradient(180deg, #f8fafc 0%, #eef6ff 100%)",
      },
    },
  },
  plugins: [],
};
