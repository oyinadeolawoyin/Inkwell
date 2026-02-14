import Header from "../profile/header";

export default function Profile() {
  return (
    <div className="min-h-screen bg-ink-cream">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl shadow-soft-lg p-8 sm:p-12 lg:p-16 border-l-4 border-ink-gold">
          
          {/* Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-ink-cream rounded-full mb-6">
              <svg 
                className="w-10 h-10 sm:w-12 sm:h-12 text-ink-primary" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                />
              </svg>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-ink-primary mb-4">
              Profile Coming Soon
            </h1>

            {/* Description */}
            <p className="text-lg sm:text-xl text-ink-gray max-w-2xl mx-auto leading-relaxed">
              We're crafting your profile page with care. Soon you'll be able to view your writing stats, track your progress, and celebrate your journey.
            </p>
          </div>

          {/* Feature List */}
          <div className="mt-12 space-y-4">
            <div className="flex items-start gap-4 p-4 bg-white rounded-xl">
              <div className="flex-shrink-0 w-8 h-8 bg-ink-gold bg-opacity-20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-ink-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-ink-primary mb-1">Writing Statistics</h3>
                <p className="text-sm text-ink-gray">View your total words written, sprints completed, and consistency streaks</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-white rounded-xl">
              <div className="flex-shrink-0 w-8 h-8 bg-ink-gold bg-opacity-20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-ink-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-ink-primary mb-1">Sprint History</h3>
                <p className="text-sm text-ink-gray">Review your past sprints, check-ins, and checkout reflections</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-white rounded-xl">
              <div className="flex-shrink-0 w-8 h-8 bg-ink-gold bg-opacity-20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-ink-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-ink-primary mb-1">Personal Settings</h3>
                <p className="text-sm text-ink-gray">Customize your preferences and manage your account</p>
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="mt-12 pt-8 border-t border-ink-gold border-opacity-20">
            <div className="flex items-center justify-center gap-3">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-ink-primary rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-ink-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-ink-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <p className="text-sm text-ink-gray italic">
                Currently building this page...
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}




// import { useState, useEffect } from "react";
// import { Link, useNavigate, useParams } from "react-router-dom";
// import { useAuth } from "../auth/authContext";
// import Header from "./header";
// import API_URL from "@/config/api";

// export default function Profile() {
//   const { user: authUser } = useAuth(); // We DO need this to get logged-in user's ID
//   const navigate = useNavigate();
//   const { userId } = useParams(); // This is from URL like /profile/:userId
//   const [user, setUser] = useState(null);
//   const [projects, setProjects] = useState([]);
//   const [sprintDays, setSprintDays] = useState([]);
//   const [hoveredDate, setHoveredDate] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     // Determine which user ID to use:
//     // 1. If userId in URL, use that (viewing someone else's profile)
//     // 2. Otherwise use authUser.id (viewing own profile)
//     const targetUserId = userId || authUser?.id;
    
//     if (targetUserId) {
//       fetchUserData(targetUserId);
//     } else {
//       // No user ID available, might need to redirect to login
//       setIsLoading(false);
//     }
//   }, [userId, authUser?.id]);

//   async function fetchUserData(targetUserId) {
//     console.log("🔍 Starting fetch for user:", targetUserId);
    
//     try {
//       console.log("📡 Fetching user data...");
//       const userRes = await fetch(`${API_URL}/users/${targetUserId}/user`, { 
//         credentials: "include" 
//       });
//       console.log("✅ User response:", userRes.status);

//       console.log("📡 Fetching projects...");
//       const projectsRes = await fetch(`${API_URL}/project/${targetUserId}`, { 
//         credentials: "include" 
//       });
//       console.log("✅ Projects response:", projectsRes.status);

//       console.log("📡 Fetching sprint days...");
//       const sprintDaysRes = await fetch(`${API_URL}/sprint/${targetUserId}/sprintDays`, { 
//         credentials: "include" 
//       });
//       console.log("✅ Sprint days response:", sprintDaysRes.status);

//       if (userRes.ok) {
//         const userData = await userRes.json();
//         console.log("👤 User data:", userData);
//         setUser(userData.user);
//       } else {
//         console.error("❌ User fetch failed:", userRes.status);
//       }

//       if (projectsRes.ok) {
//         const projectsData = await projectsRes.json();
//         console.log("📁 Projects data:", projectsData);
//         setProjects(projectsData.projects || []);
//       } else {
//         console.error("❌ Projects fetch failed:", projectsRes.status);
//       }

//       if (sprintDaysRes.ok) {
//         const daysData = await sprintDaysRes.json();
//         console.log("📅 Sprint days data:", daysData);
//         setSprintDays(daysData.sprintDays || []);
//       } else {
//         console.error("❌ Sprint days fetch failed:", sprintDaysRes.status);
//       }

//       console.log("✨ All fetches complete!");
//     } catch (error) {
//       console.error("💥 Failed to fetch user data:", error);
//     } finally {
//       console.log("🏁 Setting loading to false");
//       setIsLoading(false);
//     }
//   }

//   // Generate heatmap data for the current month only
//   function generateHeatmapData() {
//     const today = new Date();
//     const currentMonth = today.getMonth();
//     const currentYear = today.getFullYear();
    
//     // Get month name and year for display
//     const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
//     // Get number of days in current month
//     const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
//     const days = [];
//     for (let day = 1; day <= daysInMonth; day++) {
//       const date = new Date(currentYear, currentMonth, day);
//       const dateString = date.toISOString().split('T')[0];
      
//       // Check if user sprinted on this day
//       const hasSprint = sprintDays.some(sprintDay => {
//         const sprintDate = new Date(sprintDay.startedAt).toISOString().split('T')[0];
//         return sprintDate === dateString;
//       });

//       // Don't show future dates
//       const isFuture = date > today;
      
//       days.push({
//         day,
//         date: dateString,
//         hasSprint,
//         isFuture,
//         displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
//       });
//     }
    
//     return { monthName, days };
//   }

//   const heatmapData = generateHeatmapData();
  
//   // Count sprints for current month
//   const today = new Date();
//   const currentMonthSprints = sprintDays.filter(sprintDay => {
//     const sprintDate = new Date(sprintDay.startedAt);
//     return sprintDate.getMonth() === today.getMonth() && 
//            sprintDate.getFullYear() === today.getFullYear();
//   }).length;

//   if (isLoading) {
//     return (
//       <div className="min-h-screen bg-ink-cream flex items-center justify-center">
//         <div className="text-center">
//           <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-ink-primary border-t-transparent"></div>
//           <p className="mt-4 text-ink-gray">Loading profile...</p>
//         </div>
//       </div>
//     );
//   }

//   // If no user data could be loaded
//   if (!user) {
//     return (
//       <div className="min-h-screen bg-ink-cream flex items-center justify-center">
//         <div className="text-center">
//           <p className="text-ink-gray">User not found or you need to log in</p>
//           <button
//             onClick={() => navigate('/login')}
//             className="mt-4 px-6 py-3 bg-ink-primary text-white rounded-lg"
//           >
//             Go to Login
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-ink-cream">
//       <Header />

//       <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
//         {/* Profile Header */}
//         <div className="bg-white rounded-2xl shadow-soft p-6 sm:p-8 mb-6">
//           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
//             {/* User Info */}
//             <div className="flex items-center gap-4">
//               {/* Profile Image */}
//               <div className="w-20 h-20 rounded-full bg-gradient-to-br from-ink-primary to-gray-700 flex items-center justify-center text-white font-bold text-3xl shadow-soft overflow-hidden">
//                 {user?.profileImage ? (
//                   <img 
//                     src={user.profileImage} 
//                     alt={user.username} 
//                     className="w-full h-full object-cover"
//                   />
//                 ) : (
//                   user?.username?.charAt(0).toUpperCase() || 'U'
//                 )}
//               </div>
//               <div>
//                 <div className="flex items-center gap-3 mb-2">
//                   <h1 className="text-2xl sm:text-3xl font-serif text-ink-primary">
//                     {user?.username}
//                   </h1>
//                   {/* Role Badge */}
//                   {user?.role === 'FOUNDING_WRITER' ? (
//                     <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-xs font-bold rounded-full shadow-soft">
//                       <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
//                         <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
//                       </svg>
//                       Founding Writer
//                     </span>
//                   ) : (
//                     <span className="px-3 py-1 bg-ink-cream text-ink-primary text-xs font-medium rounded-full">
//                       Writer
//                     </span>
//                   )}
//                 </div>
//                 <p className="text-ink-gray">{user?.email}</p>
//                 {user?.bio && (
//                   <p className="text-sm text-gray-500 mt-1">{user.bio}</p>
//                 )}
//               </div>
//             </div>

//             {/* Edit Profile Button - only show if viewing own profile */}
//             {(!userId || userId === authUser?.id) && (
//               <Link
//                 to="/profile/edit"
//                 className="px-5 py-2.5 bg-ink-primary text-white rounded-lg font-medium
//                          hover:bg-opacity-90 transition-all shadow-soft text-sm"
//               >
//                 Edit Profile
//               </Link>
//             )}
//           </div>
//         </div>

//         {/* Sprint Activity Heatmap */}
//         <div className="bg-white rounded-2xl shadow-soft p-6 sm:p-8 mb-6">
//           <div className="flex items-center justify-between mb-6">
//             <div>
//               <h2 className="text-xl sm:text-2xl font-serif text-ink-primary mb-1">
//                 Writing Activity
//               </h2>
//               <p className="text-sm text-gray-500">
//                 {heatmapData.monthName} • {currentMonthSprints} sprint{currentMonthSprints !== 1 ? 's' : ''} this month
//               </p>
//             </div>
//           </div>

//           {/* Heatmap */}
//           <div className="overflow-x-auto">
//             <div className="inline-block min-w-full">
//               <div className="grid grid-cols-7 gap-2">
//                 {/* Day headers */}
//                 {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, index) => (
//                   <div key={index} className="text-xs text-center text-gray-500 font-medium mb-2">
//                     {dayName}
//                   </div>
//                 ))}
                
//                 {/* Empty cells for days before the 1st of the month */}
//                 {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() }).map((_, index) => (
//                   <div key={`empty-${index}`} className="w-full aspect-square"></div>
//                 ))}
                
//                 {/* Day cells */}
//                 {heatmapData.days.map((day, dayIndex) => (
//                   <div
//                     key={dayIndex}
//                     className="relative group"
//                     onMouseEnter={() => setHoveredDate(day)}
//                     onMouseLeave={() => setHoveredDate(null)}
//                   >
//                     <div
//                       className={`w-full aspect-square rounded-lg transition-all cursor-pointer flex items-center justify-center text-xs font-medium ${
//                         day.isFuture
//                           ? 'bg-gray-100 text-gray-400'
//                           : day.hasSprint
//                           ? 'bg-green-500 text-white hover:bg-green-600 shadow-sm'
//                           : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
//                       }`}
//                       title={day.displayDate}
//                     >
//                       {day.day}
//                     </div>
                    
//                     {/* Tooltip */}
//                     {hoveredDate?.date === day.date && !day.isFuture && (
//                       <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10 pointer-events-none">
//                         <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
//                           {day.hasSprint ? '✓ ' : 'No sprint on '}
//                           {day.displayDate}
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>

//           {/* Legend */}
//           <div className="flex items-center gap-4 mt-6 text-xs text-gray-500">
//             <span>Less</span>
//             <div className="flex gap-1">
//               <div className="w-3 h-3 bg-gray-200 rounded-sm"></div>
//               <div className="w-3 h-3 bg-green-300 rounded-sm"></div>
//               <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
//               <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
//             </div>
//             <span>More</span>
//           </div>
//         </div>

//         {/* Projects Section */}
//         <div className="bg-white rounded-2xl shadow-soft p-6 sm:p-8">
//           <div className="flex items-center justify-between mb-6">
//             <h2 className="text-xl sm:text-2xl font-serif text-ink-primary">
//               My Projects
//             </h2>
//             {(!userId || userId === authUser?.id) && (
//               <Link
//                 to="/project/new"
//                 className="px-4 py-2 bg-ink-gold text-white rounded-lg font-medium text-sm
//                          hover:bg-opacity-90 transition-all shadow-soft flex items-center gap-2"
//               >
//                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                 </svg>
//                 Add Project
//               </Link>
//             )}
//           </div>

//           {projects.length === 0 ? (
//             <div className="text-center py-12 bg-ink-cream rounded-xl">
//               <div className="text-5xl mb-4">📚</div>
//               <h3 className="text-lg font-medium text-ink-primary mb-2">
//                 No projects yet
//               </h3>
//               <p className="text-gray-500 mb-6 max-w-md mx-auto">
//                 Add your writing projects -- your novels, short stories, or any writing work.
//               </p>
//               {(!userId || userId === authUser?.id) && (
//                 <Link
//                   to="/project/new"
//                   className="inline-block px-6 py-3 bg-ink-primary text-white rounded-lg font-medium
//                            hover:bg-opacity-90 transition-all shadow-soft"
//                 >
//                   Add Your First Project
//                 </Link>
//               )}
//             </div>
//           ) : (
//             <div className="grid sm:grid-cols-2 gap-4">
//               {projects.map((project) => (
//                 <div
//                   key={project.id}
//                   className="border border-ink-lightgray rounded-xl p-5 hover:border-ink-gold hover:shadow-soft transition-all"
//                 >
//                   <div className="flex items-start justify-between mb-3">
//                     <h3 className="text-lg font-semibold text-ink-primary">
//                       {project.title}
//                     </h3>
//                     {(!userId || userId === authUser?.id) && (
//                       <Link
//                         to={`/project/${project.id}/edit`}
//                         className="text-gray-400 hover:text-ink-primary transition-colors"
//                       >
//                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                         </svg>
//                       </Link>
//                     )}
//                   </div>
                  
//                   {project.description && (
//                     <p className="text-sm text-gray-600 mb-3 line-clamp-2">
//                       {project.description}
//                     </p>
//                   )}
                  
//                   {project.link && (
//                     <a
//                       href={project.link}
//                       target="_blank"
//                       rel="noopener noreferrer"
//                       className="text-sm text-ink-gold hover:text-amber-600 transition-colors inline-flex items-center gap-1"
//                     >
//                       View Project
//                       <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
//                       </svg>
//                     </a>
//                   )}
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </main>
//     </div>
//   );
// }