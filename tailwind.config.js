import { heroui } from "@heroui/react";

const PRODUCT = "tomo"; // Default to mydoge for demo
console.log("tailwind.config", PRODUCT);

const primaryColors = {
  mydoge: "#FCD436",
  tomo: "#030303",
};

const btnPrimaryTxts = {
  mydoge: "#12122A",
  tomo: "#fff",
};

const checkboxInners = {
  mydoge: "#000",
  tomo: "#fff",
};

const bg1s = {
  mydoge: "#FFF7D8",
  tomo: "#F7F7F9",
};
const bg2s = {
  mydoge: "#FCFCFD",
  tomo: "transparent",
};

const walletItemBorders = {
  mydoge: "transparent",
  tomo: "#FCFCFD",
};

const socialWalletTipBorderColors = {
  mydoge: "#FCD436",
  tomo: "#F7F7F9",
};

const buttonFadedBgs = {
  mydoge: "#FCD43620",
  tomo: "transparent",
};

const prefixes = {
  mydoge: "mydoge",
  tomo: "tomo",
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "../../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        switzer: ["Switzer", "sans-serif"],
      },
      extend: {
        colors: {
          yellow1: "rgba(252, 212, 54, 0.30)",
        },
      },
      keyframes: {
        breath: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.5 },
        },
        rotate3d: {
          "0%": { transform: "rotate3d(0, 0, 1, 0deg)" },
          "100%": { transform: "rotate3d(0, 0, 1, 360deg)" },
        },
      },
      animation: {
        breath: "breath 2s infinite",
        rotate3d: "rotate3d 2s linear infinite",
      },
      borderColor: {
        "wallet-item": walletItemBorders[PRODUCT],
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      prefix: prefixes[PRODUCT],
      defaultTheme: "light",
      layout: {
        borderWidth: {
          medium: "1px",
        },
      },
      themes: {
        dark: {},
        light: {
          colors: {
            background: "#FFFFFF",
            success: "#17CF82",
            foreground: "#12122A",
            "btn-primary-txt": btnPrimaryTxts[PRODUCT],
            "checkbox-inner": checkboxInners[PRODUCT],
            "btn-faded-bg": buttonFadedBgs[PRODUCT],
            divider: "#12121214",
            primary: {
              DEFAULT: primaryColors[PRODUCT],
            },
            danger: {
              DEFAULT: "#EB4B6D",
            },

            "border-social-tips": socialWalletTipBorderColors[PRODUCT],

            // Custom Colors
            t1: "#12122A",
            t2: "#616184",
            t3: "#8989AB",
            t4: "#C1C0D8",
            t5: "#EEC41F",

            bg1: bg1s[PRODUCT],
            bg2: bg2s[PRODUCT],
            bg3: "#F5F5FA",
            bg4: "#F5F5F9",

            red2: "#EB4B6D",

            blue: "#3478F6",
          },
          // extend: {
          //   borderColor: {
          //     "social-tips": primaryColors[PRODUCT],
          //     "wallet-item": walletItemBorders[PRODUCT],
          //   },
          // },
        },
      },
    }),
  ],
};
