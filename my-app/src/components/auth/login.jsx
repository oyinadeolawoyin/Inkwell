import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./authContext";
import API_URL from "../../config/api";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import AuthLayout from "./authLayout";

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
    setServerError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    setIsLoading(true);
    setServerError("");
    
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier: formData.email, password: formData.password }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        // Navigate to dashboard
        navigate("/workspace");
      } else {
        setServerError(
          data.message || "That email or password doesn't look right. Please check and try again."
        );
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
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1
            className="text-3xl sm:text-4xl text-foreground mb-2 sm:mb-3"
            style={{ fontFamily: "var(--font-card-display)" }}
          >
            Welcome Back
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Ready to write today?
          </p>
        </div>

        {/* Server Error */}
        {serverError && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive px-3 py-2 sm:px-4 sm:py-3 rounded-lg mb-4">
            <p className="text-xs sm:text-sm">{serverError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Email */}
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
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base rounded-lg border bg-background text-foreground placeholder-muted-foreground transition-all focus:outline-none focus:ring-1 ${
                errors.email 
                  ? 'border-destructive focus:ring-destructive focus:border-destructive' 
                  : 'border-input focus:ring-ring focus:border-ring'
              }`}
              placeholder="you@example.com"
              disabled={isLoading}
              autoComplete="email"
            />
            {errors.email && (
              <p className="mt-1 text-xs sm:text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="relative">
            <label 
                htmlFor="password" 
                className="block text-xs sm:text-sm font-medium text-foreground mb-1 sm:mb-2"
            >
                Password
            </label>
            <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 pr-10 text-sm sm:text-base rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all"
                placeholder="At least 6 characters"
                disabled={isLoading}
            />
            
            {/* Eye toggle button */}
            <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-2 sm:right-3 top-8 sm:top-9 text-muted-foreground hover:text-foreground p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
            >
                {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <Link 
              to="/forgot-password" 
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground hover:opacity-90 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base py-2.5 sm:py-3 transition-opacity"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Signup Link */}
        <div className="mt-4 sm:mt-6 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">
            New to Quillweave?{" "}
            <Link 
              to="/signup" 
              className="text-foreground font-medium hover:text-[hsl(var(--gold-500))] transition-colors"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}