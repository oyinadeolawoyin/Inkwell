// src/components/profile/profileModalContext.jsx
//
// Mount <ProfileModalProvider> once near the root (see main.jsx). Anywhere
// else in the app, call:
//
//   const { openProfile } = useProfileModal();
//   <button onClick={() => openProfile(user.id)}>{user.username}</button>
//
// and the Discord-style popup (profileModal.jsx) renders itself — no need
// to mount or manage it locally. See clickableUsername.jsx for an even
// smaller drop-in wrapper.

import { createContext, useCallback, useContext, useState } from "react";
import ProfileModal from "./profilemodal";

const ProfileModalCtx = createContext(null);

export function ProfileModalProvider({ children }) {
  const [openUserId, setOpenUserId] = useState(null);

  const openProfile = useCallback((userId) => {
    if (!userId) return;
    setOpenUserId(Number(userId));
  }, []);

  const closeProfile = useCallback(() => setOpenUserId(null), []);

  return (
    <ProfileModalCtx.Provider value={{ openProfile, closeProfile }}>
      {children}
      {openUserId != null && <ProfileModal userId={openUserId} onClose={closeProfile} />}
    </ProfileModalCtx.Provider>
  );
}

export function useProfileModal() {
  const ctx = useContext(ProfileModalCtx);
  if (!ctx) throw new Error("useProfileModal must be used within a ProfileModalProvider");
  return ctx;
}