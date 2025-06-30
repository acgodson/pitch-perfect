import { motion } from "framer-motion";
import { Mic } from "lucide-react";

interface VoiceCommandsProps {
  className?: string;
  isIdentificationMode?: boolean;
}

export const VoiceCommands = ({ className, isIdentificationMode = false }: VoiceCommandsProps) => {
  const identificationCommands = [
    "Beca, listen up",
    "Beca, listen up",
    "Beca, listen up",
  ];

  const conversationCommands = [
    "What's my current balance?",
    "Show me my recent transactions",
    "Send fifty dollars to Sarah",
    "How much did I spend on groceries this week?",
    "Add my friend Mike to my contacts",
    "What's the weather forecast for tomorrow?",
    "Tell me a funny story",
    "What's the current time?",
    "Can you help me budget this month?",
    "Show me my savings account",
  ];

  const commands = isIdentificationMode ? identificationCommands : conversationCommands;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      className={`space-y-4 ${className}`}
    >
      <div className="text-center space-y-2">

        {!isIdentificationMode && (<div className="flex items-center justify-center space-x-2 text-emerald-400">
          <Mic size={16} />
          <span className="text-sm font-medium">
            Voice Commands
          </span>
        </div>)
        }
        <p className="text-lg md:text-xl text-blue-100 font-light drop-shadow-lg">
          {isIdentificationMode
            ? "Say the startup phrase to launch your profile:"
            : "Try saying one of these:"
          }
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {commands.map((command, index) => (
          <motion.button
            key={`${command}-${index}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + index * 0.1, duration: 0.3 }}
            className={`rounded-full px-4 py-2 text-xs transition-all duration-300 hover:scale-105 ${isIdentificationMode
              ? "bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 hover:border-emerald-400/60 text-emerald-300"
              : "bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 text-white"
              }`}
          >
            "{command}"
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};
