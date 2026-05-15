"use client";

import { useState } from 'react';
import { LogIn, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or Email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormValues) => {
    const res = await signIn('credentials', {
      redirect: false,
      usernameOrEmail: data.usernameOrEmail,
      password: data.password,
    });

    if (res?.error) {
      toast.error("Invalid Username/Email or Password");
    } else {
      toast.success("Welcome back!");
      setShowSplash(true);
      setTimeout(() => router.push('/dashboard'), 2000);
    }
  };

  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-neutral-950 flex flex-col items-center justify-center z-50 animate-in fade-in duration-500">
        <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-8"></div>
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 animate-pulse">
          Syncing Watch Data...
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
          <div className="p-3 bg-cyan-500/10 rounded-full text-cyan-400">
            <LogIn size={32} />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-2">Welcome Back</h1>
        <p className="text-neutral-400 text-center mb-8">Log in to continue your journey.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Email or Username</label>
            <input {...register("usernameOrEmail")} type="text" placeholder="e.g. mark@example.com or Mark" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors" />
            {errors.usernameOrEmail && <p className="text-red-400 text-xs mt-1">{errors.usernameOrEmail.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Password</label>
            <div className="relative">
              <input {...register("password")} type={showPassword ? "text" : "password"} placeholder="••••••••" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold py-3 rounded-lg mt-6 transition-all flex justify-center items-center gap-2 disabled:opacity-50">
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-neutral-500 mt-6 text-sm">
          Don't have an account? <Link href="/register" className="text-cyan-400 hover:underline">Sign up</Link>
        </p>
      </div>
    </main>
  );
}