"use client";

import { useState } from 'react';
import { UserPlus, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Tip 3: Zod Schema for Client-Side Validation
const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [showPassword, setShowPassword] = useState(false); // Tip 2: Show Password State
  const [showSplash, setShowSplash] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = async (data: RegisterFormValues) => {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      toast.success("Account created successfully!"); // Tip 1: Toast instead of alert
      setShowSplash(true);
      setTimeout(() => router.push('/login'), 2000);
    } else {
      const errorData = await res.json();
      toast.error(errorData.error || "Registration failed");
    }
  };

  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-neutral-950 flex flex-col items-center justify-center z-50 animate-in fade-in duration-500">
        <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-8"></div>
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse">
          Creating Database Profile...
        </h2>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col items-center justify-center p-6 selection:bg-emerald-500/30">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-neutral-400 hover:text-emerald-400 transition-colors">
        <ChevronLeft size={20} /> Back to Home
      </Link>

      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400">
            <UserPlus size={32} />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-2">Join SyncWatch</h1>
        <p className="text-neutral-400 text-center mb-8">Start tracking your shared journeys.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Display Name</label>
            <input {...register("username")} type="text" placeholder="e.g. Hugo" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
            {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Email Address</label>
            <input {...register("email")} type="email" placeholder="you@example.com" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Password</label>
            <div className="relative">
              {/* Tip 2: Dynamic Input Type */}
              <input {...register("password")} type={showPassword ? "text" : "password"} placeholder="••••••••" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-3 rounded-lg mt-6 transition-all flex justify-center items-center gap-2 disabled:opacity-50">
            {isSubmitting ? 'Connecting to Database...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-neutral-500 mt-6 text-sm">
          Already have an account? <Link href="/login" className="text-emerald-400 hover:underline">Log in</Link>
        </p>
      </div>
    </main>
  );
}