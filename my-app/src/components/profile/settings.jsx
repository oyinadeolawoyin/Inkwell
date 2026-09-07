// src/components/profile/settings.jsx
import { useState, useRef } from "react";
import {
  User, Camera, Link2, Compass, MessageCircle, Mail, Lock, AlertTriangle,
  Check, X, Flame,
} from "lucide-react";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import { updateProfileExtras } from "../profile/profileapi";

const SPRINT_DAYS = [
  { value: "MON", label: "Mon" },
  { value: "TUE", label: "Tue" },
  { value: "WED", label: "Wed" },
  { value: "THU", label: "Thu" },
  { value: "FRI", label: "Fri" },
  { value: "SAT", label: "Sat" },
  { value: "SUN", label: "Sun" },
];

// ── Shared bits ──────────────────────────────────────────────────────────

function SectionCard({ children }) {
  return (
    <section className="bg-card border border-border rounded-2xl p-6 sm:p-8">
      {children}
    </section>
  );
}

function SectionHeader({ icon: Icon, tint = "social", title, subtitle }) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `hsl(var(--${tint}-100))` }}
      >
        <Icon className="w-5 h-5" style={{ color: `hsl(var(--${tint}-500))` }} />
      </div>
      <div>
        <h2 className="text-lg font-display font-semibold text-ink-900">{title}</h2>
        {subtitle && <p className="text-sm text-ink-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function FieldLabel({ htmlFor, children, hint }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-900 mb-2">
      {children} {hint && <span className="text-ink-500 font-normal">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full px-4 py-3 rounded-lg border border-border bg-background text-ink-900 placeholder:text-ink-500 " +
  "focus:ring-2 focus:ring-social-500 focus:border-social-500 transition-all disabled:opacity-50";

function ErrorBanner({ children }) {
  if (!children) return null;
  return (
    <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "hsl(var(--highlight-100))" }}>
      <p className="text-sm" style={{ color: "hsl(var(--highlight-700))" }}>{children}</p>
    </div>
  );
}

function SuccessBanner({ children }) {
  if (!children) return null;
  return (
    <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ backgroundColor: "hsl(var(--success-100))" }}>
      <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--success-700))" }} />
      <p className="text-sm" style={{ color: "hsl(var(--success-700))" }}>{children}</p>
    </div>
  );
}

function PrimaryButton({ children, disabled, tint = "social", className = "", ...rest }) {
  return (
    <button
      disabled={disabled}
      className={`px-5 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 ${className}`}
      style={{ backgroundColor: `hsl(var(--${tint}-500))` }}
      {...rest}
    >
      {children}
    </button>
  );
}

