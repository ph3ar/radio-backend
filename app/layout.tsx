import React from "react"
import type { Metadata } from 'next'

import './globals.css'

import { Inter, Roboto_Mono } from 'next/font/google'

// Initialize fonts
const inter = Inter({ subsets: ['latin'], weight: ["100","200","300","400","500","600","700","800","900"] })
const robotoMono = Roboto_Mono({ subsets: ['latin'], weight: ["100","200","300","400","500","700"] })

export const metadata: Metadata = {
  title: 'Robo Radio',
  description: 'beats for humans - robot sonification and ambient sounds.',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  )
}
