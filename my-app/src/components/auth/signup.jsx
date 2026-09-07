import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./authContext";
import API_URL from "../../config/api";
import { 
    EyeIcon, EyeOffIcon
} from "lucide-react";
import TimezoneSelect from 'react-timezone-select';
import AuthLayout from "./authLayout";

// react-timezone-select renders its own react-select instance, which ships
// light-mode defaults — override just enough to match the app's dark theme
// tokens instead of hardcoding a second palette here.
const timezoneSelectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: "hsl(var(--background))",
    borderColor: state.isFocused ? "hsl(var(--ring))" : "hsl(var(--input))",
    boxShadow: state.isFocused ? "0 0 0 1px hsl(var(--ring))" : "none",
    borderRadius: "0.5rem",
    minHeight: "42px",
    "&:hover": { borderColor: "hsl(var(--ring))" },
  }),
  singleValue: (base) => ({ ...base, color: "hsl(var(--foreground))" }),
  input: (base) => ({ ...base, color: "hsl(var(--foreground))" }),
  placeholder: (base) => ({ ...base, color: "hsl(var(--muted-foreground))" }),
  menu: (base) => ({
    ...base,
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "hsl(var(--accent))" : "transparent",
    color: state.isFocused ? "hsl(var(--accent-foreground))" : "hsl(var(--popover-foreground))",
  }),
  indicatorSeparator: (base) => ({ ...base, backgroundColor: "hsl(var(--border))" }),
  dropdownIndicator: (base) => ({ ...base, color: "hsl(var(--muted-foreground))" }),
};

export default function Signup() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    timezone: "",
    referralSource: "",
  });

  // Tracks which option is selected in the dropdown (separate from
  // formData.referralSource, since when "Other" is picked the actual
  // referralSource value becomes whatever the user types)
  const [referralOption, setReferralOption] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  // Auto-detect timezone on component mount
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setFormData(prev => ({ ...prev, timezone: detected }));
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setServerError("");
  }

  function handleReferralOptionChange(e) {
    const { value } = e.target;
    setReferralOption(value);
    setServerError("");

    if (value === "other") {
      // Clear it so the user has to type their own answer,
      // and so we don't accidentally submit "other" as the value
      setFormData(prev => ({ ...prev, referralSource: "" }));
    } else {
      setFormData(prev => ({ ...prev, referralSource: value }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setIsLoading(true);
    setServerError("");

    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
          

      const data = await res.json();

      if (res.ok) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate(`/workspace`); // Redirect after successful signup
      } else {
        // Handle both array of errors and single message
        if (data.errors && Array.isArray(data.errors)) {
          // Multiple validation errors - show them as a list
          setServerError(data.errors.join(" "));
        } else {
          // Single error message
          setServerError(data.message || "Something went wrong. Please try again.");
        }
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
            className="text-3xl sm:text-4xl text-foreground"
            style={{ fontFamily: "var(--font-card-display)" }}
          >
            Welcome
          </h1>
        </div>

        {/* Server Error */}
        {serverError && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive px-3 py-2 sm:px-4 sm:py-3 rounded-lg mb-4">
            {serverError.includes('.') && serverError.split('.').length > 2 ? (
              // Multiple errors - show as bullet points
              <ul className="text-xs sm:text-sm list-disc list-inside space-y-1">
                {serverError.split('.').filter(err => err.trim()).map((error, i) => (
                  <li key={i}>{error.trim()}</li>
                ))}
              </ul>
            ) : (
              // Single error - show as text
              <p className="text-xs sm:text-sm">{serverError}</p>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Username */}
          <div>
            <label 
              htmlFor="username" 
              className="block text-xs sm:text-sm font-medium text-foreground mb-1 sm:mb-2"
            >
              What should we call you?
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all"
              placeholder="Your pen name"
              required
              disabled={isLoading}
            />
          </div>

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
              className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all"
              placeholder="you@example.com"
              required
              disabled={isLoading}
            />
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
                required
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

          {/* Timezone */}
          <div>
            <label 
              htmlFor="timezone" 
              className="block text-xs sm:text-sm font-medium text-foreground mb-1 sm:mb-2"
            >
              Your timezone <span className="text-destructive">*</span>
            </label>
            <TimezoneSelect
              value={formData.timezone}
              onChange={(tz) => setFormData(prev => ({ ...prev, timezone: tz.value }))}
              className="text-sm sm:text-base"
              styles={timezoneSelectStyles}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              We auto-detected your timezone. Change it if incorrect.
            </p>
          </div>

          {/* How did you find us */}
          <div>
            <label
              htmlFor="referralSource"
              className="block text-xs sm:text-sm font-medium text-foreground mb-1 sm:mb-2"
            >
              How did you find Quillweave?
            </label>
            <select
              id="referralSource"
              name="referralSource"
              value={referralOption}
              onChange={handleReferralOptionChange}
              disabled={isLoading}
              required
              className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all"
            >
              <option value="">Select an option…</option>
              <option value="twitter">Twitter / X</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="discord">Discord</option>
              <option value="reddit">Reddit</option>
              <option value="friend">A friend told me</option>
              <option value="search">Search engine (Google etc.)</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* If "Other" selected, let the user type their own answer */}
          {referralOption === "other" && (
            <div>
              <label
                htmlFor="referralSource"
                className="block text-xs sm:text-sm font-medium text-foreground mb-1 sm:mb-2"
              >
                Please tell us where you heard about Quillweave
              </label>
              <input
                type="text"
                id="referralSource"
                name="referralSource"
                value={formData.referralSource}
                onChange={handleChange}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all"
                placeholder="e.g. a podcast, a blog post, a friend's recommendation..."
                required
                disabled={isLoading}
              />
            </div>
          )}

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
                Creating your account...
              </span>
            ) : (
              "Start Writing"
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-4 sm:mt-6 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link 
              to="/login" 
              className="text-foreground font-medium hover:text-[hsl(var(--gold-500))] transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}