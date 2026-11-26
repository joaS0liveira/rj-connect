import type { Metadata } from "next"
import { Barlow, Barlow_Condensed } from "next/font/google"

import "./globals.css"
import Script from "next/script"
import { IntroSplash } from "@/components/intro-splash"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const body = Barlow({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-body",
})
const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-title",
})

export const metadata: Metadata = {
  title: "RJ.connect",
  description:
    "Da colocação à permanência: onde o emprego é mais estável, onde se perde e quando agir.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-PT"
      suppressHydrationWarning
      className={cn("font-sans antialiased", body.variable, display.variable)}
    >
      <body>
        {/* Shows the intro only on a first visit, before the page is used. */}
        <Script id="rj-intro" strategy="beforeInteractive">
          {`try{if(!localStorage.getItem("rj-intro-seen"))document.documentElement.classList.add("rj-intro")}catch(e){}`}
        </Script>
        <ThemeProvider>
          <IntroSplash />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
