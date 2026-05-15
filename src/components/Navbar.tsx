"use client";

import Link from 'next/link';
import { LogIn, UserPlus, LogOut, LayoutDashboard } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="w-full border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50 flex justify-center">
      <div className="w-full max-w-5xl px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
          SyncWatch
        </Link>
        <div className="flex space-x-4">
          {session?.user ? (
            <>
              <Link href="/dashboard" className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors font-medium px-4 py-2 rounded-md hover:bg-neutral-800">
                <LayoutDashboard size={18} /> Dashboard
              </Link>
              <button onClick={() => signOut({ callbackUrl: '/' })} className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-6 py-2 rounded-full font-bold transition-colors">
                <LogOut size={18} /> Log Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="flex items-center gap-2 text-neutral-300 hover:text-white transition-colors font-medium px-4 py-2 rounded-md hover:bg-neutral-800">
                <LogIn size={18} /> Log In
              </Link>
              <Link href="/register" className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-6 py-2 rounded-full font-bold transition-colors">
                <UserPlus size={18} /> Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}