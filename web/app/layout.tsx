// import type { Metadata } from "next";
// import { Inter_Tight, JetBrains_Mono, Manrope } from "next/font/google";
// import { AppStateProvider } from "@/components/AppState";
// import { Banner } from "@/components/Banner";
// import { CompareBar } from "@/components/CompareBar";
// import { Footer } from "@/components/Footer";
// import { Header } from "@/components/Header";
// import "./globals.css";

// const manrope = Manrope({
//   subsets: ["latin"],
//   variable: "--font-sans",
//   display: "swap",
// });

// const interTight = Inter_Tight({
//   subsets: ["latin"],
//   weight: ["600", "700"],
//   variable: "--font-display",
//   display: "swap",
// });

// const jetbrainsMono = JetBrains_Mono({
//   subsets: ["latin"],
//   weight: ["400", "500", "600"],
//   variable: "--font-mono",
//   display: "swap",
// });

// export const metadata: Metadata = {
//   title: {
//     default: "ShoeScope · Compare Shoe Prices Across Leading US Stores",
//     template: "%s · ShoeScope",
//   },
//   description:
//     "Compare current shoe prices and offers without opening a dozen tabs. We match the same shoe across leading US stores.",
// };

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <html
//       lang="en"
//       className={`${manrope.variable} ${interTight.variable} ${jetbrainsMono.variable} h-full`}
//     >
//       <body className="flex min-h-full flex-col bg-bg font-sans text-text antialiased selection:bg-accent selection:text-white">
//         <AppStateProvider>
//           {/* Accessible Skip Link */}
//           <a
//             href="#main-content"
//             className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:border focus:border-border focus:shadow-md focus:text-ink focus:font-medium"
//           >
//             Skip to content
//           </a>

//           <Banner />
//           <Header />

//           <main id="main-content" className="flex-1 flex flex-col">
//             {children}
//           </main>

//           <CompareBar />
//           <Footer />
//         </AppStateProvider>
//       </body>
//     </html>
//   );
// }

import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono, Manrope } from "next/font/google";
import { AppStateProvider } from "@/components/AppState";
import { Banner } from "@/components/Banner";
import { CompareBar } from "@/components/CompareBar";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ShoeScope · Compare Shoe Prices Across Leading US Stores",
    template: "%s · ShoeScope",
  },
  description:
    "Compare current shoe prices and offers without opening a dozen tabs. We match the same shoe across leading US stores.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${interTight.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-bg font-sans text-text antialiased selection:bg-accent selection:text-white">
        <AppStateProvider>
          {/* Accessible Skip Link */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:border focus:border-border focus:shadow-md focus:text-ink focus:font-medium"
          >
            Skip to content
          </a>

          <Banner />
          <Header />

          <main id="main-content" className="flex-1 flex flex-col">
            {children}
          </main>

          <CompareBar />
          <Footer />
        </AppStateProvider>
      </body>
    </html>
  );
}