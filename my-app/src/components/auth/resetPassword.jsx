import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import API_URL from "../../config/api";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import AuthLayout from "./authLayout";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [formData, setFormData] = useState({ newPassword: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setValidationError("");
    setServerError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (formData.newPassword.length < 6) {
      setValidationError("Password must be at least 6 characters.");
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setValidationError("Passwords don't match.");
      return;
    }

    setIsLoading(true);
    setServerError("");

    try {
      const res = await fetch(`${API_URL}/auth/resetPassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: formData.newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => navigate("/login"), 3000);
      } else {
        setServerError(data.message || "Something went wrong. Please try again.");
      }
    } catch (error) {
      setServerError("We couldn't connect to the server. Please check your internet connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  /* ── No token in URL ── */
  if (!token) {
    return (
      <AuthLayout>
        <div className="bg-card border border-border rounded-2xl shadow-xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h2
            className="text-2xl text-foreground"
            style={{ fontFamily: "var(--font-card-display)" }}
          >
            Invalid reset link
          </h2>
          <p className="text-muted-foreground text-sm">
            This reset link is missing or invalid. Please request a new one.
          </p>
          <Link to="/forgot-password" className="inline-block bg-primary text-primary-foreground hover:opacity-90 rounded-lg text-sm px-6 py-2.5 transition-opacity">
            Request a new link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  /* ── Success state ── */
  if (success) {
    return (
      <AuthLayout>
        <div className="bg-card border border-border rounded-2xl shadow-xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2
            className="text-2xl sm:text-3xl text-foreground"
            style={{ fontFamily: "var(--font-card-display)" }}
          >
            Password reset!
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Your password has been updated. Redirecting you to sign in...
          </p>
          <Link to="/login" className="inline-block text-sm text-foreground font-medium hover:text-[hsl(var(--gold-500))] transition-colors">
            Go to sign in →
          </Link>
        </div>
      </AuthLayout>
    );
  }

  /* ── Form state ── */
  return (
    <AuthLayout>
      <div className="bg-card border border-border rounded-2xl shadow-xl p-6 sm:p-8 lg:p-10">

        <div className="text-center mb-6 sm:mb-8">
          <h1
            className="text-3xl sm:text-4xl text-foreground mb-2 sm:mb-3"
            style={{ fontFamily: "var(--font-card-display)" }}
          >
            Reset password
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Choose a new password for your account.
          </p>
        </div>

        {(serverError || validationError) && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive px-3 py-2 sm:px-4 sm:py-3 rounded-lg mb-4">
            <p className="text-xs sm:text-sm">{serverError || validationError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* New password */}
          <div className="relative">
            <label
              htmlFor="newPassword"
              className="block text-xs sm:text-sm font-medium text-foreground mb-1 sm:mb-2"
            >
              New password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 pr-10 text-sm sm:text-base rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all"
              placeholder="At least 6 characters"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className="absolute right-2 sm:right-3 top-8 sm:top-9 text-muted-foreground hover:text-foreground p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>

          {/* Confirm password */}
          <div className="relative">
            <label
              htmlFor="confirmPassword"
              className="block text-xs sm:text-sm font-medium text-foreground mb-1 sm:mb-2"
            >
              Confirm new password
            </label>
            <input
              type={showConfirm ? "text" : "password"}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 pr-10 text-sm sm:text-base rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all"
              placeholder="Repeat your new password"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(prev => !prev)}
              className="absolute right-2 sm:right-3 top-8 sm:top-9 text-muted-foreground hover:text-foreground p-1"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
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
                Resetting...
              </span>
            ) : (
              "Reset Password"
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
      </div>
    </AuthLayout>
  );
}