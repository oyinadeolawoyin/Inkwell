import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ink-cream flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-serif text-ink-primary font-bold mb-2 opacity-20 select-none">
          404
        </div>
        <div className="text-5xl mb-6">🖋️</div>
        <h1 className="text-2xl sm:text-3xl font-serif text-ink-primary mb-3">
          This page doesn't exist
        </h1>
        <p className="text-ink-gray text-sm sm:text-base leading-relaxed mb-8">
          Looks like you wandered off the page. Even the best writers get lost sometimes —
          let's get you back to the story.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-ink-primary text-white font-medium rounded-xl
                     hover:bg-opacity-90 transition-all shadow-soft
                     focus:outline-none focus:ring-2 focus:ring-ink-gold focus:ring-offset-2"
          >
            ← Back to Home
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-3 bg-white border-2 border-ink-lightgray text-ink-primary
                     font-medium rounded-xl hover:border-ink-primary transition-all"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