export default function Settings() {
  const { user, updateUserContext, logout } = useAuth();

  // ─── Profile state ────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    username:    user?.username    ?? "",
    bio:         user?.bio         ?? "",
    dateOfBirth: user?.dateOfBirth
      ? new Date(user.dateOfBirth).toISOString().split("T")[0]
      : "",
  });
  const [avatarFile, setAvatarFile]         = useState(null);
  const [avatarPreview, setAvatarPreview]   = useState(user?.avatar ?? null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError]     = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const fileInputRef = useRef(null);

  // ─── Social links state ───────────────────────────────────────
  const parseSocialLinks = (raw) => {
    if (!raw) return [{ platform: "", url: "" }, { platform: "", url: "" }];
    try {
      const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
      const filled = Array.isArray(arr) ? arr.slice(0, 2) : [];
      while (filled.length < 2) filled.push({ platform: "", url: "" });
      return filled;
    } catch { return [{ platform: "", url: "" }, { platform: "", url: "" }]; }
  };
  const [socialLinks, setSocialLinks] = useState(() => parseSocialLinks(user?.socialLinks));
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialError, setSocialError]     = useState("");
  const [socialSuccess, setSocialSuccess] = useState("");

  // ─── Public profile extras (country/genre/fun fact/sprint prefs/AMA) ──
  const [extrasForm, setExtrasForm] = useState({
    country:            user?.country            ?? "",
    genre:              user?.genre              ?? "",
    funFact:            user?.funFact             ?? "",
    favoriteSprintTime: user?.favoriteSprintTime  ?? "",
    favoriteSprintDays: user?.favoriteSprintDays  ?? [],
    allowAskMeAnything: user?.allowAskMeAnything  ?? false,
  });
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [extrasError, setExtrasError]     = useState("");
  const [extrasSuccess, setExtrasSuccess] = useState("");

  function toggleSprintDay(day) {
    setExtrasForm((f) => ({
      ...f,
      favoriteSprintDays: f.favoriteSprintDays.includes(day)
        ? f.favoriteSprintDays.filter((d) => d !== day)
        : [...f.favoriteSprintDays, day],
    }));
    setExtrasError(""); setExtrasSuccess("");
  }

  async function handleSaveExtras(e) {
    e.preventDefault();
    setExtrasError("");
    setExtrasSuccess("");
    setExtrasLoading(true);
    try {
      const updated = await updateProfileExtras({
        country: extrasForm.country.trim(),
        genre: extrasForm.genre.trim(),
        funFact: extrasForm.funFact.trim(),
        favoriteSprintTime: extrasForm.favoriteSprintTime.trim(),
        favoriteSprintDays: extrasForm.favoriteSprintDays,
        allowAskMeAnything: extrasForm.allowAskMeAnything,
      });
      if (updateUserContext) updateUserContext({ ...user, ...updated });
      setExtrasSuccess("Profile updated.");
    } catch (err) {
      setExtrasError(err.message || "Failed to save. Please try again.");
    } finally {
      setExtrasLoading(false);
    }
  }

  // ─── Discord state ────────────────────────────────────────────
  const [discordError, setDiscordError]     = useState("");
  const [discordSuccess, setDiscordSuccess] = useState("");
  const [discordLoading, setDiscordLoading] = useState(false);

  // ─── Password change state ────────────────────────────────────
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError]     = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // ─── Email (recovery) state ───────────────────────────────────
  const [email, setEmail]               = useState(user?.email ?? "");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError]     = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");

  // ─── Delete account state ─────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError]     = useState("");
  const DELETE_PHRASE = "delete my account";

  const isDiscordLinked = !!user?.discordId;
  const isDiscordOnly   = isDiscordLinked && !user?.password;
  const hasEmail        = !!user?.email;

  const bioCharCount = profileForm.bio.trim().length;

  // ─── Avatar pick ──────────────────────────────────────────────
  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setProfileError("");
    setProfileSuccess("");
  }

  // ─── Profile save ─────────────────────────────────────────────
  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    if (bioCharCount > 400) return setProfileError("Bio must not exceed 400 characters.");
    setProfileLoading(true);
    try {
      const body = new FormData();
      body.append("username",    profileForm.username.trim());
      body.append("bio",         profileForm.bio.trim());
      body.append("dateOfBirth", profileForm.dateOfBirth || "");
      if (avatarFile) body.append("avatar", avatarFile);
      const res = await fetch(`${API_URL}/users/updateUser`, {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await res.json();
      if (!res.ok) return setProfileError(data.message || "Failed to save profile.");
      if (updateUserContext) updateUserContext(data.user);
      setProfileSuccess("Profile updated successfully.");
      setAvatarFile(null);
    } catch {
      setProfileError("Something went wrong. Please try again.");
    } finally {
      setProfileLoading(false);
    }
  }

  // ─── Social links save ────────────────────────────────────────
  async function handleSaveSocialLinks(e) {
    e.preventDefault();
    setSocialError("");
    setSocialSuccess("");
    const urlRegex = /^https?:\/\/.+/i;
    for (const link of socialLinks) {
      if (link.url.trim() && !urlRegex.test(link.url.trim())) {
        return setSocialError(`"${link.url}" must start with http:// or https://`);
      }
    }
    setSocialLoading(true);
    try {
      const cleaned = socialLinks.filter(l => l.platform.trim() && l.url.trim());
      const body = new FormData();
      body.append("socialLinks", JSON.stringify(cleaned));
      const res = await fetch(`${API_URL}/users/updateUser`, {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await res.json();
      if (!res.ok) return setSocialError(data.message || "Failed to save social links.");
      if (updateUserContext) updateUserContext(data.user);
      setSocialSuccess("Social links updated.");
    } catch {
      setSocialError("Something went wrong. Please try again.");
    } finally {
      setSocialLoading(false);
    }
  }

  // ─── Discord unlink ───────────────────────────────────────────
  async function handleUnlinkDiscord() {
    setDiscordError("");
    setDiscordSuccess("");
    setDiscordLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/discord/unlink`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) return setDiscordError(data.message || "Failed to unlink Discord account.");
      if (updateUserContext) updateUserContext(data.user);
      setDiscordSuccess("Discord account unlinked.");
    } catch {
      setDiscordError("Something went wrong. Please try again.");
    } finally {
      setDiscordLoading(false);
    }
  }

  // ─── Password change ──────────────────────────────────────────
  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (passwords.newPassword !== passwords.confirmPassword) {
      return setPasswordError("New passwords don't match.");
    }
    if (passwords.newPassword.length < 8) {
      return setPasswordError("New password must be at least 8 characters.");
    }
    if (!isDiscordOnly && !passwords.currentPassword) {
      return setPasswordError("Please enter your current password.");
    }
    setPasswordLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/changePassword`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: passwords.currentPassword || null,
          newPassword: passwords.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) return setPasswordError(data.message || "Failed to change password.");
      if (updateUserContext) updateUserContext(data.user);
      setPasswordSuccess(
        isDiscordOnly
          ? "Password set! You can now log in with your Discord ID and this password."
          : "Password updated successfully."
      );
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      setPasswordError("Something went wrong. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
  }

  // ─── Email save ───────────────────────────────────────────────
  async function handleSaveEmail(e) {
    e.preventDefault();
    setEmailError("");
    setEmailSuccess("");
    const trimmed = email.trim();
    if (!trimmed) return setEmailError("Please enter an email address.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return setEmailError("Please enter a valid email address.");
    }
    setEmailLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/updateUser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) return setEmailError(data.message || "Failed to save email.");
      if (updateUserContext) updateUserContext(data.user);
      setEmailSuccess("Email saved! You can now use it to reset your password if needed.");
    } catch {
      setEmailError("Something went wrong. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  }

  // ─── Delete account ───────────────────────────────────────────
  async function handleDeleteAccount() {
    setDeleteError("");
    if (deleteConfirmText.toLowerCase() !== DELETE_PHRASE) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.message || "Failed to delete account. Please try again.");
        return;
      }
      if (logout) logout();
      window.location.href = "/";
    } catch {
      setDeleteError("Something went wrong. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-2xl mx-auto">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-ink-900 mb-1">Settings</h1>
          <p className="text-ink-500 text-sm">Manage your profile and account</p>
        </div>

        <div className="space-y-6">

          {/* ─── Profile section ──────────────────────────────────── */}
          <SectionCard>
            <SectionHeader icon={User} tint="social" title="Profile" subtitle="Your public-facing identity" />

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Avatar */}
              <div>
                <FieldLabel>Profile picture</FieldLabel>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-border bg-secondary flex items-center justify-center shrink-0">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-display text-3xl font-semibold text-ink-500">
                        {user?.username?.[0]?.toUpperCase() ?? "?"}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm text-ink-700 hover:border-social-500 hover:text-social-500 transition-all font-medium"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {avatarPreview ? "Change photo" : "Upload photo"}
                    </button>
                    {avatarPreview && avatarPreview !== user?.avatar && (
                      <button
                        type="button"
                        onClick={() => { setAvatarFile(null); setAvatarPreview(user?.avatar ?? null); }}
                        className="block text-xs text-ink-500 hover:text-highlight-500 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                    <p className="text-xs text-ink-500">JPG, PNG or WebP · Max 5 MB</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <FieldLabel htmlFor="settingsUsername">Username</FieldLabel>
                <input
                  id="settingsUsername"
                  type="text"
                  value={profileForm.username}
                  onChange={(e) => { setProfileForm({ ...profileForm, username: e.target.value }); setProfileError(""); setProfileSuccess(""); }}
                  className={inputClass}
                  disabled={profileLoading}
                />
              </div>

              {/* Bio */}
              <div>
                <FieldLabel htmlFor="settingsBio" hint={`(${bioCharCount}/400)`}>Bio</FieldLabel>
                <textarea
                  id="settingsBio"
                  rows={3}
                  value={profileForm.bio}
                  onChange={(e) => { setProfileForm({ ...profileForm, bio: e.target.value }); setProfileError(""); setProfileSuccess(""); }}
                  className={`${inputClass} resize-none`}
                  disabled={profileLoading}
                />
              </div>

              {/* Date of Birth */}
              <div>
                <FieldLabel htmlFor="settingsDob" hint="(optional)">Date of Birth</FieldLabel>
                <input
                  id="settingsDob"
                  type="date"
                  value={profileForm.dateOfBirth}
                  onChange={(e) => { setProfileForm({ ...profileForm, dateOfBirth: e.target.value }); setProfileError(""); setProfileSuccess(""); }}
                  className={inputClass}
                  disabled={profileLoading}
                />
              </div>

              <ErrorBanner>{profileError}</ErrorBanner>
              <SuccessBanner>{profileSuccess}</SuccessBanner>

              <PrimaryButton type="submit" disabled={profileLoading}>
                {profileLoading ? "Saving…" : "Save profile"}
              </PrimaryButton>
            </form>
          </SectionCard>

          {/* ─── Social Links ─────────────────────────────────────── */}
          <SectionCard>
            <SectionHeader icon={Link2} tint="social" title="Social Links" subtitle="Add up to 2 links to your profile" />

            <form onSubmit={handleSaveSocialLinks} className="space-y-4">
              {socialLinks.map((link, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
                  <input
                    type="text"
                    value={link.platform}
                    onChange={(e) => {
                      const updated = socialLinks.map((l, idx) => idx === i ? { ...l, platform: e.target.value } : l);
                      setSocialLinks(updated);
                      setSocialError(""); setSocialSuccess("");
                    }}
                    placeholder="Platform name"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-ink-900 placeholder:text-ink-500 transition-all focus:ring-2 focus:ring-social-500 focus:border-social-500"
                  />
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => {
                      const updated = socialLinks.map((l, idx) => idx === i ? { ...l, url: e.target.value } : l);
                      setSocialLinks(updated);
                      setSocialError(""); setSocialSuccess("");
                    }}
                    placeholder="https://twitter.com/yourhandle"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-ink-900 placeholder:text-ink-500 transition-all focus:ring-2 focus:ring-social-500 focus:border-social-500"
                  />
                </div>
              ))}

              {socialError   && <p className="text-sm" style={{ color: "hsl(var(--highlight-500))" }}>{socialError}</p>}
              {socialSuccess && <p className="text-sm" style={{ color: "hsl(var(--success-500))" }}>{socialSuccess}</p>}

              <PrimaryButton type="submit" disabled={socialLoading}>
                {socialLoading ? "Saving…" : "Save links"}
              </PrimaryButton>
            </form>
          </SectionCard>

          {/* ─── Public Profile Extras ───────────────────────────────── */}
          <SectionCard>
            <SectionHeader icon={Compass} tint="quest" title="Writer Card" subtitle="Shown when other writers click your name" />

            <form onSubmit={handleSaveExtras} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <FieldLabel htmlFor="settingsCountry">Country</FieldLabel>
                  <input
                    id="settingsCountry"
                    type="text"
                    value={extrasForm.country}
                    onChange={(e) => { setExtrasForm({ ...extrasForm, country: e.target.value }); setExtrasError(""); setExtrasSuccess(""); }}
                    placeholder="e.g. Nigeria"
                    className={inputClass}
                    disabled={extrasLoading}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="settingsGenre">Genre you write</FieldLabel>
                  <input
                    id="settingsGenre"
                    type="text"
                    value={extrasForm.genre}
                    onChange={(e) => { setExtrasForm({ ...extrasForm, genre: e.target.value }); setExtrasError(""); setExtrasSuccess(""); }}
                    placeholder="e.g. Fantasy"
                    className={inputClass}
                    disabled={extrasLoading}
                  />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="settingsFunFact">Fun fact</FieldLabel>
                <input
                  id="settingsFunFact"
                  type="text"
                  value={extrasForm.funFact}
                  onChange={(e) => { setExtrasForm({ ...extrasForm, funFact: e.target.value }); setExtrasError(""); setExtrasSuccess(""); }}
                  placeholder="Something short and fun about you"
                  className={inputClass}
                  disabled={extrasLoading}
                />
              </div>

              <div>
                <FieldLabel htmlFor="settingsSprintTime">Favorite sprint time</FieldLabel>
                <input
                  id="settingsSprintTime"
                  type="text"
                  value={extrasForm.favoriteSprintTime}
                  onChange={(e) => { setExtrasForm({ ...extrasForm, favoriteSprintTime: e.target.value }); setExtrasError(""); setExtrasSuccess(""); }}
                  placeholder="e.g. Evenings, 8–10pm"
                  className={inputClass}
                  disabled={extrasLoading}
                />
              </div>

              <div>
                <FieldLabel>Favorite sprint days</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {SPRINT_DAYS.map((d) => {
                    const active = extrasForm.favoriteSprintDays.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleSprintDay(d.value)}
                        disabled={extrasLoading}
                        className="px-3 py-1.5 rounded-full text-sm font-medium border transition-all"
                        style={
                          active
                            ? { backgroundColor: "hsl(var(--social-500))", color: "white", borderColor: "hsl(var(--social-500))" }
                            : { borderColor: "hsl(var(--border))", color: "hsl(var(--ink-500))" }
                        }
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border">
                <div>
                  <p className="text-sm font-medium text-ink-900">Ask me anything</p>
                  <p className="text-xs text-ink-500 mt-1 leading-relaxed">
                    Let other writers message you directly from your profile popup, even if you haven't talked before.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={extrasForm.allowAskMeAnything}
                  onClick={() => {
                    setExtrasForm((f) => ({ ...f, allowAskMeAnything: !f.allowAskMeAnything }));
                    setExtrasError(""); setExtrasSuccess("");
                  }}
                  disabled={extrasLoading}
                  className="shrink-0 relative w-11 h-6 rounded-full transition-colors"
                  style={{ backgroundColor: extrasForm.allowAskMeAnything ? "hsl(var(--social-500))" : "hsl(var(--paper-muted))" }}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${extrasForm.allowAskMeAnything ? "translate-x-5" : ""}`}
                  />
                </button>
              </div>

              <ErrorBanner>{extrasError}</ErrorBanner>
              <SuccessBanner>{extrasSuccess}</SuccessBanner>

              <PrimaryButton type="submit" disabled={extrasLoading} tint="quest">
                {extrasLoading ? "Saving…" : "Save writer card"}
              </PrimaryButton>
            </form>
          </SectionCard>

          {/* ─── Discord section ───────────────────────────────────── */}
          {isDiscordLinked && (
            <SectionCard>
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#5865F2] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-display font-semibold text-ink-900">Discord</h2>
                  <p className="text-sm text-ink-500 mt-0.5">Your Discord account is connected</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4" style={{ backgroundColor: "hsl(var(--success-100))" }}>
                <Check className="w-5 h-5 shrink-0" style={{ color: "hsl(var(--success-500))" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "hsl(var(--success-700))" }}>Discord account linked</p>
                  <p className="text-xs mt-0.5 font-mono" style={{ color: "hsl(var(--success-700))" }}>{user?.discordId}</p>
                </div>
              </div>

              <ErrorBanner>{discordError}</ErrorBanner>
              <SuccessBanner>{discordSuccess}</SuccessBanner>

              <button
                onClick={handleUnlinkDiscord}
                disabled={discordLoading}
                className="mt-3 px-4 py-2 text-sm rounded-lg border transition-colors disabled:opacity-50"
                style={{ color: "hsl(var(--highlight-500))", borderColor: "hsl(var(--highlight-300))" }}
              >
                {discordLoading ? "Unlinking..." : "Unlink Discord"}
              </button>
            </SectionCard>
          )}

          {/* ─── Recovery Email ───────────────────────────────────── */}
          <SectionCard>
            <SectionHeader icon={Mail} tint="achievement" title="Recovery Email" subtitle="Update your email" />

            <form onSubmit={handleSaveEmail} className="space-y-4">
              <div>
                <FieldLabel htmlFor="recoveryEmail">Email Address</FieldLabel>
                <input
                  id="recoveryEmail"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(""); setEmailSuccess(""); }}
                  placeholder="you@example.com"
                  className={inputClass}
                  disabled={emailLoading}
                />
              </div>

              <ErrorBanner>{emailError}</ErrorBanner>
              <SuccessBanner>{emailSuccess}</SuccessBanner>

              <PrimaryButton type="submit" disabled={emailLoading} tint="achievement" className="w-full">
                {emailLoading ? "Saving..." : hasEmail ? "Update Email" : "Save Email"}
              </PrimaryButton>
            </form>
          </SectionCard>

          {/* ─── Password section ──────────────────────────────────── */}
          <SectionCard>
            <SectionHeader
              icon={Lock}
              tint="social"
              title="Password"
              subtitle={isDiscordOnly
                ? "Set a password so you can log in with your Discord ID + password"
                : "Update your account password"}
            />

            {isDiscordOnly && (
              <div className="rounded-xl px-4 py-3 mb-4" style={{ backgroundColor: "hsl(var(--bonus-100))" }}>
                <p className="text-xs" style={{ color: "hsl(var(--bonus-700))" }}>
                  <strong>How login works for you:</strong> You joined via Discord, so you can log in using your
                  Discord ID as your username and the password you set here. No email needed.
                </p>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              {!isDiscordOnly && (
                <div>
                  <FieldLabel htmlFor="currentPassword">Current Password</FieldLabel>
                  <input
                    id="currentPassword"
                    type="password"
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    className={inputClass}
                    disabled={passwordLoading}
                  />
                </div>
              )}

              <div>
                <FieldLabel htmlFor="newPassword">{isDiscordOnly ? "Password" : "New Password"}</FieldLabel>
                <input
                  id="newPassword"
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  className={inputClass}
                  disabled={passwordLoading}
                />
              </div>

              <div>
                <FieldLabel htmlFor="confirmPassword">{isDiscordOnly ? "Confirm Password" : "Confirm New Password"}</FieldLabel>
                <input
                  id="confirmPassword"
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  className={inputClass}
                  disabled={passwordLoading}
                />
              </div>

              <ErrorBanner>{passwordError}</ErrorBanner>
              <SuccessBanner>{passwordSuccess}</SuccessBanner>

              <PrimaryButton type="submit" disabled={passwordLoading} className="w-full">
                {passwordLoading ? "Saving..." : isDiscordOnly ? "Set Password" : "Update Password"}
              </PrimaryButton>
            </form>
          </SectionCard>

          {/* ─── Danger Zone ───────────────────────────────────────── */}
          <section className="rounded-2xl border p-6 sm:p-8" style={{ borderColor: "hsl(var(--highlight-300))", backgroundColor: "hsl(var(--card))" }}>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "hsl(var(--highlight-500))" }}>
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-display font-semibold" style={{ color: "hsl(var(--highlight-700))" }}>Danger Zone</h2>
                <p className="text-sm text-ink-500 mt-0.5">
                  Irreversible actions — please read carefully before proceeding.
                </p>
              </div>
            </div>

            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border" style={{ borderColor: "hsl(var(--highlight-300))", backgroundColor: "hsl(var(--highlight-100))" }}>
              <div>
                <p className="text-sm font-medium text-ink-900">Delete account</p>
                <p className="text-xs text-ink-500 mt-1 leading-relaxed">
                  Your profile, projects, sprints, and private data will be permanently removed.
                  Comments and feedback you left on other writers' work will remain but show as <span className="font-mono font-medium">[deleted]</span>.
                </p>
              </div>
              <button
                onClick={() => { setShowDeleteModal(true); setDeleteError(""); setDeleteConfirmText(""); }}
                className="shrink-0 px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
                style={{ color: "hsl(var(--highlight-500))", borderColor: "hsl(var(--highlight-300))" }}
              >
                Delete account
              </button>
            </div>
          </section>

        </div>

        {/* ─── Delete account confirmation modal ─────────────────── */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => { if (!deleteLoading) setShowDeleteModal(false); }}
            />
            <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 sm:p-8 space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "hsl(var(--highlight-100))" }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: "hsl(var(--highlight-500))" }} />
                </div>
                <div>
                  <h3 className="text-lg font-display font-semibold text-ink-900">Delete your account?</h3>
                  <p className="text-sm text-ink-500 mt-0.5">This cannot be undone.</p>
                </div>
                <button onClick={() => setShowDeleteModal(false)} className="ml-auto text-ink-500 hover:text-ink-900 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="rounded-xl border px-4 py-3 space-y-1" style={{ borderColor: "hsl(var(--highlight-300))", backgroundColor: "hsl(var(--highlight-100))" }}>
                  <p className="font-medium mb-1" style={{ color: "hsl(var(--highlight-700))" }}>Permanently deleted</p>
                  <ul className="space-y-0.5 list-disc list-inside text-xs" style={{ color: "hsl(var(--highlight-700))" }}>
                    <li>Your profile, avatar, and bio</li>
                    <li>All projects, sprints, notes, and to-do lists</li>
                    <li>Your notifications and account credentials</li>
                  </ul>
                </div>
                <div className="rounded-xl border px-4 py-3 space-y-1" style={{ borderColor: "hsl(var(--achievement-300))", backgroundColor: "hsl(var(--achievement-100))" }}>
                  <p className="font-medium mb-1" style={{ color: "hsl(var(--achievement-700))" }}>
                    Preserved (shown as <span className="font-mono">[deleted]</span>)
                  </p>
                  <ul className="space-y-0.5 list-disc list-inside text-xs" style={{ color: "hsl(var(--achievement-700))" }}>
                    <li>Comments you left on blog posts and snippets</li>
                    <li>Feedback and critiques you gave in the Feedback Hub</li>
                    <li>Wall posts you wrote on other members' profiles</li>
                  </ul>
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="deleteConfirm">
                  Type <span className="font-mono font-semibold" style={{ color: "hsl(var(--highlight-500))" }}>{DELETE_PHRASE}</span> to confirm
                </FieldLabel>
                <input
                  id="deleteConfirm"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => { setDeleteConfirmText(e.target.value); setDeleteError(""); }}
                  placeholder={DELETE_PHRASE}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-sm text-ink-900 placeholder:text-ink-500 focus:ring-2 focus:border-transparent transition-all"
                  style={{ "--tw-ring-color": "hsl(var(--highlight-500))" }}
                  disabled={deleteLoading}
                  autoComplete="off"
                />
              </div>

              <ErrorBanner>{deleteError}</ErrorBanner>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteLoading}
                  className="flex-1 py-2.5 px-4 text-sm font-medium text-ink-900 border border-border rounded-xl hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || deleteConfirmText.toLowerCase() !== DELETE_PHRASE}
                  className="flex-1 py-2.5 px-4 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "hsl(var(--highlight-500))" }}
                >
                  {deleteLoading ? "Deleting…" : "Yes, delete my account"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}