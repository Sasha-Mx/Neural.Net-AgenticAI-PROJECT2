import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/auth";
import { authToasts } from "~/utils/toasts";
import { Sparkles, ArrowRight, AlertCircle } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/login/")({
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginPage() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation(
    trpc.login.mutationOptions({
      onSuccess: (data) => {
        setAuthError(null);
        setAuth(data.token, data.user);
        authToasts.loginSuccess(data.user.name);
        void navigate({ to: "/dashboard" });
      },
      onError: (error) => {
        // Extract safe error message (never expose server internals)
        const safeMessage = error.message?.includes("email or password")
          ? error.message
          : "Authentication failed. Please check your credentials.";
        
        setAuthError(safeMessage);
        authToasts.loginError(safeMessage);
      },
    })
  );

  const onSubmit = (data: LoginForm) => {
    setAuthError(null); // Clear previous errors
    loginMutation.mutate(data);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-12 flex-col justify-between text-white">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <Sparkles className="h-8 w-8" />
            <span className="text-2xl font-bold">Neural.Net</span>
          </div>
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            AI-Powered
            <br />
            Creative Studio
          </h1>
          <p className="text-xl text-indigo-100 max-w-md">
            Transform your ideas into stunning campaigns with collaborative AI agents working in harmony.
          </p>
        </div>
        <div className="space-y-4 text-indigo-100">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              ✓
            </div>
            <p>Multi-agent AI collaboration for complete campaigns</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              ✓
            </div>
            <p>Real-time workflow transparency and validation</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              ✓
            </div>
            <p>Professional-grade assets in minutes</p>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className="h-6 w-6 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">Neural.Net</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
            <p className="text-gray-600 mb-8">Sign in to continue to your studio</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Error Alert Banner */}
              {authError && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3 animate-fade-in">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800">Authentication Failed</p>
                    <p className="text-sm text-red-700 mt-1">{authError}</p>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  {...register("email")}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="you@example.com"
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  {...register("password")}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
              >
                {loginMutation.isPending ? (
                  "Signing in..."
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Don't have an account?{" "}
                <Link to="/signup" className="text-indigo-600 font-semibold hover:text-indigo-700">
                  Sign up
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
          
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              🔒 Your credentials are encrypted and secure
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
