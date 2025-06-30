interface FloatingActionButtonProps {
  onClick: () => void;
  className?: string;
}

export const FloatingActionButton = ({
  onClick,
  className,
}: FloatingActionButtonProps) => {
  return (
    <div className={`md:hidden fixed bottom-6 right-6 z-50 ${className}`}>
      <button
        onClick={onClick}
        className="w-16 h-16 bg-white/15 backdrop-blur-xl border border-white/25 rounded-full shadow-2xl hover:bg-white/25 transition-all duration-300 flex items-center justify-center"
      >
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      </button>
    </div>
  );
};
