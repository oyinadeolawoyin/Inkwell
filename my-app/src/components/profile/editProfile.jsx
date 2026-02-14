import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import Header from "./header";
import API_URL from "@/config/api";

export default function EditProfile() {
  const { user, updateUserContext } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    username: user?.username || "",
    email: user?.email || "",
    bio: user?.bio || "",
  });

  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(user?.profileImage || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
    setSuccess(false);
  }

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError("Please select a valid image file");
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size should be less than 5MB");
        return;
      }

      setProfileImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      setError("");
    }
  }

  function removeImage() {
    setProfileImage(null);
    setImagePreview(user?.profileImage || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Create FormData to handle file upload
      const formDataToSend = new FormData(); console.log("usnm", formData.username);
    //   formDataToSend.append("userId", user.id);
      formDataToSend.append("username", formData.username);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("bio", formData.bio);
      
      // Add profile image if selected
      if (profileImage) {
        formDataToSend.append("file", profileImage);
      }

      const res = await fetch(`${API_URL}/users/updateUser`, {
        method: "POST",
        credentials: "include",
        body: formDataToSend,
        // Don't set Content-Type header - browser will set it with boundary for FormData
      });

      if (res.ok) {
        const data = await res.json();
        // Update user context
        if (updateUserContext) {
          updateUserContext(data.user);
        }
        setSuccess(true);
        setTimeout(() => {
          navigate("/profile");
        }, 1500);
      } else {
        const data = await res.json();
        setError(data.message || "Failed to update profile");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-cream">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-serif text-ink-primary mb-2">
            Edit Profile
          </h1>
          <p className="text-ink-gray">
            Update your personal information
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-soft p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Image */}
            <div>
              <label className="block text-sm font-medium text-ink-primary mb-3">
                Profile Image
              </label>
              <div className="flex items-center gap-6">
                {/* Image Preview */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-ink-primary to-gray-700 flex items-center justify-center text-white font-bold text-3xl shadow-soft overflow-hidden">
                  {imagePreview ? (
                    <img 
                      src={imagePreview} 
                      alt="Profile preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user?.username?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>

                {/* Upload Controls */}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="profile-image-input"
                    disabled={isLoading}
                  />
                  <div className="flex gap-3">
                    <label
                      htmlFor="profile-image-input"
                      className="px-4 py-2 bg-ink-cream text-ink-primary rounded-lg font-medium
                               hover:bg-gray-200 transition-all cursor-pointer text-sm border border-ink-lightgray"
                    >
                      {imagePreview && profileImage ? 'Change Image' : 'Upload Image'}
                    </label>
                    {imagePreview && profileImage && (
                      <button
                        type="button"
                        onClick={removeImage}
                        className="px-4 py-2 text-red-600 hover:text-red-700 transition-colors text-sm font-medium"
                        disabled={isLoading}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    JPG, PNG or GIF. Max size 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-ink-primary mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                minLength={3}
                maxLength={20}
                className="w-full px-4 py-3 rounded-lg border border-ink-lightgray
                         focus:ring-2 focus:ring-ink-gold focus:border-ink-gold
                         transition-all text-ink-gray"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.username.length}/20 characters
              </p>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink-primary mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-lg border border-ink-lightgray
                         focus:ring-2 focus:ring-ink-gold focus:border-ink-gold
                         transition-all text-ink-gray"
                disabled={isLoading}
              />
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-ink-primary mb-2">
                Bio <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                maxLength={200}
                rows="4"
                placeholder="Tell us a bit about yourself..."
                className="w-full px-4 py-3 rounded-lg border border-ink-lightgray
                         focus:ring-2 focus:ring-ink-gold focus:border-ink-gold
                         transition-all text-ink-gray resize-none"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.bio.length}/200 characters
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Profile updated successfully! Redirecting...
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="flex-1 py-3 px-6 border-2 border-ink-lightgray text-ink-gray rounded-lg
                         hover:border-ink-primary hover:text-ink-primary transition-all font-medium"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-6 bg-ink-primary text-white rounded-lg font-medium
                         hover:bg-opacity-90 transition-all shadow-soft
                         disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Need help? <a href="/support" className="text-ink-gold hover:text-amber-600 transition-colors">Contact Support</a>
          </p>
        </div>
      </main>
    </div>
  );
}