"use client";

import React, { useState, useEffect } from "react";
import { Lock, Unlock, Calendar, User, Mail, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export interface VaultLetter {
  _id?: string;
  id?: string;
  title: string;
  senderName: string;
  recipientName: string;
  recipientEmail: string;
  unlockDate: string | Date;
  content: string;
  status: "locked" | "needs-passcode" | "unlocked";
  requiresPasscode: boolean;
  passcode?: string;
}

interface TemporalVaultViewProps {
  letters: VaultLetter[];
  onAddLetter: (letter: {
    title: string;
    content: string;
    senderName: string;
    recipientName: string;
    recipientEmail: string;
    unlockDate: string;
    passcode?: string;
  }) => Promise<void>;
  onDecryptLetter: (id: string, passcode: string) => Promise<boolean>;
}

export default function TemporalVaultView({
  letters,
  onAddLetter,
  onDecryptLetter
}: TemporalVaultViewProps) {
  
  // Form States
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [senderName, setSenderName] = useState("Consciousness Core");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [passcode, setPasscode] = useState("");
  
  // Countdown tick
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Passcode decryption modal
  const [decryptingLetterId, setDecryptingLetterId] = useState<string | null>(null);
  const [decryptPasscode, setDecryptPasscode] = useState("");
  const [decryptError, setDecryptError] = useState("");

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const playSynthBeep = (freq: number, sweep: number, duration: number, vol = 0.04) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * sweep, ctx.currentTime + duration);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  const handleCreateCapsule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !recipientName.trim() || !recipientEmail.trim() || !unlockDate) return;

    if (new Date(unlockDate) <= new Date()) {
      alert("Unlock date must be in the future to lock a capsule.");
      return;
    }

    playSynthBeep(200, 0.4, 0.25, 0.06);

    await onAddLetter({
      title,
      content,
      senderName: senderName || "Consciousness Core",
      recipientName,
      recipientEmail,
      unlockDate,
      passcode: passcode || undefined
    });

    // Reset Form
    setTitle("");
    setContent("");
    setSenderName("Consciousness Core");
    setRecipientName("");
    setRecipientEmail("");
    setUnlockDate("");
    setPasscode("");


  };

  const startDecryptProcess = (letter: VaultLetter) => {
    const id = letter._id || letter.id || "";
    if (letter.status === "locked") {
      playSynthBeep(180, 0.5, 0.15, 0.08);
      return;
    }

    if (letter.requiresPasscode && letter.status === "needs-passcode") {
      playSynthBeep(580, 1.1, 0.06);
      setDecryptingLetterId(id);
      setDecryptPasscode("");
      setDecryptError("");
    } else {
      playSynthBeep(784, 1.2, 0.35, 0.06);
      onDecryptLetter(id, "");
    }
  };

  const submitPasscodeDecryption = async () => {
    if (!decryptingLetterId) return;

    playSynthBeep(440, 1.2, 0.06);
    const success = await onDecryptLetter(decryptingLetterId, decryptPasscode);

    if (success) {
      playSynthBeep(880, 1.1, 0.3, 0.06);
      setDecryptingLetterId(null);
      setDecryptPasscode("");
      setDecryptError("");
      

    } else {
      playSynthBeep(150, 0.6, 0.2, 0.08);
      setDecryptError("ACCESS KEY MISMATCH. PLEASE TRY AGAIN.");
    }
  };

  const getCountdown = (targetDateStr: string | Date) => {
    if (!currentTime) return { expired: false, text: "CALCULATING..." };
    const target = new Date(targetDateStr);
    const diff = target.getTime() - currentTime.getTime();

    if (diff <= 0) return { expired: true, text: "READY TO DECRYPT" };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    let text = "";
    if (days > 0) text += `${days}d `;
    text += `${hours.toString().padStart(2, "0")}h:${minutes.toString().padStart(2, "0")}m:${seconds.toString().padStart(2, "0")}s`;

    return { expired: false, text };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 w-full py-2">
      
      {/* Create Capsule Panel (Left 2 cols) */}
      <div className="glass-panel border-cyber-cyan/15 rounded-2xl p-6 lg:col-span-2 flex flex-col gap-5 relative overflow-hidden h-fit">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-cyber-cyan/10"></div>

        <div className="flex flex-col gap-1 border-b border-cyber-cyan/10 pb-3">
          <h2 className="text-sm font-bold text-cyber-cyan uppercase tracking-wider font-mono">
            Create Time Capsule
          </h2>
          <p className="text-xs text-gray-400 font-sans">
            Write notes or messages that will unlock at a future target date.
          </p>
        </div>

        <form onSubmit={handleCreateCapsule} className="flex flex-col gap-4">
          
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-mono uppercase tracking-wider font-semibold">Capsule Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., Letter to my 30-year-old self"
              className="bg-cyber-bg/70 border border-cyber-cyan/15 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan placeholder:text-gray-600 font-sans"
            />
          </div>

          {/* Sender & Recipient Name Split */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 font-mono uppercase tracking-wider font-semibold">Sender Name</label>
              <input
                type="text"
                required
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Sender identity"
                className="bg-cyber-bg/70 border border-cyber-cyan/15 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan font-sans"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 font-mono uppercase tracking-wider font-semibold">Recipient Name</label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="E.g., Future Self"
                className="bg-cyber-bg/70 border border-cyber-cyan/15 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan font-sans"
              />
            </div>
          </div>

          {/* Recipient Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-mono uppercase tracking-wider font-semibold">Recipient Email</label>
            <input
              type="email"
              required
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="E.g., myemail@example.com"
              className="bg-cyber-bg/70 border border-cyber-cyan/15 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan font-sans"
            />
          </div>

          {/* Unlock Date & Security Passphrase Split */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 font-mono uppercase tracking-wider font-semibold">Unlock Date & Time</label>
              <input
                type="datetime-local"
                required
                value={unlockDate}
                onChange={(e) => setUnlockDate(e.target.value)}
                className="bg-cyber-bg/70 border border-cyber-cyan/15 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan font-sans"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 font-mono uppercase tracking-wider font-semibold">Passphrase (Optional)</label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Key to decrypt later"
                className="bg-cyber-bg/70 border border-cyber-cyan/15 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan font-mono"
              />
            </div>
          </div>

          {/* Payload Content */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-mono uppercase tracking-wider font-semibold">Secret Message Payload</label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write the message that will be encrypted and hidden until the unlock date..."
              className="bg-cyber-bg/70 border border-cyber-cyan/15 rounded-lg p-4 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan resize-none leading-relaxed font-sans"
            />
          </div>

          <button
            type="submit"
            className="mt-2 w-full font-mono text-sm font-bold bg-cyber-purple/10 border border-cyber-purple hover:bg-cyber-purple/20 text-white py-3 rounded-lg transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4 text-cyber-purple" />
            Lock Capsule in Vault
          </button>

        </form>
      </div>

      {/* Letters Timeline (Right 3 cols) */}
      <div className="glass-panel border-cyber-cyan/15 rounded-2xl p-6 lg:col-span-3 flex flex-col gap-5 relative overflow-hidden min-h-[400px]">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-cyber-cyan/10"></div>

        <div className="flex flex-col gap-1 border-b border-cyber-cyan/10 pb-3">
          <h2 className="text-sm font-bold text-cyber-cyan uppercase tracking-wider font-mono">
            Time Capsules Timeline
          </h2>
          <p className="text-xs text-gray-400 font-sans">
            Track and decrypt your locked messages
          </p>
        </div>

        {/* Timeline Envelopes list */}
        <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px] pr-1">
          {letters.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-24 gap-3">
              <Lock className="w-12 h-12 text-cyber-purple/20" />
              <span className="text-sm font-semibold text-gray-300">
                Temporal Vault is Empty
              </span>
              <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                Create a time capsule on the left side to populate this list. Memento will encrypt it locally until the scheduled date arrives.
              </p>
            </div>
          ) : (
            letters.map((letter) => {
              const id = letter._id || letter.id || "";
              const ctd = getCountdown(letter.unlockDate);
              const isLocked = !ctd.expired;

              return (
                <div
                  key={id}
                  className={`glass-panel border-l-4 p-5 rounded-xl flex flex-col gap-4 transition-all relative overflow-hidden ${
                    isLocked
                      ? "border-cyber-purple/20 border-l-cyber-purple bg-cyber-purple/[0.01]"
                      : letter.status === "needs-passcode"
                      ? "border-amber-500/30 border-l-amber-500 bg-amber-500/[0.01]"
                      : "border-cyber-green/30 border-l-cyber-green bg-cyber-green/[0.01]"
                  }`}
                >
                  {/* Top Header details */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyber-cyan/5 pb-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-gray-200">
                        {letter.title}
                      </span>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-400 font-mono items-center mt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-cyber-cyan/60" />
                          From: {letter.senderName}
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-cyber-purple/60" />
                          To: {letter.recipientName} ({letter.recipientEmail})
                        </span>
                      </div>
                    </div>

                    {/* Lock status Badge */}
                    <div className={`font-mono text-[10px] font-bold px-2.5 py-1 rounded border self-start sm:self-center flex items-center gap-1.5 ${
                      isLocked
                        ? "bg-cyber-purple/10 border-cyber-purple/20 text-cyber-purple"
                        : letter.status === "needs-passcode"
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                        : "bg-cyber-green/10 border-cyber-green/20 text-cyber-green"
                    }`}>
                      {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      <span>{isLocked ? "TIME-LOCKED" : letter.status === "needs-passcode" ? "KEY-LOCKED" : "DECRYPTED"}</span>
                    </div>
                  </div>

                  {/* Message body */}
                  <div className="bg-cyber-bg/90 border border-cyber-cyan/5 rounded-lg p-4 font-sans text-sm text-gray-300 relative">
                    <p className={`leading-relaxed whitespace-pre-wrap ${
                      isLocked ? "font-mono text-xs text-cyber-purple/60 select-none tracking-wide break-all" : ""
                    }`}>
                      {letter.content}
                    </p>
                  </div>

                  {/* Decrypt Actions & Timers */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-1">
                    <div className="flex items-center gap-1.5 font-mono text-xs text-gray-400">
                      <Calendar className="w-4 h-4 text-cyber-cyan" />
                      <span>UNLOCK TIME: {new Date(letter.unlockDate).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-3.5 w-full sm:w-auto justify-between sm:justify-end">
                      {/* Live Counter */}
                      <span className={`font-mono text-xs font-bold tracking-wider ${
                        isLocked ? "text-cyber-purple animate-pulse" : "text-cyber-green"
                      }`}>
                        {ctd.text}
                      </span>

                      {/* Decryption Trigger Button */}
                      {letter.status !== "unlocked" && (
                        <button
                          onClick={() => startDecryptProcess(letter)}
                          disabled={isLocked}
                          className={`font-mono text-xs font-bold px-4 py-2 rounded-lg transition-all uppercase tracking-wider ${
                            isLocked
                              ? "bg-gray-950/20 border border-gray-900 text-gray-600 cursor-not-allowed"
                              : "bg-cyber-green/25 border border-cyber-green hover:bg-cyber-green/35 text-white cursor-pointer hover:shadow-[0_0_10px_rgba(34,197,94,0.25)]"
                          }`}
                        >
                          Decrypt Capsule
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Secret key decryption popup modal */}
      {decryptingLetterId && (
        <div className="fixed inset-0 bg-cyber-bg/90 backdrop-blur-md z-45 flex items-center justify-center p-6 text-center select-none animate-fade-in">
          <div className="glass-panel border-cyber-cyan/30 rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4 relative">
            
            <div className="flex flex-col gap-1 items-center border-b border-cyber-cyan/10 pb-3">
              <ShieldAlert className="w-8 h-8 text-amber-500 animate-pulse mb-1" />
              <h3 className="font-mono text-xs font-bold text-cyber-cyan uppercase tracking-wider">
                TEMPORAL VAULT PASSPHRASE
              </h3>
              <p className="font-sans text-[11px] text-gray-400 leading-normal">
                Enter the passcode associated with this time capsule to decrypt its content.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <label className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">Secret Passphrase</label>
              <input
                type="password"
                required
                value={decryptPasscode}
                onChange={(e) => setDecryptPasscode(e.target.value)}
                placeholder="Enter password..."
                className="bg-cyber-bg border border-cyber-cyan/20 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyber-cyan font-mono"
              />
            </div>

            {decryptError && (
              <span className="font-mono text-[10px] text-red-400 border border-red-500/20 bg-red-950/15 py-1.5 rounded">
                {decryptError}
              </span>
            )}

            <div className="flex gap-2 text-xs font-mono mt-1">
              <button
                type="button"
                onClick={() => setDecryptingLetterId(null)}
                className="flex-1 border border-cyber-cyan/10 text-gray-400 py-2.5 rounded-lg hover:bg-cyber-cyan/5 hover:text-gray-200 transition-all uppercase cursor-pointer font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitPasscodeDecryption}
                className="flex-1 bg-cyber-cyan/20 border border-cyber-cyan/45 text-cyber-cyan py-2.5 rounded-lg hover:bg-cyber-cyan/35 hover:border-cyber-cyan hover:shadow-[0_0_8px_rgba(6,182,212,0.2)] transition-all uppercase font-bold cursor-pointer"
              >
                Decrypt
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
