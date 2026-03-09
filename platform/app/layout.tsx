import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Questly — AI-Powered Learning Platform",
    template: "%s | Questly",
  },
  description:
    "Learn faster with AI-generated quizzes. Generate personalized quizzes on any topic, track your progress, and earn certificates.",
  keywords: ["AI quiz", "learning platform", "AI tutor", "study", "certificates"],
  openGraph: {
    title: "Questly — AI-Powered Learning Platform",
    description: "Learn faster with AI-generated quizzes and personalized study plans.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-background antialiased">{children}</body>
    </html>
  );
}
