import { useState } from "react";
import { Link } from "react-router-dom";
import API_URL from "../../config/api";
import AuthLayout from "./authLayout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setServerError("");

    try {
      const res = await fetch(`${API_URL}/auth/forgetPassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
      } else {
        setServerError(data.message || "Something went wrong. Please try again.");
      }
    } catch (error) {
      setServerError("We couldn't connect to the server. Please check your internet connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="bg-card border border-border rounded-2xl shadow-xl p-6 sm:p-8 lg:p-10">

        {submitted ? (
          /* ── Success state ── */
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2
              className="text-2xl sm:text-3xl text-foreground"
              style={{ fontFamily: "var(--font-card-display)" }}
            >
              Check your email
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              If an account exists for <span className="font-medium text-foreground">{email}</span>,
              we've sent a password reset link. It expires in 15 minutes.
            </p>
            <p className="text-xs text-muted-foreground">
              Didn't get it? Check your spam folder, or{" "}
              <button
                onClick={() => setSubmitted(false)}
                className="text-foreground underline hover:text-[hsl(var(--gold-500))] transition-colors"
              >
                try again
              </button>
              .
            </p>
            <Link
              to="/login"
              className="inline-block mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to sign in
            </Link>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <div className="text-center mb-6 sm:mb-8">
              <h1
                className="text-3xl sm:text-4xl text-foreground mb-2 sm:mb-3"
                style={{ fontFamily: "var(--font-card-display)" }}
              >
                Forgot password?
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            {serverError && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive px-3 py-2 sm:px-4 sm:py-3 rounded-lg mb-4">
                <p className="text-xs sm:text-sm">{serverError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs sm:text-sm font-medium text-foreground mb-1 sm:mb-2"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setServerError(""); }}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all"
                  placeholder="you@example.com"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground hover:opacity-90 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base py-2.5 sm:py-3 transition-opacity"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>

            <div className="mt-4 sm:mt-6 text-center">
              <Link
                to="/login"
                className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}