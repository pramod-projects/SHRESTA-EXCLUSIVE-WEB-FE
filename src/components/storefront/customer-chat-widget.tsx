"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BotMessageSquare, Clock, Gem, Headset, RotateCcw, Send, Sparkles, Truck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  sender: "assistant" | "customer";
  text: string;
  timestamp: Date;
};

type ChatApiResponse = {
  conversationId: string;
  assistantMessage: string;
  quickActions: string[];
  escalationSuggested: boolean;
  timestamp: string;
};

const initialQuickActions = ["Track Order", "Product Help", "Returns"];

export function CustomerChatWidget() {
  const [isOpen, setOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setTyping] = useState(false);
  const [quickActions, setQuickActions] = useState(initialQuickActions);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Welcome to SHRESTA. I can help with saree discovery, styling, store pickup, checkout, and order-support handoff.",
      timestamp: new Date()
    }
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const toggleChat = () => {
    setOpen((value) => !value);
    if (!isOpen) {
      setHasUnreadMessages(false);
    }
  };

  async function send(message: string) {
    const trimmed = message.trim();
    if (!trimmed || isTyping) {
      return;
    }

    setOpen(true);
    setInputValue("");
    setTyping(true);
    setMessages((current) => [
      ...current,
      { id: `customer-${Date.now()}`, sender: "customer", text: trimmed, timestamp: new Date() }
    ]);

    try {
      const response = await fetch("/api/customer-chat", {
        body: JSON.stringify({
          contextPath: window.location.pathname,
          conversationId,
          message: trimmed
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const payload = await response.json() as {
        success?: boolean;
        data?: ChatApiResponse;
        error?: { message?: string };
      };

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? "SHRESTA Assistant is unavailable.");
      }

      setConversationId(payload.data.conversationId);
      setQuickActions(normalizeQuickActions(payload.data.quickActions));
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          sender: "assistant",
          text: payload.data?.assistantMessage ?? "I can route this to SHRESTA support.",
          timestamp: payload.data?.timestamp ? new Date(payload.data.timestamp) : new Date()
        }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          sender: "assistant",
          text: error instanceof Error ? error.message : "SHRESTA Assistant is unavailable.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setTyping(false);
    }
  }

  return (
    <>
      <AnimatePresence>
        {!isOpen ? (
          <motion.button
            animate={{ scale: 1, opacity: 1 }}
            aria-expanded="false"
            aria-label="Open chat with SHRESTA Support"
            className={[
              "group fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center overflow-hidden md:bottom-6 md:right-6",
              "rounded-full border border-[var(--gold-500)] bg-[linear-gradient(135deg,var(--shresta-logo-bg),var(--shresta-logo-surface))]",
              "text-[var(--gold-700)] shadow-[0_18px_45px_rgba(47,33,21,0.22),0_0_0_1px_rgba(212,175,55,0.14)_inset] transition-[width,transform,border-color,box-shadow] duration-300",
              "hover:w-44 hover:-translate-y-0.5 hover:border-[var(--gold-600)] hover:shadow-[0_22px_52px_rgba(47,33,21,0.28),0_0_24px_rgba(212,175,55,0.22)]",
              "focus-visible:w-44",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--shresta-logo-bg)]"
            ].join(" ")}
            exit={{ scale: 0, opacity: 0 }}
            initial={{ scale: 0, opacity: 0 }}
            onClick={toggleChat}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            type="button"
          >
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
              <span className="absolute inset-2 rounded-full border border-[var(--gold-500)] bg-[rgba(253,246,235,0.88)]" />
              <BotMessageSquare className="relative h-6 w-6" strokeWidth={2.15} />
              <Sparkles className="absolute bottom-3 right-3 h-3 w-3 text-[var(--gold-600)]" strokeWidth={2.4} />
              {hasUnreadMessages ? (
                <span className="absolute right-2 top-2 flex h-3.5 w-3.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400 opacity-75" />
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-[var(--shresta-logo-bg)] bg-gold-500" />
                </span>
              ) : null}
            </span>
            <span className="w-0 overflow-hidden whitespace-nowrap pr-0 text-sm font-semibold tracking-elegant text-[var(--gold-700)] opacity-0 transition-all duration-300 group-hover:w-[100px] group-hover:pr-4 group-hover:opacity-100 group-focus-visible:w-[100px] group-focus-visible:pr-4 group-focus-visible:opacity-100">
              Chat with us
            </span>
          </motion.button>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen ? (
          <motion.section
            animate={{ opacity: 1, y: 0, scale: 1 }}
            aria-label="SHRESTA Support Chat"
            aria-modal="true"
            className={[
              "fixed bottom-24 right-4 z-50 flex h-[520px] max-h-[calc(100vh-100px)] w-[min(calc(100vw-2rem),380px)] flex-col overflow-hidden md:bottom-6 md:right-6",
              "rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-bg)]",
              "shadow-2xl shadow-[rgba(47,33,21,0.24)]"
            ].join(" ")}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            role="dialog"
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="flex items-center justify-between border-b border-[var(--shresta-logo-border)] bg-[linear-gradient(90deg,var(--gold-500),var(--gold-600))] px-5 py-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <span className="relative">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 shadow-lg shadow-gold-500/20">
                    <Sparkles className="h-5 w-5 text-wine-900" />
                  </span>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 animate-pulse rounded-full border-2 border-wine-800 bg-emerald-400" />
                </span>
                <div>
                  <h3 className="font-serif text-base font-medium tracking-elegant text-[var(--wine-950)]">SHRESTA Support</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <p className="text-xs tracking-wide text-[var(--wine-900)]/85">Online - usually replies instantly</p>
                  </div>
                </div>
              </div>

              <button
                aria-label="Close chat"
                className="rounded-full p-2 text-[var(--wine-900)]/85 transition-all duration-200 hover:bg-[rgba(253,246,235,0.9)] hover:text-[var(--wine-950)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50"
                onClick={toggleChat}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.map((message, index) => (
                <motion.div
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={message.sender === "customer" ? "flex justify-end" : "flex justify-start"}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  key={message.id}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.2) }}
                >
                  <div
                    className={message.sender === "customer"
                      ? "max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-r from-gold-500 to-gold-600 px-4 py-3 text-wine-900"
                      : "max-w-[85%] rounded-2xl rounded-bl-md border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-4 py-3 text-[var(--shresta-logo-text)]"}
                  >
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <span className={message.sender === "customer" ? "mt-1.5 block text-[10px] tracking-wide text-wine-900/60" : "mt-1.5 block text-[10px] tracking-wide text-[var(--shresta-logo-muted)]"}>
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                </motion.div>
              ))}

              {isTyping ? (
                <motion.div animate={{ opacity: 1, y: 0 }} className="flex justify-start" initial={{ opacity: 0, y: 10 }}>
                  <div className="rounded-2xl rounded-bl-md border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-400/60 [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-400/60 [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-400/60 [animation-delay:300ms]" />
                    </div>
                  </div>
                </motion.div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>

            {messages.length <= 2 ? (
              <motion.div animate={{ opacity: 1 }} className="px-4 pb-3" initial={{ opacity: 0 }}>
                <p className="mb-2 ml-1 text-[10px] uppercase tracking-micro text-[var(--shresta-logo-muted)]">Quick Actions</p>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action) => (
                    <button
                      className={[
                        "flex items-center gap-1.5 rounded-full border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-3 py-1.5",
                        "text-xs text-[var(--shresta-logo-muted)] transition-all duration-200",
                        "hover:border-gold-500/40 hover:bg-[var(--shresta-logo-bg)] hover:text-[var(--gold-600)]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/30"
                      ].join(" ")}
                      key={action}
                      onClick={() => void send(action)}
                      type="button"
                    >
                      <QuickActionIcon action={action} />
                      {action}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : null}

            <div className="border-t border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-4 backdrop-blur-sm">
              <form
                className="flex items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void send(inputValue);
                }}
              >
                <input
                  aria-label="Type your message"
                  className={[
                    "h-11 flex-1 rounded-full border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] px-4",
                    "text-sm text-[var(--shresta-logo-text)] placeholder:text-[var(--shresta-logo-muted)]",
                    "transition-all duration-200 focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/10"
                  ].join(" ")}
                  maxLength={1000}
                  onChange={(event) => setInputValue(event.target.value)}
                  placeholder="Type your message..."
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                />
                <button
                  aria-label="Send message"
                  className={[
                    "flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-gold-500 to-gold-600",
                    "text-wine-900 shadow-lg shadow-gold-500/20 transition-all duration-200",
                    "hover:scale-105 hover:shadow-xl hover:shadow-gold-500/30",
                    "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--shresta-logo-bg)]"
                  ].join(" ")}
                  disabled={!inputValue.trim() || isTyping}
                  type="submit"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>

              <div className="mt-3 flex items-center justify-center gap-1.5">
                <Clock className="h-3 w-3 text-[var(--shresta-logo-muted)]" />
                <p className="text-center text-[10px] tracking-wide text-[var(--shresta-logo-muted)]">Mon-Sat: 10AM - 8PM IST</p>
              </div>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function QuickActionIcon({ action }: { action: string }) {
  const normalized = action.toLowerCase();
  if (normalized.includes("order") || normalized.includes("track")) {
    return <Truck className="h-3.5 w-3.5" />;
  }
  if (normalized.includes("return")) {
    return <RotateCcw className="h-3.5 w-3.5" />;
  }
  if (normalized.includes("product") || normalized.includes("saree")) {
    return <Gem className="h-3.5 w-3.5" />;
  }
  if (normalized.includes("support") || normalized.includes("help")) {
    return <Headset className="h-3.5 w-3.5" />;
  }
  return <Sparkles className="h-3.5 w-3.5" />;
}

function normalizeQuickActions(actions: string[]): string[] {
  if (actions.length === 0) {
    return initialQuickActions;
  }

  return actions.slice(0, 3);
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
