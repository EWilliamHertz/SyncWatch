import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import AuthProvider from "@/components/AuthProvider";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "SyncWatch",
  description: "The ultimate co-watching database.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans bg-neutral-950 text-neutral-50">
        <AuthProvider>
          <Navbar />
          {children}
          {/* Global Toaster Configuration for Dark Mode */}
          <Toaster 
            position="bottom-right" 
            toastOptions={{
              style: {
                background: '#171717',
                color: '#fff',
                border: '1px solid #262626',
              }
            }} 
          />
        </AuthProvider>
      </body>
    </html>
  );
}