import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/auth";
import { authToasts } from "~/utils/toasts";
import { Sparkles, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/signup/")({
  component: SignupPage,
});

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignupForm = z.infer<typeof signupSchema>;

function SignupPage() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const password = watch("password", "");

  const signupMutation = useMutation(
    trpc.register.mutationOptions({
      onSuccess: (data) => {
        setAuthError(null);
        setAuth(data.token, data.user);
        authToasts.signupSuccess();
        void navigate({ to: "/dashboard" });
      },
      onError: (error) => {
        // Extract safe error message
        let safeMessage = "Failed to create account. Please try again.";
        
        if (error.message?.includes("already exists")) {
          safeMessage = "An account with this email already exists. Please sign in instead.";
        } else if (error.message?.includes("email") || error.message?.includes("password")) {
          safeMessage = error.message;
        }
        
        setAuthError(safeMessage);
        authToasts.signupError(safeMessage);
      },
    })
  );

  const onSubmit = (data: SignupForm) => {
    setAuthError(null); // Clear previous errors
    signupMutation.mutate(data);
  };

  // Password strength indicator
  const getPasswordStrength = (pwd: string): { strength: number; label: string; color: string } => {
    if (!pwd) return { strength: 0, label: "", color: "" };
    
    let strength = 0;
    if (pwd.length >= 6) strength++;
    if (pwd.length >= 10) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;
    
    if (strength <= 1) return { strength, label: "Weak", color: "bg-red-500" };
    if (strength <= 3) return { strength, label: "Fair", color: "bg-yellow-500" };
    if (strength <= 4) return { strength, label: "Good", color: "bg-blue-500" };
    return { strength, label: "Strong", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength(password);

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
            Start Creating
            <br />
            Amazing Campaigns
          </h1>
          <p className="text-xl text-indigo-100 max-w-md">
            Join thousands of creators using AI to build stunning, professional campaigns in minutes.
          </p>
        </div>
        <div className="space-y-4 text-indigo-100">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              ✓
            </div>
            <p>Free to start, upgrade as you grow</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              ✓
            </div>
            <p>No credit card required for trial</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              ✓
            </div>
            <p>Cancel anytime, keep your work</p>
          </div>
        </div>
      </div>

      {/* Right side - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className="h-6 w-6 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">Neural.Net</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h2>
            <p className="text-gray-600 mb-8">Start your creative journey today</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Error Alert Banner */}
              {authError && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3 animate-fade-in">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800">Sign Up Failed</p>
                    <p className="text-sm text-red-700 mt-1">{authError}</p>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  {...register("name")}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="John Doe"
                />
                {errors.name && (
                  <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

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
                
                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">Password strength</span>
                      <span className={`text-xs font-semibold ${
                        passwordStrength.strength <= 1 ? "text-red-600" :
                        passwordStrength.strength <= 3 ? "text-yellow-600" :
                        passwordStrength.strength <= 4 ? "text-blue-600" :
                        "text-green-600"
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Use 10+ characters with a mix of letters, numbers & symbols
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={signupMutation.isPending}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
              >
                {signupMutation.isPending ? (
                  "Creating account..."
                ) : (
                  <>
                    Create account
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Already have an account?{" "}
                <Link to="/login" className="text-indigo-600 font-semibold hover:text-indigo-700">
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
          
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              🔒 Your data is encrypted and secure
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
