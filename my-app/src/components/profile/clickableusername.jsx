// src/components/profile/clickableUsername.jsx
//
// Wrap any username/avatar with this to make it open the profile popup on
// click, without changing how it's styled or laid out. Renders a plain
// <span> (no click behavior) if userId is missing/disabled — e.g. for "You"
// rows that don't have a real other-user id to look up.
//
//   <ClickableUsername userId={w.userId}>
//     <Avatar name={w.username} src={w.avatar} />
//   </ClickableUsername>

import { useProfileModal } from "./profilemodalcontext";

export default function ClickableUsername({ userId, className = "", disabled = false, children }) {
  const { openProfile } = useProfileModal();

  if (!userId || disabled) {
    return <span className={className}>{children}</span>;
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openProfile(userId);
      }}
      className={`text-left cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}