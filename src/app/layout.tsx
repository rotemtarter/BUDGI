import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Rubik } from "next/font/google";
import "./globals.css";

// Latin letters and digits use Plus Jakarta Sans; Hebrew falls through to Rubik.
// No metric fallback for Jakarta: it would sit before Rubik in the stack and
// render Hebrew glyphs with a system font instead.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  adjustFontFallback: false,
  fallback: [],
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "Budgi",
  description: "ניהול חכם של תקציב השיווק",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${jakarta.variable} ${rubik.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
