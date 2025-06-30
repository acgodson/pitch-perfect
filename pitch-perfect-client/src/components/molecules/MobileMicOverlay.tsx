import { motion, AnimatePresence } from "framer-motion";
import { VoiceCommandCenter } from "@/components/organisms";
import { BackgroundPattern } from "@/components/atoms";

interface MobileMicOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onCommand: (audioBlob: Blob) => void;
}

export const MobileMicOverlay = ({
  isOpen,
  onClose,
  onCommand,
}: MobileMicOverlayProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="md:hidden fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <BackgroundPattern>
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-6 right-6 w-10 h-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center"
              >
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              <motion.div
                className="text-center space-y-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <VoiceCommandCenter onCommand={onCommand} className="mx-auto" />

                <motion.div
                  className="space-y-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                >
                  <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-2xl">
                    Pitch Perfect
                  </h1>
                  <p className="text-lg text-blue-100 font-light drop-shadow-lg">
                    Say something to get started
                  </p>
                </motion.div>
              </motion.div>
            </div>
          </BackgroundPattern>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
